import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  const tenantSchemas = await knex.raw(
    `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'`
  )

  for (const row of tenantSchemas.rows) {
    const schema = row.schema_name as string

    // --- assets ---
    await knex.raw(`
      CREATE TABLE IF NOT EXISTS ${knex.raw('??', [schema])}.assets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        kode VARCHAR(50) NOT NULL,
        nama VARCHAR(300) NOT NULL,
        kategori VARCHAR(50) NOT NULL DEFAULT 'medis'
          CHECK (kategori IN (
            'medis','non_medis','kendaraan','bangunan','it','furniture','elektronik','lainnya'
          )),
        merk VARCHAR(200),
        model VARCHAR(200),
        serial_number VARCHAR(200),
        tahun_pembelian INTEGER,
        tanggal_pembelian DATE,
        harga_perolehan DECIMAL(15,2) NOT NULL DEFAULT 0,
        vendor VARCHAR(300),
        no_faktur VARCHAR(100),
        umur_ekonomis_tahun INTEGER NOT NULL DEFAULT 5,
        nilai_residu DECIMAL(15,2) NOT NULL DEFAULT 0,
        metode_penyusutan VARCHAR(20) NOT NULL DEFAULT 'garis_lurus'
          CHECK (metode_penyusutan IN ('garis_lurus','saldo_menurun')),
        lokasi_gedung VARCHAR(200),
        lokasi_lantai VARCHAR(50),
        lokasi_ruangan VARCHAR(200),
        penanggung_jawab VARCHAR(200),
        kondisi VARCHAR(20) NOT NULL DEFAULT 'baik'
          CHECK (kondisi IN ('baik','rusak_ringan','rusak_berat','dalam_perbaikan')),
        status VARCHAR(20) NOT NULL DEFAULT 'aktif'
          CHECK (status IN ('aktif','tidak_aktif','dihapuskan','dijual','hilang')),
        garansi_mulai DATE,
        garansi_berakhir DATE,
        tanggal_kalibrasi_terakhir DATE,
        interval_kalibrasi_bulan INTEGER,
        catatan TEXT,
        foto_url VARCHAR(500),
        deleted_at TIMESTAMPTZ,
        created_by UUID,
        updated_by UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_asset_kode UNIQUE (kode)
      )
    `)

    // --- asset_maintenances ---
    await knex.raw(`
      CREATE TABLE IF NOT EXISTS ${knex.raw('??', [schema])}.asset_maintenances (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        asset_id UUID NOT NULL,
        tipe VARCHAR(30) NOT NULL DEFAULT 'perbaikan'
          CHECK (tipe IN ('perbaikan','pemeliharaan_rutin','kalibrasi','penggantian_part','lainnya')),
        tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
        deskripsi TEXT NOT NULL,
        teknisi VARCHAR(200),
        vendor VARCHAR(300),
        biaya DECIMAL(15,2) NOT NULL DEFAULT 0,
        hasil VARCHAR(50) DEFAULT 'selesai'
          CHECK (hasil IN ('selesai','perlu_tindak_lanjut','gagal')),
        tanggal_selanjutnya DATE,
        catatan TEXT,
        created_by UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_am_asset FOREIGN KEY (asset_id)
          REFERENCES ${knex.raw('??', [schema])}.assets(id) ON DELETE CASCADE
      )
    `)

    // --- asset_mutations ---
    await knex.raw(`
      CREATE TABLE IF NOT EXISTS ${knex.raw('??', [schema])}.asset_mutations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        asset_id UUID NOT NULL,
        tipe VARCHAR(20) NOT NULL DEFAULT 'pindah'
          CHECK (tipe IN ('pindah','penghapusan','penjualan','hibah')),
        tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
        dari_lokasi VARCHAR(300),
        ke_lokasi VARCHAR(300),
        alasan TEXT,
        nilai_jual DECIMAL(15,2),
        no_berita_acara VARCHAR(100),
        disetujui_oleh VARCHAR(200),
        catatan TEXT,
        created_by UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_amut_asset FOREIGN KEY (asset_id)
          REFERENCES ${knex.raw('??', [schema])}.assets(id) ON DELETE CASCADE
      )
    `)

    // Indexes
    await knex.raw(`
      CREATE INDEX IF NOT EXISTS idx_assets_kategori
      ON ${knex.raw('??', [schema])}.assets (kategori)
    `)
    await knex.raw(`
      CREATE INDEX IF NOT EXISTS idx_assets_status
      ON ${knex.raw('??', [schema])}.assets (status)
    `)
    await knex.raw(`
      CREATE INDEX IF NOT EXISTS idx_assets_lokasi
      ON ${knex.raw('??', [schema])}.assets (lokasi_ruangan)
    `)
    await knex.raw(`
      CREATE INDEX IF NOT EXISTS idx_asset_maint_asset
      ON ${knex.raw('??', [schema])}.asset_maintenances (asset_id)
    `)
    await knex.raw(`
      CREATE INDEX IF NOT EXISTS idx_asset_mut_asset
      ON ${knex.raw('??', [schema])}.asset_mutations (asset_id)
    `)
  }

  // Also add to create_tenant_schema function for new tenants
  await knex.raw(`
    CREATE OR REPLACE FUNCTION add_asset_tables(tenant_slug TEXT)
    RETURNS VOID AS $$
    BEGIN
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.assets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          kode VARCHAR(50) NOT NULL,
          nama VARCHAR(300) NOT NULL,
          kategori VARCHAR(50) NOT NULL DEFAULT ''medis'',
          merk VARCHAR(200), model VARCHAR(200), serial_number VARCHAR(200),
          tahun_pembelian INTEGER, tanggal_pembelian DATE,
          harga_perolehan DECIMAL(15,2) NOT NULL DEFAULT 0,
          vendor VARCHAR(300), no_faktur VARCHAR(100),
          umur_ekonomis_tahun INTEGER NOT NULL DEFAULT 5,
          nilai_residu DECIMAL(15,2) NOT NULL DEFAULT 0,
          metode_penyusutan VARCHAR(20) NOT NULL DEFAULT ''garis_lurus'',
          lokasi_gedung VARCHAR(200), lokasi_lantai VARCHAR(50), lokasi_ruangan VARCHAR(200),
          penanggung_jawab VARCHAR(200),
          kondisi VARCHAR(20) NOT NULL DEFAULT ''baik'',
          status VARCHAR(20) NOT NULL DEFAULT ''aktif'',
          garansi_mulai DATE, garansi_berakhir DATE,
          tanggal_kalibrasi_terakhir DATE, interval_kalibrasi_bulan INTEGER,
          catatan TEXT, foto_url VARCHAR(500),
          deleted_at TIMESTAMPTZ, created_by UUID, updated_by UUID,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT uq_asset_kode UNIQUE (kode)
        )', 'tenant_' || tenant_slug);

      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.asset_maintenances (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          asset_id UUID NOT NULL,
          tipe VARCHAR(30) NOT NULL DEFAULT ''perbaikan'',
          tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
          deskripsi TEXT NOT NULL, teknisi VARCHAR(200), vendor VARCHAR(300),
          biaya DECIMAL(15,2) NOT NULL DEFAULT 0,
          hasil VARCHAR(50) DEFAULT ''selesai'',
          tanggal_selanjutnya DATE, catatan TEXT,
          created_by UUID, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT fk_am_asset FOREIGN KEY (asset_id) REFERENCES %I.assets(id) ON DELETE CASCADE
        )', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.asset_mutations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          asset_id UUID NOT NULL,
          tipe VARCHAR(20) NOT NULL DEFAULT ''pindah'',
          tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
          dari_lokasi VARCHAR(300), ke_lokasi VARCHAR(300),
          alasan TEXT, nilai_jual DECIMAL(15,2),
          no_berita_acara VARCHAR(100), disetujui_oleh VARCHAR(200),
          catatan TEXT, created_by UUID, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT fk_amut_asset FOREIGN KEY (asset_id) REFERENCES %I.assets(id) ON DELETE CASCADE
        )', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);
    END;
    $$ LANGUAGE plpgsql;
  `)
}

export async function down(knex: Knex): Promise<void> {
  const tenantSchemas = await knex.raw(
    `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'`
  )

  for (const row of tenantSchemas.rows) {
    const schema = row.schema_name as string
    await knex.raw(`DROP TABLE IF EXISTS "${schema}".asset_mutations CASCADE`)
    await knex.raw(`DROP TABLE IF EXISTS "${schema}".asset_maintenances CASCADE`)
    await knex.raw(`DROP TABLE IF EXISTS "${schema}".assets CASCADE`)
  }

  await knex.raw('DROP FUNCTION IF EXISTS add_asset_tables(TEXT)')
}
