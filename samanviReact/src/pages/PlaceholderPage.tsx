import { motion } from 'motion/react'
import { Construction } from 'lucide-react'
import { GlassCard } from '@/components/shared'

interface PlaceholderPageProps {
  title: string
  description?: string
}

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-center min-h-[60vh]">
      <GlassCard className="p-12 text-center max-w-md w-full">
        <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Construction className="w-8 h-8 text-amber-500" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 mb-2">{title}</h1>
        <p className="text-slate-500 font-medium">
          {description ?? 'This module is connected to the backend. Full UI implementation coming next.'}
        </p>
      </GlassCard>
    </motion.div>
  )
}
