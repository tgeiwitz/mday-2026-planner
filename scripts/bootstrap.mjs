// One-shot bootstrap: applies drizzle migrations, then seeds the DB if empty.
// Idempotent — safe to run on every deploy. Used by the production start command
// so a fresh Railway MySQL becomes a fully populated instance with no manual
// terminal step.
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import "dotenv/config";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[bootstrap] DATABASE_URL is required");
  process.exit(1);
}

const log = msg => console.log(`[bootstrap] ${msg}`);

const pool = mysql.createPool(url);
const db = drizzle(pool);

log("running migrations from ./drizzle");
await migrate(db, { migrationsFolder: join(ROOT, "drizzle") });
log("migrations applied");

const [rows] = await pool.query("SELECT COUNT(*) AS c FROM zones");
const zonesCount = Number(rows[0]?.c ?? 0);

if (zonesCount > 0) {
  log(`zones table has ${zonesCount} rows — skipping seeds`);
  await pool.end();
  process.exit(0);
}

log("zones table empty — running seed scripts");
const seedScripts = [
  "scripts/seed.mjs",
  "scripts/seed-historical-2025.mjs",
  "scripts/seed-zone-task-history.mjs",
  "scripts/seed-zone-volumes.mjs",
];

for (const script of seedScripts) {
  log(`running ${script}`);
  await new Promise((resolve, reject) => {
    const child = spawn("node", [script], {
      stdio: "inherit",
      env: process.env,
      cwd: ROOT,
    });
    child.on("exit", code => {
      if (code === 0) resolve();
      else reject(new Error(`${script} exited with code ${code}`));
    });
    child.on("error", reject);
  });
}

log("seeds complete");
await pool.end();
process.exit(0);
