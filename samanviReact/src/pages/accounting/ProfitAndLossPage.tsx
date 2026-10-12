import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronRight, ChevronDown, ChevronsDownUp, ChevronsUpDown, Plus, Pencil, Trash2, Check, X, FolderPlus, FileText, Info, ExternalLink, Search, Layers, BookOpen, RefreshCw } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useNavigate } from 'react-router'
import { GlassCard, Button, Input, Label, PageHeader, FYSelector, ExportMenu } from '@/components/shared'
import { exportRows, type ExportCell, type ExportFormat } from '@/lib/tableExport'
import { formatDate, todayISO } from '@/lib/utils'
import { accountingService } from '@/services/accounting.service'
import { getCurrentFY } from '@/lib/fy'
import { useFYStore } from '@/store/fy.store'

const hasGroupChildren = (n: HierarchyNode) => n.children?.some(c => c.nodeType === 'group') ?? false
const hasLedgerChildren = (n: HierarchyNode) => n.children?.some(c => c.nodeType === 'ledger') ?? false
const canAddGroup  = (n: HierarchyNode) => n.nodeType === 'group' && !hasLedgerChildren(n)
const canAddLedger = (n: HierarchyNode) => n.nodeType === 'group' && n.level > 1 && !hasGroupChildren(n)

// ── Types ─────────────────────────────────────────────────────────────────
interface HierarchyNode {
  id: number
  name: string
  level: number
  parentId: number | null
  amount: number
  totalAmount: number
  children: HierarchyNode[]
  nodeType: 'group' | 'ledger'
  expanded: boolean
  district_id?: string
  mandal_id?: string
  village_id?: number
  staticname?: string
  mandal_name?: string
  child?: string
  subchildtwo?: string
  parent_subgroup_id?: number | null
  parent_subchild_id?: number | null
  parent_grp_level?: number
  has_ledgers?: number
  can_add_subgroups?: number
}

// ── Helpers ────────────────────────────────────────────────────────────────
function calcTotals(node: HierarchyNode): number {
  if (node.nodeType === 'ledger') { node.totalAmount = node.amount; return node.totalAmount }
  node.totalAmount = (node.children ?? []).reduce((s, c) => s + calcTotals(c), 0)
  return node.totalAmount
}

function setExpanded(node: HierarchyNode, val: boolean): void {
  node.expanded = val
  node.children?.forEach(c => setExpanded(c, val))
}

