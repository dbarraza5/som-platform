# SOM Platform — Architecture

## Overview

SOM Platform is a SaaS data analysis platform that uses Self-Organizing Maps (SOM) neural networks to cluster and visualize high-dimensional datasets. Users upload data through a web interface, a backend orchestrates the processing, and a Python worker runs the SOM algorithm.

---

## Services

### frontend
- **Technology:** React (Vite)
- **Port:** 5173
- **Role:** User interface. Allows users to upload datasets, configure SOM parameters, trigger analysis jobs, and visualize results.
- **Future work:** Authentication UI, job dashboard, interactive SOM visualization canvas.

### backend
- **Technology:** Express.js (Node.js)
- **Port:** 3000
- **Role:** REST API and orchestration layer. Validates requests, persists job metadata to PostgreSQL, and enqueues analysis jobs into Redis.
- **Future work:** Auth middleware, job CRUD endpoints, S3 presigned URL generation for file uploads.

### worker
- **Technology:** Python 3.12
- **Role:** Processes SOM analysis jobs. Reads jobs from the Redis queue, fetches input data from storage, runs the SOM algorithm (minisom), and writes results back to storage and the database.
- **Future work:** minisom integration, batch processing, result serialization.

### db
- **Technology:** PostgreSQL 16
- **Port:** 5432
- **Role:** Persistent storage for users, projects, jobs, and analysis results metadata.
- **Future work:** Schema migrations (via Flyway or similar), connection pooling.

### redis
- **Technology:** Redis 7
- **Port:** 6379
- **Role:** Job queue between backend and worker. The backend pushes job IDs; the worker pops and processes them.
- **Future work:** In production this will be replaced by AWS SQS.

---

## System Flow (future phases)

```
User (browser)
    │
    ▼
frontend (React)
    │  HTTP REST
    ▼
backend (Express)
    │              │
    │ enqueue      │ write metadata
    ▼              ▼
  redis          PostgreSQL
    │
    ▼
worker (Python)
    │  read/write
    ▼
  storage (local → S3)
```

1. User uploads a CSV dataset via the frontend.
2. Frontend calls the backend API to create a new analysis job.
3. Backend stores job metadata in PostgreSQL and pushes the job ID to the Redis queue.
4. Worker picks up the job, fetches the file from storage, runs the SOM algorithm, and writes results (cluster map, metadata) back to storage and PostgreSQL.
5. Frontend polls the backend for job status and displays the result when ready.

---

## AWS Mapping (future, not implemented)

| Local service | AWS equivalent        | Notes                                  |
|---------------|-----------------------|----------------------------------------|
| frontend      | S3 + CloudFront       | Static build served via CDN            |
| backend       | ECS Fargate / Lambda  | Containerized or serverless API        |
| worker        | ECS Fargate / Batch   | Long-running compute tasks             |
| db            | RDS PostgreSQL        | Managed, with automated backups        |
| redis         | SQS                   | Managed queue, no Redis ops overhead   |
| storage (local)| S3                   | Raw uploads and processed results      |

---

## Upload → Queue → Worker Flow (Phase 7.2)

```
POST /datasets/:id/upload
        │
        ▼
  Save original.csv          (IFileStorageProvider)
        │
        ▼
  CSV Analysis               (DatasetAnalyzerService — synchronous)
  analysisStatus = COMPLETED/FAILED
        │
        │  if COMPLETED
        ▼
  normalizationStatus = PENDING
        │
        ▼
  QueueService.publish()     (message: NORMALIZE + datasetId + projectId + storageKey)
        │
        ▼
  HTTP 200 ← dataset         (normalizationStatus = PENDING or FAILED if queue error)
        │
        │  (async, next phase)
        ▼
  Worker reads Redis queue
  normalizationStatus = PROCESSING → COMPLETED/FAILED
```

**Error handling:**
- If CSV analysis fails → `analysisStatus = FAILED`, `normalizationStatus = FAILED` (nothing enqueued)
- If queue publish fails → file is safe in storage, `normalizationStatus = FAILED` with the error message, HTTP still returns 200 with the dataset state

