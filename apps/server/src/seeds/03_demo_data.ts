import type { Knex } from 'knex'
import { v4 as uuidv4 } from 'uuid'

const SCHEMA = 'tenant_rs-demo'

const FIRST_NAMES = [
  'Ahmad', 'Budi', 'Citra', 'Dewi', 'Eko', 'Fitri', 'Gunawan', 'Hesti',
  'Indra', 'Joko', 'Kartini', 'Lestari', 'Muhammad', 'Nina', 'Oki',
  'Putri', 'Qori', 'Rina', 'Slamet', 'Tuti', 'Udin', 'Vina', 'Wahyu',
  'Xena', 'Yuni', 'Zainal', 'Adi', 'Bella', 'Cahya', 'Dimas',
  'Erna', 'Fajar', 'Gita', 'Hadi', 'Ika', 'Jaya', 'Kurnia', 'Lina',
  'Mira', 'Nanda', 'Omar', 'Pandu', 'Ratna', 'Sari', 'Tono',
  'Utami', 'Vivi', 'Wawan', 'Yanto', 'Zara',
]

const LAST_NAMES = [
  'Pratama', 'Sanjaya', 'Wijaya', 'Kusuma', 'Hidayat', 'Santoso',
  'Rahayu', 'Saputra', 'Nugroho', 'Wati', 'Setiawan', 'Permata',
  'Lestari', 'Putri', 'Handoko', 'Budiman', 'Susanto', 'Gunawan',
  'Hartono', 'Purnama',
]

const KELURAHAN = ['Menteng', 'Kemang', 'Cikini', 'Gambir', 'Kebayoran', 'Cipete', 'Senayan']
const KECAMATAN = ['Menteng', 'Kemang', 'Kebayoran Baru', 'Gambir', 'Tanah Abang']
const PEKERJAAN = ['PNS', 'Wiraswasta', 'Karyawan Swasta', 'Ibu Rumah Tangga', 'Mahasiswa', 'Pensiunan', 'Guru', 'Pedagang']

const ICD10_CODES = [
  { code: 'J06.9', name: 'Acute upper respiratory infection' },
  { code: 'K30', name: 'Functional dyspepsia' },
  { code: 'I10', name: 'Essential (primary) hypertension' },
  { code: 'E11.9', name: 'Type 2 diabetes mellitus' },
  { code: 'M54.5', name: 'Low back pain' },
  { code: 'R51', name: 'Headache' },
  { code: 'A09', name: 'Infectious gastroenteritis and colitis' },
  { code: 'J18.9', name: 'Pneumonia, unspecified organism' },
  { code: 'N39.0', name: 'Urinary tract infection' },
  { code: 'K29.7', name: 'Gastritis, unspecified' },
  { code: 'J02.9', name: 'Acute pharyngitis' },
  { code: 'R50.9', name: 'Fever, unspecified' },
]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomDate(daysBack: number): string {
  const d = new Date()
  d.setDate(d.getDate() - Math.floor(Math.random() * daysBack))
  return d.toISOString().slice(0, 10)
}

function randomNik(): string {
  return `32${String(randInt(1, 99)).padStart(2, '0')}${String(randInt(1000000000, 9999999999))}`.slice(0, 16)
}

function randomPhone(): string {
  return `08${randInt(10, 99)}${randInt(1000000, 9999999)}`
}

