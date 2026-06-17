import React from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'purple' | 'teal'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'sm' | 'md' | 'lg'
}

const variants: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white hover:shadow-lg hover:shadow-blue-500/25 border border-blue-600/50',
  secondary: 'bg-slate-100/80 text-slate-900 hover:bg-slate-200 border border-slate-200',
  outline: 'border border-slate-200 bg-white/50 hover:bg-slate-50 text-slate-700',
  ghost: 'bg-transparent hover:bg-slate-100 text-slate-700',
  danger:
    'bg-gradient-to-r from-[#EF4444] to-[#DC2626] text-white hover:shadow-lg hover:shadow-red-500/25 border border-red-600/50',
  success:
    'bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white hover:shadow-lg hover:shadow-green-500/25 border border-green-600/50',
  purple:
    'bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white hover:shadow-lg hover:shadow-purple-500/25 border border-purple-600/50',
  teal:
    'bg-gradient-to-r from-[#14B8A6] to-[#0D9488] text-white hover:shadow-lg hover:shadow-teal-500/25 border border-teal-600/50',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs h-8',
  md: 'px-4 py-2.5 text-sm h-11',
  lg: 'px-6 py-3 text-base h-12',
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'primary', size = 'md', className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] gap-2',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
)
Button.displayName = 'Button'
