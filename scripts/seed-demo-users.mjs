import pg from "pg";
import bcrypt from "bcryptjs";

const { Client } = pg;

const connectionString = process.env.DIRECT_DATABASE_URL;

if (!connectionString) {
  console.error("DIRECT_DATABASE_URL is not configured.");
  process.exit(1);
}

const demoUsers = [
  {
    email: "cutting.supervisor@apparelflow.demo",
    password: "cutting.supervisor@2026",
    role: "cutting_supervisor",
    fullName: "Cutting Supervisor Demo",
  },
  {
    email: "cutting.verifier@apparelflow.demo",
    password: "cutting.verifier@2026",
    role: "cutting_verifier",
    fullName: "Cutting Verifier Demo",
  },
  {
    email: "sewing.supervisor@apparelflow.demo",
    password: "sewing.supervisor@2026",
    role: "sewing_supervisor",
    fullName: "Sewing Supervisor Demo",
  },
];

async function seedDemoUsers() {
  const db = new Client({ connectionString });

  await db.connect();

  try {
    await db.query("BEGIN");

    for (const user of demoUsers) {
      const passwordHash = await bcrypt.hash(user.password, 12);

      await db.query(
        `
          INSERT INTO users (
            email,
            password_hash,
            role,
            full_name
          )
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (email)
          DO UPDATE SET
            password_hash = EXCLUDED.password_hash,
            role = EXCLUDED.role,
            full_name = EXCLUDED.full_name
        `,
        [
          user.email,
          passwordHash,
          user.role,
          user.fullName,
        ]
      );

      console.log(`Seeded demo user: ${user.email}`);
    }

    await db.query("COMMIT");

    console.log("Demo users seeded successfully.");
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally {
    await db.end();
  }
}

seedDemoUsers().catch((error) => {
  console.error("Demo user seed failed:", error.message);
  process.exitCode = 1;
});