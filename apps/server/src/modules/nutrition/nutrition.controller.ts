import { Request, Response, NextFunction } from 'express'
import { NutritionService } from './nutrition.service'
import { z } from 'zod'

const assessmentSchema = z.object({
  bb: z.number().min(0.5).max(500).optional(),
  tb: z.number().min(20).max(300).optional(),
  imt: z.number().min(5).max(80).optional(),
  lla: z.number().min(5).max(100).optional(),
  albumin: z.number().min(0).max(10).optional(),
  hb: z.number().min(0).max(30).optional(),
  gds: z.number().min(0).max(1000).optional(),
  fisik: z.string().max(1000).optional(),
  riwayat_makan: z.string().max(1000).optional(),
  riwayat_penyakit: z.string().max(1000).optional(),
}).optional()

const interventionSchema = z.object({
  jenis_diet: z.string().max(100).optional(),
  bentuk_makanan: z.enum(['biasa', 'lunak', 'saring', 'cair']).optional(),
  jalur_pemberian: z.enum(['oral', 'ngt', 'parenteral', 'kombinasi']).optional(),
  frekuensi: z.string().max(100).optional(),
  keterangan: z.string().max(1000).optional(),
}).optional()

const monitoringSchema = z.object({
  parameter: z.array(z.string()).optional(),
  frekuensi: z.string().max(100).optional(),
  catatan: z.string().max(1000).optional(),
}).optional()

const evaluationSchema = z.object({
  hasil: z.enum(['membaik', 'memburuk', 'tetap']).optional(),
  target_tercapai: z.boolean().optional(),
  catatan: z.string().max(1000).optional(),
  tindak_lanjut: z.string().max(1000).optional(),
}).optional()

const createOrderSchema = z.object({
  visit_id: z.string().uuid(),
  patient_id: z.string().uuid(),
  diet_type: z.string().min(1).max(100),
  kalori_target: z.number().min(500).max(5000),
  protein_target: z.number().min(0).optional(),
  karbohidrat_target: z.number().min(0).optional(),
  lemak_target: z.number().min(0).optional(),
  catatan_diet: z.string().max(1000).optional(),
  alergi_makanan: z.array(z.string()).optional(),
  pantangan: z.array(z.string()).optional(),
  assessment: assessmentSchema,
  diagnosis_gizi: z.string().max(2000).optional(),
  intervention: interventionSchema,
  monitoring: monitoringSchema,
  evaluation: evaluationSchema,
})

const addLogSchema = z.object({
  nutrition_order_id: z.string().uuid(),
  waktu_makan: z.enum(['pagi', 'siang', 'sore', 'snack_pagi', 'snack_sore']),
  menu: z.string().min(1).max(500),
  porsi_disajikan: z.number().min(0).max(100),
  porsi_dimakan: z.number().min(0).max(100),
  catatan: z.string().max(500).optional(),
})

const updateOrderSchema = z.object({
  diet_type: z.string().min(1).max(100).optional(),
  kalori_target: z.number().min(500).max(5000).optional(),
  protein_target: z.number().min(0).optional(),
  karbohidrat_target: z.number().min(0).optional(),
  lemak_target: z.number().min(0).optional(),
  catatan_diet: z.string().max(1000).optional(),
  alergi_makanan: z.array(z.string()).optional(),
  pantangan: z.array(z.string()).optional(),
  status: z.enum(['aktif', 'selesai']).optional(),
  assessment: assessmentSchema,
  diagnosis_gizi: z.string().max(2000).optional(),
  intervention: interventionSchema,
  monitoring: monitoringSchema,
  evaluation: evaluationSchema,
})

export class NutritionController {
  constructor(private service: NutritionService) {}

  createOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createOrderSchema.parse(req.body)
      const order = await this.service.createOrder(data, req.userId!, req.tenantSchema!)
      res.status(201).json({ success: true, data: order })
    } catch (error) {
      next(error)
    }
  }

  updateOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = updateOrderSchema.parse(req.body)
      const order = await this.service.updateOrder(
        req.params.id, data, req.userId!, req.tenantSchema!,
      )
      res.json({ success: true, data: order })
    } catch (error) {
      next(error)
    }
  }

  addLog = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = addLogSchema.parse(req.body)
      const log = await this.service.addLog(data, req.userId!, req.tenantSchema!)
      res.status(201).json({ success: true, data: log })
    } catch (error) {
      next(error)
    }
  }

  listOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = req.query.status as string | undefined
      const page = Number(req.query.page) || 1
      const limit = Number(req.query.limit) || 20
      const result = await this.service.listOrders(req.tenantSchema!, status, page, limit)
      res.json({ success: true, data: result.data, meta: result.meta })
    } catch (error) {
      next(error)
    }
  }

  getOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = await this.service.getOrderWithLogs(req.params.id, req.tenantSchema!)
      res.json({ success: true, data: order })
    } catch (error) {
      next(error)
    }
  }

  getByVisit = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orders = await this.service.getByVisit(req.params.visitId, req.tenantSchema!)
      res.json({ success: true, data: orders })
    } catch (error) {
      next(error)
    }
  }

  // Nutrition Calculator
  calculate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        bb: z.number().min(1).max(500),
        tb: z.number().min(30).max(300),
        umur: z.number().min(0).max(150),
        jenis_kelamin: z.enum(['L', 'P']),
        aktivitas: z.enum(['bedrest', 'ringan', 'sedang', 'berat']),
        stress_factor: z.number().min(0.5).max(3).optional(),
      })
      const data = schema.parse(req.body)
      const result = this.service.calculateNeeds(data)
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  // Food Items
  listFoodItems = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const items = await this.service.listFoodItems(
        req.tenantSchema!,
        req.query.kategori as string | undefined,
        req.query.search as string | undefined,
      )
      res.json({ success: true, data: items })
    } catch (error) {
      next(error)
    }
  }

  createFoodItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        nama: z.string().min(1).max(200),
        kategori: z.string().min(1),
        satuan: z.string().max(30).default('gram'),
        kalori_per_unit: z.number().min(0).default(0),
        protein_per_unit: z.number().min(0).default(0),
        karbohidrat_per_unit: z.number().min(0).default(0),
        lemak_per_unit: z.number().min(0).default(0),
        harga_per_unit: z.number().min(0).default(0),
      })
      const data = schema.parse(req.body)
      const item = await this.service.createFoodItem(data, req.tenantSchema!)
      res.status(201).json({ success: true, data: item })
    } catch (error) {
      next(error)
    }
  }

  updateFoodItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await this.service.updateFoodItem(req.params.id, req.body, req.tenantSchema!)
      res.json({ success: true, data: item })
    } catch (error) {
      next(error)
    }
  }

  deleteFoodItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.deleteFoodItem(req.params.id, req.tenantSchema!)
      res.json({ success: true, message: 'Bahan makanan dihapus' })
    } catch (error) {
      next(error)
    }
  }

  // Meal Plans
  listMealPlans = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const plans = await this.service.listMealPlans(req.tenantSchema!, req.query.search as string | undefined)
      res.json({ success: true, data: plans })
    } catch (error) {
      next(error)
    }
  }

  getMealPlan = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const plan = await this.service.getMealPlan(req.params.id, req.tenantSchema!)
      res.json({ success: true, data: plan })
    } catch (error) {
      next(error)
    }
  }

  createMealPlan = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        nama: z.string().min(1).max(200),
        diet_type: z.string().min(1).max(100),
        catatan: z.string().max(1000).optional(),
        items: z.array(z.object({
          waktu_makan: z.enum(['pagi', 'snack_pagi', 'siang', 'snack_sore', 'sore']),
          food_item_id: z.string().uuid().optional(),
          nama_menu: z.string().min(1).max(300),
          porsi: z.number().min(0).default(1),
          satuan: z.string().max(30).default('porsi'),
          kalori: z.number().min(0).default(0),
          protein: z.number().min(0).default(0),
          karbohidrat: z.number().min(0).default(0),
          lemak: z.number().min(0).default(0),
          harga: z.number().min(0).default(0),
        })),
      })
      const data = schema.parse(req.body)
      const plan = await this.service.createMealPlan(data, req.userId!, req.tenantSchema!)
      res.status(201).json({ success: true, data: plan })
    } catch (error) {
      next(error)
    }
  }

  deleteMealPlan = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.deleteMealPlan(req.params.id, req.tenantSchema!)
      res.json({ success: true, message: 'Meal plan dihapus' })
    } catch (error) {
      next(error)
    }
  }

  // Food Cost Summary
  foodCostSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.getFoodCostSummary(
        req.tenantSchema!,
        req.query.from as string | undefined,
        req.query.to as string | undefined,
      )
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }
}
