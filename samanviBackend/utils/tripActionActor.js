// Audit identity comes from the verified token and active user record, never
// from user_id/user_nm supplied by the browser. Store action times in IST.
function tripActionData(pool, auth, body, callback, now = new Date()) {
  const id = Number(auth && auth.usid);
  if (!Number.isSafeInteger(id) || id <= 0) return callback(new Error('Invalid authenticated user'));
  pool.query('SELECT id, name FROM users WHERE id=? AND d_in=0', [id], (err, users) => {
    if (err) return callback(err);
    if (!users || !users.length) return callback(new Error('Active user not found'));
    const timestamp = new Date(now.getTime() + 330 * 60000).toISOString().slice(0, 19).replace('T', ' ');
    callback(null, { ...body, user_id: users[0].id, user_nm: users[0].name,
      named: users[0].name, usr_nm: users[0].name, user_name: users[0].name, entry_by: users[0].name,
      admin_status_by_id: users[0].id, admin_status_by_name: users[0].name,
      admin_status_by_date: timestamp, updated_date: timestamp, authorized_at: timestamp });
  });
}

module.exports = { tripActionData };
