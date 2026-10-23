const test = require('node:test');
const assert = require('node:assert/strict');
const { allows, requirePermission, API_PERMISSIONS, permissionForOperation } = require('../utils/permissions');

const viewer = { can_view: 1, can_add: 0, can_edit: 0, can_delete: 0 };

function check(rule, action, grants, auth = { usid: 17 }, error = null) {
  const result = { allowed: false };
  const database = { query(sql, values, callback) {
    result.sql = sql; result.values = values;
    callback(error, grants);
  } };
  const req = { auth, body: { user_id: 1, role_type: 0 } };
  const res = { status(code) { result.status = code; return this; }, json(body) { result.body = body; return this; } };
  requirePermission(rule, action, database)(req, res, () => { result.allowed = true; });
  return result;
}

test('View-only grants cannot add, edit, delete, approve, reject or reopen', () => {
  assert.equal(allows([viewer], 'view'), true);
  for (const action of ['add', 'edit', 'delete', 'approve']) assert.equal(allows([viewer], action), false);
  for (const [endpoint, [rule, action]] of Object.entries(API_PERMISSIONS)) {
    const result = check(rule, action, [viewer]);
    assert.equal(result.status, 403, endpoint);
    assert.equal(result.allowed, false, endpoint);
  }
});

test('request user/role fields cannot change whose rights are checked', () => {
  const result = check({ subs: [61] }, 'approve', [viewer]);
  assert.deepEqual(result.values, [17, 61]);
  assert.match(result.sql, /u\.d_in = 0/);
  assert.match(result.sql, /sm\.d_in = 0/);
  assert.match(result.sql, /p\.d_in = 0/);
  assert.equal(result.allowed, false);
});

test('write grants are specific; missing View fails closed', () => {
  assert.equal(check({ subs: [61] }, 'approve', [{ ...viewer, can_edit: '1' }]).allowed, true);
  assert.equal(check({ subs: [61] }, 'approve', [{ ...viewer, can_add: 1 }]).allowed, true);
  assert.equal(check({ subs: [61] }, 'delete', [{ ...viewer, can_edit: 1 }]).allowed, false);
  assert.equal(check({ subs: [61] }, 'edit', [{ ...viewer, can_view: 0, can_edit: 1 }]).allowed, false);
});

test('revoked/missing rights, invalid authentication and database errors fail closed', () => {
  assert.equal(check({ subs: [61] }, 'approve', []).status, 403);
  assert.equal(check({ subs: [61] }, 'approve', [viewer], null).status, 401);
  assert.equal(check({ subs: [61] }, 'approve', [viewer], { usid: 0 }).status, 401);
  assert.equal(check({ subs: [61] }, 'approve', [], { usid: 17 }, new Error('DB unavailable')).status, 500);
});

test('job admin fallback is restricted by the real database role and still needs write rights', () => {
  const result = check({ subs: [200], adminFallback: [63] }, 'approve', [viewer]);
  assert.deepEqual(result.values, [17, 200, 63]);
  assert.match(result.sql, /u\.role_type IN \(0, 1\)/);
  assert.equal(result.allowed, false);
});

test('case variants and trailing slashes cannot bypass mutation permissions', () => {
  for (const [endpoint, operation] of Object.entries(API_PERMISSIONS)) {
    assert.deepEqual(permissionForOperation('POST', endpoint.toUpperCase() + '/'), operation);
  }
  assert.deepEqual(permissionForOperation('GET', '/DELETEUSERS/3/'), [{ subs: [2] }, 'delete']);
  assert.equal(permissionForOperation('GET', '/getvoucherentrydata'), undefined);
});

test('with a can_approve column, approving needs that grant - Add/Edit no longer imply it', () => {
  const writer = { ...viewer, can_add: 1, can_edit: 1, can_approve: 0 };
  assert.equal(allows([writer], 'approve'), false);
  assert.equal(check({ subs: [61] }, 'approve', [writer]).status, 403);
  assert.equal(allows([{ ...viewer, can_approve: 1 }], 'approve'), true);
  assert.equal(allows([{ ...viewer, can_approve: '1' }], 'approve'), true);
  assert.equal(allows([{ ...writer, can_view: 0, can_approve: 1 }], 'approve'), false);
  // the grant only covers approving, not the other actions
  assert.equal(allows([{ ...viewer, can_approve: 1 }], 'edit'), false);
});

test('authorize is only ever an explicit can_authorize tick', () => {
  const writer = { ...viewer, can_add: 1, can_edit: 1, can_approve: 1 };
  assert.equal(allows([writer], 'authorize'), false);
  assert.equal(allows([{ ...writer, can_authorize: 0 }], 'authorize'), false);
  assert.equal(allows([{ ...viewer, can_authorize: 1 }], 'authorize'), true);
  assert.equal(allows([{ can_view: 0, can_authorize: 1 }], 'authorize'), false);
});
