import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import api from '@/lib/api'
import { formatAuditDate } from '@/lib/auditDate'

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
      className="w-full max-w-lg rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
      <header className="flex items-center justify-between border-b p-5">
        <div><h2 className="font-bold text-blue-600">{reference}</h2><p className="text-xs text-slate-500">{data?.module} · Approval and authorization details · IST</p></div>
        <button type="button" autoFocus aria-label="Close details" onClick={onClose}><X className="h-5 w-5" /></button>
      </header>
      <div className="p-5 space-y-5">
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
