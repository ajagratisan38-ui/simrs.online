import { Request, Response, NextFunction } from 'express'
import { ImportService } from './import.service'
import { ValidationError } from '../../shared/errors'

export class ImportController {
  constructor(private service: ImportService) {}

  importPatients = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const csvContent = req.body?.csv
      if (!csvContent || typeof csvContent !== 'string') {
        throw new ValidationError('Field "csv" wajib berisi konten CSV sebagai string')
      }

      const rows = this.service.parseCSV(csvContent)
      const result = await this.service.importPatients(rows, req.userId!, req.tenantSchema!)
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  importDrugs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const csvContent = req.body?.csv
      if (!csvContent || typeof csvContent !== 'string') {
        throw new ValidationError('Field "csv" wajib berisi konten CSV sebagai string')
      }

      const rows = this.service.parseCSV(csvContent)
      const result = await this.service.importDrugs(rows, req.userId!, req.tenantSchema!)
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  getTemplates = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({
        success: true,
        data: {
          patients: {
            headers: [
              'nik', 'nama', 'tanggal_lahir', 'jenis_kelamin', 'alamat',
              'no_telepon', 'email', 'golongan_darah', 'pekerjaan', 'agama',
              'status_pernikahan',
            ],
            example: '3201010101010001,Budi Santoso,1990-01-15,L,Jl. Merdeka No. 1,081234567890,budi@email.com,O,Wiraswasta,Islam,Menikah',
          },
          drugs: {
            headers: [
              'nama', 'kode', 'kategori', 'satuan', 'harga_beli',
              'harga_jual', 'stok', 'stok_minimum', 'produsen', 'rak',
            ],
            example: 'Paracetamol 500mg,PCT500,Analgesik,Tablet,500,1500,100,20,Kimia Farma,A-01',
          },
        },
      })
    } catch (error) {
      next(error)
    }
  }
}
