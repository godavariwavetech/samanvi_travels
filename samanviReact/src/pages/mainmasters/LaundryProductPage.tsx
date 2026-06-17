import { useState } from 'react'
import { motion } from 'motion/react'
import { Shirt, Plus, Save, X } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Label, DataTable, Badge, PageHeader } from '@/components/shared'
import type { Column } from '@/components/shared'
import { mainmastersService } from '@/services/mainmasters.service'

export default function LaundryProductPage() {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['laundry-products'],
    queryFn: () => mainmastersService.getLaundryProducts(),
  })

  const list: any[] = (data?.data ?? []).map((r: any, i: number) => ({ ...r, i: i + 1 }))

  const { mutate: add, isPending: adding } = useMutation({
    mutationFn: () => mainmastersService.addLaundryProduct({ vouchertype: name }),
    onSuccess: (res) => {
      if (res.status === 200) { toast.success('Product added!'); setName(''); qc.invalidateQueries({ queryKey: ['laundry-products'] }) }
      else toast.error(res.message ?? 'Failed')
    },
    onError: () => toast.error('Server error'),
  })

  const { mutate: update, isPending: updating } = useMutation({
    mutationFn: () => mainmastersService.editLaundryProduct({ vouchertype: editing!.name, id: editing!.id }),
    onSuccess: (res) => {
      if (res.status === 200) { toast.success('Updated!'); setEditing(null); qc.invalidateQueries({ queryKey: ['laundry-products'] }) }
      else toast.error(res.message ?? 'Failed')
    },
    onError: () => toast.error('Server error'),
  })

  const { mutate: del } = useMutation({
    mutationFn: (id: number) => mainmastersService.deleteLaundryProduct({ id }),
    onSuccess: (res) => {
      if (res.status === 200) { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['laundry-products'] }) }
      else toast.error(res.message ?? 'Failed')
    },
    onError: () => toast.error('Server error'),
  })

  const handleAction = (action: string, row: any) => {
    if (action === 'edit') setEditing({ id: row.id, name: row.product_name ?? row.vouchertype })
    if (action === 'delete') del(row.id)
  }

  const cols: Column[] = [
    { label: '#', key: 'i', render: (v) => <span className="text-slate-400 text-xs font-medium">{String(v)}</span> },
    {
      label: 'Product Name',
      key: 'product_name',
      render: (v, row: any) =>
        editing?.id === row.id ? (
          <div className="flex items-center gap-2">
            <Input value={editing!.name} onChange={(e) => setEditing({ ...editing!, name: e.target.value })} className="h-8 text-sm" />
            <button onClick={() => update()} disabled={updating} className="text-emerald-600 hover:text-emerald-700"><Save className="w-4 h-4" /></button>
            <button onClick={() => setEditing(null)} className="text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button>
          </div>
        ) : (
          <Badge variant="teal">{String(v ?? row.vouchertype ?? '—')}</Badge>
        ),
    },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Laundry Products" subtitle="Manage laundry product types used in bill entries" />

      <GlassCard className="p-6" colorBar="bg-gradient-to-r from-sky-400 to-blue-500">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-4">
          <Plus className="w-4 h-4 text-sky-500" /> Add Product
        </h2>
        <div className="flex items-end gap-4">
          <div className="flex-1 max-w-sm">
            <Label>Product Name *</Label>
            <Input
              placeholder="e.g. Blankets, Bed Covers, Curtains…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && name.trim() && add()}
            />
          </div>
          <Button onClick={() => add()} disabled={adding || !name.trim()} variant="primary">
            <Save className="w-4 h-4" /> {adding ? 'Saving…' : 'Save Product'}
          </Button>
        </div>
      </GlassCard>

      <DataTable
        title="Laundry Products"
        columns={cols}
        data={list}
        loading={isLoading}
        onAction={handleAction}
        actions={['edit', 'delete']}
        icon={<Shirt className="w-5 h-5 text-sky-500" />}
      />
    </motion.div>
  )
}