---

## Queue Abstraction (Phase 7.1)

The backend never talks to Redis or SQS directly. All queue operations go through `QueueService`, which delegates to an `IQueueProvider` implementation resolved at startup.

```
QUEUE_DRIVER env var
        │
        ▼
  getQueueService()          ← only place that reads QUEUE_DRIVER
        │
        ▼
   QueueService              ← what the rest of the backend uses
        │
  IQueueProvider
   ├── RedisQueueProvider    ← QUEUE_DRIVER=redis  (local dev)
   └── SQSQueueProvider      ← QUEUE_DRIVER=sqs    (production, placeholder)
```

### Why `IQueueProvider`?
Swapping from Redis to SQS in production requires changing a single environment variable. No application code changes.

### Why `QueueService`?
It hides provider selection and the default queue name from callers. Usage anywhere in the backend:
```typescript
await getQueueService().publish({ operation: 'NORMALIZE', datasetId, storageKey, timestamp })
```

### Message format
```json
{
  "operation": "NORMALIZE",
  "datasetId": "cm1xyz",
  "storageKey": "projects/cm1abc/datasets/cm1xyz/original.csv",
  "timestamp": "2026-07-01T10:30:00.000Z"
}
```

Messages are self-describing: they carry the operation type and all data the worker needs, so the worker never has to query the database to start processing.

### Queue environment variables
| Variable | Default | Description |
|----------|---------|-------------|
| `QUEUE_DRIVER` | `redis` | Provider: `redis` or `sqs` |
| `REDIS_HOST` | `redis` | Redis hostname (Docker service name in dev) |
| `REDIS_PORT` | `6379` | Redis port |
| `QUEUE_NAME` | `som_jobs` | Default queue / list name |

### Switching to SQS (future)
1. Set `QUEUE_DRIVER=sqs` in the environment.
2. Implement `SQSQueueProvider` using `@aws-sdk/client-sqs`.
3. No other code changes needed.

---

## Worker Python (Phase 7.3)

The worker is an independent Python process. It never knows whether its queue backend is Redis or SQS — all queue operations go through `IQueueConsumer`.

```
QUEUE_DRIVER env var
        │
        ▼
  create_queue_consumer()    ← only place that reads QUEUE_DRIVER
        │
        ▼
   IQueueConsumer
   ├── RedisQueueConsumer    ← QUEUE_DRIVER=redis  (local dev, BRPOP)
   └── SQSQueueConsumer      ← QUEUE_DRIVER=sqs    (production, placeholder)
        │
        ▼
   handle_message()          ← services/message_handler.py
   (logs only for now — processing added in Phase 7.4+)
```

### Startup sequence
```
[WORKER] Iniciando...
[WORKER] Configuración cargada.
[WORKER] Conectando a REDIS...
[WORKER] Conectado correctamente.
[WORKER] Esperando trabajos en cola 'som_jobs'...
```

### On message received
```
[WORKER] Mensaje recibido.
[WORKER]
{
  "operation": "NORMALIZE",
  "datasetId": "...",
  "projectId": "...",
  "storageKey": "...",
  "timestamp": "..."
}
```

### Switching to SQS (future)
1. Set `QUEUE_DRIVER=sqs` in `worker/.env`.
2. Implement `SQSQueueConsumer` using `boto3`.
3. No other code changes needed.

---

## Worker Storage (Phase 7.4)

The worker downloads files through `IStorageProvider`, mirroring the backend's `IFileStorageProvider` pattern. It never touches the filesystem directly.

```
Worker receives QueueMessage (storageKey)
        │
        ▼
  get_storage_provider()     ← only place that reads STORAGE_DRIVER
        │
        ▼
   IStorageProvider
   ├── LocalStorageProvider  ← STORAGE_DRIVER=local  (local dev, shared Docker volume)
   └── S3StorageProvider     ← STORAGE_DRIVER=s3     (production, placeholder)
        │
        ▼
  download(storageKey, temp_file)
        │
        ▼
  temp/job-<datasetId>/original.csv
        │
        ▼
  Validate (file exists, size > 0)
```

