import { useState } from 'react'
import { motion } from 'motion/react'
import { ArrowLeftRight, Save, Truck, Warehouse } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Label, DataTable, Badge, PageHeader, SearchableSelect } from '@/components/shared'
import type { Column } from '@/components/shared'
import { garageService } from '@/services/garage.service'
import { mainmastersService } from '@/services/mainmasters.service'
import { fuelService } from '@/services/fuel.service'
import { accountingService } from '@/services/accounting.service'
import { ledgerOption, todayISO } from '@/lib/utils'

const EMPTY_FORM = {
  from_bus: '', position_log_id: '', tyre_id: '',
  to_bus: '', to_position: '', odometer: '', move_date: '', reason: '', destination_ledger_id: '',
}

// Which "Tyres In Stock" ledger a tyre lands in when it comes off a bus, and
// the tyre_master status that represents it — kept in sync with the mapping
// on Tyre Sale so the tyre reappears in the right place afterward.
const DESTINATION_STATUS_MAP: Record<string, string> = {
  'New Tyres In Stock': 'In Stock',
  'Tyres For Retread In Stock': 'Pending Retread',
  'Scrap Tyres In Stock': 'Scrapped',
}

// A tyre not currently mounted and not sold off is "in stock" somewhere —
// eligible as the source for Stock-to-Bus / Stock-to-Stock moves.
const isInStock = (t: any) => t.status !== 'In Use' && t.status !== 'Sold'

const today = todayISO()

