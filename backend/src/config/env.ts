import dotenv from 'dotenv'
dotenv.config()

export const env = {
  PORT: parseInt(process.env.PORT ?? '3000', 10),
  DATABASE_URL: process.env.DATABASE_URL ?? '',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  STORAGE_DRIVER: process.env.STORAGE_DRIVER ?? 'local',
  STORAGE_LOCAL_PATH: process.env.STORAGE_LOCAL_PATH ?? '/app/storage',
  UPLOAD_MAX_FILE_SIZE: parseInt(process.env.UPLOAD_MAX_FILE_SIZE ?? String(10 * 1024 * 1024), 10),
  QUEUE_DRIVER: process.env.QUEUE_DRIVER ?? 'redis',
  REDIS_HOST: process.env.REDIS_HOST ?? 'redis',
  REDIS_PORT: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  QUEUE_NAME: process.env.QUEUE_NAME ?? 'som_jobs',
}