> Temp dir cleanup was deferred starting Phase 7.5, since the same directory holds the normalization output until it's published back to storage (Phase 7.6). See below.

### Shared storage volume
Backend and worker mount the same Docker named volume:
```yaml
backend:  storage_data:/app/storage
worker:   storage_data:/app/storage
```
Both use `STORAGE_LOCAL_PATH=/app/storage`. The worker reads files the backend wrote without any network call.

### Temp directory
Each job writes to its own isolated directory `temp/job-<datasetId>/`. It is cleaned up in the `finally` block whether the job succeeds or fails, so temp files never accumulate.

### Switching to S3 (future)
1. Set `STORAGE_DRIVER=s3` in `worker/.env`.
2. Implement `S3StorageProvider.download()` using `boto3`.
3. No other code changes needed.

### Storage environment variables
| Variable | Default | Description |
|----------|---------|-------------|
| `STORAGE_DRIVER` | `local` | Provider: `local` or `s3` |
| `STORAGE_LOCAL_PATH` | `/app/storage` | Root path for local storage (must match backend) |

---

## Worker Normalization (Phase 7.5)

`NormalizationService` (`worker/src/services/normalization_service.py`) executes the preprocessing algorithm used to prepare a dataset for SOM training: it reads the CSV, detects each column's type (continuous vs. discrete/categorical), casts and min-max normalizes to [0,1], shuffles rows, and writes the result.

It is a reusable module with no knowledge of Redis, the queue, Docker, storage, or the backend — it only takes an input file path and an output directory:

```python
service = NormalizationService(delimiter=";")
result = service.run(input_path=temp_file, output_dir=temp_dir)
# result.normalized_csv_path, result.dimensions_xml_path
```

```
handle_message()
        │
  original.csv already downloaded (Phase 7.4)
        │
        ▼
  NormalizationService.run(temp_file, temp_dir)
        │
        ▼
  temp/job-<datasetId>/normalized.csv
  temp/job-<datasetId>/dimensions.xml
        │
        ▼
  Validate both files exist and size > 0
```

### Output filenames
Fixed regardless of the input filename: `normalized.csv` and `dimensions.xml`. This keeps downstream phases (upload, SOM training) simple — no dynamic naming to parse.

