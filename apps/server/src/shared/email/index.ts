import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import { Knex } from 'knex'
import { logger } from '../logger'
import { env } from '../../config/env'
import { setBrandName, setContactPhone } from './templates'

interface SmtpConfig {
  host: string
  port: number
  user: string
  password: string
  fromEmail: string
  fromName: string
}

let cachedTransporter: Transporter | null = null
let cachedConfig: SmtpConfig | null = null
let configLoadedAt = 0
const CONFIG_TTL_MS = 300_000 // 5 min

async function loadSmtpConfig(db: Knex): Promise<SmtpConfig | null> {
  const now = Date.now()
  if (cachedConfig && now - configLoadedAt < CONFIG_TTL_MS) {
    return cachedConfig
  }

  try {
    const rows = await db('platform_settings')
      .whereIn('key', [
        'smtp_host', 'smtp_port', 'smtp_user', 'smtp_password_enc',
        'smtp_from_email', 'smtp_from_name', 'platform_name', 'contact_phone',
      ])
      .select('key', 'value')

    const settings: Record<string, string> = {}
    for (const r of rows) {
      settings[r.key] = r.value || ''
    }

    if (!settings.smtp_host || !settings.smtp_user) {
      return null
    }

    // Sync brand info to email templates
    if (settings.platform_name) {
      setBrandName(settings.platform_name)
    }
    setContactPhone(settings.contact_phone || '')

    cachedConfig = {
      host: settings.smtp_host,
      port: parseInt(settings.smtp_port || '587', 10),
      user: settings.smtp_user,
      password: settings.smtp_password_enc,
      fromEmail: settings.smtp_from_email || 'noreply@simrs.id',
      fromName: settings.smtp_from_name || settings.platform_name || 'SIMRS',
    }
    configLoadedAt = now
    return cachedConfig
  } catch (err) {
    logger.error('Failed to load SMTP config', { error: String(err) })
    return null
  }
}

function createTransporter(config: SmtpConfig): Transporter {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.password,
    },
    tls: { rejectUnauthorized: env.isProd },
  })
}

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail(db: Knex, options: SendEmailOptions): Promise<boolean> {
  const config = await loadSmtpConfig(db)
  if (!config) {
    logger.warn('Email not sent — SMTP not configured', {
      to: options.to,
      subject: options.subject,
    })
    return false
  }

  try {
    if (!cachedTransporter) {
      cachedTransporter = createTransporter(config)
    }

    await cachedTransporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || stripHtml(options.html),
    })

    logger.info('Email sent successfully', {
      to: options.to,
      subject: options.subject,
    })
    return true
  } catch (err) {
    logger.error('Failed to send email', {
      to: options.to,
      subject: options.subject,
      error: String(err),
    })
    // Reset transporter on error so it reconnects next time
    cachedTransporter = null
    return false
  }
}

export function invalidateSmtpCache(): void {
  cachedTransporter = null
  cachedConfig = null
  configLoadedAt = 0
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<li>/gi, '- ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
