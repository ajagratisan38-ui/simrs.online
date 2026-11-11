import { Request, Response, NextFunction } from 'express'
import { SurgeryService } from './surgery.service'
import { z } from 'zod'

const createSurgerySchema = z.object({
  visit_id: z.string().uuid(),
  patient_id: z.string().uuid(),
  doctor_id: z.string().uuid(),
  tanggal_operasi: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  jam_mulai: z.string().regex(/^\d{2}:\d{2}$/),
  estimasi_durasi_menit: z.number().int().min(15).max(720),
  ruang_operasi: z.string().min(1).max(50),
  jenis_operasi: z.enum(['elektif', 'cito', 'emergency']),
  jenis_anestesi: z.enum(['general', 'regional', 'lokal', 'sedasi']),
  diagnosis_pre_op: z.string().min(1).max(500),
  tindakan_rencana: z.string().min(1).max(500),
  icd9cm_code: z.string().optional(),
  catatan: z.string().max(1000).optional(),
})

const updateSurgerySchema = z.object({
  status: z.enum(['dijadwalkan', 'persiapan', 'berjalan', 'selesai', 'batal']).optional(),
  jam_mulai_aktual: z.string().optional(),
  jam_selesai: z.string().optional(),
  diagnosis_post_op: z.string().max(500).optional(),
  tindakan_aktual: z.string().max(500).optional(),
  laporan_operasi: z.string().max(5000).optional(),
  komplikasi: z.string().max(1000).optional(),
  anestesiolog_id: z.string().uuid().optional(),
  perawat_instrumen: z.string().max(200).optional(),
  perawat_sirkuler: z.string().max(200).optional(),
  perdarahan_ml: z.number().int().min(0).optional(),
  jaringan_dieksisi: z.string().max(500).optional(),
  specimen_patologi: z.boolean().optional(),
  durasi_aktual_menit: z.number().int().min(0).optional(),
  klasifikasi_luka: z.string().max(30).optional(),
  catatan: z.string().max(1000).optional(),
})

const teamSchema = z.array(z.object({
  nama: z.string().min(1).max(200),
  peran: z.enum([
    'operator_utama', 'operator_asisten', 'anestesiolog', 'penata_anestesi',
    'perawat_instrumen', 'perawat_sirkuler', 'perawat_onloop', 'lainnya',
  ]),
  no_sip: z.string().max(50).optional(),
  catatan: z.string().max(200).optional(),
}))

const instrumentsSchema = z.array(z.object({
  nama_instrumen: z.string().min(1).max(200),
  jumlah: z.number().int().min(1).default(1),
  keterangan: z.string().max(300).optional(),
  status_steril: z.boolean().optional(),
  dikembalikan: z.boolean().optional(),
}))

const anesthesiaSchema = z.object({
  jenis_anestesi: z.string().min(1).max(30),
  teknik: z.string().max(200).optional(),
  obat_anestesi: z.string().max(2000).optional(),
  dosis: z.string().max(500).optional(),
  asa_ps: z.string().max(10).optional(),
  mallampati: z.string().max(10).optional(),
  airway_management: z.string().max(2000).optional(),
  posisi_pasien: z.string().max(100).optional(),
  monitoring: z.string().max(2000).optional(),
  cairan_masuk: z.string().max(500).optional(),
  cairan_keluar: z.string().max(500).optional(),
  komplikasi_anestesi: z.string().max(1000).optional(),
  catatan: z.string().max(2000).optional(),
})

const nursingSchema = z.object({
  fase: z.enum(['pre', 'intra', 'post']),
  perawat_nama: z.string().min(1).max(200),
  identitas_verified: z.boolean().optional(),
  site_marking: z.boolean().optional(),
  consent_signed: z.boolean().optional(),
  puasa_verified: z.boolean().optional(),
  alergi_checked: z.boolean().optional(),
  gigi_palsu_removed: z.boolean().optional(),
  perhiasan_removed: z.boolean().optional(),
  iv_line_terpasang: z.boolean().optional(),
  darah_tersedia: z.boolean().optional(),
  time_out_done: z.boolean().optional(),
  counting_kasa_pre: z.number().int().optional(),
  counting_kasa_post: z.number().int().optional(),
  counting_instrumen_pre: z.number().int().optional(),
  counting_instrumen_post: z.number().int().optional(),
  posisi_pasien: z.string().max(100).optional(),
  pemakaian_diatermi: z.boolean().optional(),
  drain_terpasang: z.boolean().optional(),
  specimen_ada: z.boolean().optional(),
  specimen_label: z.string().max(200).optional(),
  kesadaran_post: z.string().max(50).optional(),
  vital_signs_post: z.record(z.unknown()).optional(),
  skala_nyeri_post: z.number().int().min(0).max(10).optional(),
  balutan_kondisi: z.string().max(200).optional(),
  drain_output: z.string().max(100).optional(),
  instruksi_post_op: z.string().max(2000).optional(),
  catatan: z.string().max(2000).optional(),
})

export class SurgeryController {
  constructor(private service: SurgeryService) {}

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createSurgerySchema.parse(req.body)
      const surgery = await this.service.createSurgery(data, req.userId!, req.tenantSchema!)
      res.status(201).json({ success: true, data: surgery })
    } catch (error) { next(error) }
  }

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = updateSurgerySchema.parse(req.body)
      const surgery = await this.service.updateSurgery(req.params.id, data, req.userId!, req.tenantSchema!)
      res.json({ success: true, data: surgery })
    } catch (error) { next(error) }
  }

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.listSurgeries(req.tenantSchema!, {
        status: req.query.status as string | undefined,
        tanggal: req.query.tanggal as string | undefined,
        ruang: req.query.ruang as string | undefined,
        doctor_id: req.query.doctor_id as string | undefined,
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
      })
      res.json({ success: true, data: result.data, meta: result.meta })
    } catch (error) { next(error) }
  }

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const surgery = await this.service.getSurgery(req.params.id, req.tenantSchema!)
      res.json({ success: true, data: surgery })
    } catch (error) { next(error) }
  }

  todaySchedule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.getTodaySchedule(req.tenantSchema!)
      res.json({ success: true, data: result.data, meta: result.meta })
    } catch (error) { next(error) }
  }

  getFullDetail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getFullSurgeryDetail(req.params.id, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  // Tim Bedah
  getTeam = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getTeamMembers(req.params.id, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  setTeam = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const members = teamSchema.parse(req.body.members || req.body)
      const data = await this.service.setTeamMembers(req.params.id, members, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  // Instrumen
  getInstruments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getInstruments(req.params.id, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  setInstruments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const instruments = instrumentsSchema.parse(req.body.instruments || req.body)
      const data = await this.service.setInstruments(req.params.id, instruments, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  // Anestesi
  getAnesthesia = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getAnesthesia(req.params.id, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  upsertAnesthesia = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = anesthesiaSchema.parse(req.body)
      const data = await this.service.upsertAnesthesia(req.params.id, body, req.userId!, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  // Keperawatan Perioperatif
  getNursing = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getNursingRecords(req.params.id, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  upsertNursing = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = nursingSchema.parse(req.body)
      const data = await this.service.upsertNursingRecord(req.params.id, body, req.userId!, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }
}
