/**
 * Test manual del adaptador SQS.
 *
 * Uso (dentro del contenedor backend):
 *   npx tsx scripts/test-sqs.ts
 *
 * Variables de entorno requeridas:
 *   QUEUE_DRIVER=sqs
 *   AWS_REGION, SQS_QUEUE_URL, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
 */

import 'dotenv/config'
import {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from '@aws-sdk/client-sqs'

const region = process.env.AWS_REGION
const queueUrl = process.env.SQS_QUEUE_URL
const accessKeyId = process.env.AWS_ACCESS_KEY_ID
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY

if (!region || !queueUrl) {
  console.error('Faltan variables: AWS_REGION y SQS_QUEUE_URL son requeridas.')
  process.exit(1)
}

const client = new SQSClient({
  region,
  ...(accessKeyId && secretAccessKey
    ? { credentials: { accessKeyId, secretAccessKey } }
    : {}),
})

const TEST_PAYLOAD = {
  operation: 'NORMALIZE',
  datasetId: 'test-dataset-id',
  projectId: 'test-project-id',
  storageKey: 'projects/test-project/datasets/test-dataset/original.csv',
  timestamp: new Date().toISOString(),
}

async function run() {
  console.log(`\nCola: ${queueUrl}\n`)

  // 1. Enviar
  console.log('[1/4] Enviando mensaje de prueba...')
  await client.send(
    new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(TEST_PAYLOAD),
    }),
  )
  console.log('     ✓ Conexión con SQS establecida')
  console.log('     ✓ Mensaje enviado correctamente')

  // 2. Recibir (long poll hasta 10s para que aparezca)
  console.log('\n[2/4] Recibiendo mensaje...')
  const recv = await client.send(
    new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 10,
    }),
  )

  const messages = recv.Messages ?? []
  if (messages.length === 0) {
    throw new Error('No se recibió ningún mensaje. Verifica la cola en AWS.')
  }

  const msg = messages[0]
  const received = JSON.parse(msg.Body!)

  if (
    received.operation !== TEST_PAYLOAD.operation ||
    received.datasetId !== TEST_PAYLOAD.datasetId ||
    received.projectId !== TEST_PAYLOAD.projectId
  ) {
    throw new Error(`Contenido inesperado: ${JSON.stringify(received)}`)
  }
  console.log('     ✓ Mensaje recibido y contenido verificado')

  // 3. Eliminar
  console.log('\n[3/4] Eliminando mensaje...')
  await client.send(
    new DeleteMessageCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: msg.ReceiptHandle!,
    }),
  )
  console.log('     ✓ Mensaje eliminado correctamente')

  console.log('\n[4/4] ✓ Prueba completada — SQS funcionando correctamente\n')
}

run().catch((err) => {
  console.error('\n✗ Error durante el test:', err.message ?? err)
  process.exit(1)
})