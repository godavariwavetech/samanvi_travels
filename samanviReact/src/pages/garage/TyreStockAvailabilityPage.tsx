import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { PackageSearch, Ban, X } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button, Input, Label, DataTable, Badge, PageHeader, Select, SearchableSelect } from '@/components/shared'
import type { Column } from '@/components/shared'
import { garageService } from '@/services/garage.service'
import { accountingService } from '@/services/accounting.service'

const STATUSES = ['In Stock', 'In Use', 'Retreaded', 'Scrapped', 'Sold', 'Pending Retread']

const statusVariant: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'purple' | 'teal'> = {
  'In Stock': 'success', 'In Use': 'info', Retreaded: 'warning', Scrapped: 'danger', Sold: 'purple', 'Pending Retread': 'teal',
}

const STATUS_COLORS: Record<string, string> = {
  'In Stock': '#10b981', 'In Use': '#3b82f6', Retreaded: '#f59e0b', Scrapped: '#ef4444', Sold: '#7c3aed', 'Pending Retread': '#14b8a6',
}

const DEBIT_LEDGER_NAME = 'Scrap Tyres In Stock'
const RETREAD_LEDGER_NAME = 'Retreading Tyres In Stock'
const NEW_STOCK_LEDGER_NAME = 'New Tyres In Stock'

