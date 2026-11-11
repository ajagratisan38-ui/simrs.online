import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import type { Knex } from 'knex'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') })

const migrationsDir = path.resolve(__dirname, '..', 'migrations')
const seedsDir = path.resolve(__dirname, '..', 'seeds')

const config: Knex.Config = {
  client: 'pg',
  connection: process.env.DATABASE_URL || 'postgresql://simrs:simrs_secret@localhost:5432/simrs_db',
  pool: {
    min: 2,
    max: process.env.NODE_ENV === 'production' ? 20 : 10,
  },
  migrations: {
    directory: migrationsDir,
    tableName: 'knex_migrations',
    extension: 'ts',
  },
  seeds: {
    directory: seedsDir,
    extension: 'ts',
  },
}

export default config
