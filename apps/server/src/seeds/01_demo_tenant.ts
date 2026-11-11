import type { Knex } from 'knex'
import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12

export async function seed(knex: Knex): Promise<void> {
  // =============================================
  // 0. Cleanup: drop existing tenant schema jika ada
  // =============================================
  await knex.raw("SELECT drop_tenant_schema('rs-demo')")

  // =============================================
  // 1. Super Admin (schema public)
  // =============================================
  await knex('super_admins').del()
  await knex('tenants').del()

  const superAdminPassword = await bcrypt.hash('Admin123!', SALT_ROUNDS)

  await knex('super_admins').insert({
    email: 'admin@simrs.id',
    password_hash: superAdminPassword,
    name: 'Super Admin SIMRS',
    role: 'superadmin',
    sa_role: 'owner',
  })

  // =============================================
  // 2. Tenant Demo
  // =============================================
  const [tenant] = await knex('tenants')
    .insert({
      name: 'RS Demo SIMRS',
      slug: 'rs-demo',
      address: 'Jl. Contoh No. 123, Jakarta Selatan',
      phone: '021-12345678',
      email: 'info@rs-demo.simrs.id',
      subscription_plan: 'professional',
      subscription_expires_at: knex.raw("NOW() + INTERVAL '1 year'"),
      is_active: true,
      settings: JSON.stringify({
        timezone: 'Asia/Jakarta',
        locale: 'id-ID',
        currency: 'IDR',
      }),
    })
    .returning('id')

  const tenantId = tenant.id

  // =============================================
  // 3. Buat schema tenant via function
  // =============================================
  await knex.raw("SELECT create_tenant_schema('rs-demo')")

  const schema = 'tenant_rs-demo'

  // =============================================
  // 4. Users dalam tenant
  // =============================================
  const adminPassword = await bcrypt.hash('Demo123!', SALT_ROUNDS)
  const userPassword = await bcrypt.hash('User123!', SALT_ROUNDS)

  const users = [
    {
      email: 'admin@rs-demo.simrs.id',
      password_hash: adminPassword,
      name: 'Admin RS Demo',
      role: 'admin',
      phone: '081234567890',
    },
    {
      email: 'dr.budi@rs-demo.simrs.id',
      password_hash: userPassword,
      name: 'dr. Budi Santoso, Sp.PD',
      role: 'dokter',
      phone: '081234567891',
    },
    {
      email: 'dr.siti@rs-demo.simrs.id',
      password_hash: userPassword,
      name: 'dr. Siti Rahayu, Sp.A',
      role: 'dokter',
      phone: '081234567892',
    },
    {
      email: 'dr.andi@rs-demo.simrs.id',
      password_hash: userPassword,
      name: 'dr. Andi Wijaya',
      role: 'dokter',
      phone: '081234567893',
    },
    {
      email: 'perawat.dewi@rs-demo.simrs.id',
      password_hash: userPassword,
      name: 'Dewi Lestari, S.Kep',
      role: 'perawat',
      phone: '081234567894',
    },
    {
      email: 'apoteker.rina@rs-demo.simrs.id',
      password_hash: userPassword,
      name: 'Rina Wulandari, S.Farm, Apt',
      role: 'apoteker',
      phone: '081234567895',
    },
    {
      email: 'kasir.maya@rs-demo.simrs.id',
      password_hash: userPassword,
      name: 'Maya Putri',
      role: 'kasir',
      phone: '081234567896',
    },
    {
      email: 'pendaftaran.ahmad@rs-demo.simrs.id',
      password_hash: userPassword,
      name: 'Ahmad Fauzi',
      role: 'pendaftaran',
      phone: '081234567897',
    },
    {
      email: 'rekammedis@rs-demo.simrs.id',
      password_hash: userPassword,
      name: 'Petugas Rekam Medis',
      role: 'rekam_medis',
      phone: '081234567898',
    },
    {
      email: 'manajemen@rs-demo.simrs.id',
      password_hash: userPassword,
      name: 'Pimpinan RS',
      role: 'manajemen',
      phone: '081234567899',
    },
    {
      email: 'lab@rs-demo.simrs.id',
      password_hash: userPassword,
      name: 'Petugas Lab',
      role: 'lab',
      phone: '081234567900',
    },
    {
      email: 'radiologi@rs-demo.simrs.id',
      password_hash: userPassword,
      name: 'Petugas Radiologi',
      role: 'radiologi',
      phone: '081234567901',
    },
  ]

  const insertedUsers = await knex
    .withSchema(schema)
    .insert(users)
    .into('users')
    .returning(['id', 'email', 'role'])

  // =============================================
  // 5. Doctors (link ke users yang role=dokter)
  // =============================================
  const dokterBudi = insertedUsers.find((u) => u.email === 'dr.budi@rs-demo.simrs.id')
  const dokterSiti = insertedUsers.find((u) => u.email === 'dr.siti@rs-demo.simrs.id')
  const dokterAndi = insertedUsers.find((u) => u.email === 'dr.andi@rs-demo.simrs.id')

  const doctors = [
    {
      user_id: dokterBudi!.id,
      spesialisasi: 'Penyakit Dalam',
      no_sip: 'SIP-PD-2024-001',
      no_str: 'STR-2024-00001',
      tarif_konsultasi: 150000,
      is_available: true,
      jadwal_praktek: JSON.stringify({
        senin: { mulai: '08:00', selesai: '14:00' },
        selasa: { mulai: '08:00', selesai: '14:00' },
        rabu: { mulai: '08:00', selesai: '14:00' },
        kamis: { mulai: '08:00', selesai: '14:00' },
        jumat: { mulai: '08:00', selesai: '12:00' },
      }),
    },
    {
      user_id: dokterSiti!.id,
      spesialisasi: 'Anak',
      no_sip: 'SIP-AN-2024-002',
      no_str: 'STR-2024-00002',
      tarif_konsultasi: 175000,
      is_available: true,
      jadwal_praktek: JSON.stringify({
        senin: { mulai: '09:00', selesai: '15:00' },
        rabu: { mulai: '09:00', selesai: '15:00' },
        jumat: { mulai: '09:00', selesai: '13:00' },
      }),
    },
    {
      user_id: dokterAndi!.id,
      spesialisasi: 'Umum',
      no_sip: 'SIP-UM-2024-003',
      no_str: 'STR-2024-00003',
      tarif_konsultasi: 100000,
      is_available: true,
      jadwal_praktek: JSON.stringify({
        senin: { mulai: '07:00', selesai: '14:00' },
        selasa: { mulai: '07:00', selesai: '14:00' },
        rabu: { mulai: '07:00', selesai: '14:00' },
        kamis: { mulai: '07:00', selesai: '14:00' },
        jumat: { mulai: '07:00', selesai: '12:00' },
        sabtu: { mulai: '08:00', selesai: '12:00' },
      }),
    },
  ]

  await knex.withSchema(schema).insert(doctors).into('doctors')

  // =============================================
  // 6. Rooms
  // =============================================
  const rooms = [
    // ===== 1. Pelayanan Umum & Gigi =====
    { kode: 'POLI-UMM', nama: 'Poli Umum', tipe: 'poli', lantai: 1, kapasitas: 1, tarif_per_hari: 0 },
    { kode: 'POLI-GGU', nama: 'Poli Gigi Umum', tipe: 'poli', lantai: 1, kapasitas: 1, tarif_per_hari: 0 },
    { kode: 'POLI-KGI', nama: 'Poli Spesialis Konservasi Gigi', tipe: 'poli', lantai: 1, kapasitas: 1, tarif_per_hari: 0 },
    { kode: 'POLI-ORT', nama: 'Poli Ortodonsia', tipe: 'poli', lantai: 1, kapasitas: 1, tarif_per_hari: 0 },
    { kode: 'POLI-BMU', nama: 'Poli Bedah Mulut', tipe: 'poli', lantai: 1, kapasitas: 1, tarif_per_hari: 0 },
    { kode: 'POLI-PED', nama: 'Poli Gigi Anak (Pedodonsia)', tipe: 'poli', lantai: 1, kapasitas: 1, tarif_per_hari: 0 },

    // ===== 2. Spesialis Dasar =====
    { kode: 'POLI-INT', nama: 'Poli Penyakit Dalam', tipe: 'poli', lantai: 1, kapasitas: 1, tarif_per_hari: 0 },
    { kode: 'POLI-ANK', nama: 'Poli Anak (Pediatri)', tipe: 'poli', lantai: 1, kapasitas: 1, tarif_per_hari: 0 },
    { kode: 'POLI-OBG', nama: 'Poli Kebidanan dan Kandungan', tipe: 'poli', lantai: 1, kapasitas: 1, tarif_per_hari: 0 },
    { kode: 'POLI-BDU', nama: 'Poli Bedah Umum', tipe: 'poli', lantai: 1, kapasitas: 1, tarif_per_hari: 0 },
    { kode: 'POLI-ANS', nama: 'Poli Anestesi / Manajemen Nyeri', tipe: 'poli', lantai: 1, kapasitas: 1, tarif_per_hari: 0 },
    { kode: 'POLI-RAD', nama: 'Poli Radiologi', tipe: 'poli', lantai: 1, kapasitas: 1, tarif_per_hari: 0 },
    { kode: 'POLI-PAT', nama: 'Poli Patologi Klinik / Anatomi', tipe: 'poli', lantai: 1, kapasitas: 1, tarif_per_hari: 0 },

    // ===== 3. Spesialis & Subspesialis =====
    { kode: 'POLI-JAN', nama: 'Poli Jantung dan Pembuluh Darah', tipe: 'poli', lantai: 2, kapasitas: 1, tarif_per_hari: 0 },
    { kode: 'POLI-SAR', nama: 'Poli Saraf (Neurologi)', tipe: 'poli', lantai: 2, kapasitas: 1, tarif_per_hari: 0 },
    { kode: 'POLI-MAT', nama: 'Poli Mata (Oftalmologi)', tipe: 'poli', lantai: 2, kapasitas: 1, tarif_per_hari: 0 },
    { kode: 'POLI-THT', nama: 'Poli THT-KL', tipe: 'poli', lantai: 2, kapasitas: 1, tarif_per_hari: 0 },
    { kode: 'POLI-KUL', nama: 'Poli Kulit dan Kelamin', tipe: 'poli', lantai: 2, kapasitas: 1, tarif_per_hari: 0 },
    { kode: 'POLI-PAR', nama: 'Poli Paru (Pulmonologi)', tipe: 'poli', lantai: 2, kapasitas: 1, tarif_per_hari: 0 },
    { kode: 'POLI-ORP', nama: 'Poli Ortopedi dan Traumatologi', tipe: 'poli', lantai: 2, kapasitas: 1, tarif_per_hari: 0 },
    { kode: 'POLI-URO', nama: 'Poli Urologi', tipe: 'poli', lantai: 2, kapasitas: 1, tarif_per_hari: 0 },
    { kode: 'POLI-BSR', nama: 'Poli Bedah Saraf', tipe: 'poli', lantai: 2, kapasitas: 1, tarif_per_hari: 0 },
    { kode: 'POLI-BPL', nama: 'Poli Bedah Plastik, Rekonstruksi & Estetika', tipe: 'poli', lantai: 2, kapasitas: 1, tarif_per_hari: 0 },
    { kode: 'POLI-BTV', nama: 'Poli Bedah Toraks Kardiak & Vaskular', tipe: 'poli', lantai: 2, kapasitas: 1, tarif_per_hari: 0 },
    { kode: 'POLI-PSI', nama: 'Poli Kedokteran Jiwa / Psikiatri', tipe: 'poli', lantai: 2, kapasitas: 1, tarif_per_hari: 0 },
    { kode: 'POLI-PSK', nama: 'Poli Psikologi Klinis', tipe: 'poli', lantai: 2, kapasitas: 1, tarif_per_hari: 0 },

    // ===== 4. Penunjang & Terapi =====
    { kode: 'POLI-REH', nama: 'Poli Rehabilitasi Medik (Fisioterapi)', tipe: 'poli', lantai: 1, kapasitas: 1, tarif_per_hari: 0 },
    { kode: 'POLI-GIZ', nama: 'Poli Gizi Klinik', tipe: 'poli', lantai: 1, kapasitas: 1, tarif_per_hari: 0 },
    { kode: 'POLI-AKU', nama: 'Poli Akupunktur Medik', tipe: 'poli', lantai: 1, kapasitas: 1, tarif_per_hari: 0 },
    { kode: 'POLI-LAK', nama: 'Poli Laktasi', tipe: 'poli', lantai: 1, kapasitas: 1, tarif_per_hari: 0 },
    { kode: 'POLI-GER', nama: 'Poli Geriatri', tipe: 'poli', lantai: 1, kapasitas: 1, tarif_per_hari: 0 },

    // ===== IGD =====
    { kode: 'IGD-01', nama: 'Instalasi Gawat Darurat', tipe: 'igd', lantai: 1, kapasitas: 10, tarif_per_hari: 0 },

    // ===== Rawat Inap =====
    { kode: 'RI-01', nama: 'Ruang Melati (Kelas 1)', tipe: 'rawat_inap', lantai: 2, kapasitas: 4, tarif_per_hari: 500000 },
    { kode: 'RI-02', nama: 'Ruang Mawar (Kelas 2)', tipe: 'rawat_inap', lantai: 2, kapasitas: 6, tarif_per_hari: 350000 },
    { kode: 'RI-03', nama: 'Ruang Anggrek (Kelas 3)', tipe: 'rawat_inap', lantai: 3, kapasitas: 8, tarif_per_hari: 200000 },
    { kode: 'RI-04', nama: 'Ruang VIP', tipe: 'rawat_inap', lantai: 2, kapasitas: 2, tarif_per_hari: 1000000 },
    { kode: 'RI-05', nama: 'Ruang ICU', tipe: 'rawat_inap', lantai: 3, kapasitas: 4, tarif_per_hari: 1500000 },

    // ===== Lab & Farmasi =====
    { kode: 'LAB-01', nama: 'Laboratorium', tipe: 'lab', lantai: 1, kapasitas: 1, tarif_per_hari: 0 },
    { kode: 'FARM-01', nama: 'Farmasi / Apotek', tipe: 'farmasi', lantai: 1, kapasitas: 1, tarif_per_hari: 0 },
  ]

  const insertedRooms = await knex
    .withSchema(schema)
    .insert(rooms)
    .into('rooms')
    .returning(['id', 'kode', 'tipe', 'kapasitas'])

  // =============================================
  // 7. Beds (untuk ruang rawat inap)
  // =============================================
  const beds: Array<{ room_id: string; nomor: string; status: string }> = []

  for (const room of insertedRooms) {
    if (room.tipe === 'rawat_inap') {
      for (let i = 1; i <= room.kapasitas; i++) {
        beds.push({
          room_id: room.id,
          nomor: `${room.kode}-${String(i).padStart(2, '0')}`,
          status: 'tersedia',
        })
      }
    }
  }

  if (beds.length > 0) {
    await knex.withSchema(schema).insert(beds).into('beds')
  }

  // eslint-disable-next-line no-console
  console.log('=== Seed Summary ===')
  console.log(`Tenant: RS Demo SIMRS (id: ${tenantId})`)
  console.log(`Super Admin: admin@simrs.id / Admin123!`)
  console.log(`Tenant Admin: admin@rs-demo.simrs.id / Demo123!`)
  console.log(`Users: ${insertedUsers.length} (semua password: User123!)`)
  console.log(`Rooms: ${insertedRooms.length}`)
  console.log(`Beds: ${beds.length}`)
  console.log('====================')
}
