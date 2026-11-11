import PDFDocument from 'pdfkit'
import { Knex } from 'knex'
import path from 'path'
import fs from 'fs'
import { logger } from '../../shared/logger'
import { formatDateTime } from '../../shared/timezone'

// Cached invoice settings
let cachedInvoicePrefix: string | null = null
let cachedInvoiceFooter: string | null = null
let cachedPlatformName: string | null = null
let invoiceSettingsLoadedAt = 0
const CACHE_TTL = 300_000 // 5 min

async function loadInvoiceSettings(db: Knex): Promise<{
  prefix: string
  footer: string
  platformName: string
}> {
  const now = Date.now()
  if (cachedInvoicePrefix !== null && now - invoiceSettingsLoadedAt < CACHE_TTL) {
    return {
      prefix: cachedInvoicePrefix,
      footer: cachedInvoiceFooter || '',
      platformName: cachedPlatformName || 'SIMRS',
    }
  }

  try {
    const rows = await db('platform_settings')
      .whereIn('key', ['invoice_prefix', 'invoice_footer', 'platform_name'])
      .select('key', 'value')

    const map: Record<string, string> = {}
    for (const r of rows) map[r.key] = r.value || ''

    cachedInvoicePrefix = map.invoice_prefix || 'INV-'
    cachedInvoiceFooter = map.invoice_footer || ''
    cachedPlatformName = map.platform_name || 'SIMRS'
    invoiceSettingsLoadedAt = now
  } catch {
    cachedInvoicePrefix = cachedInvoicePrefix || 'INV-'
    cachedInvoiceFooter = cachedInvoiceFooter || ''
    cachedPlatformName = cachedPlatformName || 'SIMRS'
  }

  return {
    prefix: cachedInvoicePrefix,
    footer: cachedInvoiceFooter,
    platformName: cachedPlatformName,
  }
}

export function invalidateInvoiceSettingsCache(): void {
  cachedInvoicePrefix = null
  cachedInvoiceFooter = null
  cachedPlatformName = null
  invoiceSettingsLoadedAt = 0
}

function formatRupiah(amount: number): string {
  return 'Rp ' + amount.toLocaleString('id-ID')
}

interface InvoiceData {
  namaRs: string
  adminEmail: string
  planName: string
  period: string
  amount: number
  paymentMethod?: string
  paymentReference?: string
  transactionDate: Date
}

export async function generateInvoicePdf(
  db: Knex,
  data: InvoiceData,
): Promise<{ filePath: string; invoiceNumber: string }> {
  const { prefix, footer, platformName } = await loadInvoiceSettings(db)

  // Generate sequential invoice number: INV-2026-11-00001
  const now = data.transactionDate
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')

  const countResult = await db.raw(
    `SELECT COUNT(*)::int as count FROM subscription_transactions
     WHERE created_at >= ? AND created_at < ?`,
    [
      `${year}-${month}-01`,
      month === '12' ? `${year + 1}-01-01` : `${year}-${String(Number(month) + 1).padStart(2, '0')}-01`,
    ],
  )
  const seq = (countResult.rows?.[0]?.count || 0) + 1
  const invoiceNumber = `${prefix}${year}-${month}-${String(seq).padStart(5, '0')}`

  // Ensure directory exists
  const invoiceDir = path.join(process.cwd(), 'uploads', 'invoices')
  if (!fs.existsSync(invoiceDir)) {
    fs.mkdirSync(invoiceDir, { recursive: true })
  }

  const fileName = `${invoiceNumber.replace(/\//g, '-')}.pdf`
  const filePath = path.join(invoiceDir, fileName)

  const formattedDate = await formatDateTime(now)
  const periodLabel = data.period === 'yearly' ? '1 Tahun' : '1 Bulan'

  // Build PDF
  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    const stream = fs.createWriteStream(filePath)
    doc.pipe(stream)

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text(platformName, 50, 50)
    doc.fontSize(10).font('Helvetica').text('Platform Sistem Informasi Manajemen Rumah Sakit', 50, 75)
    doc.moveTo(50, 100).lineTo(545, 100).stroke('#cccccc')

    // Invoice title
    doc.fontSize(16).font('Helvetica-Bold').text('INVOICE', 50, 120)
    doc.fontSize(10).font('Helvetica')
    doc.text(`No: ${invoiceNumber}`, 50, 145)
    doc.text(`Tanggal: ${formattedDate}`, 50, 160)

    // Bill to
    doc.fontSize(12).font('Helvetica-Bold').text('Kepada:', 50, 195)
    doc.fontSize(10).font('Helvetica')
    doc.text(data.namaRs, 50, 215)
    doc.text(data.adminEmail, 50, 230)

    // Table header
    const tableTop = 270
    doc.rect(50, tableTop, 495, 25).fill('#f0f4f8')
    doc.fillColor('#333333').fontSize(10).font('Helvetica-Bold')
    doc.text('Deskripsi', 60, tableTop + 7, { width: 250 })
    doc.text('Periode', 310, tableTop + 7, { width: 100 })
    doc.text('Jumlah', 420, tableTop + 7, { width: 115, align: 'right' })

    // Table row
    const rowTop = tableTop + 30
    doc.font('Helvetica').fillColor('#333333')
    doc.text(`Langganan ${data.planName}`, 60, rowTop + 5, { width: 250 })
    doc.text(periodLabel, 310, rowTop + 5, { width: 100 })
    doc.text(formatRupiah(data.amount), 420, rowTop + 5, { width: 115, align: 'right' })

    // Separator
    doc.moveTo(50, rowTop + 25).lineTo(545, rowTop + 25).stroke('#cccccc')

    // Total
    const totalTop = rowTop + 35
    doc.font('Helvetica-Bold').fontSize(11)
    doc.text('Total:', 310, totalTop, { width: 100 })
    doc.text(formatRupiah(data.amount), 420, totalTop, { width: 115, align: 'right' })

    // Payment info
    if (data.paymentMethod || data.paymentReference) {
      const payTop = totalTop + 40
      doc.moveTo(50, payTop).lineTo(545, payTop).stroke('#cccccc')
      doc.font('Helvetica-Bold').fontSize(10).text('Informasi Pembayaran:', 50, payTop + 10)
      doc.font('Helvetica')
      let y = payTop + 28
      if (data.paymentMethod) {
        doc.text(`Metode: ${data.paymentMethod}`, 50, y)
        y += 15
      }
      if (data.paymentReference) {
        doc.text(`Referensi: ${data.paymentReference}`, 50, y)
      }
    }

    // Status
    const statusY = 480
    doc.rect(50, statusY, 100, 28).fill('#22c55e')
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(11)
    doc.text('LUNAS', 60, statusY + 8, { width: 80, align: 'center' })

    // Footer
    if (footer) {
      doc.fillColor('#888888').font('Helvetica').fontSize(9)
      doc.text(footer, 50, 720, { width: 495, align: 'center' })
    }

    doc.fillColor('#aaaaaa').fontSize(8)
    doc.text(`Dokumen ini digenerate otomatis oleh ${platformName}`, 50, 750, {
      width: 495,
      align: 'center',
    })

    doc.end()
    stream.on('finish', resolve)
    stream.on('error', reject)
  })

  logger.info('Invoice PDF generated', { invoiceNumber, filePath, namaRs: data.namaRs })

  return { filePath: `/uploads/invoices/${fileName}`, invoiceNumber }
}
