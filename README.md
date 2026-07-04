# SOM Platform

SaaS platform for data analysis using Self-Organizing Maps (SOM) neural networks.

## Stack

| Layer    | Technology           |
|----------|----------------------|
| Frontend | React 18 + Vite      |
| Backend  | Express.js (Node 20) |
| Worker   | Python 3.12          |
| Database | PostgreSQL 16        |
| Queue    | Redis 7              |

## Running with Docker

```bash
docker compose up --build
```

Services will be available at:

| Service  | URL                    |
|----------|------------------------|
| Frontend | http://localhost:5173  |
| Backend  | http://localhost:3000  |
| DB       | localhost:5432         |
| Redis    | localhost:6379         |

To stop and remove containers:

```bash
docker compose down
```

To also remove the database volume:

```bash
docker compose down -v
```

## Project Structure

```
som-platform/
├── frontend/        # React app (Vite)
├── backend/         # Express.js API
├── worker/          # Python SOM processor
├── docs/
│   └── architecture.md
└── docker-compose.yml
```

## Documentation

See [docs/architecture.md](docs/architecture.md) for a full description of each service, the system flow, and the planned AWS mapping.

## API Documentation

Interactive API documentation is available at:

**http://localhost:3000/api/docs**

Powered by [Scalar](https://scalar.com) with an OpenAPI 3.1 spec. Covers all implemented endpoints with request/response examples, authentication, and a built-in HTTP client to execute requests directly from the browser.

The raw OpenAPI spec is also available at `http://localhost:3000/api/openapi.json`.

## Current Phase

**Phase 10.7.2** — Once a `TrainingJob` exists for a Dataset, the Dataset detail view replaces the "Crear entrenamiento" button with a live monitoring card: status (En cola / Iniciando / Entrenando / Recuperando entrenamiento / Entrenamiento completado / Entrenamiento fallido), a progress bar driven entirely by the Backend's own percentage, current iteration/cycle, and start/elapsed or finish/duration times — all refreshed automatically every 5s until the job reaches a terminal state, no manual page refresh required. This needed one small, explicitly-scoped Backend addition: a JWT-authenticated `GET /projects/:projectId/datasets/:datasetId/training-jobs/latest` endpoint, since every existing `training-jobs` route besides `create` was internal-only (Worker-to-Backend) — see [frontend/README.md](frontend/README.md#monitoring-a-training-job-phase-1072). A training history list, run comparison, and model visualization remain for later phases.

Previously: **Phase 10.7.1** replaced the "Crear entrenamiento" placeholder with a real SOM configuration modal — recommended grid topology, live neuron count, Alpha/Omega editing — calling the existing TrainingJob creation endpoint with no Backend contract changes (see [frontend/README.md](frontend/README.md#creating-a-training-job)). **Phase 10.6** completed the training pipeline end to end: once `statusRNA.dat` confirms `termino_entrenarse = si`, the Worker publishes every result file to permanent storage, verifies each upload, marks the `TrainingJob` `COMPLETED`, and deletes its temporary working directory — see [worker/README.md](worker/README.md#publishing-results--closing-out-phase-106).
