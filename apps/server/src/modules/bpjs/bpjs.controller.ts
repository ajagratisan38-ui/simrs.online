import { Request, Response, NextFunction } from 'express'
import { BpjsService } from './bpjs.service'
import {
  createSepSchema,
  updateSepSchema,
  refSearchSchema,
  antrolAddSchema,
  antrolUpdateSchema,
  antrolBatalSchema,
} from './bpjs.validator'
import { ValidationError } from '../../shared/errors'

export class BpjsController {
  constructor(private bpjsService: BpjsService) {}

  // --- Peserta ---

  getPeserta = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const noBpjs = req.params.noBpjs as string
      if (!noBpjs) throw new ValidationError('No BPJS wajib diisi')

      const peserta = await this.bpjsService.getPeserta(
        noBpjs,
        req.tenantSchema!,
      )
      res.json({ success: true, data: peserta })
    } catch (error) {
      next(error)
    }
  }

  getPesertaByNik = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const nik = req.params.nik as string
      if (!nik || nik.length !== 16) {
        throw new ValidationError('NIK harus 16 digit')
      }

      const peserta = await this.bpjsService.getPesertaByNik(
        nik,
        req.tenantSchema!,
      )
      res.json({ success: true, data: peserta })
    } catch (error) {
      next(error)
    }
  }

  // --- SEP Quota ---

  getSepQuota = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const quota = await this.bpjsService.getSepQuota(req.tenantSchema!)
      res.json({ success: true, data: quota })
    } catch (error) {
      next(error)
    }
  }

  checkSepQuota = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const isIGD = req.query.igd === 'true' || req.query.igd === '1'
      const result = await this.bpjsService.checkSepQuota(req.tenantSchema!, isIGD)
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  // --- SEP ---

  createSEP = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createSepSchema.parse(req.body)
      const isIGD = req.body.isIGD === true || req.body.jnsPelayanan === '1'
      const sep = await this.bpjsService.createSEP(data, req.tenantSchema!, isIGD)
      res.status(201).json({ success: true, data: sep })
    } catch (error) {
      next(error)
    }
  }

  updateSEP = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = updateSepSchema.parse(req.body)
      await this.bpjsService.updateSEP(data, req.tenantSchema!)
      res.json({ success: true, data: null, message: 'SEP berhasil diupdate' })
    } catch (error) {
      next(error)
    }
  }

  deleteSEP = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const noSEP = req.params.noSEP as string
      if (!noSEP) throw new ValidationError('No SEP wajib diisi')

      const user = req.userId || 'system'
      await this.bpjsService.deleteSEP(noSEP, user, req.tenantSchema!)
      res.json({ success: true, data: null, message: 'SEP berhasil dihapus' })
    } catch (error) {
      next(error)
    }
  }

  getSEP = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const noSEP = req.params.noSEP as string
      if (!noSEP) throw new ValidationError('No SEP wajib diisi')

      const sep = await this.bpjsService.getSEP(noSEP, req.tenantSchema!)
      res.json({ success: true, data: sep })
    } catch (error) {
      next(error)
    }
  }

  // --- Rujukan ---

  getRujukan = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const noKartu = req.params.noKartu as string
      if (!noKartu) throw new ValidationError('No Kartu wajib diisi')

      const rujukan = await this.bpjsService.getRujukan(
        noKartu,
        req.tenantSchema!,
      )
      res.json({ success: true, data: rujukan })
    } catch (error) {
      next(error)
    }
  }

  // --- Referensi ---

  searchPoli = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { q } = refSearchSchema.parse(req.query)
      const poli = await this.bpjsService.getPoliReferensi(
        q,
        req.tenantSchema!,
      )
      res.json({ success: true, data: poli })
    } catch (error) {
      next(error)
    }
  }

  searchDiagnosa = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { q } = refSearchSchema.parse(req.query)
      const diagnosa = await this.bpjsService.getDiagnosaReferensi(
        q,
        req.tenantSchema!,
      )
      res.json({ success: true, data: diagnosa })
    } catch (error) {
      next(error)
    }
  }

  // --- Fingerprint ---

  checkFingerprint = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const noKartu = req.params.noKartu as string
      if (!noKartu) throw new ValidationError('No Kartu wajib diisi')

      const result = await this.bpjsService.checkFingerprint(
        noKartu,
        req.tenantSchema!,
      )
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  // --- Referensi Lanjutan ---

  searchProsedur = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { q } = refSearchSchema.parse(req.query)
      const data = await this.bpjsService.getProsedurReferensi(q, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  searchFaskes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { q } = refSearchSchema.parse(req.query)
      const jenis = Number(req.query.jenis) || 2
      const data = await this.bpjsService.getFaskesReferensi(q, jenis, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  searchDokter = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { q } = refSearchSchema.parse(req.query)
      const data = await this.bpjsService.getDokterReferensi(q, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  getSpesialistik = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.bpjsService.getSpesialistikReferensi(req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  // --- Monitoring ---

  getKunjunganBulanan = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tahun, bulan } = req.params
      if (!tahun || !bulan) throw new ValidationError('Tahun dan bulan wajib diisi')
      const data = await this.bpjsService.getKunjunganBulanan(tahun, bulan, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  // --- PCare ---

  pcareCreatePendaftaran = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.bpjsService.pcareCreatePendaftaran(req.body, req.tenantSchema!)
      res.status(201).json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  pcareCreateKunjungan = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.bpjsService.pcareCreateKunjungan(req.body, req.tenantSchema!)
      res.status(201).json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  pcareDeletePendaftaran = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { noUrut, tglDaftar } = req.params
      if (!noUrut || !tglDaftar) throw new ValidationError('No urut dan tanggal daftar wajib')
      await this.bpjsService.pcareDeletePendaftaran(noUrut, tglDaftar, req.tenantSchema!)
      res.json({ success: true, message: 'Pendaftaran PCare dihapus' })
    } catch (error) {
      next(error)
    }
  }

  pcareGetKunjungan = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tglDaftar } = req.params
      if (!tglDaftar) throw new ValidationError('Tanggal daftar wajib diisi')
      const offset = Number(req.query.offset) || 0
      const limit = Number(req.query.limit) || 20
      const data = await this.bpjsService.pcareGetKunjunganByTanggal(tglDaftar, offset, limit, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  pcareGetRiwayatKunjungan = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { noKartu } = req.params
      if (!noKartu) throw new ValidationError('No Kartu wajib diisi')
      const data = await this.bpjsService.pcareGetRiwayatKunjungan(noKartu, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  pcareSearchObat = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { q } = refSearchSchema.parse(req.query)
      const data = await this.bpjsService.pcareSearchObatDPHO(q)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  // --- e-Klaim / INACBG ---

  eklaimGrouping = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.bpjsService.eklaimGroupingStage1(req.body, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  eklaimGetClaim = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { noSep } = req.params
      if (!noSep) throw new ValidationError('No SEP wajib diisi')
      const data = await this.bpjsService.eklaimGetClaimData(noSep, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  eklaimListClaims = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tglMasuk = req.query.tglMasuk as string
      const tglPulang = req.query.tglPulang as string
      const jenisPelayanan = (req.query.jenisPelayanan as string) || '2'
      const status = (req.query.status as string) || '1'
      if (!tglMasuk || !tglPulang) throw new ValidationError('tglMasuk dan tglPulang wajib diisi')
      const data = await this.bpjsService.eklaimListClaims({ tglMasuk, tglPulang, jenisPelayanan, status }, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  eklaimGetStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { noSep } = req.params
      if (!noSep) throw new ValidationError('No SEP wajib diisi')
      const data = await this.bpjsService.eklaimGetClaimStatus(noSep, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  eklaimDeleteClaim = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { noSep } = req.params
      if (!noSep) throw new ValidationError('No SEP wajib diisi')
      await this.bpjsService.eklaimDeleteClaim(noSep, req.tenantSchema!)
      res.json({ success: true, message: 'Klaim e-Klaim dihapus' })
    } catch (error) {
      next(error)
    }
  }

  // --- Aplicare ---

  aplicareBedAvailability = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ppkCode = req.params.ppkCode as string
      if (!ppkCode) throw new ValidationError('Kode PPK wajib diisi')
      const data = await this.bpjsService.aplicareGetBedAvailability(ppkCode, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  // --- Antrol (Antrean Online) ---

  antrolRefPoli = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.bpjsService.antrolRefPoli(req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  antrolRefDokter = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.bpjsService.antrolRefDokter(req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  antrolGetJadwalDokter = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { kodePoli, tanggal } = req.params
      if (!kodePoli || !tanggal) throw new ValidationError('Kode poli dan tanggal wajib diisi')
      const data = await this.bpjsService.antrolGetJadwalDokter(kodePoli, tanggal, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  antrolTambahAntrean = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = antrolAddSchema.parse(req.body)
      const result = await this.bpjsService.antrolTambahAntrean(data, req.tenantSchema!)
      res.status(201).json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  antrolUpdateAntrean = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = antrolUpdateSchema.parse(req.body)
      await this.bpjsService.antrolUpdateAntrean(data, req.tenantSchema!)
      res.json({ success: true, data: null, message: 'Status antrean berhasil diupdate' })
    } catch (error) {
      next(error)
    }
  }

  antrolBatalAntrean = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = antrolBatalSchema.parse(req.body)
      await this.bpjsService.antrolBatalAntrean(data, req.tenantSchema!)
      res.json({ success: true, data: null, message: 'Antrean berhasil dibatalkan' })
    } catch (error) {
      next(error)
    }
  }

  antrolGetListTask = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { kodePoli, tanggal } = req.params
      if (!kodePoli || !tanggal) throw new ValidationError('Kode poli dan tanggal wajib diisi')
      const data = await this.bpjsService.antrolGetListTask(kodePoli, tanggal, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  antrolDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const mode = (req.query.mode as string) || 'tanggal'
      const tanggal = (req.query.tanggal as string) || new Date().toISOString().slice(0, 10)
      const bulan = (req.query.bulan as string) || String(new Date().getMonth() + 1).padStart(2, '0')
      const tahun = (req.query.tahun as string) || String(new Date().getFullYear())
      const waktu = (req.query.waktu as string) || 'rs'

      let data
      if (mode === 'bulan') {
        data = await this.bpjsService.antrolDashboardPerBulan(bulan, tahun, waktu, req.tenantSchema!)
      } else {
        data = await this.bpjsService.antrolDashboardPerTanggal(tanggal, waktu, req.tenantSchema!)
      }
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  antrolSyncTasks = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { kodePoli, tanggal } = req.params
      if (!kodePoli || !tanggal) throw new ValidationError('Kode poli dan tanggal wajib diisi')
      const result = await this.bpjsService.antrolSyncTasks(kodePoli, tanggal, req.tenantSchema!)
      res.json({ success: true, data: result, message: `Sinkronisasi ${result.synced} antrean berhasil` })
    } catch (error) {
      next(error)
    }
  }

  antrolGetLocalBookings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        tanggal: req.query.tanggal as string | undefined,
        kodePoli: req.query.kodePoli as string | undefined,
        status: req.query.status as string | undefined,
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 50,
      }
      const result = await this.bpjsService.antrolGetLocalBookings(filters, req.tenantSchema!)
      res.json({ success: true, ...result })
    } catch (error) {
      next(error)
    }
  }

  antrolLinkVisit = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { kodebooking } = req.params
      const { visitId } = req.body as { visitId: string }
      if (!kodebooking || !visitId) throw new ValidationError('kodebooking dan visitId wajib diisi')
      await this.bpjsService.antrolLinkVisit(kodebooking, visitId, req.tenantSchema!)
      res.json({ success: true, message: 'Booking berhasil di-link ke visit' })
    } catch (error) {
      next(error)
    }
  }
}
