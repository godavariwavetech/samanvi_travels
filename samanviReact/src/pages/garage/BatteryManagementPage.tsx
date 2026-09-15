import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { BatteryCharging, Save, Plus, X, Edit2, MinusCircle, History, Clock, Truck, ShoppingCart } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Select, Label, DataTable, Badge, PageHeader, SearchableSelect } from '@/components/shared'
import type { Column } from '@/components/shared'
import { garageService } from '@/services/garage.service'
import { fuelService } from '@/services/fuel.service'
import { accountingService } from '@/services/accounting.service'
import ChangeNote from '@/components/shared/ChangeNote'
import { formatDate, ledgerOption } from '@/lib/utils'

const STATUSES = ['Active', 'Replaced', 'Scrapped']

type LedgerEntry = { ledger_id: string; amount: string; ledger_name: string }
const emptyLedgerEntry = (): LedgerEntry => ({ ledger_id: '', amount: '', ledger_name: '' })

const EMPTY_FORM = {
  battery_code: '', brand: '', capacity_ah: '', vehicle_number: '', install_date: '',
  warranty_months: '', cost: '', status: 'Active', remarks: '', voucher_number: '',
}

const today = new Date().toISOString().split('T')[0]

const statusVariant: Record<string, 'success' | 'warning' | 'danger'> = {
  Active: 'success', Replaced: 'warning', Scrapped: 'danger',
}

function fmtDateTime(d: any) {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return String(d)
  return dt.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })
}

