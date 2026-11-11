import dotenv from 'dotenv'
import path from 'path'
import type { Knex } from 'knex'

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') })

const config: Knex.Config = {
  client: 'pg',
  connection: process.env.DATABASE_URL || 'postgresql://simrs:simrs_secret@localhost:5432/simrs_db',
  pool: {
    min: 2,
    max: process.env.NODE_ENV === 'production' ? 20 : 10,
  },
  migrations: {
    directory: './src/migrations',
    tableName: 'knex_migrations',
    extension: 'ts',
  },
  seeds: {
    directory: './src/seeds',
    extension: 'ts',
  },
}

export default config
