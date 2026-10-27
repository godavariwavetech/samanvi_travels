import React, { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Eye, EyeOff, Pencil, Save, UserCircle, Users, SlidersHorizontal } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Badge, Button, DataTable, GlassCard, Input, Label, PageHeader, Select } from '@/components/shared'
import type { Column } from '@/components/shared'
import { usersService } from '@/services/users.service'
import { useAuthStore } from '@/store/auth.store'
import { isValidMobile } from '@/lib/utils'

const DEPT_MAP: Record<string, string> = { '1': 'Administration', '2': 'Operations', '3': 'Accounts', '4': 'Chairman', '5': 'Supervisor' }
const digitsOnly = (value: string) => value.replace(/\D/g, '').slice(0, 10)
const emptyUser = { name: '', number: '', email: '', password: '', department_id: '1', role_id: '' }

function UserPermissionsPanel({ user, onClose }: { user: any; onClose: () => void }) {
  const qc = useQueryClient()
  const [rows, setRows] = useState<any[]>([])
  const permissionsQuery = useQuery({
    queryKey: ['user-permission-overrides', user.id],
    queryFn: () => usersService.getUserPermissionOverrides({ user_id: user.id }),
  })
  useEffect(() => { setRows(permissionsQuery.data?.data ?? []) }, [permissionsQuery.data])
  const save = useMutation({
    mutationFn: () => usersService.saveUserPermissionOverrides({ user_id: user.id, modules: rows }),
    onSuccess: (res) => {
      if (res?.status !== 200) return toast.error(res?.message || 'Could not save service access')
      toast.success(`Service access saved for ${user.name}`)
      qc.invalidateQueries({ queryKey: ['user-permission-overrides', user.id] })
      onClose()
    },
    onError: () => toast.error('Could not save service access'),
  })
  const reset = useMutation({
    mutationFn: () => usersService.saveUserPermissionOverrides({ user_id: user.id, reset: true }),
    onSuccess: (res) => {
      if (res?.status !== 200) return toast.error(res?.message || 'Could not restore role access')
      toast.success(`Role access restored for ${user.name}`)
      qc.invalidateQueries({ queryKey: ['user-permission-overrides', user.id] })
      qc.invalidateQueries({ queryKey: ['users'] })
    },
    onError: () => toast.error('Could not restore role access'),
  })
  const groups = Object.entries(rows.reduce<Record<string, any[]>>((acc, row) => {
    (acc[row.module_nm] ??= []).push(row)
    return acc
  }, {}))
  const toggle = (id: number, key: string, enabled: boolean) => setRows((prev) => prev.map((row) => {
    if (Number(row.id) !== id) return row
    if (key === 'can_view' && !enabled) return { ...row, can_view: 0, can_add: 0, can_edit: 0, can_delete: 0, can_approve: 0, can_authorize: 0 }
    return { ...row, [key]: enabled ? 1 : 0, ...(key !== 'can_view' && enabled ? { can_view: 1 } : {}) }
  }))
  const rights: Array<[string, string]> = [['can_view', 'View'], ['can_add', 'Add'], ['can_edit', 'Edit'], ['can_delete', 'Delete'], ['can_approve', 'Approve'], ['can_authorize', 'Authorize']]
  return <GlassCard className="p-5" colorBar="bg-gradient-to-r from-teal-500 to-cyan-500">
    <div className="flex items-start justify-between gap-4 mb-4">
      <div><h2 className="font-bold text-lg"><SlidersHorizontal className="inline w-4 h-4 mr-2" />Customize Services — {user.name}</h2><p className="text-xs text-slate-500 mt-1">These per-user selections override the assigned role. Turn off View to remove a service from this user.</p></div>
      <div className="flex gap-2"><Button variant="secondary" size="sm" onClick={() => reset.mutate()} disabled={reset.isPending || permissionsQuery.isLoading}>Reset to Role</Button><Button variant="secondary" size="sm" onClick={onClose}>Close</Button><Button size="sm" variant="teal" disabled={save.isPending || permissionsQuery.isLoading} onClick={() => save.mutate()}><Save className="w-4 h-4" />{save.isPending ? 'Saving…' : 'Save Access'}</Button></div>
    </div>
    {permissionsQuery.isLoading ? <p className="p-6 text-center text-sm text-slate-400">Loading services…</p> : <div className="space-y-3 max-h-[60vh] overflow-auto pr-1">
      {groups.map(([name, items]) => <section key={name} className="rounded-xl border border-slate-200 overflow-hidden">
        <h3 className="px-4 py-2 bg-slate-50 text-sm font-bold">{name}</h3>
        <div className="grid grid-cols-[minmax(140px,1fr)_repeat(6,minmax(54px,72px))] gap-y-1 px-3 py-2 text-[10px] font-bold uppercase text-slate-400">
          <span>Service</span>{rights.map(([, label]) => <span key={label} className="text-center">{label}</span>)}
          {items.map((row: any) => <React.Fragment key={row.id}>
            <span className="self-center text-xs font-medium text-slate-700">{row.title}</span>
            {rights.map(([key, label]) => <label key={key} className="flex justify-center self-center" title={`${label} ${row.title}`}>
              <input type="checkbox" aria-label={`${label} ${row.title} for ${user.name}`} checked={Number(row[key]) === 1} disabled={(key !== 'can_view' && !row.can_view) || (key === 'can_authorize' && Number(user.role_id) <= 2)} onChange={(e) => toggle(Number(row.id), key, e.target.checked)} className="h-4 w-4 accent-teal-600 disabled:opacity-40" />
            </label>)}
          </React.Fragment>)}
        </div>
      </section>)}
    </div>}
  </GlassCard>
}

