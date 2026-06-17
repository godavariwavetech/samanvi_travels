import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'teal' | 'slate'

const variants: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-800 border-slate-200',
  success: 'bg-[#22C55E]/10 text-[#16a34a] border-[#22C55E]/20',
  warning: 'bg-[#F59E0B]/10 text-[#d97706] border-[#F59E0B]/20',
  danger: 'bg-[#EF4444]/10 text-[#dc2626] border-[#EF4444]/20',
  info: 'bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/20',
  purple: 'bg-[#7C3AED]/10 text-[#7C3AED] border-[#7C3AED]/20',
  teal: 'bg-[#14B8A6]/10 text-[#0D9488] border-[#14B8A6]/20',
  slate: 'bg-slate-200/50 text-slate-700 border-slate-300/50',
}

export const Badge = ({
  children,
  variant = 'default',
  className,
}: {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
}) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold transition-colors border',
      variants[variant],
      className
    )}
  >
    {children}
  </span>
)
