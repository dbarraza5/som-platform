import { parse } from 'csv-parse'
import { XMLParser } from 'fast-xml-parser'
import type { Readable } from 'stream'
import { getStorageProvider } from '../../storage'
import { datasetRepository } from '../datasets/dataset.repository'
import { trainingJobRepository } from './training-job.repository'

// ── Helpers ────────────────────────────────────────────────────────────────

async function streamToString(readable: Readable): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of readable) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string))
  }
  return Buffer.concat(chunks).toString('utf-8')
}

function parseCsvToRows(content: string, delimiter: string): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    const rows: string[][] = []
    const parser = parse({ delimiter, trim: true, skip_empty_lines: true })
    parser.on('data', (row: string[]) => rows.push(row))
    parser.on('end', () => resolve(rows))
    parser.on('error', reject)
    parser.write(content)
    parser.end()
  })
}

// Tries semicolon first (project convention), then comma
async function parseCsvAuto(content: string): Promise<string[][]> {
  const rows = await parseCsvToRows(content, ';')
  // If all rows have 1 column it's likely the wrong delimiter
  if (rows.length > 0 && rows.every((r) => r.length === 1)) {
    return parseCsvToRows(content, ',')
  }
  return rows
}

// ── Ownership assertion ────────────────────────────────────────────────────

async function assertAccess(
  projectId: string,
  datasetId: string,
  trainingJobId: string,
  userId: string,
) {
  const dataset = await datasetRepository.findById(datasetId)
  if (!dataset || dataset.projectId !== projectId) throw new Error('DATASET_NOT_FOUND')
  if (dataset.project.userId !== userId) throw new Error('FORBIDDEN')
  const trainingJob = await trainingJobRepository.findById(trainingJobId)
  if (!trainingJob || trainingJob.datasetId !== datasetId) throw new Error('TRAINING_JOB_NOT_FOUND')
}

// ── Public API ─────────────────────────────────────────────────────────────

export type TrainingDimension = {
  nombre: string
  index: number
  tipo_dato: 'continuo' | 'discreto'
  min: number
  max: number
  rango?: string[]
}

export const trainingFilesService = {
  async getDimensions(
    projectId: string,
    datasetId: string,
    trainingJobId: string,
    userId: string,
  ): Promise<TrainingDimension[]> {
    await assertAccess(projectId, datasetId, trainingJobId, userId)

    const key = `projects/${projectId}/datasets/${datasetId}/dimensions.xml`
    const storage = getStorageProvider()

    if (!(await storage.exists(key))) throw new Error('FILE_NOT_FOUND')

    const stream = await storage.getReadStream(key)
    const xml = await streamToString(stream)

    const parser = new XMLParser({ ignoreAttributes: false, isArray: (name) => name === 'item' })
    const parsed = parser.parse(xml)

    const rawDims: unknown[] = Array.isArray(parsed?.configuracion?.dimension)
      ? parsed.configuracion.dimension
      : parsed?.configuracion?.dimension
        ? [parsed.configuracion.dimension]
        : []

    return (rawDims as Record<string, unknown>[]).map((d) => {
      const dim: TrainingDimension = {
        nombre: String(d.nombre ?? ''),
        index: Number(d.index ?? 0),
        tipo_dato: d.tipo_dato === 'discreto' ? 'discreto' : 'continuo',
        min: Number(d.min ?? 0),
        max: Number(d.max ?? 0),
      }
      if (d.tipo_dato === 'discreto' && d.rango) {
        const items = (d as { rango: { item: unknown } | { item: unknown[] } }).rango.item
        dim.rango = (Array.isArray(items) ? items : [items]).map(String)
      }
      return dim
    })
  },

  async getWeights(
    projectId: string,
    datasetId: string,
    trainingJobId: string,
    userId: string,
  ): Promise<number[][]> {
    await assertAccess(projectId, datasetId, trainingJobId, userId)

    const key = `projects/${projectId}/datasets/${datasetId}/training-jobs/${trainingJobId}/pesosRNA.csv`
    const storage = getStorageProvider()

    if (!(await storage.exists(key))) throw new Error('FILE_NOT_FOUND')

    const stream = await storage.getReadStream(key)
    const content = await streamToString(stream)
    const rows = await parseCsvAuto(content)

    return rows.map((row) => row.map(Number))
  },

  async getActivation(
    projectId: string,
    datasetId: string,
    trainingJobId: string,
    userId: string,
  ): Promise<number[]> {
    await assertAccess(projectId, datasetId, trainingJobId, userId)

    const key = `projects/${projectId}/datasets/${datasetId}/training-jobs/${trainingJobId}/activacion_rna.csv`
    const storage = getStorageProvider()

    if (!(await storage.exists(key))) throw new Error('FILE_NOT_FOUND')

    const stream = await storage.getReadStream(key)
    const content = await streamToString(stream)
    const rows = await parseCsvAuto(content)

    // Flat array: one value per neuron (may be one column per row or one row)
    if (rows.length === 1) return rows[0].map(Number)
    return rows.map((row) => Number(row[0]))
  },
}
