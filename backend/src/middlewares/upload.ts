import multer from 'multer'
import { Request, Response } from 'express'
import { env } from '../config/env'

const ALLOWED_MIMETYPES = ['text/csv', 'application/vnd.ms-excel', 'text/plain']

const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.UPLOAD_MAX_FILE_SIZE },
  fileFilter(_req, file, cb) {
    const hasCSVExt = file.originalname.toLowerCase().endsWith('.csv')
    const isCSVMime = ALLOWED_MIMETYPES.includes(file.mimetype)
    if (hasCSVExt && isCSVMime) {
      cb(null, true)
    } else {
      cb(new Error('INVALID_FILE_TYPE'))
    }
  },
}).single('file')

export function runUpload(req: Request, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    multerUpload(req, res, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}
