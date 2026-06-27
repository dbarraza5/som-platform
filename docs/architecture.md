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

## Phase Status

| Phase | Goal                                 | Status      |
|-------|--------------------------------------|-------------|
| 0     | Docker Compose dev environment       | Complete    |
| 1     | Auth + basic API skeleton            | Pending     |
| 2     | File upload + job creation           | Pending     |
| 3     | SOM worker integration               | Pending     |
| 4     | Results visualization                | Pending     |
| 5     | AWS deployment                       | Pending     |
