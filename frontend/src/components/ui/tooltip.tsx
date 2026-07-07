import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface TooltipProps {
  content: string
  children: React.ReactNode
  delayMs?: number
  className?: string
}

export function Tooltip({ content, children, delayMs = 400, className }: TooltipProps) {
  const [coords, setCoords] = useState<{ x: number; y: number; above: boolean } | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const triggerRef = useRef<HTMLSpanElement>(null)

  function handleMouseEnter() {
    timerRef.current = setTimeout(() => {
      if (!triggerRef.current) return
      const rect = triggerRef.current.getBoundingClientRect()
      const above = rect.top > 60
      setCoords({ x: rect.left, y: above ? rect.top - 4 : rect.bottom + 4, above })
    }, delayMs)
  }

  function handleMouseLeave() {
    if (timerRef.current) clearTimeout(timerRef.current)
    setCoords(null)
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={className}
      >
        {children}
      </span>
      {coords !== null &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[9999] max-w-[320px] rounded border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md"
            style={{
              left: coords.x,
              top: coords.y,
              transform: coords.above ? 'translateY(-100%)' : 'none',
            }}
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  )
}