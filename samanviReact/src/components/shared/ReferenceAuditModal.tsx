import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, CheckCircle2, CreditCard, History, RefreshCw, X } from 'lucide-react'
import api from '@/lib/api'
import { formatAuditDate } from '@/lib/auditDate'

const TRIP_FIELDS: Array<[string, string]> = [
  ['trip_date', 'Trip Date'], ['trip_for', 'Trip For'], ['vehicle_type', 'Vehicle Type'], ['bus_no', 'Bus / Van'],
  ['service_no', 'Service No'], ['phone_number', 'Phone'], ['driver1_name', 'Driver 1'], ['driver2_name', 'Driver 2'],
  ['helper_name', 'Helper'], ['conductor_name', 'Conductor'], ['paid_to_name', 'Paid To'], ['total_amount', 'Trip Total'],
  ['grantotal', 'Filed Expense Total'], ['remarks', 'Trip Remarks'], ['created_name', 'Created By'], ['cts', 'Created At'],
  ['updatedby_name', 'Last Edited By'], ['updated_date', 'Last Edited At'], ['status', 'Expense Filed Status'], ['admin_status', 'Approval Status'],
]
const EXPENSE_FIELDS: Array<[string, string]> = [
  ['date', 'Filed At'], ['usr_nm', 'Filed By'], ['driveronebeta', 'Driver 1 Beta'], ['driveronesalary', 'Driver 1 Opting Salary'],
  ['driveronesudsalary', 'Driver 1 Salary'], ['driverone_payment', 'Driver 1 Payment'], ['driveronebeta_payment', 'Driver 1 Beta Payment'],
  ['opt_driver1_name', 'Opting Driver 1'], ['drivertwobeta', 'Driver 2 Beta'], ['drivertwosalary', 'Driver 2 Opting Salary'],
  ['drivertwosudsalary', 'Driver 2 Salary'], ['drivertwo_payment', 'Driver 2 Payment'], ['drivertwobeta_payment', 'Driver 2 Beta Payment'],
  ['opt_driver2_name', 'Opting Driver 2'], ['helperbeta', 'Helper Beta'], ['helpersalary', 'Helper Opting Salary'],
  ['helpersudsalary', 'Helper Salary'], ['helper_payment', 'Helper Payment'], ['helperbeta_payment', 'Helper Beta Payment'],
  ['opt_helper_name', 'Opting Helper'], ['conductor_beta', 'Conductor Beta'], ['conductor_salary', 'Conductor Opting Salary'],
  ['parking_amt', 'Parking'], ['tot_salary', 'Total Salary'], ['tot_beta', 'Total Beta'], ['tot_salary_beta', 'Salary + Beta'],
  ['amount', 'Expense Total'], ['paid_to_name', 'Paid To'], ['remarks', 'Expense Remarks'],
  ['updatedby_name', 'Expense Last Edited By'], ['updatedby_date', 'Expense Last Edited At'],
  ['admin_status', 'Approval Status'], ['action_by_name', 'Approved / Rejected By'], ['admin_action_date', 'Approval Date'],
]
const HIDDEN_FIELDS = /^(id|user_id|updatedby_id|updatedid|updated_by|admin_status_by_id|d_in|lastinsert_id|password|otp|token|secret|hash|profile_image|image)$/i
const labelFor = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
const visibleEntries = (record: Record<string, unknown> | null | undefined) => Object.entries(record || {}).filter(([key, value]) =>
  !HIDDEN_FIELDS.test(key) && value !== null && value !== undefined && typeof value !== 'object' && String(value).trim() !== '',
)
const prettyValue = (key: string, value: unknown) => {
  if (/^admin_status$/i.test(key)) {
    const status = Number(value)
    if (status === 1) return 'Approved'
    if (status === 2) return 'Rejected'
    if (status === 0) return 'Pending'
  }
  return /date|_at$|^cts$/i.test(key) ? formatAuditDate(value) : String(value)
}
const currency = (value: unknown) => {
  const amount = Number(value)
  return Number.isFinite(amount) ? `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'
}

function RecordGrid({ record, fields }: { record: any; fields?: Array<[string, string]> }) {
  const rows = fields
    ? fields.map(([key, label]) => [key, label, record?.[key]] as const).filter(([, , value]) => value !== null && value !== undefined && String(value).trim() !== '')
    : visibleEntries(record).map(([key, value]) => [key, labelFor(key), value] as const)
  if (!rows.length) return <p className="text-sm text-slate-500">No additional record details.</p>
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
    {rows.map(([key, label, value]) => <div key={key} className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm text-slate-800 whitespace-pre-wrap break-words">{prettyValue(key, value)}</p>
    </div>)}
  </div>
}

function ActivityTimeline({ steps }: { steps: any[] }) {
  if (!steps.length) return <p className="text-sm text-slate-500">No activity history recorded.</p>
  return <div className="relative space-y-3 pl-7">
    <div className="absolute left-[11px] top-4 bottom-4 w-px bg-blue-200" />
    {steps.map((step, index) => {
      const complete = step.state === 'done'
      return <article key={`${step.label}-${index}`} className="relative rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className={`flex items-center justify-between gap-3 px-4 py-2.5 ${complete ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-700'}`}>
          <div className="flex items-center gap-2 min-w-0"><span className={`rounded-md px-2 py-1 text-[10px] font-extrabold uppercase ${complete ? 'bg-white/20' : 'bg-slate-200 text-slate-600'}`}>{step.state === 'done' ? 'Done' : step.state === 'pending' ? 'Pending' : 'Info'}</span><b className="text-sm truncate">{step.label}</b>{step.who && <span className={`text-xs truncate ${complete ? 'text-white/80' : 'text-slate-500'}`}>{step.who}</span>}</div>
          <span className={`text-[11px] whitespace-nowrap ${complete ? 'text-white/80' : 'text-slate-400'}`}>{step.when ? formatAuditDate(step.when) : '—'}</span>
        </div>
        {step.state !== 'done' && <p className="px-4 py-3 text-xs text-slate-500">{step.state === 'not_applicable' ? 'No separate step in this module.' : step.state === 'pending' ? 'Not yet recorded.' : 'No details recorded.'}</p>}
      </article>
    })}
  </div>
}

