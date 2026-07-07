import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react'
import { trainingJobsApi } from '@/api/trainingJobs'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { useTrainingDimensions } from '@/hooks/useTrainingDimensions'
import { useTrainingWeights } from '@/hooks/useTrainingWeights'
import { useTrainingActivation } from '@/hooks/useTrainingActivation'
import TrainingHeader from './visualizer/TrainingHeader'
import DimensionPanel from './visualizer/DimensionPanel'
import ClassificationForm from './visualizer/ClassificationForm'
import SomCanvas from '@/components/training/SomCanvas'
import type { NeuronHit } from '@/components/training/SomCanvas/hooks/useCanvasInteraction'
import NeuronDetail from './visualizer/NeuronDetail'
import ClassificationResult from './visualizer/ClassificationResult'
import { PALETTES } from '@/components/training/SomCanvas/hooks/useHeatmap'
import type { ColorStop } from '@/components/training/SomCanvas/hooks/useHeatmap'
import { useClassification } from '@/components/training/SomCanvas/hooks/useClassification'
import type { ClassificationMatch } from '@/components/training/SomCanvas/hooks/useClassification'

// ── Right-panel resize constants ───────────────────────────────────────────
const RIGHT_PANEL_MIN = 240
const RIGHT_PANEL_MAX = 520
const RIGHT_PANEL_DEFAULT = 320
const LS_KEY = 'som-panel-right-width'

function getStoredWidth(): number {
  try {
    const v = localStorage.getItem(LS_KEY)
    if (v) {
      const n = parseInt(v, 10)
      if (!isNaN(n) && n >= RIGHT_PANEL_MIN && n <= RIGHT_PANEL_MAX) return n
    }
  } catch {}
  return RIGHT_PANEL_DEFAULT
}

