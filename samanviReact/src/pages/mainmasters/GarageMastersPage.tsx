import { useState } from 'react'
import React from 'react'
import { motion } from 'motion/react'
import { Save, Pencil, X, Check, History, IndianRupee } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Label, PageHeader, TopNavTabs, SearchableSelect, DataTable, Select } from '@/components/shared'
import type { Column } from '@/components/shared'
import { mainmastersService } from '@/services/mainmasters.service'
import { garageService } from '@/services/garage.service'
import { mastersService } from '@/services/masters.service'

const tabs = ['Service Reminder Types', 'Tyre Positions', 'Repair Categories', 'Spare Parts', 'Service Schedules', 'Lubricants & Fluids']

interface NameListMasterProps {
  label: string
  placeholder: string
  fieldKey: string
  queryKey: string
  getAll: () => Promise<any>
  add: (data: unknown) => Promise<any>
  edit: (data: unknown) => Promise<any>
  remove: (data: unknown) => Promise<any>
}

function NameListMaster({ label, placeholder, fieldKey, queryKey, getAll, add, edit, remove }: NameListMasterProps) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})

  const { data, isLoading } = useQuery({ queryKey: [queryKey], queryFn: getAll })
  const list: any[] = data?.data ?? []

  const { mutate: submit, isPending } = useMutation({
    mutationFn: () => add({ [fieldKey]: name.trim() }),
    onSuccess: (res) => {
      if (res.status === 200) { toast.success(`${label} added!`); qc.invalidateQueries({ queryKey: [queryKey] }); setName('') }
      else toast.error('Failed')
    },
    onError: () => toast.error('Server error'),
  })

  const { mutate: editSave } = useMutation({
    mutationFn: () => edit({ id: editId, [fieldKey]: editValue.trim() }),
    onSuccess: (res) => {
      if (res.status === 200) { toast.success('Updated!'); qc.invalidateQueries({ queryKey: [queryKey] }); setEditId(null); setEditValue('') }
      else toast.error('Failed')
    },
    onError: () => toast.error('Server error'),
  })

  const { mutate: del } = useMutation({
    mutationFn: (id: number) => remove({ id }),
    onSuccess: (res) => {
      if (res.status === 200) { toast.success('Deleted'); qc.invalidateQueries({ queryKey: [queryKey] }) }
      else toast.error('Failed')
    },
    onError: () => toast.error('Server error'),
  })

  return (
    <>
      <GlassCard className="p-6" colorBar="bg-gradient-to-r from-blue-500 to-cyan-500">
        <div className="flex items-end gap-4">
          <div className="flex-1 max-w-sm">
            <Label>{label} <span className="text-red-500">*</span></Label>
            <Input
              placeholder={placeholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && name.trim() && submit()}
            />
          </div>
          <Button onClick={() => submit()} disabled={isPending || !name.trim()}>
            <Save className="w-4 h-4" />{isPending ? 'Saving…' : 'Submit'}
          </Button>
        </div>
      </GlassCard>

      <DataTable
        title={`${label} List`}
        columns={[
          { label: 'S.No', key: '_idx', align: 'center', render: (_v, _row, i) => <span className="text-slate-500">{i + 1}</span> },
          { label, key: fieldKey, filterable: true, render: (v, row: any) => (
            editId === row.id ? (
              <Input
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && editValue.trim()) editSave(); if (e.key === 'Escape') setEditId(null) }}
                className="h-9 max-w-xs"
              />
            ) : (
              <span className="font-medium text-slate-800">{String(v)}</span>
            )
          ) },
          { label: 'Action', key: 'id', align: 'center', render: (_v, row: any) => (
            editId === row.id ? (
              <div className="flex items-center justify-center gap-2">
                <button onClick={() => editValue.trim() && editSave()} className="text-emerald-500 hover:text-emerald-700 transition-colors" title="Save"><Check className="w-4 h-4" /></button>
                <button onClick={() => { setEditId(null); setEditValue('') }} className="text-slate-400 hover:text-red-500 transition-colors" title="Cancel"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <button onClick={() => { setEditId(row.id); setEditValue(row[fieldKey]) }} className="text-blue-500 hover:text-blue-700 transition-colors" title="Edit"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => del(row.id)} className="text-red-400 hover:text-red-600 transition-colors" title="Delete"><X className="w-4 h-4" /></button>
              </div>
            )
          ) },
        ]}
        data={list}
        loading={isLoading}
        columnFilters={columnFilters}
        onColumnFilterChange={(k, v) => setColumnFilters((prev) => ({ ...prev, [k]: v }))}
      />
    </>
  )
}

