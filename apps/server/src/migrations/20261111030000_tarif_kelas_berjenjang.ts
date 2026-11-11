import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  const tenants = await knex('tenants').select('slug')

  for (const tenant of tenants) {
    const schema = `tenant_${tenant.slug}`

    const schemaExists = await knex.raw(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name = ?`,
      [schema],
    )
    if (schemaExists.rows.length === 0) continue

    // Create komponen_tarif table — master tariff per class
    await knex.raw(`
      CREATE TABLE IF NOT EXISTS "${schema}".komponen_tarif (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        kode VARCHAR(30) NOT NULL,
        nama VARCHAR(200) NOT NULL,
        kategori VARCHAR(30) NOT NULL DEFAULT 'visite',
        tarif_kelas_3 NUMERIC(12,2) NOT NULL DEFAULT 0,
        tarif_kelas_2 NUMERIC(12,2) NOT NULL DEFAULT 0,
        tarif_kelas_1 NUMERIC(12,2) NOT NULL DEFAULT 0,
        tarif_vip NUMERIC(12,2) NOT NULL DEFAULT 0,
        tarif_igd NUMERIC(12,2) NOT NULL DEFAULT 0,
        tarif_poli NUMERIC(12,2) NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_komponen_tarif_kode UNIQUE (kode)
      )
    `)

    await knex.raw(`
      CREATE INDEX IF NOT EXISTS idx_komponen_tarif_kategori
      ON "${schema}".komponen_tarif (kategori)
    `)
    await knex.raw(`
      CREATE INDEX IF NOT EXISTS idx_komponen_tarif_kode
      ON "${schema}".komponen_tarif (kode)
    `)

    // Seed default komponen tarif
    await knex.raw(`
      INSERT INTO "${schema}".komponen_tarif (kode, nama, kategori, tarif_kelas_3, tarif_kelas_2, tarif_kelas_1, tarif_vip, tarif_igd, tarif_poli)
      VALUES
        -- Visite Dokter
        ('VIS-UMUM', 'Visite Dokter Umum', 'visite', 75000, 100000, 150000, 200000, 150000, 100000),
        ('VIS-SPESIALIS', 'Visite Dokter Spesialis', 'visite', 100000, 150000, 200000, 350000, 200000, 150000),
        ('VIS-SUBSPESIALIS', 'Visite Dokter Sub-Spesialis', 'visite', 150000, 200000, 300000, 500000, 300000, 200000),
        ('VIS-GIGI', 'Visite Dokter Gigi', 'visite', 75000, 100000, 125000, 175000, 100000, 100000),

        -- Tindakan Keperawatan
        ('TDK-INFUS', 'Pemasangan Infus', 'tindakan', 50000, 50000, 75000, 100000, 75000, 50000),
        ('TDK-KATETER', 'Pemasangan Kateter', 'tindakan', 75000, 100000, 125000, 150000, 100000, 75000),
        ('TDK-NGT', 'Pemasangan NGT', 'tindakan', 75000, 100000, 125000, 150000, 100000, 75000),
        ('TDK-NEBULIZER', 'Nebulizer', 'tindakan', 50000, 75000, 100000, 125000, 75000, 50000),
        ('TDK-INJEKSI', 'Injeksi / Suntik', 'tindakan', 25000, 35000, 50000, 75000, 50000, 25000),
        ('TDK-RAWATLUKA', 'Rawat Luka', 'tindakan', 50000, 75000, 100000, 150000, 100000, 50000),
        ('TDK-HECTING', 'Hecting / Jahit Luka', 'tindakan', 150000, 200000, 250000, 350000, 250000, 150000),
        ('TDK-EKG', 'Perekaman EKG', 'tindakan', 75000, 100000, 125000, 150000, 100000, 75000),

        -- Administrasi
        ('ADM-MASUK', 'Biaya Administrasi Masuk', 'administrasi', 25000, 50000, 75000, 100000, 50000, 25000),
        ('ADM-REKAM-MEDIS', 'Biaya Rekam Medis', 'administrasi', 15000, 25000, 35000, 50000, 25000, 15000),

        -- Keperawatan
        ('PRW-HARIAN', 'Jasa Perawatan Harian', 'keperawatan', 50000, 75000, 100000, 150000, 100000, 0),
        ('PRW-ICU', 'Jasa Perawatan ICU', 'keperawatan', 200000, 200000, 200000, 200000, 200000, 0)
      ON CONFLICT (kode) DO NOTHING
    `)
  }
}

export async function down(knex: Knex): Promise<void> {
  const tenants = await knex('tenants').select('slug')

  for (const tenant of tenants) {
    const schema = `tenant_${tenant.slug}`
    await knex.raw(`DROP TABLE IF EXISTS "${schema}".komponen_tarif CASCADE`)
  }
}
