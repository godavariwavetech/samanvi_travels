import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronDown, FileDown, FileText, BarChart3, Search, X, Layers, BookOpen, ExternalLink, Receipt, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { GlassCard, Button, Input, Label, PageHeader, ColumnFilterDropdown, FYSelector, DualScrollTable } from '@/components/shared'
import { PayablesPopup } from './PayablesPopup'
import { accountingService } from '@/services/accounting.service'
import { useFYStore } from '@/store/fy.store'
import { getCurrentFY } from '@/lib/fy'

// ── Types ────────────────────────────────────────────────────────────────────
interface GWNode {
  id: number
  name: string
  level: number
  parentId: number | null
  amount: number
  totalAmount: number
  // Opening balance at the From date, the period's debit and credit totals,
  // and the closing balance (opening plus the period's net). A ledger's own;
  // a group's the roll-up of everything under it (see calcTotals).
  opening: number
  debit: number
  credit: number
  closing: number
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
  opening: number
  debit: number
  credit: number
  closing: number
  group: string   // immediate parent group name
  // Section the row sits in (masters district id): decides what a sign means.
  district_id: string
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
  node.opening = node.children.reduce((s, c) => s + c.opening, 0)
  node.debit = node.children.reduce((s, c) => s + c.debit, 0)
  node.credit = node.children.reduce((s, c) => s + c.credit, 0)
  node.closing = node.children.reduce((s, c) => s + c.closing, 0)
  return node.totalAmount
}

// Raw debit / credit of one transaction row, before the section's sign
// convention is applied - what the Debit and Credit columns add up.
function parseTxDrCr(r: any): { debit: number; credit: number } {
  const raw = Math.abs(Number(r.amount ?? r.debit_amount ?? r.credit_amount ?? 0))
  if (!raw || isNaN(raw)) return { debit: 0, credit: 0 }
  const acct = String(r.account_type ?? r.amount_type ?? '').trim().toUpperCase()
  return { debit: acct === 'DEBIT ACCOUNT' ? raw : 0, credit: acct === 'CREDIT ACCOUNT' ? raw : 0 }
}

