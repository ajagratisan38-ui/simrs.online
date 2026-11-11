import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  const tenants = await knex('public.tenants').select('slug')

  for (const tenant of tenants) {
    const schema = `tenant_${tenant.slug}`
    const schemaExists = await knex.raw(
      `SELECT 1 FROM information_schema.schemata WHERE schema_name = ?`, [schema],
    )
    if (schemaExists.rows.length === 0) continue

    // Check if chart_of_accounts table exists
    const tableExists = await knex.raw(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = ? AND table_name = 'chart_of_accounts'
    `, [schema])
    if (tableExists.rows.length === 0) continue

    // Check if 4-1010 already exists
    const exists = await knex.raw(
      `SELECT 1 FROM "${schema}".chart_of_accounts WHERE kode = '4-1010'`,
    )
    if (exists.rows.length > 0) continue

    // Get parent_id for 4-1000 (Pendapatan Operasional)
    const parent = await knex.raw(
      `SELECT id FROM "${schema}".chart_of_accounts WHERE kode = '4-1000'`,
    )
    const parentId = parent.rows[0]?.id || null

    await knex.raw(`
      INSERT INTO "${schema}".chart_of_accounts
        (kode, nama, tipe, sub_tipe, level, is_header, saldo_normal, parent_id, is_active)
      VALUES
        ('4-1010', 'Pendapatan Rehabilitasi', 'pendapatan', 'pendapatan_operasional', 3, false, 'kredit', ?, true)
      ON CONFLICT (kode) DO NOTHING
    `, [parentId])
  }
}

export async function down(knex: Knex): Promise<void> {
  const tenants = await knex('public.tenants').select('slug')

  for (const tenant of tenants) {
    const schema = `tenant_${tenant.slug}`
    const schemaExists = await knex.raw(
      `SELECT 1 FROM information_schema.schemata WHERE schema_name = ?`, [schema],
    )
    if (schemaExists.rows.length === 0) continue

    await knex.raw(`DELETE FROM "${schema}".chart_of_accounts WHERE kode = '4-1010'`).catch(() => {})
  }
}
