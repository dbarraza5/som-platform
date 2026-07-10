import archiver = require('archiver')
import * as fs from 'fs'
import * as path from 'path'

const backendDir = path.resolve(__dirname, '..')
const outputPath = path.join(backendDir, 'deploy.zip')

const output = fs.createWriteStream(outputPath)
const archive = archiver('zip', { zlib: { level: 9 } })

output.on('close', () => {
  const kb = (archive.pointer() / 1024).toFixed(1)
  console.log(`deploy.zip creado (${kb} KB)`)
  console.log('Sube deploy.zip en Beanstalk -> Upload and deploy')
})

archive.on('error', (err) => { throw err })
archive.pipe(output)

archive.directory(path.join(backendDir, 'dist'), 'dist')
archive.directory(path.join(backendDir, 'prisma'), 'prisma')
archive.file(path.join(backendDir, 'package.json'), { name: 'package.json' })
archive.file(path.join(backendDir, 'package-lock.json'), { name: 'package-lock.json' })

archive.finalize()
