import knex from 'knex'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') })

const db = knex({ client: 'pg', connection: process.env.DATABASE_URL })

async function check() {
  const tenants = await db('tenants').select('name', 'slug', 'is_active')
  console.log('\n=== Tenants ===')
  console.table(tenants)

  const admins = await db('super_admins').select('email', 'name', 'role')
  console.log('=== Super Admins ===')
  console.table(admins)

  const users = await db
    .withSchema('tenant_rs-demo')
    .select('email', 'name', 'role')
    .from('users')
  console.log('=== Tenant Users ===')
  console.table(users)

  const rooms = await db
    .withSchema('tenant_rs-demo')
    .select('kode', 'nama', 'tipe')
    .from('rooms')
  console.log('=== Rooms ===')
  console.table(rooms)

  const bedCount = await db
    .withSchema('tenant_rs-demo')
    .count('* as total')
    .from('beds')
  console.log('Total beds:', bedCount[0].total)

  const schemas = await db.raw(
    "SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'",
  )
  console.log('\n=== Tenant Schemas ===')
  console.table(schemas.rows)

  await db.destroy()
}

check()
