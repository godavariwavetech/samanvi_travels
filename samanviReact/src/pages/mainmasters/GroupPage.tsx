import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router'
import { motion, AnimatePresence } from 'motion/react'
import {
  ChevronRight, ChevronDown, ChevronsDownUp, ChevronsUpDown,
  Plus, Pencil, Trash2, Check, X, FolderPlus, FileText, Info,
  ArrowRightLeft, Search,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Label, PageHeader } from '@/components/shared'
import { accountingService } from '@/services/accounting.service'

// ── Types ─────────────────────────────────────────────────────────────────────
interface HNode {
  id: number
  name: string
  level: number
  parentId: number | null
  children: HNode[]
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
}

interface FlatGroup { node: HNode; path: string }

// ── Section meta ──────────────────────────────────────────────────────────────
const SECTIONS = [
  {
    key: '1', label: 'Assets',
    headerCls: 'bg-blue-600', textCls: 'text-white',
    desc: 'Things your business owns or controls — cash, bank balances, vehicles, property, debtors (money owed TO you).',
  },
  {
    key: '2', label: 'Equities & Liabilities',
    headerCls: 'bg-amber-500', textCls: 'text-white',
    desc: "What your business owes or capital invested — loans, creditors (money owed BY you), owner's capital, retained earnings.",
  },
  {
    key: '3', label: 'Income',
    headerCls: 'bg-emerald-600', textCls: 'text-white',
    desc: 'Revenue earned by your business — ticket sales, charter income, commissions, interest received.',
  },
  {
    key: '4', label: 'Expenses',
    headerCls: 'bg-rose-600', textCls: 'text-white',
    desc: 'Costs incurred by your business — salaries, fuel, maintenance, rent paid, depreciation.',
  },
]

