import knex from 'knex'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL || 'postgresql://simrs:simrs_secret@localhost:5432/simrs_db',
})

async function main() {
  try {
    // Public tables
    const publicTables = [
      'tenants', 'super_admins', 'subscription_plans', 'subscription_transactions',
      'tenant_registrations', 'platform_settings', 'super_admin_activity_log',
      'icd10_codes', 'icd9cm_codes', 'loinc_codes', 'kfa_codes', 'drug_interactions',
    ]
    console.log('=== PUBLIC SCHEMA ===')
    for (const t of publicTables) {
      const exists = await db.schema.hasTable(t)
      if (exists) {
        const res = await db.raw(`SELECT count(*) as c FROM public."${t}"`)
        console.log(` ✅ ${t.padEnd(30)} ${res.rows[0].c} rows`)
      } else {
        console.log(` ❌ ${t.padEnd(30)} MISSING`)
      }
    }

    // Tenants
    const cols = await db.raw(
      `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='tenants' ORDER BY ordinal_position`
    )
    console.log('\ntenants columns:', cols.rows.map((r: { column_name: string }) => r.column_name).join(', '))

    const tenants = await db('tenants').select('slug')
    console.log(`\n=== TENANT SCHEMAS (${tenants.length}) ===`)

    for (const t of tenants) {
      const schema = 'tenant_' + t.slug.replace(/-/g, '_')
      const allTables = await db.raw(
        `SELECT tablename FROM pg_tables WHERE schemaname = '${schema}' ORDER BY tablename`
      )
      console.log(`\n🏥 ${t.slug} → ${schema} (${allTables.rows.length} tables)`)

      const check = [
        'users', 'patients', 'rooms', 'visits', 'drugs', 'drug_stocks',
        'bills', 'bill_items', 'medical_records', 'prescriptions',
        'lab_orders', 'radiology_orders', 'surgeries', 'nutrition_orders',
        'cppt_entries', 'nursing_assessments', 'general_consents',
        'assets', 'asset_maintenances', 'asset_mutations',
        'siranap_config', 'siranap_submissions', 'sirs_config', 'sirs_submissions',
        'antrol_bookings', 'digital_signatures', 'push_subscriptions',
        'employees', 'departments', 'payroll_periods',
        'chart_of_accounts', 'journal_entries',
      ]
      for (const tt of check) {
        const found = allTables.rows.some((r: { tablename: string }) => r.tablename === tt)
        console.log(`  ${found ? '✅' : '❌'} ${tt}`)
      }
    }

    // Migrations
    console.log('\n=== MIGRATIONS ===')
    const migs = await db('knex_migrations').orderBy('batch', 'asc').orderBy('name', 'asc')
    migs.forEach((m: { name: string; batch: number }) =>
      console.log(` batch ${m.batch}: ${m.name}`)
    )
    console.log(`Total: ${migs.length} migrations`)
  } catch (e) {
    console.error('ERROR:', (e as Error).message)
  }
  await db.destroy()
}

main()
