import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Receipt, Save, Search, X, PlusCircle, MinusCircle, FileText } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Label, DataTable, Badge, PageHeader, SearchableSelect } from '@/components/shared'
import type { Column } from '@/components/shared'
import { tripsService } from '@/services/trips.service'
import { accountingService } from '@/services/accounting.service'

// ── Types ────────────────────────────────────────────────────────────────────
type LedgerObj = {
  ledger_id: string | number
  temple_name: string
  child?: any; district_id?: any; mandal_id?: any; subchildtwo?: any; village_id?: any
  staticname?: any; mandal_name?: any; subchildtwo_id?: any
  parent_subgroup_id?: any; parent_subchild_id?: any; parent_grp_level?: any
}
type LedgerRow = { ledger: LedgerObj | null; amount: string }

type ExpenseForm = {
  id: string; trip_creation_id: string
  trip_date: string; trip_for: string; trip_for_id: string
  bus_no: string; service_no: string; service_no_id: string
  driver1_name: string; driver1_id: string
  driver2_name: string; driver2_id: string
  helper_name: string; helper_id: string
  conductor_name: string; conductor_id: string
  paid_to_name: string; paid_to_id: string; paid_to_type: string
  driveronebeta: string; driveronesalary: string; driveronesudsalary: string
  drivertwobeta: string; drivertwosalary: string; drivertwosudsalary: string
  helperbeta: string; helpersalary: string; helpersudsalary: string
  conductorsalary: string
  remarks: string
}

type OrigMeta = { c_number: string; c_id: string; date: string; user_id: string; usr_nm: string }

const today = new Date().toISOString().split('T')[0]
const firstOfMonth = today.slice(0, 8) + '01'

const num = (v: any) => Number(v) || 0
const nowStr = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

const emptyForm = (): ExpenseForm => ({
  id: '', trip_creation_id: '',
  trip_date: '', trip_for: '', trip_for_id: '',
  bus_no: '', service_no: '', service_no_id: '',
  driver1_name: '', driver1_id: '',
  driver2_name: '', driver2_id: '',
  helper_name: '', helper_id: '',
  conductor_name: '', conductor_id: '',
  paid_to_name: '', paid_to_id: '', paid_to_type: '',
  driveronebeta: '', driveronesalary: '', driveronesudsalary: '',
  drivertwobeta: '', drivertwosalary: '', drivertwosudsalary: '',
  helperbeta: '', helpersalary: '', helpersudsalary: '',
  conductorsalary: '',
  remarks: '',
})

const emptyLedgerRow = (): LedgerRow => ({ ledger: null, amount: '' })

const canActOnExpense = (row: any) => row.status === 1 && row.admin_status !== 1 && row.admin_status !== 2

const toLedgerObj = (item: any): LedgerObj => ({
  ledger_id: item.ledger_id, temple_name: item.expensives ?? item.temple_name,
  child: item.child, district_id: item.district_id, mandal_id: item.mandal_id, subchildtwo: item.subchildtwo,
  village_id: item.village_id, staticname: item.staticname, mandal_name: item.mandal_name, subchildtwo_id: item.subchildtwo_id,
  parent_subgroup_id: item.parent_subgroup_id, parent_subchild_id: item.parent_subchild_id, parent_grp_level: item.parent_grp_level,
})

