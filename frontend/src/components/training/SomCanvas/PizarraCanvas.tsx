import { useEffect, useRef } from 'react'
import type { PizarraLayer, PizarraPoint, PizarraTool } from './hooks/usePizarra'

interface PizarraCanvasProps {
  pizarraActiva: boolean
  layers: PizarraLayer[]
  tool: PizarraTool
  color: string
  width: number
  canvasSize: { width: number; height: number }
  zoom: number
  panX: number
  panY: number
  canvasToWorld: (cx: number, cy: number) => { x: number; y: number }
  onDrawStart: (wx: number, wy: number) => void
  onDrawMove: (wx: number, wy: number) => PizarraPoint[]
  onDrawEnd: () => void
  cancelDraw: () => void
}

function drawStroke(
  ctx: CanvasRenderingContext2D,
  points: PizarraPoint[],
  color: string,
  width: number,
  tool: PizarraTool,
  zoom: number,
  isPreview = false,
) {
  if (points.length === 0) return
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = width / zoom

  if (tool === 'eraser' && !isPreview) {
    ctx.globalCompositeOperation = 'destination-out'
    ctx.strokeStyle = 'rgba(0,0,0,1)'
    ctx.fillStyle = 'rgba(0,0,0,1)'
  } else if (tool === 'eraser' && isPreview) {
    // Show a visible semi-transparent stroke so user can see the erase path
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = 'rgba(200,200,200,0.6)'
    ctx.fillStyle = 'rgba(200,200,200,0.6)'
  } else {
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = color
    ctx.fillStyle = color
  }

  if (points.length === 1) {
    ctx.beginPath()
    ctx.arc(points[0].x, points[0].y, (width / zoom) / 2, 0, Math.PI * 2)
    ctx.fill()
  } else {
    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    if (points.length === 2) {
      ctx.lineTo(points[1].x, points[1].y)
    } else {
      for (let i = 1; i < points.length - 1; i++) {
        const mx = (points[i].x + points[i + 1].x) / 2
        const my = (points[i].y + points[i + 1].y) / 2
        ctx.quadraticCurveTo(points[i].x, points[i].y, mx, my)
      }
      const last = points.length - 1
      ctx.lineTo(points[last].x, points[last].y)
    }
    ctx.stroke()
  }
  ctx.restore()
}

function applyCamera(ctx: CanvasRenderingContext2D, zoom: number, panX: number, panY: number, dpr: number) {
  ctx.setTransform(zoom * dpr, 0, 0, zoom * dpr, panX * dpr, panY * dpr)
}

function clearCanvas(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.restore()
}

function resizeCanvas(canvas: HTMLCanvasElement, w: number, h: number, dpr: number) {
  const pw = Math.round(w * dpr)
  const ph = Math.round(h * dpr)
  if (canvas.width !== pw || canvas.height !== ph) {
    canvas.width = pw
    canvas.height = ph
  }
}

