import "server-only";
import { Pool } from "pg";

const globalForDb = globalThis as typeof globalThis & {
  apparelflowPool?: Pool;
};

export function getDbPool(): Pool {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!globalForDb.apparelflowPool) {
    globalForDb.apparelflowPool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
  }

  return globalForDb.apparelflowPool;
}