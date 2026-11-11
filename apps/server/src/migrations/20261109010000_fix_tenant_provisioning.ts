import type { Knex } from 'knex'

/**
 * Fix: Tenant provisioning gap
 *
 * Problem: migrations that add per-tenant tables query `from('tenants')` which
 * is EMPTY at migration time (data only exists after seed). So tenant schemas
 * created by seeds never get extension tables (clinical, doctor status, etc.).
 *
 * Solution:
 * 1. Create `provision_tenant_extensions(slug)` — calls all add_*_tables functions
 * 2. Patch `create_tenant_schema` to call it at the end
 * 3. Apply missing tables to ALL existing tenant schemas now
 */
export async function up(knex: Knex): Promise<void> {
  // ───────────────────────────────────────────────────
  // 1. Create the extension provisioning function
  // ───────────────────────────────────────────────────
  await knex.raw(`
    CREATE OR REPLACE FUNCTION provision_tenant_extensions(tenant_slug TEXT)
    RETURNS VOID AS $$
    DECLARE
      full_schema TEXT := 'tenant_' || tenant_slug;
    BEGIN
      -- Doctor status lifecycle columns
      IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'add_doctor_status') THEN
        PERFORM add_doctor_status(tenant_slug);
      END IF;

      -- Doctor soft-delete column
      EXECUTE format('
        ALTER TABLE %I.doctors ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ
      ', full_schema);

      -- Inpatient clinical tables (vital_signs, medical_orders, etc.)
      IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'add_inpatient_clinical_tables') THEN
        PERFORM add_inpatient_clinical_tables(full_schema);
      END IF;

      -- Asset management tables (already in consolidated, but safety net)
      IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'add_asset_tables') THEN
        PERFORM add_asset_tables(tenant_slug);
      END IF;

      RAISE NOTICE 'Provisioned extensions for schema %', full_schema;
    END;
    $$ LANGUAGE plpgsql;
  `)

  // ───────────────────────────────────────────────────
  // 2. Patch create_tenant_schema to call extensions
  //    We append by wrapping the original function
  // ───────────────────────────────────────────────────
  //    Since we can't easily modify the function body,
  //    we create a wrapper and rename.
  //
  //    Strategy: read existing body → append extension call → replace
  // ───────────────────────────────────────────────────

  // Get the current function body
  const funcBody = await knex.raw(`
    SELECT prosrc FROM pg_proc WHERE proname = 'create_tenant_schema'
  `)

  if (funcBody.rows.length > 0) {
    const originalBody = funcBody.rows[0].prosrc as string

    // Check if already patched (idempotent)
    if (!originalBody.includes('provision_tenant_extensions')) {
      // Insert the extension call just before the final END;
      // The body ends with "    END;\n" — we insert before it
      const lastEndIdx = originalBody.lastIndexOf('END;')
      if (lastEndIdx > 0) {
        const patchedBody = originalBody.substring(0, lastEndIdx)
          + `\n      -- Auto-provision extension modules\n`
          + `      PERFORM provision_tenant_extensions(tenant_slug);\n\n`
          + `    END;`

        await knex.raw(`
          CREATE OR REPLACE FUNCTION create_tenant_schema(tenant_slug TEXT)
          RETURNS VOID AS $fn$
          ${patchedBody}
          $fn$ LANGUAGE plpgsql;
        `)

        console.log('  ✅ Patched create_tenant_schema with extension provisioning')
      }
    } else {
      console.log('  ℹ️  create_tenant_schema already patched, skipping')
    }
  }

  // ───────────────────────────────────────────────────
  // 3. Apply missing tables to ALL existing tenant schemas
  // ───────────────────────────────────────────────────
  const tenantSchemas = await knex.raw(
    `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'`
  )

  for (const row of tenantSchemas.rows) {
    const schemaName = row.schema_name as string
    const slug = schemaName.replace('tenant_', '')
    console.log(`  Provisioning extensions for ${schemaName}...`)

    try {
      await knex.raw(`SELECT provision_tenant_extensions('${slug}')`)
      console.log(`    ✅ ${schemaName} — extensions applied`)
    } catch (err) {
      console.error(`    ⚠️ ${schemaName} — error:`, (err as Error).message)
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  // Remove the extension call from create_tenant_schema
  const funcBody = await knex.raw(`
    SELECT prosrc FROM pg_proc WHERE proname = 'create_tenant_schema'
  `)

  if (funcBody.rows.length > 0) {
    const body = funcBody.rows[0].prosrc as string
    if (body.includes('provision_tenant_extensions')) {
      const cleaned = body
        .replace(/\n\s*-- Auto-provision extension modules\n/, '')
        .replace(/\s*PERFORM provision_tenant_extensions\(tenant_slug\);\n*/, '')

      await knex.raw(`
        CREATE OR REPLACE FUNCTION create_tenant_schema(tenant_slug TEXT)
        RETURNS VOID AS $fn$
        ${cleaned}
        $fn$ LANGUAGE plpgsql;
      `)
    }
  }

  await knex.raw('DROP FUNCTION IF EXISTS provision_tenant_extensions(TEXT)')
}
