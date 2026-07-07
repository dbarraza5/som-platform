import { type ReactNode } from 'react'
import { Pencil, Eraser, Undo2, Trash2 } from 'lucide-react'
import { PIZARRA_COLORS, PIZARRA_WIDTHS } from './hooks/usePizarra'
import type { PizarraTool } from './hooks/usePizarra'

interface PizarraToolbarProps {
  tool: PizarraTool
  setTool: (t: PizarraTool) => void
  color: string
  setColor: (c: string) => void
  width: number
  setWidth: (w: number) => void
  hasStrokes: boolean
  clearLayer: () => void
  undo: () => void
}

const WIDTH_LABELS = ['S', 'M', 'L']

export default function PizarraToolbar({
  tool, setTool,
  color, setColor,
  width, setWidth,
  hasStrokes, clearLayer, undo,
}: PizarraToolbarProps) {
  return (
    <div
      style={{ position: 'absolute', top: 8, left: 8, zIndex: 10, width: 184 }}
      className="rounded-lg border bg-background/95 shadow-lg backdrop-blur-sm"
    >
      <div className="border-b px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pizarra</p>
      </div>

      <div className="space-y-3 p-3">
        {/* Tools */}
        <div>
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Herramienta
          </p>
          <div className="flex gap-1">
            <ToolButton active={tool === 'pen'} title="Lápiz" onClick={() => setTool('pen')}>
              <Pencil className="h-3.5 w-3.5" />
              <span className="text-xs">Lápiz</span>
            </ToolButton>
            <ToolButton active={tool === 'eraser'} title="Borrador" onClick={() => setTool('eraser')}>
              <Eraser className="h-3.5 w-3.5" />
              <span className="text-xs">Borrador</span>
            </ToolButton>
          </div>
        </div>

        {/* Colors */}
        <div>
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Color
          </p>
          <div className="grid grid-cols-4 gap-1">
            {PIZARRA_COLORS.map(c => (
              <button
                key={c}
                type="button"
                title={c}
                onClick={() => setColor(c)}
                className="h-6 w-full rounded transition-transform hover:scale-110"
                style={{
                  backgroundColor: c,
                  border: color === c ? '2px solid hsl(221,83%,53%)' : '2px solid transparent',
                  outline: color === c ? '2px solid white' : 'none',
                  outlineOffset: '1px',
                  boxShadow: c === '#ffffff' ? 'inset 0 0 0 1px rgba(0,0,0,0.15)' : undefined,
                }}
              />
            ))}
          </div>
        </div>

        {/* Width */}
        <div>
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Grosor
          </p>
          <div className="flex gap-1">
            {PIZARRA_WIDTHS.map((w, i) => (
              <button
                key={w}
                type="button"
                title={WIDTH_LABELS[i]}
                onClick={() => setWidth(w)}
                className={`flex h-7 flex-1 items-center justify-center rounded text-xs font-medium transition-colors ${
                  width === w
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                }`}
              >
                <span
                  className="block rounded-full bg-current"
                  style={{ width: 6 + i * 4, height: 6 + i * 4 }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-1">
          <button
            type="button"
            title="Deshacer"
            onClick={undo}
            disabled={!hasStrokes}
            className="flex h-7 flex-1 items-center justify-center gap-1 rounded border text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Undo2 className="h-3 w-3" />
            Deshacer
          </button>
          <button
            type="button"
            title="Limpiar"
            onClick={clearLayer}
            disabled={!hasStrokes}
            className="flex h-7 flex-1 items-center justify-center gap-1 rounded border text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="h-3 w-3" />
            Limpiar
          </button>
        </div>
      </div>
    </div>
  )
}

function ToolButton({
  active, title, onClick, children,
}: {
  active: boolean
  title: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`flex h-8 flex-1 items-center justify-center gap-1 rounded border text-xs font-medium transition-colors ${
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      {children}
    </button>
  )
}