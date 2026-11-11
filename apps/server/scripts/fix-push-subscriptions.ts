import knex from 'knex'

async function main() {
  const db = knex({
    client: 'pg',
    connection: 'postgresql://simrs:simrs_secret@localhost:5432/simrs_db',
  })

  try {
    const schemas = await db.raw(`
      SELECT schema_name FROM information_schema.schemata
      WHERE schema_name LIKE 'tenant_%'
    `)

    for (const { schema_name } of schemas.rows) {
      const exists = await db.raw(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = '${schema_name}'
          AND table_name = 'push_subscriptions'
        ) as exists
      `)

      if (!exists.rows[0].exists) {
        const q = `"${schema_name}"`
        await db.raw(`
          CREATE TABLE IF NOT EXISTS ${q}.push_subscriptions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES ${q}.users(id) ON DELETE CASCADE,
            endpoint TEXT NOT NULL,
            p256dh TEXT NOT NULL,
            auth TEXT NOT NULL,
            user_agent TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(user_id, endpoint)
          )
        `)
        await db.raw(`
          CREATE INDEX IF NOT EXISTS idx_push_sub_user
          ON ${q}.push_subscriptions(user_id)
        `)
        console.log(`Created push_subscriptions in ${schema_name}`)
      } else {
        console.log(`push_subscriptions already exists in ${schema_name}`)
      }
    }

    console.log('Done!')
  } catch (err) {
    console.error('Error:', err)
  } finally {
    await db.destroy()
  }
}

main()
