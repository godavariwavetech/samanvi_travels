const test = require('node:test');
const assert = require('node:assert/strict');
const { tripActionData } = require('../utils/tripActionActor');
const { loadReferenceAudit, tripSteps, approvalStep } = require('../utils/referenceAudit');

test('audit identity ignores browser actor/date fields and records server IST to seconds', () => {
  const pool = { query(sql, values, cb) {
    assert.match(sql, /d_in=0/); assert.deepEqual(values, [17]);
    cb(null, [{ id: 17, name: 'Actual approver' }]);
  } };
  tripActionData(pool, { usid: 17 }, { user_id: 99, user_nm: 'Forged', named: 'Forged', updated_date: '2000-01-01' }, (err, data) => {
    assert.equal(err, null);
    for (const key of ['user_nm', 'named', 'user_name', 'admin_status_by_name']) assert.equal(data[key], 'Actual approver');
    assert.equal(data.user_id, 17);
    assert.equal(data.updated_date, '2026-10-27 01:00:12');
    assert.equal(data.authorized_at, data.updated_date);
  }, new Date('2026-10-26T19:30:12Z'));
});

test('invalid/deleted users cannot manufacture an audit actor', () => {
  tripActionData({}, null, {}, err => assert.match(err.message, /Invalid authenticated user/));
  tripActionData({ query(sql, values, cb) { cb(null, []); } }, { usid: 17 }, {}, err => assert.match(err.message, /Active user not found/));
});

test('trip authorization and approval show different actors and times', () => {
  const steps = tripSteps({ admin_status: 1, action_by_name: 'Approver', admin_action_date: '2026-10-26 11:01:02',
    authorization: { id: 8, by: 'Authorizer', at: '2026-10-26 10:01:02' } });
  assert.equal(steps.find(s => s.label === 'Authorized').who, 'Authorizer');
  assert.equal(steps.find(s => s.label === 'Approved').when, '2026-10-26 11:01:02');
  assert.equal(approvalStep(0, 'Old approver', 'old').who, null);
  assert.equal(approvalStep(2, 'Rejector', 'date').label, 'Rejected');
});

function poolFor(records) {
  return { query(sql, values, cb) {
    assert.equal(values.length, 1);
    const table = sql.match(/FROM (\w+)/)[1];
    cb(null, records[table] || []);
  } };
}
test('every approval module maps its stored actor and exact timestamp', async () => {
  const at = '2026-10-26 12:34:56';
  const cases = [
    ['mainvoucher_t', { status: 1, admin_status_by_name: 'Voucher approver', admin_status_by_date: at }, 'Voucher approver'],
    ['fuel_entry', { admin_status: 1, admin_status_byname: 'Fuel approver', admin_status_bydate: at }, 'Fuel approver'],
    ['laundrybill_maint', { admin_status: 1, admin_action_name: 'Laundry approver', admin_action_date: at }, 'Laundry approver'],
  ];
  for (const [table, row, name] of cases) {
    const result = await loadReferenceAudit(poolFor({ [table]: [row] }), 'REF1', () => {});
    const approved = result.steps.find(s => s.label === 'Approved');
    assert.equal(approved.who, name); assert.equal(approved.when, at);
    assert.equal(result.steps.find(s => s.label === 'Authorized').state, 'not_applicable');
  }
});

test('voucher dates can recover exact time from the matching audit event', async () => {
  const result = await loadReferenceAudit(poolFor({ mainvoucher_t: [{ status: 1, admin_status_by_date: '2026-10-26' }],
    mainvoucher_audit: [{ action: 'approved', action_by_name: 'Approver', action_at: '2026-10-26 12:01:02' }] }), 'V1', () => {});
  assert.equal(result.steps.find(s => s.label === 'Approved').when, '2026-10-26 12:01:02');
});

test('garage reference shows recorded approval stages and missing references return null', async () => {
  const result = await loadReferenceAudit(poolFor({ vehicle_jobs: [{ created_by: 'Creator' }],
    job_approval_stages: [{ stage: 'manager', action: 'approved', action_by_name: 'Manager', action_at: '2026-10-26 12:00:01' }] }), 'J1', () => {});
  assert.equal(result.steps.find(s => s.label === 'manager: approved').who, 'Manager');
  assert.equal(await loadReferenceAudit(poolFor({}), 'missing', () => {}), null);
  await assert.rejects(loadReferenceAudit({ query(sql, values, cb) { cb(new Error('DB unavailable')); } }, 'V1', () => {}), /DB unavailable/);
});
