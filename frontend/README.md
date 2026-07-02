# SOM Platform — Frontend

React + Vite + TypeScript, styled with Tailwind CSS and hand-written shadcn/ui components (`src/components/ui/`). Zustand holds auth state; TanStack Query owns all server state. See the root [README](../README.md) and [docs/architecture.md](../docs/architecture.md) for the overall system.

## Dataset Detail view

Route: `/projects/:id/datasets/:datasetId` — `src/pages/projects/datasets/DatasetDetailPage.tsx`.

This is the main panel for a single Dataset: it shows what's happening to the CSV the user uploaded, from upload through normalization, and is where "Crear entrenamiento" will eventually launch a SOM training job (Phase 8 only prepares the UI for that; the flow itself isn't implemented yet).

### Component organization

`DatasetDetailPage` is an orchestrator only — it owns the query, the upload mutation, and the training-modal open state, and hands data down to presentational components in `src/pages/projects/datasets/components/`:

| Component | Responsibility |
|---|---|
| `DatasetHeader` | Back link, name/description, edit button, and a compact summary row (filename, size, uploaded date, last updated). |
| `DatasetStatusCard` | The primary status card: badge, icon, friendly description, error message. Also hosts the CSV upload control when no file has been uploaded yet. |
| `DatasetPipeline` | The 4-step stepper (CSV recibido → Trabajo encolado → Normalización → Entrenamiento). |
| `DatasetInfoCard` | Structured dataset facts (filename, size, status, upload date, normalization finish date, error) with friendly placeholders for anything not yet available. |
| `DatasetTrainingCard` | "No existen entrenamientos" placeholder + the "Crear entrenamiento" button, enabled only once normalization is `COMPLETED`. |
| `DatasetDetailSkeleton` | Loading placeholder shaped like the real layout (shadcn `Skeleton`), shown instead of a blank page while the dataset query is in flight. |

Shared logic lives in `src/lib/datasetStatus.ts`, not inside any component — every card reads from the same source of truth.

### Dataset states

The backend exposes two independent enums, `analysisStatus` and `normalizationStatus` (each `PENDING | PROCESSING | COMPLETED | FAILED`), because CSV analysis runs synchronously on upload and normalization runs asynchronously in the Worker afterwards. The UI needs one status to drive a single badge and stepper, so `getDatasetPipelineStatus(dataset)` in `datasetStatus.ts` derives it:

- **`NO_FILE`** — `originalFilename` is still `null`. Not one of the five states the design calls out explicitly, but a real precondition: a Dataset can exist before any CSV is attached, and this is the only screen that can upload one. Shown with an upload prompt instead of the pipeline.
- **`UPLOADED`** — file received, analysis not yet confirmed `COMPLETED`.
- **`QUEUED`** — analysis succeeded and the normalization job was published to the queue (`normalizationStatus: PENDING`).
- **`PROCESSING`** — the Worker is actively normalizing (`normalizationStatus: PROCESSING`).
- **`COMPLETED`** — normalization finished successfully; training can start.
- **`FAILED`** — either `analysisStatus` or `normalizationStatus` is `FAILED`. The pipeline step that failed is highlighted red so the user sees exactly where the process stopped, instead of just a generic error.

Each status has a label, description, icon (lucide-react) and color classes defined once in `DATASET_STATUS_META`, reused by both `DatasetStatusCard` and `DatasetInfoCard` so the badge always looks the same wherever it appears.

### Automatic polling

While the derived status is `UPLOADED`, `QUEUED`, or `PROCESSING`, `DatasetDetailPage`'s `useQuery` sets `refetchInterval: 5000` (via a function that re-derives the status from the latest cached data on every tick). Once the status reaches `COMPLETED` or `FAILED`, the same function returns `false` and polling stops — no interval is left running in the background, and no extra requests happen for a Dataset that isn't actively being processed (including `NO_FILE`, which never polls since nothing changes without a user action).

### UX decisions

- **Upload stays on this page.** There's no separate "upload" route — `NewDatasetPage` only creates the name/description. Removing the file picker from this screen would leave freshly created Datasets with no way to attach a CSV, so it lives inside `DatasetStatusCard`, shown only in the `NO_FILE` state.
- **Status colors follow the existing convention**, not new design tokens: blue/amber/green/red Tailwind classes, the same pattern already used by `DatasetListItem` on the project page. No new CSS variables were introduced.
- **Cards over tables.** Per the design brief, all dataset facts are laid out as label/value pairs inside Cards rather than an HTML table, consistent with the rest of the app (Dashboard, Project detail).
- **Placeholders instead of blanks.** Any field that isn't available yet (file size before upload, normalization finish date before completion) renders an italic, muted placeholder string rather than an empty cell.
