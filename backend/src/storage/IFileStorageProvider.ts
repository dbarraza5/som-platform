export interface SaveFileOptions {
  key: string
  buffer: Buffer
  mimeType: string
}

export interface IFileStorageProvider {
  save(options: SaveFileOptions): Promise<void>
  delete(key: string): Promise<void>
  exists(key: string): Promise<boolean>
}
