import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import type { TrainingDimension } from '@/types/trainingFiles'

interface DimensionPanelProps {
  dimensions: TrainingDimension[]
  onSelectionChange?: (index: number) => void
}

const ACTIVATION_VALUE = '__activation__'

export default function DimensionPanel({ dimensions, onSelectionChange }: DimensionPanelProps) {
  const options = [...dimensions.map((d) => d.nombre), ACTIVATION_VALUE]
  const labelOf = (v: string) => (v === ACTIVATION_VALUE ? 'Activación de la Red' : v)

  const [selected, setSelected] = useState(dimensions[0]?.nombre ?? ACTIVATION_VALUE)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const triggerRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Reset selection when dimensions load
  useEffect(() => {
    if (dimensions.length > 0) {
      setSelected(dimensions[0].nombre)
      onSelectionChange?.(0)
    }
  }, [dimensions]) // eslint-disable-line react-hooks/exhaustive-deps

  function openDropdown() {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 50,
      })
    }
    setOpen(true)
    setQuery('')
  }

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const filtered = options.filter((v) =>
    labelOf(v).toLowerCase().includes(query.toLowerCase()),
  )

  function select(value: string) {
    setSelected(value)
    setOpen(false)
    setQuery('')
    const index = value === ACTIVATION_VALUE ? -1 : dimensions.findIndex((d) => d.nombre === value)
    onSelectionChange?.(index)
  }

  return (
    <div className="border-b px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Dimensión
      </p>

      <div ref={containerRef} className="relative mt-3">
        <div
          ref={triggerRef}
          onClick={() => (open ? setOpen(false) : openDropdown())}
          className="flex cursor-pointer items-center gap-1 rounded-md border bg-background px-3 py-2 text-sm"
        >
          <span className="flex-1 truncate">
            {selected ? labelOf(selected) : 'Seleccionar...'}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </div>

        {open && (
          <div style={dropdownStyle} className="overflow-hidden rounded-md border bg-background shadow-lg">
            <div className="border-b px-2 py-2">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar dimensión..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <ul className="max-h-52 overflow-y-auto py-1">
              {filtered.length === 0 && (
                <li className="px-3 py-2 text-xs text-muted-foreground">Sin resultados</li>
              )}
              {filtered.map((v) => {
                const isSpecial = v === ACTIVATION_VALUE
                return (
                  <li key={v}>
                    {isSpecial && filtered.some((x) => x !== ACTIVATION_VALUE) && (
                      <div className="mx-2 my-1 border-t" />
                    )}
                    <button
                      type="button"
                      onClick={() => select(v)}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted/60"
                    >
                      <Check
                        className={`h-3.5 w-3.5 shrink-0 ${selected === v ? 'text-primary' : 'invisible'}`}
                      />
                      <span className={`truncate ${isSpecial ? 'text-muted-foreground' : ''}`}>
                        {labelOf(v)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
