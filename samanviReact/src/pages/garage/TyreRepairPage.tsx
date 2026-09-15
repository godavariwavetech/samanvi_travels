import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Wrench, Save, Plus, MinusCircle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Label, DataTable, PageHeader, SearchableSelect } from '@/components/shared'
import type { Column } from '@/components/shared'
import { garageService } from '@/services/garage.service'
import { mainmastersService } from '@/services/mainmasters.service'
import { fuelService } from '@/services/fuel.service'
import { accountingService } from '@/services/accounting.service'
import { ledgerOption } from '@/lib/utils'

const EMPTY_FORM = { repair_date: '', vehicle_number: '', odometer: '', tyre_id: '', repair_type: '', has_cost: true, cost: '', vendor_id: '', remarks: '' }

const DEBIT_LEDGER_NAME = 'Tyre Maintenance'

type LedgerEntry = { ledger_id: string; amount: string; ledger_name: string }
const emptyLedgerEntry = (): LedgerEntry => ({ ledger_id: '', amount: '', ledger_name: '' })

const today = new Date().toISOString().split('T')[0]

function fmtDate(v: any) {
  if (!v) return '—'
  const d = new Date(v)
  if (isNaN(d.getTime())) return String(v)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default function TyreRepairPage() {
  const qc = useQueryClient()
  const [form, setForm] = useState(EMPTY_FORM)
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})

  const [ledgerDescription, setLedgerDescription] = useState('')
  const [debit, setDebit] = useState<LedgerEntry[]>([emptyLedgerEntry()])
  const [credit, setCredit] = useState<LedgerEntry[]>([emptyLedgerEntry()])

  const { data, isLoading } = useQuery({ queryKey: ['tyre-repairs'], queryFn: () => garageService.getTyreRepairs() })
  const { data: tyres, refetch: reloadTyres, isFetching: loadingTyres } = useQuery({ queryKey: ['tyre-inventory'], queryFn: () => garageService.getTyreInventory() })
  const { data: vendors, refetch: reloadVendors, isFetching: loadingVendors } = useQuery({ queryKey: ['tyre-vendors'], queryFn: () => mainmastersService.getTyreVendors() })
  const { data: buses, refetch: reloadBuses, isFetching: loadingBuses } = useQuery({ queryKey: ['buses'], queryFn: () => fuelService.getBusNumbers() })
  const { data: ledgersData, refetch: reloadLedgers, isFetching: loadingLedgers } = useQuery({ queryKey: ['ledger-names-tyre'], queryFn: () => accountingService.getLedgerName() })

  const list: any[] = data?.data ?? []
  const tyreList: any[] = tyres?.data ?? []
  const vendorList: any[] = vendors?.data ?? []
  const busList: any[] = buses?.data ?? []
  const ledgerList: any[] = ledgersData?.data ?? []
  const ledgerOptions = ledgerList.map((l: any) => ledgerOption(l))

  const selectedTyre = tyreList.find((t: any) => String(t.id) === form.tyre_id)

  const f = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((s) => ({ ...s, [k]: e.target.value }))
  const setField = (k: keyof typeof EMPTY_FORM) => (v: string) => setForm((s) => ({ ...s, [k]: v }))

  // Repair cost drives the ledger amounts by default, same pattern as the
  // Retread Tyre Entry form, as long as it's still a single debit/credit line.
  const handleCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setForm((s) => ({ ...s, cost: val }))
    setDebit((rows) => rows.length === 1 ? [{ ...rows[0], amount: val }] : rows)
    setCredit((rows) => rows.length === 1 ? [{ ...rows[0], amount: val }] : rows)
  }

  // Default the journal's debit side to "Tyre Maintenance" — only while
  // that row is still untouched — with the amount pre-filled from cost
  // (handleCostChange keeps debit[0].amount synced to cost meanwhile).
  useEffect(() => {
    if (debit.length !== 1 || debit[0].ledger_id || ledgerList.length === 0) return
    const l = ledgerList.find((x: any) => (x.temple_name || x.name) === DEBIT_LEDGER_NAME)
    if (l) setDebit([{ ledger_id: String(l.id), amount: debit[0].amount, ledger_name: l.temple_name || l.name || '' }])
  }, [ledgerList, debit])

  const debitTotal = debit.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
  const creditTotal = credit.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
  const hasLedgerEntry = debit.some(e => e.ledger_id && e.amount) || credit.some(e => e.ledger_id && e.amount)
  const isBalanced = debitTotal > 0 && Math.round(debitTotal * 100) === Math.round(creditTotal * 100)

  const resetLedgers = () => { setLedgerDescription(''); setDebit([emptyLedgerEntry()]); setCredit([emptyLedgerEntry()]) }

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => {
      if (form.has_cost && hasLedgerEntry && !isBalanced) return Promise.reject(new Error('ledger mismatch'))
      return garageService.addTyreRepair({
        ...form,
        cost: form.has_cost ? form.cost : '0',
        vendor_id: form.has_cost ? form.vendor_id : '',
        tyre_code: selectedTyre?.tyre_code || '',
        ledger_description: form.has_cost ? (ledgerDescription || `Tyre repair — ${selectedTyre?.tyre_code || ''}`) : '',
        debit_ledgers: form.has_cost ? debit.filter(e => e.ledger_id && e.amount) : [],
        credit_ledgers: form.has_cost ? credit.filter(e => e.ledger_id && e.amount) : [],
        user_id: localStorage.getItem('user_id'),
        usr_nm: localStorage.getItem('usr_nm'),
      })
    },
    onSuccess: (res) => {
      if (res.status === 200) {
        toast.success('Repair entry saved!')
        qc.invalidateQueries({ queryKey: ['tyre-repairs'] })
        setForm(EMPTY_FORM)
        resetLedgers()
      } else toast.error('Failed to save')
    },
    onError: (err: any) => toast.error(err?.message === 'ledger mismatch' ? 'Debit and credit totals must match exactly before saving.' : 'Server error'),
  })

  const handleDelete = (row: any) => {
    garageService.deleteTyreRepair({ id: row.id }).then((res) => {
      if (res.status === 200) { toast.success('Entry removed'); qc.invalidateQueries({ queryKey: ['tyre-repairs'] }) }
      else toast.error('Failed')
    })
  }

  const cols: Column[] = [
    { label: 'Sl No', key: '_idx', align: 'center', render: (_v, _row, i) => <span className="text-sm text-slate-500">{i + 1}</span> },
    { label: 'Tyre Code', key: 'tyre_code', filterable: true, render: (v, r: any) => <div><div className="font-bold text-blue-600">{String(v)}</div><div className="text-xs text-slate-500">{r.brand}</div></div> },
    { label: 'Repair Date', key: 'repair_date', align: 'center', filterable: true, render: (v) => <span className="text-sm">{fmtDate(v)}</span> },
    { label: 'Bus No', key: 'vehicle_number', filterable: true, render: (v) => v ? <span className="font-medium">{String(v)}</span> : <span className="text-slate-300">—</span> },
    { label: 'Kms', key: 'odometer', align: 'right', filterable: true, render: (v) => <span className="text-sm">{v ? `${v} km` : '—'}</span> },
    { label: 'Repair Type', key: 'repair_type', filterable: true, render: (v) => <span className="text-slate-700 font-medium">{v || '—'}</span> },
    { label: 'Vendor', key: 'vendor_name', filterable: true, render: (v) => v ? <span className="text-slate-600">{String(v)}</span> : <span className="text-slate-300">—</span> },
    { label: 'Cost', key: 'cost', align: 'right', filterable: true, render: (v) => Number(v) > 0 ? <span className="font-medium">₹{v}</span> : <span className="text-slate-300">—</span> },
    { label: 'Remarks', key: 'remarks', filterable: true, render: (v) => <span className="text-slate-600">{v || '—'}</span> },
  ]

  const canSave = !!form.tyre_id

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Tyre Repair" subtitle="Log punctures and other tyre repairs" />

      <GlassCard className="p-6" colorBar="bg-gradient-to-r from-rose-500 to-red-500">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Wrench className="w-5 h-5 text-rose-500" /> New Repair Entry</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div><Label>Repair Date</Label><Input type="date" max={today} value={form.repair_date} onChange={f('repair_date')} /></div>
          <div><Label>Bus No</Label>
            <SearchableSelect
              value={form.vehicle_number}
              onChange={setField('vehicle_number')}
              options={busList.map((b: any) => ({ value: b.bus_no, label: b.bus_no }))}
              placeholder="Select Bus"
              onReload={() => reloadBuses()}
              reloading={loadingBuses}
            /></div>
          <div><Label>Kms</Label><Input type="number" placeholder="km" value={form.odometer} onChange={f('odometer')} /></div>
          <div><Label>Select Tyre Number *</Label>
            <SearchableSelect
              value={form.tyre_id}
              onChange={setField('tyre_id')}
              options={tyreList.map((t: any) => ({ value: String(t.id), label: `${t.tyre_code} — ${t.brand}` }))}
              placeholder="Select Tyre"
              onReload={() => reloadTyres()}
              reloading={loadingTyres}
            /></div>
          <div><Label>Repair Type</Label><Input placeholder="e.g. Puncture" value={form.repair_type} onChange={f('repair_type')} /></div>
          <div>
            <Label>Cost Type</Label>
            <div className="flex rounded-xl border border-slate-200 overflow-hidden h-11">
              <button
                type="button"
                onClick={() => setForm((s) => ({ ...s, has_cost: true }))}
                className={`flex-1 text-sm font-medium transition-colors ${form.has_cost ? 'bg-rose-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >With Cost</button>
              <button
                type="button"
                onClick={() => { setForm((s) => ({ ...s, has_cost: false, cost: '', vendor_id: '' })); resetLedgers() }}
                className={`flex-1 text-sm font-medium transition-colors ${!form.has_cost ? 'bg-rose-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >Without Cost</button>
            </div>
          </div>
          {form.has_cost && (
            <>
              <div><Label>Amount (₹)</Label><Input type="number" value={form.cost} onChange={handleCostChange} /></div>
              <div><Label>Vendor</Label>
                <SearchableSelect
                  value={form.vendor_id}
                  onChange={setField('vendor_id')}
                  options={vendorList.map((v: any) => ({ value: String(v.id), label: v.vendor_name }))}
                  placeholder="Select vendor"
                  onReload={() => reloadVendors()}
                  reloading={loadingVendors}
                /></div>
            </>
          )}
          <div className="md:col-span-3"><Label>Remarks</Label><Input value={form.remarks} onChange={f('remarks')} /></div>
        </div>

        {form.has_cost && (
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
            {hasLedgerEntry && !isBalanced && (
              <span className="text-xs font-semibold text-red-600 block mt-2">Debit and credit totals must match exactly before saving.</span>
            )}
          </div>
        )}
        {/* Submit sits under the fields, as on every other form. */}
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
          <Button onClick={() => save()} disabled={isPending || !canSave}><Save className="w-4 h-4" />{isPending ? 'Saving…' : 'Save Entry'}</Button>
        </div>
      </GlassCard>

      <DataTable
        title="Repair History"
        columns={cols}
        data={list}
        loading={isLoading}
        onAction={(action, row) => { if (action === 'delete') handleDelete(row) }}
        actions={['delete']}
        icon={<Wrench className="w-5 h-5 text-rose-500" />}
        columnFilters={columnFilters}
        onColumnFilterChange={(k, v) => setColumnFilters((prev) => ({ ...prev, [k]: v }))}
      />
    </motion.div>
  )
}
