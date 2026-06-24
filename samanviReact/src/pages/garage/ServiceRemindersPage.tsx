import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { BellRing, Save, Plus, X, Edit2, CheckCircle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Select, Label, DataTable, Badge, PageHeader, SearchableSelect } from '@/components/shared'
import type { Column } from '@/components/shared'
import { garageService } from '@/services/garage.service'
import { fuelService } from '@/services/fuel.service'
import { mainmastersService } from '@/services/mainmasters.service'

const REPEAT_UNITS = ['Days', 'Weeks', 'Months', 'Years']

const EMPTY_FORM = {
  vehicle_number: '', reminder_type: '', due_date: '', due_odometer: '', last_done_odometer: '', remarks: '',
  is_repeating: false, repeat_interval: '1', repeat_unit: 'Months',
}

const today = new Date().toISOString().split('T')[0]

function statusBadge(row: any) {
  if (row.status === 'Completed') return <Badge variant="success">Completed</Badge>
  if (row.due_date && row.due_date < today) return <Badge variant="danger">Overdue</Badge>
  return <Badge variant="warning">Pending</Badge>
}

export default function ServiceRemindersPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const { data, isLoading } = useQuery({ queryKey: ['service-reminders'], queryFn: () => garageService.getServiceReminders() })
  const { data: buses, refetch: reloadBuses, isFetching: loadingBuses } = useQuery({ queryKey: ['buses'], queryFn: () => fuelService.getBusNumbers() })
  const { data: reminderTypes, refetch: reloadTypes, isFetching: loadingTypes } = useQuery({ queryKey: ['reminder-types'], queryFn: () => mainmastersService.getReminderTypes() })

  const busList: any[] = buses?.data ?? []
  const reminderTypeList: any[] = reminderTypes?.data ?? []
  const list: any[] = data?.data ?? []

  const f = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((s) => ({ ...s, [k]: e.target.value }))
  const setField = (k: keyof typeof EMPTY_FORM) => (v: string) => setForm((s) => ({ ...s, [k]: v }))

  const buildPayload = () => ({
    ...form,
    repeat_interval: form.is_repeating ? Number(form.repeat_interval) || 1 : null,
    repeat_unit: form.is_repeating ? form.repeat_unit : null,
    id: editId,
    user_id: localStorage.getItem('user_id'),
    usr_nm: localStorage.getItem('usr_nm'),
  })

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => (isEdit ? garageService.editServiceReminder(buildPayload()) : garageService.addServiceReminder(buildPayload())),
    onSuccess: (res) => {
      if (res.status === 200) { toast.success(isEdit ? 'Reminder updated!' : 'Reminder added!'); qc.invalidateQueries({ queryKey: ['service-reminders'] }); closeForm() }
      else toast.error('Failed to save')
    },
    onError: () => toast.error('Server error'),
  })

  const { mutate: complete, isPending: completing } = useMutation({
    mutationFn: () => garageService.completeServiceReminder({ id: editId, last_done_date: today, last_done_odometer: form.last_done_odometer || null }),
    onSuccess: (res) => {
      if (res.status === 200) { toast.success('Marked completed!'); qc.invalidateQueries({ queryKey: ['service-reminders'] }); closeForm() }
      else toast.error('Failed')
    },
    onError: () => toast.error('Server error'),
  })

  const handleEdit = (row: any) => {
    setForm({
      vehicle_number: row.vehicle_number ?? '', reminder_type: row.reminder_type ?? '',
      due_date: row.due_date ?? '', due_odometer: row.due_odometer ?? '',
      last_done_odometer: row.last_done_odometer ?? '', remarks: row.remarks ?? '',
      is_repeating: !!row.is_repeating, repeat_interval: String(row.repeat_interval ?? '1'), repeat_unit: row.repeat_unit ?? 'Months',
    })
    setIsEdit(true); setEditId(row.id); setShowForm(true)
  }

  const handleDelete = (row: any) => {
    garageService.deleteServiceReminder({ id: row.id }).then((res) => {
      if (res.status === 200) { toast.success('Reminder removed'); qc.invalidateQueries({ queryKey: ['service-reminders'] }) }
      else toast.error('Failed')
    })
  }

  const openAdd = () => { setForm(EMPTY_FORM); setIsEdit(false); setEditId(null); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setForm(EMPTY_FORM); setIsEdit(false); setEditId(null) }

  const cols: Column[] = [
    { label: 'Vehicle', key: 'vehicle_number', render: (v) => <span className="font-bold text-blue-600">{String(v)}</span> },
    { label: 'Reminder', key: 'reminder_type', render: (v, row: any) => (
      <div className="flex items-center gap-1.5">
        <span>{String(v)}</span>
        {!!row.is_repeating && <Badge variant="info">Repeats / {row.repeat_interval} {row.repeat_unit}</Badge>}
      </div>
    ) },
    { label: 'Due Date', key: 'due_date', render: (v) => <span className="text-sm">{String(v ?? '—')}</span> },
    { label: 'Due Odometer', key: 'due_odometer', render: (v) => <span className="text-sm">{v ? `${v} km` : '—'}</span> },
    { label: 'Status', key: 'status', render: (_v, row) => statusBadge(row) },
    { label: 'Remarks', key: 'remarks', render: (v) => <span className="text-xs max-w-xs truncate">{String(v ?? '—')}</span> },
  ]

  const canSave = !!form.vehicle_number && !!form.reminder_type

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex justify-between items-end">
        <PageHeader title="Service Reminders" subtitle="Track upcoming and overdue vehicle service tasks" />
        {!showForm && <Button onClick={openAdd}><Plus className="w-4 h-4" /> Add Reminder</Button>}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
            <GlassCard className="p-6" colorBar={isEdit ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-blue-500 to-cyan-500'}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  {isEdit ? <><Edit2 className="w-5 h-5 text-amber-500" /> Edit Reminder</> : <><BellRing className="w-5 h-5 text-blue-500" /> Add Reminder</>}
                </h2>
                <button onClick={closeForm} className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div><Label>Vehicle Number *</Label>
                  <SearchableSelect
                    value={form.vehicle_number}
                    onChange={setField('vehicle_number')}
                    options={busList.map((b) => ({ value: b.bus_no, label: b.bus_no }))}
                    placeholder="Select Bus"
                    onReload={() => reloadBuses()}
                    reloading={loadingBuses}
                  /></div>
                <div><Label>Reminder Type *</Label>
                  <SearchableSelect
                    value={form.reminder_type}
                    onChange={setField('reminder_type')}
                    options={reminderTypeList.map((t) => ({ value: t.type_name, label: t.type_name }))}
                    placeholder="Select Type"
                    onReload={() => reloadTypes()}
                    reloading={loadingTypes}
                  /></div>
                <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={f('due_date')} /></div>
                <div><Label>Due Odometer</Label><Input type="number" placeholder="km" value={form.due_odometer} onChange={f('due_odometer')} /></div>
                <div><Label>Last Done Odometer</Label><Input type="number" placeholder="km" value={form.last_done_odometer} onChange={f('last_done_odometer')} /></div>
                <div className="md:col-span-3"><Label>Remarks</Label><Input value={form.remarks} onChange={f('remarks')} /></div>
              </div>

              <div className="mt-5 pt-5 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer w-fit">
                  <input
                    type="checkbox"
                    checked={form.is_repeating}
                    onChange={(e) => setForm((s) => ({ ...s, is_repeating: e.target.checked }))}
                    className="w-4 h-4 accent-blue-500 rounded"
                  />
                  <span className="text-sm font-semibold text-slate-700">Repeats — auto-create the next reminder when this one is completed</span>
                </label>
                {form.is_repeating && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-5 mt-4">
                    <div><Label>Repeat Every</Label><Input type="number" min={1} value={form.repeat_interval} onChange={f('repeat_interval')} /></div>
                    <div><Label>Unit</Label>
                      <Select value={form.repeat_unit} onChange={f('repeat_unit')}>
                        {REPEAT_UNITS.map((u) => <option key={u}>{u}</option>)}
                      </Select></div>
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-6">
                <Button onClick={() => save()} disabled={isPending || !canSave}>
                  <Save className="w-4 h-4" />{isPending ? 'Saving…' : isEdit ? 'Update Reminder' : 'Save Reminder'}
                </Button>
                {isEdit && (
                  <Button variant="outline" onClick={() => complete()} disabled={completing}>
                    <CheckCircle className="w-4 h-4" />{completing ? 'Updating…' : 'Mark Completed'}
                  </Button>
                )}
                <Button variant="ghost" onClick={closeForm}><X className="w-4 h-4" /> Cancel</Button>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      <DataTable
        title="Service Reminders"
        columns={cols}
        data={list}
        loading={isLoading}
        onAction={(action, row) => { if (action === 'edit') handleEdit(row); if (action === 'delete') handleDelete(row) }}
        actions={['edit', 'delete']}
        icon={<BellRing className="w-5 h-5 text-blue-500" />}
      />
    </motion.div>
  )
}