function fmtDate(v: any) {
  if (!v) return '—'
  const d = new Date(v)
  if (isNaN(d.getTime())) return String(v)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default function TyreMovementPage() {
  const qc = useQueryClient()
  const [form, setForm] = useState(EMPTY_FORM)
  const [moveFrom, setMoveFrom] = useState<'bus' | 'store'>('bus')
  const [moveTo, setMoveTo] = useState<'bus' | 'store'>('bus')
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})

  const { data: activePositions, refetch: reloadActive, isFetching: loadingActive } = useQuery({ queryKey: ['tyre-positions'], queryFn: () => garageService.getTyrePositions() })
  const { data: history, isLoading: loadingHistory } = useQuery({ queryKey: ['tyre-position-history'], queryFn: () => garageService.getTyrePositionHistory() })
  const { data: tyres, refetch: reloadTyres, isFetching: loadingTyres } = useQuery({ queryKey: ['tyre-inventory'], queryFn: () => garageService.getTyreInventory() })
  const { data: buses, refetch: reloadBuses, isFetching: loadingBuses } = useQuery({ queryKey: ['buses'], queryFn: () => fuelService.getBusNumbers() })
  const { data: positions, refetch: reloadPositions, isFetching: loadingPositions } = useQuery({ queryKey: ['tyre-positions-master'], queryFn: () => mainmastersService.getTyrePositionsMaster() })
  const { data: ledgersData, refetch: reloadLedgers, isFetching: loadingLedgers } = useQuery({ queryKey: ['ledger-names-tyre'], queryFn: () => accountingService.getLedgerName() })

  const activeList: any[] = activePositions?.data ?? []
  const historyList: any[] = history?.data ?? []
  const busList: any[] = buses?.data ?? []
  const positionList: any[] = positions?.data ?? []
  const ledgerList: any[] = ledgersData?.data ?? []
  const stockTyreList: any[] = (tyres?.data ?? []).filter(isInStock)

  // Only the buckets a tyre can actually land in as stock — not "Retreading
  // Tyres In Stock", which is only ever set by completing an actual retread
  // (Retread Tyre Entry), not by this move.
  const destinationOptions = ledgerList
    .filter((l: any) => Object.prototype.hasOwnProperty.call(DESTINATION_STATUS_MAP, l.temple_name))
    .map((l: any) => ledgerOption(l))

  const destinationName = ledgerList.find((l: any) => String(l.id) === form.destination_ledger_id)?.temple_name || ''
  const destinationStatus = DESTINATION_STATUS_MAP[destinationName]

  const tyresOnFromBus = activeList.filter((p: any) => p.vehicle_number === form.from_bus)

  // Bus source: a mounted position-log row (id = position_log_id, tyre_id = tyre_master id).
  // Store source: a tyre_master row directly (its own id doubles as the tyre_id).
  const selectedSource = moveFrom === 'bus'
    ? activeList.find((p: any) => String(p.id) === form.position_log_id)
    : stockTyreList.find((t: any) => String(t.id) === form.tyre_id)
  const sourceTyreId = selectedSource ? (moveFrom === 'bus' ? selectedSource.tyre_id : selectedSource.id) : null

  const f = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((s) => ({ ...s, [k]: e.target.value }))
  const setField = (k: keyof typeof EMPTY_FORM) => (v: string) => setForm((s) => ({ ...s, [k]: v }))

  const { mutate: move, isPending } = useMutation({
    mutationFn: async () => {
      const userInfo = { user_id: localStorage.getItem('user_id'), usr_nm: localStorage.getItem('usr_nm') }
      const tyreCode = selectedSource.tyre_code

      if (moveFrom === 'bus') {
        const removeRes = await garageService.removeTyrePosition({
          id: selectedSource.id, tyre_id: sourceTyreId, removed_date: form.move_date,
          ...(moveTo === 'store' ? { new_status: destinationStatus } : {}),
          ...userInfo,
        })
        if (removeRes.status !== 200) throw new Error('Failed to close out old position')
        if (moveTo === 'store') return removeRes
        return garageService.assignTyrePosition({
          tyre_id: sourceTyreId, tyre_code: tyreCode, vehicle_number: form.to_bus, position: form.to_position,
          odometer_at_fitting: form.odometer, fitted_date: form.move_date, remarks: form.reason,
          ...userInfo,
        })
      }

      // moveFrom === 'store' — tyre isn't mounted, so there's no position to close out first.
      if (moveTo === 'bus') {
        return garageService.assignTyrePosition({
          tyre_id: sourceTyreId, tyre_code: tyreCode, vehicle_number: form.to_bus, position: form.to_position,
          odometer_at_fitting: form.odometer, fitted_date: form.move_date, remarks: form.reason,
          ...userInfo,
        })
      }
      return garageService.moveTyreStock({
        tyre_id: sourceTyreId, tyre_code: tyreCode, new_status: destinationStatus,
        ledger_description: form.reason, ...userInfo,
      })
    },
    onSuccess: (res: any) => {
      if (res.status === 200) {
        toast.success('Tyre moved!')
        qc.invalidateQueries({ queryKey: ['tyre-positions'] })
        qc.invalidateQueries({ queryKey: ['tyre-position-history'] })
        qc.invalidateQueries({ queryKey: ['tyre-inventory'] })
        setForm(EMPTY_FORM)
      } else toast.error('Failed to complete move')
    },
    onError: () => toast.error('Server error'),
  })

  const cols: Column[] = [
    { label: 'Sl No', key: '_idx', align: 'center', render: (_v, _row, i) => <span className="text-sm text-slate-500">{i + 1}</span> },
    { label: 'Vehicle', key: 'vehicle_number', filterable: true, render: (v) => <span className="font-bold text-blue-600">{String(v)}</span> },
    { label: 'Position', key: 'position', filterable: true, render: (v) => <Badge variant="purple">{String(v)}</Badge> },
    { label: 'Tyre Code', key: 'tyre_code', filterable: true, render: (v, r: any) => <div><div className="font-semibold">{String(v)}</div><div className="text-xs text-slate-500">{r.brand}</div></div> },
    { label: 'Fitted Date', key: 'fitted_date', align: 'center', filterable: true, render: (v) => <span className="text-sm">{fmtDate(v)}</span> },
    { label: 'Removed Date', key: 'removed_date', align: 'center', filterable: true, render: (v) => v ? <span className="text-sm">{fmtDate(v)}</span> : <Badge variant="success">Active</Badge> },
    { label: 'Odometer', key: 'odometer_at_fitting', align: 'right', filterable: true, render: (v) => <span className="text-sm">{v ? `${v} km` : '—'}</span> },
    { label: 'Reason / Remarks', key: 'remarks', filterable: true, render: (v) => <span className="text-slate-600">{v || '—'}</span> },
  ]

  const sourceReady = moveFrom === 'bus' ? !!form.position_log_id && !!selectedSource : !!form.tyre_id && !!selectedSource
  const canMove = sourceReady && (moveTo === 'bus' ? !!form.to_bus && !!form.to_position : !!form.destination_ledger_id)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Tyre Movement" subtitle="Move a tyre between buses and store: bus-to-bus, bus-to-stock, stock-to-bus, or stock-to-stock" />

      <GlassCard className="p-6" colorBar="bg-gradient-to-r from-indigo-500 to-blue-500">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><ArrowLeftRight className="w-5 h-5 text-indigo-500" /> Move Tyre</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">From</p>
              <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => { setMoveFrom('bus'); setForm((s) => ({ ...s, tyre_id: '' })) }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-colors ${moveFrom === 'bus' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <Truck className="w-3.5 h-3.5" /> Bus
                </button>
                <button
                  type="button"
                  onClick={() => { setMoveFrom('store'); setForm((s) => ({ ...s, from_bus: '', position_log_id: '' })) }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-colors ${moveFrom === 'store' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <Warehouse className="w-3.5 h-3.5" /> Store
                </button>
              </div>
            </div>

            {moveFrom === 'bus' ? (
              <>
                <div><Label>Select Bus</Label>
                  <SearchableSelect
                    value={form.from_bus}
                    onChange={(v) => setForm((s) => ({ ...s, from_bus: v, position_log_id: '' }))}
                    options={busList.map((b: any) => ({ value: b.bus_no, label: b.bus_no }))}
                    placeholder="Select Bus"
                    onReload={() => reloadBuses()}
                    reloading={loadingBuses}
                  /></div>
                <div><Label>Select Tyre</Label>
                  <SearchableSelect
                    value={form.position_log_id}
                    onChange={setField('position_log_id')}
                    options={tyresOnFromBus.map((p: any) => ({ value: String(p.id), label: `${p.tyre_code} — ${p.brand} (${p.position})` }))}
                    placeholder={form.from_bus ? 'Select Tyre' : 'Select a bus first'}
                    onReload={() => reloadActive()}
                    reloading={loadingActive}
                  /></div>
              </>
            ) : (
              <div><Label>Select Tyre</Label>
                <SearchableSelect
                  value={form.tyre_id}
                  onChange={setField('tyre_id')}
                  options={stockTyreList.map((t: any) => ({ value: String(t.id), label: `${t.tyre_code} — ${t.brand} (${t.status})` }))}
                  placeholder="Select Tyre from Store"
                  onReload={() => reloadTyres()}
                  reloading={loadingTyres}
                /></div>
            )}
          </div>

          <div className="space-y-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">To</p>
              <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => setMoveTo('bus')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-colors ${moveTo === 'bus' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <Truck className="w-3.5 h-3.5" /> Bus
                </button>
                <button
                  type="button"
                  onClick={() => setMoveTo('store')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-colors ${moveTo === 'store' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <Warehouse className="w-3.5 h-3.5" /> Store
                </button>
              </div>
            </div>

            {moveTo === 'bus' ? (
              <>
                <div><Label>Select Bus</Label>
                  <SearchableSelect
                    value={form.to_bus}
                    onChange={setField('to_bus')}
                    options={busList.map((b: any) => ({ value: b.bus_no, label: b.bus_no }))}
                    placeholder="Select Bus"
                    onReload={() => reloadBuses()}
                    reloading={loadingBuses}
                  /></div>
                <div><Label>Select Position</Label>
                  <SearchableSelect
                    value={form.to_position}
                    onChange={setField('to_position')}
                    options={positionList.map((p: any) => ({ value: p.position_name, label: p.position_name }))}
                    placeholder="Select Position"
                    onReload={() => reloadPositions()}
                    reloading={loadingPositions}
                  /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Odometer</Label><Input type="number" placeholder="km" value={form.odometer} onChange={f('odometer')} /></div>
                  <div><Label>Date</Label><Input type="date" max={today} value={form.move_date} onChange={f('move_date')} /></div>
                </div>
                <div><Label>Reason</Label><Input placeholder="e.g. Rotation, Puncture" value={form.reason} onChange={f('reason')} /></div>
              </>
            ) : (
              <>
                <div><Label>Destination <span className="text-red-500">*</span></Label>
                  <SearchableSelect
                    value={form.destination_ledger_id}
                    onChange={setField('destination_ledger_id')}
                    options={destinationOptions}
                    placeholder="Good stock, pending retread, or scrap?"
                    onReload={() => reloadLedgers()}
                    reloading={loadingLedgers}
                  /></div>
                <div><Label>Date</Label><Input type="date" max={today} value={form.move_date} onChange={f('move_date')} /></div>
                <div><Label>Reason</Label><Input placeholder="e.g. Worn out, Damaged" value={form.reason} onChange={f('reason')} /></div>
              </>
            )}
          </div>
        </div>
        {/* Submit sits under the fields, as on every other form. */}
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
          <Button onClick={() => move()} disabled={isPending || !canMove}><Save className="w-4 h-4" />{isPending ? 'Moving…' : 'Submit'}</Button>
        </div>
      </GlassCard>

      <DataTable
        title="Movement History"
        columns={cols}
        data={historyList}
        loading={loadingHistory}
        actions={[]}
        icon={<ArrowLeftRight className="w-5 h-5 text-blue-500" />}
        columnFilters={columnFilters}
        onColumnFilterChange={(k, v) => setColumnFilters((prev) => ({ ...prev, [k]: v }))}
      />
    </motion.div>
  )
}
