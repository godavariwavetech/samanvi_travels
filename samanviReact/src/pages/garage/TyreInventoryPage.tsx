import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { CircleDot, Save, Plus, X, Edit2, Truck, ShoppingCart, MinusCircle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Select, Label, DataTable, Badge, PageHeader, SearchableSelect } from '@/components/shared'
import type { Column } from '@/components/shared'
import { garageService } from '@/services/garage.service'
import { mainmastersService } from '@/services/mainmasters.service'
import { fuelService } from '@/services/fuel.service'
import { accountingService } from '@/services/accounting.service'

const STATUSES = ['In Stock', 'In Use', 'Retreaded', 'Scrapped', 'Sold', 'Pending Retread']

const EMPTY_FORM = { brand: '', size: '', serial_no: '', purchase_date: '', cost: '', status: 'In Stock', remarks: '' }

type PositionRow = { brand: string; size: string; serial_no: string; remarks: string }
const emptyPositionRow = (): PositionRow => ({ brand: '', size: '', serial_no: '', remarks: '' })

type LedgerEntry = { ledger_id: string; amount: string; ledger_name: string }
const emptyLedgerEntry = (): LedgerEntry => ({ ledger_id: '', amount: '', ledger_name: '' })

const today = new Date().toISOString().split('T')[0]

const statusVariant: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'purple' | 'teal'> = {
  'In Stock': 'success', 'In Use': 'info', Retreaded: 'warning', Scrapped: 'danger', Sold: 'purple', 'Pending Retread': 'teal',
}

