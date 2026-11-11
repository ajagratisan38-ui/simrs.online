import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { AssetService } from './asset.service'

const createAssetSchema = z.object({
  kode: z.string().min(1),
  nama: z.string().min(1),
  kategori: z.enum([
    'medis', 'non_medis', 'kendaraan', 'bangunan', 'it', 'furniture', 'elektronik', 'lainnya',
  ]).optional(),
  merk: z.string().optional(),
  model: z.string().optional(),
  serial_number: z.string().optional(),
  tahun_pembelian: z.number().int().optional(),
  tanggal_pembelian: z.string().optional(),
  harga_perolehan: z.number().min(0),
  vendor: z.string().optional(),
  no_faktur: z.string().optional(),
  umur_ekonomis_tahun: z.number().int().min(1).optional(),
  nilai_residu: z.number().min(0).optional(),
  metode_penyusutan: z.enum(['garis_lurus', 'saldo_menurun']).optional(),
  lokasi_gedung: z.string().optional(),
  lokasi_lantai: z.string().optional(),
  lokasi_ruangan: z.string().optional(),
  penanggung_jawab: z.string().optional(),
  kondisi: z.enum(['baik', 'rusak_ringan', 'rusak_berat', 'dalam_perbaikan']).optional(),
  garansi_mulai: z.string().optional(),
  garansi_berakhir: z.string().optional(),
  interval_kalibrasi_bulan: z.number().int().optional(),
  catatan: z.string().optional(),
})

const maintenanceSchema = z.object({
  asset_id: z.string().uuid(),
  tipe: z.enum(['perbaikan', 'pemeliharaan_rutin', 'kalibrasi', 'penggantian_part', 'lainnya']).optional(),
  tanggal: z.string().optional(),
  deskripsi: z.string().min(1),
  teknisi: z.string().optional(),
  vendor: z.string().optional(),
  biaya: z.number().min(0).optional(),
  hasil: z.enum(['selesai', 'perlu_tindak_lanjut', 'gagal']).optional(),
  tanggal_selanjutnya: z.string().optional(),
  catatan: z.string().optional(),
})

const mutationSchema = z.object({
  asset_id: z.string().uuid(),
  tipe: z.enum(['pindah', 'penghapusan', 'penjualan', 'hibah']).optional(),
  tanggal: z.string().optional(),
  dari_lokasi: z.string().optional(),
  ke_lokasi: z.string().optional(),
  alasan: z.string().optional(),
  nilai_jual: z.number().min(0).optional(),
  no_berita_acara: z.string().optional(),
  disetujui_oleh: z.string().optional(),
  catatan: z.string().optional(),
})

export class AssetController {
  constructor(private assetService: AssetService) {}

  listAssets = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.assetService.listAssets(req.tenantSchema!, {
        search: req.query.search as string,
        kategori: req.query.kategori as string,
        status: req.query.status as string,
        kondisi: req.query.kondisi as string,
        lokasi_ruangan: req.query.lokasi_ruangan as string,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      })
      res.json({ success: true, ...result })
    } catch (error) { next(error) }
  }

  getAsset = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const asset = await this.assetService.getAsset(req.params.id, req.tenantSchema!)
      res.json({ success: true, data: asset })
    } catch (error) { next(error) }
  }

  createAsset = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createAssetSchema.parse(req.body)
      const asset = await this.assetService.createAsset(data, req.tenantSchema!, req.user?.id)
      res.status(201).json({ success: true, data: asset })
    } catch (error) { next(error) }
  }

  updateAsset = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createAssetSchema.partial().parse(req.body)
      const asset = await this.assetService.updateAsset(
        req.params.id, data, req.tenantSchema!, req.user?.id,
      )
      res.json({ success: true, data: asset })
    } catch (error) { next(error) }
  }

  deleteAsset = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.assetService.deleteAsset(req.params.id, req.tenantSchema!)
      res.json({ success: true, ...result })
    } catch (error) { next(error) }
  }

  getStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await this.assetService.getStats(req.tenantSchema!)
      res.json({ success: true, data: stats })
    } catch (error) { next(error) }
  }

  getDepreciationReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tahun = req.query.tahun ? Number(req.query.tahun) : undefined
      const report = await this.assetService.getDepreciationReport(req.tenantSchema!, tahun)
      res.json({ success: true, data: report })
    } catch (error) { next(error) }
  }

  addMaintenance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = maintenanceSchema.parse(req.body)
      const record = await this.assetService.addMaintenance(data, req.tenantSchema!, req.user?.id)
      res.status(201).json({ success: true, data: record })
    } catch (error) { next(error) }
  }

  listMaintenances = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.assetService.listMaintenances(req.tenantSchema!, {
        asset_id: req.query.asset_id as string,
        tipe: req.query.tipe as string,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      })
      res.json({ success: true, ...result })
    } catch (error) { next(error) }
  }

  deleteMaintenance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.assetService.deleteMaintenance(req.params.id, req.tenantSchema!)
      res.json({ success: true, ...result })
    } catch (error) { next(error) }
  }

  addMutation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = mutationSchema.parse(req.body)
      const record = await this.assetService.addMutation(data, req.tenantSchema!, req.user?.id)
      res.status(201).json({ success: true, data: record })
    } catch (error) { next(error) }
  }

  listMutations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.assetService.listMutations(req.tenantSchema!, {
        asset_id: req.query.asset_id as string,
        tipe: req.query.tipe as string,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      })
      res.json({ success: true, ...result })
    } catch (error) { next(error) }
  }

  getLocations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const locations = await this.assetService.getLocations(req.tenantSchema!)
      res.json({ success: true, data: locations })
    } catch (error) { next(error) }
  }

  generateKode = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const kategori = (req.query.kategori as string) || 'lainnya'
      const kode = await this.assetService.generateKode(req.tenantSchema!, kategori)
      res.json({ success: true, data: { kode } })
    } catch (error) { next(error) }
  }
}
