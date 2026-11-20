// Daily database backups: a full SQL dump of the app's database, gzipped, at
// 6:00 AM and 11:30 PM IST (scheduled in app.js), plus "Backup now" from the
// DB Backups page.
//
// The dump is written in plain Node over the app's own pool, so it needs no
// `mysqldump` binary on the shared host. Files go to DB_BACKUP_DIR, or
// ~/db_backups/<database> — outside the deployed /api folder, so a deploy never
// touches them — and anything older than RETENTION_DAYS is removed after each
// successful backup.
//
// Restore: gunzip the file and run it with the mysql client (or phpMyAdmin
// Import) against an empty database; it drops and recreates every table.

const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const pool = require('../config/dbconnect');

const RETENTION_DAYS = 30;
const LOCK_NAME = 'samanvi_db_backup';
const FILE_RE = /^[A-Za-z0-9_-]+_\d{4}-\d{2}-\d{2}_\d{4}_(morning|evening|manual)\.sql\.gz$/;
const ROWS_PER_INSERT = 200;

let running = false;

function databaseName() {
  return (pool.config && pool.config.connectionConfig && pool.config.connectionConfig.database) || 'database';
}

function backupDir() {
  return process.env.DB_BACKUP_DIR || path.join(os.homedir(), 'db_backups', databaseName());
}

// Wall-clock time in IST, whatever the server's own timezone is.
function istStamp(d = new Date()) {
  const p = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d).reduce((a, x) => (a[x.type] = x.value, a), {});
  const hour = p.hour === '24' ? '00' : p.hour;
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${hour}${p.minute}`, text: `${p.day}/${p.month}/${p.year} ${hour}:${p.minute} IST` };
}

// Every value comes back as its exact MySQL text (or raw bytes for binary
// columns), so dates, decimals and big integers are written back unchanged —
// no JS Date or Number conversion in between.
function typeCast(field, next) {
  if (field.type === 'BLOB' || field.type === 'TINY_BLOB' || field.type === 'MEDIUM_BLOB' ||
      field.type === 'LONG_BLOB' || field.type === 'STRING' || field.type === 'VAR_STRING' ||
      field.type === 'BIT' || field.type === 'GEOMETRY') {
    // 63 = binary charset: real bytes, not text.
    if (field.type === 'BIT' || field.type === 'GEOMETRY' || field.characterSet === 63) return field.buffer();
  }
  return field.string();
}

function sqlValue(v) {
  if (v === null || v === undefined) return 'NULL';
  if (Buffer.isBuffer(v)) return v.length ? '0x' + v.toString('hex') : "''";
  return "'" + String(v)
    .replace(/\\/g, '\\\\')
    .replace(/\0/g, '\\0')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\x1a/g, '\\Z')
    .replace(/'/g, "\\'") + "'";
}

const ident = (name) => '`' + String(name).replace(/`/g, '``') + '`';

function q(conn, sql, values) {
  return new Promise((resolve, reject) => conn.query(sql, values, (err, rows) => err ? reject(err) : resolve(rows)));
}

// Write respecting backpressure so a big table never sits in memory.
function write(out, chunk) {
  return out.write(chunk) ? Promise.resolve() : new Promise((r) => out.once('drain', r));
}

function dumpRows(conn, table, out) {
  return new Promise((resolve, reject) => {
    let batch = [];
    let count = 0;
    const flush = () => {
      if (!batch.length) return true;
      const ok = out.write(`INSERT INTO ${ident(table)} VALUES\n${batch.join(',\n')};\n`);
      batch = [];
      return ok;
    };
    const stream = conn.query({ sql: `SELECT * FROM ${ident(table)}`, typeCast, rowsAsArray: true }).stream();
    stream.on('data', (row) => {
      batch.push('(' + row.map(sqlValue).join(',') + ')');
      count++;
      if (batch.length >= ROWS_PER_INSERT && !flush()) {
        stream.pause();
        out.once('drain', () => stream.resume());
      }
    });
    stream.on('error', reject);
    stream.on('end', () => { flush(); resolve(count); });
  });
}

async function dumpDatabase(conn, out, label) {
  const db = databaseName();
  await write(out,
    `-- Samanvi Travels database backup (${label})\n` +
    `-- Database: ${db}\n-- Taken: ${istStamp().text}\n\n` +
    `SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;\nSET UNIQUE_CHECKS=0;\n` +
    `SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';\nSET time_zone='+00:00';\n\n`);

  const all = await q(conn, 'SHOW FULL TABLES');
  const key = Object.keys(all[0] || {}).find((k) => k !== 'Table_type');
  const tables = all.filter((r) => r.Table_type !== 'VIEW').map((r) => r[key]);
  const views = all.filter((r) => r.Table_type === 'VIEW').map((r) => r[key]);

  let rows = 0;
  for (const t of tables) {
    const [create] = await q(conn, `SHOW CREATE TABLE ${ident(t)}`);
    await write(out, `--\n-- Table ${t}\n--\nDROP TABLE IF EXISTS ${ident(t)};\n${create['Create Table']};\n\n`);
    rows += await dumpRows(conn, t, out);
    await write(out, '\n');
  }
  for (const v of views) {
    const [create] = await q(conn, `SHOW CREATE VIEW ${ident(v)}`);
    // Drop the DEFINER so the view restores under whichever user imports it.
    const body = create['Create View'].replace(/DEFINER=`[^`]*`@`[^`]*`\s*/i, '');
    await write(out, `DROP VIEW IF EXISTS ${ident(v)};\n${body};\n\n`);
  }
  await write(out, 'SET FOREIGN_KEY_CHECKS=1;\nSET UNIQUE_CHECKS=1;\n');
  return { tables: tables.length, views: views.length, rows };
}

