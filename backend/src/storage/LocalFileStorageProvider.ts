import fs from 'fs/promises'
import { createReadStream } from 'fs'
import path from 'path'
import type { Readable } from 'stream'
import { IFileStorageProvider, SaveFileOptions } from './IFileStorageProvider'

export class LocalFileStorageProvider implements IFileStorageProvider {
  constructor(private basePath: string) {}

  private resolve(key: string): string {
    return path.join(this.basePath, key)
  }

  async save({ key, buffer }: SaveFileOptions): Promise<void> {
    const filePath = this.resolve(key)
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, buffer)
  }

  async delete(key: string): Promise<void> {
    await fs.unlink(this.resolve(key))
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.resolve(key))
      return true
    } catch {
      return false
    }
  }

  async getReadStream(key: string): Promise<Readable> {
    return createReadStream(this.resolve(key))
  }
}
