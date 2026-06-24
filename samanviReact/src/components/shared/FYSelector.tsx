import { getCurrentFY, getFYList } from '@/lib/fy'
import { useFYStore } from '@/store/fy.store'

export function FYSelector({ className = '' }: { className?: string }) {
  const { selectedFY, setFY } = useFYStore()
  const currentFY = getCurrentFY()
  const fyList = getFYList(4)

  return (
    <div className={`flex items-center gap-3 flex-wrap ${className}`}>
      <span className="text-sm font-semibold text-slate-600 flex-shrink-0">Financial Year</span>
      <div className="flex flex-wrap gap-2">
        {fyList.map(fy => {
          const isSel = fy.startYear === selectedFY.startYear
          const isCurrent = fy.startYear === currentFY.startYear
          return (
            <button
              key={fy.startYear}
              type="button"
              onClick={() => setFY(fy)}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                isSel
                  ? isCurrent
                    ? 'bg-emerald-500 text-white border-emerald-500'
                    : 'bg-orange-400 text-white border-orange-400'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-700'
              }`}
            >
              {fy.shortLabel}
              {isCurrent && <span className="ml-1 opacity-75 text-[9px]">Current</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
