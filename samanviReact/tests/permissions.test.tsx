import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import { buildAccess, canAccess, permissionsFor } from '../src/lib/access'
import { useAuthStore, type MenuItem } from '../src/store/auth.store'
import { ApprovalRowActions, ApprovalBulkButtons, ApprovalModalButtons } from '../src/components/shared/ApprovalFlow'
import { DataTable } from '../src/components/shared/DataTable'
import { Button } from '../src/components/shared/Button'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ReferenceAuditModal from '../src/components/shared/ReferenceAuditModal'
import { formatAuditDate } from '../src/lib/auditDate'
import { useCanReviseApproved } from '../src/lib/approvedEditors'
import { needsAuthorization, awaitingApproval } from '../src/lib/tripAuthorization'

const viewer = { can_view: 1, can_add: 0, can_edit: 0, can_delete: 0 }
const menu = (id: number, module_id: number, rights = viewer): MenuItem[] => [{
  id: module_id, module_id, module_nm: 'Test', main_icon: '', path: '',
  submenu: [{ id, module_id, sub_nm: 'Test', path: '', ...rights }],
}]
const noop = () => {}
// The table's confirmation popup targets document.body even while closed.
// Its portal is rendered inline by the test runner's DOM adapter.
Object.assign(globalThis, { document: { body: {} } })
const render = (path: string, grants: MenuItem[], children: React.ReactNode) => {
  useAuthStore.setState({ menu: grants })
  return renderToStaticMarkup(<StaticRouter location={path}>{children}</StaticRouter>)
}

