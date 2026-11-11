import { Request, Response, NextFunction } from 'express'
import { PatientService } from './patient.service'
import {
  createPatientSchema,
  updatePatientSchema,
  searchPatientSchema,
  duplicateCheckSchema,
  mergePatientSchema,
} from './patient.validator'

export class PatientController {
  constructor(private patientService: PatientService) {}

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = searchPatientSchema.parse(req.query)
      const result = await this.patientService.search(
        filters,
        req.tenantSchema!,
      )

      res.json({ success: true, data: result.data, meta: result.meta })
    } catch (error) {
      next(error)
    }
  }

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { patient, visits } = await this.patientService.getHistory(
        req.params.id,
        req.tenantSchema!,
      )

      res.json({ success: true, data: { ...patient, visits } })
    } catch (error) {
      next(error)
    }
  }

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createPatientSchema.parse(req.body)
      const patient = await this.patientService.create(
        data,
        req.tenantSchema!,
        req.userId!,
      )

      res.status(201).json({ success: true, data: patient })
    } catch (error) {
      next(error)
    }
  }

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = updatePatientSchema.parse(req.body)
      const patient = await this.patientService.update(
        req.params.id,
        data,
        req.tenantSchema!,
        req.userId!,
      )

      res.json({ success: true, data: patient })
    } catch (error) {
      next(error)
    }
  }

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.patientService.softDelete(
        req.params.id,
        req.tenantSchema!,
        req.userId!,
      )

      res.json({ success: true, data: { message: 'Pasien berhasil dihapus' } })
    } catch (error) {
      next(error)
    }
  }

  duplicateCheck = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { nik } = duplicateCheckSchema.parse(req.body)
      const existing = await this.patientService.checkDuplicate(
        nik,
        req.tenantSchema!,
      )

      res.json({
        success: true,
        data: {
          isDuplicate: !!existing,
          patient: existing,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  merge = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { primaryId, duplicateId } = mergePatientSchema.parse(req.body)
      const merged = await this.patientService.merge(
        primaryId,
        duplicateId,
        req.tenantSchema!,
        req.userId!,
      )

      res.json({ success: true, data: merged })
    } catch (error) {
      next(error)
    }
  }
}