export default function ReferenceAuditModal({ reference, onClose, initialRecord, moduleLabel, loadAudit = true, footerActions }: {
  reference: string
  onClose: () => void
  initialRecord?: Record<string, unknown>
  moduleLabel?: string
  loadAudit?: boolean
  footerActions?: ReactNode
}) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['reference-audit', reference],
    queryFn: async () => {
      const { data } = await api.post('/getreferenceaudit', { c_number: reference })
      if (data?.status !== 200) throw new Error('Could not load details')
      return data.data
    }, enabled: loadAudit && !!reference, staleTime: 0, refetchOnMount: 'always',
  })
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [])
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [onClose])

  const record = data?.report?.record ?? initialRecord ?? null
  const ledger: any[] = data?.report?.ledger ?? []
  const title = data?.module || moduleLabel || 'Record Details'
  const date = record?.voucherdate ?? record?.date ?? record?.value_date ?? record?.created_at ?? record?.trip_date
  const entryBy = record?.entry_by ?? record?.created_by_name ?? record?.created_name ?? record?.usr_nm ?? record?.name
  const amountValue = title === 'Voucher' && record?.creditanddebitamount != null
    ? Number(record.creditanddebitamount) / 2
    : record?.total_amount ?? record?.total_bill ?? record?.grantotal ?? record?.amount ?? record?.finalamount ?? record?.net_pay
  const description = record?.description ?? record?.narration ?? record?.remarks
  const debitTotal = ledger.reduce((sum, row) => sum + (String(row.account_type ?? row.amount_type ?? '').toLowerCase().includes('debit') ? Number(row.amount ?? row.debit_amount ?? 0) : Number(row.debit_amount ?? 0)), 0)
  const creditTotal = ledger.reduce((sum, row) => sum + (String(row.account_type ?? row.amount_type ?? '').toLowerCase().includes('credit') ? Number(row.amount ?? row.credit_amount ?? 0) : Number(row.credit_amount ?? 0)), 0)
  const hasSides = ledger.some(row => row.account_type || row.amount_type || row.debit_amount != null || row.credit_amount != null)
  const balanced = hasSides && Math.abs(debitTotal - creditTotal) < 0.01
  const ledgerTitle = title === 'Voucher' ? 'Journal Entry' : 'Transaction Entries'

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-3 sm:p-6" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-label={`${title} details for ${reference}`} className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-[26px] bg-white shadow-2xl" onClick={event => event.stopPropagation()}>
        <header className="flex shrink-0 items-start justify-between gap-4 bg-gradient-to-r from-fuchsia-500 via-purple-600 to-violet-700 px-5 py-4 text-white sm:px-7 sm:py-5">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-lg font-extrabold sm:text-2xl"><CreditCard className="h-5 w-5 shrink-0" /> <span className="truncate">{reference}</span></h2>
            <p className="mt-1 text-sm text-white/80">{title}{date ? ` · ${formatAuditDate(date)}` : ''}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {loadAudit && <button type="button" onClick={() => refetch()} aria-label="Refresh details" title="Refresh" className="rounded-full p-2 text-white/75 hover:bg-white/15 hover:text-white"><RefreshCw className="h-4 w-4" /></button>}
            <button type="button" onClick={onClose} aria-label="Close details" className="rounded-full p-2 text-white/75 hover:bg-white/15 hover:text-white"><X className="h-5 w-5" /></button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-7">
          {isLoading && <p className="mb-4 text-sm text-slate-500">Loading details…</p>}
          {isError && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Could not load the latest record details. Showing the available row data below.</p>}
          {!record && !isLoading && !isError && <p className="text-sm text-slate-500">No recorded details found for this reference.</p>}

          {record && <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { label: title === 'Voucher' ? 'Voucher Type' : 'Record Type', value: record.vouchertype ?? record.expense_type ?? record.vehicle_type ?? title },
                { label: 'Total Amount', value: amountValue != null ? currency(amountValue) : '—' },
                { label: 'Entry By', value: entryBy ?? '—' },
              ].map(card => <div key={card.label} className="rounded-full bg-slate-50 px-5 py-3.5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{card.label}</p>
                <p className="mt-0.5 truncate text-sm font-bold text-slate-900">{String(card.value)}</p>
              </div>)}
            </div>

            {description && <section className="rounded-3xl border border-amber-100 bg-amber-50/50 px-4 py-3.5 sm:px-5">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Description</h3>
              <p className="mt-1 text-sm text-slate-800 whitespace-pre-wrap">{String(description)}</p>
            </section>}

            {ledger.length > 0 && <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
                <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-800"><BookOpen className="h-4 w-4 text-slate-500" />{ledgerTitle}</h3>
                {hasSides && <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${balanced ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}><CheckCircle2 className="h-3.5 w-3.5" />{balanced ? 'Balanced' : 'Unbalanced'}</span>}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="bg-slate-50/70 text-[10px] font-bold uppercase tracking-wide text-slate-400"><tr>
                    <th className="px-4 py-2.5 text-left">#</th><th className="px-4 py-2.5 text-left">Particulars</th>
                    {hasSides ? <><th className="px-4 py-2.5 text-right">Dr (₹)</th><th className="px-4 py-2.5 text-right">Cr (₹)</th></> : <><th className="px-4 py-2.5 text-left">Details</th><th className="px-4 py-2.5 text-right">Amount (₹)</th></>}
                  </tr></thead>
                  <tbody>{ledger.map((line, index) => {
                    const side = String(line.account_type ?? line.amount_type ?? '').toLowerCase()
                    const amount = Number(line.amount ?? 0)
                    const debit = side.includes('debit') ? amount : Number(line.debit_amount ?? 0)
                    const credit = side.includes('credit') ? amount : Number(line.credit_amount ?? 0)
                    const particulars = line.expensives ?? line.ledger_name ?? line.particulars ?? line.ledger_id ?? line.description ?? '—'
                    const details = [line.account_type ?? line.amount_type, line.description, line.paid_to_name].filter(Boolean).join(' · ')
                    return <tr key={line.id ?? index} className="border-t border-slate-100">
                      <td className="px-4 py-3 text-slate-400">{index + 1}</td><td className="px-4 py-3 font-semibold text-slate-800">{String(particulars)}</td>
                      {hasSides ? <><td className="px-4 py-3 text-right font-bold text-rose-600">{debit ? debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}</td><td className="px-4 py-3 text-right font-bold text-emerald-600">{credit ? credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}</td></> : <><td className="px-4 py-3 text-slate-500">{details || '—'}</td><td className="px-4 py-3 text-right font-bold text-slate-800">{currency(line.amount ?? line.total_amount ?? line.debit_amount ?? line.credit_amount)}</td></>}
                    </tr>
                  })}</tbody>
                  {hasSides && <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-extrabold"><tr><td colSpan={2} className="px-4 py-3 text-right text-slate-700">Total</td><td className="px-4 py-3 text-right text-rose-600">{debitTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td><td className="px-4 py-3 text-right text-emerald-600">{creditTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr></tfoot>}
                </table>
              </div>
            </section>}

            <section className="rounded-3xl border border-emerald-100 bg-white p-4 sm:p-5">
              <h3 className="mb-4 text-xs font-bold uppercase tracking-wide text-slate-500">Transaction Details</h3>
              <RecordGrid record={record} />
            </section>

            {data?.report?.trip && <section className="rounded-3xl border border-blue-100 bg-blue-50/30 p-4 sm:p-5 space-y-5">
              <div><h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Trip Details</h3><RecordGrid record={data.report.trip} fields={TRIP_FIELDS} /></div>
              <div className="border-t border-blue-100 pt-4"><h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Filed Expense</h3><RecordGrid record={data.report.expense} fields={EXPENSE_FIELDS} /></div>
            </section>}

            <section className="border-t border-slate-100 pt-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-white"><History className="h-4 w-4" /></span><div><h3 className="text-sm font-extrabold text-slate-800">Activity History</h3><p className="text-[11px] text-slate-400">Approval and record activity</p></div></div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-500">{data?.steps?.length ?? 0} {(data?.steps?.length ?? 0) === 1 ? 'event' : 'events'}</span>
              </div>
              <ActivityTimeline steps={data?.steps ?? []} />
            </section>
          </div>}
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-slate-100 bg-white px-5 py-3 sm:px-7">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">Close</button>
          {footerActions && <div className="flex flex-wrap items-center justify-end gap-2">{footerActions}</div>}
        </footer>
      </section>
    </div>,
    document.body,
  )
}
