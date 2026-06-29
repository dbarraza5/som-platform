# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Environment

Everything runs inside Docker Compose. There is no local `npm install` — packages are installed inside containers at build time.

```bash
# Start all services
docker compose up

# Rebuild after adding a new npm package
docker compose up --build

# Full reset (clears volumes including node_modules and postgres data)
docker compose down -v && docker compose up --build
```

**After `down -v`, migrations must be re-applied:**
```bash
docker compose exec backend npx prisma migrate deploy
```

**Install a new npm package inside a running container** (local npm fails due to SSL/proxy):
```bash
docker compose exec backend npm install <package>
docker compose exec frontend npm install <package>
```

**Prisma — run migrations** (`migrate dev` is blocked in non-interactive Docker; create SQL manually then deploy):
```bash
# Apply existing migrations
docker compose exec backend npx prisma migrate deploy

# Regenerate Prisma client after schema changes
docker compose exec backend npx prisma generate
```

**Check service logs:**
```bash
docker compose logs backend --tail=20
docker compose logs frontend --tail=20
```

## Service Map

| Service  | Tech              | Port | Entry point              |
|----------|-------------------|------|--------------------------|
| frontend | React + Vite      | 5173 | `src/main.tsx`           |
| backend  | Express + tsx watch | 3000 | `src/index.ts`         |
| worker   | Python 3.12       | —    | `src/main.py` (stub)     |
| db       | PostgreSQL 16     | 5432 | —                        |
| redis    | Redis 7           | 6379 | —                        |

## Domain Model

```
User → Project → Dataset → TrainingJob
```

- A `User` owns many `Project`s.
- A `Project` has many `Dataset`s.
- A `Dataset` has many `TrainingJob`s (with SOM parameters).
- `TrainingJob` is **not** directly related to `Project`.

Prisma schema: `backend/prisma/schema.prisma`  
Migrations: `backend/prisma/migrations/`

## Backend Architecture

Layered architecture under `backend/src/modules/<module>/`:

```
routes → controller → service → repository → Prisma
```

- **routes**: mounts middleware, calls `validate()` and `asyncHandler()`. Never contains logic.
- **controller**: extracts params from `req`, calls service, handles domain error codes, calls `success()` / `error()`.
- **service**: all business logic and ownership checks. Throws `new Error('DOMAIN_CODE')` for domain errors.
- **repository**: pure Prisma calls, no logic.

**Domain error pattern** — services throw string codes, controllers catch them:
```ts
// service
if (!project) throw new Error('PROJECT_NOT_FOUND')
if (project.userId !== userId) throw new Error('FORBIDDEN')

// controller
if (err.message === 'PROJECT_NOT_FOUND') { error(res, 'Project not found', 404); return true }
```

**All async route handlers must be wrapped:**
```ts
router.get('/', asyncHandler(controller.method))
```

**Nested routes** that need parent URL params (e.g., `/projects/:projectId/datasets`) require `mergeParams: true` on the child router:
```ts
const router = Router({ mergeParams: true })
```

**Validation** uses Zod schemas via the `validate(schema)` middleware. Schemas live in `<module>.schemas.ts`.

## API Response Format

All responses use the same shape (via `utils/response.ts`):

```json
{ "success": true, "data": {} }
{ "success": false, "message": "...", "errors": [{ "field": "...", "message": "..." }] }
```

## Authentication

JWT dual-token: access token (15 min) + refresh token (7 days, stored in DB with rotation).

- `authenticate` middleware reads `Authorization: Bearer <token>`, verifies it, fetches the user, and attaches it to `req.user`.
- Protected modules call `router.use(authenticate)` at the top.
- `req.user` type is declared in `src/types/express.d.ts`.

## Frontend Architecture

- `@` alias maps to `frontend/src/`.
- **State**: Zustand (`authStore`) for auth, TanStack Query for server state.
- **Routing**: React Router v6 with `RequireAuth` / `RequireGuest` guards in `src/router/index.tsx`.
- **API**: Axios instance in `src/api/axios.ts` with interceptors for Bearer token injection and automatic refresh token rotation with a request queue for concurrent 401s.
- **Forms**: React Hook Form + Zod resolvers.
- **UI**: shadcn/ui components written manually in `src/components/ui/` (no CLI). Tailwind CSS with CSS variables for theming defined in `src/index.css`.

**Vite resolves `.tsx` before `.jsx`** (configured in `vite.config.ts`). Explicit `.tsx` extensions are used in imports where ambiguity existed historically.

## Prisma Migration Workflow

Because `prisma migrate dev` requires an interactive TTY (and blocks on destructive changes), the established pattern is:

1. Update `schema.prisma`.
2. Create migration directory manually: `prisma/migrations/<timestamp>_<name>/migration.sql`.
3. Write the SQL manually.
4. Apply: `docker compose exec backend npx prisma migrate deploy`.
5. Regenerate client: `docker compose exec backend npx prisma generate`.

## Postman

Import both files from `postman/`:
- `SOM_Platform_API.postman_collection.json` — collection with all endpoints
- `SOM_Platform_Local.postman_environment.json` — environment with `baseUrl`, `accessToken`, `refreshToken`, `currentProjectId`, `currentDatasetId`

Login, Create Project, and Create Dataset requests auto-save their IDs to the environment via test scripts.
