// Once a voucher is approved it is locked. Only these users (matched on their
// login mobile number) may revert it to pending or edit it.
const APPROVED_EDITOR_NUMBERS = ['7032285554']; // DSP

const pool = require('../config/dbconnect');

// Calls back with an error response to send, or null when the action may go on.
// `userId` is the authenticated user (req.auth.usid), never a body field.
function guardApprovedVoucher(userId, cNumber, callback) {
  pool.query("SELECT status FROM mainvoucher_t WHERE c_number = ? AND d_in = 0 ORDER BY id DESC LIMIT 1", [cNumber], (err, rows) => {
    if (err) return callback({ code: 500, message: 'DB error' });
    if (!rows || !rows[0] || Number(rows[0].status) !== 1) return callback(null);
    pool.query("SELECT number FROM users WHERE id = ? AND d_in = 0", [userId], (uErr, users) => {
      if (uErr) return callback({ code: 500, message: 'DB error' });
      const number = users && users[0] ? String(users[0].number).trim() : '';
      if (APPROVED_EDITOR_NUMBERS.includes(number)) return callback(null);
      callback({ code: 403, message: 'Approved vouchers can only be reverted or edited by an authorised user' });
    });
  });
}

module.exports = { APPROVED_EDITOR_NUMBERS, guardApprovedVoucher };
