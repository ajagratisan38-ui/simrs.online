import { Request, Response, NextFunction } from 'express'
import { UserManagementService } from './user-management.service'
import { z } from 'zod'

const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  role: z.string().min(1),
  is_active: z.boolean().optional(),
})

const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  role: z.string().min(1).optional(),
  is_active: z.boolean().optional(),
})

const resetPasswordSchema = z.object({
  new_password: z.string().min(8).max(100),
})

export class UserManagementController {
  constructor(private service: UserManagementService) {}

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query.page) || 1
      const limit = Number(req.query.limit) || 20
      const search = req.query.search as string | undefined
      const result = await this.service.listUsers(req.tenantSchema!, page, limit, search)
      res.json({ success: true, data: result.data, meta: result.meta })
    } catch (error) {
      next(error)
    }
  }

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await this.service.getUserById(req.params.id, req.tenantSchema!)
      res.json({ success: true, data: user })
    } catch (error) {
      next(error)
    }
  }

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createUserSchema.parse(req.body)
      const user = await this.service.createUser(data, req.userId!, req.tenantSchema!)
      res.status(201).json({ success: true, data: user })
    } catch (error) {
      next(error)
    }
  }

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = updateUserSchema.parse(req.body)
      const user = await this.service.updateUser(req.params.id, data, req.userId!, req.tenantSchema!)
      res.json({ success: true, data: user })
    } catch (error) {
      next(error)
    }
  }

  resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { new_password } = resetPasswordSchema.parse(req.body)
      await this.service.resetPassword(req.params.id, new_password, req.userId!, req.tenantSchema!)
      res.json({ success: true, data: { message: 'Password berhasil direset' } })
    } catch (error) {
      next(error)
    }
  }

  remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.deleteUser(req.params.id, req.userId!, req.tenantSchema!)
      res.json({ success: true, data: { message: 'Pengguna berhasil dihapus' } })
    } catch (error) {
      next(error)
    }
  }
}
