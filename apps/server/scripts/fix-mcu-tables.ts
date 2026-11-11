/**
 * Fix script: Add MCU tables to existing tenant schemas
 * Run: npx tsx scripts/fix-mcu-tables.ts
 */
import knex from 'knex'
import dotenv from 'dotenv'
dotenv.config()

const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL,
})

async function addMcuTables(schema: string) {
  const q = `"${schema}"`
  console.log(`\n🔧 Adding MCU tables to ${schema}...`)

  // Check if tables already exist
  const exists = await db.raw(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = ? AND table_name = 'mcu_packages'
    )
  `, [schema])

  if (exists.rows[0].exists) {
    console.log(`  ✅ MCU tables already exist in ${schema}`)
    return
  }

  // Create ENUMs (check first)
  const enumCheck = await db.raw(`
    SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mcu_exam_category')
  `)
  if (!enumCheck.rows[0].exists) {
    await db.raw(`CREATE TYPE mcu_exam_category AS ENUM ('fisik_umum','mata','tht','gigi','lab','radiologi','ekg','spirometri','audiometri','psikologi')`)
    await db.raw(`CREATE TYPE mcu_status AS ENUM ('registered','in_progress','waiting_review','completed','cancelled')`)
    await db.raw(`CREATE TYPE mcu_conclusion_type AS ENUM ('fit','fit_with_notes','temporarily_unfit','unfit')`)
    console.log('  ✅ ENUMs created')
  }

  // mcu_packages
  await db.raw(`
    CREATE TABLE ${q}.mcu_packages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nama VARCHAR(100) NOT NULL,
      kode VARCHAR(20) NOT NULL,
      deskripsi TEXT,
      harga DECIMAL(12,2) NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  console.log('  ✅ mcu_packages')

  // mcu_package_items
  await db.raw(`
    CREATE TABLE ${q}.mcu_package_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      package_id UUID NOT NULL REFERENCES ${q}.mcu_packages(id) ON DELETE CASCADE,
      kategori mcu_exam_category NOT NULL,
      nama VARCHAR(200) NOT NULL,
      deskripsi TEXT,
      is_required BOOLEAN NOT NULL DEFAULT true,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  console.log('  ✅ mcu_package_items')

  // mcu_registrations
  await db.raw(`
    CREATE TABLE ${q}.mcu_registrations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id UUID NOT NULL REFERENCES ${q}.patients(id),
      package_id UUID NOT NULL REFERENCES ${q}.mcu_packages(id),
      doctor_id UUID REFERENCES ${q}.doctors(id),
      status mcu_status NOT NULL DEFAULT 'registered',
      tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
      tujuan VARCHAR(100),
      perusahaan VARCHAR(200),
      conclusion mcu_conclusion_type,
      conclusion_notes TEXT,
      concluded_at TIMESTAMPTZ,
      concluded_by UUID,
      certificate_number VARCHAR(30) NOT NULL,
      created_by UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  console.log('  ✅ mcu_registrations')

  // mcu_examinations
  await db.raw(`
    CREATE TABLE ${q}.mcu_examinations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      registration_id UUID NOT NULL REFERENCES ${q}.mcu_registrations(id) ON DELETE CASCADE,
      package_item_id UUID REFERENCES ${q}.mcu_package_items(id),
      kategori mcu_exam_category NOT NULL,
      nama VARCHAR(200) NOT NULL,
      hasil TEXT,
      nilai VARCHAR(100),
      satuan VARCHAR(50),
      nilai_normal VARCHAR(100),
      is_abnormal BOOLEAN NOT NULL DEFAULT false,
      catatan TEXT,
      is_completed BOOLEAN NOT NULL DEFAULT false,
      completed_at TIMESTAMPTZ,
      completed_by UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  console.log('  ✅ mcu_examinations')

  // Indexes
  await db.raw(`CREATE INDEX idx_${schema.replace(/-/g, '_')}_mcu_reg_patient ON ${q}.mcu_registrations(patient_id)`)
  await db.raw(`CREATE INDEX idx_${schema.replace(/-/g, '_')}_mcu_reg_status ON ${q}.mcu_registrations(status)`)
  await db.raw(`CREATE INDEX idx_${schema.replace(/-/g, '_')}_mcu_reg_tanggal ON ${q}.mcu_registrations(tanggal)`)
  await db.raw(`CREATE INDEX idx_${schema.replace(/-/g, '_')}_mcu_exam_reg ON ${q}.mcu_examinations(registration_id)`)
  console.log('  ✅ Indexes created')

  console.log(`✅ MCU tables added to ${schema}`)
}

async function main() {
  try {
    const tenants = await db('tenants').select('slug')
    for (const t of tenants) {
      await addMcuTables(`tenant_${t.slug}`)
    }
    console.log('\n🎉 Done!')
  } catch (err) {
    console.error('Error:', err)
  } finally {
    await db.destroy()
  }
}

main()
