import { getDb } from "../server/db.ts";
import { sql } from "drizzle-orm";

const db = await getDb();

// Expand merchant ENUMs on all tables (idempotent: ALTER re-declaring is fine on MySQL).
const merchantCols = [
  ["routes", "merchant"],
  ["wodely_task_cache", "merchant"],
  ["zone_task_history_2025", "merchant"],
  ["merchant_share_tokens", "merchant"],
  ["merchant_day_notes", "merchant"],
];

for (const [t, c] of merchantCols) {
  try {
    await db.execute(
      sql.raw(`ALTER TABLE ${t} MODIFY COLUMN ${c} ENUM('LAF','BC','SMC','SMR') NOT NULL`),
    );
    console.log(`OK: enum expanded on ${t}.${c}`);
  } catch (e) {
    console.log(`SKIP ${t}.${c}:`, e?.message || e);
  }
}

// Add routes.bookingType if not exists.
try {
  await db.execute(
    sql.raw(
      `ALTER TABLE routes ADD COLUMN bookingType ENUM('Direct','Flex') NOT NULL DEFAULT 'Direct' AFTER merchant`,
    ),
  );
  console.log("OK: routes.bookingType added");
} catch (e) {
  if (String(e?.message).includes("Duplicate column")) console.log("SKIP: bookingType already exists");
  else throw e;
}

const [show] = await db.execute(sql`SHOW COLUMNS FROM routes LIKE 'bookingType'`);
console.log(show);
process.exit(0);
