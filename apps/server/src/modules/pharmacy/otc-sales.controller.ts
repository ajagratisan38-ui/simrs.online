import { Request, Response, NextFunction } from 'express'
import { OtcSalesService } from './otc-sales.service'
import { z } from 'zod'

const createSaleSchema = z.object({
  nama_pembeli: z.string().max(200).optional(),
  items: z.array(z.object({
    drug_id: z.string().uuid(),
    jumlah: z.number().int().min(1),
    harga_satuan: z.number().min(0),
  })).min(1),
  metode_bayar: z.enum(['tunai', 'qris', 'debit', 'kredit']),
  diskon_persen: z.number().min(0).max(100).optional(),
  catatan: z.string().max(500).optional(),
})

export class OtcSalesController {
  constructor(private service: OtcSalesService) {}

  createSale = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createSaleSchema.parse(req.body)
      const sale = await this.service.createSale(data, req.userId!, req.tenantSchema!)
      res.status(201).json({ success: true, data: sale })
    } catch (error) {
      next(error)
    }
  }

  listSales = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query.page) || 1
      const limit = Number(req.query.limit) || 20
      const dateFrom = req.query.date_from as string | undefined
      const dateTo = req.query.date_to as string | undefined
      const result = await this.service.listSales(req.tenantSchema!, page, limit, dateFrom, dateTo)
      res.json({ success: true, data: result.data, meta: result.meta })
    } catch (error) {
      next(error)
    }
  }

  getSale = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sale = await this.service.getSale(req.params.id, req.tenantSchema!)
      res.json({ success: true, data: sale })
    } catch (error) {
      next(error)
    }
  }

  getDailySummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const date = (req.query.date as string) || new Date().toISOString().slice(0, 10)
      const summary = await this.service.getDailySummary(req.tenantSchema!, date)
      res.json({ success: true, data: summary })
    } catch (error) {
      next(error)
    }
  }
}
