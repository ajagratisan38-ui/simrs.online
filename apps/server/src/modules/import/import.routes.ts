import { Router } from 'express'
import { ImportController } from './import.controller'
import { ImportService } from './import.service'
import { authenticate } from '../../middleware/authenticate'
import { checkAnyPermission } from '../../middleware/check-permission'
import { db } from '../../config/database'

const service = new ImportService(db)
const controller = new ImportController(service)

export const importRouter = Router()
importRouter.use(authenticate)
importRouter.use(checkAnyPermission('tenant:manage', 'settings:manage'))

/** @openapi
 * /import/templates:
 *   get:
 *     tags: [Import]
 *     summary: Download template CSV untuk import (pasien / obat)
 *     responses:
 *       200:
 *         description: Daftar template yang tersedia + header kolom
 */
importRouter.get('/templates', controller.getTemplates)

/** @openapi
 * /import/patients:
 *   post:
 *     tags: [Import]
 *     summary: Import data pasien dari CSV (auto-generate no_rekam_medis, skip duplikasi NIK)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Hasil import (jumlah sukses, skip, error)
 */
importRouter.post('/patients', controller.importPatients)

/** @openapi
 * /import/drugs:
 *   post:
 *     tags: [Import]
 *     summary: Import data obat dari CSV
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Hasil import obat
 */
importRouter.post('/drugs', controller.importDrugs)
