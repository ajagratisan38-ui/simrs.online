import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  // 1. Add bed_transfers table to create_tenant_schema function
  //    and create it in all existing tenant schemas

  const tenants = await knex('tenants').select('slug')

  for (const tenant of tenants) {
    const schema = `tenant_${tenant.slug}`

    const schemaExists = await knex.raw(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name = ?`,
      [schema],
    )
    if (schemaExists.rows.length === 0) continue

    // Create bed_transfers table
    await knex.raw(`
      CREATE TABLE IF NOT EXISTS ${schema}.bed_transfers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        visit_id UUID NOT NULL,
        from_bed_id UUID,
        from_room_id UUID,
        to_bed_id UUID NOT NULL,
        to_room_id UUID NOT NULL,
        from_room_nama VARCHAR(200),
        from_room_tarif NUMERIC(12,2) DEFAULT 0,
        from_room_kelas INT,
        to_room_nama VARCHAR(200),
        to_room_tarif NUMERIC(12,2) DEFAULT 0,
        to_room_kelas INT,
        transferred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        transferred_by UUID,
        catatan TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    // Add indexes
    await knex.raw(`
      CREATE INDEX IF NOT EXISTS idx_bed_transfers_visit
      ON ${schema}.bed_transfers (visit_id)
    `)
    await knex.raw(`
      CREATE INDEX IF NOT EXISTS idx_bed_transfers_date
      ON ${schema}.bed_transfers (transferred_at)
    `)

    // Insert initial record for currently admitted patients
    // so billing can calculate from admission date to first transfer
    await knex.raw(`
      INSERT INTO ${schema}.bed_transfers (visit_id, to_bed_id, to_room_id, to_room_nama, to_room_tarif, to_room_kelas, transferred_at, catatan)
      SELECT
        v.id,
        v.bed_id,
        r.id,
        r.nama,
        r.tarif_per_hari,
        r.kelas,
        COALESCE(v.tanggal, v.created_at),
        'Record awal admisi (auto-generated migration)'
      FROM ${schema}.visits v
      JOIN ${schema}.beds b ON b.id = v.bed_id
      JOIN ${schema}.rooms r ON r.id = b.room_id
      WHERE v.tipe = 'rawat_inap'
        AND v.status IN ('rawat_inap', 'diperiksa')
        AND v.bed_id IS NOT NULL
      ON CONFLICT DO NOTHING
    `)
  }

  // 2. Update create_tenant_schema function to include bed_transfers for new tenants
  //    We do this by adding a raw SQL patch
  await knex.raw(`
    CREATE OR REPLACE FUNCTION add_bed_transfers_table(tenant_slug TEXT)
    RETURNS VOID AS $$
    BEGIN
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.bed_transfers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          visit_id UUID NOT NULL,
          from_bed_id UUID,
          from_room_id UUID,
          to_bed_id UUID NOT NULL,
          to_room_id UUID NOT NULL,
          from_room_nama VARCHAR(200),
          from_room_tarif NUMERIC(12,2) DEFAULT 0,
          from_room_kelas INT,
          to_room_nama VARCHAR(200),
          to_room_tarif NUMERIC(12,2) DEFAULT 0,
          to_room_kelas INT,
          transferred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          transferred_by UUID,
          catatan TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      ', 'tenant_' || tenant_slug);

      EXECUTE format('
        CREATE INDEX IF NOT EXISTS idx_bed_transfers_visit
        ON %I.bed_transfers (visit_id)
      ', 'tenant_' || tenant_slug);

      EXECUTE format('
        CREATE INDEX IF NOT EXISTS idx_bed_transfers_date
        ON %I.bed_transfers (transferred_at)
      ', 'tenant_' || tenant_slug);
    END;
    $$ LANGUAGE plpgsql;
  `)
}

export async function down(knex: Knex): Promise<void> {
  const tenants = await knex('tenants').select('slug')

  for (const tenant of tenants) {
    const schema = `tenant_${tenant.slug}`
    await knex.raw(`DROP TABLE IF EXISTS ${schema}.bed_transfers CASCADE`)
  }

  await knex.raw('DROP FUNCTION IF EXISTS add_bed_transfers_table(TEXT)')
}
