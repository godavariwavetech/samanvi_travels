import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router'
import { ChevronRight, ArrowLeft, Loader2, FolderOpen } from 'lucide-react'
import { useState } from 'react'
import { accountingService } from '@/services/accounting.service'
import { cn } from '@/lib/utils'

const qParams = () => ({
  role_type: localStorage.getItem('role_type') ?? '1',
  district_id: localStorage.getItem('district_id') ?? '1',
})

interface DrillItem { id: number; name: string }

export function SidebarAccountingTree({ onClose }: { onClose: () => void }) {
  const { data: groupsRes,    isLoading: l1 } = useQuery({ queryKey: ['gm-groups'],    queryFn: () => accountingService.getMastersGroup(qParams()),         staleTime: 5 * 60 * 1000 })
  const { data: subgroupsRes, isLoading: l2 } = useQuery({ queryKey: ['gm-subgroups'], queryFn: () => accountingService.getMainMastersSubgroup(),              staleTime: 5 * 60 * 1000 })
  const { data: childrenRes,  isLoading: l3 } = useQuery({ queryKey: ['gm-children'],  queryFn: () => accountingService.getMainMastersSubchild(),              staleTime: 5 * 60 * 1000 })

  // Drill-down stack — each frame is the item the user clicked into
  const [stack, setStack] = useState<DrillItem[]>([])

  const [searchParams] = useSearchParams()
  const activeNodeId = searchParams.get('nodeId')

  if (l1 || l2 || l3) {
    return (
      <div className="flex items-center gap-2 px-2 py-2 text-[10px] text-slate-500">
        <Loader2 className="w-3 h-3 animate-spin" /> Loading…
      </div>
    )
  }

  const allGroups:   { id: number; name: string }[] =
    (groupsRes?.data ?? []).map((g: any) => ({ id: g.id, name: g.mandal_name }))

  const allSubs: { id: number; name: string; groupId: number }[] =
    (subgroupsRes?.data ?? []).map((sg: any) => ({ id: sg.id, name: sg.village_name, groupId: Number(sg.mandal_id) }))

  const allChildren: { id: number; name: string; subGroupId: number }[] =
    (childrenRes?.data ?? [])
      .filter((c: any) => !c.self_parent_id && Number(c.level_depth) === 4)
      .map((c: any) => ({ id: c.id, name: c.temple_name, subGroupId: Number(c.parent_subgroup_id) }))

  const depth = stack.length          // 0 = main groups, 1 = sub groups, 2 = child groups
  const currentParent = stack[depth - 1] ?? null

  // Items visible at current depth
  const items: DrillItem[] = depth === 0
    ? allGroups
    : depth === 1
    ? allSubs.filter(sg => sg.groupId === currentParent.id)
    : allChildren.filter(c => c.subGroupId === currentParent.id)

  // Does this item have children one level deeper?
  const hasChildren = (id: number): boolean => {
    if (depth === 0) return allSubs.some(sg => sg.groupId === id)
    if (depth === 1) return allChildren.some(c => c.subGroupId === id)
    return false
  }

  const drillIn  = (item: DrillItem) => setStack(s => [...s, item])
  const drillBack = () => setStack(s => s.slice(0, -1))

  const nodeLevel = depth + 2   // sidebar depth 0 = tree level 2, etc.

  return (
    <div className="mt-1">
      {/* Breadcrumb / back row */}
      {depth > 0 && (
        <div className="flex items-center gap-1 mb-1">
          <button
            type="button"
            onClick={drillBack}
            className="flex items-center gap-1 px-1.5 py-1 rounded-lg text-[10px] font-bold text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Back
          </button>
          {/* Breadcrumb path */}
          <span className="text-[10px] text-slate-600 truncate">
            {stack.map(f => f.name).join(' › ')}
          </span>
        </div>
      )}

      {/* Current level label */}
      <p className="px-1 pb-1 text-[9px] font-extrabold uppercase tracking-widest text-slate-600">
        {depth === 0 ? 'Main Groups' : depth === 1 ? 'Sub Groups' : 'Child Groups'}
      </p>

      {/* Item list */}
      {items.length === 0 ? (
        <p className="px-2 py-1 text-[10px] text-slate-600 italic">None</p>
      ) : (
        <div className="space-y-0.5">
          {items.map(item => {
            const childable = hasChildren(item.id)
            const isActive  = activeNodeId === String(item.id)

            return (
              <div key={item.id} className="flex items-center gap-0.5 group/si">
                {/* Name → navigates to GroupPage with this node highlighted */}
                <Link
                  to={`/mainmasters/groups?nodeId=${item.id}&nodeLevel=${nodeLevel}`}
                  onClick={onClose}
                  className={cn(
                    'flex-1 min-w-0 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all truncate',
                    isActive
                      ? 'text-[#14B8A6] bg-white/5'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40',
                  )}
                >
                  {item.name}
                </Link>

                {/* Drill-in arrow — only when children exist */}
                {childable && (
                  <button
                    type="button"
                    title={`Open ${item.name}`}
                    onClick={() => drillIn(item)}
                    className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-200 hover:bg-slate-700/50 transition-colors flex-shrink-0 opacity-0 group-hover/si:opacity-100"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Leaf indicator */}
                {!childable && (
                  <FolderOpen className="w-3 h-3 text-slate-700 flex-shrink-0 opacity-0 group-hover/si:opacity-100 mr-1 transition-opacity" />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
