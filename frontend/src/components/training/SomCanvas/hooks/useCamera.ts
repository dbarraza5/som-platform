import { useState, useRef, useCallback } from 'react'
import { calcularRadio, RADIO_INICIAL_HEX, RADIO_MINIMO_HEX } from './useHexGrid'

const SQRT3 = Math.sqrt(3)
const ZOOM_MAX = 8
const ZOOM_STEP = 0.25
const PAN_THRESHOLD = 3

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

interface CameraState {
  zoom: number
  panX: number
  panY: number
}

interface StateRef {
  zoom: number
  panX: number
  panY: number
  canvasW: number
  canvasH: number
  mundoW: number
  mundoH: number
  zoomMin: number
  gridW: number
  gridH: number
}

interface UseCameraProps {
  canvasWidth: number
  canvasHeight: number
  gridWidth: number
  gridHeight: number
}

export function useCamera({ canvasWidth, canvasHeight, gridWidth, gridHeight }: UseCameraProps) {
  const [camera, setCamera] = useState<CameraState>({ zoom: 1, panX: 0, panY: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const initialized = useRef(false)

  const mundoW = (gridWidth + 0.5) * SQRT3 * RADIO_INICIAL_HEX
  const mundoH = (gridHeight * 1.5 + 0.5) * RADIO_INICIAL_HEX
  const zoomMin = RADIO_MINIMO_HEX / RADIO_INICIAL_HEX

  // Always-current ref so stable useCallback closures see latest values
  const sr = useRef<StateRef>({
    zoom: 1, panX: 0, panY: 0,
    canvasW: 0, canvasH: 0,
    mundoW: 0, mundoH: 0,
    zoomMin: 0.5,
    gridW: 0, gridH: 0,
  })
  sr.current.zoom = camera.zoom
  sr.current.panX = camera.panX
  sr.current.panY = camera.panY
  sr.current.canvasW = canvasWidth
  sr.current.canvasH = canvasHeight
  sr.current.mundoW = mundoW
  sr.current.mundoH = mundoH
  sr.current.zoomMin = zoomMin
  sr.current.gridW = gridWidth
  sr.current.gridH = gridHeight

  // Pan gesture state (refs avoid re-renders during drag)
  const panState = useRef({ active: false, moved: false, startX: 0, startY: 0, startPanX: 0, startPanY: 0 })
  const pinchRef = useRef<{ dist: number; midX: number; midY: number; zoom: number } | null>(null)

  // ── Helpers ────────────────────────────────────────────────────────────────
  function _clamped(px: number, py: number, z: number, s: StateRef) {
    return {
      panX: clamp(px, -s.mundoW * z * 0.8, s.canvasW * 0.8),
      panY: clamp(py, -s.mundoH * z * 0.8, s.canvasH * 0.8),
    }
  }

  // ── Init (call when canvas first has size) ────────────────────────────────
  const initCamera = useCallback(() => {
    if (initialized.current) return
    const s = sr.current
    if (s.canvasW === 0 || s.canvasH === 0) return
    initialized.current = true
    const radioFit = calcularRadio(s.canvasW, s.canvasH, s.gridW, s.gridH)
    const zoom = Math.max(radioFit / RADIO_INICIAL_HEX, 1.0)
    const { panX, panY } = _clamped(
      (s.canvasW - s.mundoW * zoom) / 2,
      (s.canvasH - s.mundoH * zoom) / 2,
      zoom, s
    )
    setCamera({ zoom, panX, panY })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Reset / fit to screen ─────────────────────────────────────────────────
  const resetCamera = useCallback(() => {
    const s = sr.current
    if (s.canvasW === 0) return
    const radioFit = calcularRadio(s.canvasW, s.canvasH, s.gridW, s.gridH)
    const zoom = clamp(radioFit / RADIO_INICIAL_HEX, s.zoomMin, ZOOM_MAX)
    const { panX, panY } = _clamped(
      (s.canvasW - s.mundoW * zoom) / 2,
      (s.canvasH - s.mundoH * zoom) / 2,
      zoom, s
    )
    setCamera({ zoom, panX, panY })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Zoom buttons (centered on canvas center) ──────────────────────────────
  const zoomIn = useCallback(() => {
    const s = sr.current
    setCamera(prev => {
      const newZoom = clamp(prev.zoom + ZOOM_STEP, s.zoomMin, ZOOM_MAX)
      const cx = s.canvasW / 2
      const cy = s.canvasH / 2
      const ratio = newZoom / prev.zoom
      const { panX, panY } = _clamped(
        cx - (cx - prev.panX) * ratio,
        cy - (cy - prev.panY) * ratio,
        newZoom, s
      )
      return { zoom: newZoom, panX, panY }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const zoomOut = useCallback(() => {
    const s = sr.current
    setCamera(prev => {
      const newZoom = clamp(prev.zoom - ZOOM_STEP, s.zoomMin, ZOOM_MAX)
      const cx = s.canvasW / 2
      const cy = s.canvasH / 2
      const ratio = newZoom / prev.zoom
      const { panX, panY } = _clamped(
        cx - (cx - prev.panX) * ratio,
        cy - (cy - prev.panY) * ratio,
        newZoom, s
      )
      return { zoom: newZoom, panX, panY }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Wheel zoom (centered on cursor) ───────────────────────────────────────
  const onWheelZoom = useCallback((deltaY: number, cursorX: number, cursorY: number) => {
    const s = sr.current
    const factor = deltaY < 0 ? 1.15 : 1 / 1.15
    setCamera(prev => {
      const newZoom = clamp(prev.zoom * factor, s.zoomMin, ZOOM_MAX)
      const ratio = newZoom / prev.zoom
      const { panX, panY } = _clamped(
        cursorX - (cursorX - prev.panX) * ratio,
        cursorY - (cursorY - prev.panY) * ratio,
        newZoom, s
      )
      return { zoom: newZoom, panX, panY }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pan ───────────────────────────────────────────────────────────────────
  const onPanStart = useCallback((clientX: number, clientY: number) => {
    panState.current = {
      active: true, moved: false,
      startX: clientX, startY: clientY,
      startPanX: sr.current.panX, startPanY: sr.current.panY,
    }
    setIsPanning(false)
  }, [])

  const onPanMove = useCallback((clientX: number, clientY: number): boolean => {
    const ps = panState.current
    if (!ps.active) return false
    const dx = clientX - ps.startX
    const dy = clientY - ps.startY
    if (!ps.moved && (Math.abs(dx) > PAN_THRESHOLD || Math.abs(dy) > PAN_THRESHOLD)) {
      ps.moved = true
      setIsPanning(true)
    }
    if (ps.moved) {
      const s = sr.current
      setCamera(prev => {
        const { panX, panY } = _clamped(ps.startPanX + dx, ps.startPanY + dy, prev.zoom, s)
        return { ...prev, panX, panY }
      })
    }
    return ps.moved
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Returns true if the gesture was a click (no movement)
  const onPanEnd = useCallback((): boolean => {
    const wasClick = panState.current.active && !panState.current.moved
    panState.current.active = false
    panState.current.moved = false
    setIsPanning(false)
    return wasClick
  }, [])

  // ── Pinch zoom ────────────────────────────────────────────────────────────
  const onPinchStart = useCallback((touches: TouchList, rect: DOMRect) => {
    const t0 = touches[0], t1 = touches[1]
    pinchRef.current = {
      dist: Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY),
      midX: (t0.clientX + t1.clientX) / 2 - rect.left,
      midY: (t0.clientY + t1.clientY) / 2 - rect.top,
      zoom: sr.current.zoom,
    }
  }, [])

  const onPinchMove = useCallback((touches: TouchList) => {
    const p = pinchRef.current
    if (!p) return
    const t0 = touches[0], t1 = touches[1]
    const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY)
    const factor = dist / p.dist
    const s = sr.current
    setCamera(prev => {
      const newZoom = clamp(p.zoom * factor, s.zoomMin, ZOOM_MAX)
      const ratio = newZoom / prev.zoom
      const { panX, panY } = _clamped(
        p.midX - (p.midX - prev.panX) * ratio,
        p.midY - (p.midY - prev.panY) * ratio,
        newZoom, s
      )
      return { zoom: newZoom, panX, panY }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const onPinchEnd = useCallback(() => {
    pinchRef.current = null
  }, [])

  // ── Coordinate transforms (stable via sr ref) ─────────────────────────────
  const worldToCanvas = useCallback((wx: number, wy: number) => ({
    x: wx * sr.current.zoom + sr.current.panX,
    y: wy * sr.current.zoom + sr.current.panY,
  }), [])

  const canvasToWorld = useCallback((cx: number, cy: number) => ({
    x: (cx - sr.current.panX) / sr.current.zoom,
    y: (cy - sr.current.panY) / sr.current.zoom,
  }), [])

  return {
    zoom: camera.zoom,
    panX: camera.panX,
    panY: camera.panY,
    isPanning,
    zoomMin,
    initCamera,
    resetCamera,
    zoomIn,
    zoomOut,
    onWheelZoom,
    onPanStart,
    onPanMove,
    onPanEnd,
    onPinchStart,
    onPinchMove,
    onPinchEnd,
    worldToCanvas,
    canvasToWorld,
  }
}