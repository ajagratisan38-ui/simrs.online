'use client'

import { useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Printer,
  Download,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useResumeMedis } from '@/hooks/use-medical-record'

export default function ResumeMedisPage() {
  const params = useParams<{ visitId: string }>()
  const router = useRouter()
  const visitId = params.visitId
  const printRef = useRef<HTMLDivElement>(null)
  const [generating, setGenerating] = useState(false)

  const { data: res, isLoading } = useResumeMedis(visitId)
  const resume = res?.data

  const handleDownloadPDF = async () => {
    if (!printRef.current || generating) return
    setGenerating(true)
    try {
      const html2canvas = (await import('html2canvas-pro')).default
      const { jsPDF } = await import('jspdf')

      const el = printRef.current
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: el.scrollWidth,
      })

      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfW = pdf.internal.pageSize.getWidth()
      const pdfH = pdf.internal.pageSize.getHeight()
      const margin = 6
      const contentW = pdfW - margin * 2
      const imgW = canvas.width
      const imgH = canvas.height
      const ratio = contentW / imgW
      const scaledH = imgH * ratio
      const pageContentH = pdfH - margin * 2

      let yOffset = 0
      while (yOffset < scaledH) {
        if (yOffset > 0) pdf.addPage()
        const srcY = yOffset / ratio
        const srcH = Math.min(pageContentH / ratio, imgH - srcY)
        const drawH = srcH * ratio

        const sliceCanvas = document.createElement('canvas')
        sliceCanvas.width = imgW
        sliceCanvas.height = Math.ceil(srcH)
        const ctx = sliceCanvas.getContext('2d')
        if (ctx) {
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height)
          ctx.drawImage(canvas, 0, srcY, imgW, srcH, 0, 0, imgW, srcH)
        }
        const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.92)
        pdf.addImage(sliceData, 'JPEG', margin, margin, contentW, drawH)
        yOffset += pageContentH
      }

      const patientName = resume?.patient?.nama || 'pasien'
      const visitNum = resume?.visit?.visit_number || ''
      pdf.save(`Resume-Medis-${patientName.replace(/\s+/g, '-')}-${visitNum}.pdf`)
    } catch (err) {
      console.error('PDF generation failed:', err)
      alert('Gagal generate PDF. Coba lagi.')
    } finally {
      setGenerating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!resume) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <FileText className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-muted-foreground mb-4">
          Resume medis tidak ditemukan atau rekam medis belum dibuat
        </p>
        <Button variant="outline" asChild>
          <Link href={`/rekam-medis/${visitId}`}>Kembali ke Pemeriksaan</Link>
        </Button>
      </div>
    )
  }

  const {
    hospital,
    patient,
    visit,
    doctor,
    medicalRecord: mr,
    diagnoses,
    procedures,
    prescriptions,
  } = resume

  const patientAge = computeAge(patient.tanggal_lahir)
  const visitDate = formatDate(visit.tanggal)
  const vs = mr.vital_signs || ({} as Record<string, unknown>)

  const f = 'Segoe UI, Tahoma, Arial, sans-serif'
  const bdr = '1px solid #bbb'
  const bdrLight = '1px solid #ddd'
  const headerBg = '#f5f5f5'

  return (
    <div className="max-w-4xl mx-auto">
      {/* Action bar */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold tracking-tight">Resume Medis</h1>
          <p className="text-sm text-muted-foreground">
            {patient.nama} — {visit.visit_number}
          </p>
        </div>
        <Button variant="outline" onClick={handleDownloadPDF} disabled={generating}>
          {generating ? (
            <>
              <Printer className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </>
          )}
        </Button>
      </div>

      {/* ═══════════ PRINTABLE A4 CONTENT ═══════════ */}
      <div
        ref={printRef}
        style={{
          fontFamily: f,
          width: 794,
          margin: '0 auto',
          padding: '24px 28px',
          background: '#fff',
          color: '#111',
          fontSize: 10,
          lineHeight: 1.5,
          boxSizing: 'border-box',
        }}
      >
        {/* ──── KOP SURAT RS ──── */}
        <div style={{ borderBottom: '3px double #000', paddingBottom: 10, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
          {hospital?.logo_url && (
            <img src={hospital.logo_url} alt="" style={{ height: 52, width: 52, objectFit: 'contain' }} />
          )}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>
              {hospital?.nama || 'Rumah Sakit'}
            </div>
            <div style={{ fontSize: 9, color: '#555', marginTop: 1 }}>
              {hospital?.alamat || '-'}
            </div>
            <div style={{ fontSize: 9, color: '#555' }}>
              Telp: {hospital?.telepon || '-'} | Email: {hospital?.email || '-'}
            </div>
          </div>
          {hospital?.logo_url && <div style={{ width: 52 }} />}
        </div>

        {/* ──── JUDUL ──── */}
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, borderBottom: '2px solid #000', display: 'inline-block', paddingBottom: 2 }}>
            Resume Medis
          </div>
          <div style={{ fontSize: 9, color: '#777', marginTop: 3 }}>
            No. RM: {patient.no_rekam_medis} | No. Kunjungan: {visit.visit_number}
          </div>
        </div>

        {/* ──── IDENTITAS PASIEN ──── */}
        <SectionHeader title="I. IDENTITAS PASIEN" />
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10 }}>
          <tbody>
            <tr>
              <Cell w="22%" bold>Nama Lengkap</Cell>
              <Cell w="3%">:</Cell>
              <Cell w="30%">{patient.nama}</Cell>
              <Cell w="17%" bold>No. Rekam Medis</Cell>
              <Cell w="3%">:</Cell>
              <Cell>{patient.no_rekam_medis}</Cell>
            </tr>
            <tr>
              <Cell bold>NIK</Cell>
              <Cell>:</Cell>
              <Cell>{patient.nik || '-'}</Cell>
              <Cell bold>Tgl. Lahir / Umur</Cell>
              <Cell>:</Cell>
              <Cell>{formatDate(patient.tanggal_lahir)} ({patientAge || '-'})</Cell>
            </tr>
            <tr>
              <Cell bold>Jenis Kelamin</Cell>
              <Cell>:</Cell>
              <Cell>{patient.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</Cell>
              <Cell bold>Gol. Darah</Cell>
              <Cell>:</Cell>
              <Cell>{patient.golongan_darah || '-'}</Cell>
            </tr>
            <tr>
              <Cell bold>Alamat</Cell>
              <Cell>:</Cell>
              <td colSpan={4} style={{ padding: '3px 4px', fontSize: 10, verticalAlign: 'top' }}>{patient.alamat || '-'}</td>
            </tr>
            <tr>
              <Cell bold>No. Telepon</Cell>
              <Cell>:</Cell>
              <Cell>{patient.no_telepon || '-'}</Cell>
              <Cell bold>Penjamin</Cell>
              <Cell>:</Cell>
              <Cell>{(visit.penjamin || 'Umum').toUpperCase()}{visit.no_sep ? ` (SEP: ${visit.no_sep})` : ''}</Cell>
            </tr>
          </tbody>
        </table>

        {/* ──── DATA KUNJUNGAN ──── */}
        <SectionHeader title="II. DATA KUNJUNGAN" />
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10 }}>
          <tbody>
            <tr>
              <Cell w="22%" bold>Tanggal Kunjungan</Cell>
              <Cell w="3%">:</Cell>
              <Cell w="30%">{visitDate}</Cell>
              <Cell w="17%" bold>Tipe</Cell>
              <Cell w="3%">:</Cell>
              <Cell>{visit.tipe === 'rawat_jalan' ? 'Rawat Jalan' : visit.tipe === 'igd' ? 'IGD' : 'Rawat Inap'}</Cell>
            </tr>
            <tr>
              <Cell bold>Poli / Ruang</Cell>
              <Cell>:</Cell>
              <Cell>{visit.room_nama} ({visit.room_kode})</Cell>
              <Cell bold>Dokter</Cell>
              <Cell>:</Cell>
              <Cell>{doctor?.nama || '-'}{doctor?.spesialisasi ? `, ${doctor.spesialisasi}` : ''}</Cell>
            </tr>
            {visit.keluhan_utama && (
              <tr>
                <Cell bold>Keluhan Utama</Cell>
                <Cell>:</Cell>
                <td colSpan={4} style={{ padding: '3px 4px', fontSize: 10 }}>{visit.keluhan_utama}</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* ──── ALERGI ──── */}
        {mr.alergi && mr.alergi.length > 0 && (
          <>
            <SectionHeader title="⚠ ALERGI" />
            <div style={{ border: '2px solid #c00', borderRadius: 3, padding: '4px 8px', marginBottom: 10, background: '#fff5f5' }}>
              <span style={{ fontWeight: 700, color: '#c00', fontSize: 10 }}>
                {mr.alergi.join(', ')}
              </span>
            </div>
          </>
        )}

        {/* ──── TANDA VITAL ──── */}
        {Object.values(vs).some(v => v != null) && (
          <>
            <SectionHeader title="III. TANDA VITAL" />
            <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: 10 }}>
              <thead>
                <tr>
                  {[
                    vs.tekanan_darah_sistolik != null && 'Tekanan Darah',
                    vs.nadi != null && 'Nadi',
                    vs.suhu != null && 'Suhu',
                    vs.respirasi != null && 'Respirasi',
                    vs.spo2 != null && 'SpO2',
                    vs.tinggi_badan != null && 'TB',
                    vs.berat_badan != null && 'BB',
                    vs.bmi != null && 'BMI',
                  ].filter(Boolean).map(h => (
                    <th key={h as string} style={{ border: bdr, padding: '3px 6px', background: headerBg, fontSize: 9, fontWeight: 600, textAlign: 'center' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {[
                    vs.tekanan_darah_sistolik != null && `${vs.tekanan_darah_sistolik}/${vs.tekanan_darah_diastolik} mmHg`,
                    vs.nadi != null && `${vs.nadi} x/mnt`,
                    vs.suhu != null && `${vs.suhu} °C`,
                    vs.respirasi != null && `${vs.respirasi} x/mnt`,
                    vs.spo2 != null && `${vs.spo2}%`,
                    vs.tinggi_badan != null && `${vs.tinggi_badan} cm`,
                    vs.berat_badan != null && `${vs.berat_badan} kg`,
                    vs.bmi != null && `${vs.bmi}`,
                  ].filter(Boolean).map((val, i) => (
                    <td key={i} style={{ border: bdr, padding: '3px 6px', fontSize: 10, textAlign: 'center', fontWeight: 600 }}>{val}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </>
        )}

        {/* ──── ANAMNESIS & PEMERIKSAAN (SOAP) ──── */}
        <SectionHeader title="IV. ANAMNESIS & PEMERIKSAAN" />
        <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: 10 }}>
          <tbody>
            {[
              ['S', 'Subjective (Keluhan)', mr.subjective],
              ['O', 'Objective (Pemeriksaan Fisik)', mr.objective],
              ['A', 'Assessment (Penilaian)', mr.assessment],
              ['P', 'Plan (Rencana)', mr.plan],
            ].map(([code, label, content]) => content ? (
              <tr key={code as string}>
                <td style={{ border: bdr, padding: '4px 8px', width: '2%', fontWeight: 800, fontSize: 12, textAlign: 'center', verticalAlign: 'top', background: headerBg }}>
                  {code}
                </td>
                <td style={{ border: bdr, padding: '4px 8px', width: '25%', fontWeight: 600, fontSize: 9, verticalAlign: 'top', background: headerBg, textTransform: 'uppercase' }}>
                  {label}
                </td>
                <td style={{ border: bdr, padding: '4px 8px', fontSize: 10, whiteSpace: 'pre-wrap', verticalAlign: 'top' }}>
                  {content}
                </td>
              </tr>
            ) : null)}
          </tbody>
        </table>

        {/* ──── RIWAYAT PENYAKIT ──── */}
        {mr.riwayat_penyakit && (
          <>
            <SectionHeader title="V. RIWAYAT PENYAKIT" />
            <div style={{ border: bdrLight, borderRadius: 3, padding: '5px 8px', marginBottom: 10, fontSize: 10, whiteSpace: 'pre-wrap' }}>
              {mr.riwayat_penyakit}
            </div>
          </>
        )}

        {/* ──── DIAGNOSIS ──── */}
        <SectionHeader title={mr.riwayat_penyakit ? 'VI. DIAGNOSIS' : 'V. DIAGNOSIS'} />
        {diagnoses.length === 0 ? (
          <div style={{ fontSize: 10, color: '#888', fontStyle: 'italic', marginBottom: 10 }}>Tidak ada diagnosis tercatat</div>
        ) : (
          <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: 10 }}>
            <thead>
              <tr>
                <th style={{ border: bdr, padding: '3px 6px', background: headerBg, fontSize: 9, fontWeight: 600, width: '5%', textAlign: 'center' }}>No</th>
                <th style={{ border: bdr, padding: '3px 6px', background: headerBg, fontSize: 9, fontWeight: 600, width: '13%' }}>Kode ICD-10</th>
                <th style={{ border: bdr, padding: '3px 6px', background: headerBg, fontSize: 9, fontWeight: 600 }}>Nama Diagnosis</th>
                <th style={{ border: bdr, padding: '3px 6px', background: headerBg, fontSize: 9, fontWeight: 600, width: '12%', textAlign: 'center' }}>Tipe</th>
              </tr>
            </thead>
            <tbody>
              {diagnoses.map((dx, i) => (
                <tr key={dx.id || i}>
                  <td style={{ border: bdr, padding: '3px 6px', fontSize: 10, textAlign: 'center' }}>{i + 1}</td>
                  <td style={{ border: bdr, padding: '3px 6px', fontSize: 10, fontFamily: 'monospace' }}>{dx.icd10_code}</td>
                  <td style={{ border: bdr, padding: '3px 6px', fontSize: 10 }}>{dx.icd10_name}</td>
                  <td style={{ border: bdr, padding: '3px 6px', fontSize: 10, textAlign: 'center' }}>
                    <span style={{
                      background: dx.tipe === 'utama' ? '#dcfce7' : '#f3f4f6',
                      color: dx.tipe === 'utama' ? '#166534' : '#374151',
                      padding: '1px 6px',
                      borderRadius: 3,
                      fontSize: 9,
                      fontWeight: 600,
                    }}>
                      {dx.tipe === 'utama' ? 'Utama' : 'Sekunder'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* ──── TINDAKAN / PROSEDUR ──── */}
        {procedures.length > 0 && (
          <>
            <SectionHeader title={`${mr.riwayat_penyakit ? 'VII' : 'VI'}. TINDAKAN / PROSEDUR`} />
            <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: 10 }}>
              <thead>
                <tr>
                  <th style={{ border: bdr, padding: '3px 6px', background: headerBg, fontSize: 9, fontWeight: 600, width: '5%', textAlign: 'center' }}>No</th>
                  <th style={{ border: bdr, padding: '3px 6px', background: headerBg, fontSize: 9, fontWeight: 600, width: '14%' }}>Kode</th>
                  <th style={{ border: bdr, padding: '3px 6px', background: headerBg, fontSize: 9, fontWeight: 600 }}>Nama Tindakan</th>
                  <th style={{ border: bdr, padding: '3px 6px', background: headerBg, fontSize: 9, fontWeight: 600, width: '8%', textAlign: 'right' }}>Qty</th>
                  <th style={{ border: bdr, padding: '3px 6px', background: headerBg, fontSize: 9, fontWeight: 600, width: '15%', textAlign: 'right' }}>Tarif</th>
                </tr>
              </thead>
              <tbody>
                {procedures.map((proc, i) => (
                  <tr key={proc.id || i}>
                    <td style={{ border: bdr, padding: '3px 6px', fontSize: 10, textAlign: 'center' }}>{i + 1}</td>
                    <td style={{ border: bdr, padding: '3px 6px', fontSize: 10, fontFamily: 'monospace' }}>{proc.kode_tindakan || '-'}</td>
                    <td style={{ border: bdr, padding: '3px 6px', fontSize: 10 }}>{proc.nama_tindakan}</td>
                    <td style={{ border: bdr, padding: '3px 6px', fontSize: 10, textAlign: 'right' }}>{proc.qty}</td>
                    <td style={{ border: bdr, padding: '3px 6px', fontSize: 10, textAlign: 'right' }}>{formatRupiah(proc.total)}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={4} style={{ border: bdr, padding: '3px 6px', fontSize: 10, textAlign: 'right', fontWeight: 700 }}>Total Tindakan</td>
                  <td style={{ border: bdr, padding: '3px 6px', fontSize: 10, textAlign: 'right', fontWeight: 700 }}>
                    {formatRupiah(procedures.reduce((sum, p) => sum + (p.total || 0), 0))}
                  </td>
                </tr>
              </tbody>
            </table>
          </>
        )}

        {/* ──── RESEP OBAT ──── */}
        {prescriptions.length > 0 && prescriptions[0]?.items?.length > 0 && (() => {
          const rx = prescriptions[0]
          const secNum = mr.riwayat_penyakit
            ? (procedures.length > 0 ? 'VIII' : 'VII')
            : (procedures.length > 0 ? 'VII' : 'VI')
          return (
            <>
              <SectionHeader title={`${secNum}. RESEP OBAT`} />
              <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: 4 }}>
                <thead>
                  <tr>
                    <th style={{ border: bdr, padding: '3px 6px', background: headerBg, fontSize: 9, fontWeight: 600, width: '5%', textAlign: 'center' }}>No</th>
                    <th style={{ border: bdr, padding: '3px 6px', background: headerBg, fontSize: 9, fontWeight: 600 }}>Nama Obat</th>
                    <th style={{ border: bdr, padding: '3px 6px', background: headerBg, fontSize: 9, fontWeight: 600, width: '12%' }}>Dosis</th>
                    <th style={{ border: bdr, padding: '3px 6px', background: headerBg, fontSize: 9, fontWeight: 600, width: '14%' }}>Frekuensi</th>
                    <th style={{ border: bdr, padding: '3px 6px', background: headerBg, fontSize: 9, fontWeight: 600, width: '10%', textAlign: 'center' }}>Jumlah</th>
                    <th style={{ border: bdr, padding: '3px 6px', background: headerBg, fontSize: 9, fontWeight: 600, width: '18%' }}>Aturan Pakai</th>
                  </tr>
                </thead>
                <tbody>
                  {(rx.items ?? []).map((item, i) => (
                    <tr key={item.id || i}>
                      <td style={{ border: bdr, padding: '3px 6px', fontSize: 10, textAlign: 'center' }}>{i + 1}</td>
                      <td style={{ border: bdr, padding: '3px 6px', fontSize: 10, fontWeight: 600 }}>{item.nama_obat}</td>
                      <td style={{ border: bdr, padding: '3px 6px', fontSize: 10 }}>{item.dosis || '-'}</td>
                      <td style={{ border: bdr, padding: '3px 6px', fontSize: 10 }}>{item.frekuensi || '-'}</td>
                      <td style={{ border: bdr, padding: '3px 6px', fontSize: 10, textAlign: 'center' }}>{item.jumlah} {item.satuan || ''}</td>
                      <td style={{ border: bdr, padding: '3px 6px', fontSize: 10 }}>{item.aturan_pakai || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rx.catatan_dokter && (
                <div style={{ fontSize: 10, marginBottom: 10 }}>
                  <span style={{ fontWeight: 600 }}>Catatan Dokter: </span>{rx.catatan_dokter}
                </div>
              )}
            </>
          )
        })()}

        {/* ──── CATATAN TAMBAHAN ──── */}
        {mr.catatan_tambahan && (
          <>
            <SectionHeader title="CATATAN TAMBAHAN" />
            <div style={{ border: bdrLight, borderRadius: 3, padding: '5px 8px', marginBottom: 10, fontSize: 10, whiteSpace: 'pre-wrap' }}>
              {mr.catatan_tambahan}
            </div>
          </>
        )}

        {/* ──── TANDA TANGAN ──── */}
        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {/* Kiri: Info cetak */}
          <div style={{ fontSize: 9, color: '#888' }}>
            <div>Dicetak: {formatDateTime(new Date().toISOString())}</div>
            <div>Status: {mr.status === 'final' ? 'Final' : 'Draft'}</div>
          </div>

          {/* Kanan: TTD dokter */}
          <div style={{ textAlign: 'center', minWidth: 200 }}>
            <div style={{ fontSize: 10 }}>
              {String(hospital?.settings?.kabupaten || hospital?.settings?.kota || '')},{' '}
              {formatDate(mr.updated_at || mr.created_at)}
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, marginTop: 2 }}>Dokter Pemeriksa,</div>
            <div style={{ height: 60 }} />
            <div style={{ borderBottom: '1px solid #000', display: 'inline-block', paddingLeft: 16, paddingRight: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 700 }}>{doctor?.nama || '-'}</span>
            </div>
            {doctor?.no_sip && (
              <div style={{ fontSize: 9, color: '#555', marginTop: 2 }}>SIP: {doctor.no_sip}</div>
            )}
            {doctor?.spesialisasi && (
              <div style={{ fontSize: 9, color: '#555' }}>{doctor.spesialisasi}</div>
            )}
          </div>
        </div>

        {/* ──── FOOTER ──── */}
        <div style={{ borderTop: '1px solid #ccc', marginTop: 16, paddingTop: 6, textAlign: 'center', fontSize: 8, color: '#aaa' }}>
          {hospital?.nama || 'SIMRS'} — Resume Medis — {patient.no_rekam_medis} — {visit.visit_number}
        </div>
      </div>
    </div>
  )
}

// ──── Sub-components ────

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1.5px solid #000', paddingBottom: 2, marginBottom: 6, marginTop: 8 }}>
      {title}
    </div>
  )
}

function Cell({ children, w, bold }: { children: React.ReactNode; w?: string; bold?: boolean }) {
  return (
    <td style={{ padding: '3px 4px', fontSize: 10, width: w, fontWeight: bold ? 600 : 400, verticalAlign: 'top', color: bold ? '#444' : '#111' }}>
      {children}
    </td>
  )
}

// ──── Utilities ────

function computeAge(dateStr?: string | null): string | null {
  if (!dateStr) return null
  const birth = new Date(dateStr)
  const now = new Date()
  let years = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) years--
  if (years < 1) {
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth()
    return `${months} bulan`
  }
  return `${years} tahun`
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatRupiah(n: number | string): string {
  const num = Math.round(Number(n) || 0)
  return `Rp ${num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
}