export default function BatteryManagementPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})
  const [entryMode, setEntryMode] = useState<'new' | 'with_bus'>('new')
  const [ledgerDescription, setLedgerDescription] = useState('')
  const [debit, setDebit] = useState<LedgerEntry[]>([emptyLedgerEntry()])
  const [credit, setCredit] = useState<LedgerEntry[]>([emptyLedgerEntry()])
  const [historyModal, setHistoryModal] = useState<{ open: boolean; battery: any }>({ open: false, battery: null })

  const { data, isLoading } = useQuery({ queryKey: ['batteries'], queryFn: () => garageService.getBatteries() })
  const { data: buses, refetch: reloadBuses, isFetching: loadingBuses } = useQuery({ queryKey: ['buses'], queryFn: () => fuelService.getBusNumbers() })
  const { data: brandsData, refetch: reloadBrands, isFetching: loadingBrands } = useQuery({ queryKey: ['battery-brands'], queryFn: () => garageService.getBatteryBrands() })
  const { data: capacitiesData, refetch: reloadCapacities, isFetching: loadingCapacities } = useQuery({ queryKey: ['battery-capacities'], queryFn: () => garageService.getBatteryCapacities() })
  const { data: ledgersData, refetch: reloadLedgers, isFetching: loadingLedgers } = useQuery({ queryKey: ['ledger-names-battery'], queryFn: () => accountingService.getLedgerName() })

  const { data: batteryLedgersRaw } = useQuery({
    queryKey: ['battery-ledgers', editId],
    queryFn: () => garageService.getBatteryLedgers({ id: editId }),
    enabled: isEdit && !!editId,
  })

  const { data: historyRaw, isLoading: loadingHistory } = useQuery({
    queryKey: ['battery-history', historyModal.battery?.id],
    queryFn: () => garageService.getBatteryHistory({ battery_id: historyModal.battery?.id }),
    enabled: historyModal.open && !!historyModal.battery?.id,
  })

  const list: any[] = data?.data ?? []
  const busList: any[] = buses?.data ?? []
  const brandList: any[] = brandsData?.data ?? []
  const capacityList: any[] = capacitiesData?.data ?? []
  const ledgerList: any[] = ledgersData?.data ?? []
  const historyList: any[] = historyRaw?.data ?? []

  const brandOptions = brandList.map((b: any) => ({ value: b.brand_name, label: b.brand_name }))
  const capacityOptions = capacityList.map((c: any) => ({ value: c.capacity_ah, label: c.capacity_ah }))
  const ledgerOptions = ledgerList.map((l: any) => ledgerOption(l))

  // Prefill debit/credit rows from the battery's linked voucher once it loads (edit mode)
  useEffect(() => {
    if (!isEdit) return
    const rows: any[] = batteryLedgersRaw?.data ?? []
    if (rows.length === 0) return
    const toEntry = (r: any): LedgerEntry => ({ ledger_id: String(r.ledger_id), amount: String(r.amount), ledger_name: r.ledger_name || '' })
    const d = rows.filter(r => r.account_type === 'Debit Account').map(toEntry)
    const c = rows.filter(r => r.account_type === 'Credit Account').map(toEntry)
    if (d.length) setDebit(d)
    if (c.length) setCredit(c)
  }, [batteryLedgersRaw, isEdit])

  // Auto-fill the battery cost into the ledger amount whenever there's a single
  // debit/credit row — mirrors the parts-total auto-sync used on job vouchers.
  useEffect(() => {
    if (!form.cost) return
    setDebit(rows => rows.length === 1 ? [{ ...rows[0], amount: form.cost }] : rows)
    setCredit(rows => rows.length === 1 ? [{ ...rows[0], amount: form.cost }] : rows)
  }, [form.cost])

  const f = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((s) => ({ ...s, [k]: e.target.value }))
  const setField = (k: keyof typeof EMPTY_FORM) => (v: string) => setForm((s) => ({ ...s, [k]: v }))

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
    userid: localStorage.getItem('user_id'),
  })

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => {
      if (hasLedgerEntry && !isBalanced) {
        return Promise.reject(new Error('ledger mismatch'))
      }
      return isEdit ? garageService.editBattery(buildPayload()) : garageService.addBattery(buildPayload())
    },
    onSuccess: (res) => {
      if (res.status === 200) { toast.success(isEdit ? 'Battery updated!' : 'Battery added!'); qc.invalidateQueries({ queryKey: ['batteries'] }); closeForm() }
      else toast.error('Failed to save')
    },
    onError: (err: any) => toast.error(err?.message === 'ledger mismatch' ? 'Debit and credit totals must match exactly before saving.' : 'Server error'),
  })

  const handleEdit = (row: any) => {
    setForm({
      battery_code: row.battery_code ?? '', brand: row.brand ?? '', capacity_ah: row.capacity_ah ?? '',
      vehicle_number: row.vehicle_number ?? '', install_date: row.install_date ?? '',
      warranty_months: row.warranty_months ?? '', cost: row.cost ?? '', status: row.status ?? 'Active',
      remarks: row.remarks ?? '', voucher_number: row.voucher_number ?? '',
    })
    setLedgerDescription('')
    setDebit([emptyLedgerEntry()])
    setCredit([emptyLedgerEntry()])
    setEntryMode('new')
    setIsEdit(true); setEditId(row.id); setShowForm(true)
  }

  const handleDelete = (row: any) => {
    garageService.deleteBattery({ id: row.id }).then((res) => {
      if (res.status === 200) { toast.success('Battery removed'); qc.invalidateQueries({ queryKey: ['batteries'] }) }
      else toast.error('Failed')
    })
  }

  const openAdd = () => {
    setForm(EMPTY_FORM); setLedgerDescription(''); setDebit([emptyLedgerEntry()]); setCredit([emptyLedgerEntry()])
    setEntryMode('new'); setIsEdit(false); setEditId(null); setShowForm(true)
  }
  const closeForm = () => {
    setShowForm(false); setForm(EMPTY_FORM); setLedgerDescription('')
    setDebit([emptyLedgerEntry()]); setCredit([emptyLedgerEntry()])
    setEntryMode('new'); setIsEdit(false); setEditId(null)
  }

  const cols: Column[] = [
    { label: 'Sl No', key: '_idx', align: 'center', render: (_v, _row, i) => <span className="text-sm text-slate-500">{i + 1}</span> },
    { label: 'Battery Code', key: 'battery_code', filterable: true, render: (v) => <span className="font-bold text-blue-600">{String(v)}</span> },
    { label: 'Brand', key: 'brand', filterable: true },
    { label: 'Capacity', key: 'capacity_ah', filterable: true },
    { label: 'Vehicle', key: 'vehicle_number', filterable: true, render: (v) => v ? <span className="font-medium">{String(v)}</span> : <span className="text-slate-300">—</span> },
    { label: 'Installed', key: 'install_date', align: 'center', render: (v) => <span className="text-sm">{formatDate(v)}</span> },
    { label: 'Warranty (mo)', key: 'warranty_months', align: 'right', render: (v) => <span className="text-sm">{v ?? '—'}</span> },
    { label: 'Status', key: 'status', filterable: true, render: (v) => <Badge variant={statusVariant[String(v)] ?? 'default'}>{String(v)}</Badge> },
    { label: 'Cost', key: 'cost', align: 'right', render: (v) => <span className="font-medium">₹{v}</span> },
    {
      label: 'Voucher', key: 'voucher_number', filterable: true,
      render: (v) => v ? <Badge variant="purple">{String(v)}</Badge> : <span className="text-slate-300">—</span>,
    },
  ]

  const canSaveNew = !!form.battery_code && (!hasLedgerEntry || isBalanced)
  const canSaveWithBus = !!form.battery_code && !!form.vehicle_number
  const canSave = isEdit ? canSaveNew : entryMode === 'new' ? canSaveNew : canSaveWithBus

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex justify-between items-end">
        <PageHeader title="Battery Management" subtitle="Track battery installs, warranty and lifecycle status" />
        {!showForm && <Button onClick={openAdd}><Plus className="w-4 h-4" /> Add Battery</Button>}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
            <GlassCard className="p-6" colorBar={isEdit ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-blue-500 to-cyan-500'}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  {isEdit ? <><Edit2 className="w-5 h-5 text-amber-500" /> Edit Battery</> : <><BatteryCharging className="w-5 h-5 text-blue-500" /> Add Battery</>}
                </h2>
                <button onClick={closeForm} className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
              </div>

              {!isEdit && (
                <div className="mb-6">
                  <Label>How is this battery being added?</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                    <button
                      type="button"
                      onClick={() => setEntryMode('with_bus')}
                      className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-colors ${entryMode === 'with_bus' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                      <Truck className={`w-5 h-5 ${entryMode === 'with_bus' ? 'text-blue-600' : 'text-slate-400'}`} />
                      <div>
                        <div className="text-sm font-bold text-slate-800">Came With Bus</div>
                        <div className="text-xs text-slate-500">Battery fitted on a bus at purchase — no separate accounting entry</div>
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div><Label>Battery Code *</Label><Input placeholder="e.g. BAT-1001" value={form.battery_code} onChange={f('battery_code')} /></div>
                <div><Label>Brand</Label>
                  <SearchableSelect value={form.brand} onChange={setField('brand')} options={brandOptions} placeholder="Select Brand" onReload={() => reloadBrands()} reloading={loadingBrands} /></div>
                <div><Label>Capacity</Label>
                  <SearchableSelect value={form.capacity_ah} onChange={setField('capacity_ah')} options={capacityOptions} placeholder="Select Capacity" onReload={() => reloadCapacities()} reloading={loadingCapacities} /></div>

                <div><Label>Warranty (months)</Label><Input type="number" value={form.warranty_months} onChange={f('warranty_months')} /></div>
                <div><Label>Vehicle Number{!isEdit && entryMode === 'with_bus' && <span className="text-red-500"> *</span>}</Label>
                  <SearchableSelect
                    value={form.vehicle_number}
                    onChange={setField('vehicle_number')}
                    options={busList.map((b) => ({ value: b.bus_no, label: b.bus_no }))}
                    placeholder="Unassigned"
                    onReload={() => reloadBuses()}
                    reloading={loadingBuses}
                  /></div>
                <div><Label>Install Date</Label><Input type="date" max={today} value={form.install_date} onChange={f('install_date')} /></div>

                <div><Label>Cost (₹)</Label><Input type="number" value={form.cost} onChange={f('cost')} /></div>
                {isEdit && (
                  <div><Label>Status</Label>
                    <Select value={form.status} onChange={f('status')}>
                      {STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </Select></div>
                )}
                <div><Label>Remarks</Label><Input value={form.remarks} onChange={f('remarks')} /></div>
              </div>

              {/* ── Accounting Entry (debit/credit ledgers) — skipped when battery came fitted with the bus ── */}
              {(isEdit || entryMode === 'new') && (
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

              <div className="flex items-center gap-3 mt-6">
                <Button onClick={() => save()} disabled={isPending || !canSave}>
                  <Save className="w-4 h-4" />{isPending ? 'Saving…' : isEdit ? 'Update Battery' : 'Save Battery'}
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
        title="Battery Records"
        columns={cols}
        data={list}
        loading={isLoading}
        onAction={(action, row) => {
          if (action === 'edit') handleEdit(row)
          if (action === 'delete') handleDelete(row)
          if (action === 'history') setHistoryModal({ open: true, battery: row })
        }}
        actions={['edit', 'history', 'delete']}
        icon={<BatteryCharging className="w-5 h-5 text-blue-500" />}
        columnFilters={columnFilters}
        onColumnFilterChange={(k, v) => setColumnFilters((prev) => ({ ...prev, [k]: v }))}
      />

      {/* ── Edit History modal ── */}
      <AnimatePresence>
        {historyModal.open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.96 }} animate={{ scale: 1 }} exit={{ scale: 0.96 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                <div>
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <History className="w-5 h-5 text-slate-500" /> Edit History
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{historyModal.battery?.battery_code}</p>
                </div>
                <button onClick={() => setHistoryModal({ open: false, battery: null })} className="text-slate-400 hover:text-slate-600 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto space-y-4">
                {loadingHistory ? (
                  <p className="text-sm text-slate-400 text-center py-8">Loading…</p>
                ) : historyList.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">No edits have been made to this battery yet.</p>
                ) : (
                  <ol className="relative border-l-2 border-slate-100 ml-2 space-y-6">
                    {historyList.map((h: any) => (
                      <li key={h.id} className="ml-4">
                        <span className="absolute -left-[7px] w-3 h-3 rounded-full bg-amber-400 border-2 border-white" />
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                          <Clock className="w-3.5 h-3.5" />
                          {fmtDateTime(h.changed_at)} · {h.changed_by_name || 'Unknown'}
                        </div>
                        <ChangeNote note={h.changes_note ?? ''} />
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
