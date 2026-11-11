import { Request, Response, NextFunction } from 'express'
import { NursingService } from './nursing.service'
import { z } from 'zod'

const nursingSchema = z.object({
  visit_id: z.string().uuid(),
  keluhan_utama: z.string().optional(),
  riwayat_penyakit_sekarang: z.string().optional(),
  riwayat_penyakit_dahulu: z.string().optional(),
  riwayat_alergi: z.string().optional(),
  riwayat_pengobatan: z.string().optional(),
  tekanan_darah_sistolik: z.coerce.number().int().min(0).max(300).optional(),
  tekanan_darah_diastolik: z.coerce.number().int().min(0).max(200).optional(),
  nadi: z.coerce.number().int().min(0).max(250).optional(),
  suhu: z.coerce.number().min(30).max(45).optional(),
  respirasi: z.coerce.number().int().min(0).max(60).optional(),
  spo2: z.coerce.number().int().min(0).max(100).optional(),
  tinggi_badan: z.coerce.number().min(0).max(250).optional(),
  berat_badan: z.coerce.number().min(0).max(500).optional(),
  nyeri_ada: z.boolean().default(false),
  nyeri_skala: z.coerce.number().int().min(0).max(10).default(0),
  nyeri_lokasi: z.string().optional(),
  nyeri_karakteristik: z.string().optional(),
  nyeri_durasi: z.string().optional(),
  nyeri_frekuensi: z.string().optional(),
  nyeri_penyebab: z.string().optional(),
  jatuh_riwayat: z.boolean().default(false),
  jatuh_diagnosis_sekunder: z.boolean().default(false),
  jatuh_alat_bantu: z.enum(['tidak_ada', 'kruk_tongkat_walker', 'furniture']).default('tidak_ada'),
  jatuh_terpasang_infus: z.boolean().default(false),
  jatuh_cara_berjalan: z.enum(['normal', 'lemah', 'terganggu']).default('normal'),
  jatuh_status_mental: z.enum(['orientasi_baik', 'lupa_keterbatasan']).default('orientasi_baik'),
  barthel_makan: z.coerce.number().int().min(0).max(10).default(10),
  barthel_mandi: z.coerce.number().int().min(0).max(5).default(5),
  barthel_perawatan_diri: z.coerce.number().int().min(0).max(5).default(5),
  barthel_berpakaian: z.coerce.number().int().min(0).max(10).default(10),
  barthel_bab: z.coerce.number().int().min(0).max(10).default(10),
  barthel_bak: z.coerce.number().int().min(0).max(10).default(10),
  barthel_toileting: z.coerce.number().int().min(0).max(10).default(10),
  barthel_transfer: z.coerce.number().int().min(0).max(15).default(15),
  barthel_mobilitas: z.coerce.number().int().min(0).max(15).default(15),
  barthel_naik_tangga: z.coerce.number().int().min(0).max(10).default(10),
  nutrisi_penurunan_bb: z.boolean().default(false),
  nutrisi_asupan_kurang: z.boolean().default(false),
  nutrisi_kondisi_khusus: z.boolean().default(false),
  psikososial_status: z.string().optional(),
  psikososial_hubungan_keluarga: z.string().optional(),
  spiritual_agama: z.string().optional(),
  spiritual_kebutuhan: z.string().optional(),
  edukasi_hambatan: z.string().optional(),
  edukasi_kebutuhan: z.string().optional(),
  edukasi_diberikan: z.string().optional(),
  discharge_plan: z.string().optional(),
  data_tambahan: z.record(z.unknown()).optional(),
})

export class NursingController {
  constructor(private service: NursingService) {}

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = nursingSchema.parse(req.body)
      const data = await this.service.create(body, req.userId!, req.tenantSchema!)
      res.status(201).json({ success: true, data })
    } catch (error) { next(error) }
  }

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = nursingSchema.partial().omit({ visit_id: true }).parse(req.body)
      const data = await this.service.update(
        req.params.id, body, req.userId!, req.tenantSchema!,
      )
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  finalize = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.finalize(
        req.params.id, req.userId!, req.tenantSchema!,
      )
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  getByVisit = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getByVisit(
        req.params.visitId, req.tenantSchema!,
      )
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getById(req.params.id, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  listByPatient = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.listByPatient(
        req.params.patientId, req.tenantSchema!,
      )
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.delete(req.params.id, req.tenantSchema!)
      res.json({ success: true, data: { message: 'Pengkajian berhasil dihapus' } })
    } catch (error) { next(error) }
  }
}
