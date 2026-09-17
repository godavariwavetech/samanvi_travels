import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { UserCircle, Save, Eye, EyeOff, Shield, ChevronDown, ChevronUp, Users, Pencil } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Select, Label, DataTable, Badge, PageHeader } from '@/components/shared'
import type { Column } from '@/components/shared'
import { usersService } from '@/services/users.service'
import { useAuthStore } from '@/store/auth.store'
import { isValidMobile } from '@/lib/utils'

const DEPT_MAP: Record<string, string> = {
  '1': 'Administration', '2': 'Operations', '3': 'Accounts', '4': 'Chairman', '5': 'Supervisor',
}

const EMPTY = { name: '', number: '', email: '', password: '', role_type: '1', department_id: '1' }

const ROLE_OPTIONS: [string, string][] = [
  ['0', 'Super Admin (Full Access)'],
  ['1', 'Admin (Full Access)'],
  ['2', 'Officer (Permission-based)'],
  ['3', 'Staff (Limited)'],
]

// Mobile is the login, so the field only ever holds digits.
const digitsOnly = (v: string) => v.replace(/\D/g, '').slice(0, 10)

// ── Edit user (profile, role, password) ───────────────────────────────────
function EditUserPanel({ user, onClose }: { user: any; onClose: () => void }) {
  const { user: authUser } = useAuthStore()
  const qc = useQueryClient()
  const [form, setForm] = useState({
    name: String(user.name ?? ''),
    number: String(user.number ?? ''),
    email: String(user.email ?? ''),
    role_type: String(user.role_type ?? '1'),
    department_id: String(user.department_id ?? '1'),
  })
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: k === 'number' ? digitsOnly(e.target.value) : e.target.value })

  const isSelf = String(authUser?.id) === String(user.id)
  const errors: string[] = []
  if (!form.name.trim()) errors.push('Name required.')
  if (!isValidMobile(form.number)) errors.push('Enter a valid 10-digit mobile number.')
  if (password.trim() && password !== confirmPassword) errors.push('Passwords do not match.')

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => usersService.updateUser({
      id: user.id,
      ...form,
      name: form.name.trim(),
      email: form.email.trim(),
      department_name: DEPT_MAP[form.department_id] ?? 'Administration',
      password: password.trim() ? password : '',
    }),
    onSuccess: (res: any) => {
      if (res.status === 200) {
        const roleChanged = String(user.role_type) !== form.role_type
        toast.success(password.trim() ? `${form.name} updated, password changed` : `${form.name} updated`)
        if (isSelf && (roleChanged || password.trim())) toast.info('Log out and sign in again for your changes to apply')
        qc.invalidateQueries({ queryKey: ['users'] })
        onClose()
      } else toast.error(res.message ?? 'Failed to update user')
    },
    onError: () => toast.error('Server error'),
  })

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
      <GlassCard className="p-6" colorBar="bg-gradient-to-r from-amber-400 to-orange-500">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Pencil className="w-5 h-5 text-amber-500" /> Edit User — {user.name}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-slate-100 transition-colors">✕</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div><Label>Full Name *</Label><Input value={form.name} onChange={f('name')} /></div>
          <div><Label>Mobile Number * (10 digits)</Label>
            <Input inputMode="numeric" maxLength={10} value={form.number} onChange={f('number')} /></div>
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={f('email')} /></div>
          <div><Label>Role Type *</Label>
            <Select value={form.role_type} onChange={f('role_type')}>
              {ROLE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select></div>
          <div><Label>Department *</Label>
            <Select value={form.department_id} onChange={f('department_id')}>
              {Object.entries(DEPT_MAP).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select></div>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-200">
          <h3 className="font-bold text-slate-700 mb-1">Change Password</h3>
          <p className="text-xs text-slate-500 mb-4">Leave blank to keep the current password.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div><Label>New Password</Label>
              <div className="relative">
                <Input type={showPwd ? 'text' : 'password'} autoComplete="new-password" placeholder="New password"
                  value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div><Label>{password.trim() ? 'Confirm Password *' : 'Confirm Password'}</Label>
              <Input type={showPwd ? 'text' : 'password'} autoComplete="new-password" placeholder="Re-enter new password"
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={!password.trim()} />
            </div>
          </div>
        </div>

        {errors.length > 0 && (
          <p className="text-xs text-amber-600 font-medium mt-4">{errors.map((e) => `• ${e} `)}</p>
        )}
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save()} disabled={isPending || errors.length > 0}>
            <Save className="w-4 h-4" />{isPending ? 'Saving…' : 'Update User'}
          </Button>
        </div>
      </GlassCard>
    </motion.div>
  )
}

