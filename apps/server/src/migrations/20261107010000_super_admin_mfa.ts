import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  const hasMfaEnabled = await knex.schema.hasColumn('super_admins', 'mfa_enabled')
  if (!hasMfaEnabled) {
    await knex.schema.alterTable('super_admins', (table) => {
      table.boolean('mfa_enabled').notNullable().defaultTo(false)
      table.string('mfa_secret', 255).nullable()
    })
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasMfaEnabled = await knex.schema.hasColumn('super_admins', 'mfa_enabled')
  if (hasMfaEnabled) {
    await knex.schema.alterTable('super_admins', (table) => {
      table.dropColumn('mfa_enabled')
      table.dropColumn('mfa_secret')
    })
  }
}
