import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as ws from "ws";
import * as schema from "@shared/schema";
import { retryDatabaseOperation } from "./db-utils";
import "dotenv/config";
neonConfig.webSocketConstructor = ws.default || ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: 'postgresql://neondb_owner:npg_3UN6KpBRPGcJ@ep-aged-block-a4jyny94.us-east-1.aws.neon.tech/neondb?sslmode=require',
  max: 10, // Maximum number of connections in pool
  idleTimeoutMillis: 10000, // 10 seconds idle timeout
  maxUses: 7500, // Maximum uses per connection before renewal
  allowExitOnIdle: false
});

// Wrap pool.query with retry logic to handle transient connection errors
const originalQuery = pool.query.bind(pool);
pool.query = ((...args: any[]) => {
  return retryDatabaseOperation(
    () => originalQuery(...args), 
    'SQL query'
  );
}) as typeof pool.query;

// Add pool error listener to prevent crashes from unhandled pool errors
pool.on('error', (err: any) => {
  console.warn('[DB_POOL_ERROR]', err?.code || err?.message || 'Unknown pool error');
});

// Add global unhandled rejection handler to prevent crashes during investigation
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('[UNHANDLED_REJECTION]', reason?.message || reason, promise);
  // Don't exit the process, just log the error
});

export const db = drizzle({ client: pool, schema });
