import { useState } from 'react'
import { motion } from 'motion/react'
import { GitBranch, Plus, Save } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Select, Label, DataTable, Badge, PageHeader } from '@/components/shared'
import type { Column } from '@/components/shared'
import { mainmastersService } from '@/services/mainmasters.service'

const EMPTY = { temple_name: '', district_id: '', district_name: '', mandal_id: '', mandal_name: '', child: '', subchildtwo: '' }

const cols: Column[] = [
  { label: '#', key: 'i', render: (v) => <span className="text-slate-400 text-xs font-medium">{String(v)}</span> },
  { label: 'Area / District', key: 'staticname', render: (v) => <Badge variant="info">{String(v ?? '—')}</Badge> },
  { label: 'Mandal', key: 'mandal_name', render: (v) => <span className="font-medium">{String(v ?? '—')}</span> },
  { label: 'Child Group', key: 'child', render: (v) => <span className="text-slate-600">{String(v ?? '—')}</span> },
  { label: 'Sub Child', key: 'subchildtwo', render: (v) => <span className="text-slate-600">{String(v ?? '—')}</span> },
  { label: 'Entry Name', key: 'temple_name', render: (v) => <span className="font-semibold text-slate-800">{String(v ?? '—')}</span> },
]

export default function SubChildTwoPage() {
  const qc = useQueryClient()
  const [form, setForm] = useState(EMPTY)
  const [mandals, setMandals] = useState<any[]>([])
  const [children, setChildren] = useState<any[]>([])
  const [subChildren, setSubChildren] = useState<any[]>([])

  const { data: districtData } = useQuery({ queryKey: ['districts'], queryFn: () => mainmastersService.getDistricts() })
  const { data: mandalData } = useQuery({ queryKey: ['mandals-all'], queryFn: () => mainmastersService.getMandals() })
  const { data, isLoading } = useQuery({ queryKey: ['sub-child-two'], queryFn: () => mainmastersService.getSubChildTwoData() })

  const allMandals: any[] = mandalData?.data ?? []
  const districtList: any[] = districtData?.data ?? []
  const list: any[] = (data?.data ?? []).map((r: any, i: number) => ({ ...r, i: i + 1 }))

  const onDistrictChange = (id: string) => {
    const d = districtList.find((x) => String(x.id) === id)
    setForm((f) => ({ ...f, district_id: id, district_name: d?.districtnm ?? '', mandal_id: '', mandal_name: '', child: '', subchildtwo: '' }))
    setMandals(allMandals.filter((m: any) => String(m.district_id) === id))
    setChildren([])
    setSubChildren([])
  }

  const onMandalChange = async (id: string) => {
    const m = mandals.find((x) => String(x.id) === id)
    setForm((f) => ({ ...f, mandal_id: id, mandal_name: m?.mandal_name ?? '', child: '', subchildtwo: '' }))
    setSubChildren([])
    try {
      const res = await mainmastersService.getChildData({ mandal_id: id, mandal_name: m?.mandal_name })
      setChildren(res.data ?? [])
    } catch { setChildren([]) }
  }

  const onChildChange = async (id: string) => {
    const c = children.find((x) => String(x.id) === id)
    setForm((f) => ({ ...f, child: c?.village_name ?? id, subchildtwo: '' }))
    try {
      const res = await mainmastersService.getSubChildData({ id, village_name: c?.village_name })
      setSubChildren(res.data ?? [])
    } catch { setSubChildren([]) }
  }

  const { mutate: submit, isPending } = useMutation({
    mutationFn: () => mainmastersService.submitSubChildTwo({ ...form, entry_by: localStorage.getItem('user_id') }),
    onSuccess: (res) => {
      if (res.status === 200) { toast.success('Entry added!'); setForm(EMPTY); setMandals([]); setChildren([]); setSubChildren([]); qc.invalidateQueries({ queryKey: ['sub-child-two'] }) }
      else toast.error(res.message ?? 'Failed')
    },
    onError: () => toast.error('Server error'),
  })

  const { mutate: del } = useMutation({
    mutationFn: (id: number) => mainmastersService.deleteSubChildTwo({ id }),
    onSuccess: (res) => {
      if (res.status === 200) { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['sub-child-two'] }) }
      else toast.error(res.message ?? 'Failed')
    },
    onError: () => toast.error('Server error'),
  })

  const handleAction = (action: string, row: any) => { if (action === 'delete') del(row.id) }

  const canSubmit = form.temple_name && form.district_id && form.mandal_id && form.child && form.subchildtwo

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Sub Child Two" subtitle="Add hierarchical location-based entries (District → Mandal → Child → Sub Child → Name)" />

      <GlassCard className="p-6" colorBar="bg-gradient-to-r from-violet-400 to-indigo-500">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-5">
          <Plus className="w-4 h-4 text-violet-500" /> Add Entry
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>District / Area *</Label>
            <Select value={form.district_id} onChange={(e) => onDistrictChange(e.target.value)}>
              <option value="">Select District</option>
              {districtList.map((d: any) => <option key={d.id} value={d.id}>{d.districtnm}</option>)}
            </Select>
          </div>

          <div>
            <Label>Mandal *</Label>
            <Select value={form.mandal_id} onChange={(e) => onMandalChange(e.target.value)} disabled={!form.district_id}>
              <option value="">Select Mandal</option>
              {mandals.map((m: any) => <option key={m.id} value={m.id}>{m.mandal_name}</option>)}
            </Select>
          </div>

          <div>
            <Label>Child Group *</Label>
            <Select value={form.child} onChange={(e) => onChildChange(e.target.value)} disabled={!form.mandal_id}>
              <option value="">Select Child Group</option>
              {children.map((c: any) => <option key={c.id} value={c.id}>{c.village_name}</option>)}
            </Select>
          </div>

          <div>
            <Label>Sub Child *</Label>
            <Select value={form.subchildtwo} onChange={(e) => setForm({ ...form, subchildtwo: e.target.value })} disabled={!form.child}>
              <option value="">Select Sub Child</option>
              {subChildren.map((s: any) => <option key={s.id} value={s.subchildtwo ?? s.name}>{s.subchildtwo ?? s.name}</option>)}
            </Select>
          </div>

          <div>
            <Label>Entry Name *</Label>
            <Input placeholder="e.g. Sri Venkateswara Temple" value={form.temple_name} onChange={(e) => setForm({ ...form, temple_name: e.target.value })} />
          </div>

          <div className="flex items-end">
            <Button className="w-full" onClick={() => submit()} disabled={isPending || !canSubmit}>
              <Save className="w-4 h-4" /> {isPending ? 'Saving…' : 'Save Entry'}
            </Button>
          </div>
        </div>
      </GlassCard>

      <DataTable
        title="Sub Child Two Entries"
        columns={cols}
        data={list}
        loading={isLoading}
        onAction={handleAction}
        actions={['delete']}
        icon={<GitBranch className="w-5 h-5 text-violet-500" />}
      />
    </motion.div>
  )
}
