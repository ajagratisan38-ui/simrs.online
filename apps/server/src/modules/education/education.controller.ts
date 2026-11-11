import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { EducationService } from './education.service'

// --- Zod Schemas ---

const createTopicSchema = z.object({
  kode: z.string().min(1).max(20),
  nama: z.string().min(1).max(200),
  kategori: z.string().min(1).max(50),
  deskripsi: z.string().optional(),
  materi: z.string().optional(),
})

const updateTopicSchema = z.object({
  kode: z.string().min(1).max(20).optional(),
  nama: z.string().min(1).max(200).optional(),
  kategori: z.string().min(1).max(50).optional(),
  deskripsi: z.string().nullable().optional(),
  materi: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
})

const topicFiltersSchema = z.object({
  kategori: z.string().optional(),
  search: z.string().optional(),
  is_active: z.coerce.boolean().optional(),
})

const createRecordSchema = z.object({
  visit_id: z.string().uuid(),
  topic_id: z.string().uuid().optional(),
  topik_manual: z.string().max(300).optional(),
  kategori: z.string().min(1).max(50),
  materi_diberikan: z.string().min(1),
  metode: z.array(z.string()).min(1),
  bahasa: z.string().max(30).optional(),
  sasaran: z.string().min(1).max(30),
  nama_sasaran: z.string().max(100).optional(),
  hubungan_sasaran: z.string().max(50).optional(),
  evaluasi_pemahaman: z.string().min(1).max(20),
  evaluasi_catatan: z.string().optional(),
  catatan: z.string().optional(),
  status: z.enum(['draft', 'completed']).optional(),
})

const updateRecordSchema = z.object({
  topic_id: z.string().uuid().nullable().optional(),
  topik_manual: z.string().max(300).nullable().optional(),
  kategori: z.string().min(1).max(50).optional(),
  materi_diberikan: z.string().min(1).optional(),
  metode: z.array(z.string()).min(1).optional(),
  bahasa: z.string().max(30).optional(),
  sasaran: z.string().min(1).max(30).optional(),
  nama_sasaran: z.string().max(100).nullable().optional(),
  hubungan_sasaran: z.string().max(50).nullable().optional(),
  evaluasi_pemahaman: z.string().min(1).max(20).optional(),
  evaluasi_catatan: z.string().nullable().optional(),
  catatan: z.string().nullable().optional(),
  status: z.enum(['draft', 'completed']).optional(),
})

const verifySchema = z.object({
  signature_data: z.string().min(1),
})

const reeducationSchema = z.object({
  tanggal: z.string().min(1),
})

export class EducationController {
  constructor(private service: EducationService) {}

  // === TOPICS ===

  listTopics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = topicFiltersSchema.parse(req.query)
      const data = await this.service.listTopics(filters, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  getTopic = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getTopic(req.params.id, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  createTopic = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = createTopicSchema.parse(req.body)
      const data = await this.service.createTopic(body, req.tenantSchema!)
      res.status(201).json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  updateTopic = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = updateTopicSchema.parse(req.body)
      const data = await this.service.updateTopic(req.params.id, body, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  deleteTopic = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.deleteTopic(req.params.id, req.tenantSchema!)
      res.json({ success: true, message: 'Topik edukasi berhasil dihapus' })
    } catch (error) {
      next(error)
    }
  }

  getTopicCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getTopicCategories(req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  // === RECORDS ===

  createRecord = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = createRecordSchema.parse(req.body)
      const data = await this.service.createRecord(body, req.userId!, req.tenantSchema!)
      res.status(201).json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  getRecord = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getRecord(req.params.id, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  updateRecord = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = updateRecordSchema.parse(req.body)
      const data = await this.service.updateRecord(req.params.id, body, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  deleteRecord = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.deleteRecord(req.params.id, req.tenantSchema!)
      res.json({ success: true, message: 'Catatan edukasi berhasil dihapus' })
    } catch (error) {
      next(error)
    }
  }

  listByVisit = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.listByVisit(req.params.visitId, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  listByPatient = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.listByPatient(req.params.patientId, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  verifyRecord = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = verifySchema.parse(req.body)
      const data = await this.service.verifyRecord(
        req.params.id,
        body.signature_data,
        req.tenantSchema!,
      )
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  scheduleReeducation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = reeducationSchema.parse(req.body)
      const data = await this.service.scheduleReeducation(
        req.params.id,
        body.tanggal,
        req.tenantSchema!,
      )
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  listPendingReeducation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.listPendingReeducation(req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  // === STATS ===

  getStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getEducationStats(req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  getStatsByVisit = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getEducationStatsByVisit(
        req.params.visitId,
        req.tenantSchema!,
      )
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }
}
