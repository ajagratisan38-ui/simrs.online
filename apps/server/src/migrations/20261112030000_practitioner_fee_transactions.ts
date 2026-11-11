import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  const tenants = await knex('public.tenants').select('slug')

  for (const tenant of tenants) {
    const schema = `tenant_${tenant.slug}`
    const schemaExists = await knex.raw(
      `SELECT 1 FROM information_schema.schemata WHERE schema_name = ?`, [schema],
    )
    if (schemaExists.rows.length === 0) continue

    // Practitioner fee transactions — tracks per-session payments to external practitioners
    await knex.raw(`
      CREATE TABLE IF NOT EXISTS "${schema}".practitioner_fee_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        practitioner_id UUID NOT NULL,
        order_id UUID NOT NULL,
        session_id UUID,
        visit_id UUID,
        deskripsi VARCHAR(500) NOT NULL,
        tarif_sesi NUMERIC(12,2) NOT NULL DEFAULT 0,
        jumlah_practitioner NUMERIC(12,2) NOT NULL DEFAULT 0,
        jumlah_rs NUMERIC(12,2) NOT NULL DEFAULT 0,
        fee_share_persen NUMERIC(5,2) NOT NULL DEFAULT 70,
        fee_share_rs_persen NUMERIC(5,2) NOT NULL DEFAULT 30,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_pft_practitioner FOREIGN KEY (practitioner_id)
          REFERENCES "${schema}".external_practitioners(id),
        CONSTRAINT fk_pft_order FOREIGN KEY (order_id)
          REFERENCES "${schema}".rehabilitation_orders(id),
        CONSTRAINT fk_pft_session FOREIGN KEY (session_id)
          REFERENCES "${schema}".rehabilitation_sessions(id) ON DELETE SET NULL,
        CONSTRAINT fk_pft_visit FOREIGN KEY (visit_id)
          REFERENCES "${schema}".visits(id)
      )
    `)

    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_pft_practitioner ON "${schema}".practitioner_fee_transactions(practitioner_id)`)
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_pft_order ON "${schema}".practitioner_fee_transactions(order_id)`)
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_pft_created ON "${schema}".practitioner_fee_transactions(created_at)`)
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

    await knex.raw(`DROP TABLE IF EXISTS "${schema}".practitioner_fee_transactions CASCADE`)
  }
}
