import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

const db = await getDb();
if (!db) {
  console.error("no db");
  process.exit(1);
}

const result = await db.execute(
  sql.raw(
    `SELECT id, wodelyTaskId, merchant, deliveryDate, taskFee, taskStatusId, syncedAt FROM wodely_task_cache WHERE merchant = 'BC' AND DATE(deliveryDate) = '2026-05-01'`
  )
);
const rows = (result as unknown as Array<Record<string, unknown>>[])[0] ?? [];
console.log(`BC rows for 2026-05-01: ${rows.length}`);
for (const r of rows) console.log(JSON.stringify(r));

// Check task status ids for context
const statusResult = await db.execute(
  sql.raw(
    `SELECT taskStatusId, COUNT(*) AS cnt FROM wodely_task_cache GROUP BY taskStatusId`
  )
);
const statuses = (statusResult as unknown as Array<Record<string, unknown>>[])[0] ?? [];
console.log("\nall taskStatusId distribution in cache:");
for (const r of statuses) console.log(JSON.stringify(r));

process.exit(0);