const LEVEL_COLORS = ['', 'bg-blue-600', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-400', 'bg-pink-400']
const LEVEL_LABELS = ['', 'Section', 'Main Group', 'Sub Group', 'Child Group', 'Sub Child']

const MODAL_GRAD: Record<string, string> = {
  ledger: 'from-emerald-500 to-teal-600',
  '2': 'from-violet-500 to-purple-600',
  '3': 'from-emerald-500 to-green-600',
  '4': 'from-blue-500 to-indigo-600',
  default: 'from-cyan-500 to-sky-600',
}

const canAddGroup  = (n: HNode) => n.nodeType === 'group' && !n.children.some(c => c.nodeType === 'ledger')
const canAddLedger = (n: HNode) => n.nodeType === 'group' && n.level > 1 && !n.children.some(c => c.nodeType === 'group')

function buildPath(node: HNode, type: 'group' | 'ledger'): string {
  const badge = type === 'ledger' ? 'New Ledger' : `New ${LEVEL_LABELS[node.level + 1] ?? `L${node.level + 1}`}`
  const parts: string[] = []
  if (node.staticname) parts.push(node.staticname)
  if (node.level >= 2 && node.mandal_name) parts.push(node.mandal_name)
  if (node.level >= 3 && node.child) parts.push(node.child)
  if (node.level >= 4 && node.subchildtwo) parts.push(node.subchildtwo)
  return [...parts, badge].join(' → ')
}

function flattenGroups(nodes: HNode[], pathSoFar: string, out: FlatGroup[]): void {
  for (const n of nodes) {
    if (n.nodeType !== 'group') continue
    const p = pathSoFar ? `${pathSoFar} → ${n.name}` : n.name
    out.push({ node: n, path: p })
    flattenGroups(n.children, p, out)
  }
}

// Flattens both groups and ledgers — used for the Quick Jump search (Move modal uses flattenGroups, groups only)
function flattenSearchItems(nodes: HNode[], pathSoFar: string, out: FlatGroup[]): void {
  for (const n of nodes) {
    const p = pathSoFar ? `${pathSoFar} → ${n.name}` : n.name
    out.push({ node: n, path: pathSoFar })
    if (n.nodeType === 'group') flattenSearchItems(n.children, p, out)
  }
}

// ── Per-level visual config ───────────────────────────────────────────────────
const LEVEL_STYLE = {
  ledger: {
    wrap:   'bg-emerald-50 border border-emerald-200 rounded mb-0.5',
    text:   'text-emerald-800 text-xs font-medium',
    icon:   'text-emerald-500',
    pill:   'bg-emerald-200 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full',
    addBtn: '',
    py:     'py-2',
  },
  2: {  // Main Group — most prominent
    wrap:   'bg-orange-50 border-2 border-orange-300 rounded-lg mb-2 shadow',
    text:   'text-orange-900 text-sm font-bold',
    icon:   'text-orange-500',
    pill:   'bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full',
    addBtn: 'bg-orange-500 text-white hover:bg-orange-600',
    py:     'py-3',
  },
  3: {  // Sub Group
    wrap:   'bg-violet-50 border border-violet-200 border-l-4 border-l-violet-500 rounded mb-1',
    text:   'text-violet-800 text-sm font-semibold',
    icon:   'text-violet-500',
    pill:   'bg-violet-200 text-violet-800 text-[10px] font-bold px-2 py-0.5 rounded-full',
    addBtn: 'bg-violet-500 text-white hover:bg-violet-600',
    py:     'py-2.5',
  },
  4: {  // Child Group
    wrap:   'bg-sky-50 border border-sky-100 border-l-4 border-l-sky-400 rounded mb-0.5',
    text:   'text-sky-800 text-sm font-medium',
    icon:   'text-sky-500',
    pill:   'bg-sky-200 text-sky-800 text-[10px] font-bold px-2 py-0.5 rounded-full',
    addBtn: 'bg-sky-500 text-white hover:bg-sky-600',
    py:     'py-2',
  },
  default: {
    wrap:   'bg-purple-50 border border-purple-100 border-l-4 border-l-purple-400 rounded mb-0.5',
    text:   'text-purple-700 text-xs font-medium',
    icon:   'text-purple-400',
    pill:   'bg-purple-200 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full',
    addBtn: 'bg-purple-400 text-white hover:bg-purple-500',
    py:     'py-2',
  },
} as const

// ── Node row ──────────────────────────────────────────────────────────────────
function NodeRow({ node, depth, onToggle, onAdd, onEdit, onDelete, onMove }: {
  node: HNode; depth: number
  onToggle: (n: HNode) => void
  onAdd?: (parent: HNode, type: 'group' | 'ledger') => void
  onEdit?: (n: HNode, name: string) => void
  onDelete?: (n: HNode) => void
  onMove?: (n: HNode) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editVal, setEditVal] = useState(node.name)
  const hasChildren = node.children.length > 0

  const key = node.nodeType === 'ledger' ? 'ledger' : (node.level as 2|3|4) in LEVEL_STYLE ? node.level as 2|3|4 : 'default'
  const s = LEVEL_STYLE[key as keyof typeof LEVEL_STYLE]

  const subLabel = LEVEL_LABELS[node.level + 1] ?? 'Sub Child'
  const typeLabel = node.nodeType === 'ledger' ? 'Ledger' : LEVEL_LABELS[node.level] || 'Group'
  // Each depth level indents by 20px; outer container keeps mx-2 (8px) on both sides
  const indentPx = 8 + depth * 20

  return (
    <>
      <div
        id={`gp-node-${node.id}`}
        className={`group/row flex items-center gap-2.5 pr-3 mr-2 ${s.py} ${s.wrap} hover:brightness-95 transition-all`}
        style={{ marginLeft: `${indentPx}px` }}
      >
        {/* Expand toggle */}
        <button type="button" onClick={() => hasChildren && onToggle(node)}
          className={`w-5 h-5 flex-shrink-0 flex items-center justify-center ml-2 ${hasChildren ? 'cursor-pointer opacity-60 hover:opacity-100' : 'cursor-default opacity-30'}`}>
          {hasChildren
            ? node.expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
            : <span className="w-1.5 h-1.5 rounded-full bg-current opacity-40 inline-block" />}
        </button>

        {/* Icon */}
        {node.nodeType === 'ledger'
          ? <FileText className={`w-4 h-4 flex-shrink-0 ${s.icon}`} />
          : <FolderPlus className={`w-4 h-4 flex-shrink-0 ${s.icon}`} />}

        {/* Name / inline edit */}
        {editing ? (
          <div className="flex items-center gap-1.5 flex-1">
            <input autoFocus value={editVal} onChange={e => setEditVal(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && editVal.trim()) { onEdit?.(node, editVal.trim()); setEditing(false) }
                if (e.key === 'Escape') setEditing(false)
              }}
              className="flex-1 max-w-xs h-7 px-2 text-sm rounded-lg border border-blue-300 bg-white outline-none" />
            <button onClick={() => { if (editVal.trim()) { onEdit?.(node, editVal.trim()); setEditing(false) } }} className="text-emerald-500"><Check className="w-3.5 h-3.5" /></button>
            <button onClick={() => setEditing(false)} className="text-slate-400"><X className="w-3.5 h-3.5" /></button>
          </div>
        ) : (
          <span className={`flex-1 truncate ${s.text}`}>{node.name}</span>
        )}

        {/* Type pill — always visible, shows what level this is */}
        <span className={`flex-shrink-0 ${s.pill}`}>{typeLabel}</span>

        {hasChildren && (
          <span className="text-[10px] text-slate-400 font-medium flex-shrink-0">
            {node.children.length} {node.children.length === 1 ? 'item' : 'items'}
          </span>
        )}

        {/* Actions — appear on hover */}
        {!editing && (
          <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover/row:opacity-100 transition-opacity">
            {onAdd && canAddGroup(node) && (
              <button onClick={() => onAdd(node, 'group')}
                className={`flex items-center gap-0.5 px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${s.addBtn}`}>
                <Plus className="w-3 h-3" /> {subLabel}
              </button>
            )}
            {onAdd && canAddLedger(node) && (
              <button onClick={() => onAdd(node, 'ledger')}
                className="flex items-center gap-0.5 px-2 py-1 rounded-lg text-xs font-semibold border border-emerald-500 text-emerald-700 bg-white hover:bg-emerald-50 transition-colors">
                <Plus className="w-3 h-3" /> Ledger
              </button>
            )}
            {node.nodeType === 'ledger' && node.id > 0 && onMove && (
              <button onClick={() => onMove(node)}
                className="flex items-center gap-0.5 px-2 py-1 rounded-lg text-xs font-semibold border border-indigo-400 text-indigo-600 bg-white hover:bg-indigo-50 transition-colors">
                <ArrowRightLeft className="w-3 h-3" /> Move
              </button>
            )}
            {node.level > 1 && onEdit && (
              <button onClick={() => { setEditing(true); setEditVal(node.name) }}
                className="flex items-center gap-0.5 px-2 py-1 rounded-lg text-xs font-semibold text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                <Pencil className="w-3 h-3" /> Edit
              </button>
            )}
            {depth > 0 && !hasChildren && onDelete && (
              <button onClick={() => onDelete(node)}
                className="flex items-center gap-0.5 px-2 py-1 rounded-lg text-xs font-semibold text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            )}
          </div>
        )}
      </div>

      {node.expanded && hasChildren && node.children.map(child => (
        <NodeRow key={`${child.nodeType}-${child.id}`} node={child} depth={depth + 1}
          onToggle={onToggle} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} onMove={onMove} />
      ))}
    </>
  )
}

// ── Section card ──────────────────────────────────────────────────────────────
function SectionCard({ meta, children, rootNode, onToggle, onAdd, onEdit, onDelete, onMove }: {
  meta: typeof SECTIONS[0]
  children: HNode[]
  rootNode?: HNode
  onToggle: (n: HNode) => void
  onAdd?: (parent: HNode, type: 'group' | 'ledger') => void
  onEdit?: (n: HNode, name: string) => void
  onDelete?: (n: HNode) => void
  onMove?: (n: HNode) => void
}) {
  const [open, setOpen] = useState(true)
  const [showDesc, setShowDesc] = useState(false)

  return (
    <GlassCard className="overflow-hidden mb-5">
      <div className={`${meta.headerCls} px-5 py-3.5 flex items-center justify-between cursor-pointer select-none`}
        onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-3">
          <span className={`font-extrabold text-base ${meta.textCls}`}>{meta.label}</span>
          <button type="button"
            onClick={e => { e.stopPropagation(); setShowDesc(s => !s) }}
            className={`opacity-70 hover:opacity-100 transition-opacity`}>
            <Info className={`w-4 h-4 ${meta.textCls}`} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${meta.textCls} opacity-70`}>{children.length} group{children.length !== 1 ? 's' : ''}</span>
          {open ? <ChevronDown className={`w-4 h-4 ${meta.textCls}`} /> : <ChevronRight className={`w-4 h-4 ${meta.textCls}`} />}
        </div>
      </div>

      {showDesc && (
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex items-start gap-2 text-sm text-slate-600">
          <Info className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <span>{meta.desc}</span>
        </div>
      )}

      {open && (
        <div className="py-2">
          {children.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-slate-400 text-sm mb-3">No groups yet.</p>
              {onAdd && rootNode && (
                <button onClick={() => onAdd(rootNode, 'group')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition-colors">
                  <Plus className="w-4 h-4" /> Add First Group
                </button>
              )}
            </div>
          ) : (
            children.map(node => (
              <NodeRow key={node.id} node={node} depth={0}
                onToggle={onToggle} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} onMove={onMove} />
            ))
          )}
        </div>
      )}
    </GlassCard>
  )
}

// ── Level-view row (used in flat list for Sub Group / Child Group views) ──────
function LevelRow({ node, path, onEdit, onDelete, onMove, onAdd }: {
  node: HNode; path: string
  onEdit: (node: HNode, name: string) => void
  onDelete?: (node: HNode) => void
  onMove?: (node: HNode) => void
  onAdd?: (parent: HNode, type: 'group' | 'ledger') => void
}) {
  const [editing, setEditing] = useState(false)
  const [editVal, setEditVal] = useState(node.name)
  const isLedger = node.nodeType === 'ledger'
  const hasGroupChildren = node.children.some(c => c.nodeType === 'group')

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 transition-colors group/lrow ${
      isLedger
        ? 'pl-10 bg-emerald-50/40 hover:bg-emerald-50 border-b border-emerald-100/60'
        : 'hover:bg-slate-50 border-b border-slate-100'
    }`}>
      {isLedger
        ? <FileText className="w-4 h-4 text-emerald-500 flex-shrink-0" />
        : <FolderPlus className="w-4 h-4 text-slate-400 flex-shrink-0" />}

      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex items-center gap-2">
            <input autoFocus value={editVal}
              onChange={e => setEditVal(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && editVal.trim()) { onEdit(node, editVal.trim()); setEditing(false) }
                if (e.key === 'Escape') { setEditing(false); setEditVal(node.name) }
              }}
              className="h-7 px-2 text-sm rounded-lg border border-blue-300 bg-white outline-none w-56" />
            <button onClick={() => { if (editVal.trim()) { onEdit(node, editVal.trim()); setEditing(false) } }}
              className="text-emerald-500 hover:text-emerald-600"><Check className="w-3.5 h-3.5" /></button>
            <button onClick={() => { setEditing(false); setEditVal(node.name) }}
              className="text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
          </div>
        ) : (
          <>
            <p className={`text-sm truncate ${isLedger ? 'font-medium text-emerald-800' : 'font-semibold text-slate-800'}`}>{node.name}</p>
            <p className="text-[11px] text-slate-400 truncate">{path}</p>
          </>
        )}
      </div>

      {/* Child / ledger count badge */}
      {!isLedger && node.children.length > 0 && !editing && (
        <span className="text-[10px] text-slate-400 flex-shrink-0">
          {node.children.filter(c => c.nodeType === 'group').length > 0 && `${node.children.filter(c => c.nodeType === 'group').length} grp`}
          {node.children.filter(c => c.nodeType === 'ledger').length > 0 && ` · ${node.children.filter(c => c.nodeType === 'ledger').length} ledger`}
        </span>
      )}

      {!editing && (
        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover/lrow:opacity-100 transition-opacity">
          {/* Group actions */}
          {!isLedger && onAdd && (
            <>
              <button onClick={() => onAdd(node, 'group')}
                className="flex items-center gap-0.5 px-2 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                <Plus className="w-3 h-3" /> Add
              </button>
              <button onClick={() => onAdd(node, 'ledger')}
                className="flex items-center gap-0.5 px-2 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">
                <Plus className="w-3 h-3" /> Ledger
              </button>
            </>
          )}
          {/* Move — ledgers only */}
          {isLedger && node.id > 0 && onMove && (
            <button onClick={() => onMove(node)}
              className="flex items-center gap-0.5 px-2 py-1 rounded-lg text-xs font-semibold border border-indigo-300 text-indigo-600 hover:bg-indigo-50 transition-colors">
              <ArrowRightLeft className="w-3 h-3" /> Move
            </button>
          )}
          {/* Edit */}
          <button onClick={() => { setEditing(true); setEditVal(node.name) }}
            className="flex items-center gap-0.5 px-2 py-1 rounded-lg text-xs font-semibold text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors">
            <Pencil className="w-3 h-3" /> Edit
          </button>
          {/* Delete — only leaf nodes */}
          {!hasGroupChildren && onDelete && (
            <button onClick={() => onDelete(node)}
              className="flex items-center gap-0.5 px-2 py-1 rounded-lg text-xs font-semibold text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
              <Trash2 className="w-3 h-3" /> Delete
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function GroupPage({ defaultTab: _ignored, viewLevel }: { defaultTab?: string; viewLevel?: number }) {
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()
  const jumpNodeId = searchParams.get('nodeId') ? Number(searchParams.get('nodeId')) : null

  const userId  = localStorage.getItem('user_id') ?? ''
  const entryBy = localStorage.getItem('usr_nm') ?? ''
  const qParams = {
    role_type: localStorage.getItem('role_type') ?? '1',
    district_id: localStorage.getItem('district_id') ?? '1',
  }

  // ── Data ──────────────────────────────────────────────────
  const { data: mastersRes }   = useQuery({ queryKey: ['gm-masters'],   queryFn: () => accountingService.getMastersAdd(qParams) })
  const { data: groupsRes }    = useQuery({ queryKey: ['gm-groups'],    queryFn: () => accountingService.getMastersGroup(qParams) })
  const { data: subgroupsRes } = useQuery({ queryKey: ['gm-subgroups'], queryFn: () => accountingService.getMainMastersSubgroup() })
  const { data: childrenRes }  = useQuery({ queryKey: ['gm-children'],  queryFn: () => accountingService.getMainMastersSubchild() })
  const { data: ledgersRes }   = useQuery({ queryKey: ['gm-ledgers'],   queryFn: () => accountingService.getLedgerData(qParams) })

  const isLoading = !mastersRes || !groupsRes || !subgroupsRes || !childrenRes || !ledgersRes

  // ── Expansion state ───────────────────────────────────────
  const expandedIds = useRef(new Set<number>())
  const [, setRenderTick] = useState(0)
  const [allExpanded, setAllExpanded] = useState(false)

  // ── Modal state ───────────────────────────────────────────
  const [addModal, setAddModal]         = useState<{ parent: HNode; type: 'group' | 'ledger' } | null>(null)
  const [addName, setAddName]           = useState('')
  const [queuedLedgers, setQueuedLedgers] = useState<string[]>([])
  const [moveModal, setMoveModal]       = useState<HNode | null>(null)
  const [moveSearch, setMoveSearch]     = useState('')
  const [moveTarget, setMoveTarget]     = useState<HNode | null>(null)

  const mastersList   = mastersRes?.data   ?? []
  const groupsList    = groupsRes?.data    ?? []
  const subgroupsList = subgroupsRes?.data ?? []
  const childrenList  = childrenRes?.data  ?? []
  const ledgerList    = ledgersRes?.data   ?? []

  // ── Build hierarchy ───────────────────────────────────────
  const sectionRoots = useMemo<Record<string, HNode>>(() => {
    if (isLoading) return {}
    const roots: HNode[] = mastersList.map((m: any) => {
      const root: HNode = {
        id: m.id, name: m.districtnm, level: 1, parentId: null,
        children: [], nodeType: 'group', expanded: expandedIds.current.has(m.id),
        staticname: m.districtnm, district_id: String(m.id),
      }

      groupsList.filter((g: any) => g.district_id == m.id).forEach((g: any) => {
        const n2: HNode = {
          id: g.id, name: g.mandal_name, level: 2, parentId: root.id,
          children: [], nodeType: 'group', expanded: expandedIds.current.has(g.id),
          staticname: root.staticname, district_id: String(g.district_id),
          mandal_id: String(g.id), mandal_name: g.mandal_name,
        }
        root.children.push(n2)

        subgroupsList.filter((sg: any) => sg.district_id == m.id && sg.mandal_id == g.id).forEach((sg: any) => {
          const n3: HNode = {
            id: sg.id, name: sg.village_name, level: 3, parentId: n2.id,
            children: [], nodeType: 'group', expanded: expandedIds.current.has(sg.id),
            staticname: root.staticname, district_id: n2.district_id,
            mandal_id: n2.mandal_id, mandal_name: n2.mandal_name,
            village_id: sg.id, child: sg.village_name,
          }
          n2.children.push(n3)

          childrenList.filter((c: any) =>
            c.parent_subgroup_id == sg.id && !c.self_parent_id && Number(c.level_depth) === 4
          ).forEach((c: any) => {
            const n4: HNode = {
              id: c.id, name: c.temple_name, level: 4, parentId: n3.id,
              children: [], nodeType: 'group', expanded: expandedIds.current.has(c.id),
              staticname: root.staticname, district_id: n3.district_id,
              mandal_id: n3.mandal_id, mandal_name: n3.mandal_name,
              village_id: n3.village_id, child: n3.child, subchildtwo: c.temple_name,
            }
            n3.children.push(n4)
            attachLedgers(n4, ledgerList, expandedIds.current)
          })
          attachLedgers(n3, ledgerList, expandedIds.current)
        })
        attachLedgers(n2, ledgerList, expandedIds.current)
      })
      attachLedgers(root, ledgerList, expandedIds.current)
      return root
    })

    const result: Record<string, HNode> = {}
    for (const sec of SECTIONS) {
      const r = roots.find(r => r.district_id === sec.key)
      if (r) result[sec.key] = r
    }
    return result
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mastersList, groupsList, subgroupsList, childrenList, ledgerList, isLoading])

  // ── Jump to a node: expand its ancestor path + scroll + highlight ────────────
  // Matches on `${nodeType}-${id}` since group ids and ledger ids come from
  // different DB tables and can collide.
  const jumpToNodeId = useCallback((targetId: number, targetType: 'group' | 'ledger' = 'group') => {
    const expandPath = (nodes: HNode[]): boolean => {
      for (const n of nodes) {
        if ((n.id === targetId && n.nodeType === targetType) || expandPath(n.children)) {
          n.expanded = true
          expandedIds.current.add(n.id)
          return true
        }
      }
      return false
    }

    for (const sec of SECTIONS) {
      const root = sectionRoots[sec.key]
      if (root) expandPath([root])
    }
    setRenderTick(t => t + 1)

    const timer = setTimeout(() => {
      const el = document.getElementById(`gp-node-${targetId}`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el?.classList.add('ring-2', 'ring-teal-400', 'ring-offset-1')
      setTimeout(() => el?.classList.remove('ring-2', 'ring-teal-400', 'ring-offset-1'), 1500)
    }, 120)

    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionRoots])

  // ── Auto-expand + scroll when arriving from sidebar link ─────────────────────
  useEffect(() => {
    if (isLoading || !jumpNodeId) return
    return jumpToNodeId(jumpNodeId, 'group')
  // Run once when data loads or jump target changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, jumpNodeId])

  // ── Quick Jump search ──────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  const allSearchItems = useMemo<FlatGroup[]>(() => {
    const out: FlatGroup[] = []
    for (const sec of SECTIONS) {
      const root = sectionRoots[sec.key]
      if (root) flattenSearchItems(root.children, sec.label, out)
    }
    return out
  }, [sectionRoots])

  const filteredSearchItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return []
    return allSearchItems
      .filter(item => item.node.name.toLowerCase().includes(q) || item.path.toLowerCase().includes(q))
      .slice(0, 25)
  }, [allSearchItems, searchQuery])

  const jumpToSearchResult = (item: FlatGroup) => {
    setSearchQuery('')
    setSearchOpen(false)
    jumpToNodeId(item.node.id, item.node.nodeType)
  }

  // ── Flat list for level-specific view (Main Group / Sub Group / Child Group) ──
  const levelNodes = useMemo<{ node: HNode; path: string; ledgers: HNode[] }[]>(() => {
    if (!viewLevel || isLoading) return []
    const result: { node: HNode; path: string; ledgers: HNode[] }[] = []
    const collect = (n: HNode, breadcrumb: string) => {
      if (n.nodeType === 'ledger') return
      if (n.level === viewLevel) {
        result.push({ node: n, path: breadcrumb, ledgers: n.children.filter(c => c.nodeType === 'ledger') })
        return
      }
      if (n.level < viewLevel) n.children.forEach(c => collect(c, breadcrumb ? `${breadcrumb} › ${n.name}` : n.name))
    }
    for (const sec of SECTIONS) {
      const root = sectionRoots[sec.key]
      if (root) root.children.forEach(c => collect(c, sec.label))
    }
    return result
  }, [sectionRoots, viewLevel, isLoading])

  // ── Flat group list for move modal ────────────────────────
  const allFlatGroups = useMemo<FlatGroup[]>(() => {
    const out: FlatGroup[] = []
    for (const sec of SECTIONS) {
      const root = sectionRoots[sec.key]
      if (root) flattenGroups(root.children, sec.label, out)
    }
    return out
  }, [sectionRoots])

  const filteredGroups = useMemo(() => {
    const q = moveSearch.toLowerCase().trim()
    return allFlatGroups.filter(fg => fg.node.level > 1 && (!q || fg.path.toLowerCase().includes(q)))
  }, [allFlatGroups, moveSearch])

  // ── Invalidate all hierarchy caches (group mgmt + balance sheet + group wise) ──
  const invalidateAll = () => {
    ['gm-masters','gm-groups','gm-subgroups','gm-children','gm-ledgers',
     'bs-masters','bs-groups','bs-subgroups','bs-children','bs-ledgers',
     'gw-masters','gw-groups','gw-subgroups','gw-children','gw-ledgers'].forEach(k =>
      qc.invalidateQueries({ queryKey: [k] })
    )
  }

  // ── Toggle expand ─────────────────────────────────────────
  const toggleNode = (node: HNode) => {
    node.expanded = !node.expanded
    if (node.expanded) expandedIds.current.add(node.id)
    else expandedIds.current.delete(node.id)
    setRenderTick(t => t + 1)
  }

  const handleExpandAll = () => {
    const next = !allExpanded
    setAllExpanded(next)
    const traverse = (n: HNode) => {
      n.expanded = next
      next ? expandedIds.current.add(n.id) : expandedIds.current.delete(n.id)
      n.children.forEach(traverse)
    }
    for (const sec of SECTIONS) {
      const root = sectionRoots[sec.key]
      if (root) traverse(root)
    }
    setRenderTick(t => t + 1)
  }

  // ── Add mutation ──────────────────────────────────────────
  const { mutate: addNode } = useMutation({
    mutationFn: async ({ parent, type, name }: { parent: HNode; type: 'group' | 'ledger'; name: string }) => {
      if (type === 'ledger') {
        let pgLevel = 2, psgId: any = null, pscId: any = null
        if (parent.level >= 4) { pgLevel = 4; psgId = parent.village_id ?? null; pscId = parent.id }
        else if (parent.level === 3) { pgLevel = 3; psgId = parent.id }
        return accountingService.addLedgerData({
          temple_name: name, amount: 0, parent_level: pgLevel,
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
    onSuccess: (res: any) => { if (res?.status === 200) { toast.success('Added!'); invalidateAll() } else toast.error('Failed') },
    onError: () => toast.error('Server error'),
  })

  // ── Edit mutation ─────────────────────────────────────────
  const { mutate: editNode } = useMutation({
    mutationFn: ({ node, newName }: { node: HNode; newName: string }) =>
      node.nodeType === 'ledger'
        ? accountingService.updateLedgerName({ ...node, id: node.id, temple_name: newName })
        : accountingService.updateGroupName({ ...node, id: node.id, editname: newName }),
    onSuccess: (res: any) => { if (res?.status === 200) { toast.success('Updated!'); invalidateAll() } else toast.error('Failed') },
    onError: () => toast.error('Server error'),
  })

  // ── Delete mutation ───────────────────────────────────────
  const { mutate: deleteNode } = useMutation({
    mutationFn: (node: HNode) =>
      node.nodeType === 'ledger'
        ? accountingService.deleteLedger({ ...node, id: node.id })
        : accountingService.deleteGroup({ ...node, id: node.id }),
    onSuccess: (res: any) => { if (res?.status === 200) { toast.success('Deleted!'); invalidateAll() } else toast.error('Cannot delete — may have children or transactions') },
    onError: () => toast.error('Server error'),
  })

  // ── Move ledger mutation ──────────────────────────────────
  const { mutate: moveLedger, isPending: moving } = useMutation({
    mutationFn: ({ ledger, target }: { ledger: HNode; target: HNode }) =>
      accountingService.moveLedger({
        id: ledger.id,
        district_id: target.district_id,
        staticname: target.staticname,
        mandal_id: target.level >= 2 ? target.mandal_id : null,
        mandal_name: target.level >= 2 ? target.mandal_name : '',
        village_id: target.level >= 3 ? target.village_id : null,
        parent_subgroup_id: target.level >= 3 ? target.village_id : null,
        child: target.level >= 3 ? target.child : '',
        parent_subchild_id: target.level >= 4 ? target.id : null,
        subchildtwo: target.level >= 4 ? target.name : '',
        parent_grp_level: target.level,
      }),
    onSuccess: (res: any) => {
      if (res?.status === 200) {
        toast.success('Ledger moved!')
        setMoveModal(null); setMoveTarget(null); setMoveSearch('')
        invalidateAll()
      } else toast.error('Move failed')
    },
    onError: () => toast.error('Server error'),
  })

  // ── Add modal helpers ─────────────────────────────────────
  const openAdd = (parent: HNode, type: 'group' | 'ledger') => {
    setAddModal({ parent, type }); setAddName(''); setQueuedLedgers([])
  }

  const queueCurrent = () => {
    const name = addName.trim()
    if (!name || queuedLedgers.includes(name)) return
    setQueuedLedgers(q => [...q, name]); setAddName('')
  }

  const handleModalAdd = async () => {
    if (!addModal) return
    if (addModal.type === 'group') {
      if (!addName.trim()) return
      addNode({ parent: addModal.parent, type: 'group', name: addName.trim() }, {
        onSuccess: (res: any) => { if (res?.status === 200) { setAddModal(null); setAddName('') } },
      })
      return
    }
    const names = [...new Set([...queuedLedgers, ...(addName.trim() ? [addName.trim()] : [])])]
    if (!names.length) return
    setQueuedLedgers([]); setAddName('')
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

  // ── Render ────────────────────────────────────────────────
  // ── Level-specific titles ─────────────────────────────────
  const LEVEL_META: Record<number, { title: string; subtitle: string; addLabel: string }> = {
    2: { title: 'Main Groups',   subtitle: 'Top-level accounting groups under each section (Assets, Liabilities, Income, Expenses).', addLabel: 'Main Group' },
    3: { title: 'Sub Groups',    subtitle: 'Second-level groups nested inside each Main Group.',                                       addLabel: 'Sub Group' },
    4: { title: 'Child Groups',  subtitle: 'Third-level groups nested inside each Sub Group.',                                         addLabel: 'Child Group' },
    5: { title: 'Sub Child Two', subtitle: 'Deepest group level — nested inside Child Groups.',                                        addLabel: 'Sub Child' },
  }
  const levelMeta = viewLevel ? LEVEL_META[viewLevel] : null

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <PageHeader
        title={levelMeta ? levelMeta.title : 'Group Management'}
        subtitle={levelMeta ? levelMeta.subtitle : 'Manage your full accounting hierarchy. Changes sync instantly with Balance Sheet and P&L.'}
      />

      {/* ── LEVEL VIEW (flat list when navigated via sidebar link) ─────────── */}
      {viewLevel ? (
        isLoading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />)}
          </div>
        ) : levelNodes.length === 0 ? (
          <GlassCard className="p-10 text-center text-slate-400 text-sm">
            No {levelMeta?.title ?? 'items'} found. Add them from the Group Management tree.
          </GlassCard>
        ) : (
          <GlassCard className="overflow-hidden">
            {levelNodes.map(({ node, path, ledgers }) => (
              <div key={node.id}>
                {/* Group row */}
                <LevelRow
                  node={node}
                  path={path}
                  onEdit={(n, name) => editNode({ node: n, newName: name })}
                  onDelete={node => deleteNode(node)}
                  onMove={node => { setMoveModal(node); setMoveSearch(''); setMoveTarget(null) }}
                  onAdd={openAdd}
                />
                {/* Ledgers directly attached to this group */}
                {ledgers.map(ledger => (
                  <LevelRow
                    key={ledger.id}
                    node={ledger}
                    path={`${path} › ${node.name}`}
                    onEdit={(n, name) => editNode({ node: n, newName: name })}
                    onDelete={n => deleteNode(n)}
                    onMove={n => { setMoveModal(n); setMoveSearch(''); setMoveTarget(null) }}
                  />
                ))}
              </div>
            ))}
          </GlassCard>
        )
      ) : (
        /* ── FULL TREE VIEW (default) ──────────────────────────────────────── */
        <>
          {/* Toolbar */}
          <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm flex-wrap">
            <button onClick={handleExpandAll}
              className="flex items-center gap-2 h-9 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex-shrink-0">
              {allExpanded ? <><ChevronsDownUp className="w-4 h-4" /> Collapse All</> : <><ChevronsUpDown className="w-4 h-4" /> Expand All</>}
            </button>
            <div className="h-5 w-px bg-slate-200 flex-shrink-0" />
            <div className="flex items-center gap-4 flex-wrap text-xs text-slate-500 flex-shrink-0">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-400 inline-block" /> Main Group</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-violet-500 inline-block" /> Sub Group</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-sky-400 inline-block" /> Child Group</span>
              <span className="flex items-center gap-1.5"><FileText className="w-3 h-3 text-emerald-500" /> Ledger</span>
            </div>

            {/* Quick Jump search */}
            <div ref={searchRef} className="relative ml-auto min-w-[240px] flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Jump to a group or ledger…"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true) }}
                onFocus={() => setSearchOpen(true)}
                className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder:text-slate-400"
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setSearchOpen(false) }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              <AnimatePresence>
                {searchOpen && filteredSearchItems.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="absolute z-50 left-0 right-0 top-full mt-1 bg-white rounded-2xl border border-slate-200 shadow-2xl max-h-80 overflow-y-auto"
                  >
                    <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                        {filteredSearchItems.length} result{filteredSearchItems.length !== 1 ? 's' : ''}
                      </span>
                      <span className="text-[11px] text-slate-400">Click to jump directly</span>
                    </div>
                    {filteredSearchItems.map((item, idx) => (
                      <button
                        key={idx}
                        onMouseDown={e => { e.preventDefault(); jumpToSearchResult(item) }}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0 flex items-start gap-3"
                      >
                        <div className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${item.node.nodeType === 'ledger' ? 'bg-emerald-100' : 'bg-blue-100'}`}>
                          {item.node.nodeType === 'ledger'
                            ? <FileText className="w-3.5 h-3.5 text-emerald-600" />
                            : <FolderPlus className="w-3.5 h-3.5 text-blue-600" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{item.node.name}</p>
                          {item.path && <p className="text-xs text-slate-400 truncate mt-0.5">{item.path}</p>}
                        </div>
                        <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${item.node.nodeType === 'ledger' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                          {item.node.nodeType === 'ledger' ? 'Ledger' : LEVEL_LABELS[item.node.level] || 'Group'}
                        </span>
                      </button>
                    ))}
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

          {/* Sections */}
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-2xl bg-slate-100 animate-pulse" />)}
            </div>
          ) : (
            SECTIONS.map(sec => {
              const root = sectionRoots[sec.key]
              if (!root) return null
              return (
                <SectionCard
                  key={sec.key}
                  meta={sec}
                  children={root.children}
                  rootNode={root}
                  onToggle={toggleNode}
                  onAdd={openAdd}
                  onEdit={(node, newName) => editNode({ node, newName })}
                  onDelete={node => deleteNode(node)}
                  onMove={node => { setMoveModal(node); setMoveSearch(''); setMoveTarget(null) }}
                />
              )
            })
          )}
        </>
      )}

      {/* ── Add Modal ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {addModal && (() => {
          const newLevel = addModal.parent.level + 1
          const levelName = addModal.type === 'ledger' ? 'Ledger'
            : newLevel === 2 ? 'Main Group' : newLevel === 3 ? 'Sub Group' : newLevel === 4 ? 'Child Group' : 'Sub Child'
          const grad = addModal.type === 'ledger' ? MODAL_GRAD.ledger : MODAL_GRAD[String(newLevel)] ?? MODAL_GRAD.default
          return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
                className="bg-white rounded-2xl max-w-md w-full shadow-2xl mx-4 overflow-hidden">

                <div className={`bg-gradient-to-r ${grad} px-6 py-4 flex items-center justify-between`}>
                  <div className="flex items-center gap-2.5 text-white">
                    <Plus className="w-5 h-5" />
                    <span className="font-bold text-lg">Add {levelName}</span>
                  </div>
                  <button onClick={() => setAddModal(null)} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-6 space-y-4">
                  <div className="flex items-start gap-2 text-sm text-slate-600">
                    <Info className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
                    <span>Adding under: <span className="font-bold text-slate-900">{addModal.parent.name}</span></span>
                  </div>

                  {/* Path breadcrumb */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-500 leading-relaxed">
                    {buildPath(addModal.parent, addModal.type).split(' → ').map((part, i, arr) => (
                      <span key={i}>
                        {i > 0 && <span className="mx-1 text-slate-300">→</span>}
                        {i === arr.length - 1
                          ? <span className={`inline-block px-2 py-0.5 rounded-full text-white text-[11px] font-bold bg-gradient-to-r ${grad}`}>{part}</span>
                          : <span className="text-slate-600">{part}</span>}
                      </span>
                    ))}
                  </div>

                  <div>
                    <Label>{levelName} Name <span className="text-red-500">*</span></Label>
                    <div className="flex gap-2 mt-1">
                      <Input autoFocus placeholder={`Enter ${levelName.toLowerCase()} name`}
                        value={addName} onChange={e => setAddName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') { if (addModal.type === 'ledger') queueCurrent(); else handleModalAdd() }
                        }} />
                      {addModal.type === 'ledger' && (
                        <button onClick={queueCurrent} disabled={!addName.trim()}
                          className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40 transition-colors"
                          title="Add to list">
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {addModal.type === 'ledger' && (
                      <p className="text-xs text-slate-400 mt-1">
                        Press <kbd className="px-1 py-0.5 bg-slate-100 rounded font-mono text-[10px]">Enter</kbd> or <kbd className="px-1 py-0.5 bg-slate-100 rounded font-mono text-[10px]">+</kbd> to queue multiple ledgers at once.
                      </p>
                    )}
                  </div>

                  {addModal.type === 'ledger' && queuedLedgers.length > 0 && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase">
                        Ledgers to add ({queuedLedgers.length})
                      </div>
                      {queuedLedgers.map((name, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-2 border-t border-slate-100">
                          <FileText className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          <span className="flex-1 text-sm text-slate-700">{name}</span>
                          <button onClick={() => setQueuedLedgers(q => q.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-red-400">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-1">
                    <Button variant="ghost" onClick={() => setAddModal(null)}>Cancel</Button>
                    <Button onClick={handleModalAdd}
                      disabled={addModal.type === 'ledger' ? (queuedLedgers.length === 0 && !addName.trim()) : !addName.trim()}
                      className={`bg-gradient-to-r ${grad} border-0 text-white`}>
                      <Plus className="w-4 h-4" />
                      {addModal.type === 'ledger' && queuedLedgers.length > 0
                        ? `Add ${queuedLedgers.length + (addName.trim() ? 1 : 0)} Ledgers`
                        : `Add ${levelName}`}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )
        })()}
      </AnimatePresence>

      {/* ── Move Ledger Modal ───────────────────────────────────────── */}
      <AnimatePresence>
        {moveModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl max-w-lg w-full shadow-2xl mx-4 overflow-hidden">

              <div className="bg-gradient-to-r from-indigo-500 to-violet-600 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-white">
                  <ArrowRightLeft className="w-5 h-5" />
                  <span className="font-bold text-lg">Move Ledger</span>
                </div>
                <button onClick={() => setMoveModal(null)} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
              </div>

              <div className="p-6 space-y-4">
                {/* Ledger being moved */}
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                  <div>
                    <span className="text-sm font-bold text-indigo-800">{moveModal.name}</span>
                    <span className="text-xs text-indigo-500 ml-2">— select a new parent group below</span>
                  </div>
                </div>

                {/* Search */}
                <div>
                  <Label>Move to Group</Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input value={moveSearch} onChange={e => { setMoveSearch(e.target.value); setMoveTarget(null) }}
                      placeholder="Search groups…"
                      className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-300" />
                  </div>
                  <div className="mt-2 border border-slate-200 rounded-xl max-h-56 overflow-y-auto">
                    {filteredGroups.length === 0 ? (
                      <div className="px-4 py-6 text-center text-slate-400 text-sm">No matching groups</div>
                    ) : (
                      filteredGroups.map((fg, i) => (
                        <button key={i} type="button"
                          onClick={() => setMoveTarget(fg.node)}
                          className={`w-full px-4 py-2.5 text-left hover:bg-indigo-50 transition-colors border-b border-slate-100 last:border-0 ${moveTarget?.id === fg.node.id ? 'bg-indigo-100' : ''}`}>
                          <div className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${LEVEL_COLORS[fg.node.level] ?? 'bg-slate-400'}`} />
                            {fg.node.name}
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                              {LEVEL_LABELS[fg.node.level] || 'Group'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5 pl-3.5">{fg.path}</div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {moveTarget && (
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-sm text-emerald-700">
                    <Check className="w-4 h-4 flex-shrink-0" />
                    <span>Will move to: <span className="font-bold">{moveTarget.name}</span></span>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-1">
                  <Button variant="ghost" onClick={() => setMoveModal(null)}>Cancel</Button>
                  <Button disabled={!moveTarget || moving}
                    onClick={() => moveTarget && moveLedger({ ledger: moveModal, target: moveTarget })}
                    className="bg-gradient-to-r from-indigo-500 to-violet-600 border-0 text-white">
                    <ArrowRightLeft className="w-4 h-4" />
                    {moving ? 'Moving…' : 'Move Ledger'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Attach ledgers to a node (module-level helper) ────────────────────────────
function attachLedgers(node: HNode, ledgerList: any[], expandedSet: Set<number>): void {
  const did = String(node.district_id ?? '')
  const mid = String(node.mandal_id ?? '')
  const vid = Number(node.village_id ?? 0)

  let applicable: any[]
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

  const seen = new Set(node.children.filter(c => c.nodeType === 'ledger').map(c => c.name))
  for (const l of applicable) {
    if (seen.has(l.temple_name)) continue
    const lid = Number(l.id ?? l.ledger_id)
    node.children.push({
      id: lid, name: l.temple_name,
      level: node.level + 1, parentId: node.id,
      children: [], nodeType: 'ledger', expanded: expandedSet.has(lid),
      staticname: node.staticname, district_id: node.district_id,
      mandal_id: node.mandal_id, village_id: node.village_id,
      parent_subgroup_id: l.parent_subgroup_id, parent_subchild_id: l.parent_subchild_id,
      parent_grp_level: l.parent_grp_level,
    })
    seen.add(l.temple_name)
  }
}
