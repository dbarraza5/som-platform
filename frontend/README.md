# SOM Platform — Frontend

React + Vite + TypeScript, styled with Tailwind CSS and hand-written shadcn/ui components (`src/components/ui/`). Zustand holds auth state; TanStack Query owns all server state. See the root [README](../README.md) and [docs/architecture.md](../docs/architecture.md) for the overall system.

## Dataset Detail view

Route: `/projects/:id/datasets/:datasetId` — `src/pages/projects/datasets/DatasetDetailPage.tsx`.

The Dataset detail view represents the full lifecycle of a Dataset in the platform. The screen is organized into clearly separated sections so users can instantly understand where the Dataset is in its lifecycle, what automatic processing has occurred, and what training actions they can take.

### Screen structure (Phase 10.7.4)

The page is divided into four sections in order:

| # | Section | Content |
|---|---|---|
| 1 | **Información del Dataset** | `DatasetHeader` — name, description, key stats (records, columns, file size, created, uploaded, status badge), CSV upload area when needed. |
| 2 | **Procesamiento del Dataset** | `DatasetPipeline` — the 4-step stepper showing how far automatic processing has gone. Labeled as automatic so users know they don't trigger it. |
| 3 | **Entrenamiento SOM** | `TrainingJobMonitorCard` (when a training exists) or `DatasetTrainingCard` CTA (when none). Labeled as manual so users know they initiate this. |
| 4 | **Catálogo** | `TrainingJobCatalogSection` — all previous trainings. |

The two-label design — *"El sistema procesa el archivo CSV de forma automática"* vs. *"Los entrenamientos son creados y configurados manualmente"* — makes explicit that normalization is automatic and training is user-initiated. This removes the ambiguity that existed in earlier layouts where processing steps and training appeared as peers.

### Component responsibilities

`DatasetDetailPage` is an orchestrator only — it owns all queries, mutations, and modal state, and passes data down as props:

| Component | File | Responsibility |
|---|---|---|
| `DatasetHeader` | `components/DatasetHeader.tsx` | Name, description, stats row (records, columns, size, dates, status badge), upload area. Absorbs the old `DatasetStatusCard` and `DatasetInfoCard`. Exports `UploadState` type. |
| `DatasetPipeline` | `components/DatasetPipeline.tsx` | 4-step stepper: CSV recibido → Trabajo encolado → Normalización → Dataset listo. Each step reflects the derived pipeline status. |
| `DatasetTrainingCard` | `components/DatasetTrainingCard.tsx` | Prominent CTA shown when no training exists. "Nuevo entrenamiento SOM" button, enabled only when `COMPLETED`. |
| `TrainingJobMonitorCard` | `components/TrainingJobMonitorCard.tsx` | Live status of the most recent training. Polls while active. Shows "Crear nuevo entrenamiento" for both `COMPLETED` and `FAILED` states. |
| `TrainingJobCatalogSection` | `components/TrainingJobCatalogSection.tsx` | All other trainings (newest first), each row a `TrainingJobListItem`. Empty-state message when none. |
| `DatasetDetailSkeleton` | `components/DatasetDetailSkeleton.tsx` | Loading skeleton matching the four-section layout. |

Shared status logic lives in `src/lib/datasetStatus.ts` — no component derives status on its own.

### Dataset states

The Backend exposes two independent enums (`analysisStatus`, `normalizationStatus`). `getDatasetPipelineStatus(dataset)` in `datasetStatus.ts` maps these to a single derived status:

- **`NO_FILE`** — no CSV uploaded yet. `DatasetHeader` shows the upload area.
- **`UPLOADED`** — file received, analysis not yet confirmed.
- **`QUEUED`** — analysis done, normalization job queued.
- **`PROCESSING`** — Worker actively normalizing.
- **`COMPLETED`** — normalization done; training can begin.
- **`FAILED`** — analysis or normalization failed. `DatasetHeader` shows the upload area again so the user can retry with a corrected file.

Each status has `label`, `description`, `icon`, `badgeClassName`, and `iconWrapperClassName` in `DATASET_STATUS_META`, used consistently by every component that renders a status badge.

### Pipeline steps

`getDatasetPipelineSteps(dataset)` drives the `DatasetPipeline` stepper. Steps:

