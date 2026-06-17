import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface GlassCardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  colorBar?: string
}

export const GlassCard = ({ children, className, onClick, colorBar }: GlassCardProps) => (
  <div
    onClick={onClick}
    className={cn(
      'bg-white/90 backdrop-blur-xl rounded-[24px] border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-all duration-300 relative',
      onClick && 'cursor-pointer hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-0.5 hover:bg-white',
      className
    )}
  >
    {colorBar && (
      <div className={`absolute top-0 left-0 w-full h-1 ${colorBar}`} />
    )}
    {children}
  </div>
)