### Dependencies
Added to `worker/requirements.txt`: `pandas` and `numpy` (the algorithm's CSV parsing, casting, and min-max normalization rely on both). No Dockerfile changes were needed — both ship as prebuilt wheels for `python:3.12-slim`.

### Not yet implemented (as of Phase 7.5)
Uploading `normalized.csv` / `dimensions.xml` back to storage, updating `Dataset.normalizationStatus` in PostgreSQL, and any REST callback to the backend. Implemented in Phase 7.6 below.

---

## Worker Publishes Results (Phase 7.6)

Once `NormalizationService` produces `normalized.csv` and `dimensions.xml` in the temp job directory, the worker publishes them permanently, cleans up, and reports the outcome to the backend — closing out the normalization job.

```
handle_message()
        │
  normalized.csv / dimensions.xml generated (Phase 7.5)
        │
        ▼
  storage.upload(normalizedKey, normalized.csv)
  storage.upload(dimensionsKey, dimensions.xml)
        │
        ▼
  storage.exists(...) for both keys  ← verify, never assume
        │
        ▼
  shutil.rmtree(temp/job-<datasetId>/)   ← only after both uploads verified
        │
        ▼
  BackendNotifier.notify_normalization_result(datasetId, COMPLETED)
        │
        ▼
  PATCH /api/internal/datasets/:id/normalization   (X-Internal-Api-Key)
        │
        ▼
  Backend updates Dataset:
    normalizationStatus = COMPLETED
    normalizationFinishedAt = now()
    normalizationError = null
        │
        ▼
  Worker waits for the next job
```

If anything fails (upload, temp cleanup, or an earlier step like download/normalization), the temp directory is **left in place** for diagnosis and the worker still calls `BackendNotifier` — this time with `status=FAILED` and the error message — so `Dataset.normalizationStatus` never gets stuck on `PENDING`/`PROCESSING`.

### Same StorageProvider, both directions
The worker's `IStorageProvider` (Phase 7.4) gained an `upload(key, src_path)` method, mirroring `download(key, dest_path)`. It's the same abstraction used to fetch `original.csv`, just writing instead of reading — the worker never builds storage paths or touches the shared volume by hand outside of this interface.

```
IStorageProvider
├── LocalStorageProvider.upload()  → shutil.copy2 into storage_data volume
└── S3StorageProvider.upload()     → NotImplementedError (production placeholder)
```

Result keys follow the same convention as the original file:
```
projects/<projectId>/datasets/<datasetId>/original.csv    (Phase 7.4)
projects/<projectId>/datasets/<datasetId>/normalized.csv   (Phase 7.6)
projects/<projectId>/datasets/<datasetId>/dimensions.xml   (Phase 7.6)
```

### Temporary vs. permanent storage
| | `temp/job-<datasetId>/` | `storage_data` volume (via StorageProvider) |
|---|---|---|
| Lifetime | One job; deleted once results are confirmed published | Permanent, survives worker restarts |
| Purpose | Scratch space for download + algorithm output | Source of truth the backend/frontend/future SOM training read from |
| On failure | Kept for diagnosis | Nothing partial is left — uploads are verified individually |

### Worker → Backend notification
The worker never touches PostgreSQL. It calls a backend-owned endpoint and the backend is the only writer of `Dataset.normalizationStatus`:

```
PATCH /api/internal/datasets/:id/normalization
Headers: X-Internal-Api-Key: <shared secret>
Body:    { "status": "COMPLETED" | "FAILED", "error"?: string }
```

This route (`internalDatasetRouter` in `dataset.routes.ts`) is mounted separately from the user-facing `datasetRouter` and is protected by `internalAuth` middleware (a shared-secret header check) instead of the JWT `authenticate` middleware — a worker has no user session to present.

### Worker environment variables
| Variable | Default | Description |
|----------|---------|-------------|
| `BACKEND_URL` | `http://backend:3000` | Base URL the worker calls to report job results |
| `INTERNAL_API_KEY` | (shared with backend) | Sent as `X-Internal-Api-Key`; must match the backend's value |

### Error handling
`BackendNotifier.notify_normalization_result()` catches its own `requests` exceptions and returns `False` rather than raising — a backend outage during notification is logged but never crashes the worker or leaves it unable to pick up the next job.

---

## Worker: SOM Executable Integration (Phase 9)

Preparation only — **no training runs yet, and nothing in `message_handler.py` invokes the executable**. This phase copies the SOM training binary into the Worker, confirms it runs in the container, and documents its file-based protocol so the actual training integration (next phase) doesn't have to rediscover it. Full details, including the exact config file formats and a `TrainingJob`-field mapping table, are in [worker/README.md](../worker/README.md#som-training-executable-phase-9).

```
worker/executables/som_        ← statically-linked ELF, no shared-lib dependencies
```

Summary of what was found:
- Running it with no `DatosEntrenamiento.csv` present prints `Fichero no encontrado` and exits `0` — expected for this phase, not an error.
- It generates `ConfiguracionRNA.conf` (created once, then treated as authoritative input) and `ConfiguracionRNA.xml` (rewritten every run as a status report). Every tunable value in `.conf` already has a matching field on `TrainingJob` — no Prisma changes needed for the next phase.
- Reading the binary's embedded strings and C++ symbols (it isn't stripped) revealed further files it's expected to produce during real training — `pesosRNA.csv` (model weights), `statusRNA.dat` (progress/checkpoint, backing a resume capability via `GestionadorSOM::reanudarEntrenamiento`), and `activacion_rna.csv` (per-record neuron activation) — plus a stdout progress line format (`"total: %d | iteracion: %d | por: %f| ciclo: %d"`) that the next phase can parse to update `TrainingJob.progress`.
- Open question carried into the next phase: whether the binary's CSV reader accepts the same semicolon-delimited, headerless format `NormalizationService` (Phase 7.5) already produces.

