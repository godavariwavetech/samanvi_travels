// Match the active grants accepted by /authorizetrip. Unrelated modules and
// deleted users must not enable a workflow nobody can complete.
const tripAuthorizersSql = `SELECT COUNT(*) FROM permissions pa
  JOIN users au ON au.id = pa.user_id AND au.d_in = 0
  JOIN sub_modules asm ON asm.id = pa.sub_module_id AND asm.d_in = 0
  JOIN main_modules am ON am.id = pa.module_id AND am.d_in = 0
  WHERE pa.module_id = 18 AND pa.can_authorize = 1 AND pa.can_view = 1 AND pa.d_in = 0`;

module.exports = { tripAuthorizersSql };