const EMPTY_PART = { part_number: '', part_name: '', price: '', category_id: '' }

function fmtDate(d: string) {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function fmtDateShort(d: string) {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function SparePartsMaster() {
  const qc = useQueryClient()
  const [form, setForm] = useState(EMPTY_PART)
  const [editId, setEditId] = useState<number | null>(null)
  const formRef = React.useRef<HTMLDivElement>(null)
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})

  // Edit Price modal
  const [priceModal, setPriceModal] = useState<{ open: boolean; part: any; newPrice: string }>({ open: false, part: null, newPrice: '' })

  // Price History modal
  const [historyModal, setHistoryModal] = useState<{ open: boolean; part: any }>({ open: false, part: null })

  const { data, isLoading } = useQuery({ queryKey: ['repair-parts'], queryFn: () => garageService.getParts() })
  const list: any[] = data?.data ?? []

  const { data: catsData, refetch: reloadCats, isFetching: loadingCats } = useQuery({
    queryKey: ['repair-cats-masters'],
    queryFn: () => garageService.getCategories(),
  })
  const catList: any[] = catsData?.data ?? []
  const catOptions = catList.map((c: any) => ({ value: String(c.id), label: c.name }))

  const { data: historyData, isLoading: loadingHistory } = useQuery({
    queryKey: ['part-price-history', historyModal.part?.part_id],
    queryFn: () => garageService.getPartPriceHistory({ part_id: historyModal.part?.part_id }),
    enabled: historyModal.open && !!historyModal.part?.part_id,
  })
  const historyList: any[] = historyData?.data ?? []

  const f = (k: keyof typeof EMPTY_PART) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((s) => ({ ...s, [k]: e.target.value }))

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => (editId ? garageService.editPart({ ...form, id: editId }) : garageService.addPart(form)),
    onSuccess: (res) => {
      if (res.status === 200) { toast.success(editId ? 'Part updated!' : 'Part added!'); qc.invalidateQueries({ queryKey: ['repair-parts'] }); reset() }
      else toast.error('Failed')
    },
    onError: () => toast.error('Server error'),
  })

  const { mutate: del } = useMutation({
    mutationFn: (id: number) => garageService.deletePart({ id }),
    onSuccess: (res) => {
      if (res.status === 200) { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['repair-parts'] }) }
      else toast.error('Failed')
    },
    onError: () => toast.error('Server error'),
  })

  const { mutate: savePrice, isPending: savingPrice } = useMutation({
    mutationFn: () => garageService.editPartPrice({ id: priceModal.part?.part_id, price: priceModal.newPrice }),
    onSuccess: (res) => {
      if (res.status === 200) {
        toast.success(`Price updated to ₹${priceModal.newPrice}`)
        qc.invalidateQueries({ queryKey: ['repair-parts'] })
        qc.invalidateQueries({ queryKey: ['part-price-history', priceModal.part?.part_id] })
        setPriceModal({ open: false, part: null, newPrice: '' })
      } else toast.error('Failed to update price')
    },
    onError: () => toast.error('Server error'),
  })

  const startEdit = (row: any) => {
    setForm({ part_number: row.part_number ?? '', part_name: row.part_name ?? '', price: row.price ?? '', category_id: row.category_id ? String(row.category_id) : '' })
    setEditId(row.part_id)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }
  const reset = () => { setForm(EMPTY_PART); setEditId(null) }
  const canSave = !!form.part_name.trim()

  return (
    <>
      <div ref={formRef}>
      <GlassCard className="p-6" colorBar="bg-gradient-to-r from-amber-500 to-orange-500">
        <div className="flex items-end gap-4 flex-wrap">
          <div><Label>Number</Label><Input placeholder="e.g. PRT-001" value={form.part_number} onChange={f('part_number')} className="w-36" /></div>
          <div className="flex-1 min-w-[180px]"><Label>Name <span className="text-red-500">*</span></Label><Input placeholder="e.g. Engine Oil" value={form.part_name} onChange={f('part_name')} /></div>
          <div className="w-48">
            <Label>Category</Label>
            <SearchableSelect
              value={form.category_id}
              onChange={(v) => setForm(s => ({ ...s, category_id: v }))}
              options={catOptions}
              placeholder="Select category"
              onReload={() => reloadCats()}
              reloading={loadingCats}
            />
          </div>
          <div><Label>Cost (₹)</Label><Input type="number" placeholder="0" value={form.price} onChange={f('price')} className="w-28" /></div>
          <Button onClick={() => save()} disabled={isPending || !canSave}>
            <Save className="w-4 h-4" />{isPending ? 'Saving…' : editId ? 'Update' : 'Submit'}
          </Button>
          {editId && <Button variant="ghost" onClick={reset}><X className="w-4 h-4" /> Cancel</Button>}
        </div>
      </GlassCard>
      </div>

      <DataTable
        title="Spare Parts"
        columns={[
          { label: 'Number', key: 'part_number', filterable: true, render: (v) => <span className="text-slate-600">{v || '—'}</span> },
          { label: 'Name', key: 'part_name', filterable: true, render: (v) => <span className="font-medium text-slate-800">{v}</span> },
          { label: 'Category', key: 'category_name', filterable: true, render: (v) => (
            v ? <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">{v}</span>
              : <span className="text-slate-400 text-xs">—</span>
          ) },
          { label: 'Cost (₹)', key: 'price', align: 'right', render: (v) => <span className="font-bold text-slate-800">₹{v ?? 0}</span> },
          { label: 'Actions', key: 'part_id', align: 'center', render: (_v, row: any) => (
            <div className="flex items-center justify-center gap-2">
              {/* Edit full details */}
              <button
                onClick={() => startEdit(row)}
                title="Edit details"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                <Pencil className="w-3 h-3" /> Edit
              </button>
              {/* Edit price only */}
              <button
                onClick={() => setPriceModal({ open: true, part: row, newPrice: String(row.price ?? '') })}
                title="Edit cost"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors"
              >
                <IndianRupee className="w-3 h-3" /> Cost
              </button>
              {/* Price history */}
              <button
                onClick={() => setHistoryModal({ open: true, part: row })}
                title="Price history"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                <History className="w-3 h-3" /> History
              </button>
              {/* Delete */}
              <button
                onClick={() => del(row.part_id)}
                title="Delete"
                className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) },
        ]}
        data={list}
        loading={isLoading}
        columnFilters={columnFilters}
        onColumnFilterChange={(k, v) => setColumnFilters((prev) => ({ ...prev, [k]: v }))}
      />

      {/* ── Edit Price Modal ─────────────────────────────────────────────── */}
      {priceModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-800">Edit Cost</h3>
                <p className="text-xs text-slate-500 mt-0.5">{priceModal.part?.part_name}</p>
              </div>
              <button onClick={() => setPriceModal({ open: false, part: null, newPrice: '' })} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                <span className="text-sm text-slate-500 font-medium">Current Cost</span>
                <span className="text-lg font-extrabold text-slate-700">₹{priceModal.part?.price ?? 0}</span>
              </div>
              <div>
                <Label>New Cost (₹) <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  autoFocus
                  placeholder="Enter new cost"
                  value={priceModal.newPrice}
                  onChange={(e) => setPriceModal(s => ({ ...s, newPrice: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && priceModal.newPrice && savePrice()}
                />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-slate-100 justify-end">
              <Button variant="outline" onClick={() => setPriceModal({ open: false, part: null, newPrice: '' })}>Cancel</Button>
              <Button
                disabled={savingPrice || !priceModal.newPrice || priceModal.newPrice === String(priceModal.part?.price ?? '')}
                onClick={() => savePrice()}
              >
                <Save className="w-4 h-4" />{savingPrice ? 'Saving…' : 'Update Cost'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Price History Modal ──────────────────────────────────────────── */}
      {historyModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <History className="w-4 h-4 text-slate-500" /> Cost History
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {historyModal.part?.part_name}
                  {historyModal.part?.part_number && <span className="ml-1.5 text-slate-400">· {historyModal.part.part_number}</span>}
                </p>
              </div>
              <button onClick={() => setHistoryModal({ open: false, part: null })} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6">
              {/* Current price banner — always pull from live list so it shows updated value */}
              {(() => {
                const livePart = list.find((p: any) => p.part_id === historyModal.part?.part_id)
                const livePrice = livePart?.price ?? historyModal.part?.price ?? 0
                return (
                  <div className="flex items-center justify-between rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 mb-5">
                    <span className="text-sm font-semibold text-amber-700">Current Cost</span>
                    <span className="text-xl font-extrabold text-amber-700">₹{parseFloat(livePrice).toLocaleString('en-IN')}</span>
                  </div>
                )
              })()}

              {loadingHistory ? (
                <div className="text-center py-8 text-slate-400 text-sm">Loading history…</div>
              ) : historyList.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">No price changes recorded yet.</div>
              ) : (
                <div className="space-y-3">
                  {historyList.map((h: any, i: number) => {
                    const oldP = parseFloat(h.old_price)
                    const newP = parseFloat(h.new_price)
                    const diff = newP - oldP
                    const up   = diff > 0
                    // historyList is DESC (newest first)
                    const validFrom = fmtDate(h.changed_at)
                    const validTo   = i === 0 ? null : fmtDate(historyList[i - 1].changed_at)
                    return (
                      <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                        {/* Date range */}
                        <div className="flex items-start gap-2 text-xs mb-3">
                          <div className="flex-1">
                            <div className="text-slate-400 font-semibold uppercase tracking-wide mb-0.5">From</div>
                            <div className="font-semibold text-slate-700">{validFrom}</div>
                          </div>
                          <span className="text-slate-300 mt-4">→</span>
                          <div className="flex-1">
                            <div className="text-slate-400 font-semibold uppercase tracking-wide mb-0.5">To</div>
                            {validTo
                              ? <div className="font-semibold text-slate-700">{validTo}</div>
                              : <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">Current</span>
                            }
                          </div>
                        </div>
                        {/* Price change */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 line-through text-sm">₹{oldP.toLocaleString('en-IN')}</span>
                            <span className="text-slate-300 text-sm">→</span>
                            <span className="text-slate-800 font-extrabold text-base">₹{newP.toLocaleString('en-IN')}</span>
                          </div>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${up ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                            {up ? '▲' : '▼'} ₹{Math.abs(diff).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center flex-shrink-0">
              <span className="text-xs text-slate-400">{historyList.length} change{historyList.length !== 1 ? 's' : ''} recorded</span>
              <Button variant="outline" onClick={() => setHistoryModal({ open: false, part: null })}>Close</Button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  )
}

const EMPTY_SCHEDULE = { company_name: '', service_type: '', sub_type: '', km_interval: '', days_interval: '', free_or_paid: 'Free' }

function ServiceSchedulesMaster() {
  const qc = useQueryClient()
  const [form, setForm] = useState(EMPTY_SCHEDULE)
  const [editId, setEditId] = useState<number | null>(null)
  const formRef = React.useRef<HTMLDivElement>(null)
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})

  const { data, isLoading } = useQuery({ queryKey: ['service-schedules'], queryFn: () => mainmastersService.getServiceSchedules() })
  const list: any[] = data?.data ?? []

  const { data: companiesData, refetch: reloadCompanies, isFetching: loadingCompanies } = useQuery({
    queryKey: ['vehicle-companies-master'],
    queryFn: () => mastersService.getVehicleCompanies(),
  })
  const companyList: any[] = companiesData?.data ?? []
  const companyOptions = companyList.map((c: any) => ({ value: c.company_name, label: c.company_name }))

  const f = (k: keyof typeof EMPTY_SCHEDULE) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((s) => ({ ...s, [k]: e.target.value }))

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => (editId ? mainmastersService.editServiceSchedule({ ...form, id: editId }) : mainmastersService.addServiceSchedule(form)),
    onSuccess: (res) => {
      if (res.status === 200) { toast.success(editId ? 'Schedule updated!' : 'Schedule added!'); qc.invalidateQueries({ queryKey: ['service-schedules'] }); reset() }
      else toast.error('Failed')
    },
    onError: () => toast.error('Server error'),
  })

  const { mutate: del } = useMutation({
    mutationFn: (id: number) => mainmastersService.deleteServiceSchedule({ id }),
    onSuccess: (res) => {
      if (res.status === 200) { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['service-schedules'] }) }
      else toast.error('Failed')
    },
    onError: () => toast.error('Server error'),
  })

  const startEdit = (row: any) => {
    setForm({
      company_name: row.company_name ?? '', service_type: row.service_type ?? '',
      sub_type: row.sub_type ?? '', km_interval: row.km_interval ?? '',
      days_interval: row.days_interval ?? '', free_or_paid: row.free_or_paid ?? 'Free',
    })
    setEditId(row.id)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }
  const reset = () => { setForm(EMPTY_SCHEDULE); setEditId(null) }
  const canSave = !!form.company_name && !!form.service_type.trim() && !!form.km_interval

  return (
    <>
      <div ref={formRef}>
      <GlassCard className="p-6" colorBar="bg-gradient-to-r from-teal-500 to-emerald-500">
        <div className="flex items-end gap-4 flex-wrap">
          <div className="w-48">
            <Label>Company <span className="text-red-500">*</span></Label>
            <SearchableSelect
              value={form.company_name}
              onChange={(v) => setForm(s => ({ ...s, company_name: v }))}
              options={companyOptions}
              placeholder="Select company"
              onReload={() => reloadCompanies()}
              reloading={loadingCompanies}
            />
          </div>
          <div className="flex-1 min-w-[160px]"><Label>Service Type <span className="text-red-500">*</span></Label><Input placeholder="e.g. Oil Change" value={form.service_type} onChange={f('service_type')} /></div>
          <div className="flex-1 min-w-[160px]"><Label>Sub Type</Label><Input placeholder="e.g. Full Synthetic" value={form.sub_type} onChange={f('sub_type')} /></div>
          <div><Label>KM Interval <span className="text-red-500">*</span></Label><Input type="number" placeholder="e.g. 5000" value={form.km_interval} onChange={f('km_interval')} className="w-32" /></div>
          <div><Label>Day Interval</Label><Input type="number" placeholder="e.g. 180" value={form.days_interval} onChange={f('days_interval')} className="w-32" /></div>
          <div className="w-32">
            <Label>Free / Paid</Label>
            <Select value={form.free_or_paid} onChange={f('free_or_paid')}>
              <option value="Free">Free</option>
              <option value="Paid">Paid</option>
            </Select>
          </div>
          <Button onClick={() => save()} disabled={isPending || !canSave}>
            <Save className="w-4 h-4" />{isPending ? 'Saving…' : editId ? 'Update' : 'Submit'}
          </Button>
          {editId && <Button variant="ghost" onClick={reset}><X className="w-4 h-4" /> Cancel</Button>}
        </div>
      </GlassCard>
      </div>

      <DataTable
        title="Service Schedules"
        columns={[
          { label: 'Sl No', key: '_idx', align: 'center', render: (_v, _row, i) => <span className="text-slate-500">{i + 1}</span> },
          { label: 'Company', key: 'company_name', filterable: true, render: (v) => <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-xs font-semibold">{v}</span> },
          { label: 'Service Type', key: 'service_type', filterable: true, render: (v) => <span className="font-medium text-slate-800">{v}</span> },
          { label: 'Sub Type', key: 'sub_type', filterable: true, render: (v) => <span className="text-slate-600">{v || '—'}</span> },
          { label: 'KM Interval', key: 'km_interval', align: 'right', render: (v) => <span className="font-bold text-slate-800">{v} km</span> },
          { label: 'Day Interval', key: 'days_interval', align: 'right', render: (v) => <span className="text-slate-700">{v ? `${v} days` : '—'}</span> },
          { label: 'Free/Paid', key: 'free_or_paid', filterable: true, render: (v) => (
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${v === 'Paid' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{v || 'Free'}</span>
          ) },
          { label: 'Actions', key: 'id', align: 'center', render: (_v, row: any) => (
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => startEdit(row)} className="text-blue-500 hover:text-blue-700 transition-colors" title="Edit"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => del(row.id)} className="text-red-400 hover:text-red-600 transition-colors" title="Delete"><X className="w-4 h-4" /></button>
            </div>
          ) },
        ]}
        data={list}
        loading={isLoading}
        columnFilters={columnFilters}
        onColumnFilterChange={(k, v) => setColumnFilters((prev) => ({ ...prev, [k]: v }))}
      />
    </>
  )
}

const EMPTY_LUBRICANT = { company_name: '', aggregate_name: '', quantity: '', fluid_type: '', recommended_brand: '', change_periodicity: '' }

function LubricantsMaster() {
  const qc = useQueryClient()
  const [form, setForm] = useState(EMPTY_LUBRICANT)
  const [editId, setEditId] = useState<number | null>(null)
  const formRef = React.useRef<HTMLDivElement>(null)
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})

  const { data, isLoading } = useQuery({ queryKey: ['lubricant-schedules'], queryFn: () => mainmastersService.getLubricantSchedules() })
  const list: any[] = data?.data ?? []

  const { data: companiesData, refetch: reloadCompanies, isFetching: loadingCompanies } = useQuery({
    queryKey: ['vehicle-companies-master'],
    queryFn: () => mastersService.getVehicleCompanies(),
  })
  const companyList: any[] = companiesData?.data ?? []
  const companyOptions = companyList.map((c: any) => ({ value: c.company_name, label: c.company_name }))

  const f = (k: keyof typeof EMPTY_LUBRICANT) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((s) => ({ ...s, [k]: e.target.value }))

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => (editId ? mainmastersService.editLubricantSchedule({ ...form, id: editId }) : mainmastersService.addLubricantSchedule(form)),
    onSuccess: (res) => {
      if (res.status === 200) { toast.success(editId ? 'Updated!' : 'Added!'); qc.invalidateQueries({ queryKey: ['lubricant-schedules'] }); reset() }
      else toast.error('Failed')
    },
    onError: () => toast.error('Server error'),
  })

  const { mutate: del } = useMutation({
    mutationFn: (id: number) => mainmastersService.deleteLubricantSchedule({ id }),
    onSuccess: (res) => {
      if (res.status === 200) { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['lubricant-schedules'] }) }
      else toast.error('Failed')
    },
    onError: () => toast.error('Server error'),
  })

  const startEdit = (row: any) => {
    setForm({
      company_name: row.company_name ?? '', aggregate_name: row.aggregate_name ?? '',
      quantity: row.quantity ?? '', fluid_type: row.fluid_type ?? '',
      recommended_brand: row.recommended_brand ?? '', change_periodicity: row.change_periodicity ?? '',
    })
    setEditId(row.id)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }
  const reset = () => { setForm(EMPTY_LUBRICANT); setEditId(null) }
  const canSave = !!form.company_name && !!form.aggregate_name.trim()

  return (
    <>
      <div ref={formRef}>
      <GlassCard className="p-6" colorBar="bg-gradient-to-r from-cyan-500 to-blue-500">
        <div className="flex items-end gap-4 flex-wrap">
          <div className="w-48">
            <Label>Company <span className="text-red-500">*</span></Label>
            <SearchableSelect
              value={form.company_name}
              onChange={(v) => setForm(s => ({ ...s, company_name: v }))}
              options={companyOptions}
              placeholder="Select company"
              onReload={() => reloadCompanies()}
              reloading={loadingCompanies}
            />
          </div>
          <div className="flex-1 min-w-[150px]"><Label>Aggregate <span className="text-red-500">*</span></Label><Input placeholder="e.g. Engine Oil" value={form.aggregate_name} onChange={f('aggregate_name')} /></div>
          <div className="flex-1 min-w-[130px]"><Label>Quantity</Label><Input placeholder="e.g. 25.3 Ltrs" value={form.quantity} onChange={f('quantity')} /></div>
          <div className="flex-1 min-w-[150px]"><Label>Fluid Type/Grade</Label><Input placeholder="e.g. 10W30 CK4" value={form.fluid_type} onChange={f('fluid_type')} /></div>
          <div className="flex-1 min-w-[170px]"><Label>Recommended Brand</Label><Input placeholder="e.g. Tata Genuine Engine Oil" value={form.recommended_brand} onChange={f('recommended_brand')} /></div>
          <div className="flex-1 min-w-[150px]"><Label>Change Periodicity</Label><Input placeholder="e.g. 40,000 km" value={form.change_periodicity} onChange={f('change_periodicity')} /></div>
          <Button onClick={() => save()} disabled={isPending || !canSave}>
            <Save className="w-4 h-4" />{isPending ? 'Saving…' : editId ? 'Update' : 'Submit'}
          </Button>
          {editId && <Button variant="ghost" onClick={reset}><X className="w-4 h-4" /> Cancel</Button>}
        </div>
      </GlassCard>
      </div>

      <DataTable
        title="Lubricants & Fluids"
        columns={[
          { label: 'Sl No', key: '_idx', align: 'center', render: (_v, _row, i) => <span className="text-slate-500">{i + 1}</span> },
          { label: 'Company', key: 'company_name', filterable: true, render: (v) => <span className="px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 text-xs font-semibold">{v}</span> },
          { label: 'Aggregate', key: 'aggregate_name', filterable: true, render: (v) => <span className="font-medium text-slate-800">{v}</span> },
          { label: 'Quantity', key: 'quantity', render: (v) => <span className="text-slate-600">{v || '—'}</span> },
          { label: 'Fluid Type/Grade', key: 'fluid_type', filterable: true, render: (v) => <span className="text-slate-600">{v || '—'}</span> },
          { label: 'Recommended Brand', key: 'recommended_brand', filterable: true, render: (v) => <span className="text-slate-600">{v || '—'}</span> },
          { label: 'Change Periodicity', key: 'change_periodicity', render: (v) => <span className="font-bold text-slate-800">{v || '—'}</span> },
          { label: 'Actions', key: 'id', align: 'center', render: (_v, row: any) => (
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => startEdit(row)} className="text-blue-500 hover:text-blue-700 transition-colors" title="Edit"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => del(row.id)} className="text-red-400 hover:text-red-600 transition-colors" title="Delete"><X className="w-4 h-4" /></button>
            </div>
          ) },
        ]}
        data={list}
        loading={isLoading}
        columnFilters={columnFilters}
        onColumnFilterChange={(k, v) => setColumnFilters((prev) => ({ ...prev, [k]: v }))}
      />
    </>
  )
}

