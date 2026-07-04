# SOM Platform — Frontend

React + Vite + TypeScript, styled with Tailwind CSS and hand-written shadcn/ui components (`src/components/ui/`). Zustand holds auth state; TanStack Query owns all server state. See the root [README](../README.md) and [docs/architecture.md](../docs/architecture.md) for the overall system.

## Dataset Detail view

Route: `/projects/:id/datasets/:datasetId` — `src/pages/projects/datasets/DatasetDetailPage.tsx`.

This is the main panel for a single Dataset: it shows what's happening to the CSV the user uploaded, from upload through normalization, and is where "Crear entrenamiento" opens the SOM training configuration modal (see [Creating a training job](#creating-a-training-job) below).

### Component organization

`DatasetDetailPage` is an orchestrator only — it owns the query, the upload mutation, and the training-modal open state, and hands data down to presentational components in `src/pages/projects/datasets/components/`:

| Component | Responsibility |
|---|---|
| `DatasetHeader` | Back link, name/description, edit button, and a compact summary row (filename, size, uploaded date, last updated). |
| `DatasetStatusCard` | The primary status card: badge, icon, friendly description, error message. Also hosts the CSV upload control when no file has been uploaded yet. |
| `DatasetPipeline` | The 4-step stepper (CSV recibido → Trabajo encolado → Normalización → Entrenamiento). |
| `DatasetInfoCard` | Structured dataset facts (filename, size, status, upload date, normalization finish date, error) with friendly placeholders for anything not yet available. |
| `DatasetTrainingCard` | "No existen entrenamientos" placeholder + the "Crear entrenamiento" button, enabled only once normalization is `COMPLETED`. Clicking it opens the training configuration modal. |
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

## Creating a training job

Clicking "Crear entrenamiento" on a Dataset whose pipeline status is `COMPLETED` opens a modal (`DatasetDetailPage.tsx`) containing `CreateTrainingJobForm` (`src/components/training-jobs/CreateTrainingJobForm.tsx`). This phase (10.7.1) only covers *configuring and creating* a `TrainingJob` — no progress bar, live status, history list, recovery UI, or model visualization exists yet (the Dataset detail page still shows a static "No existen entrenamientos" card afterwards; only a transient success banner confirms the creation).

### What the form shows

- **Dataset summary** — name, "Entradas" (`dataset.columns`, the column count computed by the CSV analyzer before normalization — used as the best available proxy for the SOM's input dimension, since the platform doesn't yet expose a post-normalization recount to the frontend) and the same status badge used elsewhere (`DATASET_STATUS_META`).
- **Topología** — a `<select>` (`src/components/ui/select.tsx`, a native element styled like `Input` rather than a new Radix dependency) restricted to the recommended square grid sizes in `src/lib/somDefaults.ts`: 20×20, 30×30, 40×40 (default), 50×50, 60×60, 80×80. Width/height are never freely typed.
- **Neuronas** — read-only, computed as `width × height` and recalculated live whenever the topology changes.
- **Alpha / Omega** — the only two editable SOM parameters, defaulted to `0.5` / `0.005` (the `som_` executable's own built-in defaults, confirmed during Phase 9's static analysis). Both must be greater than 0.
- **Resumen** — a pre-confirmation recap of Dataset, Topología, Neuronas, Entradas, Alpha and Omega.

### What gets sent to the Backend

`DatasetDetailPage` maps the form values to the existing `POST /projects/:projectId/datasets/:datasetId/training-jobs` contract (`src/api/trainingJobs.ts`) — no Backend change was made for this phase:

| Backend field | Source |
|---|---|
| `name` | Auto-generated on the frontend (`Entrenamiento <dataset.name> — <fecha/hora>`) — the form has no name input. |
| `gridWidth`, `gridHeight` | From the selected topology. |
| `alpha` | The form's Alpha field. |
| `beta` | The form's "Omega" field (the Backend/`som_` name for this parameter is `beta`; the UI uses "Omega" per the design brief). |
| `neighborhoodRadius`, `objectiveDimensionWeight` | Fixed at `som_`'s own defaults (`4` and `0`, `src/lib/somDefaults.ts`) — not exposed in this phase's form. |
| `description`, `iterationLimit`, `useLogarithmicForget`, `threadCount` | Omitted, so the Backend's own defaults apply. |

### Validation

- The trigger button and every field in the form are disabled unless `getDatasetPipelineStatus(dataset) === 'COMPLETED'` — checked both on the card (as before) and again inside the form itself, in case the Dataset's status changes while the modal is open.
- Alpha and Omega are validated with Zod (`> 0`) via `react-hook-form` + `zodResolver`, matching every other form in this codebase.
