import { useEffect, useState } from 'react'
import { toast } from 'sonner'

// The "Reason for Edit" field that closes every edit form: the record opens for
// editing straight away, the user changes the fields, and types why at the end,
// just above the form's Save button. Saving is blocked until a reason is typed.
//
//   const editReason = useEditReason(!!editingRow)
//   ...form fields...
//   {editReason.field}
//   <Button disabled={... || !editReason.ok} onClick={() => { if (!editReason.check()) return; save() }}>
//
// `active` is whether the form is editing an existing record; on a new record the
// field is not shown and `ok` is always true. The reason is cleared each time the
// form leaves edit mode, so the next edit starts empty.

export function EditReasonField({ value, onChange, className = '' }: { value: string; onChange: (v: string) => void; className?: string }) {
  const empty = !value.trim()
  return (
    <div className={className}>
      <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">
        Reason for Edit <span className="text-red-500">*</span>
      </label>
      <textarea
        rows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Why is this record being changed?"
        data-edit-reason=""
        className={`w-full rounded-xl border px-3 py-2.5 text-sm bg-white resize-none focus:outline-none focus:ring-2 placeholder:text-slate-400 ${empty ? 'border-red-300 focus:ring-red-400/30' : 'border-slate-200 focus:ring-blue-400/40'}`}
      />
      {empty && <p className="text-xs text-red-500 mt-1">Required before saving</p>}
    </div>
  )
}

export function useEditReason(active: boolean, opts: { className?: string } = {}) {
  const [reason, setReason] = useState('')
  useEffect(() => { if (!active) setReason('') }, [active])
  const ok = !active || reason.trim() !== ''
  return {
    reason: reason.trim(),
    ok,
    /** Call at the top of the save handler; shows a message and returns false when the reason is missing. */
    check: () => {
      if (ok) return true
      toast.error('Enter the reason for edit before saving')
      document.querySelector<HTMLTextAreaElement>('textarea[data-edit-reason]')?.focus()
      return false
    },
    reset: () => setReason(''),
    field: active ? <EditReasonField value={reason} onChange={setReason} className={opts.className} /> : null,
  }
}
