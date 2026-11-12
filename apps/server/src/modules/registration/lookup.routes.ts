import { Router, Request, Response, NextFunction } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { db } from '../../config/database'

const router = Router()
router.use(authenticate)

/** @openapi
 * /lookup/rooms:
 *   get:
 *     tags: [Visits]
 *     summary: Daftar ruangan/poli aktif
 *     parameters:
 *       - in: query
 *         name: tipe
 *         schema: { type: string, enum: [poli, igd, ruang_inap, kamar_operasi, lab, radiologi] }
 *     responses:
 *       200:
 *         description: Daftar ruangan
 */
router.get('/rooms', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tipe = req.query.tipe as string | undefined
    let query = db
      .withSchema(req.tenantSchema!)
      .select('id', 'kode', 'nama', 'tipe', 'lantai', 'tarif_per_hari', 'kelas')
      .from('rooms')
      .where({ is_active: true })
      .orderBy('kode')

    if (tipe) query = query.where({ tipe })

    const rooms = await query
    res.json({ success: true, data: rooms })
  } catch (error) {
    next(error)
  }
})

/** @openapi
 * /lookup/doctors:
 *   get:
 *     tags: [Visits]
 *     summary: Daftar dokter yang tersedia
 *     parameters:
 *       - in: query
 *         name: room_id
 *         schema: { type: string, format: uuid }
 *         description: Filter by ruangan/poli
 *     responses:
 *       200:
 *         description: Daftar dokter (nama, spesialisasi, jadwal, tarif)
 */
router.get('/doctors', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const _roomId = req.query.room_id as string | undefined
    let query = db
      .withSchema(req.tenantSchema!)
      .select(
        'doctors.id',
        'doctors.spesialisasi',
        'doctors.is_available',
        'doctors.tarif_konsultasi',
        'doctors.jadwal_praktek',
        'users.name as nama',
      )
      .from('doctors')
      .join('users', `${req.tenantSchema!}.doctors.user_id`, `${req.tenantSchema!}.users.id`)
      .whereNull('doctors.deleted_at')
      .where('doctors.status', 'aktif')
      .orderBy('users.name')

    const doctors = await query
    res.json({ success: true, data: doctors })
  } catch (error) {
    next(error)
  }
})

export default router
