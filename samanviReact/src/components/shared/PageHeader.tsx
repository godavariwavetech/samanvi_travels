import type { ReactNode } from 'react'
import { Button } from './Button'
import { Download } from 'lucide-react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: {
    label: string
    icon?: ReactNode
    onClick: () => void
    variant?: 'primary' | 'secondary' | 'outline' | 'purple'
  }
}

export const PageHeader = ({ title, subtitle, action }: PageHeaderProps) => (
  <div className="flex flex-wrap justify-between items-start sm:items-end gap-3 mb-2">
    <div>
      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
        {title}
      </h1>
      {subtitle && <p className="text-slate-500 mt-1 font-medium text-sm">{subtitle}</p>}
    </div>
    {action && (
      <Button variant={action.variant ?? 'primary'} onClick={action.onClick} className="flex-shrink-0">
        {action.icon ?? <Download className="w-4 h-4" />}
        {action.label}
      </Button>
    )}
  </div>
)
