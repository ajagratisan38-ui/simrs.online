'use client'

import { forwardRef } from 'react'
import type { GeneralConsentData } from '@/lib/api/general-consent'

interface GeneralConsentPrintProps {
  consent: GeneralConsentData
  rsName?: string
  rsAlamat?: string
  rsTelp?: string
}

export const GeneralConsentPrint = forwardRef<HTMLDivElement, GeneralConsentPrintProps>(
  function GeneralConsentPrint(
    {
      consent,
      rsName = 'SIMRS Demo',
      rsAlamat = 'Jl. Contoh No. 1, Kota Demo',
      rsTelp = '(021) 1234567',
    },
    ref,
  ) {
    const tanggalLahir = consent.patient_tanggal_lahir
      ? new Date(consent.patient_tanggal_lahir).toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })
      : '—'

    const tanggalBuat = new Date(consent.created_at).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })

    const jk =
      consent.patient_jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'

    function CheckItem({ checked, label }: { checked: boolean; label: string }) {
      return (
        <div className="flex items-start gap-2 py-1">
          <span className="inline-block w-4 h-4 border border-black text-center text-xs leading-4 shrink-0 mt-0.5">
            {checked ? '✓' : ''}
          </span>
          <span className="text-sm leading-relaxed">{label}</span>
        </div>
      )
    }

    return (
      <div
        ref={ref}
        className="print-a4 font-serif text-black bg-white max-w-[210mm] mx-auto"
        style={{ padding: '15mm 20mm', fontSize: '11pt', lineHeight: '1.6' }}
      >
        {/* KOP RS */}
        <div className="text-center border-b-2 border-black pb-3 mb-4">
          <h1 className="text-xl font-bold uppercase tracking-wider">
            {rsName}
          </h1>
          <p className="text-sm mt-1">{rsAlamat}</p>
          <p className="text-sm">Telp: {rsTelp}</p>
        </div>

        {/* Judul */}
        <h2
          className="text-center font-bold text-base uppercase tracking-wide mb-4"
          style={{ textDecoration: 'underline' }}
        >
          Formulir Persetujuan Umum (General Consent)
        </h2>

        {/* Data Pasien */}
        <div
          className="border border-black mb-4"
          style={{ padding: '8px 12px' }}
        >
          <p className="font-bold text-sm mb-2 uppercase">Data Pasien</p>
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td className="py-0.5" style={{ width: '160px' }}>No. Rekam Medis</td>
                <td style={{ width: '10px' }}>:</td>
                <td className="py-0.5 font-semibold">
                  {consent.no_rekam_medis || '—'}
                </td>
              </tr>
              <tr>
                <td className="py-0.5">Nama Pasien</td>
                <td>:</td>
                <td className="py-0.5 font-semibold">
                  {consent.patient_nama || '—'}
                </td>
              </tr>
              <tr>
                <td className="py-0.5">NIK</td>
                <td>:</td>
                <td className="py-0.5">{consent.patient_nik || '—'}</td>
              </tr>
              <tr>
                <td className="py-0.5">Tanggal Lahir</td>
                <td>:</td>
                <td className="py-0.5">{tanggalLahir}</td>
              </tr>
              <tr>
                <td className="py-0.5">Jenis Kelamin</td>
                <td>:</td>
                <td className="py-0.5">{jk}</td>
              </tr>
              <tr>
                <td className="py-0.5">Alamat</td>
                <td>:</td>
                <td className="py-0.5">
                  {consent.patient_alamat || '—'}
                </td>
              </tr>
              <tr>
                <td className="py-0.5">No. Telepon</td>
                <td>:</td>
                <td className="py-0.5">
                  {consent.patient_telepon || '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Isi Persetujuan */}
        <div className="mb-4">
          <p className="text-sm mb-2">
            Dengan menandatangani formulir ini, saya menyatakan bahwa:
          </p>

          <div className="ml-2 space-y-0.5">
            <CheckItem
              checked={consent.persetujuan_rawat}
              label="Saya menyetujui untuk menerima pelayanan kesehatan di rumah sakit ini, termasuk pemeriksaan fisik, tes diagnostik, dan tindakan medis sesuai standar pelayanan."
            />
            <CheckItem
              checked={consent.persetujuan_informasi}
              label="Saya bersedia diberikan informasi mengenai diagnosis, rencana tindakan medis, alternatif tindakan, risiko, komplikasi, dan prognosis oleh dokter/tenaga kesehatan yang merawat."
            />
            <CheckItem
              checked={consent.persetujuan_privasi}
              label="Saya memahami bahwa rumah sakit akan menjaga kerahasiaan data medis saya sesuai peraturan perundang-undangan yang berlaku (UU PDP dan permenkes)."
            />
            <CheckItem
              checked={consent.persetujuan_biaya}
              label="Saya memahami dan menyetujui ketentuan biaya pelayanan yang berlaku di rumah sakit ini, serta bersedia menanggung biaya yang timbul dari pelayanan kesehatan yang diterima."
            />
            <CheckItem
              checked={consent.persetujuan_tata_tertib}
              label="Saya bersedia mematuhi tata tertib dan peraturan yang berlaku di rumah sakit ini demi keamanan, ketertiban, dan kelancaran pelayanan."
            />
            <CheckItem
              checked={consent.persetujuan_pelepasan_info}
              label="Saya menyetujui pelepasan informasi medis kepada pihak yang berwenang (penjamin/asuransi, pemerintah, atau pihak ketiga) sesuai ketentuan yang berlaku."
            />
          </div>
        </div>

        {/* Penanggung Jawab */}
        {consent.penanggung_jawab_nama && (
          <div
            className="border border-black mb-4"
            style={{ padding: '8px 12px' }}
          >
            <p className="font-bold text-sm mb-2 uppercase">
              Data Penanggung Jawab
            </p>
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td className="py-0.5" style={{ width: '160px' }}>Nama</td>
                  <td style={{ width: '10px' }}>:</td>
                  <td className="py-0.5 font-semibold">
                    {consent.penanggung_jawab_nama}
                  </td>
                </tr>
                <tr>
                  <td className="py-0.5">Hubungan</td>
                  <td>:</td>
                  <td className="py-0.5">
                    {consent.penanggung_jawab_hubungan || '—'}
                  </td>
                </tr>
                <tr>
                  <td className="py-0.5">No. Telepon</td>
                  <td>:</td>
                  <td className="py-0.5">
                    {consent.penanggung_jawab_telepon || '—'}
                  </td>
                </tr>
                {consent.penanggung_jawab_alamat && (
                  <tr>
                    <td className="py-0.5">Alamat</td>
                    <td>:</td>
                    <td className="py-0.5">
                      {consent.penanggung_jawab_alamat}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Catatan */}
        {consent.catatan && (
          <div className="mb-4 text-sm">
            <p className="font-bold">Catatan:</p>
            <p className="italic">{consent.catatan}</p>
          </div>
        )}

        {/* Tanda Tangan */}
        <div className="mt-8">
          <div className="flex justify-between" style={{ gap: '40px' }}>
            {/* Kolom Pasien/Wali */}
            <div className="text-center flex-1">
              <p className="text-sm">
                {consent.penanggung_jawab_nama
                  ? 'Pasien / Wali'
                  : 'Pasien'}
              </p>
              <div style={{ height: '70px' }} />
              <p
                className="text-sm font-semibold border-t border-black pt-1"
                style={{ display: 'inline-block', minWidth: '180px' }}
              >
                {consent.signed_by ||
                  consent.penanggung_jawab_nama ||
                  consent.patient_nama ||
                  '(.................................)'}
              </p>
            </div>

            {/* Kolom Saksi/Petugas */}
            <div className="text-center flex-1">
              <p className="text-sm">Petugas Pendaftaran</p>
              <div style={{ height: '70px' }} />
              <p
                className="text-sm font-semibold border-t border-black pt-1"
                style={{ display: 'inline-block', minWidth: '180px' }}
              >
                (.................................)
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="text-center text-xs mt-6 pt-2 border-t border-gray-400"
          style={{ color: '#666' }}
        >
          <p>
            Dicetak pada:{' '}
            {new Date().toLocaleDateString('id-ID', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}{' '}
            pukul {new Date().toLocaleTimeString('id-ID')}
          </p>
          <p>Dibuat pada: {tanggalBuat}</p>
        </div>
      </div>
    )
  },
)
