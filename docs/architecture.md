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
        │
        ▼
  Cleanup temp dir
```

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
        │
        ▼
  Cleanup temp dir
```

### Output filenames
Fixed regardless of the input filename: `normalized.csv` and `dimensions.xml`. This keeps downstream phases (upload, SOM training) simple — no dynamic naming to parse.

### Dependencies
Added to `worker/requirements.txt`: `pandas` and `numpy` (the algorithm's CSV parsing, casting, and min-max normalization rely on both). No Dockerfile changes were needed — both ship as prebuilt wheels for `python:3.12-slim`.

### Not yet implemented
Uploading `normalized.csv` / `dimensions.xml` back to storage, updating `Dataset.normalizationStatus` in PostgreSQL, and any REST callback to the backend. The files are validated and then discarded with the rest of the temp directory, same as before this phase.

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
| 8     | SOM worker integration               | Pending     |
| 9     | Results visualization                | Pending     |
| 10    | AWS deployment                       | Pending     |
