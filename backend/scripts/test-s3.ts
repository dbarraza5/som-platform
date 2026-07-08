/**
 * Test manual del adaptador S3.
 *
 * Uso (dentro del contenedor backend):
 *   npx tsx scripts/test-s3.ts
 *
 * Variables de entorno requeridas:
 *   STORAGE_DRIVER=s3
 *   AWS_REGION, AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
 */

import 'dotenv/config'
import { getStorageProvider } from '../src/storage'

const TEST_KEY = `test/som-platform-s3-test-${Date.now()}.txt`
const TEST_CONTENT = 'som-platform s3 test ok'

async function run() {
  const storage = getStorageProvider()

  console.log(`\n[1/4] Subiendo archivo de prueba → ${TEST_KEY}`)
  await storage.save({
    key: TEST_KEY,
    buffer: Buffer.from(TEST_CONTENT, 'utf-8'),
    mimeType: 'text/plain',
  })
  console.log('     ✓ Subida completada')

  console.log('\n[2/4] Descargando y verificando contenido')
  const stream = await storage.getReadStream(TEST_KEY)
  const chunks: Buffer[] = []
  await new Promise<void>((resolve, reject) => {
    stream.on('data', (chunk: Buffer) => chunks.push(chunk))
    stream.on('end', resolve)
    stream.on('error', reject)
  })
  const downloaded = Buffer.concat(chunks).toString('utf-8')
  if (downloaded !== TEST_CONTENT) {
    throw new Error(`Contenido inesperado: "${downloaded}"`)
  }
  console.log('     ✓ Contenido verificado')

  console.log('\n[3/4] Verificando existencia')
  const exists = await storage.exists(TEST_KEY)
  if (!exists) throw new Error('exists() retornó false después de subir')
  console.log('     ✓ Archivo existe')

  console.log('\n[4/4] Eliminando archivo de prueba')
  await storage.delete(TEST_KEY)
  const existsAfter = await storage.exists(TEST_KEY)
  if (existsAfter) throw new Error('exists() retornó true después de eliminar')
  console.log('     ✓ Archivo eliminado')

  console.log('\n✓ Todos los pasos completados correctamente.\n')
}

run().catch((err) => {
  console.error('\n✗ Error durante el test:', err.message ?? err)
  process.exit(1)
})