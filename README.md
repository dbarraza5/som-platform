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

**Phase 10.7.3** — The Dataset detail view now has a full training catalog, not just the single most recent run: a "Entrenamientos anteriores" section lists every other `TrainingJob` for the Dataset (newest first, status/dates/duration/topology/neurons/Alpha/Omega each), and clicking one navigates to a new per-training page at `/projects/:id/datasets/:datasetId/trainings/:trainingId`. That page already shows the real `TrainingJob` data, with a placeholder in place of the still-to-come SOM map visualization. Two more minimal, JWT-authenticated read endpoints (`GET /training-jobs` and `GET /training-jobs/:id`) were added following the same pattern as `/latest` — see [frontend/README.md](frontend/README.md#training-catalog-and-detail-page-phase-1073). Model visualization, run comparison, and deleting/editing trainings remain for later phases.

Previously: **Phase 10.7.2** replaced the "Crear entrenamiento" button with a live monitoring card once a `TrainingJob` exists — status, a Backend-driven progress bar, current iteration/cycle, and start/elapsed or finish/duration times, polling automatically until the job reaches a terminal state (see [frontend/README.md](frontend/README.md#monitoring-a-training-job-phase-1072)). **Phase 10.7.1** replaced the "Crear entrenamiento" placeholder with a real SOM configuration modal — recommended grid topology, live neuron count, Alpha/Omega editing — calling the existing TrainingJob creation endpoint with no Backend contract changes (see [frontend/README.md](frontend/README.md#creating-a-training-job)). **Phase 10.6** completed the training pipeline end to end: once `statusRNA.dat` confirms `termino_entrenarse = si`, the Worker publishes every result file to permanent storage, verifies each upload, marks the `TrainingJob` `COMPLETED`, and deletes its temporary working directory — see [worker/README.md](worker/README.md#publishing-results--closing-out-phase-106).
