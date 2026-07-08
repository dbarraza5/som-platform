import { env } from '../config/env'
import { IFileStorageProvider } from './IFileStorageProvider'
import { LocalFileStorageProvider } from './LocalFileStorageProvider'
import { S3FileStorageProvider } from './S3FileStorageProvider'

let provider: IFileStorageProvider | null = null

export function getStorageProvider(): IFileStorageProvider {
  if (!provider) {
    if (env.STORAGE_DRIVER === 'local') {
      provider = new LocalFileStorageProvider(env.STORAGE_LOCAL_PATH)
    } else if (env.STORAGE_DRIVER === 's3') {
      if (!env.AWS_S3_BUCKET) throw new Error('AWS_S3_BUCKET is required when STORAGE_DRIVER=s3')
      if (!env.AWS_REGION) throw new Error('AWS_REGION is required when STORAGE_DRIVER=s3')
      provider = new S3FileStorageProvider(
        env.AWS_REGION,
        env.AWS_S3_BUCKET,
        env.AWS_ACCESS_KEY_ID,
        env.AWS_SECRET_ACCESS_KEY,
      )
    } else {
      throw new Error(`Unknown STORAGE_DRIVER: ${env.STORAGE_DRIVER}`)
    }
  }
  return provider
}
