import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)

export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return '—'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '—'
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}`
}

// The page body never scrolls — AppLayout's inner content pane (#app-scroll-container)
// is the actual scrollable element, so `window.scrollTo` is a no-op there. Use this
// after opening an edit form to bring it into view instead.
export const scrollContentToTop = () => {
  document.getElementById('app-scroll-container')?.scrollTo({ top: 0, behavior: 'smooth' })
}
