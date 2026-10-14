import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import { buildAccess, canAccess, permissionsFor } from '../src/lib/access'
import { useAuthStore, type MenuItem } from '../src/store/auth.store'
import { ApprovalRowActions, ApprovalBulkButtons, ApprovalModalButtons } from '../src/components/shared/ApprovalFlow'
import { DataTable } from '../src/components/shared/DataTable'
import { Button } from '../src/components/shared/Button'

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
    canView: true, canAdd: false, canEdit: false, canDelete: false, canApprove: false,
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