for (const [path, id, moduleId] of [
  ['/accounting/voucher-approvals', 61, 14], ['/fuel/entry', 31, 17],
  ['/laundry/bill', 43, 16], ['/trips/approvals', 34, 18],
] as const) {
  const grants = menu(id, moduleId)
  assert.deepEqual(permissionsFor(path, grants), {
    canView: true, canAdd: false, canEdit: false, canDelete: false, canApprove: false, canAuthorize: false,
  })
  assert.equal(canAccess(path, buildAccess(grants)), true)
  for (const tab of ['pending', 'rejected'] as const) {
    const html = render(path, grants, <ApprovalRowActions tab={tab} onView={noop} onEdit={noop}
      onDelete={noop} onApprove={noop} onReject={noop} onReopen={noop} />)
    assert.match(html, /title="View"/)
    assert.doesNotMatch(html, /title="(?:Edit|Delete|Approve|Reject|Reopen)/)
    assert.equal(render(path, grants, <ApprovalModalButtons tab={tab} onApprove={noop} onReject={noop} onReopen={noop} />), '')
  }
  assert.equal(render(path, grants, <ApprovalBulkButtons onApprove={noop} onReject={noop} />), '')
  assert.equal(render(path, grants, <Button permission="add">Create record</Button>), '')
  const table = render(path, grants, <DataTable columns={[{ label: 'Name', key: 'name' }]}
    data={[{ id: 1, name: 'Existing record' }]} actions={['view', 'edit', 'delete']} onAction={noop} exportable={false} />)
  assert.match(table, /Existing record/)
  assert.doesNotMatch(table, /title="(?:Edit|Delete)"/)
}

const noView = menu(61, 14, { ...viewer, can_view: 0, can_edit: 1 })
assert.equal(canAccess('/accounting/voucher-approvals', buildAccess(noView)), false)
assert.equal(canAccess('/ACCOUNTING/VOUCHER-APPROVALS/', buildAccess(noView)), false)
assert.equal(permissionsFor('/accounting/voucher-approvals', noView).canEdit, false)
assert.equal(canAccess('/accounting/voucher', buildAccess(menu(61, 14))), false)
assert.equal(permissionsFor('/accounting/voucher-approvals', menu(36, 14, { ...viewer, can_add: 1 })).canApprove, false)
const mixed = [...menu(34, 18), ...menu(35, 18, { ...viewer, can_view: 0, can_edit: 1 })]
assert.equal(permissionsFor('/trips/approvals', mixed).canApprove, false)

const editor = menu(61, 14, { ...viewer, can_edit: 1 })
const editorHtml = render('/accounting/voucher-approvals', editor,
  <ApprovalRowActions tab="pending" onView={noop} onEdit={noop} onDelete={noop} onApprove={noop} onReject={noop} onReopen={noop} />)
assert.match(editorHtml, /title="Approve"/)
assert.match(editorHtml, /title="Edit"/)
assert.doesNotMatch(editorHtml, /title="Delete"/)
const manager = menu(200, 19, { ...viewer, can_edit: 1 })
assert.equal(permissionsFor('/garage/tracking', manager).canApprove, true)
assert.equal(permissionsFor('/garage/tracking', manager).canEdit, false)
console.log('Frontend permission and rendered control regression checks passed.')

// Approving is its own grant: Add / Edit no longer imply it once the server
// sends can_approve, and the grant on its own is enough (with View).
const approveOnly = menu(61, 14, { ...viewer, can_approve: 1 } as typeof viewer)
assert.equal(permissionsFor('/accounting/voucher-approvals', approveOnly).canApprove, true)
assert.equal(permissionsFor('/accounting/voucher-approvals', approveOnly).canEdit, false)
const editorNoApprove = menu(61, 14, { ...viewer, can_add: 1, can_edit: 1, can_approve: 0 } as typeof viewer)
assert.equal(permissionsFor('/accounting/voucher-approvals', editorNoApprove).canApprove, false)

function ApprovedEditProbe() {
  return useCanReviseApproved() ? <button>Edit approved voucher</button> : null
}
for (const role of [0, '0', 1, null, undefined, '']) {
  useAuthStore.setState({ user: { role_type: role, number: '9999999999' } as any })
  const html = render('/accounting/voucher-approvals', menu(61, 14), <ApprovedEditProbe />)
  assert.equal(html.includes('Edit approved voucher'), role === 0 || role === '0')
}
for (const [user, expected] of [
  [{ role_id: 5, role_type: 1, number: '9999999999' }, true],
  [{ role_id: 3, role_type: 0, number: '9999999999' }, false],
  [{ role_id: 3, role_type: 1, number: '7032285554' }, true],
] as const) {
  useAuthStore.setState({ user: user as any })
  const html = render('/accounting/voucher-approvals', menu(61, 14), <ApprovedEditProbe />)
  assert.equal(html.includes('Edit approved voucher'), expected)
}
useAuthStore.setState({ user: null })

for (const status of [0, '0']) {
  const trip = { admin_status: status, status: '1', auth_required: '1' }
  assert.equal(needsAuthorization(trip), true)
  assert.equal(awaitingApproval(trip), false)
  assert.equal(needsAuthorization({ ...trip, authorized_at: '2026-10-26' }), false)
  assert.equal(awaitingApproval({ ...trip, authorized_at: '2026-10-26' }), true)
  assert.equal(awaitingApproval({ ...trip, auth_required: 0 }), true)
  assert.equal(needsAuthorization({ ...trip, status: 0 }), false)
  assert.equal(awaitingApproval({ ...trip, status: 0 }), false)
}
console.log('Approved voucher editing and trip authorization regression checks passed.')

assert.equal(formatAuditDate('2026-10-26 12:34:56'), '26/10/2026, 12:34:56 IST')
assert.equal(formatAuditDate('2026-10-26'), '26/10/2026 (time not recorded)')
assert.equal(formatAuditDate(null), 'Date and time not recorded')
for (const reference of ['T261021021', 'V123', 'F123', 'L123']) {
  const html = render('/accounting/daybook', menu(38, 14), <DataTable columns={[{ key: 'c_number', label: 'Ref No' }]}
    data={[{ id: 1, c_number: reference }]} exportable={false} />)
  assert.match(html, /View record details and activity/)
}
const client = new QueryClient()
client.setQueryData(['reference-audit', 'T261021021'], { module: 'Trip', report: { record: { c_number: 'T261021021' }, ledger: [] }, steps: [
  { label: 'Authorized', who: 'Authorizer', when: '2026-10-26 11:22:33', state: 'done' },
  { label: 'Approved', who: 'Approver', when: '2026-10-26 12:34:56', state: 'done' },
] })
const details = renderToStaticMarkup(<QueryClientProvider client={client}><ReferenceAuditModal reference="T261021021" onClose={noop} /></QueryClientProvider>)
assert.match(details, /Authorizer/)
assert.match(details, /Approver/)
assert.match(details, /12:34:56 IST/)
client.clear()
console.log('Reference audit identity, timestamps and rendered links passed.')
const actionCell = render('/laundry/bill', menu(43, 16), <DataTable
  columns={[{ label: 'Actions', key: 'c_number', render: () => <button>Existing action</button> }]}
  data={[{ c_number: 'L123' }]} exportable={false} />)
assert.match(actionCell, /Existing action/)
