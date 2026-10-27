// Match the active grants accepted by /authorizetrip. Unrelated modules and
// deleted users must not enable a workflow nobody can complete.
const tripAuthorizersSql = `SELECT COUNT(*) FROM (
  SELECT p.user_id,p.module_id,p.sub_module_id,p.can_authorize,p.can_view,p.d_in FROM permissions p
  WHERE p.d_in=0 AND NOT EXISTS (SELECT 1 FROM app_user_roles ur WHERE ur.user_id=p.user_id)
    AND NOT EXISTS (SELECT 1 FROM app_user_permission_overrides ov WHERE ov.user_id=p.user_id AND ov.sub_module_id=p.sub_module_id)
  UNION ALL
  SELECT ur.user_id,rp.module_id,rp.sub_module_id,CASE WHEN ur.can_authorize_trips=1 AND rp.module_id=18 THEN 1 WHEN ur.role_id IN (1,2) THEN 0 ELSE rp.can_authorize END AS can_authorize,rp.can_view,0 AS d_in
  FROM app_user_roles ur JOIN app_role_permissions rp ON rp.role_id=ur.role_id
  WHERE NOT EXISTS (SELECT 1 FROM app_user_permission_overrides ov WHERE ov.user_id=ur.user_id AND ov.sub_module_id=rp.sub_module_id)
  UNION ALL
  SELECT ov.user_id,ov.module_id,ov.sub_module_id,ov.can_authorize,ov.can_view,0 AS d_in
  FROM app_user_permission_overrides ov
) pa
  JOIN users au ON au.id = pa.user_id AND au.d_in = 0
  JOIN sub_modules asm ON asm.id = pa.sub_module_id AND asm.d_in = 0
  JOIN main_modules am ON am.id = pa.module_id AND am.d_in = 0
  WHERE pa.module_id = 18 AND pa.can_authorize = 1 AND pa.can_view = 1 AND pa.d_in = 0`;

module.exports = { tripAuthorizersSql };
