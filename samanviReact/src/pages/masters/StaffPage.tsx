import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import { Users, Save, X, AlertTriangle, RotateCcw, ChevronDown, Plus, Settings, Upload, Download, FileSpreadsheet, ImagePlus } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Label, DataTable, Badge, PageHeader, ExcelImportPreviewModal } from '@/components/shared'
import type { ExcelPreviewRow } from '@/components/shared'
import type { Column } from '@/components/shared'
import { mastersService } from '@/services/masters.service'
import * as XLSX from 'xlsx'

type DataType = string

// ── Staff Type picker with inline "add new" ────────────────────────────────
function StaffTypePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [newType, setNewType] = useState('')
  const [rect, setRect] = useState<DOMRect | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  const { data } = useQuery({ queryKey: ['staff-types'], queryFn: () => mastersService.getStaffTypes() })
  const types: any[] = data?.data ?? []

  const { mutate: add, isPending } = useMutation({
    mutationFn: () => mastersService.addStaffType({ type_name: newType.trim() }),
    onSuccess: (res) => {
      if (res.status === 200) {
        toast.success('Staff type added!')
        qc.invalidateQueries({ queryKey: ['staff-types'] })
        onChange(newType.trim())
        setNewType('')
        setOpen(false)
      }
    },
    onError: () => toast.error('Server error'),
  })

  const openDropdown = () => {
    if (btnRef.current) setRect(btnRef.current.getBoundingClientRect())
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (document.getElementById('st-panel')?.contains(e.target as Node) ||
          btnRef.current?.contains(e.target as Node)) return
      setOpen(false); setNewType('')
    }
    const onScroll = (e: Event) => {
      if (document.getElementById('st-panel')?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', close)
    window.addEventListener('scroll', onScroll, true)
    return () => { document.removeEventListener('mousedown', close); window.removeEventListener('scroll', onScroll, true) }
  }, [open])

  const spaceBelow = rect ? window.innerHeight - rect.bottom : 999
  const openUpward = spaceBelow < 320

  const panel = open && rect && createPortal(
    <div id="st-panel"
      style={{
        position: 'fixed',
        top: openUpward ? undefined : rect.bottom + 4,
        bottom: openUpward ? window.innerHeight - rect.top + 4 : undefined,
        left: rect.left, width: rect.width, maxHeight: 300, zIndex: 99999,
      }}
      className="rounded-xl border border-slate-200 bg-white shadow-2xl flex flex-col overflow-hidden"
    >
      <ul className="overflow-y-auto flex-1">
        <li onMouseDown={() => { onChange(''); setOpen(false) }}
          className="px-4 py-2.5 text-sm text-slate-400 hover:bg-slate-50 cursor-pointer">— None —</li>
        {types.map(t => (
          <li key={t.id}
            onMouseDown={() => { onChange(t.type_name); setOpen(false) }}
            className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${
              value === t.type_name ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-800 hover:bg-slate-50'
            }`}>
            {t.type_name}
          </li>
        ))}
      </ul>
      <div className="border-t border-slate-100 p-2 flex gap-2 flex-shrink-0">
        <input
          value={newType}
          onChange={e => setNewType(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && newType.trim() && add()}
          placeholder="Add new type…"
          className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-slate-200 outline-none focus:border-blue-400"
        />
        <button
          onMouseDown={() => newType.trim() && add()}
          disabled={isPending || !newType.trim()}
          className="px-3 py-1.5 text-xs font-semibold bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>,
    document.body
  )

  return (
    <div>
      <button ref={btnRef} type="button" onClick={openDropdown}
        className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 text-sm shadow-sm transition-all hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
        <span className={value ? 'text-slate-900 font-medium' : 'text-slate-400'}>
          {value || 'Select Designation'}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 ml-2 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {panel}
    </div>
  )
}

// ── Termination modal ──────────────────────────────────────────────────────
function TerminateModal({ person, staffType, onConfirm, onClose, isPending }: {
  person: any; staffType: string
  onConfirm: (date: string, reason: string) => void
  onClose: () => void; isPending: boolean
}) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [reason, setReason] = useState('')
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-7">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg">Terminate {staffType}</h3>
            <p className="text-sm text-slate-500">Terminating <span className="font-semibold text-red-600">{person?.fullName ?? person?.driver_name ?? person?.helper_name}</span></p>
          </div>
          <button onClick={onClose} className="ml-auto text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <Label>Date of Leaving <span className="text-red-500">*</span></Label>
            <Input type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label>Reason for Termination <span className="text-red-500">*</span></Label>
            <textarea rows={4} placeholder="Resignation, Misconduct, Contract End…" value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 resize-none" />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <Button variant="danger" onClick={() => onConfirm(date, reason)} disabled={isPending || !reason.trim() || !date} className="flex-1">
            <AlertTriangle className="w-4 h-4" />{isPending ? 'Terminating…' : 'Confirm Termination'}
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </motion.div>
    </div>
  )
}

// ── View Details modal ─────────────────────────────────────────────────────
type ViewField = [label: string, key: string]

const DRIVER_VIEW_FIELDS: ViewField[] = [
  ['Driver ID', 'driver_id_number'], ['Aadhar Name', 'nickname'], ['Aadhar Number', 'aadhar_number'],
  ['Date of Birth', 'dldateofbirth'], ['Mobile Number', 'mobile_number'], ['Alternate Mobile', 'alternate_number'],
  ['Emergency Number', 'emergency_mobile_number'], ['Date of Joining', 'date_of_joining'], ['Reference Name', 'reference'],
  ['Address', 'address'], ['DL Name', 'driver_name'], ['DL Number', 'dl_number'],
  ['DL Issue Date', 'drivinglicense_joining_date'], ['DL Expiry Date', 'dl_expiry_date'],
  ['Transport Issue Date', 'transportoneissuedate'], ['Transport Valid From', 'transportvalidityfrom'],
  ['Transport Valid To', 'transportvalidityto'], ['Account Holder Name', 'account_holder_name'],
  ['Account Number', 'account_number'], ['Bank Name', 'bank_name'], ['Branch Name', 'branch_name'],
  ['IFSC Code', 'ifsc_code'], ['UPI ID', 'upi_id'], ['Remarks', 'remarks'],
]
const DRIVER_VIEW_IMAGES: ViewField[] = [
  ['Aadhar Card Front', 'aadhar_card_front'], ['Aadhar Card Back', 'aadhar_card_back'],
  ['DL Front', 'dl_front'], ['DL Back', 'dl_back'], ['UPI / Passbook Scan', 'upi_scanner'],
]

const STAFF_VIEW_FIELDS: ViewField[] = [
  ['Designation', 'designation'], ['Nick Name', 'nickName'], ['Aadhar Name', 'fullName'], ['Aadhar Number', 'aadhaar'],
  ['Date of Birth', 'dob'], ['Mobile Number', 'mobile'], ['Alternative Mobile', 'alternativemobilenumber'],
  ['Emergency Contact', 'emergencyContact'], ['Date of Joining', 'dateOfJoining'], ['Reference Name', 'referencename'],
  ['Address', 'address'], ['Account Holder Name', 'accountHolderName'], ['Account Number', 'accountNumber'],
  ['Bank Name', 'bankName'], ['Branch Name', 'branchname'], ['IFSC Code', 'ifscCode'], ['UPI ID', 'upiId'],
  ['Remarks', 'remarks'],
]
const STAFF_VIEW_IMAGES: ViewField[] = [
  ['Aadhar Card Front', 'aadhaarCardFront'], ['Aadhar Card Back', 'aadhaarCardBack'], ['UPI / Passbook Scan', 'upiScanner'],
]

const HELPER_VIEW_FIELDS: ViewField[] = [
  ['Helper ID', 'helper_id_number'], ['Nick Name', 'nickname'], ['Aadhar Name', 'helper_name'], ['Aadhar Number', 'adhar_number'],
  ['Date of Birth', 'dob'], ['Mobile Number', 'mobile_number'], ['Alternate Number', 'alternate_number'],
  ['Emergency Mobile', 'emergencymobilenumber'], ['Date of Joining', 'date_of_joining'], ['Reference', 'reference'],
  ['Address', 'address'], ['Account Holder Name', 'account_holder_name'], ['Account Number', 'account_number'],
  ['Bank Name', 'bank_name'], ['Branch Name', 'branch_name'], ['IFSC Code', 'ifsc_code'], ['UPI ID', 'upi_id'],
  ['Remarks', 'remarks'],
]
const HELPER_VIEW_IMAGES: ViewField[] = [
  ['Aadhar Card Front', 'adhar_card_front'], ['Aadhar Card Back', 'adhar_card_back'], ['UPI / Passbook Scan', 'upi_scanner'],
]

const fmtViewValue = (v: any) => (v === null || v === undefined || v === '' ? '—' : String(v))

function ViewDetailsModal({ person, staffType, onClose }: { person: any; staffType: 'driver' | 'staff' | 'helper'; onClose: () => void }) {
  const fields = staffType === 'driver' ? DRIVER_VIEW_FIELDS : staffType === 'helper' ? HELPER_VIEW_FIELDS : STAFF_VIEW_FIELDS
  const images = staffType === 'driver' ? DRIVER_VIEW_IMAGES : staffType === 'helper' ? HELPER_VIEW_IMAGES : STAFF_VIEW_IMAGES
  const title = person?.driver_name ?? person?.fullName ?? person?.helper_name ?? 'Record'
  const [lightbox, setLightbox] = useState<string | null>(null)

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg capitalize">{staffType} Details</h3>
            <p className="text-sm text-slate-500">{title}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-7 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
            {fields.map(([label, key]) => (
              <div key={key}>
                <div className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</div>
                <div className="text-sm font-medium text-slate-800 mt-0.5 break-words">{fmtViewValue(person?.[key])}</div>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t border-slate-100">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">Documents</p>
            <div className="flex flex-wrap gap-4">
              {images.map(([label, key]) => {
                const url = person?.[key]
                return (
                  <div key={key} className="text-center">
                    {url ? (
                      <button
                        type="button"
                        onClick={() => setLightbox(url)}
                        className="block w-28 h-28 rounded-xl overflow-hidden border border-slate-200 hover:ring-2 hover:ring-blue-400 transition-all"
                      >
                        <img src={url} alt={label} className="w-full h-full object-cover" />
                      </button>
                    ) : (
                      <div className="w-28 h-28 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 text-xs">
                        No image
                      </div>
                    )}
                    <div className="text-[11px] font-semibold text-slate-500 mt-1.5 max-w-[7rem]">{label}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </motion.div>

      {lightbox && createPortal(
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-6" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Document" className="max-w-full max-h-full rounded-xl shadow-2xl object-contain" />
          <button onClick={() => setLightbox(null)} className="absolute top-6 right-6 text-white/80 hover:text-white">
            <X className="w-7 h-7" />
          </button>
        </div>,
        document.body
      )}
    </div>
  )
}

// ── Document image upload ──────────────────────────────────────────────────
interface ImageValue {
  filename: string
  filetype: string
  value: string
  reviewimg: string
  imgtype: string
}

function ImageUploadField({ label, value, onChange }: { label: string; value?: ImageValue; onChange: (v?: ImageValue) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result)
      const base64 = dataUrl.split(',')[1] ?? ''
      const ext = (file.name.split('.').pop() || '').toLowerCase()
      onChange({ filename: file.name, filetype: file.type, value: base64, reviewimg: dataUrl, imgtype: ext })
    }
    reader.readAsDataURL(file)
  }

  return (
    <div>
      <Label>{label}</Label>
      {value?.reviewimg ? (
        <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200 group">
          <img src={value.reviewimg} alt={label} className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
        >
          <ImagePlus className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Upload</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  )
}

// ── Section divider ─────────────────────────────────────────────────────────
function SectionBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">{children}</div>
    </div>
  )
}

// ── Form state defaults ────────────────────────────────────────────────────
const emptyStaff = {
  fullName: '', mobile: '', designation: '', emergencyContact: '', alternativemobilenumber: '',
  dateOfJoining: '', aadhaar: '', accountHolderName: '', accountNumber: '', ifscCode: '',
  bankName: '', referencename: '', branchname: '', nickName: '', upiId: '', remarks: '',
  dob: '', address: '',
}
const emptyDriver = {
  driver_name: '', mobile_number: '', dl_number: '', dl_expiry_date: '',
  aadhar_number: '', account_number: '', ifsc_code: '', bank_name: '',
  nickname: '', emergency_mobile_number: '', alternate_number: '', reference: '',
  date_of_joining: '', account_holder_name: '', branch_name: '', upi_id: '',
  dldateofbirth: '', drivinglicense_joining_date: '', transportoneissuedate: '',
  transportvalidityfrom: '', transportvalidityto: '', remarks: '', address: '',
}
const emptyHelper = {
  helper_name: '', mobile_number: '', adhar_number: '', account_number: '',
  ifsc_code: '', bank_name: '', nickname: '', emergency_mobile_number: '',
  alternate_number: '', reference: '', account_holder_name: '', branch_name: '',
  upi_id: '', date_of_joining: '', remarks: '', dob: '', address: '',
}

const emptyStaffImages: Record<'aadhaarCardFront' | 'aadhaarCardBack' | 'upiScanner', ImageValue | undefined> = {
  aadhaarCardFront: undefined, aadhaarCardBack: undefined, upiScanner: undefined,
}
const emptyDriverImages: Record<'aadharcardfront' | 'aadharcardback' | 'dlfront' | 'dlback' | 'upiscanner', ImageValue | undefined> = {
  aadharcardfront: undefined, aadharcardback: undefined, dlfront: undefined, dlback: undefined, upiscanner: undefined,
}
const emptyHelperImages: Record<'adharcardfront' | 'adharcardback' | 'upiscanner', ImageValue | undefined> = {
  adharcardfront: undefined, adharcardback: undefined, upiscanner: undefined,
}

const FIXED_TYPES = ['Driver', 'Staff', 'Helper', 'Terminated']

// ── Inline "Add new type" input ────────────────────────────────────────────
function AddCustomTypeInline({ onAdd, isPending }: { onAdd: (name: string) => void; isPending: boolean }) {
  const [value, setValue] = useState('')
  const submit = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setValue('')
  }
  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Add new type…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        className="w-44 h-11"
      />
      <Button onClick={submit} disabled={isPending || !value.trim()} variant="primary">
        <Plus className="w-4 h-4" /> Add
      </Button>
    </div>
  )
}

const typeColors: Record<string, string> = {
  Driver: 'bg-gradient-to-r from-emerald-500 to-teal-500',
  Staff: 'bg-gradient-to-r from-blue-500 to-violet-500',
  Helper: 'bg-gradient-to-r from-orange-400 to-amber-500',
}

const today = new Date().toISOString().split('T')[0]

// Column order mirrors each type's Add-form field order exactly.
const DRIVER_TEMPLATE_HEADERS = [
  'Aadhar Name*', 'Aadhar Number*', 'Date of Birth', 'Mobile Number*', 'Alternate Mobile',
  'Emergency Number', 'Date of Joining*', 'Reference Name*', 'Address',
  'DL Name*', 'DL Number*', 'DL Issue Date*', 'DL Expiry Date*',
  'Transport Issue Date*', 'Transport Valid From*', 'Transport Valid To*',
  'Account Holder Name*', 'Account Number*', 'Bank Name*', 'Branch Name*', 'IFSC Code*', 'UPI ID',
  'Remarks',
]
const STAFF_TEMPLATE_HEADERS = [
  'Designation*', 'Nick Name', 'Full Name*', 'Aadhar Number*', 'Date of Birth',
  'Mobile Number*', 'Alternative Mobile', 'Emergency Contact', 'Date of Joining*',
  'Reference Name*', 'Address', 'Account Holder Name*', 'Account Number*',
  'Bank Name*', 'Branch Name*', 'IFSC Code*', 'UPI ID', 'Remarks',
]
const HELPER_TEMPLATE_HEADERS = [
  'Nick Name', 'Full Name (Aadhar Name)*', 'Aadhar Number*', 'Date of Birth',
  'Mobile Number*', 'Alternate Number', 'Emergency Mobile', 'Date of Joining*',
  'Reference*', 'Address', 'Account Holder Name*', 'Account Number*',
  'Bank Name*', 'Branch Name*', 'IFSC Code*', 'UPI ID', 'Remarks',
]

function downloadExcel(data: any[][], filename: string) {
  const ws = XLSX.utils.aoa_to_sheet(data)
  ws['!cols'] = data[0].map((_: any, i: number) => ({ wch: Math.max(...data.map(r => String(r[i] ?? '').length)) + 4 }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Data')
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function StaffPage() {
  const qc = useQueryClient()
  const [dataType, setDataType] = useState<DataType>('')
  const [showForm, setShowForm] = useState(false)
  const [terminatePerson, setTerminatePerson] = useState<{ person: any; staffType: string } | null>(null)
  const [viewPerson, setViewPerson] = useState<{ person: any; staffType: 'driver' | 'staff' | 'helper' } | null>(null)
  const [staffForm, setStaffForm] = useState(emptyStaff)
  const [driverForm, setDriverForm] = useState(emptyDriver)
  const [helperForm, setHelperForm] = useState(emptyHelper)
  const [staffImages, setStaffImages] = useState(emptyStaffImages)
  const [driverImages, setDriverImages] = useState(emptyDriverImages)
  const [helperImages, setHelperImages] = useState(emptyHelperImages)
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})
  const uploadRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const sf = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setStaffForm((f) => ({ ...f, [k]: e.target.value }))
  const df = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDriverForm((f) => ({ ...f, [k]: e.target.value }))
  const hf = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setHelperForm((f) => ({ ...f, [k]: e.target.value }))

  // Aadhar numbers are 12 digits — strip anything non-numeric as the user types.
  const digitsOnly = <T,>(setForm: React.Dispatch<React.SetStateAction<T>>, k: keyof T, max: number) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value.replace(/\D/g, '').slice(0, max) }))

  const isCustomType = dataType !== '' && !FIXED_TYPES.includes(dataType)

  // Queries
  const { data: staffTypesData } = useQuery({ queryKey: ['staff-types'], queryFn: () => mastersService.getStaffTypes() })
  const { data: staffData, isLoading: loadStaff } = useQuery({ queryKey: ['active-staff'], queryFn: () => mastersService.getActiveStaff(), enabled: dataType === 'Staff' || isCustomType })
  const { data: driverData, isLoading: loadDrivers } = useQuery({ queryKey: ['drivers'], queryFn: () => mastersService.getDrivers(), enabled: dataType === 'Driver' })
  const { data: helperData, isLoading: loadHelpers } = useQuery({ queryKey: ['active-helpers'], queryFn: () => mastersService.getActiveHelpers(), enabled: dataType === 'Helper' })
  const { data: terminatedData, isLoading: loadTerminated } = useQuery({ queryKey: ['terminated-staff'], queryFn: () => mastersService.getTerminatedStaff(), enabled: dataType === 'Terminated' })

  const customTypes: any[] = staffTypesData?.data ?? []
  const allStaffList: any[]    = staffData?.data ?? []
  const staffList: any[]       = isCustomType
    ? allStaffList.filter((s: any) => s.designation === dataType)
    : allStaffList
  const driverList: any[]     = driverData?.data ?? []
  const helperList: any[]     = helperData?.data ?? []
  const terminatedList: any[] = terminatedData?.data ?? []

  // Add / delete custom type
  const { mutate: addCustomType, isPending: addingCustomType } = useMutation({
    mutationFn: (name: string) => mastersService.addStaffType({ type_name: name }),
    onSuccess: (res) => {
      if (res.status === 200) { toast.success('Type added!'); qc.invalidateQueries({ queryKey: ['staff-types'] }) }
      else toast.error('Failed')
    },
    onError: () => toast.error('Server error'),
  })
  const { mutate: delCustomType } = useMutation({
    mutationFn: (id: number) => mastersService.deleteStaffType({ id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff-types'] }),
  })

  // Mutations
  const { mutate: addStaff, isPending: addingStaff } = useMutation({
    mutationFn: () => mastersService.addStaff({ ...staffForm, ...staffImages, entryby: localStorage.getItem('user_id'), usrnm: localStorage.getItem('usr_nm'), uploadind: 0, document: null }),
    onSuccess: (res) => { if (res.status === 200) { toast.success('Staff added!'); qc.invalidateQueries({ queryKey: ['active-staff'] }); setStaffForm(emptyStaff); setStaffImages(emptyStaffImages); setShowForm(false) } else toast.error(res.message ?? 'Failed') },
    onError: () => toast.error('Server error'),
  })
  const { mutate: addDriver, isPending: addingDriver } = useMutation({
    mutationFn: () => mastersService.addDriver({ ...driverForm, ...driverImages, entryby: localStorage.getItem('user_id'), usrnm: localStorage.getItem('usr_nm'), uploadind: 0 }),
    onSuccess: (res) => { if (res.status === 200) { toast.success('Driver added!'); qc.invalidateQueries({ queryKey: ['drivers'] }); setDriverForm(emptyDriver); setDriverImages(emptyDriverImages); setShowForm(false) } else toast.error(res.message ?? 'Failed') },
    onError: () => toast.error('Server error'),
  })
  const { mutate: addHelper, isPending: addingHelper } = useMutation({
    mutationFn: () => mastersService.addHelper({ ...helperForm, ...helperImages, entryby: localStorage.getItem('user_id'), usrnm: localStorage.getItem('usr_nm'), uploadind: 0 }),
    onSuccess: (res) => { if (res.status === 200) { toast.success('Helper added!'); qc.invalidateQueries({ queryKey: ['active-helpers'] }); setHelperForm(emptyHelper); setHelperImages(emptyHelperImages); setShowForm(false) } else toast.error(res.message ?? 'Failed') },
    onError: () => toast.error('Server error'),
  })
  const { mutate: terminate, isPending: terminating } = useMutation({
    mutationFn: ({ date, reason }: { date: string; reason: string }) =>
      mastersService.terminateStaff({ id: terminatePerson!.person.id, staff_type: terminatePerson!.staffType, termination_date: date, termination_reason: reason }),
    onSuccess: (res) => {
      if (res.status === 200) {
        toast.success('Staff terminated')
        qc.invalidateQueries({ queryKey: ['active-staff'] })
        qc.invalidateQueries({ queryKey: ['drivers'] })
        qc.invalidateQueries({ queryKey: ['active-helpers'] })
        qc.invalidateQueries({ queryKey: ['terminated-staff'] })
        setTerminatePerson(null)
      }
      else toast.error('Failed to terminate')
    },
    onError: () => toast.error('Server error'),
  })
  const { mutate: rejoin } = useMutation({
    mutationFn: (row: any) => mastersService.rejoinStaff({ id: row.id, staff_type: row.staff_type }),
    onSuccess: (res) => {
      if (res.status === 200) {
        toast.success('Staff rejoined!')
        qc.invalidateQueries({ queryKey: ['active-staff'] })
        qc.invalidateQueries({ queryKey: ['drivers'] })
        qc.invalidateQueries({ queryKey: ['active-helpers'] })
        qc.invalidateQueries({ queryKey: ['terminated-staff'] })
      }
      else toast.error('Failed to rejoin')
    },
    onError: () => toast.error('Server error'),
  })

  const handleTypeChange = (type: string) => {
    setDataType(type)
    setShowForm(false)
    setColumnFilters({})
    // Pre-fill designation for custom types
    if (type && !FIXED_TYPES.includes(type)) {
      setStaffForm(f => ({ ...f, designation: type }))
    }
  }

  const downloadTemplate = () => {
    if (!dataType || dataType === 'Terminated') return
    const headers = dataType === 'Driver' ? DRIVER_TEMPLATE_HEADERS
      : dataType === 'Helper' ? HELPER_TEMPLATE_HEADERS : STAFF_TEMPLATE_HEADERS
    const sample = dataType === 'Driver'
      ? ['Raju', '123456789012', '1990-01-01', '9876543210', '', '', '2020-01-01', 'Reference', '', 'Venkata Raju', 'DL-AP123', '2015-06-01', '2030-06-01', '2015-06-01', '2015-06-01', '2025-06-01', 'Venkata Raju', '1234567890', 'SBI', 'Hyderabad', 'SBIN0001234', '', '']
      : dataType === 'Helper'
      ? ['Ramesh', 'Ramesh Kumar', '123456789012', '', '9876543210', '', '', '2020-01-01', 'Ref Name', '', 'Ramesh Kumar', '1234567890', 'SBI', 'Hyderabad', 'SBIN0001234', '', '']
      : ['Manager', 'Suresh', 'Suresh Kumar', '987654321012', '', '9876543210', '', '', '2020-01-01', 'Ref Name', '', 'Suresh Kumar', '1234567890', 'SBI', 'Hyderabad', 'SBIN0001234', '', '']
    downloadExcel([headers, sample], `${dataType}_Upload_Template_${Date.now()}.xlsx`)
  }

  const downloadData = () => {
    if (!dataType || dataType === 'Terminated') return
    let rows: any[][] = []
    if (dataType === 'Driver') {
      rows = driverList.map(r => [
        r.nickname ?? '', r.aadhar_number ?? '', r.dldateofbirth ?? '', r.mobile_number ?? '',
        r.alternate_number ?? '', r.emergency_mobile_number ?? '', r.date_of_joining ?? '',
        r.reference ?? '', r.address ?? '', r.driver_name ?? '', r.dl_number ?? '',
        r.drivinglicense_joining_date ?? '', r.dl_expiry_date ?? '',
        r.transportoneissuedate ?? '', r.transportvalidityfrom ?? '', r.transportvalidityto ?? '',
        r.account_holder_name ?? '', r.account_number ?? '', r.bank_name ?? '',
        r.branch_name ?? '', r.ifsc_code ?? '', r.upi_id ?? '', r.remarks ?? '',
      ])
      downloadExcel([DRIVER_TEMPLATE_HEADERS, ...rows], `Drivers_${Date.now()}.xlsx`)
    } else if (dataType === 'Helper') {
      rows = helperList.map(r => [
        r.nickname ?? '', r.helper_name ?? '', r.adhar_number ?? '', r.dob ?? '',
        r.mobile_number ?? '', r.alternate_number ?? '', r.emergency_mobile_number ?? '',
        r.date_of_joining ?? '', r.reference ?? '', r.address ?? '',
        r.account_holder_name ?? '', r.account_number ?? '', r.bank_name ?? '',
        r.branch_name ?? '', r.ifsc_code ?? '', r.upi_id ?? '', r.remarks ?? '',
      ])
      downloadExcel([HELPER_TEMPLATE_HEADERS, ...rows], `Helpers_${Date.now()}.xlsx`)
    } else {
      rows = staffList.map(r => [
        r.designation ?? '', r.nickName ?? '', r.fullName ?? '', r.aadhaar ?? '', r.dob ?? '',
        r.mobile ?? '', r.alternativemobilenumber ?? '', r.emergencyContact ?? '',
        r.dateOfJoining ?? '', r.referencename ?? '', r.address ?? '',
        r.accountHolderName ?? '', r.accountNumber ?? '', r.bankName ?? '', r.branchname ?? '',
        r.ifscCode ?? '', r.upiId ?? '', r.remarks ?? '',
      ])
      downloadExcel([STAFF_TEMPLATE_HEADERS, ...rows], `Staff_${dataType}_${Date.now()}.xlsx`)
    }
    toast.success(`Exported ${rows.length} records`)
  }

  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewType, setPreviewType] = useState<string>('')
  const [previewRows, setPreviewRows] = useState<{ payload: Record<string, any>; preview: ExcelPreviewRow }[]>([])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !dataType || dataType === 'Terminated') return
    e.target.value = ''
    try {
      const ab = await file.arrayBuffer()
      const wb = XLSX.read(ab)
      const ws = wb.Sheets[wb.SheetNames[0]]
      const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 })
      if (raw.length < 2) { toast.error('No data rows found'); return }
      const [, ...dataRows] = raw
      let rows: { payload: Record<string, any>; key: string }[]
      if (dataType === 'Driver') {
        rows = dataRows.filter(r => r && String(r[0] ?? '').trim() && String(r[9] ?? '').trim()).map(r => {
          const payload = {
            nickname: String(r[0] ?? '').trim(),
            aadhar_number: String(r[1] ?? '').trim() || null,
            dldateofbirth: String(r[2] ?? '').trim() || null,
            mobile_number: String(r[3] ?? '').trim(),
            alternate_number: String(r[4] ?? '').trim() || null,
            emergency_mobile_number: String(r[5] ?? '').trim() || null,
            date_of_joining: String(r[6] ?? '').trim() || null,
            reference: String(r[7] ?? '').trim() || null,
            address: String(r[8] ?? '').trim() || null,
            driver_name: String(r[9] ?? '').trim(),
            dl_number: String(r[10] ?? '').trim() || null,
            drivinglicense_joining_date: String(r[11] ?? '').trim() || null,
            dl_expiry_date: String(r[12] ?? '').trim() || null,
            transportoneissuedate: String(r[13] ?? '').trim() || null,
            transportvalidityfrom: String(r[14] ?? '').trim() || null,
            transportvalidityto: String(r[15] ?? '').trim() || null,
            account_holder_name: String(r[16] ?? '').trim() || null,
            account_number: String(r[17] ?? '').trim() || null,
            bank_name: String(r[18] ?? '').trim() || null,
            branch_name: String(r[19] ?? '').trim() || null,
            ifsc_code: String(r[20] ?? '').trim() || null,
            upi_id: String(r[21] ?? '').trim() || null,
            remarks: String(r[22] ?? '').trim() || null,
          }
          return { payload, key: payload.driver_name }
        })
      } else if (dataType === 'Staff') {
        rows = dataRows.filter(r => r && String(r[2] ?? '').trim()).map(r => {
          const payload = {
            designation: String(r[0] ?? '').trim() || 'Staff',
            nickName: String(r[1] ?? '').trim() || null,
            fullName: String(r[2] ?? '').trim(),
            aadhaar: String(r[3] ?? '').trim() || null,
            dob: String(r[4] ?? '').trim() || null,
            mobile: String(r[5] ?? '').trim(),
            alternativemobilenumber: String(r[6] ?? '').trim() || null,
            emergencyContact: String(r[7] ?? '').trim() || null,
            dateOfJoining: String(r[8] ?? '').trim() || null,
            referencename: String(r[9] ?? '').trim() || null,
            address: String(r[10] ?? '').trim() || null,
            accountHolderName: String(r[11] ?? '').trim() || null,
            accountNumber: String(r[12] ?? '').trim() || null,
            bankName: String(r[13] ?? '').trim() || null,
            branchname: String(r[14] ?? '').trim() || null,
            ifscCode: String(r[15] ?? '').trim() || null,
            upiId: String(r[16] ?? '').trim() || null,
            remarks: String(r[17] ?? '').trim() || null,
          }
          return { payload, key: payload.fullName }
        })
      } else {
        rows = dataRows.filter(r => r && String(r[1] ?? '').trim()).map(r => {
          const payload = {
            nickname: String(r[0] ?? '').trim() || null,
            helper_name: String(r[1] ?? '').trim(),
            adhar_number: String(r[2] ?? '').trim() || null,
            dob: String(r[3] ?? '').trim() || null,
            mobile_number: String(r[4] ?? '').trim(),
            alternate_number: String(r[5] ?? '').trim() || null,
            emergency_mobile_number: String(r[6] ?? '').trim() || null,
            date_of_joining: String(r[7] ?? '').trim() || null,
            reference: String(r[8] ?? '').trim() || null,
            address: String(r[9] ?? '').trim() || null,
            account_holder_name: String(r[10] ?? '').trim() || null,
            account_number: String(r[11] ?? '').trim() || null,
            bank_name: String(r[12] ?? '').trim() || null,
            branch_name: String(r[13] ?? '').trim() || null,
            ifsc_code: String(r[14] ?? '').trim() || null,
            upi_id: String(r[15] ?? '').trim() || null,
            remarks: String(r[16] ?? '').trim() || null,
          }
          return { payload, key: payload.helper_name }
        })
      }
      if (rows.length === 0) { toast.error('No valid rows (required field is empty)'); return }
      const existingList = dataType === 'Driver' ? driverList : dataType === 'Helper' ? helperList : staffList
      const existingKeyField = dataType === 'Driver' ? 'driver_name' : dataType === 'Helper' ? 'helper_name' : 'fullName'
      const existingKeys = new Set(existingList.map((r: any) => String(r[existingKeyField] ?? '').toLowerCase().trim()))
      setPreviewType(dataType)
      setPreviewRows(rows.map(r => ({
        payload: r.payload,
        preview: { values: Object.values(r.payload).map(v => v ?? ''), isDuplicate: existingKeys.has(r.key.toLowerCase().trim()) },
      })))
      setPreviewOpen(true)
    } catch {
      toast.error('Failed to process file. Ensure it is a valid Excel file.')
    }
  }

  const confirmImport = async (selectedIndexes: number[]) => {
    const rows = selectedIndexes.map(i => previewRows[i].payload)
    setUploading(true)
    try {
      const uid = localStorage.getItem('user_id') ?? ''
      const unm = localStorage.getItem('usr_nm') ?? ''
      const res = await mastersService.bulkUploadStaff({ type: previewType, rows, user_id: uid, usr_nm: unm })
      if (res.status === 200) {
        const { inserted, skipped, total } = res.data
        qc.invalidateQueries({ queryKey: ['active-staff'] })
        qc.invalidateQueries({ queryKey: ['drivers'] })
        qc.invalidateQueries({ queryKey: ['active-helpers'] })
        if (skipped.length > 0) {
          toast.success(`Inserted ${inserted} of ${total}. ${skipped.length} duplicates skipped: ${skipped.slice(0, 5).join(', ')}${skipped.length > 5 ? '…' : ''}`)
        } else {
          toast.success(`Successfully inserted ${inserted} ${previewType} records!`)
        }
        setPreviewOpen(false)
      } else toast.error('Upload failed')
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const mkTerminateBtn = (staffType: string): Column => ({
    label: 'Action', key: 'id',
    render: (_: unknown, row: any) => (
      <button onClick={() => setTerminatePerson({ person: row, staffType })}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 transition-colors">
        <AlertTriangle className="w-3.5 h-3.5" /> Terminate
      </button>
    ),
  })

  const slNoCol: Column = { label: 'Sl No', key: '_idx', align: 'center', render: (_v, _row, i) => <span className="text-sm text-slate-500">{i + 1}</span> }

  // Table column definitions matching Angular
  const driverCols: Column[] = [
    slNoCol,
    { label: 'Driver ID', key: 'driver_id_number', filterable: true },
    { label: 'Aadhar Name', key: 'nickname', filterable: true },
    { label: 'Mobile Number', key: 'mobile_number', filterable: true },
    { label: 'DL Name', key: 'driver_name', filterable: true, render: (v) => <span className="font-semibold">{String(v ?? '—')}</span> },
    { label: 'DL Number', key: 'dl_number', filterable: true },
    { label: 'Transport Valid To', key: 'transportvalidityto', render: (v) => <span className="text-sm">{String(v ?? '—')}</span> },
    mkTerminateBtn('driver'),
  ]
  const staffCols: Column[] = [
    slNoCol,
    { label: 'Full Name', key: 'fullName', filterable: true, render: (v) => <span className="font-semibold">{String(v ?? '—')}</span> },
    { label: 'Mobile', key: 'mobile', filterable: true },
    { label: 'Designation', key: 'designation', filterable: true, render: (v) => <Badge variant="info">{String(v ?? '—')}</Badge> },
    mkTerminateBtn('staff'),
  ]
  const helperCols: Column[] = [
    slNoCol,
    { label: 'Helper ID', key: 'helper_id_number', filterable: true },
    { label: 'Aadhar Name', key: 'helper_name', filterable: true, render: (v) => <span className="font-semibold">{String(v ?? '—')}</span> },
    { label: 'Mobile Number', key: 'mobile_number', filterable: true },
    { label: 'Aadhar Number', key: 'adhar_number', filterable: true },
    mkTerminateBtn('helper'),
  ]
  const terminatedCols: Column[] = [
    slNoCol,
    { label: 'Name', key: 'name', filterable: true, render: (v) => <span className="font-bold">{String(v ?? '—')}</span> },
    { label: 'Role', key: 'role', filterable: true, render: (v, r: any) => <div><Badge variant="purple">{String(v ?? '—')}</Badge><div className="text-xs text-slate-400 mt-0.5 capitalize">{r.staff_type}</div></div> },
    { label: 'Mobile', key: 'mobile', filterable: true },
    { label: 'Left On', key: 'leaving_date', render: (v) => <span className="text-sm text-red-500 font-medium">{String(v ?? '—')}</span> },
    { label: 'Reason', key: 'termination_reason', render: (v) => <span className="text-xs text-slate-500 max-w-[200px] block truncate" title={String(v ?? '')}>{String(v ?? '—')}</span> },
    { label: 'Action', key: 'id', render: (_, row: any) => <Button variant="success" size="sm" onClick={() => rejoin(row)}><RotateCcw className="w-3.5 h-3.5" /> Rejoin</Button> },
  ]

  const currentData = dataType === 'Driver' ? driverList
    : dataType === 'Staff' ? staffList
    : dataType === 'Helper' ? helperList
    : dataType === 'Terminated' ? terminatedList
    : staffList  // custom type — filtered by designation
  const currentLoading = dataType === 'Driver' ? loadDrivers
    : dataType === 'Helper' ? loadHelpers
    : dataType === 'Terminated' ? loadTerminated
    : loadStaff  // Staff + custom types all use staffData
  const currentCols = dataType === 'Driver' ? driverCols
    : dataType === 'Helper' ? helperCols
    : dataType === 'Terminated' ? terminatedCols
    : staffCols  // Staff + custom types show same columns

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="flex justify-between items-end">
        <PageHeader title="Staff Register" subtitle="Manage drivers, staff, helpers and terminations" />
        {dataType && dataType !== 'Terminated' && !showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Users className="w-4 h-4" /> Add {dataType}
          </Button>
        )}
      </div>

      {/* Select Data Type card */}
      <GlassCard className="p-5" colorBar="bg-gradient-to-r from-slate-500 to-slate-700">
        <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-3">Select Data Type</h3>
        <div className="flex flex-wrap gap-4 items-start">
          {/* Dropdown */}
          <div className="relative min-w-[220px]">
            <select
              value={dataType}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="w-full h-11 pl-4 pr-10 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 appearance-none cursor-pointer"
              style={{ colorScheme: 'light' }}
            >
              <option value="">Select Type</option>
              {FIXED_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              {customTypes.length > 0 && (
                <optgroup label="── Custom Types ──">
                  {customTypes.map((t) => <option key={t.id} value={t.type_name}>{t.type_name}</option>)}
                </optgroup>
              )}
            </select>
            <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Add new type inline */}
          <AddCustomTypeInline
            onAdd={(name) => addCustomType(name)}
            isPending={addingCustomType}
          />
        </div>

        {/* Custom types chips */}
        {customTypes.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider self-center">Custom Types:</span>
            {customTypes.map((t) => (
              <span key={t.id}
                className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-blue-200">
                {t.type_name}
                <button
                  onClick={() => delCustomType(t.id)}
                  className="text-blue-400 hover:text-red-500 transition-colors ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Excel actions — only for Driver / Staff / Helper */}
        {['Driver', 'Staff', 'Helper'].includes(dataType) && (
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-100 items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Excel:</span>
            <button
              onClick={downloadTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Template
            </button>
            <button
              onClick={downloadData}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Export
            </button>
            <label className="cursor-pointer">
              <span className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${uploading ? 'border-blue-200 bg-blue-50 text-blue-400' : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
                <Upload className="w-3.5 h-3.5" /> {uploading ? 'Uploading…' : 'Import Excel'}
              </span>
              <input ref={uploadRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
          </div>
        )}
      </GlassCard>

      <ExcelImportPreviewModal
        open={previewOpen}
        title={`Confirm ${previewType} Import`}
        headers={previewType === 'Driver' ? DRIVER_TEMPLATE_HEADERS : previewType === 'Helper' ? HELPER_TEMPLATE_HEADERS : STAFF_TEMPLATE_HEADERS}
        rows={previewRows.map(r => r.preview)}
        submitting={uploading}
        onCancel={() => setPreviewOpen(false)}
        onConfirm={confirmImport}
      />

      {/* Empty state */}
      {!dataType && (
        <GlassCard className="p-12 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h5 className="text-slate-500 font-semibold">Please select a data type to view records</h5>
          <p className="text-sm text-slate-400 mt-1">Choose from the dropdown above or add a new custom type</p>
        </GlassCard>
      )}

      {/* Add form */}
      <AnimatePresence>
        {showForm && dataType && dataType !== 'Terminated' && (
          <motion.div key={`form-${dataType}`} initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
            <GlassCard className="p-6" colorBar={typeColors[dataType] ?? 'bg-gradient-to-r from-slate-400 to-slate-600'}>
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Users className="w-5 h-5" /> Register {dataType}
                </h2>
                <button onClick={() => setShowForm(false)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
              </div>

              {/* Driver form */}
              {dataType === 'Driver' && (
                <div className="space-y-5">
                  <SectionBox title="Personal Details">
                    <div><Label>Aadhar Name <span className="text-red-500">*</span></Label><Input value={driverForm.nickname} onChange={df('nickname')} /></div>
                    <div><Label>Aadhar Number <span className="text-red-500">*</span></Label><Input inputMode="numeric" maxLength={12} value={driverForm.aadhar_number} onChange={digitsOnly(setDriverForm, 'aadhar_number', 12)} /></div>
                    <div><Label>Date of Birth</Label><Input type="date" max={today} value={driverForm.dldateofbirth} onChange={df('dldateofbirth')} /></div>
                    <div><Label>Mobile Number <span className="text-red-500">*</span></Label><Input inputMode="numeric" maxLength={10} value={driverForm.mobile_number} onChange={digitsOnly(setDriverForm, 'mobile_number', 10)} /></div>
                    <div><Label>Alternate Mobile</Label><Input inputMode="numeric" maxLength={10} value={driverForm.alternate_number} onChange={digitsOnly(setDriverForm, 'alternate_number', 10)} /></div>
                    <div><Label>Emergency Number</Label><Input inputMode="numeric" maxLength={10} value={driverForm.emergency_mobile_number} onChange={digitsOnly(setDriverForm, 'emergency_mobile_number', 10)} /></div>
                    <div><Label>Date of Joining <span className="text-red-500">*</span></Label><Input type="date" max={today} value={driverForm.date_of_joining} onChange={df('date_of_joining')} /></div>
                    <div><Label>Reference Name <span className="text-red-500">*</span></Label><Input value={driverForm.reference} onChange={df('reference')} /></div>
                    <div className="md:col-span-3"><Label>Address</Label>
                      <textarea rows={2} value={driverForm.address} onChange={df('address')} placeholder="Residential address…" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none" />
                    </div>
                    <ImageUploadField label="Aadhar Card Front" value={driverImages.aadharcardfront} onChange={(v) => setDriverImages((s) => ({ ...s, aadharcardfront: v }))} />
                    <ImageUploadField label="Aadhar Card Back" value={driverImages.aadharcardback} onChange={(v) => setDriverImages((s) => ({ ...s, aadharcardback: v }))} />
                  </SectionBox>

                  <SectionBox title="DL Details">
                    <div><Label>DL Name <span className="text-red-500">*</span></Label><Input value={driverForm.driver_name} onChange={df('driver_name')} /></div>
                    <div><Label>DL Number <span className="text-red-500">*</span></Label><Input value={driverForm.dl_number} onChange={df('dl_number')} /></div>
                    <div><Label>DL Issue Date <span className="text-red-500">*</span></Label><Input type="date" max={today} value={driverForm.drivinglicense_joining_date} onChange={df('drivinglicense_joining_date')} /></div>
                    <div><Label>DL Expiry Date <span className="text-red-500">*</span></Label><Input type="date" value={driverForm.dl_expiry_date} onChange={df('dl_expiry_date')} /></div>
                    <div><Label>Transport Issue Date <span className="text-red-500">*</span></Label><Input type="date" max={today} value={driverForm.transportoneissuedate} onChange={df('transportoneissuedate')} /></div>
                    <div><Label>Transport Valid From <span className="text-red-500">*</span></Label><Input type="date" max={today} value={driverForm.transportvalidityfrom} onChange={df('transportvalidityfrom')} /></div>
                    <div><Label>Transport Valid To <span className="text-red-500">*</span></Label><Input type="date" value={driverForm.transportvalidityto} onChange={df('transportvalidityto')} /></div>
                    <ImageUploadField label="DL Front" value={driverImages.dlfront} onChange={(v) => setDriverImages((s) => ({ ...s, dlfront: v }))} />
                    <ImageUploadField label="DL Back" value={driverImages.dlback} onChange={(v) => setDriverImages((s) => ({ ...s, dlback: v }))} />
                  </SectionBox>

                  <SectionBox title="Bank Details">
                    <div><Label>Account Holder Name <span className="text-red-500">*</span></Label><Input value={driverForm.account_holder_name} onChange={df('account_holder_name')} /></div>
                    <div><Label>Account Number <span className="text-red-500">*</span></Label><Input value={driverForm.account_number} onChange={df('account_number')} /></div>
                    <div><Label>Bank Name <span className="text-red-500">*</span></Label><Input value={driverForm.bank_name} onChange={df('bank_name')} /></div>
                    <div><Label>Branch Name <span className="text-red-500">*</span></Label><Input value={driverForm.branch_name} onChange={df('branch_name')} /></div>
                    <div><Label>IFSC Code <span className="text-red-500">*</span></Label><Input value={driverForm.ifsc_code} onChange={df('ifsc_code')} /></div>
                    <div><Label>UPI ID</Label><Input value={driverForm.upi_id} onChange={df('upi_id')} /></div>
                    <ImageUploadField label="UPI / Passbook Scan" value={driverImages.upiscanner} onChange={(v) => setDriverImages((s) => ({ ...s, upiscanner: v }))} />
                  </SectionBox>

                  <div><Label>Remarks</Label><Input value={driverForm.remarks} onChange={df('remarks')} /></div>
                </div>
              )}

              {/* Staff form — also used for custom types */}
              {(dataType === 'Staff' || isCustomType) && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                      <Label>Designation <span className="text-red-500">*</span></Label>
                      {isCustomType
                        ? <Input value={staffForm.designation} readOnly className="bg-slate-50 text-slate-500 cursor-not-allowed" />
                        : <StaffTypePicker value={staffForm.designation} onChange={(v) => setStaffForm(f => ({ ...f, designation: v }))} />
                      }
                    </div>
                    <div><Label>Nick Name</Label><Input value={staffForm.nickName} onChange={sf('nickName')} /></div>
                  </div>

                  <SectionBox title="Personal Details">
                    <div><Label>Aadhar Name (Full Name) <span className="text-red-500">*</span></Label><Input value={staffForm.fullName} onChange={sf('fullName')} /></div>
                    <div><Label>Aadhar Number <span className="text-red-500">*</span></Label><Input inputMode="numeric" maxLength={12} value={staffForm.aadhaar} onChange={digitsOnly(setStaffForm, 'aadhaar', 12)} /></div>
                    <div><Label>Date of Birth</Label><Input type="date" max={today} value={staffForm.dob} onChange={sf('dob')} /></div>
                    <div><Label>Mobile Number <span className="text-red-500">*</span></Label><Input inputMode="numeric" maxLength={10} value={staffForm.mobile} onChange={digitsOnly(setStaffForm, 'mobile', 10)} /></div>
                    <div><Label>Alternative Mobile</Label><Input inputMode="numeric" maxLength={10} value={staffForm.alternativemobilenumber} onChange={digitsOnly(setStaffForm, 'alternativemobilenumber', 10)} /></div>
                    <div><Label>Emergency Contact</Label><Input inputMode="numeric" maxLength={10} value={staffForm.emergencyContact} onChange={digitsOnly(setStaffForm, 'emergencyContact', 10)} /></div>
                    <div><Label>Date of Joining <span className="text-red-500">*</span></Label><Input type="date" max={today} value={staffForm.dateOfJoining} onChange={sf('dateOfJoining')} /></div>
                    <div><Label>Reference Name <span className="text-red-500">*</span></Label><Input value={staffForm.referencename} onChange={sf('referencename')} /></div>
                    <div className="md:col-span-3"><Label>Address</Label>
                      <textarea rows={2} value={staffForm.address} onChange={sf('address')} placeholder="Residential address…" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none" />
                    </div>
                    <ImageUploadField label="Aadhar Card Front" value={staffImages.aadhaarCardFront} onChange={(v) => setStaffImages((s) => ({ ...s, aadhaarCardFront: v }))} />
                    <ImageUploadField label="Aadhar Card Back" value={staffImages.aadhaarCardBack} onChange={(v) => setStaffImages((s) => ({ ...s, aadhaarCardBack: v }))} />
                  </SectionBox>

                  <SectionBox title="Bank Details">
                    <div><Label>Account Holder Name <span className="text-red-500">*</span></Label><Input value={staffForm.accountHolderName} onChange={sf('accountHolderName')} /></div>
                    <div><Label>Account Number <span className="text-red-500">*</span></Label><Input value={staffForm.accountNumber} onChange={sf('accountNumber')} /></div>
                    <div><Label>Bank Name <span className="text-red-500">*</span></Label><Input value={staffForm.bankName} onChange={sf('bankName')} /></div>
                    <div><Label>Branch Name <span className="text-red-500">*</span></Label><Input value={staffForm.branchname} onChange={sf('branchname')} /></div>
                    <div><Label>IFSC Code <span className="text-red-500">*</span></Label><Input value={staffForm.ifscCode} onChange={sf('ifscCode')} /></div>
                    <div><Label>UPI ID</Label><Input value={staffForm.upiId} onChange={sf('upiId')} /></div>
                    <ImageUploadField label="UPI / Passbook Scan" value={staffImages.upiScanner} onChange={(v) => setStaffImages((s) => ({ ...s, upiScanner: v }))} />
                  </SectionBox>

                  <div><Label>Remarks</Label>
                    <textarea rows={2} value={staffForm.remarks} onChange={sf('remarks')} placeholder="Additional notes…" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none" />
                  </div>
                </div>
              )}

              {/* Helper form */}
              {dataType === 'Helper' && (
                <div className="space-y-5">
                  <SectionBox title="Personal Details">
                    <div><Label>Nick Name</Label><Input value={helperForm.nickname} onChange={hf('nickname')} /></div>
                    <div><Label>Aadhar Name (Full Name) <span className="text-red-500">*</span></Label><Input value={helperForm.helper_name} onChange={hf('helper_name')} /></div>
                    <div><Label>Aadhar Number <span className="text-red-500">*</span></Label><Input inputMode="numeric" maxLength={12} value={helperForm.adhar_number} onChange={digitsOnly(setHelperForm, 'adhar_number', 12)} /></div>
                    <div><Label>Date of Birth</Label><Input type="date" max={today} value={helperForm.dob} onChange={hf('dob')} /></div>
                    <div><Label>Mobile Number <span className="text-red-500">*</span></Label><Input inputMode="numeric" maxLength={10} value={helperForm.mobile_number} onChange={digitsOnly(setHelperForm, 'mobile_number', 10)} /></div>
                    <div><Label>Alternate Number</Label><Input inputMode="numeric" maxLength={10} value={helperForm.alternate_number} onChange={digitsOnly(setHelperForm, 'alternate_number', 10)} /></div>
                    <div><Label>Emergency Mobile</Label><Input inputMode="numeric" maxLength={10} value={helperForm.emergency_mobile_number} onChange={digitsOnly(setHelperForm, 'emergency_mobile_number', 10)} /></div>
                    <div><Label>Date of Joining <span className="text-red-500">*</span></Label><Input type="date" max={today} value={helperForm.date_of_joining} onChange={hf('date_of_joining')} /></div>
                    <div><Label>Reference <span className="text-red-500">*</span></Label><Input value={helperForm.reference} onChange={hf('reference')} /></div>
                    <div className="md:col-span-3"><Label>Address</Label>
                      <textarea rows={2} value={helperForm.address} onChange={hf('address')} placeholder="Residential address…" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none" />
                    </div>
                    <ImageUploadField label="Aadhar Card Front" value={helperImages.adharcardfront} onChange={(v) => setHelperImages((s) => ({ ...s, adharcardfront: v }))} />
                    <ImageUploadField label="Aadhar Card Back" value={helperImages.adharcardback} onChange={(v) => setHelperImages((s) => ({ ...s, adharcardback: v }))} />
                  </SectionBox>

                  <SectionBox title="Bank Details">
                    <div><Label>Account Holder Name <span className="text-red-500">*</span></Label><Input value={helperForm.account_holder_name} onChange={hf('account_holder_name')} /></div>
                    <div><Label>Account Number <span className="text-red-500">*</span></Label><Input value={helperForm.account_number} onChange={hf('account_number')} /></div>
                    <div><Label>Bank Name <span className="text-red-500">*</span></Label><Input value={helperForm.bank_name} onChange={hf('bank_name')} /></div>
                    <div><Label>Branch Name <span className="text-red-500">*</span></Label><Input value={helperForm.branch_name} onChange={hf('branch_name')} /></div>
                    <div><Label>IFSC Code <span className="text-red-500">*</span></Label><Input value={helperForm.ifsc_code} onChange={hf('ifsc_code')} /></div>
                    <div><Label>UPI ID</Label><Input value={helperForm.upi_id} onChange={hf('upi_id')} /></div>
                    <ImageUploadField label="UPI / Passbook Scan" value={helperImages.upiscanner} onChange={(v) => setHelperImages((s) => ({ ...s, upiscanner: v }))} />
                  </SectionBox>

                  <div><Label>Remarks</Label><Input value={helperForm.remarks} onChange={hf('remarks')} /></div>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                {(dataType === 'Staff' || isCustomType) && <Button onClick={() => addStaff()} disabled={addingStaff || !staffForm.fullName}><Save className="w-4 h-4" />{addingStaff ? 'Saving…' : `Save ${dataType}`}</Button>}
                {dataType === 'Driver' && <Button onClick={() => addDriver()} disabled={addingDriver || !driverForm.driver_name || !driverForm.nickname}><Save className="w-4 h-4" />{addingDriver ? 'Saving…' : 'Save Driver'}</Button>}
                {dataType === 'Helper' && <Button onClick={() => addHelper()} disabled={addingHelper || !helperForm.helper_name}><Save className="w-4 h-4" />{addingHelper ? 'Saving…' : 'Save Helper'}</Button>}
                <Button variant="ghost" onClick={() => setShowForm(false)}><X className="w-4 h-4" /> Cancel</Button>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Data table */}
      {dataType && (
        <>
          {dataType === 'Terminated' && terminatedList.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(['staff', 'driver', 'helper'] as const).map((type) => {
                const count = terminatedList.filter((r: any) => r.staff_type === type).length
                return (
                  <GlassCard key={type} className="p-4 bg-red-50">
                    <div className="text-2xl font-extrabold text-red-600">{count}</div>
                    <div className="text-xs font-bold text-slate-500 uppercase capitalize">{type}s Terminated</div>
                  </GlassCard>
                )
              })}
            </div>
          )}
          <DataTable
            title={`${dataType === 'Terminated' ? 'Terminated Staff' : `Active ${dataType}s`} (${currentData.length})${isCustomType ? ` — filtered by designation: ${dataType}` : ''}`}
            columns={currentCols}
            data={currentData}
            loading={currentLoading}
            onAction={(action, row) => {
              if (action === 'view') {
                const staffType = dataType === 'Driver' ? 'driver' : dataType === 'Helper' ? 'helper' : 'staff'
                setViewPerson({ person: row, staffType })
              }
            }}
            actions={dataType === 'Terminated' ? [] : ['view']}
            columnFilters={columnFilters}
            onColumnFilterChange={(k, v) => setColumnFilters((prev) => ({ ...prev, [k]: v }))}
          />
        </>
      )}

      {/* Termination modal */}
      {terminatePerson && (
        <TerminateModal
          person={terminatePerson.person}
          staffType={terminatePerson.staffType}
          onConfirm={(date, reason) => terminate({ date, reason })}
          onClose={() => setTerminatePerson(null)}
          isPending={terminating}
        />
      )}

      {/* View details modal */}
      {viewPerson && (
        <ViewDetailsModal
          person={viewPerson.person}
          staffType={viewPerson.staffType}
          onClose={() => setViewPerson(null)}
        />
      )}
    </motion.div>
  )
}
