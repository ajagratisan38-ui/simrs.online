import knex from 'knex'
import { env } from './env'
import { logger } from '../shared/logger'

export const db = knex({
  client: 'pg',
  connection: env.database.url,
  pool: { min: 2, max: 10 },
})

export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await db.raw('SELECT 1')
    logger.info('Database connection established')
    return true
  } catch (error) {
    logger.error('Database connection failed', { error })
    return false
  }
}
