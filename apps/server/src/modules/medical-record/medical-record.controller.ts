import { Request, Response, NextFunction } from 'express'
import { MedicalRecordService } from './medical-record.service'
import {
  createMedicalRecordSchema,
  updateMedicalRecordSchema,
  searchIcd10Schema,
  searchIcd9cmSchema,
  patientHistorySchema,
  createTemplateSchema,
  listTemplatesSchema,
} from './medical-record.validator'

export class MedicalRecordController {
  constructor(private service: MedicalRecordService) {}

  // Resolve doctorId from request — fallback to userId if not a doctor
  private getDoctorId(req: Request): string {
    return req.body.doctor_id || req.doctorId || req.userId!
  }

  // POST /api/v1/medical-records/:visitId — buat rekam medis
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createMedicalRecordSchema.parse(req.body)
      const doctorId = this.getDoctorId(req)
      const result = await this.service.create(
        req.params.visitId,
        data,
        doctorId,
        req.userId!,
        req.tenantSchema!,
      )

      res.status(201).json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  // PUT /api/v1/medical-records/:id — update rekam medis (draft only)
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = updateMedicalRecordSchema.parse(req.body)
      const doctorId = this.getDoctorId(req)
      const result = await this.service.update(
        req.params.id,
        data,
        doctorId,
        req.userId!,
        req.tenantSchema!,
      )

      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  // PUT /api/v1/medical-records/:id/finalize — finalisasi
  finalize = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const doctorId = req.doctorId || req.userId!
      const result = await this.service.finalize(
        req.params.id,
        doctorId,
        req.userId!,
        req.tenantSchema!,
      )

      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  // GET /api/v1/medical-records/:visitId — get by visit
  getByVisit = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.getByVisit(
        req.params.visitId,
        req.tenantSchema!,
      )

      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  // GET /api/v1/medical-records/:visitId/resume — resume medis cetak
  getResumeMedis = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.getResumeMedis(
        req.params.visitId,
        req.tenantSchema!,
      )
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  // GET /api/v1/patients/:patientId/medical-records — riwayat medis
  getPatientHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = patientHistorySchema.parse(req.query)
      const result = await this.service.getPatientHistory(
        req.params.patientId,
        filters,
        req.tenantSchema!,
      )

      res.json({
        success: true,
        data: result.data,
        patient: result.patient,
        meta: result.meta,
      })
    } catch (error) {
      next(error)
    }
  }

  // GET /api/v1/icd10/search?q=xxx — search ICD-10
  searchIcd10 = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = searchIcd10Schema.parse(req.query)
      const results = await this.service.searchIcd10(filters)

      res.json({ success: true, data: results })
    } catch (error) {
      next(error)
    }
  }

  // GET /api/v1/icd9cm/search?q=xxx — search ICD-9-CM procedure codes
  searchIcd9cm = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = searchIcd9cmSchema.parse(req.query)
      const results = await this.service.searchIcd9cm(filters)
      res.json({ success: true, data: results })
    } catch (error) {
      next(error)
    }
  }

  // GET /api/v1/icd9cm/categories
  getIcd9cmCategories = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const categories = await this.service.getIcd9cmCategories()
      res.json({ success: true, data: categories })
    } catch (error) {
      next(error)
    }
  }

  // GET /api/v1/medical-templates
  listTemplates = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = listTemplatesSchema.parse(req.query)
      const doctorId = req.doctorId || null
      const results = await this.service.listTemplates(
        filters,
        doctorId,
        req.tenantSchema!,
      )

      res.json({ success: true, data: results })
    } catch (error) {
      next(error)
    }
  }

  // POST /api/v1/medical-templates
  createTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createTemplateSchema.parse(req.body)
      const doctorId = req.doctorId || null
      const result = await this.service.createTemplate(
        data,
        doctorId,
        req.tenantSchema!,
      )

      res.status(201).json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }
}
