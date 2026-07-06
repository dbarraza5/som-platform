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

**Phase 10.7.4** — Frontend-only redesign of the Dataset detail view. The screen is now organized into four clearly labeled sections: (1) Dataset information header with key stats (records, columns, size, dates, status badge) and the CSV upload area; (2) "Procesamiento del Dataset" — the pipeline stepper, explicitly labeled as automatic; (3) "Entrenamiento SOM" — the training monitor card or CTA, explicitly labeled as user-initiated; (4) the training catalog. The fourth pipeline step is renamed from "Entrenamiento" to "Dataset listo" to clarify that training is not automatic. `DatasetStatusCard` and `DatasetInfoCard` were removed and their content consolidated into a redesigned `DatasetHeader`. No Backend or Worker changes — see [frontend/README.md](frontend/README.md#dataset-detail-view).

Previously: **Phase 10.7.3** added a full training catalog (all past `TrainingJob`s for the Dataset, newest first) and a per-training detail page at `/projects/:id/datasets/:datasetId/trainings/:trainingId`, backed by two new JWT-authenticated read endpoints (`GET /training-jobs` and `GET /training-jobs/:id`). **Phase 10.7.2** replaced the static training card with a live monitoring card — status, progress bar, iteration/cycle, elapsed/duration times, auto-polling until terminal. **Phase 10.7.1** replaced the placeholder with a real SOM configuration modal. **Phase 10.6** completed the training pipeline end to end — see [worker/README.md](worker/README.md#publishing-results--closing-out-phase-106).
