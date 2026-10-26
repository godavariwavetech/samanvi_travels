const test = require('node:test');
const assert = require('node:assert/strict');
const { updateTripApproval } = require('../utils/tripApproval');
let DatabaseSync;
try { ({ DatabaseSync } = require('node:sqlite')); } catch (_) {}

function fixture(failVoucher = false) {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE trip_created (id INTEGER, c_number TEXT, status INTEGER, admin_status INTEGER, voucher_number TEXT, d_in INTEGER);
    CREATE TABLE tripexpenses_data (c_number TEXT, admin_status INTEGER, admin_action_by TEXT, admin_action_date TEXT, action_by_name TEXT, d_in INTEGER);
    CREATE TABLE expensive_details (c_number TEXT, admin_status INTEGER, admin_action_by TEXT, admin_action_date TEXT, action_by_name TEXT, d_in INTEGER);
    CREATE TABLE mainvoucher_t (c_number TEXT, status INTEGER, admin_status_by_id TEXT, admin_status_by_name TEXT, admin_status_by_date TEXT, d_in INTEGER);
    CREATE TABLE mainvoucher_subt (c_number TEXT, status INTEGER, d_in INTEGER);
    INSERT INTO trip_created VALUES (152,'T261021021',1,0,'T261021021',0),(180,'T261021049',1,1,'T261021049',0),(200,'TNEW',1,0,NULL,0);
    INSERT INTO tripexpenses_data VALUES ('T261021021',0,NULL,NULL,NULL,0),('T261021049',1,'909','2026-10-25','DSP',0),('TNEW',0,NULL,NULL,NULL,0);
    INSERT INTO expensive_details SELECT * FROM tripexpenses_data;
    INSERT INTO expensive_details VALUES ('T261021021',2,NULL,NULL,NULL,2);
    INSERT INTO mainvoucher_t VALUES ('T261021021',0,NULL,NULL,NULL,0),('T261021049',0,NULL,NULL,NULL,0),('OTHER',0,NULL,NULL,NULL,0);
    INSERT INTO mainvoucher_subt VALUES ('T261021021',0,0),('T261021021',0,0),('T261021021',2,1),('T261021049',0,0),('OTHER',0,0);
  `);
  let released = 0;
  const connection = {
    beginTransaction(cb) { db.exec('BEGIN'); cb(null); },
    query(sql, values, cb) {
      if (failVoucher && sql.startsWith('UPDATE mainvoucher_subt')) return cb(new Error('Simulated voucher write failure'));
      let result;
      try {
        const statement = db.prepare(sql.replace(' FOR UPDATE', ''));
        result = sql.startsWith('SELECT') ? statement.all(...values) : statement.run(...values);
      } catch (err) { return cb(err); }
      cb(null, result);
    },
    rollback(cb) { db.exec('ROLLBACK'); cb(); },
    commit(cb) { db.exec('COMMIT'); cb(null); },
    release() { released++; },
  };
  const pool = { getConnection(cb) { cb(null, connection); } };
  const update = (status, extra = {}) => new Promise((resolve, reject) => updateTripApproval(pool, {
    vouchervalue: status, voucherdata: { id: 152, c_number: 'T261021021' },
    user_id: 909, user_nm: "Approver's name", updated_date: '2026-10-26 10:00:00', ...extra,
  }, (err, result) => err ? reject(err) : resolve(result)));
  return { db, update, released: () => released };
}

test('trip approve, reject and reopen synchronize only active linked voucher records', { skip: !DatabaseSync }, async () => {
  const f = fixture();
  try {
    for (const status of [1, 2, 0, 1]) {
      await f.update(status);
      for (const [table, column] of [['trip_created','admin_status'], ['tripexpenses_data','admin_status'], ['expensive_details','admin_status'], ['mainvoucher_t','status'], ['mainvoucher_subt','status']]) {
        assert.ok(f.db.prepare(`SELECT ${column} AS s FROM ${table} WHERE c_number='T261021021' AND d_in=0`).all().every(row => row.s === status));
      }
    }
    assert.equal(f.db.prepare("SELECT status FROM mainvoucher_subt WHERE d_in=1").get().status, 2);
    assert.equal(f.db.prepare("SELECT admin_status FROM expensive_details WHERE d_in=2").get().admin_status, 2);
    assert.equal(f.db.prepare("SELECT status FROM mainvoucher_t WHERE c_number='OTHER'").get().status, 0);
    assert.equal(f.db.prepare("SELECT admin_status_by_name AS name FROM mainvoucher_t WHERE c_number='T261021021'").get().name, "Approver's name");
    assert.equal(f.released(), 4);
  } finally { f.db.close(); }
});

test('failure rolls back the trip, expense and voucher header updates', { skip: !DatabaseSync }, async () => {
  const f = fixture(true);
  try {
    await assert.rejects(f.update(1), /Simulated voucher write failure/);
    assert.equal(f.db.prepare('SELECT admin_status FROM trip_created WHERE id=152').get().admin_status, 0);
    assert.equal(f.db.prepare("SELECT status FROM mainvoucher_t WHERE c_number='T261021021'").get().status, 0);
    assert.equal(f.released(), 1);
  } finally { f.db.close(); }
});

test('direct expense trips work; already-approved trips can repair pending vouchers', { skip: !DatabaseSync }, async () => {
  const f = fixture();
  try {
    await f.update(1, { voucherdata: { id: 200, c_number: 'TNEW' } });
    assert.equal(f.db.prepare("SELECT admin_status FROM expensive_details WHERE c_number='TNEW'").get().admin_status, 1);
    await f.update(1, { voucherdata: { id: 180, c_number: 'T261021049', voucher_number: 'T261021049' }, requireAlreadyApproved: true });
    assert.equal(f.db.prepare("SELECT status FROM mainvoucher_t WHERE c_number='T261021049'").get().status, 1);
    await assert.rejects(f.update(1, { voucherdata: { id: 180, c_number: 'T261021049', voucher_number: 'T261021049' }, requireAlreadyApproved: true }), /no longer pending/);
    await assert.rejects(f.update(1, { requireAlreadyApproved: true }), /no longer approved/);
    await assert.rejects(f.update(1, { voucherdata: { id: 180, c_number: 'T261021021' } }), /Filed trip not found/);
    await assert.rejects(f.update(9), /Invalid trip approval/);
  } finally { f.db.close(); }
});