export default function TyreStockAvailabilityPage() {
  const qc = useQueryClient()
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})
  const [scrapModal, setScrapModal] = useState<{ open: boolean; tyre: any; reason: string }>({ open: false, tyre: null, reason: '' })
  const [debitLedgerId, setDebitLedgerId] = useState('')
  const [creditLedgerId, setCreditLedgerId] = useState('')
  const [ledgerAmount, setLedgerAmount] = useState('')

  const { data, isLoading } = useQuery({ queryKey: ['tyre-inventory'], queryFn: () => garageService.getTyreInventory() })
  const list: any[] = data?.data ?? []

  const { data: ledgersData, refetch: reloadLedgers, isFetching: loadingLedgers } = useQuery({ queryKey: ['ledger-names-tyre'], queryFn: () => accountingService.getLedgerName() })
  const ledgerList: any[] = ledgersData?.data ?? []
  const ledgerOptions = ledgerList.map((l: any) => ({ value: String(l.id), label: l.temple_name || l.name || '' }))

  const statusCounts = useMemo(() => {
    const m: Record<string, number> = {}
    list.forEach((r) => { m[r.status] = (m[r.status] ?? 0) + 1 })
    return m
  }, [list])

  const toggleStatusTile = (status: string) => {
    setColumnFilters((prev) => {
      const active = prev.status?.length === 1 && prev.status[0] === status
      const next = { ...prev }
      if (active) delete next.status
      else next.status = [status]
      return next
    })
  }

  const { mutate: updateStatus } = useMutation({
    mutationFn: (vars: { tyre: any; status: string }) => garageService.editTyre({
      id: vars.tyre.id, brand: vars.tyre.brand, size: vars.tyre.size, serial_no: vars.tyre.serial_no,
      vendor_id: vars.tyre.vendor_id, purchase_date: vars.tyre.purchase_date, cost: vars.tyre.cost,
      status: vars.status, remarks: vars.tyre.remarks,
      user_id: localStorage.getItem('user_id'), usr_nm: localStorage.getItem('usr_nm'),
    }),
    onSuccess: (res) => {
      if (res.status === 200) { toast.success('Status updated'); qc.invalidateQueries({ queryKey: ['tyre-inventory'] }) }
      else toast.error('Failed')
    },
    onError: () => toast.error('Server error'),
  })

  // A scrapped tyre's value moves out of whichever stock ledger it was
  // sitting in (new stock, or retreading stock if it had been retreaded)
  // into the scrap ledger — defaulted here, editable before saving.
  useEffect(() => {
    if (!scrapModal.open || !scrapModal.tyre || ledgerList.length === 0) return
    const debit = ledgerList.find((l: any) => (l.temple_name || l.name) === DEBIT_LEDGER_NAME)
    const creditName = scrapModal.tyre.status === 'Retreaded' ? RETREAD_LEDGER_NAME : NEW_STOCK_LEDGER_NAME
    const credit = ledgerList.find((l: any) => (l.temple_name || l.name) === creditName)
    setDebitLedgerId(debit ? String(debit.id) : '')
    setCreditLedgerId(credit ? String(credit.id) : '')
    setLedgerAmount(scrapModal.tyre.cost != null ? String(scrapModal.tyre.cost) : '')
  }, [scrapModal.open, scrapModal.tyre, ledgerList])

  const { mutate: scrap, isPending: scrapping } = useMutation({
    mutationFn: () => {
      const t = scrapModal.tyre
      const debitName = ledgerList.find((l: any) => String(l.id) === debitLedgerId)?.temple_name || ''
      const creditName = ledgerList.find((l: any) => String(l.id) === creditLedgerId)?.temple_name || ''
      const hasLedgerEntry = !!debitLedgerId && !!creditLedgerId && !!ledgerAmount
      return garageService.editTyre({
        id: t.id, brand: t.brand, size: t.size, serial_no: t.serial_no, vendor_id: t.vendor_id,
        purchase_date: t.purchase_date, cost: t.cost, status: 'Scrapped',
        remarks: scrapModal.reason ? `${t.remarks ? t.remarks + ' | ' : ''}Scrapped: ${scrapModal.reason}` : t.remarks,
        tyre_code: t.tyre_code || '',
        ledger_description: `Scrap — ${t.tyre_code || ''}`,
        debit_ledgers: hasLedgerEntry ? [{ ledger_id: debitLedgerId, amount: ledgerAmount, ledger_name: debitName }] : [],
        credit_ledgers: hasLedgerEntry ? [{ ledger_id: creditLedgerId, amount: ledgerAmount, ledger_name: creditName }] : [],
        user_id: localStorage.getItem('user_id'), usr_nm: localStorage.getItem('usr_nm'),
      })
    },
    onSuccess: (res) => {
      if (res.status === 200) { toast.success('Tyre scrapped'); qc.invalidateQueries({ queryKey: ['tyre-inventory'] }); setScrapModal({ open: false, tyre: null, reason: '' }) }
      else toast.error('Failed')
    },
    onError: () => toast.error('Server error'),
  })

  const cols: Column[] = [
    { label: 'Sl No', key: '_idx', align: 'center', render: (_v, _row, i) => <span className="text-sm text-slate-500">{i + 1}</span> },
    { label: 'Tyre Code', key: 'tyre_code', filterable: true, render: (v) => <span className="font-bold text-blue-600">{String(v)}</span> },
    { label: 'Make', key: 'brand', filterable: true },
    { label: 'Size', key: 'size', filterable: true },
    { label: 'Current Vehicle', key: 'current_vehicle_number', filterable: true, render: (v) => v ? <span className="font-medium">{String(v)}</span> : <span className="text-slate-300">—</span> },
    { label: 'Status', key: 'status', filterable: true, filterOptions: STATUSES.map((s) => ({ label: s, value: s })), render: (v) => <Badge variant={statusVariant[String(v)] ?? 'default'}>{String(v)}</Badge> },
    { label: 'Update Status', key: '_update', align: 'center', render: (_v, row: any) => (
      <Select className="h-9 max-w-[160px] mx-auto" value={row.status} onChange={(e) => updateStatus({ tyre: row, status: e.target.value })}>
        {STATUSES.map((s) => <option key={s}>{s}</option>)}
      </Select>
    ) },
    { label: 'Scrap', key: '_scrap', align: 'center', render: (_v, row: any) => (
      row.status === 'Scrapped' || row.status === 'Sold'
        ? <span className="text-xs text-slate-400">—</span>
        : <button
            onClick={() => setScrapModal({ open: true, tyre: row, reason: '' })}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors"
          ><Ban className="w-3 h-3" /> Scrap</button>
    ) },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Tyre Stock & Status" subtitle="Stock counts, lifecycle status updates, and scrapping — all in one place" />

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {(() => {
          const allActive = !columnFilters.status || columnFilters.status.length === 0
          return (
            <button
              type="button"
              onClick={() => setColumnFilters((prev) => { const next = { ...prev }; delete next.status; return next })}
              className="rounded-xl p-4 text-center border transition-all"
              style={{
                backgroundColor: `#64748b${allActive ? '26' : '14'}`,
                borderColor: `#64748b${allActive ? 'a0' : '40'}`,
                boxShadow: allActive ? '0 0 0 2px #64748b40' : undefined,
              }}
            >
              <p className="text-[11px] font-bold uppercase tracking-wide mb-1 text-slate-500">All</p>
              <p className="text-2xl font-extrabold text-slate-600">{list.length}</p>
            </button>
          )
        })()}
        {STATUSES.map((s) => {
          const active = columnFilters.status?.length === 1 && columnFilters.status[0] === s
          return (
            <button
              key={s}
              type="button"
              onClick={() => toggleStatusTile(s)}
              className="rounded-xl p-4 text-center border transition-all"
              style={{
                backgroundColor: `${STATUS_COLORS[s]}${active ? '26' : '14'}`,
                borderColor: `${STATUS_COLORS[s]}${active ? 'a0' : '40'}`,
                boxShadow: active ? `0 0 0 2px ${STATUS_COLORS[s]}40` : undefined,
              }}
            >
              <p className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: STATUS_COLORS[s] }}>{s}</p>
              <p className="text-2xl font-extrabold" style={{ color: STATUS_COLORS[s] }}>{statusCounts[s] ?? 0}</p>
            </button>
          )
        })}
      </div>

      <DataTable
        title="Tyre Stock"
        columns={cols}
        data={list}
        loading={isLoading}
        actions={[]}
        icon={<PackageSearch className="w-5 h-5 text-blue-500" />}
        columnFilters={columnFilters}
        onColumnFilterChange={(k, v) => setColumnFilters((prev) => ({ ...prev, [k]: v }))}
      />

      {scrapModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2"><Ban className="w-4 h-4 text-amber-500" /> Scrap Tyre</h3>
                <p className="text-xs text-slate-500 mt-0.5">{scrapModal.tyre?.tyre_code} — {scrapModal.tyre?.brand}</p>
              </div>
              <button onClick={() => setScrapModal({ open: false, tyre: null, reason: '' })} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label>Reason</Label>
                <Input autoFocus placeholder="e.g. Worn beyond retread limit" value={scrapModal.reason} onChange={(e) => setScrapModal((s) => ({ ...s, reason: e.target.value }))} />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 mt-3">Accounting Entry (optional)</h4>
                <div className="space-y-3">
                  <div><Label>Debit Ledger</Label>
                    <SearchableSelect
                      value={debitLedgerId}
                      onChange={setDebitLedgerId}
                      options={ledgerOptions}
                      placeholder="Select ledger"
                      onReload={() => reloadLedgers()}
                      reloading={loadingLedgers}
                    /></div>
                  <div><Label>Credit Ledger</Label>
                    <SearchableSelect
                      value={creditLedgerId}
                      onChange={setCreditLedgerId}
                      options={ledgerOptions}
                      placeholder="Select ledger"
                      onReload={() => reloadLedgers()}
                      reloading={loadingLedgers}
                    /></div>
                  <div><Label>Amount (₹)</Label><Input type="number" value={ledgerAmount} onChange={(e) => setLedgerAmount(e.target.value)} /></div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-slate-100 justify-end">
              <Button variant="outline" onClick={() => setScrapModal({ open: false, tyre: null, reason: '' })}>Cancel</Button>
              <Button disabled={scrapping} onClick={() => scrap()}><Ban className="w-4 h-4" />{scrapping ? 'Scrapping…' : 'Confirm Scrap'}</Button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  )
}
