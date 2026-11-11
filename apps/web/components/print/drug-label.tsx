'use client'

interface DrugLabelProps {
  namaObat: string
  dosis: string
  frekuensi: string
  aturanPakai: string
  jumlah: number
  satuan: string
  patientNama: string
  noRekamMedis: string
  tanggal: string
}

export function DrugLabel({
  namaObat,
  dosis,
  frekuensi,
  aturanPakai,
  jumlah,
  satuan,
  patientNama,
  noRekamMedis,
  tanggal,
}: DrugLabelProps) {
  return (
    <div className="print-drug-label">
      <div className="drug-name">{namaObat}</div>
      <div className="dosage">
        {dosis} — {frekuensi}
      </div>
      <div style={{ fontSize: '7pt', marginTop: '1mm' }}>
        {aturanPakai}
      </div>
      <div style={{ fontSize: '7pt' }}>
        Jumlah: {jumlah} {satuan}
      </div>
      <div className="patient-name">
        {patientNama} ({noRekamMedis})
        <br />
        {new Date(tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}
      </div>
    </div>
  )
}