---

## TrainingJob Creation + Training Queue (Phase 10.1)

Infrastructure only — **the Worker does not consume this queue yet, does not run `som_`, and no `ConfiguracionRNA.conf` is generated in this phase.** The only thing this phase does is let a user request a training and have that request durably queued.

```
POST /api/projects/:projectId/datasets/:datasetId/training-jobs
        │
        ▼
  Validate: Dataset exists, belongs to :projectId, user owns the Project
        │
        ▼
  Validate: Dataset.normalizationStatus == COMPLETED
        │  (PENDING/PROCESSING → 409, FAILED → 422, missing → 404)
        ▼
  Create TrainingJob        status = QUEUED, progress = 0, neuronCount = gridWidth × gridHeight
        │
        ▼
  QueueService.publish(message, TRAINING_QUEUE_NAME)   ← independent queue, not som_jobs
        │
        ▼
  HTTP 201 ← TrainingJob    (status = FAILED with errorMessage if the publish itself fails)
        │
        │  (Worker does NOT consume this queue yet — next phase)
        ▼
  Message sits in 'training_jobs' untouched
```

### States

`TrainingStatus`: `QUEUED → RUNNING → COMPLETED | FAILED | CANCELLED`. `QUEUED` replaces the old default `PENDING` (migration `20260703000000_add_training_job_queue_fields` renames the enum value in place — existing rows, if any, keep their data). Every `TrainingJob` starts at `QUEUED` with `progress = 0`.

### Training queue

A second, independent Redis list/queue (`TRAINING_QUEUE_NAME`, default `training_jobs`) — deliberately not the `som_jobs` queue used for normalization, so a burst of training requests can never delay or reorder normalization jobs (or vice versa). Goes through the same `IQueueProvider` abstraction as normalization (Phase 7.1): `QueueService.publish(message, queue)` already accepted an optional queue override, so no changes were needed to `QueueService`, `RedisQueueProvider`, or `SQSQueueProvider` — only `IQueueProvider.ts`'s `QueueMessage` type changed, from a single shape to a discriminated union:

```typescript
export type QueueMessage = NormalizeQueueMessage | TrainQueueMessage
```

### Message format

```json
{
  "operation": "TRAIN",
  "trainingJobId": "cmr40k6mr0005i1frb0vyo8hn",
  "datasetId": "cmr2tw5ds00035tpjclizwitd",
  "timestamp": "2026-07-02T21:25:39.609Z"
}
```

No storage keys, no computed training parameters (grid size, alpha, beta, …) — the message only carries enough to look everything else up. The Worker will read `TrainingJob` and `Dataset` itself once it starts consuming this queue.

### `neuronCount`

Computed server-side as `gridWidth × gridHeight` rather than accepted from the client, so it can never drift out of sync with the grid dimensions. Mirrors the `som_` executable's `NUMERO_NEURONAS` config field (Phase 9), which follows the same relationship.

### Responsibilities

| | Backend | Worker |
|---|---|---|
| Phase 10.1 (this) | Validates the Dataset, creates the `TrainingJob`, publishes to `training_jobs` | Nothing — doesn't know this queue exists yet |
| Phase 10.2 | Serves `TrainingJob`/`Dataset` lookups + status updates over `/internal` routes | Consumes `training_jobs`, downloads the normalized Dataset, generates `ConfiguracionRNA.conf` |
| Later phase | — | Actually runs `som_` |