function prune(dir) {
  const cutoff = Date.now() - RETENTION_DAYS * 86400000;
  for (const name of fs.readdirSync(dir)) {
    if (!FILE_RE.test(name) && !name.endsWith('.partial')) continue;
    const full = path.join(dir, name);
    try { if (fs.statSync(full).mtimeMs < cutoff) fs.unlinkSync(full); } catch (_) { /* already gone */ }
  }
}

// kind: 'morning' | 'evening' | 'manual'. Resolves with the file's details.
async function runBackup(kind = 'manual') {
  if (running) throw Object.assign(new Error('A backup is already running'), { code: 'BUSY' });
  running = true;
  const conn = await new Promise((res, rej) => pool.getConnection((e, c) => e ? rej(e) : res(c)));
  let tmp;
  let resetZone = null;
  try {
    // A server-wide lock, so two app processes on the same database (PM2
    // instances) never dump at the same moment.
    const [lock] = await q(conn, 'SELECT GET_LOCK(?, 0) AS got', [LOCK_NAME]);
    if (!lock || Number(lock.got) !== 1) throw Object.assign(new Error('A backup is already running'), { code: 'BUSY' });

    const dir = backupDir();
    fs.mkdirSync(dir, { recursive: true });
    const s = istStamp();
    const name = `${databaseName().replace(/[^A-Za-z0-9_-]/g, '_')}_${s.date}_${s.time}_${kind}.sql.gz`;
    const final = path.join(dir, name);
    tmp = final + '.partial';

    const started = Date.now();
    // TIMESTAMP values are read in UTC, matching the file's SET time_zone, so
    // they restore to the same instant (the pooled connection gets its own
    // zone back afterwards).
    const [tz] = await q(conn, 'SELECT @@session.time_zone AS tz');
    await q(conn, "SET time_zone = '+00:00'");
    resetZone = tz.tz;
    // One consistent snapshot of every InnoDB table, without locking writers.
    await q(conn, 'SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    await q(conn, 'START TRANSACTION WITH CONSISTENT SNAPSHOT');
    const gzip = zlib.createGzip({ level: 6 });
    const file = fs.createWriteStream(tmp);
    const done = new Promise((res, rej) => { file.on('finish', res); file.on('error', rej); gzip.on('error', rej); });
    gzip.pipe(file);
    const stats = await dumpDatabase(conn, gzip, kind);
    gzip.end();
    await done;
    await q(conn, 'COMMIT');

    fs.renameSync(tmp, final);
    tmp = null;
    prune(dir);
    const size = fs.statSync(final).size;
    console.log(`[db-backup] ${kind} backup saved: ${final} (${stats.tables} tables, ${stats.rows} rows, ${size} bytes, ${Date.now() - started} ms)`);
    return { name, size, ...stats };
  } finally {
    if (tmp) { try { fs.unlinkSync(tmp); } catch (_) { /* nothing written */ } }
    conn.query('ROLLBACK', () => {}); // no-op after COMMIT; ends a failed snapshot
    if (resetZone) conn.query('SET time_zone = ?', [resetZone], () => {});
    conn.query('SELECT RELEASE_LOCK(?)', [LOCK_NAME], () => conn.release());
    running = false;
  }
}

function listBackups() {
  const dir = backupDir();
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((n) => FILE_RE.test(n))
    .map((n) => {
      const st = fs.statSync(path.join(dir, n));
      return { name: n, kind: n.match(FILE_RE)[1], size: st.size, created_at: st.mtime.toISOString() };
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

// Full path of a listed backup, or null — the name must match the backup
// pattern exactly, so nothing outside the folder can be asked for.
function backupPath(name) {
  if (typeof name !== 'string' || !FILE_RE.test(name)) return null;
  const full = path.join(backupDir(), name);
  return fs.existsSync(full) ? full : null;
}

function scheduleBackups(cron) {
  const opts = { timezone: 'Asia/Kolkata' };
  const job = (kind) => () => runBackup(kind).catch((e) => console.error(`[db-backup] ${kind} backup failed:`, e.message));
  cron.schedule('0 6 * * *', job('morning'), opts);
  cron.schedule('30 23 * * *', job('evening'), opts);
  console.log(`[db-backup] scheduled 06:00 and 23:30 IST into ${backupDir()}`);
}

module.exports = { runBackup, listBackups, backupPath, scheduleBackups, backupDir, RETENTION_DAYS };
