import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import { BellRing, Save, Plus, X, Edit2, CheckCircle, ChevronDown, Sparkles, Wrench } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Select, Label, DataTable, Badge, PageHeader, SearchableSelect } from '@/components/shared'
import type { Column } from '@/components/shared'
import { garageService } from '@/services/garage.service'
import { fuelService } from '@/services/fuel.service'
import { mainmastersService } from '@/services/mainmasters.service'
import { scrollContentToTop } from '@/lib/utils'

const REPEAT_UNITS = ['Days', 'Weeks', 'Months', 'Years']

// ── Generic multi-select checkbox picker (used for service schedules & reminder types) ──
function MultiSelectPicker({ options, selectedIds, onChange, placeholder, emptyLabel }: {
  options: { id: string | number; label: React.ReactNode }[]
  selectedIds: (string | number)[]
  onChange: (ids: (string | number)[]) => void
  placeholder: string
  emptyLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelId = useRef(`msp-panel-${Math.random().toString(36).slice(2)}`).current

  const openDropdown = () => {
    if (btnRef.current) setRect(btnRef.current.getBoundingClientRect())
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (document.getElementById(panelId)?.contains(e.target as Node) ||
          btnRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    const onScroll = (e: Event) => {
      if (document.getElementById(panelId)?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', close)
    window.addEventListener('scroll', onScroll, true)
    return () => { document.removeEventListener('mousedown', close); window.removeEventListener('scroll', onScroll, true) }
  }, [open, panelId])

  const toggle = (id: string | number) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((i) => i !== id) : [...selectedIds, id])
  }

  const spaceBelow = rect ? window.innerHeight - rect.bottom : 999
  const openUpward = spaceBelow < 320

  const panel = open && rect && createPortal(
    <div id={panelId}
      style={{
        position: 'fixed',
        top: openUpward ? undefined : rect.bottom + 4,
        bottom: openUpward ? window.innerHeight - rect.top + 4 : undefined,
        left: rect.left, width: Math.max(rect.width, 280), maxHeight: 300, zIndex: 99999,
      }}
      className="rounded-xl border border-slate-200 bg-white shadow-2xl flex flex-col overflow-hidden"
    >
      <ul className="overflow-y-auto flex-1">
        {options.length === 0 && (
          <li className="px-4 py-3 text-sm text-slate-400">{emptyLabel ?? 'No options available.'}</li>
        )}
        {options.map((o) => (
          <li key={o.id}
            onMouseDown={(e) => { e.preventDefault(); toggle(o.id) }}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm cursor-pointer hover:bg-slate-50 transition-colors">
            <input type="checkbox" readOnly checked={selectedIds.includes(o.id)} className="w-4 h-4 accent-blue-500 rounded pointer-events-none" />
            <span className="text-slate-800">{o.label}</span>
          </li>
        ))}
      </ul>
    </div>,
    document.body
  )

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={openDropdown}
        className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white/50 px-4 py-2 text-sm shadow-sm transition-all hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 focus-visible:border-[#2563EB] focus-visible:bg-white"
      >
        <span className={selectedIds.length ? 'text-slate-900' : 'text-slate-400'}>
          {selectedIds.length ? `${selectedIds.length} selected` : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 ml-2 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {panel}
    </>
  )
}

const EMPTY_FORM = {
  vehicle_number: '', reminder_type: '', due_date: '', due_odometer: '', last_done_odometer: '', remarks: '',
  is_repeating: false, repeat_interval: '1', repeat_unit: 'Months',
}

const EMPTY_TYPE_ROW = { due_date: '', due_odometer: '', last_done_odometer: '', remarks: '' }
type TypeRow = typeof EMPTY_TYPE_ROW

const EMPTY_SCHEDULE_ROW = { due_date: '', due_odometer: '', last_done_odometer: '' }
type ScheduleRow = typeof EMPTY_SCHEDULE_ROW

const today = new Date().toISOString().split('T')[0]

const JOB_PRIORITIES = ['High', 'Medium', 'Low']
const EMPTY_JOB_CARD_FORM = { job_date: today, odometer: '', driver: '', category: '', priority: 'Medium', technician: '', description: '' }

function isOverdue(row: any) {
  return row.status !== 'Completed' && !!row.due_date && row.due_date < today
}

// True from the due date onward (today or overdue) — used to surface the
// "Job Card" action as soon as a reminder comes due, not only once it's overdue.
function isDueOrOverdue(row: any) {
  return row.status !== 'Completed' && !!row.due_date && row.due_date <= today
}

function fmtDate(d: string) {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'Asia/Kolkata' })
}

