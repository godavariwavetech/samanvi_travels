import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
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

function DetailGrid({ record, fields }: { record: any; fields: Array<[string, string]> }) {
  if (!record) return <p className="text-sm text-slate-500">No trip expense has been filed.</p>
  const rows = fields.map(([key, label]) => [key, label, record[key]] as const).filter(([, , value]) => value !== null && value !== undefined && String(value).trim() !== '')
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">{rows.map(([key, label, value]) => {
    const dateField = /date|_at$|^cts$/i.test(label.replace(/ /g, '_'))
    const shown = key === 'status' ? Number(value) === 1 ? 'Filed' : 'Not Filed'
      : key === 'admin_status' ? Number(value) === 1 ? 'Approved' : Number(value) === 2 ? 'Rejected' : 'Pending'
      : dateField ? formatAuditDate(value) : String(value)
    return <div key={label}><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="text-sm text-slate-800 whitespace-pre-wrap break-words">{shown}</p></div>
  })}</div>
}

export default function ReferenceAuditModal({ reference, onClose }: { reference: string; onClose: () => void }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['reference-audit', reference],
    queryFn: async () => {
      const { data } = await api.post('/getreferenceaudit', { c_number: reference })
      if (data?.status !== 200) throw new Error('Could not load details')
      return data.data
    }, staleTime: 0, refetchOnMount: 'always',
  })
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [onClose])
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
    <section role="dialog" aria-modal="true" aria-label={`Action details for ${reference}`}
      className="w-full max-w-5xl rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
      <header className="flex items-center justify-between border-b p-5">
        <div><h2 className="font-bold text-blue-600">{reference}</h2><p className="text-xs text-slate-500">{data?.module} · Approval and authorization details · IST</p></div>
        <button type="button" autoFocus aria-label="Close details" onClick={onClose}><X className="h-5 w-5" /></button>
      </header>
      <div className="p-5 space-y-5">
        {data?.report && <>
          <section className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-3">
            <h3 className="text-sm font-bold text-slate-800">Trip Details</h3>
            <DetailGrid record={data.report.trip} fields={TRIP_FIELDS} />
          </section>
          <section className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 space-y-3">
            <h3 className="text-sm font-bold text-slate-800">Filed Expense</h3>
            <DetailGrid record={data.report.expense} fields={EXPENSE_FIELDS} />
          </section>
          {data.report.ledger?.length > 0 && <section className="rounded-xl border border-slate-200 p-4 space-y-3">
            <h3 className="text-sm font-bold text-slate-800">Expense Ledger Lines</h3>
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-[10px] uppercase text-slate-400"><th className="py-2 pr-3">Ledger</th><th className="py-2 pr-3">Side</th><th className="py-2 pr-3 text-right">Debit</th><th className="py-2 pr-3 text-right">Credit</th><th className="py-2 pr-3">Paid To</th><th className="py-2">Date</th></tr></thead><tbody>
              {data.report.ledger.map((line: any) => <tr key={line.id} className="border-t border-slate-100"><td className="py-2 pr-3">{line.expensives || '—'}</td><td className="py-2 pr-3">{line.account_type || line.amount_type || '—'}</td><td className="py-2 pr-3 text-right">{line.amount ?? '—'}</td><td className="py-2 pr-3 text-right">{line.credit_amount ?? '—'}</td><td className="py-2 pr-3">{line.paid_to_name || '—'}</td><td className="py-2">{formatAuditDate(line.i_ts)}</td></tr>)}
            </tbody></table></div>
          </section>}
        </>}
        {isLoading && <p>Loading details…</p>}
        {isError && <p role="alert">Could not load details. <button className="text-blue-600 underline" onClick={() => refetch()}>Retry</button></p>}
        {!isLoading && !isError && !data && <p>No recorded details found for this reference.</p>}
        {!isError && data?.steps?.map((step: any, index: number) => <div key={index}>
          <h3 className="text-xs font-bold uppercase text-slate-500">{step.label}</h3>
          {step.state === 'done' ? <>
            <p className="text-sm font-semibold text-slate-800">{step.who || (step.userId ? `User #${step.userId}` : 'Name not recorded')}</p>
            <p className="text-sm text-slate-500">{formatAuditDate(step.when)}</p>
          </> : <p className="text-sm text-slate-500">{step.state === 'not_applicable' ? 'Not applicable — no separate step in this module' : step.state === 'pending' ? 'Not yet' : 'Not recorded'}</p>}
        </div>)}
      </div>
    </section>
  </div>
}
