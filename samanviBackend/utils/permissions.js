// Resolve action rights from the authenticated user's current database grants.
// Approval/rejection/reopening require a write grant; View alone never suffices.
function allows(grants, action) {
  return grants.some(grant => Number(grant.can_view) === 1 && (action === 'approve'
    ? Number(grant.can_add) === 1 || Number(grant.can_edit) === 1
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
        scope = '(' + scope + ' OR (u.role_type IN (0, 1) AND p.sub_module_id IN (' +
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
    pool.query(`SELECT p.can_view, p.can_add, p.can_edit, p.can_delete
      FROM permissions p
      JOIN users u ON u.id = p.user_id AND u.d_in = 0
      JOIN sub_modules sm ON sm.id = p.sub_module_id AND sm.d_in = 0
      JOIN main_modules m ON m.id = p.module_id AND m.d_in = 0
      WHERE p.user_id = ? AND p.d_in = 0 AND ${scope}`, values, (error, grants) => {
      if (error) return res.status(500).json({ status: 500, msg: 'Permission check failed' });
      if (!allows(grants || [], action)) {
        return res.status(403).json({ status: 403, msg: 'Permission denied' });
      }
      next();
    });
  };
}

const API_PERMISSIONS = {
  '/postusermenulist': [{ subs: [2] }, 'edit'],
  '/createuserpermissions': [{ subs: [2] }, 'add'],
  '/updateuser': [{ subs: [2] }, 'edit'],
  '/submitvoucherentrydata': [{ subs: [36] }, 'add'],
  '/updatevoucherentry': [{ subs: [36, 61] }, 'edit'],
  '/deletevoucherentry': [{ subs: [36, 61] }, 'delete'],
  '/updatevoucherentrystatus': [{ subs: [61] }, 'approve'],
  '/updatetripadminstatus': [{ module: 18 }, 'approve'],
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
