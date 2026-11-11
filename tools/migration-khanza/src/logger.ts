import winston from 'winston'
import path from 'path'
import fs from 'fs'

const LOG_DIR = path.join(process.cwd(), 'logs')

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true })
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

export const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(LOG_DIR, `migration-${timestamp}.log`),
      level: 'debug',
    }),
    new winston.transports.File({
      filename: path.join(LOG_DIR, `migration-${timestamp}-error.log`),
      level: 'error',
    }),
  ],
})

export function getLogDir(): string {
  return LOG_DIR
}