export default function TrainingJobDetailPage() {
  const { id: projectId, datasetId, trainingId } = useParams<{
    id: string
    datasetId: string
    trainingId: string
  }>()
  const navigate = useNavigate()
  const { user, refreshToken, clearAuth } = useAuthStore()

  const { data: trainingJob, isLoading: jobLoading } = useQuery({
    queryKey: ['trainingJob', trainingId],
    queryFn: () =>
      trainingJobsApi.getById(projectId!, datasetId!, trainingId!).then((r) => r.data.data.trainingJob),
    enabled: !!projectId && !!datasetId && !!trainingId,
  })

  const {
    data: dimensions,
    isLoading: dimsLoading,
    isNotFound: dimsNotFound,
  } = useTrainingDimensions(projectId!, datasetId!, trainingId!)

  const { data: weights } = useTrainingWeights(projectId!, datasetId!, trainingId!)
  const { data: activation } = useTrainingActivation(projectId!, datasetId!, trainingId!)

  const [activeDimensionIndex, setActiveDimensionIndex] = useState(0)
  const [selectedNeuron, setSelectedNeuron] = useState<NeuronHit | null>(null)
  const [winnerNeuron, setWinnerNeuron] = useState<NeuronHit | null>(null)
  const [classificationResult, setClassificationResult] = useState<ClassificationMatch | null>(null)
  const [currentPalette, setCurrentPalette] = useState<ColorStop[]>(PALETTES[0].stops)

  // ── Right-panel resizing ─────────────────────────────────────────────────
  const [rightPanelWidth, setRightPanelWidth] = useState(getStoredWidth)
  const rightWidthRef = useRef(rightPanelWidth)
  const [lgScreen, setLgScreen] = useState(() => window.innerWidth >= 1024)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const handler = (e: MediaQueryListEvent) => setLgScreen(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  function handleResizerMouseDown(e: React.MouseEvent) {
    if (!lgScreen) return
    e.preventDefault()
    const startX = e.clientX
    const startWidth = rightPanelWidth

    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'

    function onMouseMove(ev: MouseEvent) {
      const dx = startX - ev.clientX
      const next = Math.max(RIGHT_PANEL_MIN, Math.min(RIGHT_PANEL_MAX, startWidth + dx))
      setRightPanelWidth(next)
      rightWidthRef.current = next
    }

    function onMouseUp() {
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      try { localStorage.setItem(LS_KEY, String(rightWidthRef.current)) } catch {}
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const { clasificar } = useClassification({
    weights: weights ?? [],
    gridWidth: trainingJob?.gridWidth ?? 1,
  })

  function handleClassify(inputNorm: number[]) {
    const result = clasificar(inputNorm)
    if (!result) return
    setClassificationResult(result)
    setWinnerNeuron({ index: result.indice, col: result.columna, row: result.fila })
  }

  function handleClear() {
    setClassificationResult(null)
    setWinnerNeuron(null)
  }

  async function handleLogout() {
    if (refreshToken) await authApi.logout(refreshToken).catch(() => {})
    clearAuth()
    navigate('/login')
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (jobLoading) {
    return (
      <div className="flex h-screen flex-col bg-background">
        <NavBar userName={user?.nombre} onLogout={handleLogout} />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">Cargando entrenamiento...</p>
        </div>
      </div>
    )
  }

  // ── Not found ──────────────────────────────────────────────────────────────
  if (!trainingJob) {
    return (
      <div className="flex h-screen flex-col bg-background">
        <NavBar userName={user?.nombre} onLogout={handleLogout} />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-muted-foreground">Entrenamiento no encontrado.</p>
          <Button asChild variant="outline" size="sm">
            <Link to={`/projects/${projectId}/datasets/${datasetId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al dataset
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  // ── Visualizer ─────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <NavBar userName={user?.nombre} onLogout={handleLogout} />

      <div className="flex min-h-0 flex-1 flex-col">
        <TrainingHeader
          trainingJob={trainingJob}
          projectId={projectId!}
          datasetId={datasetId!}
          dimensionCount={dimensions?.length ?? 0}
        />

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">

          {/* Left panel */}
          <aside className="order-2 w-full shrink-0 overflow-y-auto border-b bg-muted/60 lg:order-1 lg:w-72 lg:border-b-0 lg:border-r">
            <LeftPanelContent
              dimsLoading={dimsLoading}
              dimsNotFound={dimsNotFound}
              dimensions={dimensions}
              onSelectionChange={setActiveDimensionIndex}
              onClassify={handleClassify}
              onClear={handleClear}
            />
          </aside>

          {/* SOM Canvas */}
          <main className="order-1 min-h-64 min-w-0 flex-1 lg:order-2 lg:min-h-0">
            <SomCanvas
              weights={weights ?? []}
              activation={activation ?? []}
              dimensions={dimensions ?? []}
              activeDimensionIndex={activeDimensionIndex}
              gridWidth={trainingJob.gridWidth}
              gridHeight={trainingJob.gridHeight}
              winnerNeuron={winnerNeuron}
              onNeuronSelect={setSelectedNeuron}
              onPaletteChange={setCurrentPalette}
            />
          </main>

          {/* Resizer — only active on lg+ screens */}
          <div
            className="group relative hidden shrink-0 cursor-col-resize lg:block lg:w-1.5 lg:order-3"
            onMouseDown={handleResizerMouseDown}
          >
            <div className="absolute inset-0 transition-colors group-hover:bg-primary/10" />
            <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border transition-colors group-hover:bg-primary/40" />
          </div>

          {/* Right panel */}
          <aside
            className="order-3 w-full shrink-0 overflow-y-auto border-t bg-muted/60 lg:order-4 lg:border-t-0"
            style={lgScreen ? { width: rightPanelWidth } : undefined}
          >
            <NeuronDetail
              selectedNeuron={selectedNeuron}
              allWeights={weights ?? []}
              dimensions={dimensions ?? []}
              activeDimensionIndex={activeDimensionIndex}
            />
            <ClassificationResult
              result={classificationResult}
              winnerNeuron={winnerNeuron}
              weights={weights ?? []}
              activation={activation ?? []}
              activeDimensionIndex={activeDimensionIndex}
              gridWidth={trainingJob.gridWidth}
              gridHeight={trainingJob.gridHeight}
              palette={currentPalette}
              onClear={handleClear}
            />
          </aside>

        </div>
      </div>
    </div>
  )
}

// ── Left panel content ─────────────────────────────────────────────────────
function LeftPanelContent({
  dimsLoading,
  dimsNotFound,
  dimensions,
  onSelectionChange,
  onClassify,
  onClear,
}: {
  dimsLoading: boolean
  dimsNotFound: boolean
  dimensions: ReturnType<typeof useTrainingDimensions>['data']
  onSelectionChange: (index: number) => void
  onClassify: (inputNorm: number[]) => void
  onClear: () => void
}) {
  if (dimsLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <p className="text-xs text-muted-foreground">Cargando dimensiones...</p>
      </div>
    )
  }

  if (dimsNotFound || !dimensions) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
        <AlertCircle className="h-5 w-5 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          Los archivos del entrenamiento aún no han sido generados.
        </p>
      </div>
    )
  }

  return (
    <>
      <DimensionPanel dimensions={dimensions} onSelectionChange={onSelectionChange} />
      <ClassificationForm dimensions={dimensions} onClassify={onClassify} onClear={onClear} />
    </>
  )
}

// ── Nav bar ────────────────────────────────────────────────────────────────
function NavBar({
  userName,
  onLogout,
}: {
  userName: string | undefined
  onLogout: () => void
}) {
  return (
    <header className="z-20 shrink-0 border-b bg-background/95 backdrop-blur">
      <div className="flex h-16 items-center justify-between px-4">
        <Link to="/dashboard" className="text-lg font-semibold tracking-tight">
          SOM Platform
        </Link>
        <div className="flex items-center gap-4">
          {userName && (
            <span className="hidden text-sm text-muted-foreground sm:block">{userName}</span>
          )}
          <Button variant="outline" size="sm" onClick={onLogout}>
            Cerrar sesión
          </Button>
        </div>
      </div>
    </header>
  )
}