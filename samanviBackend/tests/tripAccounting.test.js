const test = require('node:test');
const assert = require('node:assert/strict');
const { tripRowsWithoutVoucher } = require('../utils/tripAccounting');
let DatabaseSync;
try { ({ DatabaseSync } = require('node:sqlite')); } catch (_) { /* Node 22+ for SQL fixtures. */ }

test('approved trip report selects one posting source and survives stale voucher links', { skip: !DatabaseSync }, () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(`
      CREATE TABLE trip_created (c_number TEXT, voucher_number TEXT, d_in INTEGER);
      CREATE TABLE mainvoucher_t (c_number TEXT, status INTEGER, d_in INTEGER);
      CREATE TABLE expensive_details (c_number TEXT, amount INTEGER, admin_status INTEGER, d_in INTEGER);
      INSERT INTO trip_created VALUES
        ('direct', NULL, 0), ('missing', 'gone', 0), ('deleted', 'void', 0),
        ('pending', 'pending-v', 0), ('posted', 'posted-v', 0), ('rejected', 'rejected-v', 0),
        ('unapproved', NULL, 0);
      INSERT INTO mainvoucher_t VALUES ('void', 1, 1), ('pending-v', 0, 0), ('posted-v', 1, 0), ('rejected-v', 2, 0);
      INSERT INTO expensive_details VALUES
        ('direct', 100, 1, 0), ('missing', 200, 1, 0), ('deleted', 300, 1, 0),
        ('pending', 400, 1, 0), ('posted', 500, 1, 0), ('rejected', 600, 1, 0),
        ('unapproved', 700, 0, 0), ('direct', 999, 1, 1);
    `);
    // Exercise both forms used by Balance Sheet, Payables and Trial Balance.
    for (const alias of ['ed', '']) {
      const rows = db.prepare(`SELECT c_number, amount FROM expensive_details ${alias}
        WHERE d_in = 0 AND admin_status = 1 AND ${tripRowsWithoutVoucher(alias)} ORDER BY c_number`).all();
      assert.deepEqual(rows.map(r => [r.c_number, r.amount]), [['deleted', 300], ['direct', 100], ['missing', 200]]);
    }
    // The approved linked voucher contributes separately, without its duplicate trip rows.
    const posted = db.prepare('SELECT c_number FROM mainvoucher_t WHERE d_in = 0 AND status = 1').all();
    assert.deepEqual(posted.map(r => r.c_number), ['posted-v']);
  } finally { db.close(); }
});
