import { useEffect, useRef, useState } from 'react'

// Mirrors a horizontal scrollbar ABOVE a wide table so it is reachable without
// first scrolling down past the table's max height to reach the one at the
// bottom. The two bars are kept in step both ways, and the top one collapses to
// nothing when the table fits, so narrow tables don't carry an empty strip.
//
// `tableClassName` is the scroll container's own classes (typically
// "overflow-auto max-h-[70vh]"), so a page keeps the exact box it had.
export function DualScrollTable({ children, tableClassName, className }: {
  children: React.ReactNode
  tableClassName: string
  className?: string
}) {
  const topRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [scrollWidth, setScrollWidth] = useState(0)
  const [needsBar, setNeedsBar] = useState(false)
  const syncing = useRef<'top' | 'bottom' | null>(null)

  useEffect(() => {
    const el = bottomRef.current
    if (!el) return
    const update = () => {
      setScrollWidth(el.scrollWidth)
      setNeedsBar(el.scrollWidth > el.clientWidth + 1)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    // The container's box doesn't change when rows or columns are added — the
    // table inside it does — so watch that too.
    if (el.firstElementChild) ro.observe(el.firstElementChild)
    return () => ro.disconnect()
  }, [children])

  return (
    <div className={className}>
      <div
        ref={topRef}
        className="overflow-x-auto overflow-y-hidden scrollbar-thin"
        style={{ height: needsBar ? 14 : 0 }}
        onScroll={() => {
          if (syncing.current === 'bottom') { syncing.current = null; return }
          if (!topRef.current || !bottomRef.current) return
          syncing.current = 'top'
          bottomRef.current.scrollLeft = topRef.current.scrollLeft
        }}
      >
        <div style={{ width: scrollWidth, height: 1 }} />
      </div>
      <div
        ref={bottomRef}
        className={tableClassName}
        onScroll={() => {
          if (syncing.current === 'top') { syncing.current = null; return }
          if (!topRef.current || !bottomRef.current) return
          syncing.current = 'bottom'
          topRef.current.scrollLeft = bottomRef.current.scrollLeft
        }}
      >
        {children}
      </div>
    </div>
  )
}
