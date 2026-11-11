import { Request, Response, NextFunction } from 'express'
import { IGDService } from './igd.service'
import { ValidationError } from '../../shared/errors'

const VALID_TRIAGE = ['1', '2', '3', '4', '5'] as const
const VALID_DISPOSITION = ['pulang', 'rawat_inap', 'rujuk', 'meninggal', 'aps', 'observasi'] as const

export class IGDController {
  constructor(private service: IGDService) {}

  getBoard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const date = req.query.date as string | undefined
      const board = await this.service.getBoard(req.tenantSchema!, date)
      res.json({ success: true, data: board })
    } catch (error) {
      next(error)
    }
  }

  getStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await this.service.getStats(req.tenantSchema!)
      res.json({ success: true, data: stats })
    } catch (error) {
      next(error)
    }
  }

  setTriage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const visitId = req.params.visitId
      if (!visitId) throw new ValidationError('Visit ID wajib diisi')

      const { triageLevel, igdBedNumber } = req.body

      if (!triageLevel || !VALID_TRIAGE.includes(triageLevel)) {
        throw new ValidationError('Triage level harus 1-5')
      }

      const result = await this.service.setTriage(
        visitId,
        { triageLevel, igdBedNumber },
        req.tenantSchema!,
        req.userId!,
      )

      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  setResponseTime = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const visitId = req.params.visitId
      if (!visitId) throw new ValidationError('Visit ID wajib diisi')

      const result = await this.service.setResponseTime(
        visitId,
        req.tenantSchema!,
        req.userId!,
      )

      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  setDisposition = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const visitId = req.params.visitId
      if (!visitId) throw new ValidationError('Visit ID wajib diisi')

      const { disposition, notes } = req.body

      if (!disposition || !VALID_DISPOSITION.includes(disposition)) {
        throw new ValidationError(
          'Disposisi harus: pulang, rawat_inap, rujuk, meninggal, aps, atau observasi',
        )
      }

      const result = await this.service.setDisposition(
        visitId,
        { disposition, notes },
        req.tenantSchema!,
        req.userId!,
      )

      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  quickRegister = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        patientId, keluhanUtama, triageLevel, penjamin,
        caraMasuk, igdBedNumber, noRujukan, noSep, doctorId,
      } = req.body

      if (!patientId) throw new ValidationError('Patient ID wajib diisi')
      if (!keluhanUtama) throw new ValidationError('Keluhan utama wajib diisi')
      if (!triageLevel || !VALID_TRIAGE.includes(triageLevel)) {
        throw new ValidationError('Triage level harus 1-5')
      }
      if (!doctorId) throw new ValidationError('Dokter jaga wajib dipilih')

      const result = await this.service.quickRegister(
        {
          patientId,
          keluhanUtama,
          triageLevel,
          penjamin: penjamin || 'umum',
          caraMasuk: caraMasuk || 'datang_sendiri',
          igdBedNumber,
          noRujukan,
          noSep,
          doctorId,
        },
        req.tenantSchema!,
        req.userId!,
      )

      res.status(201).json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }
}
