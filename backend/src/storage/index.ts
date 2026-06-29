import { env } from '../config/env'
import { IFileStorageProvider } from './IFileStorageProvider'
import { LocalFileStorageProvider } from './LocalFileStorageProvider'

let provider: IFileStorageProvider | null = null

export function getStorageProvider(): IFileStorageProvider {
  if (!provider) {
    if (env.STORAGE_DRIVER === 'local') {
      provider = new LocalFileStorageProvider(env.STORAGE_LOCAL_PATH)
    } else {
      throw new Error(`Unknown STORAGE_DRIVER: ${env.STORAGE_DRIVER}`)
    }
  }
  return provider
}
