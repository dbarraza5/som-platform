import express from 'express'
import { env } from './config/env'
import routes from './routes'
import { errorHandler } from './middlewares/errorHandler'

const app = express()

app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api', routes)

app.use(errorHandler)

app.listen(env.PORT, () => {
  console.log(`Backend running on port ${env.PORT} [${env.NODE_ENV}]`)
})