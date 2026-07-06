import { useState } from 'react'

const LAYERS = [
  'Valores',
  'Cuadrícula',
  'Etiquetas',
  'Activación',
  'Pizarra',
  'Clasificación',
] as const

type Layer = (typeof LAYERS)[number]

const DEFAULT_LAYERS: Record<Layer, boolean> = {
  Valores: true,
  Cuadrícula: true,
  Etiquetas: false,
  Activación: false,
  Pizarra: false,
  Clasificación: false,
}

export default function LayersPanel() {
  const [layers, setLayers] = useState<Record<Layer, boolean>>(DEFAULT_LAYERS)

  function toggle(layer: Layer) {
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }))
  }

  return (
    <div className="px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Capas</p>

      <ul className="mt-3 space-y-1">
        {LAYERS.map((layer) => (
          <li key={layer}>
            <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60">
              <input
                type="checkbox"
                checked={layers[layer]}
                onChange={() => toggle(layer)}
                className="accent-primary"
              />
              <span>{layer}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}
