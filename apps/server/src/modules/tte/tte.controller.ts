import { Request, Response, NextFunction } from 'express'
import { Knex } from 'knex'
import { z } from 'zod'
import { TteService } from './tte.service'
import { TTE_DOCUMENT_TYPES, tteConfig } from '../../config/tte'
import { ValidationError } from '../../shared/errors'

const signDocumentSchema = z.object({
  document_type: z.enum(TTE_DOCUMENT_TYPES as unknown as [string, ...string[]]),
  document_id: z.string().uuid(),
  signature_data: z.string().min(100, 'Tanda tangan tidak valid'),
  sip_number: z.string().optional(),
})

const updateConfigSchema = z.object({
  provider: z.enum(['internal', 'bsre', 'vida', 'privy']).optional(),
  bsre_url: z.string().optional(),
  bsre_username: z.string().optional(),
  bsre_password: z.string().optional(),
  vida_url: z.string().optional(),
  vida_api_key: z.string().optional(),
  vida_api_secret: z.string().optional(),
  privy_url: z.string().optional(),
  privy_merchant_key: z.string().optional(),
  privy_merchant_token: z.string().optional(),
})

export class TteController {
  constructor(private service: TteService, private db: Knex) {}

  sign = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = signDocumentSchema.parse(req.body)
      const userId = req.userId!
      const tenantSchema = req.tenantSchema!
      const role = req.role!

      // Get user name from database
      const user = await this.db
        .withSchema(tenantSchema)
        .select('name')
        .from('users')
        .where({ id: userId })
        .first()
      const userName = (user as { name: string } | undefined)?.name || 'Unknown'

      const ipAddress = (req.headers['x-forwarded-for'] as string)
        || req.socket.remoteAddress
        || ''
      const userAgent = req.headers['user-agent'] || ''

      const signature = await this.service.signDocument(
        {
          document_type: data.document_type as Parameters<typeof this.service.signDocument>[0]['document_type'],
          document_id: data.document_id,
          signature_data: data.signature_data,
          sip_number: data.sip_number,
        },
        userId,
        userName,
        role,
        tenantSchema,
        ipAddress,
        userAgent,
      )

      res.status(201).json({ success: true, data: signature })
    } catch (error) {
      next(error)
    }
  }

  verify = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { signatureId } = req.params
      const tenantSchema = req.tenantSchema!

      const result = await this.service.verifySignature(signatureId, tenantSchema)
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  getDocumentSignatures = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { documentType, documentId } = req.params
      const tenantSchema = req.tenantSchema!

      const signatures = await this.service.getSignaturesByDocument(
        documentType,
        documentId,
        tenantSchema,
      )

      res.json({ success: true, data: signatures })
    } catch (error) {
      next(error)
    }
  }

  getSignableDocuments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { visitId } = req.params
      const tenantSchema = req.tenantSchema!

      const documents = await this.service.getSignableDocuments(visitId, tenantSchema)
      res.json({ success: true, data: documents })
    } catch (error) {
      next(error)
    }
  }

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params
      const tenantSchema = req.tenantSchema!

      const signature = await this.service.getSignatureById(id, tenantSchema)
      res.json({ success: true, data: signature })
    } catch (error) {
      next(error)
    }
  }

  getConfig = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const config = {
        provider: tteConfig.provider,
        bsre: {
          baseUrl: tteConfig.bsre.baseUrl,
          hasCredentials: !!(tteConfig.bsre.username && tteConfig.bsre.password),
        },
        vida: {
          baseUrl: tteConfig.vida.baseUrl,
          hasCredentials: !!(tteConfig.vida.apiKey && tteConfig.vida.apiSecret),
        },
        privy: {
          baseUrl: tteConfig.privy.baseUrl,
          hasCredentials: !!(tteConfig.privy.merchantKey && tteConfig.privy.merchantToken),
        },
      }

      res.json({ success: true, data: config })
    } catch (error) {
      next(error)
    }
  }

  updateConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = updateConfigSchema.parse(req.body)

      // In a production system this would persist to tenant settings in the DB.
      // For now we return the requested config as confirmation.
      res.json({
        success: true,
        data: {
          message: 'Konfigurasi TTE berhasil diperbarui',
          provider: data.provider || tteConfig.provider,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  getStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantSchema = req.tenantSchema!
      const stats = await this.service.getStats(tenantSchema)
      res.json({ success: true, data: stats })
    } catch (error) {
      next(error)
    }
  }
}
