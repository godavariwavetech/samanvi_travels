import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { Shield, Save, ChevronDown, ChevronRight, CheckSquare, Square } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Select, Label, Badge, PageHeader } from '@/components/shared'
import { usersService } from '@/services/users.service'

interface SubModule {
  id: number
  module_id: number
  module_nm: string
  title: string
  check_sub_menu: number
  can_add: number
  can_edit: number
  can_view: number
  can_delete: number
}

interface PermState {
  enabled: boolean
  can_view: boolean
  can_add: boolean
  can_edit: boolean
  can_delete: boolean
}

const PERMS: Array<keyof Omit<PermState, 'enabled'>> = ['can_view', 'can_add', 'can_edit', 'can_delete']
const PERM_LABEL: Record<string, string> = {
  can_view: 'View', can_add: 'Add', can_edit: 'Edit', can_delete: 'Delete',
}

export default function RolesPage() {
  const qc = useQueryClient()
  const [selectedUserId, setSelectedUserId] = useState('')
  const [perms, setPerms] = useState<Record<number, PermState>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const currentUserId = localStorage.getItem('user_id') ?? '1'

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersService.getUsers(),
  })

  // Load all sub-modules + current permissions for the selected user
  const { data: moduleData, isLoading: loadingModules } = useQuery({
    queryKey: ['edit-user-modules', selectedUserId],
    queryFn: () => usersService.getEditUserModules({
      user_id: selectedUserId,
      role_type: 0,         // role_type 0 → backend returns ALL sub-modules
      entry_by: currentUserId,
    }),
    enabled: !!selectedUserId,
  })

  // When module data loads, initialise perm state from the returned data
  useEffect(() => {
    const modules: SubModule[] = moduleData?.data ?? []
    if (!modules.length) return
    const initial: Record<number, PermState> = {}
    modules.forEach((sm) => {
      initial[sm.id] = {
        enabled: sm.check_sub_menu === 1,
        can_view: sm.can_view === 1,
        can_add: sm.can_add === 1,
        can_edit: sm.can_edit === 1,
        can_delete: sm.can_delete === 1,
      }
    })
    setPerms(initial)
    // Auto-expand all module groups
    const groups: Record<string, boolean> = {}
    modules.forEach((sm) => { groups[sm.module_nm] = true })
    setExpanded(groups)
  }, [moduleData])

  // Group sub-modules by main module name
  const moduleList: SubModule[] = (moduleData?.data as SubModule[] | undefined) ?? []
  const grouped: [string, SubModule[]][] = Object.entries(
    moduleList.reduce<Record<string, SubModule[]>>((acc, sm) => {
      if (!acc[sm.module_nm]) acc[sm.module_nm] = []
      acc[sm.module_nm].push(sm)
      return acc
    }, {})
  )

  const toggleModule = (moduleNm: string) =>
    setExpanded((e) => ({ ...e, [moduleNm]: !e[moduleNm] }))

  const setSmPerm = (smId: number, key: keyof PermState, val: boolean) =>
    setPerms((p) => ({
      ...p,
      [smId]: {
        ...p[smId],
        [key]: val,
        // If enabling access, auto-enable view
        ...(key === 'enabled' && val ? { can_view: true } : {}),
        // If disabling access, clear all
        ...(key === 'enabled' && !val ? { can_view: false, can_add: false, can_edit: false, can_delete: false } : {}),
      },
    }))

  const toggleModuleAll = (sms: SubModule[], enable: boolean) => {
    const update: Record<number, PermState> = {}
    sms.forEach((sm) => {
      update[sm.id] = {
        enabled: enable,
        can_view: enable,
        can_add: enable,
        can_edit: enable,
        can_delete: enable,
      }
    })
    setPerms((p) => ({ ...p, ...update }))
  }

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => {
      const allSubs: SubModule[] = moduleData?.data ?? []
      const enabled = allSubs.filter((sm) => perms[sm.id]?.enabled)

      if (!enabled.length) {
        throw new Error('no_modules')
      }

      const payload = enabled.map((sm) => ({
        user_id: Number(selectedUserId),
        module_id: sm.module_id,
        id: sm.id,              // sub_module_id — controller reads obj.id
        entry_by: Number(currentUserId),
        can_add: perms[sm.id]?.can_add ? 1 : 0,
        can_edit: perms[sm.id]?.can_edit ? 1 : 0,
        can_view: perms[sm.id]?.can_view ? 1 : 0,
        can_delete: perms[sm.id]?.can_delete ? 1 : 0,
      }))

      return usersService.saveUserMenuList(payload)
    },
    onSuccess: (res) => {
      if (res?.status === 200) {
        toast.success('Permissions saved!')
        qc.invalidateQueries({ queryKey: ['edit-user-modules', selectedUserId] })
      } else {
        toast.error('Failed to save permissions')
      }
    },
    onError: (e: any) => {
      if (e?.message === 'no_modules') {
        toast.error('Enable at least one module before saving')
      } else {
        toast.error('Server error — check backend logs')
      }
    },
  })

  const userList: any[] = usersData?.data ?? []
  const selectedUser = userList.find((u) => String(u.id) === selectedUserId)
  const enabledCount = Object.values(perms).filter((p) => p.enabled).length

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Roles & Permissions" subtitle="Assign per-module access rights for each user" />

      {/* User selector */}
      <GlassCard className="p-5" colorBar="bg-gradient-to-r from-purple-500 to-violet-600">
        <div className="flex items-end gap-4 flex-wrap">
          <div className="flex-1 min-w-[220px] max-w-sm">
            <Label>Select User *</Label>
            <Select
              value={selectedUserId}
              onChange={(e) => { setSelectedUserId(e.target.value); setPerms({}) }}
            >
              <option value="">— Choose a user —</option>
              {userList.map((u) => (
                <option key={u.id} value={u.id}>{u.name} · {u.number} · {u.department_name}</option>
              ))}
            </Select>
          </div>

          {selectedUserId && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-700">
                {enabledCount} module{enabledCount !== 1 ? 's' : ''} enabled
              </span>
              <Button
                onClick={() => save()}
                disabled={isPending || !enabledCount}
                variant="purple"
              >
                <Save className="w-4 h-4" />
                {isPending ? 'Saving…' : 'Save Permissions'}
              </Button>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Permission matrix */}
      {!selectedUserId && (
        <GlassCard className="p-12 text-center">
          <Shield className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">Select a user above to manage their module permissions.</p>
        </GlassCard>
      )}

      {selectedUserId && loadingModules && (
        <GlassCard className="p-8 text-center text-slate-400">Loading modules…</GlassCard>
      )}

      {selectedUserId && !loadingModules && grouped.length === 0 && (
        <GlassCard className="p-8 text-center text-slate-400">No modules found.</GlassCard>
      )}

      {selectedUserId && !loadingModules && grouped.map(([moduleName, subs]) => {
        const isOpen = expanded[moduleName] ?? true
        const allEnabled = subs.every((sm) => perms[sm.id]?.enabled)
        const someEnabled = subs.some((sm) => perms[sm.id]?.enabled)

        return (
          <GlassCard key={moduleName} className="overflow-hidden">
            {/* Module group header */}
            <div
              className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors"
              onClick={() => toggleModule(moduleName)}
            >
              <div className="flex items-center gap-3">
                {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                <span className="font-bold text-slate-800">{moduleName}</span>
                <Badge variant={allEnabled ? 'success' : someEnabled ? 'warning' : 'default'}>
                  {subs.filter((sm) => perms[sm.id]?.enabled).length}/{subs.length} enabled
                </Badge>
              </div>
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => toggleModuleAll(subs, true)}
                  className="text-xs text-emerald-600 hover:underline font-semibold px-2 py-1"
                >
                  Enable All
                </button>
                <button
                  onClick={() => toggleModuleAll(subs, false)}
                  className="text-xs text-red-500 hover:underline font-semibold px-2 py-1"
                >
                  Disable All
                </button>
              </div>
            </div>

            {isOpen && (
              <div className="divide-y divide-slate-100">
                {/* Column headers */}
                <div className="grid grid-cols-[1fr_80px_80px_80px_80px_80px] px-5 py-2 bg-slate-50/50 text-xs font-bold text-slate-400 uppercase">
                  <span>Sub-Module</span>
                  <span className="text-center">Access</span>
                  {PERMS.map((p) => <span key={p} className="text-center">{PERM_LABEL[p]}</span>)}
                </div>

                {subs.map((sm) => {
                  const p = perms[sm.id] ?? { enabled: false, can_view: false, can_add: false, can_edit: false, can_delete: false }
                  return (
                    <div
                      key={sm.id}
                      className={`grid grid-cols-[1fr_80px_80px_80px_80px_80px] items-center px-5 py-3 transition-colors ${p.enabled ? 'bg-white' : 'bg-slate-50/40'}`}
                    >
                      <span className={`text-sm font-medium ${p.enabled ? 'text-slate-800' : 'text-slate-400'}`}>
                        {sm.title}
                      </span>

                      {/* Access toggle */}
                      <div className="flex justify-center">
                        <button onClick={() => setSmPerm(sm.id, 'enabled', !p.enabled)}>
                          {p.enabled
                            ? <CheckSquare className="w-5 h-5 text-emerald-500" />
                            : <Square className="w-5 h-5 text-slate-300" />
                          }
                        </button>
                      </div>

                      {/* Permission checkboxes — only active when module is enabled */}
                      {PERMS.map((key) => (
                        <div key={key} className="flex justify-center">
                          <input
                            type="checkbox"
                            checked={!!(p as any)[key]}
                            disabled={!p.enabled}
                            onChange={(e) => setSmPerm(sm.id, key, e.target.checked)}
                            className="w-4 h-4 accent-purple-600 rounded disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                          />
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}
          </GlassCard>
        )
      })}
    </motion.div>
  )
}
