// Preview: node scripts/sync-approved-trip-vouchers.js
// Apply:   node scripts/sync-approved-trip-vouchers.js --apply
// Optional reference numbers can follow --apply (or be supplied in preview mode).
// Only already-approved trips with pending, trip-owned vouchers qualify.
const pool = require('../config/dbconnect');
const { updateTripApproval } = require('../utils/tripApproval');
const apply = process.argv.includes('--apply');
const supplied = process.argv.slice(2).filter(arg => arg !== '--apply');
const refs = supplied.length ? supplied : ['T261021021', 'T261021049'];
if (refs.some(ref => !/^T\d+$/.test(ref))) {
  console.error('Expected trip reference numbers'); pool.end(); process.exitCode = 1;
} else {
  pool.query(`SELECT t.id, t.c_number, t.voucher_number, te.admin_action_by AS user_id,
      te.action_by_name AS user_nm, te.admin_action_date AS updated_date
    FROM trip_created t
    JOIN mainvoucher_t mv ON mv.c_number=t.voucher_number AND mv.d_in=0 AND mv.status=0 AND mv.source_type='trip'
    JOIN tripexpenses_data te ON te.id=(SELECT MAX(e.id) FROM tripexpenses_data e WHERE e.c_number=t.c_number AND e.d_in=0)
    WHERE t.d_in=0 AND t.status=1 AND t.admin_status=1 AND te.admin_status=1
      AND t.c_number IN (${refs.map(() => '?').join(',')})`, refs, async (err, rows) => {
    try {
      if (err) throw err;
      console.log(JSON.stringify({ mode: apply ? 'apply' : 'preview', eligible: rows.map(r => ({ trip: r.c_number, voucher: r.voucher_number })) }));
      if (apply) for (const row of rows) {
        await new Promise((resolve, reject) => updateTripApproval(pool, {
          vouchervalue: 1, voucherdata: row, user_id: row.user_id,
          user_nm: row.user_nm, updated_date: row.updated_date,
          requireAlreadyApproved: true,
        }, err => err ? reject(err) : resolve()));
        console.log('Synchronized ' + row.c_number);
      }
    } catch (err) { console.error(err.message); process.exitCode = 1; }
    finally { pool.end(); }
  });
}
