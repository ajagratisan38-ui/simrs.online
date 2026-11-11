import { Request, Response, NextFunction } from 'express'
import { InpatientService, type RoomType } from './inpatient.service'

export class InpatientController {
  constructor(private service: InpatientService) {}

  listRooms = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.listRooms(req.tenantSchema!)
      res.json({ success: true, data })
    } catch (err) { next(err) }
  }

  getBedsByRoom = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const roomId = req.params.roomId as string
      const data = await this.service.getBedsByRoom(roomId, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (err) { next(err) }
  }

  getAllBeds = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getAllBeds(req.tenantSchema!)
      res.json({ success: true, data })
    } catch (err) { next(err) }
  }

  assignBed = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { bedId, patientId, visitId } = req.body as {
        bedId: string; patientId: string; visitId: string
      }
      const data = await this.service.assignBed(
        bedId, patientId, visitId, req.tenantSchema!, req.userId!,
      )
      res.json({ success: true, data })
    } catch (err) { next(err) }
  }

  releaseBed = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bedId = req.params.bedId as string
      const data = await this.service.releaseBed(
        bedId, req.tenantSchema!, req.userId!,
      )
      res.json({ success: true, data })
    } catch (err) { next(err) }
  }

  transferBed = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { fromBedId, toBedId } = req.body as { fromBedId: string; toBedId: string }
      const data = await this.service.transferBed(
        fromBedId, toBedId, req.tenantSchema!, req.userId!,
      )
      res.json({ success: true, data })
    } catch (err) { next(err) }
  }

  discharge = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const visitId = req.params.visitId as string
      const { cara_keluar, catatan, rujuk_ke, sebab_meninggal } = req.body as {
        cara_keluar?: 'sembuh' | 'pulang_paksa' | 'rujuk' | 'meninggal' | 'lainnya'
        catatan?: string
        rujuk_ke?: string
        sebab_meninggal?: string
      }
      const data = await this.service.discharge(
        visitId, req.tenantSchema!, req.userId!,
        { cara_keluar, catatan, rujuk_ke, sebab_meninggal },
      )
      res.json({ success: true, data })
    } catch (err) { next(err) }
  }

  toggleMaintenance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bedId = req.params.bedId as string
      const data = await this.service.setBedMaintenance(
        bedId, req.tenantSchema!,
      )
      res.json({ success: true, data })
    } catch (err) { next(err) }
  }

  summary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getInpatientSummary(req.tenantSchema!)
      res.json({ success: true, data })
    } catch (err) { next(err) }
  }

  // ==================== ALL ROOMS (admin) ====================

  listAllRooms = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tipe = req.query.tipe as RoomType | undefined
      const includeInactive = req.query.includeInactive === 'true'
      const data = await this.service.listAllRooms(
        req.tenantSchema!, { tipe, includeInactive },
      )
      res.json({ success: true, data })
    } catch (err) { next(err) }
  }

  toggleRoom = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const roomId = req.params.roomId as string
      const data = await this.service.toggleRoom(roomId, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (err) { next(err) }
  }

  roomStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getRoomStats(req.tenantSchema!)
      res.json({ success: true, data })
    } catch (err) { next(err) }
  }

  // ==================== ROOM CRUD ====================

  createRoom = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { kode, nama, tipe, lantai, kapasitas, tarif_per_hari, kelas } = req.body as {
        kode: string; nama: string; tipe?: RoomType; lantai?: number
        kapasitas: number; tarif_per_hari: number; kelas?: string
      }
      const data = await this.service.createRoom(
        { kode, nama, tipe, lantai, kapasitas, tarif_per_hari, kelas },
        req.tenantSchema!,
      )
      res.status(201).json({ success: true, data })
    } catch (err) { next(err) }
  }

  updateRoom = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const roomId = req.params.roomId as string
      const data = await this.service.updateRoom(roomId, req.body, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (err) { next(err) }
  }

  deleteRoom = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const roomId = req.params.roomId as string
      const data = await this.service.deleteRoom(roomId, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (err) { next(err) }
  }

  getRoom = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const roomId = req.params.roomId as string
      const data = await this.service.getRoom(roomId, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (err) { next(err) }
  }

  // ==================== VALIDASI KELAS BPJS ====================

  validateKelas = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const roomId = req.query.roomId as string
      const hakKelas = Number(req.query.hakKelas)
      if (!roomId || isNaN(hakKelas)) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'roomId dan hakKelas wajib diisi' },
        })
        return
      }
      const data = await this.service.validateKelas(
        roomId, hakKelas, req.tenantSchema!,
      )
      res.json({ success: true, data })
    } catch (err) { next(err) }
  }

  // ==================== BED CRUD ====================

  addBed = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const roomId = req.params.roomId as string
      const { nomor } = req.body as { nomor: string }
      const data = await this.service.addBed(roomId, nomor, req.tenantSchema!)
      res.status(201).json({ success: true, data })
    } catch (err) { next(err) }
  }

  removeBed = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bedId = req.params.bedId as string
      const data = await this.service.removeBed(bedId, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (err) { next(err) }
  }

  renameBed = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bedId = req.params.bedId as string
      const { nomor } = req.body as { nomor: string }
      const data = await this.service.renameBed(bedId, nomor, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (err) { next(err) }
  }
}