function statusBadge(row: any) {
  const cls = 'text-xs px-2 py-0.5'
  if (row.status === 'Completed') return <Badge variant="success" className={cls}>Completed</Badge>
  if (isOverdue(row)) return <Badge variant="danger" className={cls}>Overdue</Badge>
  return <Badge variant="warning" className={cls}>Pending</Badge>
}

export default function ServiceRemindersPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [selectedReminderTypes, setSelectedReminderTypes] = useState<string[]>([])
  const [typeRows, setTypeRows] = useState<Record<string, TypeRow>>({})
  const [selectedScheduleIds, setSelectedScheduleIds] = useState<number[]>([])
  const [scheduleRows, setScheduleRows] = useState<Record<number, ScheduleRow>>({})
  const [jobCardModal, setJobCardModal] = useState<{ open: boolean; reminder: any }>({ open: false, reminder: null })
  const [jobCardForm, setJobCardForm] = useState(EMPTY_JOB_CARD_FORM)
  const [jobCardSubmitted, setJobCardSubmitted] = useState(false)
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})

  const { data, isLoading } = useQuery({ queryKey: ['service-reminders'], queryFn: () => garageService.getServiceReminders() })
  const { data: buses, refetch: reloadBuses, isFetching: loadingBuses } = useQuery({ queryKey: ['buses'], queryFn: () => fuelService.getBusNumbers() })
  const { data: reminderTypes, refetch: reloadTypes, isFetching: loadingTypes } = useQuery({ queryKey: ['reminder-types'], queryFn: () => mainmastersService.getReminderTypes() })
  const { data: schedules } = useQuery({ queryKey: ['service-schedules'], queryFn: () => mainmastersService.getServiceSchedules() })
  const { data: categories, refetch: reloadCats, isFetching: loadingCats } = useQuery({ queryKey: ['repair-cats'], queryFn: () => garageService.getCategories() })
  const { data: staffData, refetch: reloadStaff, isFetching: loadingStaff } = useQuery({ queryKey: ['garage-staff'], queryFn: () => garageService.getStaff() })
  const { data: driversData, refetch: reloadDrivers, isFetching: loadingDrivers } = useQuery({ queryKey: ['garage-drivers'], queryFn: () => garageService.getDriversList() })

  const busList: any[] = buses?.data ?? []
  const reminderTypeList: any[] = reminderTypes?.data ?? []
  const scheduleList: any[] = schedules?.data ?? []
  const list: any[] = data?.data ?? []
  const catList: any[] = categories?.data ?? []
  const staffList: any[] = staffData?.data ?? []
  const driverList: any[] = driversData?.data ?? []

  const selectedBusCompany = busList.find((b) => b.bus_no === form.vehicle_number)?.company
  const applicableSchedules = selectedBusCompany ? scheduleList.filter((s) => s.company_name === selectedBusCompany) : []

  useEffect(() => { setSelectedScheduleIds([]); setScheduleRows({}) }, [form.vehicle_number])

  // Backfill km for already-selected reminder types once the vehicle's company/schedules become known.
  useEffect(() => {
    if (selectedReminderTypes.length === 0) return
    setTypeRows((prev) => {
      let changed = false
      const next = { ...prev }
      selectedReminderTypes.forEach((t) => {
        const row = next[t] ?? EMPTY_TYPE_ROW
        if (!row.due_odometer) {
          const match = applicableSchedules.find((s) => s.service_type === t)
          if (match) { next[t] = { ...row, due_odometer: String(match.km_interval) }; changed = true }
        }
      })
      return changed ? next : prev
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBusCompany])

  const f = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((s) => ({ ...s, [k]: e.target.value }))
  const setField = (k: keyof typeof EMPTY_FORM) => (v: string) => setForm((s) => ({ ...s, [k]: v }))

  const handleTypesChange = (ids: (string | number)[]) => {
    const types = ids as string[]
    setSelectedReminderTypes(types)
    setTypeRows((prev) => {
      const next: Record<string, TypeRow> = {}
      types.forEach((t) => {
        if (prev[t]) { next[t] = prev[t]; return }
        // If this type name matches one of the vehicle's company schedules, prefill its km.
        const match = applicableSchedules.find((s) => s.service_type === t)
        next[t] = { ...EMPTY_TYPE_ROW, due_odometer: match ? String(match.km_interval) : '' }
      })
      return next
    })
  }
  const updateTypeRow = (type: string, field: keyof TypeRow, value: string) =>
    setTypeRows((prev) => ({ ...prev, [type]: { ...(prev[type] ?? EMPTY_TYPE_ROW), [field]: value } }))

  const handleSchedulesChange = (ids: (string | number)[]) => {
    const schedIds = ids as number[]
    setSelectedScheduleIds(schedIds)
    setScheduleRows((prev) => {
      const next: Record<number, ScheduleRow> = {}
      schedIds.forEach((id) => {
        if (prev[id]) { next[id] = prev[id]; return }
        const sched = applicableSchedules.find((s) => s.id === id)
        next[id] = { ...EMPTY_SCHEDULE_ROW, due_odometer: sched ? String(sched.km_interval) : '' }
      })
      return next
    })
  }
  const updateScheduleRow = (id: number, field: keyof ScheduleRow, value: string) =>
    setScheduleRows((prev) => ({ ...prev, [id]: { ...(prev[id] ?? EMPTY_SCHEDULE_ROW), [field]: value } }))

  const buildPayload = (reminderType: string) => ({
    ...form,
    reminder_type: reminderType,
    repeat_interval: form.is_repeating ? Number(form.repeat_interval) || 1 : null,
    repeat_unit: form.is_repeating ? form.repeat_unit : null,
    id: editId,
    user_id: localStorage.getItem('user_id'),
    usr_nm: localStorage.getItem('usr_nm'),
  })

  const { mutate: save, isPending } = useMutation({
    mutationFn: async () => {
      if (isEdit) return garageService.editServiceReminder(buildPayload(form.reminder_type))
      const uid = localStorage.getItem('user_id')
      const unm = localStorage.getItem('usr_nm')
      const reminders = selectedReminderTypes.map((type) => {
        const row = typeRows[type] ?? EMPTY_TYPE_ROW
        return {
          vehicle_number: form.vehicle_number,
          reminder_type: type,
          due_date: row.due_date || null,
          due_odometer: row.due_odometer || null,
          last_done_odometer: row.last_done_odometer || null,
          remarks: row.remarks,
          is_repeating: form.is_repeating,
          repeat_interval: form.is_repeating ? Number(form.repeat_interval) || 1 : null,
          repeat_unit: form.is_repeating ? form.repeat_unit : null,
        }
      })
      return garageService.addServiceRemindersBulk({ reminders, user_id: uid, usr_nm: unm })
    },
    onSuccess: (res: any) => {
      if (isEdit) {
        if (res.status === 200) { toast.success('Reminder updated!'); qc.invalidateQueries({ queryKey: ['service-reminders'] }); closeForm() }
        else toast.error('Failed to save')
      } else {
        if (res.status === 200) {
          const created: any[] = res.data ?? []
          toast.success(`${created.length} reminder${created.length === 1 ? '' : 's'} added! ${created.map((c) => c.ref_number).join(', ')}`)
          qc.invalidateQueries({ queryKey: ['service-reminders'] })
          closeForm()
        } else toast.error('Failed to save')
      }
    },
    onError: () => toast.error('Server error'),
  })

  const { mutate: generateFromSchedule, isPending: generating } = useMutation({
    mutationFn: async () => {
      const uid = localStorage.getItem('user_id')
      const unm = localStorage.getItem('usr_nm')
      const chosen = applicableSchedules.filter((s) => selectedScheduleIds.includes(s.id))
      const reminders = chosen.map((s) => {
        const row = scheduleRows[s.id] ?? { ...EMPTY_SCHEDULE_ROW, due_odometer: String(s.km_interval) }
        return {
          vehicle_number: form.vehicle_number,
          reminder_type: `${s.service_type}${s.sub_type ? ' - ' + s.sub_type : ''}`,
          due_date: row.due_date || null,
          due_odometer: row.due_odometer || null,
          last_done_odometer: row.last_done_odometer || null,
          remarks: '',
          is_repeating: false,
          repeat_interval: null,
          repeat_unit: null,
        }
      })
      return garageService.addServiceRemindersBulk({ reminders, user_id: uid, usr_nm: unm })
    },
    onSuccess: (res: any) => {
      const created: any[] = res.data ?? []
      toast.success(`Generated ${created.length} reminder${created.length === 1 ? '' : 's'} (${created.map((c) => c.ref_number).join(', ')})`)
      qc.invalidateQueries({ queryKey: ['service-reminders'] })
      setSelectedScheduleIds([]); setScheduleRows({})
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

  const { mutate: createJobCard, isPending: creatingJobCard } = useMutation({
    mutationFn: () => garageService.addRepairEntry({
      job_date: jobCardForm.job_date,
      vehicle_number: jobCardModal.reminder?.vehicle_number,
      odometer_reading: jobCardForm.odometer,
      reported_driver_id: jobCardForm.driver,
      is_repeated_job: 0,
      next_job_date: null,
      job_rows: [{ category: jobCardForm.category, priority: jobCardForm.priority, technician: jobCardForm.technician, description: jobCardForm.description }],
      repair_category_id: jobCardForm.category,
      priority: jobCardForm.priority,
      assigned_to: jobCardForm.technician,
      remarks: jobCardForm.description,
      source_reminder_id: jobCardModal.reminder?.id,
      source_reminder_ref: jobCardModal.reminder?.ref_number,
      user_id: localStorage.getItem('user_id'),
      usr_nm: localStorage.getItem('usr_nm'),
    }),
    onSuccess: (res: any) => {
      if (res.status === 200) {
        const jobCardNumber = res.data?.[0]?.job_card_number
        toast.success(`Job card ${jobCardNumber ?? ''} created!`)
        qc.invalidateQueries({ queryKey: ['repair-entries'] })
        if (jobCardNumber && jobCardModal.reminder?.id) {
          garageService.linkJobCardToReminder({ id: jobCardModal.reminder.id, job_card_number: jobCardNumber })
            .then(() => qc.invalidateQueries({ queryKey: ['service-reminders'] }))
        }
        closeJobCardModal()
      } else toast.error('Failed to create job card')
    },
    onError: () => toast.error('Server error'),
  })

  const openJobCardModal = (row: any) => {
    setJobCardForm({
      ...EMPTY_JOB_CARD_FORM,
      odometer: row.due_odometer ?? row.last_done_odometer ?? '',
      description: `Service due: ${row.reminder_type}${row.remarks ? ' — ' + row.remarks : ''} (Ref: ${row.ref_number ?? '—'})`,
    })
    setJobCardSubmitted(false)
    setJobCardModal({ open: true, reminder: row })
  }
  const closeJobCardModal = () => {
    setJobCardModal({ open: false, reminder: null })
    setJobCardForm(EMPTY_JOB_CARD_FORM)
    setJobCardSubmitted(false)
  }
  const handleCreateJobCard = () => {
    setJobCardSubmitted(true)
    const missing: string[] = []
    if (!jobCardForm.driver) missing.push('Driver')
    if (!jobCardForm.category) missing.push('Category')
    if (!jobCardForm.technician) missing.push('Technician')
    if (!jobCardForm.description.trim()) missing.push('Issue Description')
    if (missing.length > 0) { toast.error(`Please fill: ${missing.join(', ')}`); return }
    createJobCard()
  }

  const handleEdit = (row: any) => {
    setForm({
      vehicle_number: row.vehicle_number ?? '', reminder_type: row.reminder_type ?? '',
      due_date: row.due_date ?? '', due_odometer: row.due_odometer ?? '',
      last_done_odometer: row.last_done_odometer ?? '', remarks: row.remarks ?? '',
      is_repeating: !!row.is_repeating, repeat_interval: String(row.repeat_interval ?? '1'), repeat_unit: row.repeat_unit ?? 'Months',
    })
    setIsEdit(true); setEditId(row.id); setShowForm(true)
    scrollContentToTop()
  }

  const handleDelete = (row: any) => {
    garageService.deleteServiceReminder({ id: row.id }).then((res) => {
      if (res.status === 200) { toast.success('Reminder removed'); qc.invalidateQueries({ queryKey: ['service-reminders'] }) }
      else toast.error('Failed')
    })
  }

  const openAdd = () => { setForm(EMPTY_FORM); setIsEdit(false); setEditId(null); setShowForm(true); setSelectedReminderTypes([]); setTypeRows({}); setSelectedScheduleIds([]); setScheduleRows({}) }
  const closeForm = () => { setShowForm(false); setForm(EMPTY_FORM); setIsEdit(false); setEditId(null); setSelectedReminderTypes([]); setTypeRows({}); setSelectedScheduleIds([]); setScheduleRows({}) }

  const displayList = list.map((row) => ({
    ...row,
    display_status: row.status === 'Completed' ? 'Completed' : isOverdue(row) ? 'Overdue' : 'Pending',
  }))

  const cols: Column[] = [
    { label: 'Sl No', key: '_idx', align: 'center', render: (_v, _row, i) => <span className="text-xs text-slate-500">{i + 1}</span> },
    { label: 'Ref No.', key: 'ref_number', filterable: true, render: (v) => v ? <span className="font-mono text-xs font-semibold text-slate-600 whitespace-nowrap">{String(v)}</span> : <span className="text-slate-300">—</span> },
    { label: 'Vehicle', key: 'vehicle_number', filterable: true, render: (v) => <span className="text-xs font-bold text-blue-600 whitespace-nowrap">{String(v)}</span> },
    { label: 'Reminder', key: 'reminder_type', filterable: true, render: (v, row: any) => (
      <div className="flex flex-col gap-1 text-xs min-w-max">
        <div className="flex items-center gap-1.5">
          <span className="whitespace-nowrap">{String(v)}</span>
          {!!row.is_repeating && (
            <Badge variant="info" className="text-xs px-2 py-0.5 whitespace-nowrap shrink-0">
              Repeats / {row.repeat_interval} {row.repeat_unit}
            </Badge>
          )}
        </div>
        {row.source_job_card_number && (
          <span className="inline-flex items-center gap-1 w-fit whitespace-nowrap shrink-0 px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 text-[10px] font-bold border border-violet-100" title={`Auto-created from repeat job ${row.source_job_card_number}`}>
            <Wrench className="w-2.5 h-2.5" /> From Job: {row.source_job_card_number}
          </span>
        )}
      </div>
    ) },
    { label: 'Due Date', key: 'due_date', align: 'center', render: (v) => <span className="text-xs whitespace-nowrap">{fmtDate(v)}</span> },
    { label: 'Due Odometer', key: 'due_odometer', align: 'right', render: (v) => <span className="text-xs whitespace-nowrap">{v ? `${v} km` : '—'}</span> },
    { label: 'Status', key: 'display_status', filterable: true, render: (_v, row) => (
      <div className="flex items-center gap-2">
        {statusBadge(row)}
        {isDueOrOverdue(row) && !row.job_card_number && (
          <button
            onClick={() => openJobCardModal(row)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-100 transition-colors"
            title="Create a job card for this due service"
          >
            <Wrench className="w-3 h-3" /> Job Card
          </button>
        )}
      </div>
    ) },
    { label: 'Job Card', key: 'job_card_number', align: 'center', filterable: true, render: (v) => v
      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 text-xs font-mono font-semibold border border-orange-100"><Wrench className="w-3 h-3" />{String(v)}</span>
      : <span className="text-slate-300">—</span> },
    { label: 'Remarks', key: 'remarks', render: (v) => <span className="text-xs max-w-xs truncate block">{String(v ?? '—')}</span> },
  ]

  const canSave = isEdit
    ? !!form.vehicle_number && !!form.reminder_type
    : !!form.vehicle_number && selectedReminderTypes.length > 0

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
                <div><Label>Reminder Type{isEdit ? ' *' : 's *'}</Label>
                  {isEdit ? (
                    <SearchableSelect
                      value={form.reminder_type}
                      onChange={setField('reminder_type')}
                      options={reminderTypeList.map((t) => ({ value: t.type_name, label: t.type_name }))}
                      placeholder="Select Type"
                      onReload={() => reloadTypes()}
                      reloading={loadingTypes}
                    />
                  ) : (
                    <MultiSelectPicker
                      options={reminderTypeList.map((t) => ({ id: t.type_name, label: t.type_name }))}
                      selectedIds={selectedReminderTypes}
                      onChange={handleTypesChange}
                      placeholder="Select one or more types"
                      emptyLabel="No reminder types yet."
                    />
                  )}
                </div>
                {isEdit && (
                  <>
                    <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={f('due_date')} /></div>
                    <div><Label>Due Odometer</Label><Input type="number" placeholder="km" value={form.due_odometer} onChange={f('due_odometer')} /></div>
                    <div><Label>Last Done Odometer</Label><Input type="number" placeholder="km" value={form.last_done_odometer} onChange={f('last_done_odometer')} /></div>
                    <div className="md:col-span-3"><Label>Remarks</Label><Input value={form.remarks} onChange={f('remarks')} /></div>
                  </>
                )}
              </div>

              {!isEdit && selectedReminderTypes.length > 0 && (
                <div className="mt-5 pt-5 border-t border-slate-100 space-y-3">
                  <h3 className="text-sm font-bold text-slate-700">Details per Type</h3>
                  {!selectedBusCompany && (
                    <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      This vehicle has no Company set on the Bus master, so km can't be auto-filled from a schedule — enter it manually below, or set the vehicle's Company under Masters → Bus Numbers.
                    </p>
                  )}
                  {selectedReminderTypes.map((type) => {
                    const row = typeRows[type] ?? EMPTY_TYPE_ROW
                    const matchedSchedule = applicableSchedules.find((s) => s.service_type === type)
                    return (
                      <div key={type} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div>
                          <span className="text-sm font-semibold text-slate-700">{type}</span>
                          {matchedSchedule && <div className="text-xs text-teal-600">km from {selectedBusCompany} schedule</div>}
                        </div>
                        <div><Label className="text-xs">Due Date</Label>
                          <Input type="date" value={row.due_date} onChange={(e) => updateTypeRow(type, 'due_date', e.target.value)} /></div>
                        <div><Label className="text-xs">Due Odometer</Label>
                          <Input type="number" placeholder="km" value={row.due_odometer} onChange={(e) => updateTypeRow(type, 'due_odometer', e.target.value)} /></div>
                        <div><Label className="text-xs">Last Done Odometer</Label>
                          <Input type="number" placeholder="km" value={row.last_done_odometer} onChange={(e) => updateTypeRow(type, 'last_done_odometer', e.target.value)} /></div>
                        <div><Label className="text-xs">Remarks</Label>
                          <Input value={row.remarks} onChange={(e) => updateTypeRow(type, 'remarks', e.target.value)} /></div>
                      </div>
                    )
                  })}
                </div>
              )}

              {!isEdit && form.vehicle_number && (
                <div className="mt-5 pt-5 border-t border-slate-100">
                  <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-teal-500" /> Generate from Service Schedule
                    {selectedBusCompany && <Badge variant="purple">{selectedBusCompany}</Badge>}
                  </h3>
                  {!selectedBusCompany ? (
                    <p className="text-xs text-slate-400">Set this vehicle's Company on the Bus master to use service schedules.</p>
                  ) : (
                    <div className="space-y-4">
                      <div className="max-w-md">
                        <Label>Applicable Services</Label>
                        <MultiSelectPicker
                          options={applicableSchedules.map((s) => ({
                            id: s.id,
                            label: <>{s.service_type}{s.sub_type ? ` - ${s.sub_type}` : ''}<span className="text-slate-400"> · every {s.km_interval} km</span></>,
                          }))}
                          selectedIds={selectedScheduleIds}
                          onChange={handleSchedulesChange}
                          placeholder="Select applicable services"
                          emptyLabel="No schedules for this vehicle's company."
                        />
                      </div>

                      {selectedScheduleIds.length > 0 && (
                        <div className="space-y-3">
                          {applicableSchedules.filter((s) => selectedScheduleIds.includes(s.id)).map((s) => {
                            const row = scheduleRows[s.id] ?? { ...EMPTY_SCHEDULE_ROW, due_odometer: String(s.km_interval) }
                            return (
                              <div key={s.id} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end p-3 rounded-xl bg-slate-50 border border-slate-100">
                                <div>
                                  <span className="text-sm font-semibold text-slate-700">{s.service_type}{s.sub_type ? ` - ${s.sub_type}` : ''}</span>
                                  <div className="text-xs text-slate-400">every {s.km_interval} km</div>
                                </div>
                                <div><Label className="text-xs">Due Date</Label>
                                  <Input type="date" value={row.due_date} onChange={(e) => updateScheduleRow(s.id, 'due_date', e.target.value)} /></div>
                                <div><Label className="text-xs">Due Odometer</Label>
                                  <Input type="number" placeholder="km" value={row.due_odometer} onChange={(e) => updateScheduleRow(s.id, 'due_odometer', e.target.value)} /></div>
                                <div><Label className="text-xs">Last Done Odometer</Label>
                                  <Input type="number" placeholder="km (optional)" value={row.last_done_odometer} onChange={(e) => updateScheduleRow(s.id, 'last_done_odometer', e.target.value)} /></div>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      <Button
                        variant="outline"
                        onClick={() => generateFromSchedule()}
                        disabled={generating || selectedScheduleIds.length === 0}
                      >
                        <Sparkles className="w-4 h-4" />{generating ? 'Generating…' : `Generate ${selectedScheduleIds.length || ''} Reminder${selectedScheduleIds.length === 1 ? '' : 's'}`}
                      </Button>
                    </div>
                  )}
                </div>
              )}

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
                  <Save className="w-4 h-4" />
                  {isPending
                    ? 'Saving…'
                    : isEdit
                      ? 'Update Reminder'
                      : `Save Reminder${selectedReminderTypes.length > 1 ? `s (${selectedReminderTypes.length})` : ''}`}
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
        data={displayList}
        loading={isLoading}
        onAction={(action, row) => { if (action === 'edit') handleEdit(row); if (action === 'delete') handleDelete(row) }}
        actions={['edit', 'delete']}
        icon={<BellRing className="w-5 h-5 text-blue-500" />}
        columnFilters={columnFilters}
        onColumnFilterChange={(k, v) => setColumnFilters((prev) => ({ ...prev, [k]: v }))}
        className="border-2 border-slate-200"
      />

      {/* ── Create Job Card modal ── */}
      <AnimatePresence>
        {jobCardModal.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-orange-500" /> Create Job Card
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    From reminder {jobCardModal.reminder?.ref_number} · {jobCardModal.reminder?.vehicle_number}
                  </p>
                </div>
                <button onClick={closeJobCardModal} className="text-slate-400 hover:text-slate-600 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-5">
                <div><Label>Vehicle Number</Label>
                  <div className="h-11 flex items-center px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700">
                    {jobCardModal.reminder?.vehicle_number}
                  </div></div>
                <div><Label>Job Date</Label>
                  <Input type="date" value={jobCardForm.job_date} onChange={(e) => setJobCardForm((s) => ({ ...s, job_date: e.target.value }))} /></div>
                <div><Label>Odometer</Label>
                  <Input type="number" placeholder="km" value={jobCardForm.odometer} onChange={(e) => setJobCardForm((s) => ({ ...s, odometer: e.target.value }))} /></div>
                <div><Label>Reported By (Driver) <span className="text-red-500">*</span></Label>
                  <SearchableSelect
                    value={jobCardForm.driver}
                    onChange={(v) => setJobCardForm((s) => ({ ...s, driver: v }))}
                    options={driverList.map((d) => ({ value: String(d.id), label: d.nickname || d.driver_name || '' }))}
                    placeholder="Select driver"
                    onReload={() => reloadDrivers()}
                    reloading={loadingDrivers}
                  /></div>
                <div><Label>Category <span className="text-red-500">*</span></Label>
                  <SearchableSelect
                    value={jobCardForm.category}
                    onChange={(v) => setJobCardForm((s) => ({ ...s, category: v }))}
                    options={catList.map((c) => ({ value: String(c.id), label: c.name }))}
                    placeholder="Select category"
                    onReload={() => reloadCats()}
                    reloading={loadingCats}
                  /></div>
                <div><Label>Priority</Label>
                  <Select value={jobCardForm.priority} onChange={(e) => setJobCardForm((s) => ({ ...s, priority: e.target.value }))}>
                    {JOB_PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                  </Select></div>
                <div><Label>Technician <span className="text-red-500">*</span></Label>
                  <SearchableSelect
                    value={jobCardForm.technician}
                    onChange={(v) => setJobCardForm((s) => ({ ...s, technician: v }))}
                    options={staffList.map((s) => ({ value: String(s.id), label: s.fullName || s.nickName || '' }))}
                    placeholder="Select technician"
                    onReload={() => reloadStaff()}
                    reloading={loadingStaff}
                  /></div>
                <div className="md:col-span-2">
                  <Label>Issue Description <span className="text-red-500">*</span></Label>
                  <Input
                    value={jobCardForm.description}
                    onChange={(e) => setJobCardForm((s) => ({ ...s, description: e.target.value }))}
                    className={jobCardSubmitted && !jobCardForm.description.trim() ? 'ring-2 ring-red-400 border-red-300' : ''}
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end px-6 py-4 border-t border-slate-100 flex-shrink-0">
                <Button variant="ghost" onClick={closeJobCardModal}>Cancel</Button>
                <Button onClick={handleCreateJobCard} disabled={creatingJobCard}>
                  <Wrench className="w-4 h-4" />{creatingJobCard ? 'Creating…' : 'Create Job Card'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