function EditUserPanel({ user, onClose }: { user: any; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ name: String(user.name ?? ''), number: String(user.number ?? ''), email: String(user.email ?? ''), department_id: String(user.department_id ?? '1') })
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const change = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((v) => ({ ...v, [key]: key === 'number' ? digitsOnly(e.target.value) : e.target.value }))
  const errors = !form.name.trim() || !isValidMobile(form.number) || (password.trim() && password !== confirm)
  const save = useMutation({
    mutationFn: () => usersService.updateUser({ id: user.id, ...form, name: form.name.trim(), email: form.email.trim(), department_name: DEPT_MAP[form.department_id] ?? 'Administration', role_type: user.role_type, password: password.trim() }),
    onSuccess: (res: any) => {
      if (res.status === 200) { toast.success('User updated'); qc.invalidateQueries({ queryKey: ['users'] }); onClose() }
      else toast.error(res.message ?? 'Unable to update user')
    },
    onError: () => toast.error('Unable to update user'),
  })
  return <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
    <GlassCard className="p-6" colorBar="bg-gradient-to-r from-amber-400 to-orange-500">
      <div className="flex items-center justify-between mb-5"><h2 className="font-bold text-lg"><Pencil className="inline w-4 h-4 mr-2" />Edit User — {user.name}</h2><button onClick={onClose}>✕</button></div>
      <div className="grid md:grid-cols-3 gap-4">
        <div><Label>Full Name *</Label><Input value={form.name} onChange={change('name')} /></div>
        <div><Label>Mobile *</Label><Input inputMode="numeric" maxLength={10} value={form.number} onChange={change('number')} /></div>
        <div><Label>Email</Label><Input type="email" value={form.email} onChange={change('email')} /></div>
        <div><Label>Department</Label><Select value={form.department_id} onChange={change('department_id')}>{Object.entries(DEPT_MAP).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</Select></div>
        <div><Label>New Password</Label><div className="relative"><Input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} /><button type="button" className="absolute right-3 top-3" onClick={() => setShowPassword((v) => !v)}>{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div></div>
        <div><Label>Confirm Password</Label><Input type={showPassword ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
      </div>
      <div className="flex justify-end gap-2 mt-5"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => save.mutate()} disabled={save.isPending || Boolean(errors)}><Save className="w-4 h-4" />{save.isPending ? 'Saving…' : 'Update User'}</Button></div>
    </GlassCard>
  </motion.div>
}

