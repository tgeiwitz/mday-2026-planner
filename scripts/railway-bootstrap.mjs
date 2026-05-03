// Idempotent Railway bootstrap. Runs on every container start — safe to leave
// in place forever. Pushes the drizzle schema, then seeds reference data only
// if the DB is empty.
//
// Order matters:
//   1. drizzle migrations           (always — idempotent)
//   2. seed.mjs                     (only if zone_metrics is empty)
//   3. seed-historical-2025.mjs     (only if historical_daily_2025 is empty)
//   4. seed-zone-task-history.mjs   (only if zone_task_history_2025 is empty)
//   5. seed-zone-volumes.mjs        (only if zone_metrics has any rows w/ null *_volume_2025)
//
// Exits non-zero only on a true error so the container won't start with a
// broken DB.
import { execSync } from "node:child_process";
import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[bootstrap] DATABASE_URL missing — cannot proceed.");
  process.exit(1);
}

function run(cmd) {
  console.log(`[bootstrap] $ ${cmd}`);
  execSync(cmd, { stdio: "inherit", env: process.env });
}

async function tableCount(conn, table) {
  try {
    const [rows] = await conn.execute(`SELECT COUNT(*) AS c FROM ${table}`);
    return Number(rows[0]?.c ?? 0);
  } catch (e) {
    console.log(`[bootstrap] ${table} not queryable yet: ${e.message}`);
    return -1;
  }
}

console.log("[bootstrap] Step 1/5: drizzle migrate");
try {
  run("npx drizzle-kit migrate");
} catch (e) {
  console.error("[bootstrap] drizzle migrate failed:", e.message);
  process.exit(1);
}

const conn = await mysql.createConnection(url);

const zoneCount = await tableCount(conn, "zone_metrics");
if (zoneCount === 0) {
  console.log("[bootstrap] Step 2/5: seed.mjs (zone_metrics empty)");
  run("node scripts/seed.mjs");
} else {
  console.log(`[bootstrap] Step 2/5: skipped — zone_metrics has ${zoneCount} rows`);
}

const histCount = await tableCount(conn, "historical_daily_2025");
if (histCount === 0) {
  console.log("[bootstrap] Step 3/5: seed-historical-2025.mjs");
  run("node scripts/seed-historical-2025.mjs");
} else {
  console.log(`[bootstrap] Step 3/5: skipped — historical_daily_2025 has ${histCount} rows`);
}

const zoneTaskCount = await tableCount(conn, "zone_task_history_2025");
if (zoneTaskCount === 0) {
  // The seed reads /tmp/zone_task_data.json which is dev-local; skip if absent.
  // v42 inferZoneMixForRoute falls back to zone_metrics when this table is empty.
  const fs = await import("node:fs");
  if (fs.existsSync("/tmp/zone_task_data.json")) {
    console.log("[bootstrap] Step 4/5: seed-zone-task-history.mjs");
    run("node scripts/seed-zone-task-history.mjs");
  } else {
    console.log("[bootstrap] Step 4/5: skipped — /tmp/zone_task_data.json absent (zone_metrics fallback in effect)");
  }
} else {
  console.log(`[bootstrap] Step 4/5: skipped — zone_task_history_2025 has ${zoneTaskCount} rows`);
}

const [volCheck] = await conn.execute(
  "SELECT COUNT(*) AS c FROM zone_metrics WHERE laf_volume_2025 IS NULL OR bc_volume_2025 IS NULL",
).catch(() => [[{ c: 0 }]]);
const needsVolumes = Number(volCheck?.[0]?.c ?? 0);
if (needsVolumes > 0) {
  console.log(`[bootstrap] Step 5/5: seed-zone-volumes.mjs (${needsVolumes} rows missing volumes)`);
  run("node scripts/seed-zone-volumes.mjs");
} else {
  console.log("[bootstrap] Step 5/5: skipped — zone_metrics volumes already populated");
}

await conn.end();
console.log("[bootstrap] Done. Starting app…");
