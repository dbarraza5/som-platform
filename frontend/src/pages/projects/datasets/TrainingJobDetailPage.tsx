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
import LayersPanel from './visualizer/LayersPanel'
import SomCanvas from './visualizer/SomCanvas'
import NeuronDetail from './visualizer/NeuronDetail'
import ClassificationResult from './visualizer/ClassificationResult'

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

  // Suppress unused-variable warnings — weights and activation are loaded
  // here so the data is ready for future phases (rendering the SOM map).
  void weights
  void activation

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
          <aside className="order-2 w-full shrink-0 overflow-y-auto border-b bg-background lg:order-1 lg:w-72 lg:border-b-0 lg:border-r">
            <LeftPanelContent
              dimsLoading={dimsLoading}
              dimsNotFound={dimsNotFound}
              dimensions={dimensions}
            />
          </aside>

          {/* SOM Canvas */}
          <main className="order-1 min-h-64 min-w-0 flex-1 lg:order-2 lg:min-h-0">
            <SomCanvas />
          </main>

          {/* Right panel */}
          <aside className="order-3 w-full shrink-0 overflow-y-auto border-t bg-background lg:w-72 lg:border-l lg:border-t-0">
            <NeuronDetail />
            <ClassificationResult />
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
}: {
  dimsLoading: boolean
  dimsNotFound: boolean
  dimensions: ReturnType<typeof useTrainingDimensions>['data']
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
      <DimensionPanel dimensions={dimensions} />
      <ClassificationForm dimensions={dimensions} />
      <LayersPanel />
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