// ── Permission row type ───────────────────────────────────────────────────
interface PermRow {
  id: number
  module_id: number
  module_nm: string
  title: string
  check_sub_menu: number
  can_view: number
  can_add: number
  can_edit: number
  can_delete: number
}

// ── Sub-module card (matches Angular's individual permission checkboxes) ──────
function SubModuleCard({ row, onToggle, onPerm, onCheckAll }: {
  row: PermRow
  onToggle: () => void
  onPerm: (key: 'can_add' | 'can_edit' | 'can_delete' | 'can_view') => void
  onCheckAll: () => void
}) {
  const allPerms = row.can_add && row.can_edit && row.can_delete && row.can_view
  const enabled = Boolean(row.check_sub_menu)

  return (
    <div className={`rounded-xl border p-4 transition-colors ${enabled ? 'border-violet-200 bg-white' : 'border-slate-200 bg-slate-50/60'}`}>
      {/* Sub-module title row */}
      <div className="flex items-center gap-2 mb-3">
        <button type="button" onClick={onToggle}
          className="flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
          style={{ borderColor: enabled ? '#7c3aed' : '#cbd5e1', backgroundColor: enabled ? '#7c3aed' : 'white' }}
        >
          {enabled && <span className="text-white text-xs font-bold">✓</span>}
        </button>
        <span className={`text-sm font-semibold flex-1 ${enabled ? 'text-slate-800' : 'text-slate-400'}`}>
          {row.title}
        </span>
      </div>

      {/* Permission checkboxes row */}
      <div className={`flex gap-3 flex-wrap ${!enabled ? 'opacity-40 pointer-events-none' : ''}`}>
        {([
          { key: 'can_add' as const,    label: 'Add',    color: '#16a34a' },
          { key: 'can_edit' as const,   label: 'Edit',   color: '#d97706' },
          { key: 'can_delete' as const, label: 'Delete', color: '#dc2626' },
          { key: 'can_view' as const,   label: 'View',   color: '#0891b2' },
        ]).map(({ key, label, color }) => (
          <label key={key} className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={Boolean(row[key])}
              onChange={() => onPerm(key)}
              disabled={!enabled}
              className="w-4 h-4 rounded cursor-pointer accent-violet-600"
            />
            <span className="text-xs font-semibold" style={{ color }}>{label}</span>
          </label>
        ))}
      </div>

      {/* Check All / Uncheck All button */}
      {enabled && (
        <button
          type="button"
          onClick={onCheckAll}
          className="mt-2.5 text-xs font-semibold text-violet-600 hover:text-violet-800 underline"
        >
          {allPerms ? 'Uncheck All' : 'Check All'}
        </button>
      )}
    </div>
  )
}

