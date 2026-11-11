import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  const tenants = await knex('tenants').select('slug')
  for (const { slug } of tenants) {
    const schema = `tenant_${slug}`
    const schemaExists = await knex.raw(
      `SELECT 1 FROM information_schema.schemata WHERE schema_name = ?`, [schema]
    )
    if (schemaExists.rows.length === 0) continue

    await knex.raw(`ALTER TABLE ${schema}.beds ALTER COLUMN nomor TYPE VARCHAR(50)`)
  }

  await knex.raw(`
    CREATE OR REPLACE FUNCTION create_tenant_schema(tenant_slug TEXT)
    RETURNS VOID AS $$
    BEGIN
      EXECUTE format('ALTER TABLE %I.beds ALTER COLUMN nomor TYPE VARCHAR(50)', 'tenant_' || tenant_slug);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    $$ LANGUAGE plpgsql;
  `)
}

export async function down(knex: Knex): Promise<void> {
  const tenants = await knex('tenants').select('slug')
  for (const { slug } of tenants) {
    const schema = `tenant_${slug}`
    const schemaExists = await knex.raw(
      `SELECT 1 FROM information_schema.schemata WHERE schema_name = ?`, [schema]
    )
    if (schemaExists.rows.length === 0) continue

    await knex.raw(`ALTER TABLE ${schema}.beds ALTER COLUMN nomor TYPE VARCHAR(10)`)
  }
}
