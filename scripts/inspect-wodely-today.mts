import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

const db = await getDb();
if (!db) {
  console.error("no db");
  process.exit(1);
}

// Today in NY-local = 2026-05-01
const today = "2026-05-01";

// Use raw SQL with actual MySQL column names
const rowsResult = await db.execute(
  sql.raw(`SELECT id, wodelyTaskId, merchant, deliveryDate, zoneId, taskFee, syncedAt FROM wodely_task_cache WHERE DATE(deliveryDate) = '${today}'`)
);
const rows = (rowsResult as unknown as Array<Record<string, unknown>>[])[0] ?? [];

console.log(`wodely_task_cache rows for deliveryDate=${today}: ${rows.length}`);
const byMerchant: Record<string, number> = {};
for (const r of rows) {
  const m = String(r.merchant);
  byMerchant[m] = (byMerchant[m] ?? 0) + 1;
}
console.log("by merchant:", byMerchant);
console.log("\nfirst 3 rows:");
for (const r of rows.slice(0, 3)) {
  console.log(JSON.stringify(r, null, 2));
}

// Distribution
const rangeResult = await db.execute(
  sql.raw(`SELECT DATE(deliveryDate) AS d, merchant, COUNT(*) AS cnt FROM wodely_task_cache GROUP BY DATE(deliveryDate), merchant ORDER BY DATE(deliveryDate)`)
);
const range = (rangeResult as unknown as Array<Record<string, unknown>>[])[0] ?? [];
console.log("\ndistribution by deliveryDate:");
for (const r of range) {
  console.log(`${r.d}\tmerchant ${r.merchant}\t${r.cnt}`);
}

process.exit(0);
