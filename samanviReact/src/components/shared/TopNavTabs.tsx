import { cn } from '@/lib/utils'

interface TopNavTabsProps {
  tabs: string[]
  activeTab: string
  onChange: (tab: string) => void
  /** How many rows each tab holds, keyed by tab name — shown as a pill after
   *  the label. The tab names stay the keys, so a changing count never breaks
   *  which tab is active. */
  counts?: Record<string, number>
  className?: string
}

export const TopNavTabs = ({ tabs, activeTab, onChange, counts, className }: TopNavTabsProps) => (
  <div className={cn('flex bg-white/60 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/60 shadow-sm w-fit mb-6 flex-wrap gap-1', className)}>
    {tabs.map((tab) => (
      <button
        key={tab}
        onClick={() => onChange(tab)}
        className={cn(
          'px-5 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap inline-flex items-center gap-2',
          activeTab === tab
            ? 'bg-white shadow-sm text-[#2563EB]'
            : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
        )}
      >
        {tab}
        {counts?.[tab] !== undefined && (
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full font-black',
            activeTab === tab ? 'bg-blue-50 text-[#2563EB]' : 'bg-slate-100 text-slate-500',
          )}>
            {counts[tab]}
          </span>
        )}
      </button>
    ))}
  </div>
)