export default function PizarraCanvas({
  pizarraActiva,
  layers,
  tool, color, width,
  canvasSize,
  zoom, panX, panY,
  canvasToWorld,
  onDrawStart, onDrawMove, onDrawEnd, cancelDraw,
}: PizarraCanvasProps) {
  // One canvas element per layer, keyed by layer id
  const layerCanvasMap = useRef<Map<string, HTMLCanvasElement>>(new Map())
  const previewRef = useRef<HTMLCanvasElement>(null)

  // Always-current refs for stable pointer-event closures
  const stateRef = useRef({ zoom, panX, panY, tool, color, width, pizarraActiva, canvasToWorld })
  stateRef.current = { zoom, panX, panY, tool, color, width, pizarraActiva, canvasToWorld }

  const onDrawStartRef = useRef(onDrawStart)
  onDrawStartRef.current = onDrawStart
  const onDrawMoveRef = useRef(onDrawMove)
  onDrawMoveRef.current = onDrawMove
  const onDrawEndRef = useRef(onDrawEnd)
  onDrawEndRef.current = onDrawEnd
  const cancelDrawRef = useRef(cancelDraw)
  cancelDrawRef.current = cancelDraw

  // ── Redraw all layer canvases when strokes or camera changes ───────────────
  useEffect(() => {
    if (canvasSize.width === 0 || canvasSize.height === 0) return
    const dpr = window.devicePixelRatio || 1

    for (const layer of layers) {
      const canvas = layerCanvasMap.current.get(layer.id)
      if (!canvas) continue
      resizeCanvas(canvas, canvasSize.width, canvasSize.height, dpr)
      const ctx = canvas.getContext('2d')
      if (!ctx) continue
      clearCanvas(ctx, canvas)
      applyCamera(ctx, zoom, panX, panY, dpr)
      for (const stroke of layer.strokes) {
        drawStroke(ctx, stroke.points, stroke.color, stroke.width, stroke.tool, zoom)
      }
    }
  }, [layers, canvasSize, zoom, panX, panY])

  // ── Preview canvas helpers (called imperatively during drawing) ────────────
  function drawPreview(points: PizarraPoint[]) {
    const canvas = previewRef.current
    if (!canvas) return
    const s = stateRef.current
    const dpr = window.devicePixelRatio || 1
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    clearCanvas(ctx, canvas)
    if (points.length === 0) return
    applyCamera(ctx, s.zoom, s.panX, s.panY, dpr)
    drawStroke(ctx, points, s.color, s.width, s.tool, s.zoom, true)
  }

  function clearPreview() {
    const canvas = previewRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    clearCanvas(ctx, canvas)
  }

  // ── Resize preview canvas ──────────────────────────────────────────────────
  useEffect(() => {
    const canvas = previewRef.current
    if (!canvas || canvasSize.width === 0) return
    const dpr = window.devicePixelRatio || 1
    resizeCanvas(canvas, canvasSize.width, canvasSize.height, dpr)
  }, [canvasSize])

  // ── Cancel in-progress draw when pizarra is deactivated ───────────────────
  useEffect(() => {
    if (!pizarraActiva) {
      cancelDrawRef.current()
      clearPreview()
    }
  }, [pizarraActiva])

  // ── Pointer event listeners on the preview canvas ─────────────────────────
  const isPointerDownRef = useRef(false)

  useEffect(() => {
    const canvas = previewRef.current
    if (!canvas) return

    function getWorldPos(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect()
      return stateRef.current.canvasToWorld(e.clientX - rect.left, e.clientY - rect.top)
    }

    function handleDown(e: PointerEvent) {
      if (!stateRef.current.pizarraActiva) return
      canvas!.setPointerCapture(e.pointerId)
      isPointerDownRef.current = true
      const { x, y } = getWorldPos(e)
      onDrawStartRef.current(x, y)
    }

    function handleMove(e: PointerEvent) {
      if (!isPointerDownRef.current) return
      const { x, y } = getWorldPos(e)
      const pts = onDrawMoveRef.current(x, y)
      drawPreview(pts)
    }

    function handleUp() {
      if (!isPointerDownRef.current) return
      isPointerDownRef.current = false
      onDrawEndRef.current()
      clearPreview()
    }

    function handleCancel() {
      isPointerDownRef.current = false
      cancelDrawRef.current()
      clearPreview()
    }

    canvas.addEventListener('pointerdown', handleDown)
    canvas.addEventListener('pointermove', handleMove)
    canvas.addEventListener('pointerup', handleUp)
    canvas.addEventListener('pointercancel', handleCancel)
    return () => {
      canvas.removeEventListener('pointerdown', handleDown)
      canvas.removeEventListener('pointermove', handleMove)
      canvas.removeEventListener('pointerup', handleUp)
      canvas.removeEventListener('pointercancel', handleCancel)
    }
  }, []) // stable via stateRef + handler refs

  const cursor = !pizarraActiva ? 'default' : tool === 'eraser' ? 'cell' : 'crosshair'

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none' }}>
      {layers.map(layer => (
        <canvas
          key={layer.id}
          ref={el => {
            if (el) layerCanvasMap.current.set(layer.id, el)
            else layerCanvasMap.current.delete(layer.id)
          }}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            visibility: layer.visible ? 'visible' : 'hidden',
            pointerEvents: 'none',
          }}
        />
      ))}
      {/* Preview canvas — receives pointer events when active */}
      <canvas
        ref={previewRef}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          cursor,
          pointerEvents: pizarraActiva ? 'auto' : 'none',
        }}
      />
    </div>
  )
}