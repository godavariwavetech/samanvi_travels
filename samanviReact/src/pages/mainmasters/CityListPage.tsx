import { useState } from 'react'
import { motion } from 'motion/react'
import { MapPin, Plus, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Label, PageHeader, ExportMenu } from '@/components/shared'
import { exportRows } from '@/lib/tableExport'
import { mastersService } from '@/services/masters.service'

export default function CityListPage() {
  const qc = useQueryClient()
  const [newCity, setNewCity] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['city-list'],
    queryFn: () => mastersService.getCityList(),
  })

  const cities: any[] = data?.data ?? []

  const isDuplicate = (value: string) =>
    cities.some((c: any) => String(c.city_name ?? '').trim().toLowerCase() === value.trim().toLowerCase())
  const handleAdd = () => {
    const trimmed = newCity.trim()
    if (!trimmed) return
    if (isDuplicate(trimmed)) { toast.error(`City "${trimmed}" already exists`); return }
    add()
  }

  const { mutate: add, isPending: adding } = useMutation({
    mutationFn: () => mastersService.addCityList({ city_name: newCity.trim() }),
    onSuccess: (res) => {
      if (res.status === 200) {
        toast.success('City added!')
        setNewCity('')
        qc.invalidateQueries({ queryKey: ['city-list'] })
      } else toast.error(res.message ?? 'Failed')
    },
    onError: () => toast.error('Server error'),
  })

  const { mutate: del } = useMutation({
    mutationFn: (id: number) => mastersService.deleteCityList({ id }),
    onSuccess: () => {
      toast.success('City removed')
      qc.invalidateQueries({ queryKey: ['city-list'] })
    },
    onError: () => toast.error('Server error'),
  })

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <PageHeader title="City List Master" subtitle="Manage cities used across service routes" />

      <GlassCard className="p-6" colorBar="bg-gradient-to-r from-blue-500 to-cyan-500">
        <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-4">
          <MapPin className="w-4 h-4 text-blue-500" /> Add City
        </h3>
        <div className="flex items-end gap-3">
          <div className="flex-1 max-w-sm">
            <Label>City Name <span className="text-red-500">*</span></Label>
            <Input
              placeholder="e.g. Hyderabad, Vijayawada…"
              value={newCity}
              onChange={(e) => setNewCity(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <Button onClick={handleAdd} disabled={adding || !newCity.trim()}>
            <Plus className="w-4 h-4" /> Add City
          </Button>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="font-bold text-slate-700">
            Current Cities ({cities.length})
          </h3>
          <ExportMenu
            disabled={cities.length === 0}
            onExport={(format) => exportRows({ title: 'Cities', headers: ['Sl No', 'City Name'], rows: cities.map((c, i) => [i + 1, c.city_name ?? '']), format })}
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : cities.length === 0 ? (
          <p className="text-sm text-slate-400">No cities yet. Add one above.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {cities.map((c) => (
              <div key={c.id}
                className="flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 group hover:border-blue-200 hover:bg-blue-50 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span className="text-sm font-semibold text-slate-700 truncate">{c.city_name}</span>
                </div>
                <button
                  onClick={() => del(c.id)}
                  className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                  title="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </motion.div>
  )
}
