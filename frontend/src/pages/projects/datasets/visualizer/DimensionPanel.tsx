import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

interface DimensionPanelProps {
  dimensions: string[]
}

export default function DimensionPanel({ dimensions }: DimensionPanelProps) {
  const ALL_OPTIONS = [...dimensions, '__activation__']
  const labelOf = (v: string) => (v === '__activation__' ? 'Activación de la Red' : v)

  const [selected, setSelected] = useState(dimensions[0] ?? '__activation__')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const triggerRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // position the fixed dropdown below the trigger
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

  // close on click outside
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

  const filtered = ALL_OPTIONS.filter((v) =>
    labelOf(v).toLowerCase().includes(query.toLowerCase()),
  )

  function select(value: string) {
    setSelected(value)
    setOpen(false)
    setQuery('')
  }

  return (
    <div className="border-b px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Dimensión
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">Visualizar por</p>

      <div ref={containerRef} className="relative mt-3">
        {/* Trigger */}
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

        {/* Dropdown rendered at fixed position to escape overflow-y-auto */}
        {open && (
          <div style={dropdownStyle} className="overflow-hidden rounded-md border bg-background shadow-lg">
            {/* Search */}
            <div className="border-b px-2 py-2">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar dimensión..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>

            {/* Options */}
            <ul className="max-h-52 overflow-y-auto py-1">
              {filtered.length === 0 && (
                <li className="px-3 py-2 text-xs text-muted-foreground">Sin resultados</li>
              )}
              {filtered.map((v) => {
                const isSpecial = v === '__activation__'
                return (
                  <li key={v}>
                    {isSpecial && filtered.some((x) => x !== '__activation__') && (
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
