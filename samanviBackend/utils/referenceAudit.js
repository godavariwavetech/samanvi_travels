function dateText(value) {
  if (!(value instanceof Date)) return value || null;
  const pad = n => String(n).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
}
function step(label, who, when, state = 'done', userId) {
  return { label, who: who || null, when: dateText(when), state, userId: userId || null };
}
function approvalStep(status, who, when, id) {
  const decided = Number(status) === 1 || Number(status) === 2;
  return step(Number(status) === 2 ? 'Rejected' : 'Approved', decided ? who : null,
    decided ? when : null, decided ? 'done' : 'pending', decided ? id : null);
}
function tripSteps(a) {
  return [step('Created', a.created_name, a.cts),
    step('Last edited', a.updatedby_name, a.updated_date, a.updatedby_name || a.updated_date ? 'done' : 'unknown'),
    step('Expense filed', a.filed_by_name, a.filed_date, a.filed_date ? 'done' : 'pending', a.filed_by_id),
    step('Authorized', a.authorization?.by, a.authorization?.at, a.authorization ? 'done' : 'pending', a.authorization?.id),
    approvalStep(a.admin_status, a.action_by_name, a.admin_action_date, a.approved_by_id)];
}
const noAuthorization = () => step('Authorized', null, null, 'not_applicable');

async function loadReferenceAudit(pool, reference, getTripAudit) {
  const query = (sql, values) => new Promise((resolve, reject) => pool.query(sql, values, (err, rows) => err ? reject(err) : resolve(rows)));
  if (/^T\d+$/i.test(reference)) {
    const trip = await new Promise((resolve, reject) => getTripAudit({ c_number: reference }, (err, row) => err ? reject(err) : resolve(row)));
    if (trip) return { reference, module: 'Trip', steps: tripSteps(trip) };
  }
  const sources = [
    { table: 'mainvoucher_t', key: 'c_number', module: 'Voucher', build: r => [
      step('Created', r.entry_by || r.name, r.i_ts, 'done', r.user_id),
      step('Last edited', r.updatedby_name, r.updatedby_date, r.updatedby_date ? 'done' : 'unknown', r.updatedby_id),
      noAuthorization(), approvalStep(r.status, r.admin_status_by_name, r.admin_status_by_date, r.admin_status_by_id)] },
    { table: 'fuel_entry', key: 'c_number', module: 'Fuel', build: r => [
      step('Created', r.entry_by, r.i_ts, 'done', r.user_id),
      step('Last edited', r.updatedby, r.updated_date, r.updated_date ? 'done' : 'unknown', r.updatedid),
      noAuthorization(), approvalStep(r.admin_status, r.admin_status_byname, r.admin_status_bydate, r.admin_status_byid)] },
    { table: 'laundrybill_maint', key: 'c_number', module: 'Laundry', build: r => [
      step('Created', r.entry_by, r.its_1 || r.date, 'done', r.user_id),
      step('Last edited', r.updated_by_name, r.updated_at, r.updated_at ? 'done' : 'unknown', r.updated_by),
      noAuthorization(), approvalStep(r.admin_status, r.admin_action_name, r.admin_action_date, r.admin_action_id)] },
    { table: 'vehicle_jobs', key: 'job_card_number', module: 'Garage', build: r => [step('Created', r.created_by, r.created_at), noAuthorization()] },
    { table: 'service_reminders', key: 'ref_number', module: 'Service reminder', build: r => [
      step('Created', r.created_by_name, r.created_at, 'done', r.created_by_id), noAuthorization(), step('Approved', null, null, 'not_applicable')] },
    { table: 'mainlaundry_t', key: 'c_number', module: 'Laundry vendor', build: r => [
      step('Created', r.entry_by, r.i_ts || r.date, 'done', r.user_id), noAuthorization(), step('Approved', null, null, 'not_applicable')] },
  ];
  for (const source of sources) {
    const rows = await query(`SELECT * FROM ${source.table} WHERE ${source.key}=? ORDER BY (d_in=0) DESC, id DESC LIMIT 1`, [reference]);
    if (!rows.length) continue;
    const steps = source.build(rows[0]);
    if (source.module === 'Voucher') {
      const events = await query('SELECT action, action_by_id, action_by_name, action_at FROM mainvoucher_audit WHERE c_number=? ORDER BY id', [reference]);
      const decision = Number(rows[0].status) === 1 ? 'approved' : Number(rows[0].status) === 2 ? 'rejected' : null;
      const last = [...events].reverse().find(event => event.action === decision);
      // Older headers sometimes stored a date only; the audit event retains
      // the actual time. Use it only when it agrees with the header's date.
      const current = steps[steps.length - 1];
      if (last && (!current.when || String(current.when).length <= 10) &&
          (!current.when || String(dateText(last.action_at)).startsWith(current.when))) {
        current.when = dateText(last.action_at);
        current.who = last.action_by_name || current.who;
        current.userId = last.action_by_id || current.userId;
      }
    }
    if (source.module === 'Garage') {
      const events = await query('SELECT stage, action, action_by_id, action_by_name, action_at FROM job_approval_stages WHERE job_card_number=? AND d_in=0 ORDER BY id', [reference]);
      steps.push(...events.map(e => step(`${e.stage}: ${e.action}`, e.action_by_name, e.action_at, 'done', e.action_by_id)));
      if (!events.length) steps.push(step('Approval history', null, null, 'unknown'));
    }
    return { reference, module: source.module, steps };
  }
  return null;
}

module.exports = { loadReferenceAudit, tripSteps, approvalStep, dateText };
