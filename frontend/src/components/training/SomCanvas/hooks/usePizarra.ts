import { useState, useRef, useCallback } from 'react'

export type PizarraTool = 'pen' | 'eraser'

export interface PizarraPoint { x: number; y: number }

export interface PizarraStroke {
  points: PizarraPoint[]
  color: string
  width: number
  tool: PizarraTool
}

export interface PizarraLayer {
  id: string
  name: string
  visible: boolean
  strokes: PizarraStroke[]
}

export const PIZARRA_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#a855f7', '#ffffff', '#1e293b',
]

export const PIZARRA_WIDTHS = [2, 5, 12] as const

let _pid = 0
const uid = () => `pz${++_pid}`

export function usePizarra() {
  const firstLayer = useRef<PizarraLayer>({ id: uid(), name: 'Capa 1', visible: true, strokes: [] })
  const [layers, setLayers] = useState<PizarraLayer[]>([firstLayer.current])
  const [activeId, setActiveId] = useState<string>(firstLayer.current.id)
  const [tool, setTool] = useState<PizarraTool>('pen')
  const [color, setColor] = useState(PIZARRA_COLORS[4])
  const [width, setWidth] = useState<number>(PIZARRA_WIDTHS[0])

  // Always-current refs so stable drawing callbacks never go stale
  const layersRef = useRef(layers)
  layersRef.current = layers
  const activeIdRef = useRef(activeId)
  activeIdRef.current = activeId
  const toolRef = useRef(tool)
  toolRef.current = tool
  const colorRef = useRef(color)
  colorRef.current = color
  const widthRef = useRef(width)
  widthRef.current = width

  // In-progress stroke accumulator (ref = no re-render during drawing)
  const currentPoints = useRef<PizarraPoint[]>([])
  const isDrawingRef = useRef(false)

  // ── Layer management ───────────────────────────────────────────────────────
  function addLayer() {
    const n = layersRef.current.length + 1
    const next: PizarraLayer = { id: uid(), name: `Capa ${n}`, visible: true, strokes: [] }
    setLayers(prev => [...prev, next])
    setActiveId(next.id)
  }

  function removeLayer(id: string) {
    const ls = layersRef.current
    if (ls.length <= 1) return
    const next = ls.filter(l => l.id !== id)
    setLayers(next)
    if (activeIdRef.current === id) setActiveId(next[next.length - 1].id)
  }

  function toggleLayerVisible(id: string) {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l))
  }

  function clearLayer(id?: string) {
    const target = id ?? activeIdRef.current
    setLayers(prev => prev.map(l => l.id === target ? { ...l, strokes: [] } : l))
  }

  function undo(id?: string) {
    const target = id ?? activeIdRef.current
    setLayers(prev => prev.map(l =>
      l.id === target && l.strokes.length > 0
        ? { ...l, strokes: l.strokes.slice(0, -1) }
        : l
    ))
  }

  // ── Drawing handlers (world coordinates) ──────────────────────────────────
  const onDrawStart = useCallback((wx: number, wy: number) => {
    currentPoints.current = [{ x: wx, y: wy }]
    isDrawingRef.current = true
  }, [])

  const onDrawMove = useCallback((wx: number, wy: number): PizarraPoint[] => {
    currentPoints.current.push({ x: wx, y: wy })
    return currentPoints.current
  }, [])

  const onDrawEnd = useCallback(() => {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    const points = currentPoints.current
    currentPoints.current = []
    if (points.length === 0) return
    const stroke: PizarraStroke = {
      points,
      color: colorRef.current,
      width: widthRef.current,
      tool: toolRef.current,
    }
    const id = activeIdRef.current
    setLayers(prev => prev.map(l => l.id === id ? { ...l, strokes: [...l.strokes, stroke] } : l))
  }, [])

  const cancelDraw = useCallback(() => {
    isDrawingRef.current = false
    currentPoints.current = []
  }, [])

  return {
    layers, activeId, setActiveId,
    tool, setTool,
    color, setColor,
    width, setWidth,
    addLayer, removeLayer, toggleLayerVisible, clearLayer, undo,
    onDrawStart, onDrawMove, onDrawEnd, cancelDraw,
    isDrawingRef,
  }
}