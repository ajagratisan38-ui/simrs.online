import { Request, Response, NextFunction } from 'express'
import { RegistrationService } from './registration.service'
import {
  createVisitSchema,
  updateVisitStatusSchema,
  listVisitsSchema,
  cancelVisitSchema,
} from './registration.validator'
import { getTodayWIB } from '../../shared/timezone'

export class RegistrationController {
  constructor(private registrationService: RegistrationService) {}

  createVisit = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createVisitSchema.parse(req.body)
      const result = await this.registrationService.createVisit(
        data,
        req.tenantSchema!,
        req.userId!,
      )

      res.status(201).json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  listVisits = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = listVisitsSchema.parse(req.query)
      const result = await this.registrationService.listVisits(
        filters,
        req.tenantSchema!,
      )

      res.json({ success: true, data: result.data, meta: result.meta })
    } catch (error) {
      next(error)
    }
  }

  getVisit = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const visit = await this.registrationService.getVisitById(
        req.params.id,
        req.tenantSchema!,
      )

      res.json({ success: true, data: visit })
    } catch (error) {
      next(error)
    }
  }

  updateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, catatan } = updateVisitStatusSchema.parse(req.body)
      const visit = await this.registrationService.updateVisitStatus(
        req.params.id,
        status,
        req.tenantSchema!,
        req.userId!,
        catatan,
      )

      res.json({ success: true, data: visit })
    } catch (error) {
      next(error)
    }
  }

  cancelVisit = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { alasan } = cancelVisitSchema.parse(req.body)
      await this.registrationService.cancelVisit(
        req.params.id,
        alasan,
        req.tenantSchema!,
        req.userId!,
      )

      res.json({
        success: true,
        data: { message: 'Kunjungan berhasil dibatalkan' },
      })
    } catch (error) {
      next(error)
    }
  }

  getQueue = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const date = (req.query.date as string) || getTodayWIB()
      const queues = await this.registrationService.getQueue(
        req.params.roomId,
        date,
        req.tenantSchema!,
      )

      res.json({ success: true, data: queues })
    } catch (error) {
      next(error)
    }
  }

  getAllQueues = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const date = (req.query.date as string) || getTodayWIB()
      const queues = await this.registrationService.getAllQueues(
        date,
        req.tenantSchema!,
      )
      res.json({ success: true, data: queues })
    } catch (error) {
      next(error)
    }
  }

  callNext = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.registrationService.callNext(
        req.params.roomId,
        req.tenantSchema!,
      )

      if (!result) {
        res.json({
          success: true,
          data: null,
          message: 'Tidak ada antrian yang menunggu',
        })
        return
      }

      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  getDailyStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const date = (req.query.date as string) || getTodayWIB()
      const stats = await this.registrationService.getDailyStats(
        date,
        req.tenantSchema!,
      )

      res.json({ success: true, data: stats })
    } catch (error) {
      next(error)
    }
  }
}
