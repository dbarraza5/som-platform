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

**Phase 10.7.1** — The Dataset detail view's "Crear entrenamiento" button now opens a real SOM configuration modal instead of a placeholder: the user picks a recommended grid topology (20×20 through 80×80), sees the resulting neuron count computed live, and edits only Alpha and Omega (defaulted to `som_`'s own built-in values). Confirming calls the existing `POST /projects/:projectId/datasets/:datasetId/training-jobs` endpoint with no Backend contract changes — see [frontend/README.md](frontend/README.md#creating-a-training-job). Progress monitoring, a training history list, and advanced parameters remain for a future phase.

Previously: **Phase 10.6** completed the training pipeline end to end. Once `statusRNA.dat` confirms `termino_entrenarse = si`, the Worker publishes every result file (`pesosRNA.csv`, `statusRNA.dat`, `activacion_rna.csv`, `ConfiguracionRNA.xml`) to permanent storage via `StorageProvider`, verifies each upload, only then marks the `TrainingJob` `COMPLETED`, and finally deletes its temporary working directory — see [worker/README.md](worker/README.md#publishing-results--closing-out-phase-106).
