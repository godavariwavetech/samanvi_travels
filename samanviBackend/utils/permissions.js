// Resolve action rights from the authenticated user's current database grants.
// Approval/rejection/reopening need the sub-module's own Approve grant
// (permissions.can_approve); View, Add or Edit alone never suffice. Only a
// database that has no can_approve column yet falls back to the old rule
// (a write grant), so a failed migration does not lock approvers out.
function allows(grants, action) {
  // Authorize is only ever an explicit tick, with no fallback to a write grant.
  if (action === 'authorize') return grants.some(grant => Number(grant.can_view) === 1 && Number(grant.can_authorize) === 1);
  return grants.some(grant => Number(grant.can_view) === 1 && (action === 'approve'
    ? (grant.can_approve === undefined
        ? Number(grant.can_add) === 1 || Number(grant.can_edit) === 1
        : Number(grant.can_approve) === 1)
    : Number(grant['can_' + action]) === 1));
}

function requirePermission(rule, action, database) {
  return function (req, res, next) {
    const userId = Number(req.auth && req.auth.usid);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(401).json({ status: 401, msg: 'Invalid token' });
    }
    const values = [userId];
    let scope;
    if (rule.subs && rule.subs.length) {
      scope = 'p.sub_module_id IN (' + rule.subs.map(() => '?').join(',') + ')';
      values.push(...rule.subs);
      if (rule.adminFallback && rule.adminFallback.length) {
        scope = '(' + scope + ' OR ((ur.role_id IN (3, 5) OR (ur.user_id IS NULL AND u.role_type IN (0, 1))) AND p.sub_module_id IN (' +
          rule.adminFallback.map(() => '?').join(',') + ')))';
        values.push(...rule.adminFallback);
      }
    } else if (rule.module != null) {
      scope = 'p.module_id = ?';
      values.push(rule.module);
    } else {
      return res.status(403).json({ status: 403, msg: 'Permission denied' });
    }
    const pool = database || require('../config/dbconnect');
    pool.query(`SELECT p.*
      FROM (
        SELECT legacy.user_id, legacy.module_id, legacy.sub_module_id, legacy.can_add, legacy.can_edit,
          legacy.can_delete, legacy.can_view, legacy.can_approve, legacy.can_authorize, legacy.d_in
        FROM permissions legacy
        WHERE legacy.d_in=0 AND NOT EXISTS (SELECT 1 FROM app_user_roles ur WHERE ur.user_id=legacy.user_id)
          AND NOT EXISTS (SELECT 1 FROM app_user_permission_overrides ov WHERE ov.user_id=legacy.user_id AND ov.sub_module_id=legacy.sub_module_id)
        UNION ALL
        SELECT ur.user_id, rp.module_id, rp.sub_module_id, rp.can_add, rp.can_edit,
          rp.can_delete, rp.can_view, rp.can_approve, CASE WHEN ur.role_id IN (1,2) THEN 0 ELSE rp.can_authorize END AS can_authorize, 0 AS d_in
        FROM app_user_roles ur JOIN app_role_permissions rp ON rp.role_id=ur.role_id
        WHERE NOT EXISTS (SELECT 1 FROM app_user_permission_overrides ov WHERE ov.user_id=ur.user_id AND ov.sub_module_id=rp.sub_module_id)
        UNION ALL
        SELECT ov.user_id, ov.module_id, ov.sub_module_id, ov.can_add, ov.can_edit,
          ov.can_delete, ov.can_view, ov.can_approve, ov.can_authorize, 0 AS d_in
        FROM app_user_permission_overrides ov
      ) p
      JOIN users u ON u.id = p.user_id AND u.d_in = 0
      LEFT JOIN app_user_roles ur ON ur.user_id=u.id
      JOIN sub_modules sm ON sm.id = p.sub_module_id AND sm.d_in = 0
      JOIN main_modules m ON m.id = p.module_id AND m.d_in = 0
      WHERE p.user_id = ? AND p.d_in = 0 AND ${scope}`, values, (error, grants) => {
      if (error) return res.status(500).json({ status: 500, msg: 'Permission check failed' });
      if (!allows(grants || [], action)) {
        // Voucher editing is an explicit Super Admin capability, even when
        // this account has no per-screen Edit tick. Read the current DB role.
        if (rule.superAdminEdit && action === 'edit') {
          return pool.query('SELECT u.role_type, ar.id AS role_id FROM users u LEFT JOIN app_user_roles ur ON ur.user_id=u.id LEFT JOIN app_roles ar ON ar.id=ur.role_id WHERE u.id = ? AND u.d_in = 0', [userId], (roleError, users) => {
            if (roleError) return res.status(500).json({ status: 500, msg: 'Permission check failed' });
            const role = users && users[0] && users[0].role_type;
            if (Number(users[0].role_id) === 5 || (users[0].role_id == null && (role === 0 || role === '0'))) return next();
            return res.status(403).json({ status: 403, msg: 'Permission denied' });
          });
        }
        return res.status(403).json({ status: 403, msg: 'Permission denied' });
      }
      next();
    });
  };
}