// ── Module card (matches Angular's collapsible module sections) ───────────
function ModuleGroup({ moduleName, rows, onChange }: {
  moduleName: string
  rows: PermRow[]
  onChange: (updated: PermRow[]) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const allChecked = rows.every(r => r.check_sub_menu)
  const anyChecked = rows.some(r => r.check_sub_menu)
  const enabledCount = rows.filter(r => r.check_sub_menu).length

  const toggleAll = () => {
    const next = allChecked ? 0 : 1
    onChange(rows.map(r => ({ ...r, check_sub_menu: next, can_view: next, can_add: next, can_edit: next, can_delete: next })))
  }

  const update = (idx: number, patch: Partial<PermRow>) =>
    onChange(rows.map((r, i) => i === idx ? { ...r, ...patch } : r))

  const toggleRow = (idx: number) => {
    const r = rows[idx]; const next = r.check_sub_menu ? 0 : 1
    update(idx, { check_sub_menu: next, can_view: next, can_add: next, can_edit: next, can_delete: next })
  }

  const togglePerm = (idx: number, key: 'can_add' | 'can_edit' | 'can_delete' | 'can_view') =>
    update(idx, { [key]: rows[idx][key] ? 0 : 1 })

  const checkAllPerms = (idx: number) => {
    const r = rows[idx]
    const all = r.can_add && r.can_edit && r.can_delete && r.can_view
    update(idx, { can_add: all ? 0 : 1, can_edit: all ? 0 : 1, can_delete: all ? 0 : 1, can_view: all ? 0 : 1 })
  }

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Module header */}
      <div
        className={`flex items-center gap-3 px-5 py-3.5 cursor-pointer select-none transition-colors ${anyChecked ? 'bg-violet-50' : 'bg-slate-50'}`}
        onClick={() => setExpanded(e => !e)}
      >
        <button type="button" onClick={e => { e.stopPropagation(); toggleAll() }}
          className="flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
          style={{
            borderColor: allChecked ? '#7c3aed' : anyChecked ? '#a78bfa' : '#cbd5e1',
            backgroundColor: allChecked ? '#7c3aed' : 'white',
          }}
        >
          {allChecked && <span className="text-white text-xs font-bold">✓</span>}
          {anyChecked && !allChecked && <span className="text-violet-500 text-xs font-bold">–</span>}
        </button>
        <span className={`font-bold flex-1 text-sm ${anyChecked ? 'text-violet-800' : 'text-slate-600'}`}>
          {moduleName}
        </span>
        <span className="text-xs text-slate-400 mr-2">{enabledCount}/{rows.length}</span>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </div>

      {/* Sub-modules — 2-column grid matching Angular */}
      {expanded && (
        <div className="p-4 bg-white grid grid-cols-1 md:grid-cols-2 gap-3">
          {rows.map((row, idx) => (
            <SubModuleCard
              key={row.id}
              row={row}
              onToggle={() => toggleRow(idx)}
              onPerm={(key) => togglePerm(idx, key)}
              onCheckAll={() => checkAllPerms(idx)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Permissions panel ──────────────────────────────────────────────────────
function PermissionsPanel({ user, onClose }: { user: any; onClose: () => void }) {
  const { user: authUser } = useAuthStore()
  const qc = useQueryClient()
  const [perms, setPerms] = useState<PermRow[]>([])
  const [loaded, setLoaded] = useState(false)

  const { isLoading, data: modulesData } = useQuery({
    queryKey: ['edit-user-modules', user.id],
    queryFn: () => usersService.getEditUserModules({
      user_id: user.id,
      role_type: authUser?.role_type ?? 1,
      entry_by: authUser?.id ?? 5,
    }),
  })

  // TanStack Query v5 removed onSuccess — use useEffect instead
  useEffect(() => {
    if (modulesData?.data) {
      setPerms(modulesData.data)
      setLoaded(true)
    }
  }, [modulesData])

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => {
      const enabled = perms.filter(p => p.check_sub_menu)
      if (enabled.length === 0) {
        toast.error('Select at least one permission')
        throw new Error('No permissions selected')
      }
      const payload = enabled.map(p => ({
        user_id: user.id,
        module_id: p.module_id,
        id: p.id,
        entry_by: String(authUser?.id ?? 5),
        can_add: p.can_add,
        can_edit: p.can_edit,
        can_view: p.can_view,
        can_delete: p.can_delete,
      }))
      return usersService.saveUserMenuList(payload)
    },
    onSuccess: (res: any) => {
      if (res.status === 200) {
        toast.success(`Permissions saved for ${user.name}`)
        qc.invalidateQueries({ queryKey: ['users'] })
        qc.invalidateQueries({ queryKey: ['edit-user-modules'] })
      } else toast.error('Failed to save')
    },
    onError: (e: any) => { if (e.message !== 'No permissions selected') toast.error('Server error') },
  })

  // Group by module
  const grouped: Record<string, PermRow[]> = {}
  perms.forEach(p => {
    if (!grouped[p.module_nm]) grouped[p.module_nm] = []
    grouped[p.module_nm].push(p)
  })

  const updateGroup = (moduleName: string, updated: PermRow[]) => {
    setPerms(prev => prev.map(p => {
      const u = updated.find(x => x.id === p.id)
      return u ?? p
    }))
  }

  const enabledCount = perms.filter(p => p.check_sub_menu).length
  const totalCount = perms.length

  const enableAll = () => setPerms(prev => prev.map(p => ({
    ...p, check_sub_menu: 1, can_view: 1, can_add: 1, can_edit: 1, can_delete: 1,
  })))
  const disableAll = () => setPerms(prev => prev.map(p => ({
    ...p, check_sub_menu: 0, can_view: 0, can_add: 0, can_edit: 0, can_delete: 0,
  })))

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
    >
      <GlassCard className="p-6" colorBar="bg-gradient-to-r from-violet-500 to-purple-600">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
              {user.name?.charAt(0)}
            </div>
            <div>
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Shield className="w-4 h-4 text-violet-500" /> Permissions — {user.name}
              </h3>
              <p className="text-xs text-slate-500">{enabledCount} / {totalCount} sub-modules enabled</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {loaded && (
              <>
                <button onClick={enableAll}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors">
                  Enable All
                </button>
                <button onClick={disableAll}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 transition-colors">
                  Disable All
                </button>
              </>
            )}
            <Button variant="primary" onClick={() => save()} disabled={isPending || !loaded}>
              <Save className="w-4 h-4" />
              {isPending ? 'Saving…' : 'Save Permissions'}
            </Button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-slate-100 transition-colors">
              ✕
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-12 rounded-xl bg-slate-100 animate-pulse" />)}
          </div>
        )}

        {!isLoading && loaded && (
          <div className="space-y-3">
            {Object.entries(grouped).map(([moduleName, rows]) => (
              <ModuleGroup
                key={moduleName}
                moduleName={moduleName}
                rows={rows}
                onChange={(updated) => updateGroup(moduleName, updated)}
              />
            ))}
          </div>
        )}
      </GlassCard>
    </motion.div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function UserManagementPage() {
  const { user: authUser } = useAuthStore()
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [editUser, setEditUser] = useState<any>(null)
  const [form, setForm] = useState(EMPTY)
  const [showPwd, setShowPwd] = useState(false)
  const [createPerms, setCreatePerms] = useState<PermRow[]>([])
  const [permsLoaded, setPermsLoaded] = useState(false)
  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: k === 'number' ? digitsOnly(e.target.value) : e.target.value })

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersService.getUsers(),
  })

  // Load all available modules (user_id=0 → no existing permissions → all unchecked)
  const { data: allModulesData, isLoading: modulesLoading } = useQuery({
    queryKey: ['create-user-modules'],
    queryFn: () => usersService.getEditUserModules({
      user_id: 0,
      role_type: authUser?.role_type ?? 1,
      entry_by: authUser?.id ?? 5,
    }),
    enabled: showCreate,
  })

  // Ref prevents the effect from firing on every render when allModulesData stays the same object
  const permsInitialized = useRef(false)

  useEffect(() => {
    if (!showCreate) {
      setCreatePerms([])
      setPermsLoaded(false)
      permsInitialized.current = false
    }
  }, [showCreate])

  useEffect(() => {
    if (showCreate && allModulesData?.data && !permsInitialized.current) {
      permsInitialized.current = true
      setCreatePerms(allModulesData.data.map((p: PermRow) => ({ ...p })))
      setPermsLoaded(true)
    }
  }, [showCreate, allModulesData])

  const createGrouped: Record<string, PermRow[]> = {}
  createPerms.forEach(p => {
    if (!createGrouped[p.module_nm]) createGrouped[p.module_nm] = []
    createGrouped[p.module_nm].push(p)
  })
  const updateCreateGroup = (moduleName: string, updated: PermRow[]) =>
    setCreatePerms(prev => prev.map(p => updated.find(x => x.id === p.id) ?? p))

  const enableCreateAll = () => setCreatePerms(prev => prev.map(p => ({ ...p, check_sub_menu: 1, can_view: 1, can_add: 1, can_edit: 1, can_delete: 1 })))
  const disableCreateAll = () => setCreatePerms(prev => prev.map(p => ({ ...p, check_sub_menu: 0, can_view: 0, can_add: 0, can_edit: 0, can_delete: 0 })))
  const enabledCreateCount = createPerms.filter(p => p.check_sub_menu).length

  const { mutate: createUser, isPending } = useMutation({
    mutationFn: () => {
      const selectedModules = createPerms
        .filter(p => p.check_sub_menu)
        .map(p => ({
          user_id: 0, // backend assigns the new user's id
          module_id: p.module_id,
          id: p.id,
          entry_by: String(authUser?.id ?? localStorage.getItem('user_id') ?? '1'),
          can_add: p.can_add ? 1 : 0,
          can_edit: p.can_edit ? 1 : 0,
          can_view: p.can_view ? 1 : 0,
          can_delete: p.can_delete ? 1 : 0,
        }))
      const payload = {
        userdetails: {
          name: form.name, number: form.number, email: form.email, mail: form.email,
          password: form.password, role_type: form.role_type, department_id: form.department_id,
          department_name: DEPT_MAP[form.department_id] ?? 'Administration',
          designation_name: DEPT_MAP[form.department_id] ?? 'Administration',
          entry_by: localStorage.getItem('user_id') ?? '1',
          section_id: 0, section_name: '', d_in: 0,
        },
        permissionmodules: selectedModules,
        uploadind: 0,
        document: null,
      }
      return usersService.createUser(payload)
    },
    onSuccess: (res) => {
      if (res.status === 200) {
        toast.success('User created!')
        qc.invalidateQueries({ queryKey: ['users'] })
        setForm(EMPTY); setShowCreate(false)
      } else if (res.status === 300) {
        toast.error('Mobile number already exists')
      } else toast.error(res.message ?? 'Failed')
    },
    onError: () => toast.error('Server error'),
  })

  const { mutate: deleteUser } = useMutation({
    mutationFn: (id: number) => usersService.deleteUser(id),
    onSuccess: (res: any) => {
      if (res.status === 200) {
        toast.success('User deactivated')
        qc.invalidateQueries({ queryKey: ['users'] })
      } else toast.error('Failed to deactivate user')
    },
    onError: () => toast.error('Server error'),
  })

  const handleAction = (action: string, row: any) => {
    if (action === 'edit') {
      setShowCreate(false); setSelectedUser(null); setEditUser(row)
    } else if (action === 'delete') {
      if (String(authUser?.id) === String(row.id)) { toast.error('You cannot deactivate your own account'); return }
      if (editUser?.id === row.id) setEditUser(null)
      if (selectedUser?.id === row.id) setSelectedUser(null)
      deleteUser(row.id)
    }
  }

  const userList: any[] = users?.data ?? []
  const canSubmit = Boolean(form.name.trim() && isValidMobile(form.number) && form.password.trim() && enabledCreateCount > 0)

  const userColumns: Column[] = [
    { label: 'Sl No', key: '_idx', align: 'center', render: (_v, _row, i) => <span className="text-sm text-slate-500">{i + 1}</span> },
    {
      label: 'User', key: 'name',
      render: (v, r: any) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-violet-400 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
            {String(v ?? '?').charAt(0)}
          </div>
          <div>
            <div className="font-bold text-sm">{String(v ?? '—')}</div>
            <div className="text-xs text-slate-500">{r.number}</div>
          </div>
        </div>
      ),
    },
    { label: 'Department', key: 'department_name' },
    {
      label: 'Role', key: 'role_type',
      render: (v) => {
        const labels: Record<number, string> = { 0: 'Super Admin', 1: 'Admin', 2: 'Officer', 3: 'Staff' }
        const variants: Record<number, string> = { 0: 'teal', 1: 'purple', 2: 'info', 3: 'warning' }
        return <Badge variant={variants[v as number] as any}>{labels[v as number] ?? 'Staff'}</Badge>
      },
    },
    {
      label: 'Status', key: 'd_in',
      render: (v) => <Badge variant={v == 0 ? 'success' : 'danger'}>{v == 0 ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      label: 'Permissions', key: 'id',
      render: (_, row: any) => (
        <button
          onClick={(e) => { e.stopPropagation(); setEditUser(null); setSelectedUser((u: any) => u?.id === row.id ? null : row) }}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            selectedUser?.id === row.id
              ? 'bg-violet-500 text-white'
              : 'bg-violet-50 text-violet-600 hover:bg-violet-100 border border-violet-100'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          {selectedUser?.id === row.id ? 'Close' : 'Manage'}
        </button>
      ),
    },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="flex justify-between items-end">
        <PageHeader title="User Management" subtitle="Manage users and their module permissions" />
        <Button onClick={() => { setShowCreate(s => !s); setSelectedUser(null); setEditUser(null) }}>
          <UserCircle className="w-4 h-4" />
          {showCreate ? 'Cancel' : 'Create User'}
        </Button>
      </div>

      {/* Create user form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <GlassCard className="p-6" colorBar="bg-gradient-to-r from-blue-500 to-teal-400">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <UserCircle className="w-5 h-5 text-blue-500" /> Create New User
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div><Label>Full Name *</Label><Input placeholder="e.g. Prakash" value={form.name} onChange={f('name')} /></div>
                <div><Label>Mobile Number * (10 digits)</Label>
                  <Input placeholder="9876543210" inputMode="numeric" maxLength={10} value={form.number} onChange={f('number')} /></div>
                <div><Label>Email</Label>
                  <Input type="email" placeholder="user@samanvitravels.in" value={form.email} onChange={f('email')} /></div>
                <div><Label>Password *</Label>
                  <div className="relative">
                    <Input type={showPwd ? 'text' : 'password'} placeholder="Set login password" value={form.password} onChange={f('password')} />
                    <button type="button" onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div><Label>Role Type *</Label>
                  <Select value={form.role_type} onChange={f('role_type')}>
                    {ROLE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </Select></div>
                <div><Label>Department *</Label>
                  <Select value={form.department_id} onChange={f('department_id')}>
                    {Object.entries(DEPT_MAP).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </Select></div>
              </div>
              {!canSubmit && (form.name || form.number || form.password) && (
                <p className="text-xs text-amber-600 font-medium mt-4">
                  {!form.name.trim() && '• Name required. '}
                  {form.number.trim() !== '' && !isValidMobile(form.number) && '• Enter a valid 10-digit mobile number. '}
                  {!form.password.trim() && '• Password required. '}
                  {permsLoaded && enabledCreateCount === 0 && '• Enable at least one module. '}
                </p>
              )}

              {/* ── Module permissions ── */}
              <div className="mt-6 pt-6 border-t border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-violet-500" /> Assign Modules & Permissions
                    {permsLoaded && (
                      <span className="text-xs font-normal text-slate-400 ml-1">
                        ({enabledCreateCount}/{createPerms.length} enabled)
                      </span>
                    )}
                  </h3>
                  {permsLoaded && (
                    <div className="flex gap-2">
                      <button onClick={enableCreateAll}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors">
                        Enable All
                      </button>
                      <button onClick={disableCreateAll}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 transition-colors">
                        Disable All
                      </button>
                    </div>
                  )}
                </div>

                {modulesLoading && (
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-12 rounded-xl bg-slate-100 animate-pulse" />
                    ))}
                  </div>
                )}

                {permsLoaded && (
                  <div className="space-y-3">
                    {Object.entries(createGrouped).map(([moduleName, rows]) => (
                      <ModuleGroup
                        key={moduleName}
                        moduleName={moduleName}
                        rows={rows}
                        onChange={(updated) => updateCreateGroup(moduleName, updated)}
                      />
                    ))}
                  </div>
                )}
              </div>
              {/* Submit sits under the fields, as on every other form. */}
              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
                <Button onClick={() => createUser()} disabled={isPending || !canSubmit}>
                <Save className="w-4 h-4" />{isPending ? 'Saving…' : 'Save User'}
                </Button>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editUser && <EditUserPanel key={editUser.id} user={editUser} onClose={() => setEditUser(null)} />}
      </AnimatePresence>

      {/* Users table */}
      <DataTable
        title={`System Users (${userList.length})`}
        columns={userColumns}
        data={userList}
        loading={isLoading}
        onAction={handleAction}
        actions={['edit', 'delete']}
        icon={<Users className="w-5 h-5 text-blue-500" />}
      />

      {/* Permissions panel — shown below table when a user is selected */}
      <AnimatePresence>
        {selectedUser && (
          <PermissionsPanel
            key={selectedUser.id}
            user={selectedUser}
            onClose={() => setSelectedUser(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
