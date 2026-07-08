import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'
import type { Readable } from 'stream'
import type { IFileStorageProvider, SaveFileOptions } from './IFileStorageProvider'

export class S3FileStorageProvider implements IFileStorageProvider {
  private client: S3Client
  private bucket: string

  constructor(region: string, bucket: string, accessKeyId?: string, secretAccessKey?: string) {
    this.bucket = bucket
    this.client = new S3Client({
      region,
      ...(accessKeyId && secretAccessKey
        ? { credentials: { accessKeyId, secretAccessKey } }
        : {}),
    })
  }

  async save({ key, buffer, mimeType }: SaveFileOptions): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }),
    )
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    )
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }))
      return true
    } catch (err: unknown) {
      const code = (err as { name?: string })?.name
      if (code === 'NotFound' || code === 'NoSuchKey') return false
      throw err
    }
  }

  async getReadStream(key: string): Promise<Readable> {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    )
    return response.Body as unknown as Readable
  }
}