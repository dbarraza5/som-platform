# Verify skill — SOM Platform

## Stack
Frontend: React + Vite at http://localhost:5173 (inside Docker, but port exposed to host).
Everything runs in Docker Compose — `docker compose ps` to confirm services are up.

## Auth bypass for Playwright
The auth store uses Zustand persist with key `auth` in localStorage.
JWT secret: `dev-access-secret-change-in-production` (in backend/.env).
Get user/project/dataset/training IDs from the DB:

```bash
docker compose exec db psql -U som_user -d som_db -c \
  "SELECT u.id, p.id project_id, d.id dataset_id, tj.id training_id, tj.status, tj.\"gridWidth\", tj.\"gridHeight\"
   FROM \"User\" u JOIN \"Project\" p ON p.\"userId\"=u.id
   JOIN \"Dataset\" d ON d.\"projectId\"=p.id
   JOIN \"TrainingJob\" tj ON tj.\"datasetId\"=d.id
   WHERE tj.status='COMPLETED' LIMIT 3;"
```

Inject token via Playwright `addInitScript`:

```js
import jwt from 'jsonwebtoken'
const token = jwt.sign({ sub: USER_ID }, 'dev-access-secret-change-in-production', { expiresIn: '15m' })
await page.addInitScript((state) => localStorage.setItem('auth', state), JSON.stringify({
  state: { user: { id: USER_ID, nombre: 'Test', email: 'x@x.com' }, accessToken: token, refreshToken: null },
  version: 0,
}))
```

## Key routes
- Training visualizer: `/projects/:projectId/datasets/:datasetId/trainings/:trainingId`
- Canvas element appears after data loads (`waitForSelector('canvas')` + 1500ms draw delay)

## Script location
Temp scripts live in the session scratchpad; install `jsonwebtoken playwright` via npm there.
