import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'

// A create / edit form shown as a popup over the page instead of pushing the
// list down. Portaled to <body> so no transformed or blurred ancestor traps the
// fixed overlay. A click on the backdrop does not close it - a half-filled form
// is only dropped through the form's own Cancel / X.
export function FormModal({ children, size = 'xl' }: { children: ReactNode; size?: 'lg' | 'xl' | '2xl' }) {
  const width = size === '2xl' ? 'max-w-7xl' : size === 'lg' ? 'max-w-3xl' : 'max-w-5xl'

  // The page behind stays still while the form scrolls.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm"
    >
      <div className="min-h-full flex items-start sm:items-center justify-center p-4 sm:p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.15 }}
          // Solid white under the form's glass card, which would otherwise show the dark backdrop through.
          className={`w-full ${width} bg-white rounded-[24px] shadow-2xl`}
        >
          {children}
        </motion.div>
      </div>
    </motion.div>,
    document.body,
  )
}
