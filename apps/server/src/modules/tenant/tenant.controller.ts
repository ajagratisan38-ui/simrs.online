import { Request, Response, NextFunction } from 'express'
import { TenantService } from './tenant.service'
import { NotFoundError, ValidationError } from '../../shared/errors'

export class TenantController {
  constructor(private service: TenantService) {}

  getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await this.service.getProfile(req.tenantId!)
      if (!profile) {
        throw new NotFoundError('Profil rumah sakit')
      }

      const stats = await this.service.getStats(req.tenantSchema!)

      res.json({
        success: true,
        data: { ...profile, stats },
      })
    } catch (error) {
      next(error)
    }
  }

  updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, address, phone, email, logo_url, settings } = req.body

      if (!name && !address && !phone && !email && !logo_url && !settings) {
        throw new ValidationError('Minimal satu field harus diisi')
      }

      const updated = await this.service.updateProfile(req.tenantId!, {
        name,
        address,
        phone,
        email,
        logo_url,
        settings,
      })

      if (!updated) {
        throw new NotFoundError('Profil rumah sakit')
      }

      res.json({ success: true, data: updated })
    } catch (error) {
      next(error)
    }
  }
}
