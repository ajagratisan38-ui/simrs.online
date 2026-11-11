import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  const tenantSchemas = await knex.raw(
    `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'`
  )

  for (const row of tenantSchemas.rows) {
    const schema = row.schema_name as string

    await knex.raw(`
      ALTER TABLE ${knex.raw('??', [schema])}.doctors
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ
    `)
  }
}

export async function down(knex: Knex): Promise<void> {
  const tenantSchemas = await knex.raw(
    `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'`
  )

  for (const row of tenantSchemas.rows) {
    const schema = row.schema_name as string

    await knex.raw(`
      ALTER TABLE ${knex.raw('??', [schema])}.doctors
        DROP COLUMN IF EXISTS deleted_at
    `)
  }
}