export async function seed(knex: Knex): Promise<void> {
  // Check if tenant exists
  const tenant = await knex('tenants').where({ slug: 'rs-demo' }).first()
  if (!tenant) {
    console.log('Tenant rs-demo not found. Run 01_demo_tenant seed first.')
    return
  }

  // Cleanup existing demo data (reverse order to respect FK constraints)
  console.log('Cleaning up existing demo data...')
  await knex.withSchema(SCHEMA).del().from('mcu_package_items').catch(() => {})
  await knex.withSchema(SCHEMA).del().from('mcu_examinations').catch(() => {})
  await knex.withSchema(SCHEMA).del().from('mcu_registrations').catch(() => {})
  await knex.withSchema(SCHEMA).del().from('mcu_packages').catch(() => {})
  await knex.withSchema(SCHEMA).del().from('payments').catch(() => {})
  await knex.withSchema(SCHEMA).del().from('bill_items').catch(() => {})
  await knex.withSchema(SCHEMA).del().from('bills').catch(() => {})
  await knex.withSchema(SCHEMA).del().from('diagnoses').catch(() => {})
  await knex.withSchema(SCHEMA).del().from('medical_records').catch(() => {})
  await knex.withSchema(SCHEMA).del().from('visits').catch(() => {})
  await knex.withSchema(SCHEMA).del().from('drug_stocks').catch(() => {})
  await knex.withSchema(SCHEMA).del().from('drugs').catch(() => {})
  await knex.withSchema(SCHEMA).del().from('patients').catch(() => {})
  console.log('  ✓ Existing demo data cleaned')

  // Get existing users/doctors/rooms
  const doctors = await knex.withSchema(SCHEMA).select('*').from('doctors')
  const rooms = await knex.withSchema(SCHEMA).select('*').from('rooms')
  const users = await knex.withSchema(SCHEMA).select('id', 'role').from('users')

  if (doctors.length === 0 || rooms.length === 0) {
    console.log('No doctors or rooms found. Run 01_demo_tenant seed first.')
    return
  }

  const poliRooms = rooms.filter((r: Record<string, unknown>) => r.tipe === 'poli')
  const adminUser = users.find((u: Record<string, unknown>) => u.role === 'admin')
  const pendaftaranUser = users.find((u: Record<string, unknown>) => u.role === 'pendaftaran')

  // ═══════════════════════════════════════
  // 1. INSERT 100 PATIENTS
  // ═══════════════════════════════════════
  const patients: Array<Record<string, unknown>> = []
  const usedNiks = new Set<string>()

  for (let i = 0; i < 100; i++) {
    let nik = randomNik()
    while (usedNiks.has(nik)) nik = randomNik()
    usedNiks.add(nik)

    const gender = Math.random() > 0.5 ? 'L' : 'P'
    const firstName = pick(FIRST_NAMES)
    const lastName = pick(LAST_NAMES)
    const name = `${firstName} ${lastName}`
    const dob = `${randInt(1960, 2005)}-${String(randInt(1, 12)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`
    const rm = `RM-DEMO-${String(i + 1).padStart(5, '0')}`

    patients.push({
      id: uuidv4(),
      no_rekam_medis: rm,
      nik,
      nama: name,
      tempat_lahir: pick(['Jakarta', 'Bandung', 'Surabaya', 'Yogyakarta', 'Semarang', 'Medan']),
      tanggal_lahir: dob,
      jenis_kelamin: gender,
      golongan_darah: pick(['A', 'B', 'AB', 'O', null]),
      alamat: `Jl. ${pick(['Sudirman', 'Gatot Subroto', 'Merdeka', 'Ahmad Yani', 'Diponegoro'])} No. ${randInt(1, 200)}`,
      kelurahan: pick(KELURAHAN),
      kecamatan: pick(KECAMATAN),
      kabupaten: 'Jakarta Selatan',
      provinsi: 'DKI Jakarta',
      kode_pos: `1${randInt(2000, 2999)}`,
      no_telepon: randomPhone(),
      pekerjaan: pick(PEKERJAAN),
      status_pernikahan: pick(['Belum Menikah', 'Menikah', 'Cerai']),
      no_bpjs: Math.random() > 0.4 ? `000${randInt(1000000000, 9999999999)}`.slice(0, 13) : null,
      kelas_bpjs: Math.random() > 0.4 ? pick([1, 2, 3]) : null,
      is_active: true,
      created_by: adminUser?.id,
    })
  }

  await knex.withSchema(SCHEMA).insert(patients).into('patients')
  console.log(`  ✓ ${patients.length} patients inserted`)

  // ═══════════════════════════════════════
  // 2. INSERT 50 DRUGS
  // ═══════════════════════════════════════
  const drugNames = [
    'Paracetamol 500mg', 'Amoxicillin 500mg', 'Omeprazole 20mg', 'Amlodipine 5mg',
    'Metformin 500mg', 'Cetirizine 10mg', 'Ranitidine 150mg', 'Ibuprofen 400mg',
    'Captopril 25mg', 'Simvastatin 20mg', 'Metronidazole 500mg', 'Ciprofloxacin 500mg',
    'Dexamethasone 0.5mg', 'Cefadroxil 500mg', 'Acarbose 50mg', 'Losartan 50mg',
    'Glimepiride 2mg', 'Lansoprazole 30mg', 'Domperidone 10mg', 'Meloxicam 15mg',
    'Diclofenac Sodium 50mg', 'Methylprednisolone 4mg', 'Azithromycin 500mg',
    'Salbutamol 2mg', 'Ambroxol 30mg', 'OBH Combi Batuk', 'CTM 4mg',
    'Vitamin B Complex', 'Vitamin C 500mg', 'Antasida DOEN', 'Loperamide 2mg',
    'Ondansetron 4mg', 'Ketorolac 30mg', 'Tramadol 50mg', 'Alprazolam 0.5mg',
    'Bisoprolol 5mg', 'Furosemide 40mg', 'Spironolactone 25mg', 'Clopidogrel 75mg',
    'Asam Mefenamat 500mg', 'Piroxicam 20mg', 'Doxycycline 100mg',
    'Cotrimoxazole 480mg', 'Rifampicin 450mg', 'INH 300mg', 'Ethambutol 500mg',
    'NaCl 0.9% 500ml', 'RL 500ml', 'D5% 500ml', 'Aquadest 500ml',
  ]

  const drugs: Array<Record<string, unknown>> = []
  for (let i = 0; i < drugNames.length; i++) {
    const hargaBeli = randInt(500, 50000)
    drugs.push({
      id: uuidv4(),
      kode: `OBT-${String(i + 1).padStart(4, '0')}`,
      nama: drugNames[i],
      nama_generik: drugNames[i]!.split(' ')[0],
      kategori: i >= 46 ? 'bmhp' : 'obat',
      satuan_kecil: i >= 46 ? 'botol' : pick(['tablet', 'kapsul', 'sirup']),
      satuan_besar: i >= 46 ? 'dus' : 'box',
      konversi: i >= 46 ? 20 : pick([10, 30, 50, 100]),
      harga_beli: hargaBeli,
      harga_jual: Math.round(hargaBeli * 1.25),
      margin_persen: 25,
      stok_minimum: randInt(10, 50),
      is_active: true,
    })
  }

  await knex.withSchema(SCHEMA).insert(drugs).into('drugs')
  console.log(`  ✓ ${drugs.length} drugs inserted`)

  // Drug stocks — expiry jauh di depan & stok selalu >= minimum supaya alerts kosong saat fresh seed
  const stocks: Array<Record<string, unknown>> = []
  for (const drug of drugs) {
    const stokMin = drug.stok_minimum as number
    const stokAwal = randInt(Math.max(100, stokMin * 3), Math.max(500, stokMin * 5))
    const stokSisa = randInt(Math.max(stokMin + 20, stokMin * 2), stokAwal)
    stocks.push({
      id: uuidv4(),
      drug_id: drug.id,
      batch_number: `B${randInt(20260100, 20261200)}`,
      tanggal_kadaluarsa: `${randInt(2028, 2030)}-${String(randInt(1, 12)).padStart(2, '0')}-28`,
      stok_awal: stokAwal,
      stok_sisa: stokSisa,
      harga_beli_per_unit: drug.harga_beli as number,
      supplier: pick(['PT Kimia Farma', 'PT Kalbe Farma', 'PT Dexa Medica', 'PT Sanbe Farma']),
      tanggal_masuk: randomDate(60),
    })
  }

  await knex.withSchema(SCHEMA).insert(stocks).into('drug_stocks')
  console.log(`  ✓ ${stocks.length} drug stocks inserted`)

  // ═══════════════════════════════════════
  // 3. INSERT 30 DAYS OF VISITS (~15/day = ~450 total)
  // ═══════════════════════════════════════
  const visits: Array<Record<string, unknown>> = []
  const visitIds: string[] = []
  let visitCounter = 0

  for (let day = 29; day >= 0; day--) {
    const d = new Date()
    d.setDate(d.getDate() - day)
    const dateStr = d.toISOString().slice(0, 10)
    const dailyCount = randInt(10, 20)

    for (let v = 0; v < dailyCount; v++) {
      visitCounter++
      const visitId = uuidv4()
      visitIds.push(visitId)
      const patient = pick(patients)
      const doctor = pick(doctors)
      const room = pick(poliRooms)

      const hour = randInt(7, 14)
      const minute = randInt(0, 59)
      const createdAt = `${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`

      visits.push({
        id: visitId,
        patient_id: patient.id,
        visit_number: `KJ-${dateStr.replace(/-/g, '')}-${String(visitCounter).padStart(5, '0')}`,
        tipe: Math.random() > 0.1 ? 'rawat_jalan' : 'igd',
        status: day > 0 ? 'selesai' : pick(['menunggu', 'diperiksa', 'selesai']),
        tanggal: dateStr,
        room_id: room.id,
        doctor_id: doctor.id,
        penjamin: pick(['umum', 'umum', 'bpjs', 'bpjs', 'bpjs', 'asuransi']),
        cara_masuk: 'datang_sendiri',
        created_at: createdAt,
        updated_at: createdAt,
        created_by: pendaftaranUser?.id,
      })
    }
  }

  // Insert in chunks of 100
  for (let i = 0; i < visits.length; i += 100) {
    await knex.withSchema(SCHEMA).insert(visits.slice(i, i + 100)).into('visits')
  }
  console.log(`  ✓ ${visits.length} visits inserted (30 days)`)

  // ═══════════════════════════════════════
  // 4. MEDICAL RECORDS + DIAGNOSES
  // ═══════════════════════════════════════
  const completedVisits = visits.filter((v) => v.status === 'selesai')
  const medRecords: Array<Record<string, unknown>> = []
  const diagnoses: Array<Record<string, unknown>> = []

  for (const visit of completedVisits) {
    const mrId = uuidv4()
    medRecords.push({
      id: mrId,
      visit_id: visit.id,
      patient_id: visit.patient_id,
      doctor_id: visit.doctor_id,
      subjective: pick([
        'Pasien mengeluh demam sejak 2 hari yang lalu',
        'Nyeri perut bagian atas',
        'Batuk berdahak selama 3 hari',
        'Pusing dan mual',
        'Nyeri pinggang kiri',
        'Sesak nafas ringan',
      ]),
      objective: JSON.stringify({
        tekanan_darah: `${randInt(100, 150)}/${randInt(60, 95)}`,
        nadi: randInt(60, 100),
        suhu: (36 + Math.random() * 2.5).toFixed(1),
        respirasi: randInt(14, 22),
      }),
      assessment: pick(ICD10_CODES).name,
      plan: pick([
        'Terapi medikamentosa',
        'Istirahat dan minum obat teratur',
        'Kontrol 1 minggu',
        'Rujuk ke spesialis',
        'Rawat jalan, observasi',
      ]),
      vital_signs: JSON.stringify({
        tekanan_darah_sistolik: randInt(100, 150),
        tekanan_darah_diastolik: randInt(60, 95),
        nadi: randInt(60, 100),
        suhu: parseFloat((36 + Math.random() * 2.5).toFixed(1)),
        respirasi: randInt(14, 22),
        berat_badan: randInt(40, 90),
        tinggi_badan: randInt(150, 185),
      }),
      status: 'final',
      created_at: visit.created_at,
      updated_at: visit.created_at,
    })

    const diag = pick(ICD10_CODES)
    diagnoses.push({
      id: uuidv4(),
      medical_record_id: mrId,
      icd10_code: diag.code,
      icd10_name: diag.name,
      tipe: 'utama',
      created_at: visit.created_at,
    })

    if (Math.random() > 0.6) {
      const diag2 = pick(ICD10_CODES)
      diagnoses.push({
        id: uuidv4(),
        medical_record_id: mrId,
        icd10_code: diag2.code,
        icd10_name: diag2.name,
        tipe: 'sekunder',
        created_at: visit.created_at,
      })
    }
  }

  for (let i = 0; i < medRecords.length; i += 100) {
    await knex.withSchema(SCHEMA).insert(medRecords.slice(i, i + 100)).into('medical_records')
  }
  console.log(`  ✓ ${medRecords.length} medical records inserted`)

  for (let i = 0; i < diagnoses.length; i += 100) {
    await knex.withSchema(SCHEMA).insert(diagnoses.slice(i, i + 100)).into('diagnoses')
  }
  console.log(`  ✓ ${diagnoses.length} diagnoses inserted`)

  // ═══════════════════════════════════════
  // 5. BILLS + BILL_ITEMS + PAYMENTS
  // ═══════════════════════════════════════
  const bills: Array<Record<string, unknown>> = []
  const billItems: Array<Record<string, unknown>> = []
  const payments: Array<Record<string, unknown>> = []

  for (const visit of completedVisits) {
    const billId = uuidv4()
    const konsultasi = pick([100000, 150000, 175000])
    const obat = randInt(10000, 200000)
    const admin = 10000
    const total = konsultasi + obat + admin

    const isPaid = Math.random() > 0.15

    bills.push({
      id: billId,
      visit_id: visit.id,
      patient_id: visit.patient_id,
      total_amount: total,
      discount_amount: 0,
      final_amount: total,
      penjamin: visit.penjamin,
      status: isPaid ? 'dibayar' : 'final',
      created_at: visit.created_at,
      updated_at: visit.created_at,
      created_by: adminUser?.id,
    })

    billItems.push(
      {
        id: uuidv4(),
        bill_id: billId,
        kategori: 'konsultasi',
        deskripsi: 'Konsultasi Dokter',
        qty: 1,
        harga_satuan: konsultasi,
        subtotal: konsultasi,
        discount: 0,
        total: konsultasi,
        created_at: visit.created_at,
      },
      {
        id: uuidv4(),
        bill_id: billId,
        kategori: 'obat',
        deskripsi: 'Resep Obat',
        qty: 1,
        harga_satuan: obat,
        subtotal: obat,
        discount: 0,
        total: obat,
        created_at: visit.created_at,
      },
      {
        id: uuidv4(),
        bill_id: billId,
        kategori: 'admin',
        deskripsi: 'Biaya Administrasi',
        qty: 1,
        harga_satuan: admin,
        subtotal: admin,
        discount: 0,
        total: admin,
        created_at: visit.created_at,
      },
    )

    if (isPaid) {
      payments.push({
        id: uuidv4(),
        bill_id: billId,
        metode: pick(['tunai', 'tunai', 'debit', 'transfer', 'bpjs']),
        jumlah: total,
        paid_at: visit.created_at,
        created_at: visit.created_at,
      })
    }
  }

  for (let i = 0; i < bills.length; i += 100) {
    await knex.withSchema(SCHEMA).insert(bills.slice(i, i + 100)).into('bills')
  }
  console.log(`  ✓ ${bills.length} bills inserted`)

  for (let i = 0; i < billItems.length; i += 100) {
    await knex.withSchema(SCHEMA).insert(billItems.slice(i, i + 100)).into('bill_items')
  }
  console.log(`  ✓ ${billItems.length} bill items inserted`)

  if (payments.length > 0) {
    for (let i = 0; i < payments.length; i += 100) {
      await knex.withSchema(SCHEMA).insert(payments.slice(i, i + 100)).into('payments')
    }
  }
  console.log(`  ✓ ${payments.length} payments inserted`)

  // ═══════════════════════════════════════
  // MCU PACKAGES (seed default packages)
  // ═══════════════════════════════════════
  console.log('\nSeeding MCU packages...')

  const mcuPackageExists = await knex.withSchema(SCHEMA)
    .select('id').from('mcu_packages').first().catch(() => null)

  if (!mcuPackageExists) {
    const pkgBasicId = uuidv4()
    const pkgExecId = uuidv4()
    const pkgPreEmployId = uuidv4()

    try {
      await knex.withSchema(SCHEMA).insert([
        { id: pkgBasicId, nama: 'Paket Basic', kode: 'MCU-B', deskripsi: 'Pemeriksaan kesehatan dasar', harga: 350000 },
        { id: pkgExecId, nama: 'Paket Executive', kode: 'MCU-E', deskripsi: 'Pemeriksaan kesehatan lengkap', harga: 1500000 },
        { id: pkgPreEmployId, nama: 'Paket Pre-Employment', kode: 'MCU-PE', deskripsi: 'MCU untuk calon karyawan', harga: 750000 },
      ]).into('mcu_packages')

      await knex.withSchema(SCHEMA).insert([
        { package_id: pkgBasicId, kategori: 'fisik_umum', nama: 'Pemeriksaan Fisik Umum', sort_order: 0 },
        { package_id: pkgBasicId, kategori: 'lab', nama: 'Darah Lengkap (CBC)', sort_order: 1 },
        { package_id: pkgBasicId, kategori: 'lab', nama: 'Urine Lengkap', sort_order: 2 },
        { package_id: pkgBasicId, kategori: 'radiologi', nama: 'Rontgen Thorax PA', sort_order: 3 },

        { package_id: pkgExecId, kategori: 'fisik_umum', nama: 'Pemeriksaan Fisik Umum', sort_order: 0 },
        { package_id: pkgExecId, kategori: 'mata', nama: 'Visus & Buta Warna', sort_order: 1 },
        { package_id: pkgExecId, kategori: 'tht', nama: 'Pemeriksaan THT', sort_order: 2 },
        { package_id: pkgExecId, kategori: 'gigi', nama: 'Pemeriksaan Gigi & Mulut', sort_order: 3 },
        { package_id: pkgExecId, kategori: 'lab', nama: 'Darah Lengkap (CBC)', sort_order: 4 },
        { package_id: pkgExecId, kategori: 'lab', nama: 'Gula Darah Puasa', sort_order: 5 },
        { package_id: pkgExecId, kategori: 'lab', nama: 'Kolesterol Total', sort_order: 6 },
        { package_id: pkgExecId, kategori: 'lab', nama: 'SGOT/SGPT', sort_order: 7 },
        { package_id: pkgExecId, kategori: 'lab', nama: 'Urine Lengkap', sort_order: 8 },
        { package_id: pkgExecId, kategori: 'radiologi', nama: 'Rontgen Thorax PA', sort_order: 9 },
        { package_id: pkgExecId, kategori: 'ekg', nama: 'EKG (Elektrokardiogram)', sort_order: 10 },
        { package_id: pkgExecId, kategori: 'audiometri', nama: 'Audiometri', sort_order: 11 },
        { package_id: pkgExecId, kategori: 'spirometri', nama: 'Spirometri', sort_order: 12 },

        { package_id: pkgPreEmployId, kategori: 'fisik_umum', nama: 'Pemeriksaan Fisik Umum', sort_order: 0 },
        { package_id: pkgPreEmployId, kategori: 'mata', nama: 'Visus & Buta Warna', sort_order: 1 },
        { package_id: pkgPreEmployId, kategori: 'lab', nama: 'Darah Lengkap (CBC)', sort_order: 2 },
        { package_id: pkgPreEmployId, kategori: 'lab', nama: 'Urine Lengkap', sort_order: 3 },
        { package_id: pkgPreEmployId, kategori: 'lab', nama: 'Narkoba (Urine)', sort_order: 4 },
        { package_id: pkgPreEmployId, kategori: 'radiologi', nama: 'Rontgen Thorax PA', sort_order: 5 },
        { package_id: pkgPreEmployId, kategori: 'ekg', nama: 'EKG (Elektrokardiogram)', sort_order: 6 },
      ]).into('mcu_package_items')

      console.log('  ✓ 3 MCU packages with items seeded')
    } catch {
      console.log('  ⚠ MCU tables may not exist yet, skipping MCU seed')
    }
  } else {
    console.log('  ⚠ MCU packages already exist, skipping')
  }

  // ═══════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════
  console.log('\n=== Demo Data Summary ===')
  console.log(`Patients:        ${patients.length}`)
  console.log(`Drugs:           ${drugs.length}`)
  console.log(`Drug Stocks:     ${stocks.length}`)
  console.log(`Visits (30d):    ${visits.length}`)
  console.log(`Medical Records: ${medRecords.length}`)
  console.log(`Diagnoses:       ${diagnoses.length}`)
  console.log(`Bills:           ${bills.length}`)
  console.log(`Bill Items:      ${billItems.length}`)
  console.log(`Payments:        ${payments.length}`)
  console.log(`MCU Packages:    3`)
  console.log('=========================')
}
