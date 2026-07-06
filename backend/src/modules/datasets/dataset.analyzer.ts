import { parse } from 'csv-parse'
import type { Readable } from 'stream'

export interface AnalysisResult {
  rows: number
  columns: number
}

export const datasetAnalyzerService = {
  analyze(stream: Readable, delimiter: ',' | ';' = ','): Promise<AnalysisResult> {
    return new Promise((resolve, reject) => {
      let settled = false
      let headerColumns = 0
      let rowCount = 0
      let isFirstRow = true

      const done = (err: Error | null, result?: AnalysisResult) => {
        if (settled) return
        settled = true
        parser.destroy()
        if (err) reject(err)
        else resolve(result!)
      }

      const parser = parse({ bom: true, relax_column_count: true, delimiter })

      parser.on('data', (record: string[]) => {
        if (isFirstRow) {
          if (record.length === 0 || (record.length === 1 && record[0] === '')) {
            done(new Error('The file has no header row'))
            return
          }
          headerColumns = record.length
          isFirstRow = false
          return
        }

        rowCount++

        if (record.length !== headerColumns) {
          done(new Error(
            `Row ${rowCount + 1} has ${record.length} column(s); expected ${headerColumns}`
          ))
        }
      })

      parser.on('error', (err) => done(err))

      parser.on('end', () => {
        if (isFirstRow) {
          done(new Error('The file is empty'))
          return
        }
        done(null, { rows: rowCount, columns: headerColumns })
      })

      stream.pipe(parser)
    })
  },
}
