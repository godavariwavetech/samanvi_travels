// Once a voucher is approved it is locked. Only these users may revert it to
// pending or edit it: the listed login mobile numbers, and every Super Admin
// (users.role_type = 0).
const APPROVED_EDITOR_NUMBERS = ['7032285554']; // DSP

const pool = require('../config/dbconnect');

function isEditor(user) {
  if (!user) return false;
  // role_type can come back null/''; Number() would read both as 0.
  const superAdmin = user.role_id != null
    ? Number(user.role_id) === 5
    : user.role_type !== null && user.role_type !== undefined && String(user.role_type).trim() !== '' && Number(user.role_type) === 0;
  return superAdmin || APPROVED_EDITOR_NUMBERS.includes(String(user.number).trim());
}

function loadUser(userId, callback) {
  pool.query("SELECT u.number,u.role_type,ur.role_id,ar.name AS role_name FROM users u LEFT JOIN app_user_roles ur ON ur.user_id=u.id LEFT JOIN app_roles ar ON ar.id=ur.role_id WHERE u.id=? AND u.d_in=0", [userId], callback);
}

// Calls back with an error response to send, or null when the action may go on.
// `userId` is the authenticated user (req.auth.usid), never a body field.
function guardApprovedVoucher(userId, cNumber, callback) {
  pool.query("SELECT status FROM mainvoucher_t WHERE c_number = ? AND d_in = 0 ORDER BY id DESC LIMIT 1", [cNumber], (err, rows) => {
    if (err) return callback({ code: 500, message: 'DB error' });
    if (!rows || !rows[0] || Number(rows[0].status) !== 1) return callback(null);
    loadUser(userId, (uErr, users) => {
      if (uErr) return callback({ code: 500, message: 'DB error' });
      if (isEditor(users && users[0])) return callback(null);
      callback({ code: 403, message: 'Approved vouchers can only be reverted or edited by an authorised user' });
    });
  });
}

// True when the authenticated user may change approved records. Used where the
// lock is on something other than a voucher (an approved trip expense).
function isApprovedEditor(userId, callback) {
  loadUser(userId, (err, users) => callback(!err && isEditor(users && users[0])));
}

module.exports = { APPROVED_EDITOR_NUMBERS, guardApprovedVoucher, isApprovedEditor };
