import winston from 'winston'
import { env } from '../../config/env'

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  env.isDev
    ? winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ''
          return `${timestamp} [${level}]: ${message}${metaStr}`
        }),
      )
    : winston.format.json(),
)

export const logger = winston.createLogger({
  level: env.isDev ? 'debug' : 'info',
  format: logFormat,
  defaultMeta: { service: 'simrs-server' },
  transports: [
    new winston.transports.Console(),
    ...(env.isProd
      ? [
          new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
          new winston.transports.File({ filename: 'logs/combined.log' }),
        ]
      : []),
  ],
})
