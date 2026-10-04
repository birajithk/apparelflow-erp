
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;

const __dirname = path.dirname(
  fileURLToPath(import.meta.url)
);

const migrationsDir = path.join(
  __dirname,
  "..",
  "database",
  "migrations"
);

const connectionString = process.env.DIRECT_DATABASE_URL;

if (!connectionString) {
  console.error("DIRECT_DATABASE_URL is not configured.");
  process.exit(1);
}

const db = new Client({ connectionString });

const lockQuery =
  "SELECT pg_advisory_lock(hashtext('apparelflow_migrations'))";

const unlockQuery =
  "SELECT pg_advisory_unlock(hashtext('apparelflow_migrations'))";

async function migrate() {
  const files = (await fs.readdir(migrationsDir))
    .filter((file) => /^\d{3}_[a-z0-9_]+\.sql$/.test(file))
    .sort();

  if (files.length === 0) {
    throw new Error("No SQL migrations found.");
  }

  await db.connect();

  let lockAcquired = false;

  try {
    await db.query(lockQuery);
    lockAcquired = true;

    await db.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        checksum TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    for (const file of files) {
      const sql = await fs.readFile(
        path.join(migrationsDir, file),
        "utf8"
      );

      const checksum = crypto
        .createHash("sha256")
        .update(sql)
        .digest("hex");

      await db.query("BEGIN");

      try {
        const existing = await db.query(
          `SELECT checksum
           FROM schema_migrations
           WHERE filename = $1`,
          [file]
        );

        if (existing.rows.length > 0) {
          if (existing.rows[0].checksum !== checksum) {
            throw new Error(
              `Previously applied migration was modified: ${file}`
            );
          }

          await db.query("COMMIT");
          console.log(`Already applied: ${file}`);
          continue;
        }

        await db.query(sql);

        await db.query(
          `INSERT INTO schema_migrations
             (filename, checksum)
           VALUES ($1, $2)`,
          [file, checksum]
        );

        await db.query("COMMIT");

        console.log(`Applied: ${file}`);
      } catch (error) {
        await db.query("ROLLBACK");
        throw error;
      }
    }

    console.log("Database migrations completed.");
  } finally {
    try {
      if (lockAcquired) {
        await db.query(unlockQuery);
      }
    } finally {
      await db.end();
    }
  }
}

migrate().catch((error) => {
  console.error("Migration failed:", error.message);
  process.exitCode = 1;
});
