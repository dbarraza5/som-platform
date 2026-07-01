import express from 'express'
import cors from 'cors'
import { apiReference } from '@scalar/express-api-reference'
import { env } from './config/env'
import routes from './routes'
import devRoutes from './routes/dev.routes'
import { errorHandler } from './middlewares/errorHandler'
import { openApiDocument } from './docs/openapi'

const app = express()

app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }))
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } })
})

app.get('/api/openapi.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json')
  res.json(openApiDocument)
})

app.use('/api/docs', apiReference({ spec: { url: '/api/openapi.json' } }))

app.use('/api', routes)

if (env.NODE_ENV !== 'production') {
  app.use('/dev', devRoutes)
}

app.use(errorHandler)

app.listen(env.PORT, () => {
  console.log(`Backend running on port ${env.PORT} [${env.NODE_ENV}]`)
})