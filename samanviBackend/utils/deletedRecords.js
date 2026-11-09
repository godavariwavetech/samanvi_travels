// One place for everything that was deleted.
//
// Every delete made from the app is written to deleted_records_log with the
// reason the user typed, who did it (from the verified token, never from the
// browser), when (IST) and a copy of what was sent, so a record can be found
// again even when its own table removed it outright. Deletions made before the
// log existed are still listed, read from the soft-deleted rows (d_in = 1) of
// trips, fuel entries, laundry bills and vouchers.

const TABLE_SQL = `CREATE TABLE IF NOT EXISTS deleted_records_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  module VARCHAR(80) NOT NULL DEFAULT '',
  page VARCHAR(120) NOT NULL DEFAULT '',
  reference VARCHAR(150) NOT NULL DEFAULT '',
  reason TEXT,
  endpoint VARCHAR(200) NOT NULL DEFAULT '',
  snapshot LONGTEXT,
  deleted_by_id INT DEFAULT NULL,
  deleted_by_name VARCHAR(150) DEFAULT NULL,
  deleted_at DATETIME NOT NULL,
  KEY idx_deleted_at (deleted_at),
  KEY idx_reference (reference)
)`

let ensured = null
function ensureTable(pool, callback) {
  if (ensured === true) return callback(null)
  pool.query(TABLE_SQL, (err) => {
    if (err) return callback(err)
    ensured = true
    callback(null)
  })
}

const istNow = (now = new Date()) => new Date(now.getTime() + 330 * 60000).toISOString().slice(0, 19).replace('T', ' ')
const text = (v, max) => String(v == null ? '' : v).slice(0, max)

function logDeletion(pool, auth, body, callback) {
  const id = Number(auth && auth.usid)
  if (!Number.isSafeInteger(id) || id <= 0) return callback(new Error('Invalid authenticated user'))
  ensureTable(pool, (tErr) => {
    if (tErr) return callback(tErr)
    pool.query('SELECT id, name FROM users WHERE id=? AND d_in=0', [id], (err, users) => {
      if (err) return callback(err)
      if (!users || !users.length) return callback(new Error('Active user not found'))
      let snapshot = ''
      try { snapshot = JSON.stringify(body.snapshot == null ? {} : body.snapshot).slice(0, 60000) } catch (_) { snapshot = '{}' }
      pool.query(
        'INSERT INTO deleted_records_log (module, page, reference, reason, endpoint, snapshot, deleted_by_id, deleted_by_name, deleted_at) VALUES (?,?,?,?,?,?,?,?,?)',
        [text(body.module, 80), text(body.page, 120), text(body.reference, 150), text(body.reason, 2000), text(body.endpoint, 200), snapshot, users[0].id, users[0].name, istNow()],
        (insErr, res) => callback(insErr, res && res.insertId),
      )
    })
  })
}

// Soft-deleted rows from before the log, one query per table so a table
// missing on some database only drops its own rows.
const LEGACY = [
  { module: 'Trips', sql: `SELECT t.*, t.c_number AS _reference,
      CONCAT_WS(' · ', t.bus_no, t.service_no, DATE_FORMAT(t.trip_date, '%d-%m-%Y')) AS _details,
      e.delete_by_name AS _by, DATE_FORMAT(e.delete_by_date, '%Y-%m-%d %H:%i:%s') AS _at
    FROM trip_created t
    LEFT JOIN tripexpenses_data e ON e.id = (SELECT MAX(x.id) FROM tripexpenses_data x WHERE x.c_number = t.c_number)
    WHERE t.d_in = 1` },
  { module: 'Fuel', sql: `SELECT *, c_number AS _reference,
      CONCAT_WS(' · ', vehicle_number, service_number) AS _details,
      deletedby_name AS _by, DATE_FORMAT(deletedby_date, '%Y-%m-%d %H:%i:%s') AS _at
    FROM fuel_entry WHERE d_in = 1` },
  { module: 'Laundry', sql: `SELECT *, c_number AS _reference, '' AS _details,
      delete_by_name AS _by, DATE_FORMAT(delete_by_date, '%Y-%m-%d %H:%i:%s') AS _at
    FROM laundrybill_maint WHERE d_in = 1` },
  { module: 'Vouchers', sql: `SELECT *, c_number AS _reference, LEFT(COALESCE(description, ''), 200) AS _details,
      deleted_by_name AS _by, DATE_FORMAT(deleted_by_date, '%Y-%m-%d %H:%i:%s') AS _at
    FROM mainvoucher_t WHERE d_in = 1` },
]

function listDeleted(pool, callback) {
  ensureTable(pool, (tErr) => {
    if (tErr) return callback(tErr)
    pool.query(`SELECT id, module, page, reference, reason, endpoint, snapshot, deleted_by_name,
        DATE_FORMAT(deleted_at, '%Y-%m-%d %H:%i:%s') AS deleted_at
      FROM deleted_records_log ORDER BY deleted_at DESC, id DESC`, (err, logged) => {
      if (err) return callback(err)
      const rows = (logged || []).map((r) => ({ ...r, source: 'log' }))
      const seen = new Set(rows.map((r) => `${r.module}|${r.reference}`))
      let pending = LEGACY.length
      const done = () => {
        if (--pending > 0) return
        rows.sort((a, b) => String(b.deleted_at || '').localeCompare(String(a.deleted_at || '')))
        callback(null, rows)
      }
      for (const src of LEGACY) {
        pool.query(src.sql, (qErr, legacy) => {
          if (!qErr) {
            // A legacy row can repeat (one per expense revision); keep one per reference.
            for (const r of legacy || []) {
              const key = `${src.module}|${r._reference}`
              if (!r._reference || seen.has(key)) continue
              seen.add(key)
              // The whole deleted row, so its details can be shown in full.
              const record = {}
              for (const [k, v] of Object.entries(r)) if (!k.startsWith('_')) record[k] = v
              rows.push({ id: null, module: src.module, page: '', reference: r._reference, reason: '', endpoint: '',
                snapshot: JSON.stringify({ details: r._details || '', record }), deleted_by_name: r._by, deleted_at: r._at, source: 'legacy' })
            }
          } else console.error('[deletedRecords] ' + src.module + ':', qErr.message)
          done()
        })
      }
    })
  })
}

module.exports = { logDeletion, listDeleted, ensureTable, TABLE_SQL }
