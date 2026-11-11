import { Request, Response, NextFunction } from 'express'
import { WarehouseService } from './warehouse.service'
import { z } from 'zod'

const createItemSchema = z.object({
  kode: z.string().min(1).max(30),
  nama: z.string().min(1).max(200),
  kategori: z.enum(['alkes', 'bhp', 'atk', 'linen', 'cleaning', 'rt', 'lain_lain']).default('lain_lain'),
  satuan: z.string().default('pcs'),
  harga_beli: z.coerce.number().min(0).default(0),
  stok_minimum: z.coerce.number().int().min(0).default(5),
  lokasi: z.string().optional(),
})

const addStockSchema = z.object({
  item_id: z.string().uuid(),
  jumlah: z.coerce.number().int().min(1),
  batch_number: z.string().optional(),
  tanggal_kadaluarsa: z.string().optional(),
  harga_beli_per_unit: z.coerce.number().min(0).optional(),
  supplier: z.string().optional(),
})

const createOpnameSchema = z.object({
  tipe: z.enum(['farmasi', 'gudang']),
  catatan: z.string().optional(),
})

const inputCountSchema = z.object({
  stok_fisik: z.coerce.number().int().min(0),
  catatan: z.string().nullable().optional(),
})

export class WarehouseController {
  constructor(private service: WarehouseService) {}

  // ── Items CRUD ──

  listItems = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { search, kategori, page, limit } = req.query as Record<string, string>
      const result = await this.service.listItems(req.tenantSchema!, {
        search, kategori,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      })
      res.json({ success: true, ...result })
    } catch (error) { next(error) }
  }

  getItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getItem(req.params.id, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  createItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = createItemSchema.parse(req.body)
      const data = await this.service.createItem(body, req.tenantSchema!)
      res.status(201).json({ success: true, data })
    } catch (error) { next(error) }
  }

  updateItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = createItemSchema.partial().parse(req.body)
      const data = await this.service.updateItem(req.params.id, body, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  deleteItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.deleteItem(req.params.id, req.tenantSchema!)
      res.json({ success: true, data: { message: 'Barang berhasil dihapus' } })
    } catch (error) { next(error) }
  }

  addStock = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = addStockSchema.parse(req.body)
      const data = await this.service.addStock(body, req.userId!, req.tenantSchema!)
      res.status(201).json({ success: true, data })
    } catch (error) { next(error) }
  }

  // ── Stock Opname ──

  createOpname = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = createOpnameSchema.parse(req.body)
      const data = await this.service.createOpname(body, req.userId!, req.tenantSchema!)
      res.status(201).json({ success: true, data })
    } catch (error) { next(error) }
  }

  listOpnames = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, tipe, page, limit } = req.query as Record<string, string>
      const result = await this.service.listOpnames(req.tenantSchema!, {
        status, tipe,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      })
      res.json({ success: true, ...result })
    } catch (error) { next(error) }
  }

  getOpname = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getOpname(req.params.id, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  inputCount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = inputCountSchema.parse(req.body)
      const data = await this.service.inputOpnameCount(
        req.params.opnameId, req.params.itemId,
        body.stok_fisik, body.catatan ?? null, req.tenantSchema!,
      )
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  completeOpname = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.completeOpname(
        req.params.id, req.userId!, req.tenantSchema!,
      )
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  cancelOpname = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.cancelOpname(req.params.id, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }
}
