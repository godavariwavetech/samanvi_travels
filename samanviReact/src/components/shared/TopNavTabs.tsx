import { cn } from '@/lib/utils'

interface TopNavTabsProps {
  tabs: string[]
  activeTab: string
  onChange: (tab: string) => void
}

export const TopNavTabs = ({ tabs, activeTab, onChange }: TopNavTabsProps) => (
  <div className="flex bg-white/60 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/60 shadow-sm w-fit mb-6 flex-wrap gap-1">
    {tabs.map((tab) => (
      <button
        key={tab}
        onClick={() => onChange(tab)}
        className={cn(
          'px-5 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap',
          activeTab === tab
            ? 'bg-white shadow-sm text-[#2563EB]'
            : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
        )}
      >
        {tab}
      </button>
    ))}
  </div>
)