// The day before a yyyy-mm-dd date, for the "everything before From" query.
function dayBefore(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
// Where "before" starts: early enough to take in every entry ever posted.
const EPOCH = '2000-01-01'

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

// dd-mm-yyyy, hyphen-separated — used in export filenames, which can't contain slashes
function fmtFileDate(d: any): string {
  if (!d) return '-'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return '-'
  return `${String(dt.getDate()).padStart(2, '0')}-${String(dt.getMonth() + 1).padStart(2, '0')}-${dt.getFullYear()}`
}

// ── Main ──────────────────────────────────────────────────────────────────────
const today = new Date().toISOString().split('T')[0]
const currentFY = getCurrentFY()

export default function GroupWisePage() {
  const navigate = useNavigate()
  const { selectedFY } = useFYStore()
  const fyMin = selectedFY.fromDate
  const fyMax = selectedFY.startYear === currentFY.startYear ? today : selectedFY.toDate
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

  // Selecting a financial year snaps the range to that year's full span and
  // re-fetches immediately — otherwise the FY tabs look like they do nothing.
  useEffect(() => {
    const next = { fromdate: fyMin, todate: fyMax }
    setFilter(next)
    setApplied(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fyMin, fyMax])

  // ── Data queries (same sources as Balance Sheet) ──────────────────────────
  const { data: mastersRes, isLoading: l1, isFetching: f1, refetch: r1 }   = useQuery({ queryKey: ['gw-masters'],   queryFn: () => accountingService.getMastersAdd(roleDistrictPayload) })
  const { data: groupsRes, isLoading: l2, isFetching: f2, refetch: r2 }    = useQuery({ queryKey: ['gw-groups'],    queryFn: () => accountingService.getMastersGroup(roleDistrictPayload) })
  const { data: subgroupsRes, isLoading: l3, isFetching: f3, refetch: r3 } = useQuery({ queryKey: ['gw-subgroups'], queryFn: () => accountingService.getMainMastersSubgroup() })
  const { data: childrenRes, isLoading: l4, isFetching: f4, refetch: r4 }  = useQuery({ queryKey: ['gw-children'],  queryFn: () => accountingService.getMainMastersSubchild() })
  const { data: ledgersRes, isLoading: l5, isFetching: f5, refetch: r5 }   = useQuery({ queryKey: ['gw-ledgers'],   queryFn: () => accountingService.getLedgerData(roleDistrictPayload) })
  const { data: txRes, isLoading: l6, isFetching: f6, refetch: r6 }        = useQuery({
    queryKey: ['gw-transactions', applied],
    queryFn: () => accountingService.getTransactionsReport({
      fromdate: applied.fromdate,
      todate: applied.todate,
      ledger_name: '',
      ledger_id: null,
      user_id: userId,
    }),
  })

  // Everything posted before the From date, for the opening balance. Same
  // endpoint and sign rules as the period itself, so opening + period = closing
  // without any second convention.
  const { data: openRes, isLoading: l7, isFetching: f7, refetch: r7 } = useQuery({
    queryKey: ['gw-opening', applied.fromdate],
    queryFn: () => accountingService.getTransactionsReport({
      fromdate: EPOCH,
      todate: dayBefore(applied.fromdate),
      ledger_name: '',
      ledger_id: null,
      user_id: userId,
    }),
    enabled: !!applied.fromdate,
  })

  const isLoading = l1 || l2 || l3 || l4 || l5 || l6 || l7
  const isRefreshing = f1 || f2 || f3 || f4 || f5 || f6 || f7
  const refreshAll = () => { r1(); r2(); r3(); r4(); r5(); r6(); r7() }

  // ── Build ledger_id → figures map ────────────────────────────────────────
  type Figures = { opening: number; debit: number; credit: number; net: number }
  const txRows = (res: any): any[][] => {
    if (!res?.data) return []
    const allData = res.data
    return (Array.isArray(allData) ? allData : Object.values(allData)).filter(v => Array.isArray(v)) as any[][]
  }
  const ledgerIdOf = (r: any): number => Number(r.ledger_id ?? r.ledgerid ?? r.ledgerId ?? NaN)
  const amountMap = useMemo(() => {
    const map = new Map<number, Figures>()
    const at = (lid: number): Figures => {
      let f = map.get(lid)
      if (!f) { f = { opening: 0, debit: 0, credit: 0, net: 0 }; map.set(lid, f) }
      return f
    }
    for (const arr of txRows(openRes)) {
      for (const r of arr) {
        const amt = parseTxAmt(r)
        const lid = ledgerIdOf(r)
        if (!amt || isNaN(lid)) continue
        at(lid).opening += amt
      }
    }
    for (const arr of txRows(txRes)) {
      for (const r of arr) {
        const lid = ledgerIdOf(r)
        if (isNaN(lid)) continue
        const { debit, credit } = parseTxDrCr(r)
        const amt = parseTxAmt(r)
        if (!debit && !credit && !amt) continue
        const f = at(lid)
        f.debit += debit
        f.credit += credit
        f.net += amt
      }
    }
    return map
  }, [txRes, openRes])

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
        amount: 0, totalAmount: 0, opening: 0, debit: 0, credit: 0, closing: 0, children: [], nodeType: 'group',
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
        amount: 0, totalAmount: 0, opening: 0, debit: 0, credit: 0, closing: 0, children: [], nodeType: 'group',
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
        amount: 0, totalAmount: 0, opening: 0, debit: 0, credit: 0, closing: 0, children: [], nodeType: 'group',
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
          amount: 0, totalAmount: 0, opening: 0, debit: 0, credit: 0, closing: 0, children: [], nodeType: 'group',
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
      const fig = amountMap.get(Number(led.id)) ?? { opening: 0, debit: 0, credit: 0, net: 0 }
      const net = fig.net
      const n: GWNode = {
        id: led.id, name: led.temple_name, level: parent.level + 1, parentId: parent.id,
        amount: net, totalAmount: net,
        opening: fig.opening, debit: fig.debit, credit: fig.credit, closing: fig.opening + net,
        children: [], nodeType: 'ledger',
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
    // The surplus brought forward: income less expenses posted before the From
    // date, so the virtual ledger opens with it and closes with the period's
    // result added on.
    const openingPL = incomeRoots.reduce((s, r) => s + r.opening, 0) - expenseRoots.reduce((s, r) => s + r.opening, 0)

    const liabRoot = allRoots.find(r => r.district_id === '2')
    if (liabRoot && (netPL !== 0 || openingPL !== 0)) {
      let capitalGroup = liabRoot.children.find(c => c.name.toLowerCase().includes('capital'))
      if (!capitalGroup) {
        capitalGroup = {
          id: -997, name: 'Capital', level: 2, parentId: liabRoot.id,
          amount: 0, totalAmount: 0, opening: 0, debit: 0, credit: 0, closing: 0, children: [], nodeType: 'group',
          district_id: '2', tableKey: 'virtual_capital',
        }
        liabRoot.children.push(capitalGroup)
      }
      // Remove old virtual RS
      capitalGroup.children = capitalGroup.children.filter(c => c.id !== -999)
      capitalGroup.children.push({
        id: -999, name: 'Reserve & Surplus (P&L)', level: capitalGroup.level + 1, parentId: capitalGroup.id,
        amount: netPL, totalAmount: netPL,
        opening: openingPL, debit: netPL < 0 ? -netPL : 0, credit: netPL > 0 ? netPL : 0, closing: openingPL + netPL,
        children: [], nodeType: 'ledger',
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
  const tableTotals = useMemo(() => tableRows.reduce(
    (t, r) => ({ opening: t.opening + r.opening, debit: t.debit + r.debit, credit: t.credit + r.credit, closing: t.closing + r.closing }),
    { opening: 0, debit: 0, credit: 0, closing: 0 }), [tableRows])
  const rowOf = (n: GWNode, group: string): TableRow => ({
    id: n.id, name: n.name, type: n.nodeType === 'group' ? 'Group' : 'Ledger',
    total: n.totalAmount, opening: n.opening, debit: n.debit, credit: n.credit, closing: n.closing, group,
    district_id: String(n.district_id ?? ''),
  })
  // Every row on the table comes from the one section picked above, so the
  // totals row reads its signs the same way the rows do.
  const tableDistrict = tableRows[0]?.district_id ?? ''

  // Selecting a financial year refetches the transaction totals (sectionMap
  // recomputes from the new amounts), but tableRows is only ever set by
  // walking the hierarchy in response to a section/dropdown click — it won't
  // pick up the refreshed numbers on its own. Reset the drill-down so the
  // user re-enters it against the now up-to-date data, same as Load does.
  useEffect(() => {
    setSelectedSection('')
    setDropdowns([])
    setSelections([])
    setTableRows([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fyMin, fyMax])

  // ── Column filters (Name / Type) + Total Amount range filter ─────────────
  const [colFilters, setColFilters] = useState<Record<string, string[]>>({})
  const activeFilterCount = Object.values(colFilters).filter(v => v && v.length > 0).length
  const FILTER_KEYS = ['name', 'type', 'opening', 'debit', 'credit', 'closing'] as const
  // parseTxAmt makes a positive figure the section's natural balance - a debit
  // for Assets and Expenses, a CREDIT for Liabilities and Income - so the Dr/Cr
  // tag has to read the sign the way the section does. Tagging every positive
  // figure Dr showed a Payables credit balance as Dr and its debit as Cr, the
  // opposite of what Ledger Wise and the voucher screens say for the same money.
  const isCreditSection = (did: string) => did === '2' || did === '3'
  const balanceTag = (n: number, did: string) => ((n < 0) !== isCreditSection(did) ? 'Cr' : 'Dr')
  const drCr = (n: number, did: string) => `${n < 0 ? '(' : ''}₹${fmtAmt(n)}${n < 0 ? ')' : ''} ${balanceTag(n, did)}`
  const colValue = useCallback((row: TableRow, key: string): string => {
    switch (key) {
      case 'name': return row.name || '-'
      case 'type': return row.type || '-'
      case 'opening': return drCr(row.opening, row.district_id)
      case 'debit': return `₹${fmtAmt(row.debit)}`
      case 'credit': return `₹${fmtAmt(row.credit)}`
      case 'closing': return drCr(row.closing, row.district_id)
      default: return ''
    }
  }, [])
  const filterColOptions = useMemo(() => {
    const result: Record<string, string[]> = {}
    FILTER_KEYS.forEach(key => {
      result[key] = Array.from(new Set(tableRows.map(r => colValue(r, key)))).sort()
    })
    return result
  }, [tableRows, colValue])

  const [amountFilter, setAmountFilter] = useState<'' | 'zero' | 'above'>('')

  const displayRows = useMemo(() => {
    let out = tableRows
    // "With 0" / "Without 0" go by the closing balance, the figure the table
    // now ends on.
    if (amountFilter === 'zero') out = out.filter(r => r.closing === 0)
    else if (amountFilter === 'above') out = out.filter(r => r.closing !== 0)
    if (activeFilterCount) {
      out = out.filter(row => {
        for (const [key, vals] of Object.entries(colFilters)) {
          if (!vals || vals.length === 0) continue
          if (!vals.includes(colValue(row, key))) return false
        }
        return true
      })
    }
    return out
  }, [tableRows, amountFilter, colFilters, activeFilterCount, colValue])

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

  const showAll = (children: GWNode[], parent: GWNode | null = null) => {
    setTableRows(children.map(c => rowOf(c, parent?.name ?? '')))
  }

  const showSingle = (node: GWNode, parent: GWNode | null = null) => {
    setTableRows([rowOf(node, parent?.name ?? '')])
  }

  const handleLedgerClick = (row: TableRow) => {
    navigate('/accounting/ledger-wise', { state: { ledgerId: row.id } })
  }

  // Payables opens as a popup over this report rather than in another tab.
  const [payablesFor, setPayablesFor] = useState<{ id: number; name: string } | null>(null)
  const handlePayables = (row: TableRow) => setPayablesFor({ id: row.id, name: row.name })

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
      showSingle(item.node, currentParentCtx)
    } else {
      const groups = item.node.children.filter(c => c.nodeType === 'group')
      const ledgers = item.node.children.filter(c => c.nodeType === 'ledger')
      const display = groups.length > 0 ? groups : ledgers.length > 0 ? ledgers : [item.node]
      showAll(display, item.node)
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
    showAll(list, parentCtx)
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
      setTableRows(roots.map(r => rowOf(r, '')))
      return
    }

    const opts: DropdownOption[] = [
      { id: 'ALL', name: 'All Groups', node: null, isAll: true },
      ...level2Groups.map(n => ({ id: n.tableKey, name: n.name, node: n, isAll: false })),
    ]
    setDropdowns([opts])
    setSelections(['ALL'])
    showAll(level2Groups, roots[0] ?? null)
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
        showAll(level2, roots[0] ?? null)
        return
      }
      const parent = sel.node
      if (!parent) return
      // opts[0] is always the "All ..." entry, whose node is the shared
      // parent of every item at this dropdown level — i.e. parent's own parent.
      const grandParent = opts[0]?.node ?? null
      const groups = parent.children.filter(c => c.nodeType === 'group')
      const ledgers = parent.children.filter(c => c.nodeType === 'ledger')
      if (groups.length > 0) {
        buildDropdown(groups, level + 1, parent, newSels)
      } else if (ledgers.length > 0) {
        showAll(ledgers, parent)
      } else {
        showSingle(parent, grandParent)
      }
      return
    }

    const node = sel.node!
    calcTotals(node)
    const nodeParent = opts[0]?.node ?? null
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
    showSingle(node, nodeParent)
  }

  // ── Reload on date change ─────────────────────────────────────────────────
  const handleLoad = () => {
    setApplied({ ...filter })
    setSelectedSection('')
    setDropdowns([])
    setSelections([])
    setTableRows([])
    setColFilters({})
    setAmountFilter('')
  }

  const downloadDate = () => fmtFileDate(new Date())

  // When every visible row shares the same immediate parent group, that group
  // is the most specific label for what's on screen — falls back to the
  // section label (Income/Expenses/etc.) when rows span multiple groups.
  const lastParentLabel = (sectionLabel: string) => {
    const rowGroups = [...new Set(tableRows.map(r => r.group).filter(Boolean))]
    return rowGroups.length === 1 ? rowGroups[0] : sectionLabel
  }

  // Export filename — collapsed-underscore last-parent/section label + the
  // applied date range + today's date, matching the naming used on the other
  // report pages instead of a raw epoch timestamp.
  const fileBaseName = (sectionLabel: string) => {
    const labelPart = lastParentLabel(sectionLabel).replace(/[^a-z0-9]+/gi, '_')
    return `GroupWise_${labelPart}_${fmtFileDate(applied.fromdate)}_to_${fmtFileDate(applied.todate)}`
  }

  // ── Export Excel ──────────────────────────────────────────────────────────
  // Downloads carry exactly the rows on the table - the column and amount
  // filters applied - numbered from 1, with the total of those rows.
  const shownTotals = useMemo(() => displayRows.reduce(
    (t, r) => ({ opening: t.opening + r.opening, debit: t.debit + r.debit, credit: t.credit + r.credit, closing: t.closing + r.closing }),
    { opening: 0, debit: 0, credit: 0, closing: 0 }), [displayRows])

  const exportExcel = () => {
    if (!displayRows.length) { toast.warning('No data to export'); return }
    const sectionLabel = SECTIONS.find(s => s.key === selectedSection)?.label ?? 'Report'
    const ws = XLSX.utils.json_to_sheet(displayRows.map((r, i) => ({
      'Sl No': i + 1, 'Name': r.name, 'Group': r.group || '', 'Type': r.type,
      'Opening Balance': r.opening, 'Debit': r.debit, 'Credit': r.credit, 'Closing Balance': r.closing,
    })))
    XLSX.utils.sheet_add_json(ws, [{
      'Sl No': '', 'Name': 'Grand Total', 'Group': '', 'Type': '',
      'Opening Balance': shownTotals.opening, 'Debit': shownTotals.debit, 'Credit': shownTotals.credit, 'Closing Balance': shownTotals.closing,
    }], { skipHeader: true, origin: -1 })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, sectionLabel)
    XLSX.writeFile(wb, `${fileBaseName(sectionLabel)}_${downloadDate()}.xlsx`)
  }

  // ── Export PDF ────────────────────────────────────────────────────────────
  const exportPDF = () => {
    if (!displayRows.length) { toast.warning('No data to export'); return }
    const sectionLabel = SECTIONS.find(s => s.key === selectedSection)?.label ?? 'Report'
    const subtitle = lastParentLabel(sectionLabel)

    const doc = new jsPDF({ orientation: 'landscape' })
    const pageWidth = doc.internal.pageSize.getWidth()

    // App name + group/section subtitle, centered at the top of the page
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Samanvi Travels', pageWidth / 2, 14, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.text(subtitle, pageWidth / 2, 22, { align: 'center' })

    // Header cell alignment is set explicitly per column so it matches the
    // body/columnStyles alignment below (autoTable doesn't otherwise carry
    // columnStyles' halign over to the head row).
    const headers = [
      { content: 'Sl No', styles: { halign: 'center' as const } },
      { content: 'Name', styles: { halign: 'left' as const } },
      { content: 'Group', styles: { halign: 'left' as const } },
      { content: 'Type', styles: { halign: 'left' as const } },
      { content: 'Opening Balance', styles: { halign: 'right' as const } },
      { content: 'Debit', styles: { halign: 'right' as const } },
      { content: 'Credit', styles: { halign: 'right' as const } },
      { content: 'Closing Balance', styles: { halign: 'right' as const } },
    ]

    // The ₹ glyph isn't in jsPDF's default font — it measures as the wrong
    // width, which throws off right-alignment. Plain numbers (the column
    // header already says "Amount") render correctly aligned instead.
    const amt = (n: number) => `${n < 0 ? '(' : ''}${fmtAmt(n)}${n < 0 ? ')' : ''}`

    // Table is centered automatically — no explicit column widths are set,
    // so autoTable fills the space between the default symmetric margins.
    autoTable(doc, {
      startY: 28,
      head: [headers],
      body: displayRows.map((r, i) => [String(i + 1), r.name, r.group || '-', r.type, amt(r.opening), fmtAmt(r.debit), fmtAmt(r.credit), amt(r.closing)]),
      // Foot cells need the same explicit per-column halign as the head —
      // columnStyles' halign doesn't carry over to head/foot rows, only body.
      foot: [[
        '', '', '',
        { content: 'Grand Total', styles: { halign: 'right' as const } },
        { content: amt(shownTotals.opening), styles: { halign: 'right' as const } },
        { content: fmtAmt(shownTotals.debit), styles: { halign: 'right' as const } },
        { content: fmtAmt(shownTotals.credit), styles: { halign: 'right' as const } },
        { content: amt(shownTotals.closing), styles: { halign: 'right' as const } },
      ]],
      // One Grand Total, under the last row - not repeated on every page.
      showFoot: 'lastPage',
      headStyles: { fillColor: [37, 99, 235] },
      footStyles: { fillColor: [254, 243, 199], textColor: [180, 83, 9], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 0: { halign: 'center', cellWidth: 14 }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right' } },
    })
    doc.save(`${fileBaseName(sectionLabel)}_${downloadDate()}.pdf`)
  }

  // A balance shown the way the Total Amount column always was: brackets and
  // red for a credit figure, Dr / Cr tagged on.
  const balanceText = (n: number, did: string) => (
    <>
      {n < 0 ? '(' : ''}₹{fmtAmt(n)}{n < 0 ? ')' : ''}
      <span className="ml-1 text-[10px] font-bold align-middle">{balanceTag(n, did)}</span>
    </>
  )
  const balanceCell = (n: number, did: string) => (
    n === 0 ? <span className="text-slate-300 font-normal">—</span>
      : <span className={n < 0 ? 'text-red-500' : 'text-slate-800'}>{balanceText(n, did)}</span>
  )

  const TH = ({ children, cls = '', filterKey }: { children: React.ReactNode; cls?: string; filterKey?: string }) => (
    <th className={`sticky top-0 z-10 px-4 py-2.5 text-left text-xs font-bold text-white whitespace-nowrap bg-blue-600 border-r border-blue-500 ${cls}`}>
      {/* text-align on the <th> doesn't affect this flex row's own layout —
          justify-end is needed too so the label+filter icon actually sit on
          the same side as the right-aligned amount cells below */}
      <div className={`flex items-center gap-1.5 ${cls.includes('text-right') ? 'justify-end' : ''}`}>
        <span>{children}</span>
        {filterKey && (
          <ColumnFilterDropdown
            variant="light"
            options={filterColOptions[filterKey] ?? []}
            selected={colFilters[filterKey] ?? []}
            onChange={vals => setColFilters(f => ({ ...f, [filterKey]: vals }))}
          />
        )}
      </div>
    </th>
  )

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Group Wise Report" subtitle="Drill-down analysis by account groups and ledgers" />

      {/* Date filter + export buttons */}
      <GlassCard className="p-5" colorBar="bg-gradient-to-r from-indigo-500 to-violet-500">
        <FYSelector className="mb-4 pb-4 border-b border-slate-100" />
        <div className="flex items-end gap-4 flex-wrap justify-between">
          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <Label>From Date</Label>
              <Input type="date" min={fyMin} max={fyMax} value={filter.fromdate}
                onChange={e => setFilter(f => ({ ...f, fromdate: e.target.value }))} />
            </div>
            <div>
              <Label>To Date</Label>
              <Input type="date" min={fyMin} max={fyMax} value={filter.todate}
                onChange={e => setFilter(f => ({ ...f, todate: e.target.value }))} />
            </div>
            <Button onClick={handleLoad}>
              <BarChart3 className="w-4 h-4" /> Load
            </Button>
            <Button onClick={refreshAll} disabled={isRefreshing} className="bg-slate-600 hover:bg-slate-700">
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
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

          {/* Total Amount range filter */}
          {tableRows.length > 0 && (
            <div className="min-w-[180px] ml-auto">
              <Label>Closing Balance</Label>
              <div className="relative">
                <select
                  value={amountFilter}
                  onChange={e => setAmountFilter(e.target.value as '' | 'zero' | 'above')}
                  className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-8 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 shadow-sm">
                  <option value="">All Amounts</option>
                  <option value="zero">With 0</option>
                  <option value="above">Without 0</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          )}
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
          {(activeFilterCount > 0 || amountFilter) && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 px-4 pt-3">
              Showing {displayRows.length} of {tableRows.length} rows
              <button
                onClick={() => { setColFilters({}); setAmountFilter('') }}
                className="text-blue-600 font-semibold hover:underline">
                Clear all filters
              </button>
            </div>
          )}
          <DualScrollTable tableClassName="overflow-auto max-h-[70vh]">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <TH cls="text-center">Sl No</TH>
                  <TH filterKey="name">Name</TH>
                  <TH filterKey="type">Type</TH>
                  <TH cls="text-right" filterKey="opening">Opening Balance</TH>
                  <TH cls="text-right" filterKey="debit">Debit</TH>
                  <TH cls="text-right" filterKey="credit">Credit</TH>
                  <TH cls="text-right" filterKey="closing">Closing Balance</TH>
                </tr>
              </thead>
              <tbody>
                {displayRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm">
                      No rows match the active filters.
                    </td>
                  </tr>
                ) : displayRows.map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                    <td className="px-4 py-2.5 border-b border-slate-100 text-center text-slate-500">{idx + 1}</td>
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
                    {/* Opening and closing keep the section's Dr/Cr reading;
                        debit and credit are the plain period totals. */}
                    <td className="px-4 py-2.5 border-b border-slate-100 text-right font-semibold tabular-nums">
                      {balanceCell(row.opening, row.district_id)}
                    </td>
                    <td className="px-4 py-2.5 border-b border-slate-100 text-right tabular-nums text-slate-700">
                      {row.debit ? `₹${fmtAmt(row.debit)}` : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5 border-b border-slate-100 text-right tabular-nums text-slate-700">
                      {row.credit ? `₹${fmtAmt(row.credit)}` : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5 border-b border-slate-100 text-right font-bold tabular-nums">
                      {balanceCell(row.closing, row.district_id)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-amber-50 border-t-2 border-amber-200">
                  <td colSpan={3} className="px-4 py-3 text-right text-xs font-bold text-amber-700 uppercase tracking-wide">
                    Grand Total{displayRows.length !== tableRows.length ? ` (${displayRows.length} of ${tableRows.length} rows)` : ''}
                  </td>
                  <td className="px-4 py-3 text-right font-extrabold tabular-nums text-amber-700">{balanceText(shownTotals.opening, tableDistrict)}</td>
                  <td className="px-4 py-3 text-right font-extrabold tabular-nums text-amber-700">₹{fmtAmt(shownTotals.debit)}</td>
                  <td className="px-4 py-3 text-right font-extrabold tabular-nums text-amber-700">₹{fmtAmt(shownTotals.credit)}</td>
                  <td className="px-4 py-3 text-right font-extrabold tabular-nums text-amber-700">{balanceText(shownTotals.closing, tableDistrict)}</td>
                </tr>
              </tfoot>
            </table>
          </DualScrollTable>
        </GlassCard>
      )}
      {payablesFor && <PayablesPopup ledger={payablesFor} onClose={() => setPayablesFor(null)} />}
    </motion.div>
  )
}