// ── Export ─────────────────────────────────────────────────────────────────
// The statement as it stands on screen: a heading row per section with its
// total, then every visible group / ledger indented by depth - a collapsed
// branch stays out, so Expand All first for the full detail. Excel gets real
// numbers; the PDF gets them formatted.
function exportAmount(v: number, format: ExportFormat): ExportCell {
  const r = Math.round(v * 100) / 100
  return format === 'excel' ? r : `${r < 0 ? '-' : ''}${Math.abs(r).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function statementRows(sections: { title: string; nodes: HierarchyNode[] }[], format: ExportFormat): ExportCell[][] {
  const amt = (v: number) => exportAmount(v, format)
  const rows: ExportCell[][] = []
  let sl = 0
  const walk = (n: HierarchyNode, depth: number) => {
    const blank = n.nodeType === 'ledger' && n.totalAmount === 0
    rows.push([++sl, `${'    '.repeat(depth)}${n.name}`, n.nodeType === 'ledger' ? 'Ledger' : 'Group', blank ? '' : amt(n.totalAmount)])
    if (n.expanded) n.children?.forEach(c => walk(c, depth + 1))
  }
  sections.forEach(s => {
    rows.push(['', s.title.toUpperCase(), '', amt(Math.abs(s.nodes.reduce((t, n) => t + n.totalAmount, 0)))])
    s.nodes.forEach(n => walk(n, 0))
  })
  return rows
}

function buildPath(node: HierarchyNode, type: 'group' | 'ledger'): string {
  const newLevel = node.level + 1
  const badge = type === 'ledger' ? 'New Ledger' : `New L${newLevel}`
  const parts: string[] = []
  if (node.staticname) parts.push(`L1 • ${node.staticname}`)
  if (node.level >= 2 && node.mandal_name) parts.push(`L2 • ${node.mandal_name}`)
  if (node.level >= 3 && node.child) parts.push(`L3 • ${node.child}`)
  if (node.level >= 4 && node.subchildtwo) parts.push(`L4 • ${node.subchildtwo}`)
  return [...parts, badge].join(' → ')
}

const MODAL_HEADER_COLORS: Record<string, string> = {
  ledger:  'from-emerald-500 to-teal-600',
  '2':     'from-violet-500 to-purple-600',
  '3':     'from-emerald-500 to-green-600',
  '4':     'from-blue-500 to-indigo-600',
  default: 'from-cyan-500 to-sky-600',
}

// ── Tree row ───────────────────────────────────────────────────────────────
const LEVEL_COLORS = ['', 'bg-blue-600', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-400', 'bg-pink-400']

function NodeRow({ node, depth, onToggle, onAdd, onEdit, onDelete, onLedgerClick, highlightKey }: {
  node: HierarchyNode; depth: number
  onToggle: (node: HierarchyNode) => void
  onAdd?: (parent: HierarchyNode, type: 'group' | 'ledger') => void
  onEdit?: (node: HierarchyNode, newName: string) => void
  onDelete?: (node: HierarchyNode) => void
  onLedgerClick?: (node: HierarchyNode) => void
  highlightKey?: string | null
}) {
  const [editing, setEditing] = useState(false)
  const [editVal, setEditVal] = useState(node.name)
  const hasChildren = (node.children?.length ?? 0) > 0
  const levelColor = LEVEL_COLORS[node.level] ?? 'bg-slate-400'
  const INDENT = 16 + depth * 22
  const subGroupLabel = node.level === 1 ? 'Group' : node.level === 2 ? 'Sub Group' : node.level === 3 ? 'Child' : 'Sub Child'
  const nodeKey = `${node.nodeType}-${node.id}`
  const isHighlighted = highlightKey === nodeKey

  const levelStyle = node.nodeType === 'ledger'
    ? { bg: 'bg-green-50', leftBorder: '', textColor: 'text-slate-800 font-semibold', iconColor: 'text-green-500', badgeBg: 'bg-green-100 text-green-700', addGroupBtn: '' }
    : node.level === 1
    ? { bg: 'bg-white', leftBorder: 'border-l-4 border-l-blue-500', textColor: 'text-blue-700 font-extrabold', iconColor: 'text-blue-500', badgeBg: 'bg-blue-100 text-blue-700', addGroupBtn: 'bg-blue-500 text-white hover:bg-blue-600' }
    : node.level === 2
    ? { bg: 'bg-white', leftBorder: 'border-l-4 border-l-orange-400', textColor: 'text-orange-600 font-bold', iconColor: 'text-orange-400', badgeBg: 'bg-orange-100 text-orange-700', addGroupBtn: 'bg-orange-500 text-white hover:bg-orange-600' }
    : node.level === 3
    ? { bg: 'bg-white', leftBorder: 'border-l-4 border-l-violet-500', textColor: 'text-violet-700 font-semibold', iconColor: 'text-violet-500', badgeBg: 'bg-violet-100 text-violet-700', addGroupBtn: 'bg-violet-500 text-white hover:bg-violet-600' }
    : { bg: 'bg-white', leftBorder: 'border-l-4 border-l-purple-400', textColor: 'text-purple-700 font-medium', iconColor: 'text-purple-400', badgeBg: 'bg-purple-100 text-purple-700', addGroupBtn: 'bg-purple-400 text-white hover:bg-purple-500' }

  const fmtAmt = (v: number) =>
    `${v < 0 ? '-' : ''}₹${Math.abs(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

  return (
    <>
      <div
        id={`pl-node-${nodeKey}`}
        className={`flex items-center gap-2 pr-3 py-3 mx-2 mb-1 border shadow-sm hover:shadow-md transition-all group ${levelStyle.leftBorder} ${levelStyle.bg} ${
          isHighlighted ? 'border-amber-400 ring-2 ring-amber-300' : 'border-slate-200'
        }`}
        style={{ paddingLeft: `${INDENT}px` }}
      >
        {/* ── Left: expand + icon + name ── */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Expand */}
          <button type="button" onClick={() => hasChildren && onToggle(node)}
            className={`w-5 h-5 flex items-center justify-center flex-shrink-0 ${hasChildren ? 'text-slate-500 hover:text-slate-800 cursor-pointer' : 'cursor-default'}`}>
            {hasChildren
              ? node.expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
              : <div className="w-2 h-2 rounded-full bg-slate-200" />}
          </button>

          {/* Level badge */}
          <span className={`text-white text-[10px] font-bold w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${levelColor}`}>
            {node.level}
          </span>

          {/* Icon */}
          {node.nodeType === 'ledger'
            ? <FileText className={`w-3.5 h-3.5 flex-shrink-0 ${levelStyle.iconColor}`} />
            : <FolderPlus className={`w-3.5 h-3.5 flex-shrink-0 ${levelStyle.iconColor}`} />}

          {/* Name / inline edit */}
          {editing ? (
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <input autoFocus value={editVal} onChange={e => setEditVal(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && editVal.trim()) { onEdit?.(node, editVal.trim()); setEditing(false) }
                  if (e.key === 'Escape') setEditing(false)
                }}
                className="flex-1 max-w-xs h-7 px-2 text-sm rounded-lg border border-blue-300 bg-white outline-none" />
              <button onClick={() => { onEdit?.(node, editVal.trim()); setEditing(false) }} className="text-emerald-500"><Check className="w-3.5 h-3.5" /></button>
              <button onClick={() => setEditing(false)} className="text-slate-400"><X className="w-3.5 h-3.5" /></button>
            </div>
          ) : node.nodeType === 'ledger' && onLedgerClick ? (
            <button
              type="button"
              onClick={() => onLedgerClick(node)}
              className={`flex-1 min-w-0 text-sm truncate text-left flex items-center gap-1 hover:underline cursor-pointer ${levelStyle.textColor}`}
              title="View ledger transactions"
            >
              <span className="truncate">{node.name}</span>
              <ExternalLink className="w-3 h-3 opacity-50 flex-shrink-0" />
            </button>
          ) : (
            <span className={`flex-1 min-w-0 text-sm truncate ${levelStyle.textColor}`}>
              {node.name}
            </span>
          )}

          {/* Type badge + child count */}
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${levelStyle.badgeBg}`}>
            {node.nodeType === 'ledger' ? 'Ledger' : 'Group'}
          </span>
          {hasChildren && (
            <span className="text-[10px] text-slate-400 font-medium flex-shrink-0">
              {node.children!.length} {node.children!.length === 1 ? 'child' : 'children'}
            </span>
          )}
        </div>

        {/* ── Right: amount + actions ── */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Amount */}
          {node.nodeType === 'group' ? (
            <span className={`text-xs font-extrabold tabular-nums px-2.5 py-1 rounded-lg border ${
              node.totalAmount > 0
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : node.totalAmount < 0
                ? 'bg-red-50 text-red-600 border-red-200'
                : 'bg-slate-50 text-slate-400 border-slate-200'
            }`}>
              {fmtAmt(node.totalAmount)}
            </span>
          ) : node.totalAmount !== 0 ? (
            <span className={`text-sm font-bold tabular-nums ${node.totalAmount < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
              {fmtAmt(node.totalAmount)}
            </span>
          ) : null}

          {/* Action buttons */}
          {!editing && (
            <div className="flex items-center gap-1.5">
              {onAdd && canAddGroup(node) && (
                <button onClick={() => onAdd(node, 'group')}
                  className={`flex items-center gap-0.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${levelStyle.addGroupBtn}`}>
                  <Plus className="w-3 h-3" /> {subGroupLabel}
                </button>
              )}
              {onAdd && canAddLedger(node) && (
                <button onClick={() => onAdd(node, 'ledger')}
                  className="flex items-center gap-0.5 px-2.5 py-1 rounded-lg text-xs font-semibold border border-emerald-500 text-emerald-600 bg-white hover:bg-emerald-50 transition-colors">
                  <Plus className="w-3 h-3" /> Ledger
                </button>
              )}
              <div className="flex items-center gap-0.5">
                {onEdit && (
                  <button onClick={() => { setEditing(true); setEditVal(node.name) }}
                    className="flex items-center gap-0.5 px-2 py-1 rounded-lg text-xs font-semibold text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                )}
                {onDelete && depth > 0 && !hasChildren && !(node.nodeType === 'ledger' && node.amount !== 0) && (
                  <button onClick={() => onDelete(node)}
                    className="flex items-center gap-0.5 px-2 py-1 rounded-lg text-xs font-semibold text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Children */}
      {node.expanded && hasChildren && node.children!.map(child => (
        <NodeRow key={`${child.nodeType}-${child.id}`} node={child} depth={depth + 1}
          onToggle={onToggle} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} onLedgerClick={onLedgerClick} highlightKey={highlightKey} />
      ))}
    </>
  )
}

// ── Section ────────────────────────────────────────────────────────────────
function Section({ title, nodes, bgColor, textColor, rootNode, onToggle, onAdd, onEdit, onDelete, onLedgerClick, highlightKey }: {
  title: string; nodes: HierarchyNode[]; bgColor: string; textColor: string
  rootNode?: HierarchyNode
  onToggle: (node: HierarchyNode) => void
  onAdd?: (parent: HierarchyNode, type: 'group' | 'ledger') => void
  onEdit?: (node: HierarchyNode, newName: string) => void
  onDelete?: (node: HierarchyNode) => void
  onLedgerClick?: (node: HierarchyNode) => void
  highlightKey?: string | null
}) {
  const sectionTotal = nodes.reduce((s, n) => s + n.totalAmount, 0)
  return (
    <GlassCard className="overflow-hidden mb-6">
      {/* Section header */}
      <div className={`px-6 py-4 ${bgColor} flex items-center justify-between`}>
        <h3 className={`text-lg font-extrabold flex items-center gap-2 ${textColor}`}>
          {title === 'Income' ? '📈' : '📉'} {title}
        </h3>
        <span className={`text-lg font-extrabold tabular-nums ${textColor}`}>
          ₹{Math.abs(sectionTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      </div>

      {/* Tree */}
      {nodes.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <p className="text-slate-400 text-sm mb-3">No accounts yet. Add the first group to begin.</p>
          {onAdd && rootNode && (
            <button
              onClick={() => onAdd(rootNode, 'group')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add First Group
            </button>
          )}
        </div>
      ) : (
        <div>
          {nodes.map(node => (
            <NodeRow key={node.id} node={node} depth={0}
              onToggle={onToggle} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} onLedgerClick={onLedgerClick} highlightKey={highlightKey} />
          ))}
        </div>
      )}
    </GlassCard>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────
const today = todayISO()
const currentFY = getCurrentFY()

interface SearchItem {
  node: HierarchyNode
  label: string
  path: string
  sectionLabel: string
  ancestorIds: number[]
}

export default function ProfitAndLossPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const userId  = localStorage.getItem('user_id') ?? ''
  const entryBy = localStorage.getItem('usr_nm') ?? ''
  const selectedFY = useFYStore(s => s.selectedFY)
  const fyMin = selectedFY.fromDate
  const fyMax = selectedFY.startYear === currentFY.startYear ? today : selectedFY.toDate

  const [allExpanded, setAllExpanded] = useState(false)
  const [sortMode, setSortMode]       = useState<'name' | 'name_desc'>('name')
  const [addModal, setAddModal]       = useState<{ parent: HierarchyNode; type: 'group' | 'ledger' } | null>(null)
  const [addName, setAddName]         = useState('')
  const [queuedLedgers, setQueuedLedgers] = useState<string[]>([])

  const role_type   = localStorage.getItem('role_type') ?? '1'
  const district_id = localStorage.getItem('district_id') ?? '1'
  const qParams = { role_type, district_id }

  const { data: mastersRes, isFetching: f1, refetch: r1 }   = useQuery({ queryKey: ['pl-masters'],   queryFn: () => accountingService.getMastersAdd(qParams) })
  const { data: groupsRes, isFetching: f2, refetch: r2 }    = useQuery({ queryKey: ['pl-groups'],    queryFn: () => accountingService.getMastersGroup(qParams) })
  const { data: subgroupsRes, isFetching: f3, refetch: r3 } = useQuery({ queryKey: ['pl-subgroups'], queryFn: () => accountingService.getMainMastersSubgroup() })
  const { data: childrenRes, isFetching: f4, refetch: r4 }  = useQuery({ queryKey: ['pl-children'],  queryFn: () => accountingService.getMainMastersSubchild() })
  const { data: ledgersRes, isFetching: f5, refetch: r5 }   = useQuery({ queryKey: ['pl-ledgers'],   queryFn: () => accountingService.getLedgerData(qParams) })
  const { data: txRes, isFetching: f6, refetch: r6 }        = useQuery({
    queryKey: ['pl-transactions', fyMin, fyMax],
    queryFn: () => accountingService.getTransactionsReport({ fromdate: fyMin, todate: fyMax, ledger_name: '', ledger_id: null, user_id: userId }),
  })

  const isRefreshing = f1 || f2 || f3 || f4 || f5 || f6
  const refreshAll = () => { r1(); r2(); r3(); r4(); r5(); r6() }

  const mastersList   = mastersRes?.data   ?? []
  const groupsList    = groupsRes?.data    ?? []
  const subgroupsList = subgroupsRes?.data ?? []
  const childrenList  = childrenRes?.data  ?? []
  const ledgerList    = ledgersRes?.data   ?? []

  const isLoading = !mastersRes || !groupsRes || !subgroupsRes || !childrenRes || !ledgersRes

  // Build ledger_id → { debit, credit } — sign resolved later from node's district_id
  const txRawMap = useMemo(() => {
    const map = new Map<number, { debit: number; credit: number }>()
    const allData = txRes?.data
    if (!allData) return map
    const arrays: any[][] = (Array.isArray(allData) ? allData : Object.values(allData)).filter(v => Array.isArray(v)) as any[][]
    for (const arr of arrays) {
      for (const r of arr) {
        const raw = Math.abs(Number(r.amount ?? 0))
        if (!raw) continue
        const acct = String(r.account_type ?? r.amount_type ?? '').trim().toUpperCase()
        const lid = Number(r.ledger_id ?? r.ledgerid ?? r.ledgerId ?? NaN)
        if (Number.isNaN(lid)) continue
        const entry = map.get(lid) ?? { debit: 0, credit: 0 }
        if (acct === 'DEBIT ACCOUNT') entry.debit += raw
        else if (acct === 'CREDIT ACCOUNT') entry.credit += raw
        map.set(lid, entry)
      }
    }
    return map
  }, [txRes])

  const [renderTick, setRenderTick] = useState(0)
  const expandedIds = useRef(new Set<number>())

  // ── Build hierarchy ────────────────────────────────────────────────────
  const { income, expenses } = useMemo(() => {
    if (isLoading) return { income: [], expenses: [] }

    const map = new Map<number, HierarchyNode>()
    const roots: HierarchyNode[] = mastersList.map((m: any) => {
      const root: HierarchyNode = {
        id: m.id, name: m.districtnm, level: 1, parentId: null,
        amount: 0, totalAmount: 0, children: [], nodeType: 'group', expanded: false,
        staticname: m.districtnm, district_id: String(m.id),
      }
      map.set(m.id, root)

      const level2 = groupsList.filter((g: any) => g.district_id == m.id)
      level2.forEach((g: any) => {
        const n2: HierarchyNode = {
          id: g.id, name: g.mandal_name, level: 2, parentId: root.id,
          amount: 0, totalAmount: 0, children: [], nodeType: 'group', expanded: false,
          staticname: root.staticname, district_id: String(g.district_id),
          mandal_id: String(g.id), mandal_name: g.mandal_name,
        }
        root.children.push(n2)
        map.set(g.id, n2)

        const level3 = subgroupsList.filter((sg: any) => sg.district_id == m.id && sg.mandal_id == g.id)
        level3.forEach((sg: any) => {
          const n3: HierarchyNode = {
            id: sg.id, name: sg.village_name, level: 3, parentId: n2.id,
            amount: 0, totalAmount: 0, children: [], nodeType: 'group', expanded: false,
            staticname: root.staticname, district_id: n2.district_id,
            mandal_id: n2.mandal_id, mandal_name: n2.mandal_name, village_id: sg.id,
            child: sg.village_name,
          }
          n2.children.push(n3)
          map.set(sg.id, n3)

          const level4 = childrenList.filter((c: any) =>
            c.parent_subgroup_id == sg.id && (!c.self_parent_id) && Number(c.level_depth) === 4
          )
          level4.forEach((c: any) => {
            const n4: HierarchyNode = {
              id: c.id, name: c.temple_name, level: 4, parentId: n3.id,
              amount: 0, totalAmount: 0, children: [], nodeType: 'group', expanded: false,
              staticname: root.staticname, district_id: n3.district_id,
              mandal_id: n3.mandal_id, mandal_name: n3.mandal_name,
              village_id: n3.village_id, child: n3.child, subchildtwo: c.temple_name,
            }
            n3.children.push(n4)
            map.set(c.id, n4)
            attachLedgers(n4, ledgerList, map)
          })
          attachLedgers(n3, ledgerList, map)
        })
        attachLedgers(n2, ledgerList, map)
      })
      attachLedgers(root, ledgerList, map)
      return root
    })

    // Apply amounts using node's district_id for sign logic
    const applyAmounts = (n: HierarchyNode) => {
      if (n.nodeType === 'ledger') {
        const entry = txRawMap.get(n.id)
        if (entry) {
          const did = n.district_id ?? ''
          // Income (3): Credit = positive, Debit = reversal (negative)
          // Expenses (4): Debit = positive, Credit = reversal (negative)
          if (did === '3') n.amount = entry.credit - entry.debit
          else if (did === '4') n.amount = entry.debit - entry.credit
          else n.amount = entry.debit - entry.credit
        }
      }
      n.children.forEach(applyAmounts)
    }
    roots.forEach(applyAmounts)

    roots.forEach(r => calcTotals(r))

    const income   = roots.filter(r => r.name.toUpperCase().includes('INCOME'))
    const expenses = roots.filter(r => r.name.toUpperCase().includes('EXPENSE'))

    const sortFn = sortMode === 'name'
      ? (a: HierarchyNode, b: HierarchyNode) => a.name.localeCompare(b.name)
      : (a: HierarchyNode, b: HierarchyNode) => b.name.localeCompare(a.name)
    const sortRecursive = (nodes: HierarchyNode[]) => {
      nodes.sort(sortFn)
      nodes.forEach(n => sortRecursive(n.children))
    }
    income.forEach(r => sortRecursive(r.children))
    expenses.forEach(r => sortRecursive(r.children))

    // Restore expanded state after rebuild
    const restoreExpanded = (n: HierarchyNode) => {
      n.expanded = expandedIds.current.has(n.id)
      n.children.forEach(restoreExpanded)
    }
    ;[...income, ...expenses].forEach(restoreExpanded)

    return { income, expenses }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mastersList, groupsList, subgroupsList, childrenList, ledgerList, txRawMap, sortMode, isLoading])

  // ── Quick Jump search index ────────────────────────────────────────────
  const flatSearchItems = useMemo<SearchItem[]>(() => {
    const items: SearchItem[] = []
    const traverse = (node: HierarchyNode, ancestors: HierarchyNode[], sectionLabel: string) => {
      if (node.level >= 2) {
        const pathParts = ancestors.filter(a => a.level >= 2).map(a => a.name)
        items.push({
          node, label: node.name, path: pathParts.join(' › '), sectionLabel,
          ancestorIds: ancestors.map(a => a.id),
        })
      }
      for (const child of node.children) traverse(child, [...ancestors, node], sectionLabel)
    }
    for (const root of income)   traverse(root, [], 'Income')
    for (const root of expenses) traverse(root, [], 'Expenses')
    return items
  }, [income, expenses])

  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [highlightKey, setHighlightKey] = useState<string | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  const filteredSearchItems = useMemo<SearchItem[]>(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return []
    return flatSearchItems
      .filter(item => item.label.toLowerCase().includes(q) || item.path.toLowerCase().includes(q))
      .slice(0, 25)
  }, [flatSearchItems, searchQuery])

  const jumpToNode = useCallback((item: SearchItem) => {
    setSearchQuery('')
    setSearchOpen(false)

    const ancestorIdSet = new Set(item.ancestorIds)
    const expandAncestors = (n: HierarchyNode) => {
      if (ancestorIdSet.has(n.id)) {
        n.expanded = true
        expandedIds.current.add(n.id)
      }
      n.children.forEach(expandAncestors)
    }
    ;[...income, ...expenses].forEach(expandAncestors)
    setRenderTick(t => t + 1)

    const key = `${item.node.nodeType}-${item.node.id}`
    setHighlightKey(key)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.getElementById(`pl-node-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    })
    setTimeout(() => setHighlightKey(k => k === key ? null : k), 2500)
  }, [income, expenses])

  const toggleNode = (node: HierarchyNode) => {
    node.expanded = !node.expanded
    if (node.expanded) expandedIds.current.add(node.id)
    else expandedIds.current.delete(node.id)
    setRenderTick(t => t + 1)
  }

  const handleExpandAll = () => {
    const next = !allExpanded
    setAllExpanded(next)
    const syncIds = (n: HierarchyNode) => {
      if (next) expandedIds.current.add(n.id)
      else expandedIds.current.delete(n.id)
      n.children.forEach(syncIds)
    }
    ;[...income, ...expenses].forEach(r => { setExpanded(r, next); syncIds(r) })
    setRenderTick(t => t + 1)
  }

  const [creating, setCreating] = useState(false)
  const handleCreateMasters = async () => {
    setCreating(true)
    try {
      if (income.length === 0) await accountingService.createMaster({ districtnm: 'INCOME' })
      if (expenses.length === 0) await accountingService.createMaster({ districtnm: 'EXPENSES' })
      qc.invalidateQueries({ queryKey: ['pl-masters'] })
    } catch { toast.error('Failed to initialise P&L sections') }
    finally { setCreating(false) }
  }

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['pl-masters'] })
    qc.invalidateQueries({ queryKey: ['pl-groups'] })
    qc.invalidateQueries({ queryKey: ['pl-subgroups'] })
    qc.invalidateQueries({ queryKey: ['pl-children'] })
    qc.invalidateQueries({ queryKey: ['pl-ledgers'] })
    qc.invalidateQueries({ queryKey: ['pl-transactions'] })
  }

  // ── Add mutation ───────────────────────────────────────────────────────
  const { mutate: addNode } = useMutation({
    mutationFn: async ({ parent, type, name }: { parent: HierarchyNode; type: 'group' | 'ledger'; name: string }) => {
      if (type === 'ledger') {
        let pgLevel = 1, psgId: any = null, pscId: any = null
        if (parent.level >= 4)       { pgLevel = 4; psgId = parent.village_id ?? null; pscId = parent.id }
        else if (parent.level === 3) { pgLevel = 3; psgId = parent.id }
        else if (parent.level === 2) { pgLevel = 2 }
        else if (parent.level === 1) { pgLevel = 1 }
        return accountingService.addLedgerData({
          temple_name: name, amount: 0,
          parent_level: pgLevel,
          parent_subgroup_id: psgId, parent_subchild_id: pscId,
          district_id: parent.district_id, staticname: parent.staticname,
          mandal_id: parent.mandal_id ?? null, mandal_name: parent.mandal_name ?? '',
          village_id: parent.village_id ?? null, child: parent.child ?? '',
          subchildtwo: parent.name, user_id: userId, entry_by: entryBy,
        })
      }
      if (parent.level === 1) return accountingService.addMasterGroup({ district_id: parent.district_id, mandal_name: name, staticentry: parent.staticname, user_id: userId, entry_by: entryBy })
      if (parent.level === 2) return accountingService.addSubGroup({ district_id: parent.district_id, mandal_id: parent.mandal_id, village_name: name, staticentry: parent.staticname, user_id: userId, entry_by: entryBy })
      if (parent.level === 3) return accountingService.addChildData({ parent_subgroup_id: parent.id, self_parent_id: null, temple_name: name, level_depth: 4, has_ledgers: 0, can_add_subgroups: 1, district_id: parent.district_id, mandal_id: parent.mandal_id, village_id: parent.id, staticentry: parent.staticname, user_id: userId, entry_by: entryBy })
      return accountingService.addInfiniteGroup({ parent_subgroup_id: parent.parent_subgroup_id ?? parent.village_id, self_parent_id: parent.id, temple_name: name, level_depth: parent.level + 1, has_ledgers: 0, can_add_subgroups: 1, district_id: parent.district_id, mandal_id: parent.mandal_id, village_id: parent.village_id, staticentry: parent.staticname, user_id: userId, entry_by: entryBy })
    },
    onSuccess: (res: any) => {
      if (res?.status === 200) { toast.success('Added!'); invalidateAll() }
      else toast.error('Failed to add')
    },
    onError: () => toast.error('Server error'),
  })

  // ── Edit mutation ──────────────────────────────────────────────────────
  const { mutate: editNode } = useMutation({
    mutationFn: ({ node, newName }: { node: HierarchyNode; newName: string }) =>
      node.nodeType === 'ledger'
        ? accountingService.updateLedgerName({ ...node, id: node.id, temple_name: newName })
        : accountingService.updateGroupName({ ...node, id: node.id, editname: newName }),
    onSuccess: (res: any) => {
      if (res?.status === 200) { toast.success('Updated!'); invalidateAll() }
      else toast.error('Failed to update')
    },
    onError: () => toast.error('Server error'),
  })

  // ── Delete mutation ────────────────────────────────────────────────────
  const { mutate: deleteNode } = useMutation({
    mutationFn: (node: HierarchyNode) =>
      node.nodeType === 'ledger'
        ? accountingService.deleteLedger({ ...node, id: node.id })
        : accountingService.deleteGroup({ ...node, id: node.id }),
    onSuccess: (res: any) => {
      if (res?.status === 200) { toast.success('Deleted!'); invalidateAll() }
      else toast.error('Failed to delete — may have children')
    },
    onError: () => toast.error('Server error'),
  })

  const queueCurrent = () => {
    const name = addName.trim()
    if (!name) return
    if (!queuedLedgers.includes(name)) setQueuedLedgers(q => [...q, name])
    setAddName('')
  }

  const handleModalAdd = async () => {
    if (!addModal) return

    if (addModal.type === 'group') {
      if (!addName.trim()) return
      addNode(
        { parent: addModal.parent, type: 'group', name: addName.trim() },
        { onSuccess: (res: any) => { if (res?.status === 200) { setAddModal(null); setAddName('') } } }
      )
      return
    }

    const names = [...new Set([...queuedLedgers, ...(addName.trim() ? [addName.trim()] : [])])]
    if (names.length === 0) return

    setQueuedLedgers([])
    setAddName('')
    let allOk = true
    for (const name of names) {
      try {
        const res: any = await new Promise((resolve, reject) =>
          addNode({ parent: addModal.parent, type: 'ledger', name }, { onSuccess: resolve, onError: reject })
        )
        if (res?.status !== 200) allOk = false
      } catch { allOk = false }
    }
    if (allOk) { setAddModal(null); invalidateAll() }
  }

  const openAdd = (parent: HierarchyNode, type: 'group' | 'ledger') => {
    setAddModal({ parent, type })
    setAddName('')
    setQueuedLedgers([])
  }

  const handleLedgerClick = (node: HierarchyNode) => {
    navigate('/accounting/ledger-wise', { state: { ledgerId: node.id } })
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <PageHeader title="Profit & Loss" subtitle="Income and expenses hierarchy" />

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <FYSelector className="pb-4 border-b border-slate-100" />
        <div className="flex items-center justify-between flex-wrap gap-3">
          <button
            onClick={handleExpandAll}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            {allExpanded
              ? <><ChevronsDownUp className="w-4 h-4" /> Collapse All</>
              : <><ChevronsUpDown className="w-4 h-4" /> Expand All</>}
          </button>
          <div className="flex items-center gap-2">
            <ExportMenu
              disabled={isLoading || income.length === 0 || expenses.length === 0}
              onExport={(format) => {
                const rows = statementRows([{ title: 'Income', nodes: income }, { title: 'Expenses', nodes: expenses }], format)
                // Closing line, as on the summary cards below the tree.
                const net = income.reduce((s, n) => s + n.totalAmount, 0) - expenses.reduce((s, n) => s + n.totalAmount, 0)
                rows.push(['', net >= 0 ? 'NET PROFIT' : 'NET LOSS', '', exportAmount(Math.abs(net), format)])
                exportRows({ title: `Profit & Loss (${formatDate(fyMin)} to ${formatDate(fyMax)})`, fileName: 'Profit and Loss', headers: ['Sl No', 'Particulars', 'Type', 'Amount'], rows, format })
              }}
            />
            <button
              onClick={refreshAll}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <span className="text-sm text-slate-500 font-medium">Sort By</span>
            <select
              value={sortMode}
              onChange={e => setSortMode(e.target.value as any)}
              style={{ colorScheme: 'light' }}
              className="h-9 pl-3 pr-8 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none shadow-sm appearance-none"
            >
              <option value="name">Name (A→Z)</option>
              <option value="name_desc">Name (Z→A)</option>
            </select>
          </div>
        </div>

        {/* Quick Jump search */}
        <div ref={searchRef} className="relative pt-4 border-t border-slate-100">
          <Label>Quick Jump</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Type a group or ledger name to jump directly…"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true) }}
              onFocus={() => setSearchOpen(true)}
              disabled={isLoading}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder:text-slate-400 disabled:opacity-50"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setSearchOpen(false) }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <AnimatePresence>
            {searchOpen && filteredSearchItems.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="absolute z-50 left-0 right-0 top-full mt-1 bg-white rounded-2xl border border-slate-200 shadow-2xl max-h-80 overflow-y-auto"
              >
                <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                    {filteredSearchItems.length} result{filteredSearchItems.length !== 1 ? 's' : ''}
                  </span>
                  <span className="text-[11px] text-slate-400">Click to jump directly</span>
                </div>
                {filteredSearchItems.map((item, idx) => {
                  const fullPath = [item.sectionLabel, item.path].filter(Boolean).join(' › ')
                  return (
                    <button
                      key={idx}
                      onMouseDown={e => { e.preventDefault(); jumpToNode(item) }}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0 flex items-start gap-3"
                    >
                      <div className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${item.node.nodeType === 'ledger' ? 'bg-emerald-100' : 'bg-blue-100'}`}>
                        {item.node.nodeType === 'ledger'
                          ? <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                          : <Layers className="w-3.5 h-3.5 text-blue-600" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{item.label}</p>
                        {fullPath && (
                          <p className="text-xs text-slate-400 truncate mt-0.5">{fullPath}</p>
                        )}
                      </div>
                      <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${item.node.nodeType === 'ledger' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                        {item.node.nodeType === 'ledger' ? 'Ledger' : 'Group'}
                      </span>
                    </button>
                  )
                })}
              </motion.div>
            )}
            {searchOpen && searchQuery.trim() && filteredSearchItems.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                className="absolute z-50 left-0 right-0 top-full mt-1 bg-white rounded-2xl border border-slate-200 shadow-xl px-4 py-6 text-center"
              >
                <p className="text-sm text-slate-400">No groups or ledgers match "<span className="font-medium text-slate-600">{searchQuery}</span>"</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Setup screen — shown when INCOME or EXPENSES masters don't exist yet */}
      {!isLoading && (income.length === 0 || expenses.length === 0) && (
        <GlassCard className="p-10 text-center">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Profit & Loss Not Set Up Yet</h3>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">
            The Income and Expenses sections need to be created before you can add groups and ledgers.
            Click the button below to set them up automatically.
          </p>
          <Button
            onClick={handleCreateMasters}
            disabled={creating}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 border-0 text-white px-8 py-3 text-base"
          >
            {creating ? (
              <><span className="animate-spin mr-2">⏳</span> Creating…</>
            ) : (
              <><Plus className="w-5 h-5 mr-2" /> Set Up Income & Expenses Sections</>
            )}
          </Button>
        </GlassCard>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : !isLoading && income.length > 0 && expenses.length > 0 ? (
        <>
          <Section
            title="Income"
            nodes={income}
            bgColor="bg-emerald-100"
            textColor="text-emerald-900"
            rootNode={income[0]}
            onToggle={toggleNode}
            onAdd={openAdd}
            onEdit={(node, newName) => editNode({ node, newName })}
            onDelete={(node) => deleteNode(node)}
            onLedgerClick={handleLedgerClick}
            highlightKey={highlightKey}
          />
          <Section
            title="Expenses"
            nodes={expenses}
            bgColor="bg-red-100"
            textColor="text-red-900"
            rootNode={expenses[0]}
            onToggle={toggleNode}
            onAdd={openAdd}
            onEdit={(node, newName) => editNode({ node, newName })}
            onDelete={(node) => deleteNode(node)}
            onLedgerClick={handleLedgerClick}
            highlightKey={highlightKey}
          />

          {/* P&L Summary */}
          {(() => {
            const totalIncome   = income.reduce((s, n) => s + n.totalAmount, 0)
            const totalExpenses = expenses.reduce((s, n) => s + n.totalAmount, 0)
            const netPL         = totalIncome - totalExpenses
            const fmt = (v: number) => '₹' + Math.abs(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })
            return (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Total Income */}
                <GlassCard className="p-5 text-center border-t-4 border-t-emerald-500">
                  <p className="text-sm font-semibold text-slate-500 mb-1">📈 Total Income</p>
                  <p className="text-2xl font-extrabold text-emerald-600 tabular-nums">{fmt(totalIncome)}</p>
                </GlassCard>

                {/* Total Expenses */}
                <GlassCard className="p-5 text-center border-t-4 border-t-red-500">
                  <p className="text-sm font-semibold text-slate-500 mb-1">📉 Total Expenses</p>
                  <p className="text-2xl font-extrabold text-red-500 tabular-nums">{fmt(totalExpenses)}</p>
                </GlassCard>

                {/* Net Profit / Loss */}
                <GlassCard className={`p-5 text-center border-t-4 ${netPL >= 0 ? 'border-t-blue-500' : 'border-t-orange-500'}`}>
                  <p className="text-sm font-semibold text-slate-500 mb-1">
                    {netPL >= 0 ? '📊 Net Profit' : '📊 Net Loss'}
                  </p>
                  <p className={`text-2xl font-extrabold tabular-nums ${netPL >= 0 ? 'text-blue-600' : 'text-orange-500'}`}>
                    {netPL < 0 ? '-' : ''}{fmt(netPL)}
                  </p>
                </GlassCard>
              </div>
            )
          })()}
        </>
      ) : null}

      {/* ── Add Node Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {addModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl max-w-md w-full shadow-2xl mx-4 overflow-hidden">
              {(() => {
                const newLevel = addModal.parent.level + 1
                const levelName = addModal.type === 'ledger' ? 'Ledger'
                  : newLevel === 2 ? 'Group' : newLevel === 3 ? 'Sub Group' : newLevel === 4 ? 'Child' : 'Sub Child'
                const headerColor = addModal.type === 'ledger' ? MODAL_HEADER_COLORS.ledger
                  : MODAL_HEADER_COLORS[String(newLevel)] ?? MODAL_HEADER_COLORS.default
                return (
                  <>
                    <div className={`bg-gradient-to-r ${headerColor} px-6 py-4 flex items-center justify-between`}>
                      <div className="flex items-center gap-2.5 text-white">
                        <Plus className="w-5 h-5" />
                        <span className="font-bold text-lg">Add {levelName}</span>
                      </div>
                      <button onClick={() => setAddModal(null)} className="text-white/70 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="flex items-start gap-2 text-sm text-slate-600">
                        <Info className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
                        <span>Adding new <span className="font-semibold">{levelName.toLowerCase()}</span> under: <span className="font-bold text-slate-900">{addModal.parent.name}</span></span>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-500 font-mono leading-relaxed">
                        <span className="text-slate-400 font-sans font-semibold mr-1">Path:</span>
                        {buildPath(addModal.parent, addModal.type).split(' → ').map((part, i, arr) => (
                          <span key={i}>
                            {i > 0 && <span className="mx-1 text-slate-300">→</span>}
                            {i === arr.length - 1
                              ? <span className={`inline-block px-2 py-0.5 rounded-full text-white text-[11px] font-bold bg-gradient-to-r ${headerColor}`}>{part}</span>
                              : <span className="text-slate-600">{part}</span>}
                          </span>
                        ))}
                      </div>
                      <div>
                        <Label>{levelName} Name <span className="text-red-500">*</span></Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            autoFocus
                            placeholder={`Enter ${levelName.toLowerCase()} name`}
                            value={addName}
                            onChange={e => setAddName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                if (addModal.type === 'ledger') queueCurrent()
                                else handleModalAdd()
                              }
                            }}
                          />
                          {addModal.type === 'ledger' && (
                            <button
                              type="button"
                              onClick={queueCurrent}
                              disabled={!addName.trim()}
                              className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40 transition-colors"
                              title="Add to list"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        {addModal.type === 'ledger' && (
                          <p className="text-xs text-slate-400 mt-1">Type a name and press <kbd className="px-1 py-0.5 bg-slate-100 rounded text-slate-600 font-mono text-[10px]">Enter</kbd> or <kbd className="px-1 py-0.5 bg-slate-100 rounded text-slate-600 font-mono text-[10px]">+</kbd> to add multiple ledgers at once.</p>
                        )}
                      </div>

                      {/* Queued ledgers list */}
                      {addModal.type === 'ledger' && queuedLedgers.length > 0 && (
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                          <div className="bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase">
                            Ledgers to add ({queuedLedgers.length})
                          </div>
                          {queuedLedgers.map((name, i) => (
                            <div key={i} className="flex items-center gap-2 px-3 py-2 border-t border-slate-100">
                              <FileText className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                              <span className="flex-1 text-sm text-slate-700">{name}</span>
                              <button
                                onClick={() => setQueuedLedgers(q => q.filter((_, idx) => idx !== i))}
                                className="text-slate-300 hover:text-red-400 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex justify-end gap-3 pt-1">
                        <Button variant="ghost" onClick={() => setAddModal(null)}>Cancel</Button>
                        <Button
                          onClick={handleModalAdd}
                          disabled={addModal.type === 'ledger' ? (queuedLedgers.length === 0 && !addName.trim()) : !addName.trim()}
                          className={`bg-gradient-to-r ${headerColor} border-0 text-white`}
                        >
                          <Plus className="w-4 h-4" />
                          {addModal.type === 'ledger' && queuedLedgers.length > 0
                            ? `Add ${queuedLedgers.length + (addName.trim() ? 1 : 0)} Ledgers`
                            : `Add ${levelName}`}
                        </Button>
                      </div>
                    </div>
                  </>
                )
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Attach ledgers to a node ───────────────────────────────────────────────
function attachLedgers(node: HierarchyNode, ledgerList: any[], map: Map<number, HierarchyNode>): void {
  const did = String(node.district_id ?? '')
  const mid = String(node.mandal_id ?? '')
  const vid = Number(node.village_id ?? 0)

  let applicable: any[] = []
  if (node.level === 1) {
    applicable = ledgerList.filter((l: any) =>
      String(l.district_id) === did && !l.mandal_id && !l.village_id && !l.parent_subgroup_id && Number(l.parent_grp_level) === 1
    )
  } else if (node.level === 2) {
    applicable = ledgerList.filter((l: any) =>
      String(l.district_id) === did && String(l.mandal_id ?? '') === mid &&
      !l.village_id && !l.parent_subgroup_id && Number(l.parent_grp_level) === 2
    )
  } else if (node.level === 3) {
    applicable = ledgerList.filter((l: any) =>
      String(l.district_id) === did && String(l.mandal_id ?? '') === mid &&
      Number(l.parent_subgroup_id) === vid && !l.parent_subchild_id && Number(l.parent_grp_level) === 3
    )
  } else {
    applicable = ledgerList.filter((l: any) => Number(l.parent_subchild_id) === node.id)
  }

  const existing = new Set(node.children.filter(c => c.nodeType === 'ledger').map(c => c.name))
  applicable.forEach((l: any) => {
    if (existing.has(l.temple_name)) return
    const ledger: HierarchyNode = {
      id: Number(l.id ?? l.ledger_id), name: l.temple_name,
      level: node.level + 1, parentId: node.id,
      amount: 0, totalAmount: 0, children: [], nodeType: 'ledger', expanded: false,
      staticname: node.staticname, district_id: node.district_id,
      mandal_id: node.mandal_id, village_id: node.village_id,
      parent_subgroup_id: l.parent_subgroup_id, parent_subchild_id: l.parent_subchild_id,
      parent_grp_level: l.parent_grp_level,
    }
    node.children.push(ledger)
    map.set(ledger.id, ledger)
    existing.add(l.temple_name)
  })
}
