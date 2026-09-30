import { useState } from 'react'
import { motion } from 'motion/react'
import { LayoutGrid, Save, Plus, MinusCircle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Label, DataTable, Badge, PageHeader, SearchableSelect, LedgerNameWithGroup } from '@/components/shared'
import type { Column } from '@/components/shared'
import { garageService } from '@/services/garage.service'
import { fuelService } from '@/services/fuel.service'
import { mainmastersService } from '@/services/mainmasters.service'
import { accountingService } from '@/services/accounting.service'
import { ledgerOption, todayISO, isApprovedTyre } from '@/lib/utils'

const EMPTY_FORM = { vehicle_number: '', position: '', tyre_id: '', odometer_at_fitting: '', fitted_date: '', remarks: '' }

type LedgerEntry = { ledger_id: string; amount: string; ledger_name: string }
const emptyLedgerEntry = (): LedgerEntry => ({ ledger_id: '', amount: '', ledger_name: '' })

const today = todayISO()

function fmtDate(v: any) {
  if (!v) return '—'
  const d = new Date(v)
  if (isNaN(d.getTime())) return String(v)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default function TyrePositionPage() {
  const qc = useQueryClient()
  const [form, setForm] = useState(EMPTY_FORM)
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})

  const [ledgerDescription, setLedgerDescription] = useState('')
  const [debit, setDebit] = useState<LedgerEntry[]>([emptyLedgerEntry()])
  const [credit, setCredit] = useState<LedgerEntry[]>([emptyLedgerEntry()])

  const { data, isLoading } = useQuery({ queryKey: ['tyre-positions'], queryFn: () => garageService.getTyrePositions() })
  const { data: tyres, refetch: reloadTyres, isFetching: loadingTyres } = useQuery({ queryKey: ['tyre-inventory'], queryFn: () => garageService.getTyreInventory() })
  const { data: buses, refetch: reloadBuses, isFetching: loadingBuses } = useQuery({ queryKey: ['buses'], queryFn: () => fuelService.getBusNumbers() })
  const { data: positions, refetch: reloadPositions, isFetching: loadingPositions } = useQuery({ queryKey: ['tyre-positions-master'], queryFn: () => mainmastersService.getTyrePositionsMaster() })
  const { data: ledgersData, refetch: reloadLedgers, isFetching: loadingLedgers } = useQuery({ queryKey: ['ledger-names-tyre-position'], queryFn: () => accountingService.getLedgerName() })

  const list: any[] = data?.data ?? []
  const busList: any[] = buses?.data ?? []
  const positionList: any[] = positions?.data ?? []
  // Cross-check against active position-log rows, not just tyre_master.status —
  // a tyre already mounted must never reappear here even if status drifts out of sync.
  const mountedTyreIds = new Set(list.map((p: any) => p.tyre_id))
  // Approval on top of that: a tyre whose purchase voucher is still pending or
  // rejected has not been sanctioned, so it must not go on a bus.
  const inStockTyres: any[] = (tyres?.data ?? []).filter((t: any) => isApprovedTyre(t) && t.status === 'In Stock' && !mountedTyreIds.has(t.id))
  const ledgerList: any[] = (ledgersData?.data ?? []).filter((l: any) => /tyre/i.test(l.temple_name || l.name || ''))
  const ledgerOptions = ledgerList.map((l: any) => ledgerOption(l))

  const f = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((s) => ({ ...s, [k]: e.target.value }))
  const setField = (k: keyof typeof EMPTY_FORM) => (v: string) => setForm((s) => ({ ...s, [k]: v }))

  const debitTotal = debit.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
  const creditTotal = credit.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
  const hasLedgerEntry = debit.some(e => e.ledger_id && e.amount) || credit.some(e => e.ledger_id && e.amount)
  const isBalanced = debitTotal > 0 && Math.round(debitTotal * 100) === Math.round(creditTotal * 100)

  const resetLedgers = () => { setLedgerDescription(''); setDebit([emptyLedgerEntry()]); setCredit([emptyLedgerEntry()]) }

  // Mounting a tyre moves its book value out of the stock ledger and onto the
  // bus, so both sides of the journal default to the picked tyre's own cost
  // instead of making the user read it off the row they just selected. Done on
  // the pick itself rather than from an effect keyed on the tyre: a background
  // refetch of the tyre list hands back a new array, and an effect would then
  // re-fire and overwrite an amount the user has typed since. Still editable,
  // and only while the entry is a single debit/credit line — once someone splits
  // it across rows the split is deliberate and the amounts are theirs to enter.
  const pickTyre = (tyreId: string) => {
    setForm((s) => ({ ...s, tyre_id: tyreId }))
    const cost = inStockTyres.find((t: any) => String(t.id) === tyreId)?.cost
    if (cost == null) return
    const amount = String(cost)
    setDebit((rows) => rows.length === 1 ? [{ ...rows[0], amount }] : rows)
    setCredit((rows) => rows.length === 1 ? [{ ...rows[0], amount }] : rows)
  }

  const { mutate: assign, isPending } = useMutation({
    mutationFn: () => {
      if (hasLedgerEntry && !isBalanced) return Promise.reject(new Error('ledger mismatch'))
      const tyreCode = inStockTyres.find((t: any) => String(t.id) === form.tyre_id)?.tyre_code
      return garageService.assignTyrePosition({
        ...form,
        tyre_code: tyreCode,
        ledger_description: ledgerDescription,
        debit_ledgers: debit.filter(e => e.ledger_id && e.amount),
        credit_ledgers: credit.filter(e => e.ledger_id && e.amount),
        user_id: localStorage.getItem('user_id'),
        usr_nm: localStorage.getItem('usr_nm'),
      })
    },
    onSuccess: (res) => {
      if (res.status === 200) {
        toast.success('Tyre mounted!')
        qc.invalidateQueries({ queryKey: ['tyre-positions'] })
        qc.invalidateQueries({ queryKey: ['tyre-inventory'] })
        setForm(EMPTY_FORM)
        resetLedgers()
      } else toast.error('Failed to assign')
    },
    onError: (err: any) => toast.error(err?.message === 'ledger mismatch' ? 'Debit and credit totals must match exactly before saving.' : 'Server error'),
  })

  const handleUnmount = (row: any) => {
    garageService.removeTyrePosition({ id: row.id, tyre_id: row.tyre_id, removed_date: today }).then((res) => {
      if (res.status === 200) {
        toast.success('Tyre unmounted')
        qc.invalidateQueries({ queryKey: ['tyre-positions'] })
        qc.invalidateQueries({ queryKey: ['tyre-inventory'] })
      } else toast.error('Failed')
    })
  }

  const cols: Column[] = [
    { label: 'Sl No', key: '_idx', align: 'center', render: (_v, _row, i) => <span className="text-sm text-slate-500">{i + 1}</span> },
    { label: 'Vehicle', key: 'vehicle_number', filterable: true, render: (v) => <span className="font-bold text-blue-600">{String(v)}</span> },
    { label: 'Position', key: 'position', filterable: true, render: (v) => <Badge variant="purple">{String(v)}</Badge> },
    { label: 'Tyre Code', key: 'tyre_code', filterable: true, render: (v, r: any) => <div><div className="font-semibold">{String(v)}</div><div className="text-xs text-slate-500">{r.brand}</div></div> },
    { label: 'Serial No', key: 'serial_no', filterable: true, render: (v) => <span className="text-slate-600">{v || '—'}</span> },
    { label: 'Fitted Date', key: 'fitted_date', align: 'center', filterable: true, render: (v) => <span className="text-sm">{fmtDate(v)}</span> },
    { label: 'Odometer at Fitting', key: 'odometer_at_fitting', align: 'right', filterable: true, render: (v) => <span className="text-sm">{v ? `${v} km` : '—'}</span> },
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
                {isDebit ? 'Dr' : 'Cr'} <LedgerNameWithGroup name={text.replace(/ ₹[0-9.]+$/, '')} />{(text.match(/ ₹[0-9.]+$/) || [''])[0]}
              </span>
            )
          })}
        </div>
      )
    } },
  ]

  const canAssign = !!form.vehicle_number && !!form.position && !!form.tyre_id && (!hasLedgerEntry || isBalanced)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Tyre Position" subtitle="Mount tyres from inventory onto vehicle wheel positions" />

      <GlassCard className="p-6" colorBar="bg-gradient-to-r from-blue-500 to-cyan-500">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><LayoutGrid className="w-5 h-5 text-blue-500" /> Mount Tyre</h2>
        </div>
        <div className="mb-5">
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
            <p className="text-xs font-semibold text-red-600 mt-2">Debit and credit totals must match exactly before saving.</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-5 border-t border-slate-100">
          <div><Label>Select Tyre Serial Number *</Label>
            <SearchableSelect
              value={form.tyre_id}
              onChange={pickTyre}
              options={inStockTyres.map((t) => ({ value: String(t.id), label: `${t.serial_no || 'No Serial'} — ${t.tyre_code} (${t.brand})` }))}
              placeholder="Select Tyre Serial Number"
              onReload={() => reloadTyres()}
              reloading={loadingTyres}
            /></div>
          <div><Label>Select Date</Label><Input type="date" max={today} value={form.fitted_date} onChange={f('fitted_date')} /></div>
          <div><Label>Bus No *</Label>
            <SearchableSelect
              value={form.vehicle_number}
              onChange={setField('vehicle_number')}
              options={busList.map((b) => ({ value: b.bus_no, label: b.bus_no }))}
              placeholder="Select Bus"
              onReload={() => reloadBuses()}
              reloading={loadingBuses}
            /></div>
          <div><Label>Kilometers</Label><Input type="number" placeholder="km" value={form.odometer_at_fitting} onChange={f('odometer_at_fitting')} /></div>
          <div><Label>Tyre Position *</Label>
            <SearchableSelect
              value={form.position}
              onChange={setField('position')}
              options={positionList.map((p) => ({ value: p.position_name, label: p.position_name }))}
              placeholder="Select Position"
              onReload={() => reloadPositions()}
              reloading={loadingPositions}
            /></div>
          <div><Label>Remarks</Label><Input value={form.remarks} onChange={f('remarks')} /></div>
        </div>
        {/* Submit sits under the fields, as on every other form. */}
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
          <Button onClick={() => assign()} disabled={isPending || !canAssign}><Save className="w-4 h-4" />{isPending ? 'Saving…' : 'Mount Tyre'}</Button>
        </div>
      </GlassCard>

      <DataTable
        title="Active Tyre Positions"
        columns={cols}
        data={list}
        loading={isLoading}
        onAction={(action, row) => { if (action === 'delete') handleUnmount(row) }}
        actions={['delete']}
        icon={<LayoutGrid className="w-5 h-5 text-blue-500" />}
        columnFilters={columnFilters}
        onColumnFilterChange={(k, v) => setColumnFilters((prev) => ({ ...prev, [k]: v }))}
      />
    </motion.div>
  )
}
