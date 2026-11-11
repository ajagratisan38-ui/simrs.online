import { Request, Response, NextFunction } from 'express'
import { PurchaseOrderService } from './po.service'
import { z } from 'zod'

const createSupplierSchema = z.object({
  kode: z.string().min(1).max(30),
  nama: z.string().min(1).max(200),
  alamat: z.string().optional(),
  kota: z.string().optional(),
  telepon: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  kontak_person: z.string().optional(),
  npwp: z.string().optional(),
  catatan: z.string().optional(),
})

const updateSupplierSchema = z.object({
  nama: z.string().min(1).optional(),
  alamat: z.string().optional(),
  kota: z.string().optional(),
  telepon: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  kontak_person: z.string().optional(),
  npwp: z.string().optional(),
  catatan: z.string().optional(),
  is_active: z.boolean().optional(),
})

const createPOSchema = z.object({
  supplier_id: z.string().uuid(),
  tanggal_dibutuhkan: z.string().optional(),
  catatan: z.string().optional(),
  diskon: z.number().min(0).optional(),
  ppn_persen: z.number().min(0).max(100).optional(),
  items: z.array(z.object({
    drug_id: z.string().uuid(),
    drug_nama: z.string().min(1),
    satuan: z.string().min(1),
    jumlah: z.number().int().min(1),
    harga_satuan: z.number().min(0),
  })).min(1),
})

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  supplier_id: z.string().uuid().optional(),
  search: z.string().optional(),
})

const updateStatusSchema = z.object({
  status: z.enum(['approved', 'ordered', 'received', 'completed', 'cancelled']),
  catatan_penerimaan: z.string().optional(),
})

const receiveItemsSchema = z.object({
  items: z.array(z.object({
    item_id: z.string().uuid(),
    jumlah_diterima: z.number().int().min(0),
    batch_number: z.string().optional(),
    tanggal_kadaluarsa: z.string().optional(),
  })).min(1),
})

export class PurchaseOrderController {
  constructor(private service: PurchaseOrderService) {}

  // --- Supplier endpoints ---

  listSuppliers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.listSuppliers(req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  createSupplier = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createSupplierSchema.parse(req.body)
      const result = await this.service.createSupplier(data, req.tenantSchema!)
      res.status(201).json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  updateSupplier = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string
      const data = updateSupplierSchema.parse(req.body)
      const result = await this.service.updateSupplier(id, data, req.tenantSchema!)
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  deleteSupplier = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string
      await this.service.deleteSupplier(id, req.tenantSchema!)
      res.json({ success: true, message: 'Supplier berhasil dihapus' })
    } catch (error) {
      next(error)
    }
  }

  // --- PO endpoints ---

  createPO = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createPOSchema.parse(req.body)
      const result = await this.service.createPO(data, req.userId!, req.tenantSchema!)
      res.status(201).json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  listPO = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = listQuerySchema.parse(req.query)
      const result = await this.service.listPO(filters, req.tenantSchema!)
      res.json({ success: true, ...result })
    } catch (error) {
      next(error)
    }
  }

  getPO = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string
      const result = await this.service.getById(id, req.tenantSchema!)
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  updateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string
      const { status, catatan_penerimaan } = updateStatusSchema.parse(req.body)
      const result = await this.service.updateStatus(
        id, status, req.userId!, req.tenantSchema!,
        { catatan_penerimaan },
      )
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  receiveItems = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string
      const { items } = receiveItemsSchema.parse(req.body)
      const result = await this.service.receiveItems(
        id, items, req.userId!, req.tenantSchema!,
      )
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }
}
