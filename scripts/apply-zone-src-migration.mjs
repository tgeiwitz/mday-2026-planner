import { getDb } from "../server/db.ts";
import { sql } from "drizzle-orm";
const db = await getDb();
try {
  await db.execute(sql`ALTER TABLE zone_metrics ADD COLUMN travelTimeSource ENUM('global','lastYear','sixtyDay','y2026') NOT NULL DEFAULT 'global'`);
  console.log("Added travelTimeSource column.");
} catch (e) {
  if (String(e?.message).includes("Duplicate column")) console.log("Already exists.");
  else throw e;
}
const [cols] = await db.execute(sql`SHOW COLUMNS FROM zone_metrics LIKE 'travelTimeSource'`);
console.log(cols);
process.exit(0);
