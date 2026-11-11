import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { CdssService } from './cdss.service'

const checkPrescriptionSchema = z.object({
  drugIds: z.array(z.string().uuid()).min(1, 'Minimal 1 obat'),
  patientId: z.string().uuid().optional(),
  visitId: z.string().uuid().optional(),
  prescriptionId: z.string().uuid().optional(),
})

const setHighAlertSchema = z.object({
  is_high_alert: z.boolean(),
  high_alert_category: z.string().max(50).nullable().optional(),
  special_instructions: z.string().max(2000).nullable().optional(),
})

const setLasaSchema = z.object({
  is_lasa: z.boolean(),
  is_norum: z.boolean().optional(),
  lasa_pairs: z.array(z.string()).optional(),
})

const createInteractionSchema = z.object({
  drug_a_name: z.string().min(2).max(200),
  drug_b_name: z.string().min(2).max(200),
  severity: z.enum(['major', 'moderate', 'minor']),
  effect: z.string().min(5),
  mechanism: z.string().optional(),
  recommendation: z.string().min(5),
  evidence_level: z.enum(['established', 'probable', 'suspected', 'possible']).optional(),
  source: z.string().max(100).optional(),
})

const updateInteractionSchema = z.object({
  drug_a_name: z.string().min(2).max(200).optional(),
  drug_b_name: z.string().min(2).max(200).optional(),
  severity: z.enum(['major', 'moderate', 'minor']).optional(),
  effect: z.string().min(5).optional(),
  mechanism: z.string().nullable().optional(),
  recommendation: z.string().min(5).optional(),
  evidence_level: z.enum(['established', 'probable', 'suspected', 'possible']).optional(),
  source: z.string().max(100).optional(),
  is_active: z.boolean().optional(),
})

const overrideAlertSchema = z.object({
  reason: z.string().min(5, 'Alasan harus minimal 5 karakter').max(500),
})

export class CdssController {
  constructor(private service: CdssService) {}

  checkPrescription = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = checkPrescriptionSchema.parse(req.body)
      const alerts = await this.service.checkPrescription(data, req.tenantSchema!)
      res.json({ success: true, data: alerts })
    } catch (error) {
      next(error)
    }
  }

  checkDrug = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { drugId } = req.params
      const alerts = await this.service.checkDrug(drugId, req.tenantSchema!)
      res.json({ success: true, data: alerts })
    } catch (error) {
      next(error)
    }
  }

  checkInteraction = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { drugAId, drugBId } = req.params
      const interaction = await this.service.checkInteraction(drugAId, drugBId, req.tenantSchema!)
      res.json({ success: true, data: interaction })
    } catch (error) {
      next(error)
    }
  }

  getHighAlertDrugs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const drugs = await this.service.getHighAlertDrugs(req.tenantSchema!)
      res.json({ success: true, data: drugs })
    } catch (error) {
      next(error)
    }
  }

  setHighAlert = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { drugId } = req.params
      const data = setHighAlertSchema.parse(req.body)
      const result = await this.service.setHighAlert(drugId, data, req.tenantSchema!)
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  getLasaDrugs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const drugs = await this.service.getLasaDrugs(req.tenantSchema!)
      res.json({ success: true, data: drugs })
    } catch (error) {
      next(error)
    }
  }

  setLasa = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { drugId } = req.params
      const data = setLasaSchema.parse(req.body)
      const result = await this.service.setLasa(drugId, data, req.tenantSchema!)
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  detectLasaPairs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pairs = await this.service.detectLasaPairs(req.tenantSchema!)
      res.json({ success: true, data: pairs })
    } catch (error) {
      next(error)
    }
  }

  searchInteractions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { q, severity } = req.query
      const interactions = await this.service.searchInteractions(
        q as string | undefined,
        severity as string | undefined,
      )
      res.json({ success: true, data: interactions })
    } catch (error) {
      next(error)
    }
  }

  addInteraction = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createInteractionSchema.parse(req.body)
      const result = await this.service.addInteraction(data)
      res.status(201).json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  updateInteraction = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params
      const data = updateInteractionSchema.parse(req.body)
      const result = await this.service.updateInteraction(id, data)
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  deleteInteraction = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params
      const result = await this.service.deleteInteraction(id)
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  getInteractionStats = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await this.service.getInteractionStats()
      res.json({ success: true, data: stats })
    } catch (error) {
      next(error)
    }
  }

  overrideAlert = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { alertId } = req.params
      const { reason } = overrideAlertSchema.parse(req.body)
      const result = await this.service.overrideAlert(
        alertId,
        req.userId!,
        reason,
        req.tenantSchema!,
      )
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  getAlertsByVisit = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { visitId } = req.params
      const alerts = await this.service.getAlertsByVisit(visitId, req.tenantSchema!)
      res.json({ success: true, data: alerts })
    } catch (error) {
      next(error)
    }
  }

  getAlertStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { from, to } = req.query
      const stats = await this.service.getAlertStats(
        req.tenantSchema!,
        from as string | undefined,
        to as string | undefined,
      )
      res.json({ success: true, data: stats })
    } catch (error) {
      next(error)
    }
  }
}
