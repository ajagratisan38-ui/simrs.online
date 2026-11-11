import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { OnboardingService } from './onboarding.service'

const profileSchema = z.object({
  name: z.string().min(3).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  logo_url: z.string().optional(),
  settings: z.record(z.unknown()).optional(),
})

const roomSchema = z.object({
  kode: z.string().min(1, 'Kode poli wajib diisi'),
  nama: z.string().min(2, 'Nama poli wajib diisi'),
  tipe: z.string().default('poli'),
})

const doctorSchema = z.object({
  name: z.string().min(2, 'Nama dokter wajib diisi'),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  sip: z.string().optional(),
  spesialisasi: z.string().optional(),
})

export class OnboardingController {
  constructor(private service: OnboardingService) {}

  getStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = await this.service.getStatus(
        req.tenantId!,
        req.tenantSchema || `tenant_${req.tenantId}`,
      )
      res.json({ success: true, data: status })
    } catch (error) {
      next(error)
    }
  }

  updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = profileSchema.parse(req.body)
      await this.service.updateProfile(req.tenantId!, data)
      res.json({ success: true, message: 'Profil RS berhasil diupdate' })
    } catch (error) {
      next(error)
    }
  }

  addRoom = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = roomSchema.parse(req.body)
      const schema = req.tenantSchema || `tenant_${req.tenantId}`
      const result = await this.service.addRoom(schema, data)
      res.status(201).json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  addDoctor = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = doctorSchema.parse(req.body)
      const schema = req.tenantSchema || `tenant_${req.tenantId}`
      const passwordHash = await bcrypt.hash(data.password, 12)
      const result = await this.service.addDoctor(schema, {
        name: data.name,
        email: data.email,
        password_hash: passwordHash,
        sip: data.sip,
        spesialisasi: data.spesialisasi,
      })
      res.status(201).json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  complete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.completeOnboarding(req.tenantId!)
      res.json({ success: true, message: 'Onboarding selesai!' })
    } catch (error) {
      next(error)
    }
  }

  skip = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.skipOnboarding(req.tenantId!)
      res.json({ success: true, message: 'Onboarding dilewati' })
    } catch (error) {
      next(error)
    }
  }
}
