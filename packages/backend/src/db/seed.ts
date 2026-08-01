/**
 * Database seed script
 * Run with: tsx src/db/seed.ts
 *
 * Seeds initial data for development and staging environments.
 * Not run in production.
 */

import { drizzle } from 'drizzle-orm/d1'
import * as schema from './schema'

export async function seed(db: D1Database) {
  const d = drizzle(db, { schema })

  // Placeholder: seed initial data here
  console.log('Seed: no initial data to seed yet.')

  return d
}

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Seed script: run with wrangler and a valid D1 binding.')
}