export default function GarageMastersPage() {
  const [tab, setTab] = useState(tabs[0])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <PageHeader title="Garage Masters" subtitle="Manage the type and inventory lists used across the Garage module" />
      <TopNavTabs tabs={tabs} activeTab={tab} onChange={setTab} />

      {tab === 'Service Reminder Types' && (
        <NameListMaster
          label="Reminder Type"
          placeholder="e.g. Oil Change, Insurance Renewal…"
          fieldKey="type_name"
          queryKey="reminder-types"
          getAll={mainmastersService.getReminderTypes}
          add={mainmastersService.addReminderType}
          edit={mainmastersService.editReminderType}
          remove={mainmastersService.deleteReminderType}
        />
      )}

      {tab === 'Tyre Positions' && (
        <NameListMaster
          label="Tyre Position"
          placeholder="e.g. Front Left, Spare 1…"
          fieldKey="position_name"
          queryKey="tyre-positions-master"
          getAll={mainmastersService.getTyrePositionsMaster}
          add={mainmastersService.addTyrePositionMaster}
          edit={mainmastersService.editTyrePositionMaster}
          remove={mainmastersService.deleteTyrePositionMaster}
        />
      )}

      {tab === 'Repair Categories' && (
        <NameListMaster
          label="Repair Category"
          placeholder="e.g. Engine Repair, Brakes…"
          fieldKey="name"
          queryKey="repair-cats"
          getAll={garageService.getCategories}
          add={garageService.addCategory}
          edit={garageService.editCategory}
          remove={garageService.deleteCategory}
        />
      )}

      {tab === 'Spare Parts' && <SparePartsMaster />}

      {tab === 'Service Schedules' && <ServiceSchedulesMaster />}

      {tab === 'Lubricants & Fluids' && <LubricantsMaster />}
    </motion.div>
  )
}
