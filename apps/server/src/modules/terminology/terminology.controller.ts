import { Request, Response, NextFunction } from 'express'
import { TerminologyService } from './terminology.service'
import { z } from 'zod'

const searchLoincSchema = z.object({
  q: z.string().min(1, 'Kata kunci pencarian diperlukan'),
  kategori: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(30),
})

const searchKfaSchema = z.object({
  q: z.string().min(1, 'Kata kunci pencarian diperlukan'),
  kategori: z.string().optional(),
  golongan: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(30),
})

const mapLoincSchema = z.object({
  loinc_code: z.string().min(1, 'Kode LOINC diperlukan'),
})

const mapKfaSchema = z.object({
  kfa_code: z.string().min(1, 'Kode KFA diperlukan'),
})

export class TerminologyController {
  constructor(private service: TerminologyService) {}

  // ===== LOINC =====

  searchLoinc = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { q, kategori, limit } = searchLoincSchema.parse(req.query)
      const data = await this.service.searchLoinc(q, kategori, limit)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  getLoincByCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = req.params
      const data = await this.service.getLoincByCode(code)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  getLoincCategories = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getLoincCategories()
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  getLoincStats = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getLoincStats()
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  // ===== KFA =====

  searchKfa = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { q, kategori, golongan, limit } = searchKfaSchema.parse(req.query)
      const data = await this.service.searchKfa(q, kategori, golongan, limit)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  getKfaByCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = req.params
      const data = await this.service.getKfaByCode(code)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  getKfaCategories = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getKfaCategories()
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  getKfaGolongan = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getKfaGolongan()
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  getKfaStats = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getKfaStats()
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  // ===== MAPPING =====

  mapLabToLoinc = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { labKode } = req.params
      const { loinc_code } = mapLoincSchema.parse(req.body)
      await this.service.mapLabParamToLoinc(labKode, loinc_code)
      res.json({ success: true, data: { message: 'Lab parameter berhasil dipetakan ke LOINC' } })
    } catch (error) {
      next(error)
    }
  }

  mapDrugToKfa = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { drugId } = req.params
      const { kfa_code } = mapKfaSchema.parse(req.body)
      const tenantSchema = req.tenantSchema
      await this.service.mapDrugToKfa(drugId, kfa_code, tenantSchema)
      res.json({ success: true, data: { message: 'Obat berhasil dipetakan ke KFA' } })
    } catch (error) {
      next(error)
    }
  }

  autoMapDrugs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantSchema = req.tenantSchema
      const data = await this.service.autoMapDrugs(tenantSchema)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  getUnmappedLab = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getUnmappedLabParams()
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  getUnmappedDrugs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantSchema = req.tenantSchema
      const data = await this.service.getUnmappedDrugs(tenantSchema)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }
}