const API_PERMISSIONS = {
  '/postusermenulist': [{ subs: [2] }, 'edit'],
  '/getroles': [{ subs: [2] }, 'edit'],
  '/getrolemodulepermissions': [{ subs: [2] }, 'edit'],
  '/saverolemodules': [{ subs: [2] }, 'edit'],
  '/assignuserrole': [{ subs: [2] }, 'edit'],
  '/getuserpermissionoverrides': [{ subs: [2] }, 'edit'],
  '/saveuserpermissionoverrides': [{ subs: [2] }, 'edit'],
  '/createuserpermissions': [{ subs: [2] }, 'add'],
  '/updateuser': [{ subs: [2] }, 'edit'],
  '/submitvoucherentrydata': [{ subs: [36] }, 'add'],
  '/updatevoucherentry': [{ subs: [36, 61], superAdminEdit: true }, 'edit'],
  '/deletevoucherentry': [{ subs: [36, 61] }, 'delete'],
  '/updatevoucherentrystatus': [{ subs: [61] }, 'approve'],
  '/updatetripadminstatus': [{ module: 18 }, 'approve'],
  '/authorizetrip': [{ module: 18 }, 'authorize'],
  '/updatefueladminstatus': [{ subs: [31] }, 'approve'],
  '/updatelaundryadminstatus': [{ subs: [43] }, 'approve'],
  '/submitfuelentery': [{ subs: [31] }, 'add'],
  '/updatefuelenterydata': [{ subs: [31] }, 'edit'],
  '/deletefueldata': [{ subs: [31] }, 'delete'],
  '/submitlaundrydata': [{ subs: [30] }, 'add'],
  '/updateLaundryData': [{ subs: [30] }, 'edit'],
  '/deletelaundryvendor': [{ subs: [30] }, 'delete'],
  '/submitlaundryaddbill': [{ subs: [43] }, 'add'],
  '/updateLaundryBill': [{ subs: [43] }, 'edit'],
  '/deletelaundrybill': [{ subs: [43] }, 'delete'],
  '/tripcreated': [{ subs: [34] }, 'add'],
  '/deletetripcreated': [{ subs: [34] }, 'delete'],
  '/addexpensesdetails': [{ subs: [35] }, 'add'],
  '/updateexpensesdetails': [{ subs: [35] }, 'edit'],
  '/deleteexpense': [{ subs: [35] }, 'delete'],
  '/addrepairentry': [{ subs: [62] }, 'add'],
  '/editrepairentry': [{ subs: [62, 63] }, 'edit'],
  '/updatejobvoucher': [{ subs: [63] }, 'edit'],
  '/garage/edit-job': [{ subs: [63] }, 'edit'],
  '/submitrepairtracking': [{ subs: [201], adminFallback: [63] }, 'approve'],
  '/garage/workflow-action': [{ subs: [63, 200] }, 'approve'],
  '/changeJobSatus': [{ subs: [63, 200, 201] }, 'approve'],
};

const normalizedOperations = new Map(Object.entries(API_PERMISSIONS).map(([route, rule]) => [route.toLowerCase(), rule]));

function permissionForOperation(method, pathname) {
  // Express routes accept case variants and trailing slashes by default.
  // Permission matching must accept exactly the same variants.
  const route = pathname.toLowerCase().replace(/\/+$/, '');
  if (method === 'POST') return normalizedOperations.get(route);
  if (method === 'GET' && /^\/deleteusers\/[^/]+$/.test(route)) return [{ subs: [2] }, 'delete'];
  return undefined;
}

module.exports = { allows, requirePermission, API_PERMISSIONS, permissionForOperation };