export default function TripExpensesPage() {
  const qc = useQueryClient()

  // Date-range filter (blank = show all pending/on-review trips)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [applied, setApplied] = useState<{ from: string; to: string } | null>(null)

  // Add/Edit modal
  const [modal, setModal] = useState<{ mode: 'add' | 'edit' | null; row: any }>({ mode: null, row: null })
  const [form, setForm] = useState<ExpenseForm>(emptyForm())
  const [debitRows, setDebitRows] = useState<LedgerRow[]>([emptyLedgerRow()])
  const [creditRows, setCreditRows] = useState<LedgerRow[]>([emptyLedgerRow()])
  const [origMeta, setOrigMeta] = useState<OrigMeta>({ c_number: '', c_id: '', date: '', user_id: '', usr_nm: '' })
  const [loadingModal, setLoadingModal] = useState(false)

  // View modal
  const [viewModal, setViewModal] = useState<{ open: boolean; row: any; debit: any[]; credit: any[]; loading: boolean }>(
    { open: false, row: null, debit: [], credit: [], loading: false }
  )

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: listData, isLoading, refetch } = useQuery({
    queryKey: ['trip-expenses', applied],
    queryFn: () => applied ? tripsService.getExpensesFilter({ fromdate: applied.from, todate: applied.to }) : tripsService.getExpenses({}),
  })
  const { data: ledgerData, refetch: reloadLedgers, isFetching: loadingLedgers } = useQuery({
    queryKey: ['expense-trip-ledgers'],
    queryFn: () => accountingService.getExpenseTripLedger(),
  })

  const trips: any[] = listData?.data ?? []
  const ledgerList: any[] = ledgerData?.data ?? []
  const ledgerOptions = ledgerList.map((l: any) => ({ value: String(l.ledger_id), label: l.temple_name }))
  const findLedger = (id: string) => ledgerList.find((l: any) => String(l.ledger_id) === id)

  // ── Modal open/close ─────────────────────────────────────────────────────
  const closeModal = () => { setModal({ mode: null, row: null }); setForm(emptyForm()); setDebitRows([emptyLedgerRow()]); setCreditRows([emptyLedgerRow()]) }

  const openAdd = async (row: any) => {
    setModal({ mode: 'add', row })
    setLoadingModal(true)
    setDebitRows([emptyLedgerRow()])
    setCreditRows([emptyLedgerRow()])
    setForm({
      ...emptyForm(),
      id: String(row.id ?? ''), trip_creation_id: String(row.trip_creation_id ?? row.id ?? ''),
      trip_date: String(row.trip_date ?? '').split('T')[0], trip_for: row.trip_for ?? '', trip_for_id: String(row.trip_for_id ?? ''),
      bus_no: row.bus_no ?? '', service_no: row.service_no ?? '', service_no_id: String(row.service_no_id ?? ''),
      driver1_name: row.driver1_name ?? '', driver1_id: String(row.driver1_id ?? ''),
      driver2_name: row.driver2_name ?? '', driver2_id: String(row.driver2_id ?? ''),
      helper_name: row.helper_name ?? '', helper_id: String(row.helper_id ?? ''),
      conductor_name: row.conductor_name ?? '', conductor_id: String(row.conductor_id ?? ''),
      paid_to_name: row.paid_to_name ?? '', paid_to_id: String(row.paid_to_id ?? ''), paid_to_type: row.paid_to_type ?? '',
      driveronebeta: row.optreg ?? '', drivertwobeta: row.optreg1 ?? '', helperbeta: row.optreg2 ?? '',
      remarks: row.remarks ?? '',
    })
    setOrigMeta({ c_number: row.c_number ?? '', c_id: String(row.c_id ?? ''), date: nowStr(), user_id: localStorage.getItem('user_id') ?? '', usr_nm: localStorage.getItem('usr_nm') ?? '' })

    const res = await tripsService.getBeta({ serviceNo: row.service_no })
    const rate = res?.data?.[0]
    if (rate) {
      setForm((f) => ({
        ...f,
        driveronesalary: String(rate.driverOneBeta ?? ''),
        drivertwosalary: String(rate.driverTwoBeta ?? ''),
        helpersalary: String(rate.helperBeta ?? ''),
        conductorsalary: String(rate.conductorBeta ?? ''),
        driveronesudsalary: f.driveronebeta === 'opting' ? String(rate.optDriver ?? '') : f.driveronesudsalary,
        drivertwosudsalary: f.drivertwobeta === 'opting' ? String(rate.optDriver ?? '') : f.drivertwosudsalary,
        helpersudsalary: f.helperbeta === 'opting' ? String(rate.optHelper ?? '') : f.helpersudsalary,
      }))
    }
    setLoadingModal(false)
  }

  const openEdit = async (row: any) => {
    setModal({ mode: 'edit', row })
    setLoadingModal(true)
    setForm({ ...emptyForm(), id: String(row.id ?? '') })
    setDebitRows([emptyLedgerRow()])
    setCreditRows([emptyLedgerRow()])

    const res = await tripsService.getTripModalData({ serviceNo: row.c_number, sudId: 3 })
    const ledgerRows: any[] = res?.data?.[0] ?? []
    const tripRows: any[] = res?.data?.[1] ?? []
    const t = tripRows[0]

    if (t) {
      setForm((f) => ({
        ...f,
        trip_creation_id: String(t.trip_creation_id ?? row.trip_creation_id ?? ''),
        trip_date: String(t.trip_date ?? '').split('T')[0], trip_for: t.trip_for ?? '',
        trip_for_id: String(t.trip_for_id ?? ''), service_no_id: String(t.service_no_id ?? ''),
        bus_no: t.bus_no ?? '', service_no: t.service_no ?? '',
        driver1_name: t.driver1_name ?? '', driver1_id: String(t.driver1_id ?? ''),
        driver2_name: t.driver2_name ?? '', driver2_id: String(t.driver2_id ?? ''),
        helper_name: t.helper_name ?? '', helper_id: String(t.helper_id ?? ''),
        conductor_name: t.conductor_name ?? '', conductor_id: String(t.conductor_id ?? ''),
        paid_to_name: t.paid_to_name ?? '', paid_to_id: String(t.paid_to_id ?? ''), paid_to_type: t.paid_to_type ?? '',
        driveronebeta: t.driveronebeta ?? '', driveronesudsalary: t.driveronesalary ?? '', driveronesalary: String(t.driver1Beta ?? ''),
        drivertwobeta: t.drivertwobeta ?? '', drivertwosudsalary: t.drivertwosalary ?? '', drivertwosalary: String(t.driver2Beta ?? ''),
        helperbeta: t.helperbeta ?? '', helpersudsalary: t.helpersalary ?? '', helpersalary: String(t.helpersudBeta ?? ''),
        conductorsalary: String(t.ConductorsudBeta ?? ''),
        remarks: t.remarks ?? '',
      }))
      setOrigMeta({
        c_number: t.c_number ?? row.c_number ?? '', c_id: String(t.c_id ?? row.c_id ?? ''),
        date: t.date ?? nowStr(), user_id: String(t.user_id ?? ''), usr_nm: t.usr_nm ?? '',
      })
    }

    const debit = ledgerRows.filter((r) => r.amount_type === 'Debit Account').map((r) => ({ ledger: toLedgerObj(r), amount: String(r.amount ?? '') }))
    const credit = ledgerRows.filter((r) => r.amount_type === 'Credit Account').map((r) => ({ ledger: toLedgerObj(r), amount: String(r.amount ?? '') }))
    setDebitRows(debit.length ? debit : [emptyLedgerRow()])
    setCreditRows(credit.length ? credit : [emptyLedgerRow()])
    setLoadingModal(false)
  }

  const openView = async (row: any) => {
    setViewModal({ open: true, row, debit: [], credit: [], loading: true })
    const res = await tripsService.getTripModalData({ serviceNo: row.c_number, sudId: 3 })
    const rows: any[] = res?.data?.[0] ?? []
    setViewModal({
      open: true, row,
      debit: rows.filter((r) => r.amount_type === 'Debit Account'),
      credit: rows.filter((r) => r.amount_type === 'Credit Account'),
      loading: false,
    })
  }

  // ── Totals ───────────────────────────────────────────────────────────────
  const totalSalary = (form.driveronebeta === 'opting' ? num(form.driveronesudsalary) : 0)
    + (form.drivertwobeta === 'opting' ? num(form.drivertwosudsalary) : 0)
    + (form.helperbeta === 'opting' ? num(form.helpersudsalary) : 0)
  const totalBeta = num(form.driveronesalary) + num(form.drivertwosalary) + num(form.helpersalary) + num(form.conductorsalary)
  const validDebit = debitRows.filter((r) => r.ledger && num(r.amount) > 0)
  const validCredit = creditRows.filter((r) => r.ledger && num(r.amount) > 0)
  const debitTotal = validDebit.reduce((s, r) => s + num(r.amount), 0)
  const creditTotal = validCredit.reduce((s, r) => s + num(r.amount), 0)
  const balanced = debitTotal > 0 && Math.round(debitTotal * 100) === Math.round(creditTotal * 100)

  const buildExpenseDetails = () => ({
    driveronebeta: form.driveronebeta, driveronesalary: form.driveronesalary, driveronesudsalary: form.driveronesudsalary, driverone_payment: '',
    drivertwobeta: form.drivertwobeta, drivertwosalary: form.drivertwosalary, drivertwosudsalary: form.drivertwosudsalary, drivertwo_payment: '',
    helperbeta: form.helperbeta, helpersalary: form.helpersalary, helpersudsalary: form.helpersudsalary, helper_payment: '',
    conductorsalary: form.conductorsalary,
    grandtotal: debitTotal, bus_no: form.bus_no, service_no: form.service_no,
    driver1_name: form.driver1_name, driver2_name: form.driver2_name, helper_name: form.helper_name,
    user_id: localStorage.getItem('user_id'), named: localStorage.getItem('usr_nm'),
    id: form.id,
    driveronebeta_payment: '', drivertwobeta_payment: '', helperbeta_payment: '',
    trip_date: form.trip_date, trip_for: form.trip_for,
    paid_to_name: form.paid_to_name, paid_to_id: form.paid_to_id, paid_to_type: form.paid_to_type,
    trip_creation_id: form.trip_creation_id,
    driver1_id: form.driver1_id, driver2_id: form.driver2_id, conductor_id: form.conductor_id, helper_id: form.helper_id,
    conductor_name: form.conductor_name,
    remarks: form.remarks,
  })

  const buildAddPayload = () => ({
    c_number: origMeta.c_number, c_id: origMeta.c_id,
    expensedetails: buildExpenseDetails(),
    patientsTstdts: validDebit.map((r) => ({ d_test_name: r.ledger, d_test_amount: num(r.amount), account_name: 'Debit Account' })),
    credit: validCredit.map((r) => ({ credit_name: r.ledger, credit_amount: num(r.amount), account_name: 'Credit Account' })),
    total_salary: totalSalary, total_beta: totalBeta, total_salary_beta: totalSalary + totalBeta, total_amount: totalSalary + totalBeta + debitTotal,
    trip_for_id: form.trip_for_id, service_no_id: form.service_no_id, remarks: form.remarks,
  })

  const buildEditPayload = () => ({
    expensedetails: buildExpenseDetails(),
    patientsTstdts: validDebit.map((r) => ({ d_test_name: r.ledger, d_test_amount: num(r.amount), account_name: 'Debit Account' })),
    credit: validCredit.map((r) => ({ credit_name: r.ledger, credit_amount: num(r.amount), account_name: 'Credit Account' })),
    total_salary: totalSalary, total_beta: totalBeta, total_salary_beta: totalSalary + totalBeta, total_amount: totalSalary + totalBeta + debitTotal,
    service_no_id: form.service_no_id, trip_for_id: form.trip_for_id, remarks: form.remarks,
    paid_to_id: form.paid_to_id, paid_to_name: form.paid_to_name, paid_to_type: form.paid_to_type,
    trip_creation_id: form.trip_creation_id,
    driver1_id: form.driver1_id, driver2_id: form.driver2_id, helper_id: form.helper_id, conductor_id: form.conductor_id,
    c_number: origMeta.c_number, date: origMeta.date, user_id: origMeta.user_id, usr_nm: origMeta.usr_nm, c_id: origMeta.c_id,
    updatedby_id: localStorage.getItem('user_id'), updatedby_nm: localStorage.getItem('usr_nm'), updatedby_date: nowStr(),
  })

  const validate = () => {
    if (!form.driveronesalary || !form.drivertwosalary || !form.helpersalary || !form.conductorsalary) {
      toast.error('Please fill all beta amount fields'); return false
    }
    if (validDebit.length === 0) { toast.error('Add at least one debit ledger entry'); return false }
    if (validCredit.length === 0) { toast.error('Add at least one credit ledger entry'); return false }
    const debitIds = validDebit.map((r) => String(r.ledger!.ledger_id))
    const creditIds = validCredit.map((r) => String(r.ledger!.ledger_id))
    if (new Set(debitIds).size !== debitIds.length) { toast.error('Duplicate ledger in Debit entries'); return false }
    if (new Set(creditIds).size !== creditIds.length) { toast.error('Duplicate ledger in Credit entries'); return false }
    if (debitIds.some((id) => creditIds.includes(id))) { toast.error('Same ledger cannot be used in both Debit and Credit'); return false }
    if (!balanced) { toast.error(`Debit (₹${debitTotal}) and Credit (₹${creditTotal}) totals must match`); return false }
    return true
  }

  const { mutate: submitAdd, isPending: submittingAdd } = useMutation({
    mutationFn: () => tripsService.addExpenses(buildAddPayload()),
    onSuccess: (res) => { if (res?.status === 200) { toast.success('Expense filed successfully'); closeModal(); refetch() } else toast.error('Failed to save expense') },
    onError: () => toast.error('Server error'),
  })
  const { mutate: submitEdit, isPending: submittingEdit } = useMutation({
    mutationFn: () => tripsService.updateExpenses(buildEditPayload()),
    onSuccess: (res) => { if (res?.status === 200) { toast.success('Expense updated'); closeModal(); refetch() } else toast.error('Failed to update expense') },
    onError: () => toast.error('Server error'),
  })
  const submitting = submittingAdd || submittingEdit
  const handleSubmit = () => { if (!validate()) return; modal.mode === 'add' ? submitAdd() : submitEdit() }

  const { mutate: removeExpense } = useMutation({
    mutationFn: (row: any) => tripsService.deleteExpense({
      c_number: row.c_number,
      delete_by_id: localStorage.getItem('user_id'),
      delete_by_name: localStorage.getItem('usr_nm'),
      delete_by_date: nowStr(),
    }),
    onSuccess: (res) => { if (res?.status === 200) { toast.success('Expense deleted'); refetch() } else toast.error('Failed to delete') },
    onError: () => toast.error('Server error'),
  })

  const { mutate: setAdminStatus, isPending: settingStatus } = useMutation({
    mutationFn: (vars: { row: any; value: string }) => tripsService.updateTripAdminStatus({
      vouchervalue: vars.value,
      voucherdata: { c_number: vars.row.c_number, id: vars.row.id },
      user_id: localStorage.getItem('user_id'),
      user_nm: localStorage.getItem('usr_nm'),
      updated_date: nowStr(),
    }),
    onSuccess: (res) => { if (res?.status === 200) { toast.success('Approval status updated'); refetch() } else toast.error('Failed to update status') },
    onError: () => toast.error('Server error'),
  })

  const handleAction = (action: string, row: any) => {
    if (action === 'edit') {
      if (row.status === 0) { openAdd(row); return }
      if (canActOnExpense(row)) { openEdit(row); return }
      toast.error('This expense is already approved/rejected and can no longer be edited')
      return
    }
    if (action === 'view') {
      if (row.status !== 1) { toast.error('No expense has been filed for this trip yet'); return }
      openView(row)
      return
    }
    if (action === 'delete') {
      if (!canActOnExpense(row)) { toast.error('Cannot delete — not filed yet, or already approved/rejected'); return }
      removeExpense(row)
    }
  }

  // ── Table columns ────────────────────────────────────────────────────────
  const columns: Column[] = [
    { label: 'Sl No', key: '_sl', align: 'center', render: (_v, _r, i) => i + 1 },
    { label: 'Trip Date', key: 'trip_date', render: (v) => String(v ?? '').split('T')[0] },
    { label: 'Reference No', key: 'c_number', render: (v) => <span className="font-bold text-blue-600">{String(v ?? '—')}</span> },
    { label: 'Trip For', key: 'trip_for' },
    { label: 'Bus No', key: 'bus_no' },
    { label: 'Service No', key: 'service_no' },
    { label: 'Driver 1', key: 'driver1_name' },
    { label: 'Driver 2', key: 'driver2_name', render: (v) => <span className="text-slate-500 text-sm">{String(v ?? '—')}</span> },
    { label: 'Helper', key: 'helper_name', render: (v) => <span className="text-slate-500 text-sm">{String(v ?? '—')}</span> },
    {
      label: 'Amount', key: 'grantotal', align: 'right',
      render: (v) => v ? <span className="font-bold text-slate-900">₹{Number(v).toLocaleString('en-IN')}</span> : <span className="text-slate-300">—</span>,
    },
    {
      label: 'Approval', key: 'admin_status',
      render: (_v, row: any) => row.status === 1 ? (
        <select
          value={String(row.admin_status ?? 0)}
          disabled={settingStatus}
          onChange={(e) => setAdminStatus({ row, value: e.target.value })}
          className="text-xs font-bold rounded-lg border px-2 py-1.5 bg-white"
        >
          <option value="0">On Review</option>
          <option value="1">Approve</option>
          <option value="2">Reject</option>
        </select>
      ) : <Badge variant="slate">Not Filed</Badge>,
    },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <PageHeader title="Trip Expenses" subtitle="File and review per-trip driver/helper/conductor expenses" />

      {/* ── Date filter ── */}
      <GlassCard className="p-4" colorBar="bg-gradient-to-r from-red-400 to-rose-500">
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <Label>From Date</Label>
            <Input type="date" max={today} value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-36" />
          </div>
          <div>
            <Label>To Date</Label>
            <Input type="date" max={today} value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-36" />
          </div>
          <Button variant="primary" onClick={() => setApplied({ from: fromDate, to: toDate })} disabled={!fromDate || !toDate}>
            <Search className="w-4 h-4" /> Apply Filter
          </Button>
          {applied && (
            <button
              onClick={() => { setFromDate(''); setToDate(''); setApplied(null) }}
              className="text-xs text-slate-500 hover:text-red-500 font-medium underline"
            >
              Clear
            </button>
          )}
        </div>
      </GlassCard>

      <DataTable
        title={`Trip Expenses (${trips.length})`}
        columns={columns}
        data={trips}
        loading={isLoading}
        onAction={handleAction}
        actions={['edit', 'view', 'delete']}
        icon={<Receipt className="w-5 h-5 text-red-500" />}
      />

      {/* ── Add / Edit modal ── */}
      <AnimatePresence>
        {modal.mode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
                <div>
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-red-500" /> {modal.mode === 'add' ? 'File Trip Expense' : 'Edit Trip Expense'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{modal.row?.c_number}</p>
                </div>
                <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
              </div>

              {loadingModal ? (
                <div className="p-10 text-center text-sm text-slate-400">Loading trip data…</div>
              ) : (
                <div className="p-6 space-y-6">
                  {/* Readonly trip info */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    <div><Label>Trip Date</Label><Input value={form.trip_date} readOnly disabled /></div>
                    <div><Label>Trip For</Label><Input value={form.trip_for} readOnly disabled /></div>
                    <div><Label>Bus Number</Label><Input value={form.bus_no} readOnly disabled /></div>
                    <div><Label>Service Number</Label><Input value={form.service_no} readOnly disabled /></div>
                    <div><Label>Driver1 Name</Label><Input value={form.driver1_name || '—'} readOnly disabled /></div>
                    <div><Label>Driver2 Name</Label><Input value={form.driver2_name || '—'} readOnly disabled /></div>
                    <div><Label>Helper Name</Label><Input value={form.helper_name || '—'} readOnly disabled /></div>
                    <div><Label>Conductor Name</Label><Input value={form.conductor_name || '—'} readOnly disabled /></div>
                    <div><Label>Paid To</Label><Input value={form.paid_to_name || '—'} readOnly disabled /></div>
                  </div>

                  {/* Salary / Beta breakdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
                    <div className="space-y-2">
                      <Label>Driver1 Type</Label>
                      <Badge variant={form.driveronebeta === 'opting' ? 'purple' : 'slate'}>{form.driveronebeta || '—'}</Badge>
                      <Label>Driver1 Beta (₹) <span className="text-red-500">*</span></Label>
                      <Input type="number" value={form.driveronesalary} onChange={(e) => setForm((f) => ({ ...f, driveronesalary: e.target.value }))} />
                      {form.driveronebeta === 'opting' && (
                        <>
                          <Label>Driver1 Salary (₹)</Label>
                          <Input type="number" value={form.driveronesudsalary} onChange={(e) => setForm((f) => ({ ...f, driveronesudsalary: e.target.value }))} />
                        </>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Driver2 Type</Label>
                      <Badge variant={form.drivertwobeta === 'opting' ? 'purple' : 'slate'}>{form.drivertwobeta || '—'}</Badge>
                      <Label>Driver2 Beta (₹) <span className="text-red-500">*</span></Label>
                      <Input type="number" value={form.drivertwosalary} onChange={(e) => setForm((f) => ({ ...f, drivertwosalary: e.target.value }))} />
                      {form.drivertwobeta === 'opting' && (
                        <>
                          <Label>Driver2 Salary (₹)</Label>
                          <Input type="number" value={form.drivertwosudsalary} onChange={(e) => setForm((f) => ({ ...f, drivertwosudsalary: e.target.value }))} />
                        </>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Helper Type</Label>
                      <Badge variant={form.helperbeta === 'opting' ? 'purple' : 'slate'}>{form.helperbeta || '—'}</Badge>
                      <Label>Helper Beta (₹) <span className="text-red-500">*</span></Label>
                      <Input type="number" value={form.helpersalary} onChange={(e) => setForm((f) => ({ ...f, helpersalary: e.target.value }))} />
                      {form.helperbeta === 'opting' && (
                        <>
                          <Label>Helper Salary (₹)</Label>
                          <Input type="number" value={form.helpersudsalary} onChange={(e) => setForm((f) => ({ ...f, helpersudsalary: e.target.value }))} />
                        </>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Conductor Beta (₹) <span className="text-red-500">*</span></Label>
                      <Input type="number" value={form.conductorsalary} onChange={(e) => setForm((f) => ({ ...f, conductorsalary: e.target.value }))} />
                    </div>
                  </div>

                  {/* Remarks */}
                  <div>
                    <Label>Remarks</Label>
                    <textarea rows={2} placeholder="Enter remarks" value={form.remarks}
                      onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none" />
                  </div>

                  {/* Totals */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl border border-slate-200 p-3 text-center">
                      <p className="text-xs font-bold text-slate-500 uppercase">Total Salary</p>
                      <p className="text-lg font-extrabold text-slate-800">₹{totalSalary.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-3 text-center">
                      <p className="text-xs font-bold text-slate-500 uppercase">Total Beta</p>
                      <p className="text-lg font-extrabold text-slate-800">₹{totalBeta.toLocaleString('en-IN')}</p>
                    </div>
                  </div>

                  {/* Debit / Credit ledgers */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2 bg-blue-600">
                        <span className="text-xs font-bold text-white">Debit Accounts</span>
                        <button onClick={() => setDebitRows((r) => [...r, emptyLedgerRow()])} className="inline-flex items-center gap-1 text-xs font-bold text-blue-100 hover:text-white transition-colors">
                          <PlusCircle className="w-3.5 h-3.5" /> Add Row
                        </button>
                      </div>
                      <div className="p-3 space-y-2">
                        {debitRows.map((row, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <div className="flex-[3] min-w-0">
                              <SearchableSelect
                                value={row.ledger ? String(row.ledger.ledger_id) : ''}
                                onChange={(v) => { const l = findLedger(v); setDebitRows((rs) => rs.map((r, idx) => idx === i ? { ...r, ledger: l ? toLedgerObj(l) : null } : r)) }}
                                options={ledgerOptions} placeholder="Select Ledger" onReload={() => reloadLedgers()} reloading={loadingLedgers}
                              />
                            </div>
                            <div className="flex-[2] min-w-0">
                              <Input type="number" placeholder="Amount" value={row.amount} onChange={(e) => setDebitRows((rs) => rs.map((r, idx) => idx === i ? { ...r, amount: e.target.value } : r))} />
                            </div>
                            {debitRows.length > 1 && (
                              <button onClick={() => setDebitRows((rs) => rs.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500 p-1 transition-colors">
                                <MinusCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        {debitTotal > 0 && <div className="text-right text-xs font-extrabold text-blue-700 pt-1">Total: ₹{debitTotal.toLocaleString('en-IN')}</div>}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2 bg-emerald-600">
                        <span className="text-xs font-bold text-white">Credit Accounts</span>
                        <button onClick={() => setCreditRows((r) => [...r, emptyLedgerRow()])} className="inline-flex items-center gap-1 text-xs font-bold text-emerald-100 hover:text-white transition-colors">
                          <PlusCircle className="w-3.5 h-3.5" /> Add Row
                        </button>
                      </div>
                      <div className="p-3 space-y-2">
                        {creditRows.map((row, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <div className="flex-[3] min-w-0">
                              <SearchableSelect
                                value={row.ledger ? String(row.ledger.ledger_id) : ''}
                                onChange={(v) => { const l = findLedger(v); setCreditRows((rs) => rs.map((r, idx) => idx === i ? { ...r, ledger: l ? toLedgerObj(l) : null } : r)) }}
                                options={ledgerOptions} placeholder="Select Ledger" onReload={() => reloadLedgers()} reloading={loadingLedgers}
                              />
                            </div>
                            <div className="flex-[2] min-w-0">
                              <Input type="number" placeholder="Amount" value={row.amount} onChange={(e) => setCreditRows((rs) => rs.map((r, idx) => idx === i ? { ...r, amount: e.target.value } : r))} />
                            </div>
                            {creditRows.length > 1 && (
                              <button onClick={() => setCreditRows((rs) => rs.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500 p-1 transition-colors">
                                <MinusCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        {creditTotal > 0 && <div className="text-right text-xs font-extrabold text-emerald-700 pt-1">Total: ₹{creditTotal.toLocaleString('en-IN')}</div>}
                      </div>
                    </div>
                  </div>

                  {!balanced && (debitTotal > 0 || creditTotal > 0) && (
                    <p className="text-xs font-semibold text-amber-600 text-center">
                      Debit (₹{debitTotal.toLocaleString('en-IN')}) and Credit (₹{creditTotal.toLocaleString('en-IN')}) totals must match before submitting.
                    </p>
                  )}

                  <div className="flex justify-center gap-3 pt-2">
                    <Button variant="ghost" onClick={closeModal}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={submitting} className="px-10">
                      <Save className="w-4 h-4" /> {submitting ? 'Submitting…' : 'Submit'}
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── View modal ── */}
      <AnimatePresence>
        {viewModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setViewModal((v) => ({ ...v, open: false }))}>
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" /> {viewModal.row?.c_number}
                </h3>
                <button onClick={() => setViewModal((v) => ({ ...v, open: false }))} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl">
                  <div><p className="text-[10px] font-bold uppercase text-slate-400">Trip Date</p><p className="text-sm font-medium">{String(viewModal.row?.trip_date ?? '').split('T')[0]}</p></div>
                  <div><p className="text-[10px] font-bold uppercase text-slate-400">Bus No</p><p className="text-sm font-medium">{viewModal.row?.bus_no}</p></div>
                  <div><p className="text-[10px] font-bold uppercase text-slate-400">Service No</p><p className="text-sm font-medium">{viewModal.row?.service_no}</p></div>
                  <div><p className="text-[10px] font-bold uppercase text-slate-400">Driver 1</p><p className="text-sm font-medium">{viewModal.row?.driver1_name || '—'}</p></div>
                  <div><p className="text-[10px] font-bold uppercase text-slate-400">Driver 2</p><p className="text-sm font-medium">{viewModal.row?.driver2_name || '—'}</p></div>
                  <div><p className="text-[10px] font-bold uppercase text-slate-400">Helper</p><p className="text-sm font-medium">{viewModal.row?.helper_name || '—'}</p></div>
                  <div><p className="text-[10px] font-bold uppercase text-slate-400">Conductor</p><p className="text-sm font-medium">{viewModal.row?.conductor_name || '—'}</p></div>
                  <div><p className="text-[10px] font-bold uppercase text-slate-400">Paid To</p><p className="text-sm font-medium">{viewModal.row?.paid_to_name || '—'}</p></div>
                  <div><p className="text-[10px] font-bold uppercase text-slate-400">Amount</p><p className="text-sm font-bold text-slate-900">₹{Number(viewModal.row?.grantotal ?? 0).toLocaleString('en-IN')}</p></div>
                </div>
                {viewModal.row?.remarks && (
                  <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl">
                    <p className="text-xs font-bold uppercase text-slate-500 mb-1">Remarks</p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{viewModal.row.remarks}</p>
                  </div>
                )}
                {viewModal.loading ? (
                  <p className="text-center text-sm text-slate-400 py-4">Loading ledger entries…</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className="px-4 py-2 bg-blue-600 text-xs font-bold text-white">Debit Account</div>
                      <div className="divide-y divide-slate-100">
                        {viewModal.debit.length === 0 && <div className="p-3 text-sm text-slate-400">No entries</div>}
                        {viewModal.debit.map((item, i) => (
                          <div key={i} className="flex justify-between px-4 py-2 text-sm">
                            <span>{item.expensives}</span><span className="font-semibold">₹{item.amount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className="px-4 py-2 bg-emerald-600 text-xs font-bold text-white">Credit Account</div>
                      <div className="divide-y divide-slate-100">
                        {viewModal.credit.length === 0 && <div className="p-3 text-sm text-slate-400">No entries</div>}
                        {viewModal.credit.map((item, i) => (
                          <div key={i} className="flex justify-between px-4 py-2 text-sm">
                            <span>{item.expensives}</span><span className="font-semibold">₹{item.amount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
