import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { ShoppingCart, Save, Plus, MinusCircle, CheckSquare, Square } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Label, DataTable, Badge, PageHeader, SearchableSelect } from '@/components/shared'
import type { Column } from '@/components/shared'
import { garageService } from '@/services/garage.service'
import { accountingService } from '@/services/accounting.service'
import { ledgerOption, todayISO, isApprovedTyre } from '@/lib/utils'

const LEDGER_STATUS_MAP: Record<string, string> = {
  'New Tyres In Stock': 'In Stock',
  'Retreading Tyres In Stock': 'Retreaded',
  'Scrap Tyres In Stock': 'Scrapped',
  'Tyres For Retread In Stock': 'Pending Retread',
}

const statusVariant: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'purple' | 'teal'> = {
  'In Stock': 'success', 'In Use': 'info', Retreaded: 'warning', Scrapped: 'danger', Sold: 'purple', 'Pending Retread': 'teal',
}

type LedgerEntry = { ledger_id: string; amount: string; ledger_name: string }
const emptyLedgerEntry = (): LedgerEntry => ({ ledger_id: '', amount: '', ledger_name: '' })

const today = todayISO()

export default function TyreSalePage() {
  const qc = useQueryClient()
  const [saleDate, setSaleDate] = useState(today)
  const [remarks, setRemarks] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})

  const [ledgerDescription, setLedgerDescription] = useState('')
  const [debit, setDebit] = useState<LedgerEntry[]>([emptyLedgerEntry()])
  const [credit, setCredit] = useState<LedgerEntry[]>([emptyLedgerEntry()])

  const { data, isLoading } = useQuery({ queryKey: ['tyre-inventory'], queryFn: () => garageService.getTyreInventory() })
  const list: any[] = data?.data ?? []

  const { data: ledgersData, refetch: reloadLedgers, isFetching: loadingLedgers } = useQuery({ queryKey: ['ledger-names-tyre'], queryFn: () => accountingService.getLedgerName() })
  const ledgerList: any[] = ledgersData?.data ?? []
  const ledgerOptions = ledgerList.map((l: any) => ledgerOption(l))

  // Debit is restricted to the "Tyres In Stock" group, since picking it also
  // determines which tyres are available to sell. Credit stays free-choice
  // (Cash, Buyer, …).
  const stockLedgerList = ledgerList.filter((l: any) => l.subchildtwo === 'Tyres In Stock')
  const stockLedgerOptions = stockLedgerList.map((l: any) => ledgerOption(l))

  // The first Debit row IS the stock ledger picker — no separate field needed.
  // Picking it narrows the tyre list to whatever bucket it represents (e.g.
  // "New Tyres In Stock" → status "In Stock"); already sold tyres never show.
  const stockLedgerId = debit[0]?.ledger_id || ''
  const stockLedgerName = debit[0]?.ledger_name || ''
  const mappedStatus = LEDGER_STATUS_MAP[stockLedgerName]

  const availableTyres = useMemo(() => {
    if (!stockLedgerId) return []
    return list.filter((t: any) => isApprovedTyre(t) && t.status !== 'Sold' && (mappedStatus ? t.status === mappedStatus : true))
  }, [list, stockLedgerId, mappedStatus])

  useEffect(() => {
    setSelectedIds([])
  }, [stockLedgerId])

  const selectedTyres = availableTyres.filter((t: any) => selectedIds.includes(String(t.id)))
  const selectedTotal = selectedTyres.reduce((s: number, t: any) => s + (parseFloat(t.cost) || 0), 0)

  const toggleTyre = (id: string) => setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  const toggleAll = () => {
    if (selectedIds.length === availableTyres.length) setSelectedIds([])
    else setSelectedIds(availableTyres.map((t: any) => String(t.id)))
  }

  // Selling narrows/widens the tyre list, so the sale amount defaults to the
  // combined book cost of whatever's currently selected — still editable.
  useEffect(() => {
    setDebit((rows) => rows.length === 1 ? [{ ...rows[0], amount: selectedTotal ? String(selectedTotal) : '' }] : rows)
    setCredit((rows) => rows.length === 1 ? [{ ...rows[0], amount: selectedTotal ? String(selectedTotal) : '' }] : rows)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTotal])

  const debitTotal = debit.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
  const creditTotal = credit.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
  const hasLedgerEntry = debit.some(e => e.ledger_id && e.amount) || credit.some(e => e.ledger_id && e.amount)
  const isBalanced = debitTotal > 0 && Math.round(debitTotal * 100) === Math.round(creditTotal * 100)

  const reset = () => {
    setSaleDate(today); setRemarks(''); setSelectedIds([])
    setLedgerDescription(''); setDebit([emptyLedgerEntry()]); setCredit([emptyLedgerEntry()])
  }

  const { mutate: sell, isPending } = useMutation({
    mutationFn: () => {
      if (hasLedgerEntry && !isBalanced) return Promise.reject(new Error('ledger mismatch'))
      return garageService.sellTyres({
        tyre_ids: selectedIds,
        sale_date: saleDate,
        remarks,
        tyre_code: selectedTyres.map((t: any) => t.tyre_code).join(', '),
        ledger_description: ledgerDescription || `Tyre sale — ${selectedTyres.map((t: any) => t.tyre_code).join(', ')}`,
        debit_ledgers: debit.filter(e => e.ledger_id && e.amount),
        credit_ledgers: credit.filter(e => e.ledger_id && e.amount),
        user_id: localStorage.getItem('user_id'),
        usr_nm: localStorage.getItem('usr_nm'),
      })
    },
    onSuccess: (res) => {
      if (res.status === 200) {
        toast.success(`${selectedIds.length} tyre${selectedIds.length !== 1 ? 's' : ''} sold!`)
        qc.invalidateQueries({ queryKey: ['tyre-inventory'] })
        reset()
      } else toast.error('Failed to save')
    },
    onError: (err: any) => toast.error(err?.message === 'ledger mismatch' ? 'Debit and credit totals must match exactly before saving.' : 'Server error'),
  })

  const cols: Column[] = [
    { label: '', key: '_select', align: 'center', render: (_v, row: any) => (
      <button onClick={() => toggleTyre(String(row.id))} className="text-blue-500 hover:text-blue-700 transition-colors">
        {selectedIds.includes(String(row.id)) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-300" />}
      </button>
    ) },
    { label: 'Sl No', key: '_idx', align: 'center', render: (_v, _row, i) => <span className="text-sm text-slate-500">{i + 1}</span> },
    { label: 'Tyre Code', key: 'tyre_code', filterable: true, render: (v) => <span className="font-bold text-blue-600">{String(v)}</span> },
    { label: 'Make', key: 'brand', filterable: true },
    { label: 'Size', key: 'size', filterable: true },
    { label: 'Status', key: 'status', filterable: true, render: (v) => <Badge variant={statusVariant[String(v)] ?? 'default'}>{String(v)}</Badge> },
    { label: 'Cost (₹)', key: 'cost', align: 'right', render: (v) => <span className="font-medium">₹{v ?? 0}</span> },
  ]

  const canSave = !!saleDate && !!stockLedgerId && selectedIds.length > 0 && (!hasLedgerEntry || isBalanced)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Tyre Sale" subtitle="Sell tyres out of stock and record the sale" />

      <GlassCard className="p-6" colorBar="bg-gradient-to-r from-violet-500 to-purple-600">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-violet-500" /> New Sale</h2>
        </div>

        <div className="mb-1">
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
                  <span className="text-xs font-bold text-white">Debit Accounts (stock ledger — pick first to load tyres)</span>
                  <button onClick={() => setDebit(rows => [...rows, emptyLedgerEntry()])} className="inline-flex items-center gap-1 text-xs font-bold text-blue-100 hover:text-white transition-colors"><Plus className="w-3 h-3" /> Add Row</button>
                </div>
                <div className="p-3 space-y-2">
                  {debit.map((entry, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <div className="flex-[3] min-w-0">
                        <SearchableSelect value={entry.ledger_id} displayLabel={entry.ledger_name}
                          onChange={v => { const nm = stockLedgerList.find((l: any) => String(l.id) === v)?.temple_name || ''; setDebit(rows => rows.map((r, ri) => ri !== i ? r : { ...r, ledger_id: v, ledger_name: nm })) }}
                          onClear={() => setDebit(rows => rows.map((r, ri) => ri !== i ? r : { ...r, ledger_id: '', ledger_name: '' }))}
                          options={stockLedgerOptions} placeholder="Select Ledger" onReload={() => reloadLedgers()} reloading={loadingLedgers} />
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
                  <span className="text-xs font-bold text-white">Credit Accounts (e.g. Cash / Buyer)</span>
                  <button onClick={() => setCredit(rows => [...rows, emptyLedgerEntry()])} className="inline-flex items-center gap-1 text-xs font-bold text-emerald-100 hover:text-white transition-colors"><Plus className="w-3 h-3" /> Add Row</button>
                </div>
                <div className="p-3 space-y-2">
                  {credit.map((entry, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <div className="flex-[3] min-w-0">
                        <SearchableSelect value={entry.ledger_id} displayLabel={entry.ledger_name}
                          onChange={v => { const nm = ledgerList.find((l: any) => String(l.id) === v)?.temple_name || ''; setCredit(rows => rows.map((r, ri) => ri !== i ? r : { ...r, ledger_id: v, ledger_name: nm })) }}
                          onClear={() => setCredit(rows => rows.map((r, ri) => ri !== i ? r : { ...r, ledger_id: '', ledger_name: '' }))}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5 pt-5 border-t border-slate-100">
          <div><Label>Sale Date <span className="text-red-500">*</span></Label><Input type="date" max={today} value={saleDate} onChange={(e) => setSaleDate(e.target.value)} /></div>
          <div><Label>Remarks</Label><Input value={remarks} onChange={(e) => setRemarks(e.target.value)} /></div>
        </div>

        {!stockLedgerId ? (
          <div className="text-center py-10 text-slate-400 text-sm mt-5">Pick a Debit (stock) ledger above to see which tyres are available to sell.</div>
        ) : (
          <div className="rounded-xl border border-slate-200 overflow-hidden mt-5">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
              <button onClick={toggleAll} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors">
                {selectedIds.length === availableTyres.length && availableTyres.length > 0 ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                Select All ({availableTyres.length} available)
              </button>
              {selectedIds.length > 0 && (
                <span className="text-xs font-bold text-violet-700">{selectedIds.length} selected — ₹{selectedTotal.toLocaleString('en-IN')}</span>
              )}
            </div>
          </div>
        )}
        {/* Submit sits under the fields, as on every other form. */}
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
          <Button onClick={() => sell()} disabled={isPending || !canSave}><Save className="w-4 h-4" />{isPending ? 'Saving…' : `Sell ${selectedIds.length || ''} Tyre${selectedIds.length !== 1 ? 's' : ''}`}</Button>
        </div>
      </GlassCard>

      {stockLedgerId && (
        <DataTable
          title="Tyres Available to Sell"
          columns={cols}
          data={availableTyres}
          loading={isLoading}
          actions={[]}
          icon={<ShoppingCart className="w-5 h-5 text-violet-500" />}
          columnFilters={columnFilters}
          onColumnFilterChange={(k, v) => setColumnFilters((prev) => ({ ...prev, [k]: v }))}
        />
      )}
    </motion.div>
  )
}
