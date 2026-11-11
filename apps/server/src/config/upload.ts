import multer from 'multer'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'

const UPLOAD_DIR = path.resolve(__dirname, '../../../../uploads')
const PAYMENT_PROOF_DIR = path.join(UPLOAD_DIR, 'payment-proofs')

// Ensure directories exist
for (const dir of [UPLOAD_DIR, PAYMENT_PROOF_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

const paymentProofStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, PAYMENT_PROOF_DIR)
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${uuidv4()}${ext}`)
  },
})

export const uploadPaymentProof = multer({
  storage: paymentProofStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Format file tidak didukung. Gunakan JPG, PNG, WebP, atau PDF.'))
    }
  },
})

export const UPLOAD_BASE_DIR = UPLOAD_DIR
export const PAYMENT_PROOF_BASE_DIR = PAYMENT_PROOF_DIR
