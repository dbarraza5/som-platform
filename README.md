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

**Phase 7.5** — Queue + storage abstractions, worker downloads the dataset, and normalization algorithm integrated (NormalizationService generates `normalized.csv` / `dimensions.xml` in the temp job directory).
