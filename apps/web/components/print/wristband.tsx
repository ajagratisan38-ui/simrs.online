'use client'

interface WristbandProps {
  patientNama: string
  noRekamMedis: string
  tanggalLahir: string
  jenisKelamin: string
  golonganDarah?: string | null
  alergi?: string[]
  noKunjungan?: string
}

export function Wristband({
  patientNama,
  noRekamMedis,
  tanggalLahir,
  jenisKelamin,
  golonganDarah,
  alergi,
  noKunjungan,
}: WristbandProps) {
  const birthDate = new Date(tanggalLahir).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  return (
    <div className="print-wristband">
      <div className="patient-info">
        <div className="patient-name">{patientNama}</div>
        <div>
          RM: {noRekamMedis} | {birthDate} |{' '}
          {jenisKelamin === 'L' ? 'Lk' : 'Pr'}
          {golonganDarah && ` | Gol: ${golonganDarah}`}
        </div>
        {alergi && alergi.length > 0 && (
          <div style={{ fontWeight: 'bold' }}>
            ⚠ ALERGI: {alergi.join(', ')}
          </div>
        )}
      </div>
      {noKunjungan && (
        <div style={{ fontFamily: 'monospace', fontSize: '8pt' }}>
          {noKunjungan}
        </div>
      )}
    </div>
  )
}