function fmtDate(v: any) {
  if (!v) return '—'
  const d = new Date(v)
  if (isNaN(d.getTime())) return String(v)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function TyreInventoryPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [editCode, setEditCode] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})

  const [entryMode, setEntryMode] = useState<'new' | 'with_bus'>('new')
  const [busNumber, setBusNumber] = useState('')
  const [busPurchaseDate, setBusPurchaseDate] = useState('')
  const [busOdometer, setBusOdometer] = useState('')
  const [selectedPositions, setSelectedPositions] = useState<string[]>([])
  const [positionRows, setPositionRows] = useState<Record<string, PositionRow>>({})

  const [ledgerDescription, setLedgerDescription] = useState('')
  const [debit, setDebit] = useState<LedgerEntry[]>([emptyLedgerEntry()])
  const [credit, setCredit] = useState<LedgerEntry[]>([emptyLedgerEntry()])

  const { data, isLoading } = useQuery({ queryKey: ['tyre-inventory'], queryFn: () => garageService.getTyreInventory() })
  const list: any[] = data?.data ?? []

  const { data: sizes, refetch: reloadSizes, isFetching: loadingSizes } = useQuery({ queryKey: ['tyre-sizes'], queryFn: () => mainmastersService.getTyreSizes() })
  const sizeList: any[] = sizes?.data ?? []

  const { data: makes, refetch: reloadMakes, isFetching: loadingMakes } = useQuery({ queryKey: ['tyre-makes'], queryFn: () => mainmastersService.getTyreMakes() })
  const makeList: any[] = makes?.data ?? []

  const { data: positions, refetch: reloadPositions, isFetching: loadingPositions } = useQuery({ queryKey: ['tyre-positions-master'], queryFn: () => mainmastersService.getTyrePositionsMaster() })
  const positionList: any[] = positions?.data ?? []

  const { data: buses, refetch: reloadBuses, isFetching: loadingBuses } = useQuery({ queryKey: ['buses'], queryFn: () => fuelService.getBusNumbers() })
  const busList: any[] = buses?.data ?? []

  const { data: ledgersData, refetch: reloadLedgers, isFetching: loadingLedgers } = useQuery({ queryKey: ['ledger-names-tyre'], queryFn: () => accountingService.getLedgerName() })
  const ledgerList: any[] = ledgersData?.data ?? []
  const ledgerOptions = ledgerList.map((l: any) => ({ value: String(l.id), label: l.temple_name || l.name || '' }))

  // Standalone tyre purchases are stock coming in, so default the debit side
  // to the "New Tyres In Stock" ledger instead of leaving it for the user to
  // hunt down every time — only while that row is still untouched.
  useEffect(() => {
    if (!showForm || isEdit || entryMode !== 'new') return
    if (debit.length !== 1 || debit[0].ledger_id) return
    const defaultLedger = ledgerList.find((l: any) => (l.temple_name || l.name) === 'New Tyres In Stock')
    if (!defaultLedger) return
    setDebit([{ ledger_id: String(defaultLedger.id), amount: debit[0].amount, ledger_name: defaultLedger.temple_name || defaultLedger.name || '' }])
  }, [showForm, isEdit, entryMode, ledgerList, debit])

  const f = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((s) => ({ ...s, [k]: e.target.value }))

  // Cost drives the ledger amounts by default — keeps the voucher balanced to
  // the tyre's price without retyping it, as long as the entry is still a
  // single debit/credit line (once split across rows, leave it to the user).
  const handleCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setForm((s) => ({ ...s, cost: val }))
    setDebit((rows) => rows.length === 1 ? [{ ...rows[0], amount: val }] : rows)
    setCredit((rows) => rows.length === 1 ? [{ ...rows[0], amount: val }] : rows)
  }

  const debitTotal = debit.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
  const creditTotal = credit.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
  const hasLedgerEntry = debit.some(e => e.ledger_id && e.amount) || credit.some(e => e.ledger_id && e.amount)
  const isBalanced = debitTotal > 0 && Math.round(debitTotal * 100) === Math.round(creditTotal * 100)

  const buildPayload = () => ({
    ...form,
    id: editId,
    ledger_description: ledgerDescription,
    debit_ledgers: debit.filter(e => e.ledger_id && e.amount),
    credit_ledgers: credit.filter(e => e.ledger_id && e.amount),
    user_id: localStorage.getItem('user_id'),
    usr_nm: localStorage.getItem('usr_nm'),
  })

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => {
      if (hasLedgerEntry && !isBalanced) return Promise.reject(new Error('ledger mismatch'))
      return isEdit ? garageService.editTyre(buildPayload()) : garageService.addTyre(buildPayload())
    },
    onSuccess: (res) => {
      if (res.status === 200) { toast.success(isEdit ? 'Tyre updated!' : 'Tyre added!'); qc.invalidateQueries({ queryKey: ['tyre-inventory'] }); closeForm() }
      else toast.error('Failed to save')
    },
    onError: (err: any) => toast.error(err?.message === 'ledger mismatch' ? 'Debit and credit totals must match exactly before saving.' : 'Server error'),
  })

  const selectBus = (busNo: string) => {
    setBusNumber(busNo)
    const bus = busList.find((b: any) => b.bus_no === busNo)
    setBusPurchaseDate(today)
    setBusOdometer(bus?.odometer != null ? String(bus.odometer) : '')
  }

  const togglePosition = (posName: string) => {
    setSelectedPositions((prev) => prev.includes(posName) ? prev.filter((p) => p !== posName) : [...prev, posName])
    setPositionRows((rows) => {
      if (rows[posName]) { const { [posName]: _drop, ...rest } = rows; return rest }
      return { ...rows, [posName]: emptyPositionRow() }
    })
  }

  const setPositionField = (pos: string, k: keyof PositionRow) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setPositionRows((rows) => ({ ...rows, [pos]: { ...(rows[pos] ?? emptyPositionRow()), [k]: e.target.value } }))
  const setPositionSelect = (pos: string, k: keyof PositionRow) => (v: string) =>
    setPositionRows((rows) => ({ ...rows, [pos]: { ...(rows[pos] ?? emptyPositionRow()), [k]: v } }))

  const { mutate: saveWithBus, isPending: savingWithBus } = useMutation({
    mutationFn: async () => {
      const user_id = localStorage.getItem('user_id')
      const usr_nm = localStorage.getItem('usr_nm')
      for (const pos of selectedPositions) {
        const row = positionRows[pos] ?? emptyPositionRow()
        const addRes: any = await garageService.addTyre({ ...row, purchase_date: busPurchaseDate || today, status: 'In Use', user_id, usr_nm })
        const tyreId = addRes?.data?.insertId
        if (!tyreId) throw new Error('tyre-create-failed')
        await garageService.assignTyrePosition({
          tyre_id: tyreId, vehicle_number: busNumber, position: pos,
          fitted_date: busPurchaseDate || today, odometer_at_fitting: busOdometer || null, user_id, usr_nm,
        })
      }
    },
    onSuccess: () => {
      toast.success('Tyres added and mounted on bus!')
      qc.invalidateQueries({ queryKey: ['tyre-inventory'] })
      qc.invalidateQueries({ queryKey: ['tyre-positions'] })
      closeForm()
    },
    onError: () => toast.error('Failed to save tyres'),
  })

  const handleEdit = (row: any) => {
    setForm({
      brand: row.brand ?? '', size: row.size ?? '', serial_no: row.serial_no ?? '',
      purchase_date: row.purchase_date ?? '', cost: row.cost ?? '', status: row.status ?? 'In Stock',
      remarks: row.remarks ?? '',
    })
    setEditCode(row.tyre_code ?? '')
    setIsEdit(true); setEditId(row.id); setShowForm(true)
  }

  const handleDelete = (row: any) => {
    garageService.deleteTyre({ id: row.id }).then((res) => {
      if (res.status === 200) { toast.success('Tyre removed'); qc.invalidateQueries({ queryKey: ['tyre-inventory'] }) }
      else toast.error('Failed')
    })
  }

  const openAdd = () => {
    setForm(EMPTY_FORM); setIsEdit(false); setEditId(null); setEditCode(''); setShowForm(true)
    setEntryMode('new'); setBusNumber(''); setBusPurchaseDate(''); setBusOdometer(''); setSelectedPositions([]); setPositionRows({})
    setLedgerDescription(''); setDebit([emptyLedgerEntry()]); setCredit([emptyLedgerEntry()])
  }
  const closeForm = () => {
    setShowForm(false); setForm(EMPTY_FORM); setIsEdit(false); setEditId(null); setEditCode('')
    setEntryMode('new'); setBusNumber(''); setBusPurchaseDate(''); setBusOdometer(''); setSelectedPositions([]); setPositionRows({})
    setLedgerDescription(''); setDebit([emptyLedgerEntry()]); setCredit([emptyLedgerEntry()])
  }

  const cols: Column[] = [
    { label: 'Sl No', key: '_idx', align: 'center', render: (_v, _row, i) => <span className="text-sm text-slate-500">{i + 1}</span> },
    { label: 'Tyre Code', key: 'tyre_code', filterable: true, render: (v) => <span className="font-bold text-blue-600">{String(v)}</span> },
    { label: 'Serial No', key: 'serial_no', filterable: true, render: (v) => <span className="text-slate-600">{v || '—'}</span> },
    { label: 'Make', key: 'brand', filterable: true },
    { label: 'Size', key: 'size', filterable: true },
    { label: 'Status', key: 'status', filterable: true, render: (v) => <Badge variant={statusVariant[String(v)] ?? 'default'}>{String(v)}</Badge> },
    { label: 'Current Vehicle', key: 'current_vehicle_number', filterable: true, render: (v) => v ? <span className="font-medium">{String(v)}</span> : <span className="text-slate-300">—</span> },
    { label: 'Position', key: 'current_position', filterable: true, render: (v) => v ? <Badge variant="purple">{String(v)}</Badge> : <span className="text-slate-300">—</span> },
    { label: 'Purchased', key: 'purchase_date', filterable: true, render: (v) => <span className="text-sm">{fmtDate(v)}</span> },
    { label: 'Cost', key: 'cost', align: 'right', filterable: true, render: (v) => <span className="font-medium">₹{v}</span> },
    { label: 'Voucher', key: 'voucher_number', filterable: true, render: (v) => v ? <Badge variant="purple">{String(v)}</Badge> : <span className="text-slate-300">—</span> },
    { label: 'Ledgers', key: 'ledger_summary', filterable: true, render: (v) => {
      if (!v) return <span className="text-slate-300">—</span>
      const parts = String(v).split(' | ')
      return (
        <div className="flex flex-col gap-1">
          {parts.map((p, i) => {
            const isDebit = p.startsWith('Debit')
            const text = p.replace(/^(Debit|Credit) Account: /, '')
            return (
              <span key={i} className={`text-xs font-semibold px-2 py-0.5 rounded-full w-fit whitespace-nowrap ${isDebit ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
                {isDebit ? 'Dr' : 'Cr'} {text}
              </span>
            )
          })}
        </div>
      )
    } },
  ]

  const canSaveNew = !!form.brand.trim() && (!hasLedgerEntry || isBalanced)
  const canSaveWithBus = !!busNumber && selectedPositions.length > 0 && selectedPositions.every((p) => (positionRows[p]?.brand ?? '').trim())
  const canSave = isEdit ? !!form.brand.trim() : entryMode === 'new' ? canSaveNew : canSaveWithBus
  const saving = isPending || savingWithBus

  const handleSaveClick = () => {
    if (!isEdit && entryMode === 'with_bus') saveWithBus()
    else save()
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex justify-between items-end">
        <PageHeader title="New Tyre Entry" subtitle="Manage the tyre stock and lifecycle status" />
        {!showForm && <Button onClick={openAdd}><Plus className="w-4 h-4" /> Add Tyre</Button>}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
            <GlassCard className="p-6" colorBar={isEdit ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-blue-500 to-cyan-500'}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  {isEdit ? <><Edit2 className="w-5 h-5 text-amber-500" /> Edit Tyre</> : <><CircleDot className="w-5 h-5 text-blue-500" /> Add Tyre</>}
                </h2>
                <button onClick={closeForm} className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
              </div>

              {isEdit && (
                <div className="mb-5">
                  <Label>Tyre ID</Label>
                  <div className="h-10 flex items-center px-3 rounded-xl bg-slate-50 border border-slate-200 font-bold text-blue-600 max-w-xs">{editCode}</div>
                </div>
              )}

              {!isEdit && (
                <div className="mb-6">
                  <Label>How is this tyre being added?</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                    <button
                      type="button"
                      onClick={() => setEntryMode('with_bus')}
                      className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-colors ${entryMode === 'with_bus' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                      <Truck className={`w-5 h-5 ${entryMode === 'with_bus' ? 'text-blue-600' : 'text-slate-400'}`} />
                      <div>
                        <div className="text-sm font-bold text-slate-800">Came With Bus</div>
                        <div className="text-xs text-slate-500">Tyres fitted on a bus at purchase — no separate accounting entry</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEntryMode('new')}
                      className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-colors ${entryMode === 'new' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                      <ShoppingCart className={`w-5 h-5 ${entryMode === 'new' ? 'text-blue-600' : 'text-slate-400'}`} />
                      <div>
                        <div className="text-sm font-bold text-slate-800">Bought Separately</div>
                        <div className="text-xs text-slate-500">New standalone purchase — ledger entry and voucher will be created</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {(isEdit || entryMode === 'new') && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div><Label>Serial No</Label><Input placeholder="e.g. SN-8842190" value={form.serial_no} onChange={f('serial_no')} /></div>
                  <div>
                    <Label>Make <span className="text-red-500">*</span></Label>
                    <SearchableSelect
                      value={form.brand}
                      onChange={(v) => setForm((s) => ({ ...s, brand: v }))}
                      options={makeList.map((m) => ({ value: m.make_name, label: m.make_name }))}
                      placeholder="Select make"
                      onReload={() => reloadMakes()}
                      reloading={loadingMakes}
                    />
                  </div>
                  <div>
                    <Label>Size of Tyre</Label>
                    <SearchableSelect
                      value={form.size}
                      onChange={(v) => setForm((s) => ({ ...s, size: v }))}
                      options={sizeList.map((s) => ({ value: s.size_name, label: s.size_name }))}
                      placeholder="Select size"
                      onReload={() => reloadSizes()}
                      reloading={loadingSizes}
                    />
                  </div>
                  <div><Label>Purchase Date</Label><Input type="date" max={today} value={form.purchase_date} onChange={f('purchase_date')} /></div>
                  <div><Label>Cost (₹)</Label><Input type="number" value={form.cost} onChange={handleCostChange} /></div>
                  {isEdit && (
                    <div><Label>Status</Label>
                      <Select value={form.status} onChange={f('status')}>
                        {STATUSES.map((s) => <option key={s}>{s}</option>)}
                      </Select></div>
                  )}
                  <div className="md:col-span-3"><Label>Remarks</Label><Input value={form.remarks} onChange={f('remarks')} /></div>
                </div>
              )}

              {!isEdit && entryMode === 'new' && (
                <div className="pt-5 mt-5 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-slate-700">Accounting Entry (optional)</h4>
                    {hasLedgerEntry && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isBalanced ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {isBalanced ? 'Balanced' : `Mismatch — Dr ₹${debitTotal.toLocaleString('en-IN')} / Cr ₹${creditTotal.toLocaleString('en-IN')}`}
                      </span>
                    )}
                  </div>
                  <Input
                    className="mb-3"
                    placeholder="Voucher narration (optional)"
                    value={ledgerDescription}
                    onChange={(e) => setLedgerDescription(e.target.value)}
                  />
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
                      <div>
                        <div className="flex items-center justify-between px-4 py-2 bg-blue-600">
                          <span className="text-xs font-bold text-white">Debit Accounts</span>
                          <button onClick={() => setDebit(rows => [...rows, emptyLedgerEntry()])} className="inline-flex items-center gap-1 text-xs font-bold text-blue-100 hover:text-white transition-colors"><Plus className="w-3 h-3" /> Add Row</button>
                        </div>
                        <div className="p-3 space-y-2">
                          {debit.map((entry, i) => (
                            <div key={i} className="flex gap-2 items-center">
                              <div className="flex-[3] min-w-0">
                                <SearchableSelect value={entry.ledger_id} displayLabel={entry.ledger_name}
                                  onChange={v => { const nm = ledgerList.find((l: any) => String(l.id) === v)?.temple_name || ''; setDebit(rows => rows.map((r, ri) => ri !== i ? r : { ...r, ledger_id: v, ledger_name: nm })) }}
                                  options={ledgerOptions} placeholder="Select Ledger" onReload={() => reloadLedgers()} reloading={loadingLedgers} />
                              </div>
                              <div className="flex-[2] min-w-0">
                                <Input type="number" placeholder="Amount" value={entry.amount}
                                  onChange={e => setDebit(rows => rows.map((r, ri) => ri !== i ? r : { ...r, amount: e.target.value }))} />
                              </div>
                              {debit.length > 1 && (
                                <button onClick={() => setDebit(rows => rows.filter((_, ri) => ri !== i))} className="text-slate-400 hover:text-red-500 p-1 transition-colors"><MinusCircle className="w-4 h-4" /></button>
                              )}
                            </div>
                          ))}
                          {debitTotal > 0 && <div className="text-right text-xs font-extrabold text-blue-700 pt-1">Total: ₹{debitTotal.toLocaleString('en-IN')}</div>}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between px-4 py-2 bg-emerald-600">
                          <span className="text-xs font-bold text-white">Credit Accounts</span>
                          <button onClick={() => setCredit(rows => [...rows, emptyLedgerEntry()])} className="inline-flex items-center gap-1 text-xs font-bold text-emerald-100 hover:text-white transition-colors"><Plus className="w-3 h-3" /> Add Row</button>
                        </div>
                        <div className="p-3 space-y-2">
                          {credit.map((entry, i) => (
                            <div key={i} className="flex gap-2 items-center">
                              <div className="flex-[3] min-w-0">
                                <SearchableSelect value={entry.ledger_id} displayLabel={entry.ledger_name}
                                  onChange={v => { const nm = ledgerList.find((l: any) => String(l.id) === v)?.temple_name || ''; setCredit(rows => rows.map((r, ri) => ri !== i ? r : { ...r, ledger_id: v, ledger_name: nm })) }}
                                  options={ledgerOptions} placeholder="Select Ledger" onReload={() => reloadLedgers()} reloading={loadingLedgers} />
                              </div>
                              <div className="flex-[2] min-w-0">
                                <Input type="number" placeholder="Amount" value={entry.amount}
                                  onChange={e => setCredit(rows => rows.map((r, ri) => ri !== i ? r : { ...r, amount: e.target.value }))} />
                              </div>
                              {credit.length > 1 && (
                                <button onClick={() => setCredit(rows => rows.filter((_, ri) => ri !== i))} className="text-slate-400 hover:text-red-500 p-1 transition-colors"><MinusCircle className="w-4 h-4" /></button>
                              )}
                            </div>
                          ))}
                          {creditTotal > 0 && <div className="text-right text-xs font-extrabold text-emerald-700 pt-1">Total: ₹{creditTotal.toLocaleString('en-IN')}</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!isEdit && entryMode === 'with_bus' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div><Label>Bus <span className="text-red-500">*</span></Label>
                      <SearchableSelect
                        value={busNumber}
                        onChange={selectBus}
                        options={busList.map((b) => ({ value: b.bus_no, label: b.bus_no }))}
                        placeholder="Select Bus"
                        onReload={() => reloadBuses()}
                        reloading={loadingBuses}
                      /></div>
                    <div><Label>Purchase Date</Label><Input type="date" max={today} value={busPurchaseDate} onChange={(e) => setBusPurchaseDate(e.target.value)} /></div>
                    <div><Label>Odometer</Label><Input type="number" placeholder="km" value={busOdometer} onChange={(e) => setBusOdometer(e.target.value)} /></div>
                  </div>

                  <div>
                    <Label>Tyre Positions <span className="text-red-500">*</span> (select all that apply)</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {positionList.length === 0 && (
                        <span className="text-xs text-slate-400 italic py-2">No positions configured yet — add them in Tyre Masters.</span>
                      )}
                      {positionList.map((p: any) => {
                        const active = selectedPositions.includes(p.position_name)
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => togglePosition(p.position_name)}
                            className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}
                          >
                            {p.position_name}
                          </button>
                        )
                      })}
                      <button
                        type="button"
                        onClick={() => reloadPositions()}
                        disabled={loadingPositions}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold border border-slate-200 text-slate-400 hover:text-slate-600 disabled:opacity-50"
                      >
                        {loadingPositions ? 'Reloading…' : 'Reload'}
                      </button>
                    </div>
                  </div>

                  {selectedPositions.length > 0 && (
                    <div className="space-y-4">
                      {selectedPositions.map((pos) => {
                        const row = positionRows[pos] ?? emptyPositionRow()
                        return (
                          <div key={pos} className="rounded-xl border border-slate-200 p-4">
                            <h4 className="text-sm font-bold text-blue-600 mb-3">{pos}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div><Label>Serial No</Label><Input placeholder="e.g. SN-8842190" value={row.serial_no} onChange={setPositionField(pos, 'serial_no')} /></div>
                              <div>
                                <Label>Make <span className="text-red-500">*</span></Label>
                                <SearchableSelect
                                  value={row.brand}
                                  onChange={setPositionSelect(pos, 'brand')}
                                  options={makeList.map((m) => ({ value: m.make_name, label: m.make_name }))}
                                  placeholder="Select make"
                                  onReload={() => reloadMakes()}
                                  reloading={loadingMakes}
                                />
                              </div>
                              <div>
                                <Label>Size of Tyre</Label>
                                <SearchableSelect
                                  value={row.size}
                                  onChange={setPositionSelect(pos, 'size')}
                                  options={sizeList.map((s) => ({ value: s.size_name, label: s.size_name }))}
                                  placeholder="Select size"
                                  onReload={() => reloadSizes()}
                                  reloading={loadingSizes}
                                />
                              </div>
                              <div className="md:col-span-3"><Label>Remarks</Label><Input value={row.remarks} onChange={setPositionField(pos, 'remarks')} /></div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <Button onClick={handleSaveClick} disabled={saving || !canSave}>
                  <Save className="w-4 h-4" />{saving ? 'Saving…' : isEdit ? 'Update Tyre' : 'Save Tyre'}
                </Button>
                <Button variant="ghost" onClick={closeForm}><X className="w-4 h-4" /> Cancel</Button>
                {!isEdit && entryMode === 'new' && hasLedgerEntry && !isBalanced && (
                  <span className="text-xs font-semibold text-red-600">Debit and credit totals must match exactly before saving.</span>
                )}
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      <DataTable
        title="Tyre Inventory"
        columns={cols}
        data={list}
        loading={isLoading}
        onAction={(action, row) => { if (action === 'edit') handleEdit(row); if (action === 'delete') handleDelete(row) }}
        actions={['edit', 'delete']}
        icon={<CircleDot className="w-5 h-5 text-blue-500" />}
        columnFilters={columnFilters}
        onColumnFilterChange={(k, v) => setColumnFilters((prev) => ({ ...prev, [k]: v }))}
      />
    </motion.div>
  )
}