| Key | Label | `done` when |
|---|---|---|
| `received` | CSV recibido | `QUEUED`, `PROCESSING`, `COMPLETED` |
| `queued` | Trabajo encolado | `PROCESSING`, `COMPLETED` |
| `normalized` | Normalización | `COMPLETED` |
| `ready` | Dataset listo | `COMPLETED` |

When `COMPLETED`, all four steps show green (`done`). The fourth step is named "Dataset listo" rather than "Entrenamiento" to clarify that training is not part of the automatic pipeline.

### Automatic polling

While `UPLOADED`, `QUEUED`, or `PROCESSING`, the Dataset query polls every 5 s. A parallel query polls the latest `TrainingJob` every 5 s while active. Both use `refetchInterval` with a function that re-derives the status — polling stops automatically on terminal state. No background intervals run for datasets or trainings that aren't actively changing.

### Upload control

The CSV upload area lives in `DatasetHeader` and appears only when `status === 'NO_FILE'` or `status === 'FAILED'`. There is no separate upload route — `NewDatasetPage` only creates the name/description, and a freshly created Dataset has no CSV until the user uploads one here.

## Creating a training job

"Nuevo entrenamiento SOM" (on `DatasetTrainingCard`) or "Crear nuevo entrenamiento" (on `TrainingJobMonitorCard`) opens a `Dialog` in `DatasetDetailPage` containing `CreateTrainingJobForm` (`src/components/training-jobs/CreateTrainingJobForm.tsx`).

The form shows a dataset summary, a topology selector (20×20 to 80×80, live neuron count), Alpha/Omega inputs (defaulted to the `som_` executable's own defaults: `0.5` / `0.005`), and a confirmation summary. On submit it calls `POST /projects/:projectId/datasets/:datasetId/training-jobs` — no Backend changes for this form.

Backend field mapping:

| Backend field | Source |
|---|---|
| `name` | Auto-generated: `Entrenamiento <dataset.name> — <fecha/hora>` |
| `gridWidth`, `gridHeight` | From topology selection |
| `alpha` | Form Alpha field |
| `beta` | Form Omega field (Backend/`som_` calls it `beta`) |
| `neighborhoodRadius`, `objectiveDimensionWeight` | Fixed at `som_` defaults (`4` and `0`) |

On success the mutation invalidates both `['trainingJob', 'latest', datasetId]` and `['trainingJobs', datasetId]`, so the monitor card and catalog both refresh immediately.

## Monitoring a training job (Phase 10.7.2)

Once a `TrainingJob` exists for a Dataset, `TrainingJobMonitorCard` replaces `DatasetTrainingCard` in the "Entrenamiento SOM" section.

`getTrainingDisplayStatus()` (`src/lib/trainingJobStatus.ts`) maps Backend statuses to seven display states:

| Displayed as | Derived from |
|---|---|
| **En cola** | `status === 'QUEUED'` |
| **Iniciando** | `status === 'RUNNING'`, no iteration/cycle data yet |
| **Recuperando entrenamiento...** | `status === 'RUNNING'` and `recoveryAttempts > 0` |
| **Entrenando** | `status === 'RUNNING'` with iteration/cycle data |
| **Entrenamiento completado** | `status === 'COMPLETED'` |
| **Entrenamiento fallido** | `status === 'FAILED'` |
| **Entrenamiento cancelado** | `status === 'CANCELLED'` |

The card shows a "Crear nuevo entrenamiento" button for both `COMPLETED` and `FAILED` states. The progress bar is the Backend's own `progress` field (computed in the Worker as `ciclos / total_cycles * 100` where `total_cycles = alpha / beta`).

## Training catalog and detail page (Phase 10.7.3)

`TrainingJobCatalogSection` renders the full list of `TrainingJob`s for the Dataset (all except the most recent one, which the monitor card already shows). The filter is `allTrainingJobs.filter(job => job.id !== latestTrainingJob?.id)`, so no job ever appears twice. Each row uses `TrainingJobListItem` and links to the training detail page.

Two Backend endpoints (same JWT + ownership pattern as `/latest`):
- `GET /training-jobs` — all trainings, newest first
- `GET /training-jobs/:id` — one training, 404 if not in this Dataset

`TrainingJobDetailPage` (`src/pages/projects/datasets/TrainingJobDetailPage.tsx`) shows real training data (topology, neurons, Alpha, Omega, final iteration/cycle, dates) with a placeholder for the future SOM visualization.
