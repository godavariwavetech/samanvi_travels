import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronDown, FileDown, FileText, BarChart3, Search, X, Layers, BookOpen, ExternalLink, Receipt } from 'lucide-react'
import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { GlassCard, Button, Input, Label, PageHeader } from '@/components/shared'
import { accountingService } from '@/services/accounting.service'
import { useFYStore } from '@/store/fy.store'

// ── Types ────────────────────────────────────────────────────────────────────
interface GWNode {
  id: number
  name: string
  level: number
  parentId: number | null
  amount: number
  totalAmount: number
  children: GWNode[]
  nodeType: 'group' | 'ledger'
  district_id: string
  mandal_id?: string
  village_id?: number
  tableKey: string     // e.g. "master_groups_7"
}

interface DropdownOption {
  id: string | number
  name: string
  node: GWNode | null
  isAll: boolean
}

interface TableRow {
  id: number
  name: string
  type: 'Group' | 'Ledger'
  total: number
}

interface SearchItem {
  node: GWNode
  label: string
  path: string       // "Assets > Current Assets > Bank Accounts"
  sectionKey: string
  ancestors: GWNode[]  // from section root down, NOT including the node itself
}

const SECTIONS = [
  { key: 'ASSETS',      label: 'Assets',                district_id: '1' },
  { key: 'EQUITY_LIAB', label: 'Equities & Liabilities', district_id: '2' },
  { key: 'INCOME',      label: 'Income',                 district_id: '3' },
  { key: 'EXPENSES',    label: 'Expenses',               district_id: '4' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function calcTotals(node: GWNode): number {
  if (node.nodeType === 'ledger') { node.totalAmount = node.amount; return node.totalAmount }
  node.totalAmount = node.children.reduce((s, c) => s + calcTotals(c), 0)
  return node.totalAmount
}

function parseTxAmt(r: any): number {
  const raw = Math.abs(Number(r.amount ?? r.debit_amount ?? r.credit_amount ?? 0))
  if (!raw || isNaN(raw)) return 0
  const did = String(r.district_id ?? r.districtid ?? '').trim()
  const acct = String(r.account_type ?? r.amount_type ?? '').trim().toUpperCase()
  if (did === '3') return acct === 'CREDIT ACCOUNT' ? raw : acct === 'DEBIT ACCOUNT' ? -raw : 0
  if (did === '4') return acct === 'DEBIT ACCOUNT' ? raw : acct === 'CREDIT ACCOUNT' ? -raw : 0
  if (did === '1') return acct === 'DEBIT ACCOUNT' ? raw : acct === 'CREDIT ACCOUNT' ? -raw : 0
  if (did === '2') return acct === 'CREDIT ACCOUNT' ? raw : acct === 'DEBIT ACCOUNT' ? -raw : 0
  return 0
}

function fmtAmt(n: number): string {
  return Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ── Main ──────────────────────────────────────────────────────────────────────
const today = new Date().toISOString().split('T')[0]

export default function GroupWisePage() {
  const navigate = useNavigate()
  const { selectedFY } = useFYStore()
  const userId = localStorage.getItem('user_id') ?? ''
  const roleDistrictPayload = {
    role_type: localStorage.getItem('role_type') ?? '1',
    district_id: localStorage.getItem('district_id') ?? '1',
  }

  const [filter, setFilter] = useState({
    fromdate: selectedFY.fromDate,
    todate: selectedFY.toDate,
  })
  const [applied, setApplied] = useState(filter)

  // ── Data queries (same sources as Balance Sheet) ──────────────────────────
  const { data: mastersRes, isLoading: l1 }   = useQuery({ queryKey: ['gw-masters'],   queryFn: () => accountingService.getMastersAdd(roleDistrictPayload) })
  const { data: groupsRes, isLoading: l2 }    = useQuery({ queryKey: ['gw-groups'],    queryFn: () => accountingService.getMastersGroup(roleDistrictPayload) })
  const { data: subgroupsRes, isLoading: l3 } = useQuery({ queryKey: ['gw-subgroups'], queryFn: () => accountingService.getMainMastersSubgroup() })
  const { data: childrenRes, isLoading: l4 }  = useQuery({ queryKey: ['gw-children'],  queryFn: () => accountingService.getMainMastersSubchild() })
  const { data: ledgersRes, isLoading: l5 }   = useQuery({ queryKey: ['gw-ledgers'],   queryFn: () => accountingService.getLedgerData(roleDistrictPayload) })
  const { data: txRes, isLoading: l6 }        = useQuery({
    queryKey: ['gw-transactions', applied],
    queryFn: () => accountingService.getTransactionsReport({
      fromdate: applied.fromdate,
      todate: applied.todate,
      ledger_name: '',
      ledger_id: null,
      user_id: userId,
    }),
  })

  const isLoading = l1 || l2 || l3 || l4 || l5 || l6

  // ── Build ledger_id → net amount map ─────────────────────────────────────
  const amountMap = useMemo(() => {
    const map = new Map<number, number>()
    if (!txRes?.data) return map
    const allData = txRes.data
    const arrays: any[][] = (Array.isArray(allData) ? allData : Object.values(allData)).filter(v => Array.isArray(v)) as any[][]
    for (const arr of arrays) {
      for (const r of arr) {
        const amt = parseTxAmt(r)
        if (!amt) continue
        const lid = Number(r.ledger_id ?? r.ledgerid ?? r.ledgerId ?? NaN)
        if (!isNaN(lid)) map.set(lid, (map.get(lid) ?? 0) + amt)
      }
    }
    return map
  }, [txRes])

  // ── Build complete hierarchy ──────────────────────────────────────────────
  const { roots, sectionMap } = useMemo(() => {
    const mastersList:   any[] = mastersRes?.data   ?? []
    const groupsList:    any[] = groupsRes?.data    ?? []
    const subgroupsList: any[] = subgroupsRes?.data ?? []
    const childrenList:  any[] = childrenRes?.data  ?? []
    const ledgerList:    any[] = ledgersRes?.data   ?? []

    if (!mastersList.length) return { roots: [], sectionMap: new Map<string, GWNode[]>() }

    // keyed lookup: "master_groups_{id}" etc.
    const nodeByKey = new Map<string, GWNode>()

    const allRoots: GWNode[] = mastersList.map((m: any) => {
      const root: GWNode = {
        id: m.id, name: m.districtnm, level: 1, parentId: null,
        amount: 0, totalAmount: 0, children: [], nodeType: 'group',
        district_id: String(m.id),
        tableKey: `masters_${m.id}`,
      }
      nodeByKey.set(root.tableKey, root)
      return root
    })

    // Level 2 groups
    for (const g of groupsList) {
      const parent = nodeByKey.get(`masters_${g.district_id}`)
      if (!parent) continue
      const n: GWNode = {
        id: g.id, name: g.mandal_name, level: 2, parentId: parent.id,
        amount: 0, totalAmount: 0, children: [], nodeType: 'group',
        district_id: parent.district_id, mandal_id: String(g.id),
        tableKey: `master_groups_${g.id}`,
      }
      parent.children.push(n)
      nodeByKey.set(n.tableKey, n)
    }

    // Level 3 subgroups
    for (const sg of subgroupsList) {
      const parent = nodeByKey.get(`master_groups_${sg.mandal_id}`)
      if (!parent) continue
      const n: GWNode = {
        id: sg.id, name: sg.village_name, level: 3, parentId: parent.id,
        amount: 0, totalAmount: 0, children: [], nodeType: 'group',
        district_id: parent.district_id, mandal_id: parent.mandal_id, village_id: sg.id,
        tableKey: `sub_groups_${sg.id}`,
      }
      parent.children.push(n)
      nodeByKey.set(n.tableKey, n)
    }

    // Level 4+ child groups (recursive via self_parent_id chain)
    // First pass: direct children of sub_groups
    const pendingChildren = [...childrenList]
    let maxPasses = 10
    while (pendingChildren.length > 0 && maxPasses-- > 0) {
      let resolved = 0
      for (let i = pendingChildren.length - 1; i >= 0; i--) {
        const c = pendingChildren[i]
        // Find parent: self_parent_id → child group, else parent_subgroup_id → sub_group
        const parentKey = c.self_parent_id
          ? `child_${c.self_parent_id}`
          : `sub_groups_${c.parent_subgroup_id}`
        const parent = nodeByKey.get(parentKey)
        if (!parent) continue
        const n: GWNode = {
          id: c.id, name: c.temple_name, level: parent.level + 1, parentId: parent.id,
          amount: 0, totalAmount: 0, children: [], nodeType: 'group',
          district_id: parent.district_id, mandal_id: parent.mandal_id, village_id: parent.village_id,
          tableKey: `child_${c.id}`,
        }
        parent.children.push(n)
        nodeByKey.set(n.tableKey, n)
        pendingChildren.splice(i, 1)
        resolved++
      }
      if (resolved === 0) break
    }

    // Attach ledgers
    for (const led of ledgerList) {
      const parentKey = led.sub_child_two_id
        ? `child_${led.sub_child_two_id}`
        : led.parent_subchild_id
        ? `child_${led.parent_subchild_id}`
        : led.village_id
        ? `sub_groups_${led.village_id}`
        : `master_groups_${led.mandal_id}`
      const parent = nodeByKey.get(parentKey)
      if (!parent) continue
      const net = amountMap.get(Number(led.id)) ?? 0
      const n: GWNode = {
        id: led.id, name: led.temple_name, level: parent.level + 1, parentId: parent.id,
        amount: net, totalAmount: net, children: [], nodeType: 'ledger',
        district_id: parent.district_id, mandal_id: parent.mandal_id, village_id: parent.village_id,
        tableKey: `ledgers_${led.id}`,
      }
      parent.children.push(n)
    }

    // Calculate totals
    allRoots.forEach(r => calcTotals(r))

    // Inject Reserve & Surplus into Equities & Liabilities
    const incomeRoots  = allRoots.filter(r => r.district_id === '3')
    const expenseRoots = allRoots.filter(r => r.district_id === '4')
    const totalIncome  = incomeRoots.reduce((s, r) => s + r.totalAmount, 0)
    const totalExpenses = expenseRoots.reduce((s, r) => s + r.totalAmount, 0)
    const netPL = totalIncome - totalExpenses

    const liabRoot = allRoots.find(r => r.district_id === '2')
    if (liabRoot && netPL !== 0) {
      let capitalGroup = liabRoot.children.find(c => c.name.toLowerCase().includes('capital'))
      if (!capitalGroup) {
        capitalGroup = {
          id: -997, name: 'Capital', level: 2, parentId: liabRoot.id,
          amount: 0, totalAmount: 0, children: [], nodeType: 'group',
          district_id: '2', tableKey: 'virtual_capital',
        }
        liabRoot.children.push(capitalGroup)
      }
      // Remove old virtual RS
      capitalGroup.children = capitalGroup.children.filter(c => c.id !== -999)
      capitalGroup.children.push({
        id: -999, name: 'Reserve & Surplus (P&L)', level: capitalGroup.level + 1, parentId: capitalGroup.id,
        amount: netPL, totalAmount: netPL, children: [], nodeType: 'ledger',
        district_id: '2', tableKey: 'virtual_rs',
      })
      calcTotals(capitalGroup)
      calcTotals(liabRoot)
    }

    const sectionMap = new Map<string, GWNode[]>([
      ['ASSETS',      allRoots.filter(r => r.district_id === '1')],
      ['EQUITY_LIAB', allRoots.filter(r => r.district_id === '2')],
      ['INCOME',      allRoots.filter(r => r.district_id === '3')],
      ['EXPENSES',    allRoots.filter(r => r.district_id === '4')],
    ])

    return { roots: allRoots, sectionMap }
  }, [mastersRes, groupsRes, subgroupsRes, childrenRes, ledgersRes, amountMap])

  // ── Flat search index ─────────────────────────────────────────────────────
  const flatSearchItems = useMemo<SearchItem[]>(() => {
    const items: SearchItem[] = []
    const traverse = (node: GWNode, ancestors: GWNode[], sectionKey: string) => {
      if (node.level >= 2) {
        const pathParts = ancestors.filter(a => a.level >= 2).map(a => a.name)
        items.push({ node, label: node.name, path: pathParts.join(' › '), sectionKey, ancestors: [...ancestors] })
      }
      for (const child of node.children) traverse(child, [...ancestors, node], sectionKey)
    }
    for (const [sectionKey, sectionRoots] of sectionMap.entries())
      for (const root of sectionRoots) traverse(root, [], sectionKey)
    return items
  }, [sectionMap])

  // ── UI state ─────────────────────────────────────────────────────────────
  const [selectedSection, setSelectedSection] = useState('')
  const [dropdowns, setDropdowns] = useState<DropdownOption[][]>([])
  const [selections, setSelections] = useState<(string | number)[]>([])
  const [tableRows, setTableRows] = useState<TableRow[]>([])
  const tableTotal = useMemo(() => tableRows.reduce((s, r) => s + r.total, 0), [tableRows])

  // ── Quick Jump search state ───────────────────────────────────────────────
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

  const filteredSearchItems = useMemo<SearchItem[]>(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return []
    return flatSearchItems
      .filter(item => item.label.toLowerCase().includes(q) || item.path.toLowerCase().includes(q))
      .slice(0, 25)
  }, [flatSearchItems, searchQuery])

  const showAll = (children: GWNode[]) => {
    setTableRows(children.map(c => ({
      id: c.id,
      name: c.name,
      type: c.nodeType === 'group' ? 'Group' : 'Ledger',
      total: c.totalAmount,
    })))
  }

  const showSingle = (node: GWNode) => {
    setTableRows([{ id: node.id, name: node.name, type: node.nodeType === 'group' ? 'Group' : 'Ledger', total: node.totalAmount }])
  }

  const handleLedgerClick = (row: TableRow) => {
    navigate('/accounting/ledger-wise', { state: { ledgerId: row.id } })
  }

  const handlePayables = (row: TableRow) => {
    localStorage.setItem('reportViewData', JSON.stringify({
      groupName: row.name,
      entries: [{ id: row.id, name: row.name, temple_name: row.name }],
    }))
    localStorage.setItem('bs_ledger_name', 'balacesheeet')
    window.open('/accounting/payables-view', '_blank')
  }

  const jumpToNode = useCallback((item: SearchItem) => {
    setSearchQuery('')
    setSearchOpen(false)
    setSelectedSection(item.sectionKey)

    const sectionRoots = sectionMap.get(item.sectionKey) ?? []
    const level2Groups: GWNode[] = []
    sectionRoots.forEach(r => level2Groups.push(...r.children.filter(c => c.nodeType === 'group')))

    const navigationAncestors = item.ancestors.filter(a => a.level >= 2)
    const newDropdowns: DropdownOption[][] = []
    const newSelections: (string | number)[] = []

    let currentNodes: GWNode[] = level2Groups
    let currentParentCtx: GWNode | null = null

    for (const ancestor of navigationAncestors) {
      const labelType = currentNodes[0]?.nodeType === 'ledger' ? 'Ledgers' : 'Groups'
      newDropdowns.push([
        { id: 'ALL', name: `All ${labelType}`, node: currentParentCtx, isAll: true },
        ...currentNodes.map(n => ({ id: n.tableKey, name: n.name, node: n, isAll: false })),
      ])
      newSelections.push(ancestor.tableKey)
      const groups = ancestor.children.filter(c => c.nodeType === 'group')
      const ledgers = ancestor.children.filter(c => c.nodeType === 'ledger')
      currentNodes = groups.length > 0 ? groups : ledgers
      currentParentCtx = ancestor
    }

    if (currentNodes.length > 0) {
      const labelType = currentNodes[0].nodeType === 'ledger' ? 'Ledgers' : 'Groups'
      newDropdowns.push([
        { id: 'ALL', name: `All ${labelType}`, node: currentParentCtx, isAll: true },
        ...currentNodes.map(n => ({ id: n.tableKey, name: n.name, node: n, isAll: false })),
      ])
      newSelections.push(item.node.tableKey)
    }

    setDropdowns(newDropdowns)
    setSelections(newSelections)

    if (item.node.nodeType === 'ledger') {
      showSingle(item.node)
    } else {
      const groups = item.node.children.filter(c => c.nodeType === 'group')
      const ledgers = item.node.children.filter(c => c.nodeType === 'ledger')
      const display = groups.length > 0 ? groups : ledgers.length > 0 ? ledgers : [item.node]
      showAll(display)
    }
  }, [sectionMap, showAll, showSingle])

  const buildDropdown = (nodes: GWNode[], level: number, parentCtx: GWNode | null, newSelections: (string|number)[]) => {
    const groups = nodes.filter(n => n.nodeType === 'group')
    const list = groups.length > 0 ? groups : nodes
    const labelType = list[0]?.nodeType === 'ledger' ? 'Ledgers' : 'Groups'
    const opts: DropdownOption[] = [
      { id: 'ALL', name: `All ${labelType}`, node: parentCtx, isAll: true },
      ...list.map(n => ({ id: n.tableKey, name: n.name, node: n, isAll: false })),
    ]
    const newDropdowns = [...dropdowns.slice(0, level), opts]
    setDropdowns(newDropdowns)
    const newSels = [...newSelections.slice(0, level), 'ALL']
    setSelections(newSels)
    showAll(list)
  }

  const onSectionChange = (key: string) => {
    setSelectedSection(key)
    setDropdowns([])
    setSelections([])
    setTableRows([])

    const roots = sectionMap.get(key) ?? []
    if (!roots.length) { toast.info('No data for this section'); return }

    const level2Groups: GWNode[] = []
    roots.forEach(r => level2Groups.push(...r.children.filter(c => c.nodeType === 'group')))

    if (!level2Groups.length) {
      setTableRows(roots.map(r => ({ id: r.id, name: r.name, type: 'Group' as const, total: r.totalAmount })))
      return
    }

    const opts: DropdownOption[] = [
      { id: 'ALL', name: 'All Groups', node: null, isAll: true },
      ...level2Groups.map(n => ({ id: n.tableKey, name: n.name, node: n, isAll: false })),
    ]
    setDropdowns([opts])
    setSelections(['ALL'])
    showAll(level2Groups)
  }

  const getDropdownLabel = (level: number) => {
    const opts = dropdowns[level] ?? []
    if (opts.some(o => o.node?.nodeType === 'ledger')) return 'Ledger'
    return ['Master Group', 'Sub Group', 'Child Group', 'Sub Child'][level] ?? `Level ${level + 1}`
  }

  const onDropdownChange = (level: number, value: string | number) => {
    const newSels = [...selections.slice(0, level), value]
    setSelections(newSels)
    const newDropdowns = dropdowns.slice(0, level + 1)
    setDropdowns(newDropdowns)

    const opts = dropdowns[level]
    const sel = opts?.find(o => o.id === value)
    if (!sel) return

    if (sel.isAll) {
      if (level === 0) {
        const roots = sectionMap.get(selectedSection) ?? []
        const level2: GWNode[] = []
        roots.forEach(r => level2.push(...r.children.filter(c => c.nodeType === 'group')))
        showAll(level2)
        return
      }
      const parent = sel.node
      if (!parent) return
      const groups = parent.children.filter(c => c.nodeType === 'group')
      const ledgers = parent.children.filter(c => c.nodeType === 'ledger')
      if (groups.length > 0) {
        buildDropdown(groups, level + 1, parent, newSels)
      } else if (ledgers.length > 0) {
        showAll(ledgers)
      } else {
        showSingle(parent)
      }
      return
    }

    const node = sel.node!
    calcTotals(node)
    const groups = node.children.filter(c => c.nodeType === 'group')
    if (groups.length > 0) {
      buildDropdown(groups, level + 1, node, newSels)
      return
    }
    const ledgers = node.children.filter(c => c.nodeType === 'ledger')
    if (ledgers.length > 0) {
      buildDropdown(ledgers, level + 1, node, newSels)
      return
    }
    showSingle(node)
  }

  // ── Reload on date change ─────────────────────────────────────────────────
  const handleLoad = () => {
    setApplied({ ...filter })
    setSelectedSection('')
    setDropdowns([])
    setSelections([])
    setTableRows([])
  }

  // ── Export Excel ──────────────────────────────────────────────────────────
  const exportExcel = () => {
    if (!tableRows.length) { toast.warning('No data to export'); return }
    const sectionLabel = SECTIONS.find(s => s.key === selectedSection)?.label ?? 'Report'
    const ws = XLSX.utils.json_to_sheet(tableRows.map(r => ({
      'Name': r.name, 'Type': r.type, 'Total Amount': r.total,
    })))
    XLSX.utils.sheet_add_json(ws, [{ 'Name': 'Grand Total', 'Type': '', 'Total Amount': tableTotal }], { skipHeader: true, origin: -1 })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, sectionLabel)
    XLSX.writeFile(wb, `GroupWise_${sectionLabel}_${Date.now()}.xlsx`)
  }

  // ── Export PDF ────────────────────────────────────────────────────────────
  const exportPDF = () => {
    if (!tableRows.length) { toast.warning('No data to export'); return }
    const sectionLabel = SECTIONS.find(s => s.key === selectedSection)?.label ?? 'Report'
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(14)
    doc.text('Group Wise Report', doc.internal.pageSize.width / 2, 16, { align: 'center' })
    doc.setFontSize(11)
    doc.text(sectionLabel, doc.internal.pageSize.width / 2, 24, { align: 'center' })
    autoTable(doc, {
      startY: 30,
      head: [['Name', 'Type', 'Total Amount']],
      body: tableRows.map(r => [r.name, r.type, `₹${fmtAmt(r.total)}`]),
      foot: [['', 'Grand Total', `₹${fmtAmt(tableTotal)}`]],
      headStyles: { fillColor: [37, 99, 235] },
      footStyles: { fillColor: [254, 243, 199], textColor: [180, 83, 9], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 2: { halign: 'right' } },
    })
    doc.save(`GroupWise_${sectionLabel}_${Date.now()}.pdf`)
  }

  const TH = ({ children, cls = '' }: { children: React.ReactNode; cls?: string }) => (
    <th className={`px-4 py-2.5 text-left text-xs font-bold text-white whitespace-nowrap bg-blue-600 border-r border-blue-500 ${cls}`}>
      {children}
    </th>
  )

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Group Wise Report" subtitle="Drill-down analysis by account groups and ledgers" />

      {/* Date filter + export buttons */}
      <GlassCard className="p-5" colorBar="bg-gradient-to-r from-indigo-500 to-violet-500">
        <div className="flex items-end gap-4 flex-wrap justify-between">
          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <Label>From Date</Label>
              <Input type="date" max={today} value={filter.fromdate}
                onChange={e => setFilter(f => ({ ...f, fromdate: e.target.value }))} />
            </div>
            <div>
              <Label>To Date</Label>
              <Input type="date" max={today} value={filter.todate}
                onChange={e => setFilter(f => ({ ...f, todate: e.target.value }))} />
            </div>
            <Button onClick={handleLoad}>
              <BarChart3 className="w-4 h-4" /> Load
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportExcel}
              disabled={!tableRows.length}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 transition-colors shadow-sm">
              <FileDown className="w-4 h-4" /> Excel
            </button>
            <button
              onClick={exportPDF}
              disabled={!tableRows.length}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-40 transition-colors shadow-sm">
              <FileText className="w-4 h-4" /> PDF
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Section + cascade dropdowns */}
      <GlassCard className="p-5 space-y-4">

        {/* Quick Jump search */}
        <div ref={searchRef} className="relative">
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
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 placeholder:text-slate-400 disabled:opacity-50"
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
                  const sectionLabel = SECTIONS.find(s => s.key === item.sectionKey)?.label ?? ''
                  const fullPath = [sectionLabel, item.path].filter(Boolean).join(' › ')
                  return (
                    <button
                      key={idx}
                      onMouseDown={e => { e.preventDefault(); jumpToNode(item) }}
                      className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors border-b border-slate-50 last:border-0 flex items-start gap-3"
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

        <div className="border-t border-slate-100 pt-4">
        <div className="flex items-end gap-4 flex-wrap">
          {/* Section selector */}
          <div className="min-w-[200px]">
            <Label>Select Section</Label>
            <div className="relative">
              <select
                value={selectedSection}
                onChange={e => onSectionChange(e.target.value)}
                disabled={isLoading}
                className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-8 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 shadow-sm disabled:opacity-50">
                <option value="" disabled>Choose Section</option>
                {SECTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Cascade dropdowns */}
          {dropdowns.map((opts, i) => (
            <div key={i} className="min-w-[200px]">
              <Label>{getDropdownLabel(i)}</Label>
              <div className="relative">
                <select
                  value={String(selections[i] ?? 'ALL')}
                  onChange={e => onDropdownChange(i, e.target.value)}
                  className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-8 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 shadow-sm">
                  {opts.map(opt => (
                    <option key={String(opt.id)} value={String(opt.id)}>{opt.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          ))}
        </div>
        </div>
      </GlassCard>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-10 rounded-xl bg-slate-100 animate-pulse" />)}
        </div>
      )}

      {/* Prompt when nothing selected */}
      {!isLoading && !selectedSection && (
        <GlassCard className="p-12 text-center">
          <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h4 className="text-base font-semibold text-slate-500">Select a Section or Quick Jump</h4>
          <p className="text-sm text-slate-400 mt-1">Use Quick Jump above to go directly to any ledger or group, or choose a section to drill down step by step.</p>
        </GlassCard>
      )}

      {/* Empty result */}
      {!isLoading && selectedSection && tableRows.length === 0 && (
        <GlassCard className="p-12 text-center">
          <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h4 className="text-base font-semibold text-slate-500">No Data Found</h4>
          <p className="text-sm text-slate-400 mt-1">No transactions match the selected filters.</p>
        </GlassCard>
      )}

      {/* Results table */}
      {!isLoading && tableRows.length > 0 && (
        <GlassCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <TH>Name</TH>
                  <TH>Type</TH>
                  <TH cls="text-right">Total Amount</TH>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                    <td className="px-4 py-2.5 border-b border-slate-100 font-medium text-slate-800">
                      {row.type === 'Ledger' ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => handleLedgerClick(row)}
                            title="View in Ledger Wise"
                            className="inline-flex items-center gap-1 text-blue-600 font-medium hover:text-blue-800 hover:underline"
                          >
                            {row.name}
                            <ExternalLink className="w-3 h-3 opacity-60 flex-shrink-0" />
                          </button>
                          <button
                            onClick={() => handlePayables(row)}
                            title="Open Payables for this ledger"
                            className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold border border-emerald-300 text-emerald-600 bg-white hover:bg-emerald-50 transition-colors flex-shrink-0"
                          >
                            <Receipt className="w-3 h-3" /> Payables
                          </button>
                        </div>
                      ) : row.name}
                    </td>
                    <td className="px-4 py-2.5 border-b border-slate-100">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        row.type === 'Group'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {row.type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 border-b border-slate-100 text-right font-bold tabular-nums">
                      <span className={row.total < 0 ? 'text-red-500' : 'text-slate-800'}>
                        {row.total < 0 ? '(' : ''}₹{fmtAmt(row.total)}{row.total < 0 ? ')' : ''}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-amber-50 border-t-2 border-amber-200">
                  <td colSpan={2} className="px-4 py-3 text-right text-xs font-bold text-amber-700 uppercase tracking-wide">
                    Grand Total
                  </td>
                  <td className="px-4 py-3 text-right font-extrabold tabular-nums text-amber-700">
                    {tableTotal < 0 ? '(' : ''}₹{fmtAmt(tableTotal)}{tableTotal < 0 ? ')' : ''}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </GlassCard>
      )}
    </motion.div>
  )
}