### Training queue environment variable
| Variable | Default | Description |
|----------|---------|-------------|
| `TRAINING_QUEUE_NAME` | `training_jobs` | Queue/list name for training requests — independent of `QUEUE_NAME` (normalization) |

---

## Training Environment Preparation (Phase 10.2)

The Worker now consumes `training_jobs` (alongside `som_jobs`, same Redis connection — `dispatch_message()` routes by the message's `operation` field) and prepares everything `som_` needs to eventually run, **without running it**. Full details, including the exact `.conf` generation logic and the reasoning behind not generating `.xml`, are in [worker/README.md](../worker/README.md#training-environment-preparation-phase-102).

```
TRAIN message { trainingJobId, datasetId }   ← Phase 10.1, minimal by design
        │
        ▼
  Worker fetches TrainingJob + Dataset from the Backend  (never trusts message contents beyond the id)
        │
        ▼
  storage/training/<trainingJobId>/            ← new, permanent (not temp/) — same storage_data volume
        │
        ▼
  StorageProvider.download(normalized.csv → DatosEntrenamiento.csv)
        │
        ▼
  NUMERO_ENTRADAS = count columns in DatosEntrenamiento.csv   (never Dataset.columns from the DB)
        │
        ▼
  Generate + validate ConfiguracionRNA.conf
        │
        ▼
  TrainingJob.status unchanged (still QUEUED) — FAILED only if any step above fails
```

Two Backend endpoints were added to support this, both `internalAuth`-protected like the Phase 7.6 normalization callback:
- `GET /api/internal/training-jobs/:id` and `GET /api/internal/datasets/:id` — read-only lookups the Worker uses to resolve the message into full records.
- `PATCH /api/internal/training-jobs/:id/status` — how the Worker reports status (Phase 10.3 extends this beyond just `FAILED` — see below); the Backend remains the only writer of `TrainingJob.status`.

### Why the training directory isn't temporary
`temp/job-<datasetId>/` (normalization, Phase 7.5–7.6) is deleted once its output is durably stored elsewhere. `storage/training/<trainingJobId>/` is the opposite: it **is** the durable location, kept indefinitely, because a future phase's automatic resume needs to find `pesosRNA.csv` / `statusRNA.dat` there after a Worker restart mid-training.

---

## Running the Training (Phase 10.3)

Same `handle_training_message()` call as Phase 10.2, extended: once the training directory is prepared, the Worker now actually runs `som_` inside it and waits for it to finish. Full details — including a real caveat found while testing — are in [worker/README.md](../worker/README.md#running-the-training-phase-103).

```
Environment prepared (Phase 10.2)
        │
        ▼
  PATCH .../status  { status: RUNNING, progress: 0 }   ← Backend sets startedAt = now()
        │
        ▼
  subprocess.run([som_], cwd=training_dir, capture_output=True, text=True)
        │
        ▼
  Process exits — exit code, stdout, stderr all captured
        │
        ▼
  Diff training_dir's file listing (before vs. after) → log genuinely new files
        │
        ▼
  exit_code == 0 ?
        │                              │
       yes                             no
        │                              │
        ▼                              ▼
  PATCH .../status                PATCH .../status
  { status: COMPLETED }           { status: FAILED, errorMessage }
  Backend sets finishedAt         Backend sets finishedAt
```

`reportStatus` (`training-job.service.ts`) now also accepts an optional `progress` and sets `TrainingJob.startedAt`/`finishedAt` based on the status transition (`RUNNING` → `startedAt`, `COMPLETED`/`FAILED` → `finishedAt`) — both fields existed on the Prisma model since the original schema but were unused until now; no migration was needed.

### A real caveat, not a hypothetical one
Testing this phase found that `som_` exits `0` even on a genuine configuration error (`NUMERO_ENTRADAS` not matching the CSV's actual column count) — the same pattern Phase 9 found for "file not found." The Worker's normal flow can't hit this particular case (it always computes `NUMERO_ENTRADAS` from the real file), but it means **exit code alone doesn't fully distinguish a real training run from an early bail-out** in general. Implemented as literally specified for this phase (exit code drives `COMPLETED`/`FAILED`); flagged in `worker/README.md` for a future phase to strengthen (e.g. also checking that `pesosRNA.csv`/`statusRNA.dat` were actually produced).

### Verified against a real training run
A 6×6 grid, 3-input-dimension training against the same 5-row dataset used throughout this session's testing completed in ~5 seconds, exit code `0`, and produced exactly the four files Phase 9 predicted from static binary analysis alone: `ConfiguracionRNA.xml`, `pesosRNA.csv`, `statusRNA.dat`, `activacion_rna.csv`. `statusRNA.dat` turned out to be plain text (`termino_entrenarse = si`, `ciclos = 41`, `iteracion = 205`, …), not binary — useful for whichever future phase implements progress/resume.

---

## Training Monitoring (Phase 10.4)

`statusRNA.dat` becomes the single official source of training state — not `stdout`, not the process exit code. Full details (the `TrainingStatusReader` domain object, the `Popen`+poll rework that made monitoring possible, and an explicit progress-percentage TODO) are in [worker/README.md](../worker/README.md#training-monitoring-phase-104).

```
som_ running (Popen, not subprocess.run — Phase 10.3 blocked, couldn't poll)
        │
        ▼   every TRAINING_STATUS_POLL_INTERVAL_S (default 5s)
  TrainingStatusReader.read(training_dir)
        │
   file missing / unparseable?  ──yes──▶  log "todavía no disponible", retry next tick (not a failure)
        │ no
        ▼
  PATCH .../status { status: RUNNING, progress: 0, currentIteration, currentCycle }
        │
        ▼  (repeats until the process exits)
  Process exits → one final TrainingStatusReader.read()
        │
   termino_entrenarse == "si" ?
        │                              │
       yes                             no
        ▼                              ▼
  COMPLETED, progress: 100        FAILED (exit code + statusRNA.dat +
                                   stderr/stdout folded into errorMessage,
                                   for diagnostics only)
```

This resolves Phase 10.3's flagged caveat about exit code `0` not reliably meaning success: completion is now gated on `som_`'s own `termino_entrenarse` claim in `statusRNA.dat`, which the Phase 9/10.3 "silently exits 0 on a real error" finding can't fool.

`TrainingJob` gained `currentIteration`/`currentCycle` (nullable `Int`, migration `20260704000000`) alongside the existing `progress`. The internal status endpoint accepts both now. Fixed in the same change: `reportStatus` previously reset `startedAt` on every `RUNNING` update, which was harmless when `RUNNING` was set exactly once (Phase 10.3) but wrong now that the Worker resends `status: RUNNING` on every poll tick — it's guarded to only fire on the first transition.

**Verified against a real run**: `statusRNA.dat` for this project's 5-row test dataset ends up written only once, right at the end of the ~5–10 second training — every in-flight poll during a run found nothing yet, and the final post-exit read is what actually synced `COMPLETED`/`progress: 100`/`currentIteration: 205`/`currentCycle: 41`. The wait-and-retry path (no false `FAILED` while the file doesn't exist) and the final-read completion path are both exercised and correct; a longer real-world training is what would show intermediate ticks carrying real data.

---

## Automatic Recovery (Phase 10.5)

`som_` is a direct child process of the Worker (`subprocess.Popen`), so a Worker restart — crash, redeploy, `docker compose restart` — kills it too. This phase makes the Worker check for exactly that situation on startup and resume the training natively rather than starting over. Full details — including an important caveat about a `som_` hang discovered while testing — are in [worker/README.md](../worker/README.md#automatic-recovery-phase-105).

```
Worker startup (before consuming any queue)
        │
        ▼
  GET /internal/training-jobs?status=RUNNING   ← new endpoint
        │
        ▼  for each job found
  Already running? (TrainingExecutionService.is_running — reads a
  PID lock file written/removed around the som_ process, Phase 10.3's
  execution service)
        │ no
        ▼
  ConfiguracionRNA.conf + DatosEntrenamiento.csv + statusRNA.dat all present?
        │ yes                              │ no
        ▼                                  ▼
  recoveryAttempts < MAX?          FAILED — "Faltan archivos
        │ yes            │ no      necesarios para reanudar: ..."
        ▼                 ▼
  increment attempts   FAILED — limit reached
        │
        ▼
  training_runner.run_and_monitor()   ← same function a fresh
                                         TRAIN message calls, Phase 10.3/10.4
```

The "run + monitor + finalize" logic (Phases 10.3/10.4) moved out of `training_message_handler.py` into `training_runner.py` specifically so recovery could reuse it verbatim — a resumed training and a fresh one are identical from the point the working directory exists.

`TrainingJob.recoveryAttempts` (new, default `0`, migration `20260705000000`) persists specifically because it has to survive the exact event it's protecting against — an in-memory retry counter would reset on every crash, making a "max attempts" limit meaningless.

**Verified end-to-end, twice, against the real stack**: (1) a `TrainingJob` interrupted immediately after creation (killed before `statusRNA.dat` even existed) correctly failed with a clear missing-file message on the next Worker startup; (2) a `TrainingJob` given a realistic hand-edited early checkpoint (`termino_entrenarse: no`, plausible partial `ciclos`/`iteracion`) was correctly detected, verified, and resumed to `COMPLETED` with `recoveryAttempts: 1`.

A third, deliberately adversarial test — editing a **completed** run's checkpoint to claim `termino_entrenarse: no` while leaving `ciclos`/`iteracion` at their already-final values, a self-contradictory state no real interruption produces — caused `som_` to loop printing the same progress line for 3+ minutes with no timeout in place. The Worker's own handling was still correct (clean `FAILED` once killed externally, no crash), but this exposed that **nothing currently bounds how long `som_` can run**, worth a watchdog in a future phase. The same test incidentally confirmed the stdout progress format Phase 9 only had as a string constant: `total: %d | iteracion: %d | por: %f | ciclo: %d`, `total = NUMERO_LIMITE_ITERACIONES × row count`.

---

## Phase Status

| Phase | Goal                                 | Status      |
|-------|--------------------------------------|-------------|
| 0     | Docker Compose dev environment       | Complete    |
| 1     | Auth + API skeleton                  | Complete    |
| 6.1–6.4 | Domain model + Dataset CRUD + CSV upload + analysis | Complete |
| 6.5–6.6 | Frontend: auth, projects, datasets  | Complete    |
| 7.1   | Queue abstraction (IQueueProvider)   | Complete    |
| 7.2   | Enqueue NORMALIZE on CSV upload      | Complete    |
| 7.3   | Python worker infrastructure         | Complete    |
| 7.4   | Worker downloads dataset via StorageProvider | Complete |
| 7.5   | Normalization algorithm integration (NormalizationService) | Complete |
| 7.6   | Worker publishes results via StorageProvider + notifies Backend | Complete |
| 8     | Frontend: Dataset detail view redesign | Complete  |
| 9     | Worker: SOM executable integration (preparation only, no training yet) | Complete |
| 10.1  | TrainingJob creation + training queue (Backend only, Worker doesn't consume yet) | Complete |
| 10.2  | Worker: consume training queue, prepare training directory + ConfiguracionRNA.conf (no som_ execution yet) | Complete |
| 10.3  | Worker: run som_ to completion, capture stdout/stderr/exit code, mark COMPLETED/FAILED | Complete |
| 10.4  | Worker: monitor statusRNA.dat while som_ runs, sync progress to Backend | Complete |
| 10.5  | Worker: automatic recovery of interrupted trainings on startup | Complete |
| 10.6+ | Upload results to Storage, definitive progress %, som_ watchdog/timeout | Pending |
| 11    | Results visualization                | Pending     |
| 12    | AWS deployment                       | Pending     |