export default function UserManagementPage() {
  const authUser = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [customizing, setCustomizing] = useState<any>(null)
  const [form, setForm] = useState(emptyUser)
  const [showPassword, setShowPassword] = useState(false)
  const usersQuery = useQuery({ queryKey: ['users'], queryFn: usersService.getUsers })
  const rolesQuery = useQuery({ queryKey: ['roles'], queryFn: usersService.getRoles })
  const roles = rolesQuery.data?.data ?? []
  const users = usersQuery.data?.data ?? []
  const change = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((v) => ({ ...v, [key]: key === 'number' ? digitsOnly(e.target.value) : e.target.value }))
  const create = useMutation({
    mutationFn: () => usersService.createUser({
      userdetails: { name: form.name.trim(), number: form.number, email: form.email.trim(), mail: form.email.trim(), password: form.password, role_type: 1, department_id: form.department_id, department_name: DEPT_MAP[form.department_id] ?? 'Administration', designation_name: DEPT_MAP[form.department_id] ?? 'Administration', entry_by: String(authUser?.id ?? 1), section_id: 0, section_name: '', d_in: 0 },
      role_id: Number(form.role_id), permissionmodules: [], uploadind: 0, document: null,
    }),
    onSuccess: (res) => {
      if (res.status === 200) { toast.success('User created and role assigned'); qc.invalidateQueries({ queryKey: ['users'] }); setForm(emptyUser); setCreateOpen(false) }
      else if (res.status === 300) toast.error('Mobile number already exists')
      else toast.error(res.message ?? 'Unable to create user')
    },
    onError: () => toast.error('Unable to create user'),
  })
  const assignRole = useMutation({
    mutationFn: ({ user_id, role_id, can_authorize_trips }: { user_id: number; role_id: number; can_authorize_trips?: boolean | number }) => usersService.assignUserRole({ user_id, role_id, can_authorize_trips }),
    onSuccess: (res) => { if (res.status === 200) { toast.success('User role updated'); qc.invalidateQueries({ queryKey: ['users'] }); qc.invalidateQueries({ queryKey: ['my-menu'] }) } else toast.error(res.message ?? 'Unable to assign role') },
    onError: () => toast.error('Unable to assign role'),
  })
  const remove = useMutation({
    mutationFn: (id: number) => usersService.deleteUser(id),
    onSuccess: (res: any) => { if (res.status === 200) { toast.success('User deactivated'); qc.invalidateQueries({ queryKey: ['users'] }) } else toast.error('Unable to deactivate user') },
    onError: () => toast.error('Unable to deactivate user'),
  })
  const validCreate = Boolean(form.name.trim() && isValidMobile(form.number) && form.password.trim() && form.role_id)
  const columns: Column[] = [
    { label: 'Sl No', key: '_idx', align: 'center', render: (_v, _r, i) => <span>{i + 1}</span> },
    { label: 'User', key: 'name', render: (value, row: any) => <div><b>{String(value ?? '—')}</b><div className="text-xs text-slate-500">{row.number}</div></div> },
    { label: 'Department', key: 'department_name' },
    { label: 'Assigned Role', key: 'role_id', render: (value, row: any) => <Select aria-label={`Role for ${row.name}`} value={value ? String(value) : ''} disabled={assignRole.isPending} onChange={(e) => { if (e.target.value) { const roleId = Number(e.target.value); assignRole.mutate({ user_id: Number(row.id), role_id: roleId, can_authorize_trips: roleId <= 2 ? false : row.can_authorize_trips }) } }}><option value="">Select role</option>{roles.map((role: any) => <option key={role.id} value={role.id}>{role.name}</option>)}</Select> },
    { label: 'Authorize Trips', key: 'can_authorize_trips', render: (value, row: any) => <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600"><input type="checkbox" aria-label={`Authorize trips for ${row.name}`} checked={Number(value) === 1} disabled={!row.role_id || Number(row.role_id) <= 2 || assignRole.isPending} onChange={(e) => assignRole.mutate({ user_id: Number(row.id), role_id: Number(row.role_id), can_authorize_trips: e.target.checked })} className="h-4 w-4 accent-teal-600 disabled:opacity-40" />Allow</label> },
    { label: 'Service Access', key: 'service_access', render: (_value, row: any) => <Button variant="outline" size="sm" onClick={() => setCustomizing(row)}><SlidersHorizontal className="w-3.5 h-3.5" />Customize</Button> },
    { label: 'Status', key: 'd_in', render: (value) => <Badge variant={value == 0 ? 'success' : 'danger'}>{value == 0 ? 'Active' : 'Inactive'}</Badge> },
  ]

  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
    <div className="flex justify-between items-end"><PageHeader title="User Management" subtitle="Create users and assign a shared role" /><Button permission="add" onClick={() => { setCreateOpen((v) => !v); setEditing(null) }}><UserCircle className="w-4 h-4" />{createOpen ? 'Cancel' : 'Create User'}</Button></div>
    <AnimatePresence>{createOpen && <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}><GlassCard className="p-6" colorBar="bg-gradient-to-r from-blue-500 to-teal-400">
      <h2 className="font-bold text-lg mb-5">Create New User</h2><div className="grid md:grid-cols-3 gap-4">
        <div><Label>Full Name *</Label><Input value={form.name} onChange={change('name')} /></div><div><Label>Mobile Number *</Label><Input inputMode="numeric" maxLength={10} value={form.number} onChange={change('number')} /></div><div><Label>Email</Label><Input type="email" value={form.email} onChange={change('email')} /></div>
        <div><Label>Password *</Label><div className="relative"><Input type={showPassword ? 'text' : 'password'} value={form.password} onChange={change('password')} /><button type="button" className="absolute right-3 top-3" onClick={() => setShowPassword((v) => !v)}>{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div></div>
        <div><Label>Role *</Label><Select value={form.role_id} onChange={change('role_id')}><option value="">Select role</option>{roles.map((role: any) => <option key={role.id} value={role.id}>{role.name}</option>)}</Select></div>
        <div><Label>Department *</Label><Select value={form.department_id} onChange={change('department_id')}>{Object.entries(DEPT_MAP).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</Select></div>
      </div><div className="flex justify-end mt-5"><Button permission="add" onClick={() => create.mutate()} disabled={!validCreate || create.isPending}><Save className="w-4 h-4" />{create.isPending ? 'Saving…' : 'Save User'}</Button></div>
    </GlassCard></motion.div>}</AnimatePresence>
    <AnimatePresence>{editing && <EditUserPanel key={editing.id} user={editing} onClose={() => setEditing(null)} />}</AnimatePresence>
    {customizing && <UserPermissionsPanel key={customizing.id} user={customizing} onClose={() => setCustomizing(null)} />}
    <DataTable title={`System Users (${users.length})`} columns={columns} data={users} loading={usersQuery.isLoading} onAction={(action, row: any) => {
      if (action === 'edit') setEditing(row)
      if (action === 'delete') { if (String(authUser?.id) === String(row.id)) toast.error('You cannot deactivate your own account'); else remove.mutate(Number(row.id)) }
    }} actions={['edit', 'delete']} icon={<Users className="w-5 h-5 text-blue-500" />} />
  </motion.div>
}
