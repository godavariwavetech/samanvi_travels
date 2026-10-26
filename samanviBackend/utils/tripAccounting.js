// Older trips used a voucher instead of their own expense rows in reports.
// A stale link to a deleted/missing voucher must not hide approved expenses.
// Only approved vouchers enter the books; trip approval synchronizes their status.
function tripRowsWithoutVoucher(alias) {
  const col = (alias || 'expensive_details') + '.c_number';
  return `NOT EXISTS (SELECT 1 FROM trip_created tc
    JOIN mainvoucher_t tv ON tv.c_number = tc.voucher_number AND tv.d_in = 0
    WHERE tc.c_number = ${col} AND tc.d_in = 0
      AND tc.voucher_number IS NOT NULL AND tc.voucher_number <> '')`;
}

module.exports = { tripRowsWithoutVoucher };
