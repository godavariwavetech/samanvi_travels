import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { ChevronDown, ChevronRight, Save, Shield, Square, CheckSquare } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Badge, Button, GlassCard, Label, PageHeader, Select } from '@/components/shared'
import { usersService } from '@/services/users.service'

type Role = { id: number; name: string }
type ModulePermission = {
  id: number; module_id: number; module_nm: string; title: string; check_sub_menu: number
  can_view: number; can_add: number; can_edit: number; can_delete: number; can_approve: number; can_authorize: number
}
const RIGHTS: Array<[keyof ModulePermission, string]> = [
  ['can_view', 'View'], ['can_add', 'Add'], ['can_edit', 'Edit'], ['can_delete', 'Delete'],
  ['can_approve', 'Approve'], ['can_authorize', 'Authorize'],
]

export default function RolesPage() {
  const qc = useQueryClient()
  const [roleId, setRoleId] = useState('')
  const [rows, setRows] = useState<ModulePermission[]>([])
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const isDataEntryRole = roleId === '1' || roleId === '2'
  const rolesQuery = useQuery({ queryKey: ['roles'], queryFn: usersService.getRoles })
  const modulesQuery = useQuery({
    queryKey: ['role-modules', roleId],
    queryFn: () => usersService.getRoleModules({ role_id: Number(roleId) }),
    enabled: !!roleId,
  })
  useEffect(() => {
    const data: ModulePermission[] = modulesQuery.data?.data ?? []
    setRows(data.map((row) => ({ ...row })))
    setExpanded(Object.fromEntries(data.map((row) => [row.module_nm, true])))
  }, [modulesQuery.data])

  const saveMutation = useMutation({
    mutationFn: () => usersService.saveRoleModules({ role_id: Number(roleId), modules: rows }),
    onSuccess: (res) => {
      if (res?.status !== 200) return toast.error(res?.message ?? 'Could not save role permissions')
      toast.success('Role permissions saved. Changes apply to every assigned user.')
      qc.invalidateQueries({ queryKey: ['role-modules', roleId] })
      qc.invalidateQueries({ queryKey: ['my-menu'] })
      qc.invalidateQueries({ queryKey: ['users'] })
    },
    onError: () => toast.error('Could not save role permissions'),
  })
  const groups = Object.entries(rows.reduce<Record<string, ModulePermission[]>>((acc, row) => {
    (acc[row.module_nm] ??= []).push(row)
    return acc
  }, {}))
  const updateRow = (id: number, key: keyof ModulePermission, enabled: boolean) => {
    if (isDataEntryRole && key === 'can_authorize') return
    setRows((prev) => prev.map((row) => {
    if (row.id !== id) return row
    if (key === 'check_sub_menu') {
      return { ...row, check_sub_menu: enabled ? 1 : 0, can_view: enabled ? 1 : 0,
        ...(enabled ? {} : { can_add: 0, can_edit: 0, can_delete: 0, can_approve: 0, can_authorize: 0 }) }
    }
    return { ...row, [key]: enabled ? 1 : 0,
      ...(key === 'can_view' ? { check_sub_menu: enabled ? 1 : 0 } : {}) }
    }))
  }
  const toggleGroup = (groupRows: ModulePermission[], enabled: boolean) => setRows((prev) => prev.map((row) =>
    groupRows.some((item) => item.id === row.id)
      ? { ...row, check_sub_menu: enabled ? 1 : 0, can_view: enabled ? 1 : 0, can_add: enabled ? 1 : 0,
          can_edit: enabled ? 1 : 0, can_delete: enabled ? 1 : 0, can_approve: enabled ? 1 : 0, can_authorize: 0 }
      : row))

  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
    <PageHeader title="Roles & Permissions" subtitle="Set shared module access for each role" />
    <GlassCard className="p-5" colorBar="bg-gradient-to-r from-purple-500 to-violet-600">
      <div className="flex items-end gap-4 flex-wrap">
        <div className="min-w-[260px]"><Label>Select Role</Label>
          <Select value={roleId} onChange={(e) => setRoleId(e.target.value)}>
            <option value="">Choose a role</option>
            {(rolesQuery.data?.data ?? []).map((role: Role) => <option key={role.id} value={role.id}>{role.name}</option>)}
          </Select>
        </div>
        {roleId && <Button permission="edit" variant="purple" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || modulesQuery.isLoading}>
          <Save className="w-4 h-4" />{saveMutation.isPending ? 'Saving…' : 'Save Role Permissions'}
        </Button>}
      </div>
    </GlassCard>
    {!roleId && <GlassCard className="p-10 text-center"><Shield className="w-10 h-10 text-slate-200 mx-auto mb-3" /><p className="text-slate-500">Choose a role to edit its shared permissions.</p></GlassCard>}
    {modulesQuery.isLoading && <GlassCard className="p-8 text-center text-slate-400">Loading modules…</GlassCard>}
    {roleId && !modulesQuery.isLoading && groups.map(([name, groupRows]) => {
      const enabled = groupRows.filter((row) => row.check_sub_menu).length
      return <GlassCard key={name} className="overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b cursor-pointer" onClick={() => setExpanded((v) => ({ ...v, [name]: !v[name] }))}>
          <div className="flex items-center gap-2">{expanded[name] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}<b>{name}</b><Badge variant={enabled ? 'success' : 'default'}>{enabled}/{groupRows.length} enabled</Badge></div>
          <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
            <button className="text-xs text-emerald-700" onClick={() => toggleGroup(groupRows, true)}>Enable All</button>
            <button className="text-xs text-red-600" onClick={() => toggleGroup(groupRows, false)}>Disable All</button>
          </div>
        </div>
        {expanded[name] && <div className="divide-y">
          <div className="grid grid-cols-[minmax(180px,1fr)_80px_repeat(6,80px)] px-5 py-2 text-xs font-bold text-slate-400 uppercase"><span>Sub-module</span><span className="text-center">Access</span>{RIGHTS.map(([, label]) => <span key={label} className="text-center">{label}</span>)}</div>
          {groupRows.map((row) => <div key={row.id} className="grid grid-cols-[minmax(180px,1fr)_80px_repeat(6,80px)] items-center px-5 py-3">
            <span className="text-sm font-medium">{row.title}</span>
            <button className="flex justify-center" onClick={() => updateRow(row.id, 'check_sub_menu', !row.check_sub_menu)}>{row.check_sub_menu ? <CheckSquare className="w-5 h-5 text-emerald-500" /> : <Square className="w-5 h-5 text-slate-300" />}</button>
            {RIGHTS.map(([key, label]) => <div key={key} className="flex justify-center"><input type="checkbox" aria-label={`${label} ${row.title}`} checked={Boolean(row[key])} disabled={!row.check_sub_menu || (isDataEntryRole && key === 'can_authorize')} onChange={(e) => updateRow(row.id, key, e.target.checked)} className="w-4 h-4 accent-purple-600 disabled:opacity-30" /></div>)}
          </div>)}
        </div>}
      </GlassCard>
    })}
  </motion.div>
}
