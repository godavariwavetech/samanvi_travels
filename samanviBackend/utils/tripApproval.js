// Keep the trip's posting source in sync with its approval decision. New trips
// have only expense lines; older trips may also have a hidden linked voucher.
function updateTripApproval(pool, data, callback) {
  const status = Number(data.vouchervalue);
  const trip = data.voucherdata || {};
  if (![0, 1, 2].includes(status) || data.vouchervalue === null || data.vouchervalue === '' ||
      !trip.c_number || !Number.isSafeInteger(Number(trip.id)) || Number(trip.id) <= 0) {
    return callback(new Error('Invalid trip approval request'));
  }
  pool.getConnection((error, connection) => {
    if (error) return callback(error);
    const fail = err => connection.rollback(() => { connection.release(); callback(err); });
    connection.beginTransaction(err => {
      if (err) { connection.release(); return callback(err); }
      connection.query('SELECT id, status, admin_status, voucher_number FROM trip_created WHERE id = ? AND c_number = ? AND d_in = 0 FOR UPDATE',
        [trip.id, trip.c_number], (err, rows) => {
          if (err) return fail(err);
          if (!rows.length || Number(rows[0].status) !== 1) return fail(new Error('Filed trip not found'));
          if (data.requireAlreadyApproved && Number(rows[0].admin_status) !== 1) return fail(new Error('Trip is no longer approved'));
          const actor = [status, data.user_id, data.updated_date, data.user_nm, trip.c_number];
          const operations = [
            ['UPDATE tripexpenses_data SET admin_status=?, admin_action_by=?, admin_action_date=?, action_by_name=? WHERE c_number=? AND d_in=0', actor],
            ['UPDATE expensive_details SET admin_status=?, admin_action_by=?, admin_action_date=?, action_by_name=? WHERE c_number=? AND d_in=0', actor],
            ['UPDATE trip_created SET admin_status=? WHERE id=? AND c_number=? AND d_in=0', [status, trip.id, trip.c_number]],
          ];
          const voucher = rows[0].voucher_number;
          if (voucher) {
            operations.push(
              ['UPDATE mainvoucher_t SET status=?, admin_status_by_id=?, admin_status_by_name=?, admin_status_by_date=? WHERE c_number=? AND d_in=0',
                [status, data.user_id, data.user_nm, data.updated_date, voucher]],
              ['UPDATE mainvoucher_subt SET status=? WHERE c_number=? AND d_in=0 AND EXISTS (SELECT 1 FROM mainvoucher_t vh WHERE vh.c_number=? AND vh.d_in=0)',
                [status, voucher, voucher]],
            );
          }
          const results = [];
          const next = () => {
            if (!operations.length) return connection.commit(err => {
              if (err) return fail(err);
              connection.release(); callback(null, results);
            });
            const [sql, values] = operations.shift();
            connection.query(sql, values, (err, result) => {
              if (err) return fail(err);
              results.push(result); next();
            });
          };
          if (data.requireAlreadyApproved) {
            if (!voucher || voucher !== trip.voucher_number) return fail(new Error('Trip voucher link changed'));
            return connection.query('SELECT status FROM mainvoucher_t WHERE c_number=? AND d_in=0 FOR UPDATE', [voucher], (err, headers) => {
              if (err) return fail(err);
              if (!headers.length || headers.some(header => Number(header.status) !== 0)) return fail(new Error('Trip voucher is no longer pending'));
              next();
            });
          }
          next();
        });
    });
  });
}

module.exports = { updateTripApproval };
