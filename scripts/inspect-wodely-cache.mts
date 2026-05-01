import "../server/_core/env";
import { getDb } from "../server/_core/db";
import { wodelyTaskCache } from "../drizzle/schema";
import { sql } from "drizzle-orm";

const db = await getDb();
if (!db) {
  console.error("no db");
  process.exit(1);
}

// Group by deliverDate (NY-local) and merchantId — what does the actual cache look like?
const rows = await db
  .select({
    deliverDate: wodelyTaskCache.deliverDate,
    merchantId: wodelyTaskCache.merchantId,
    count: sql<number>`count(*)`,
  })
  .from(wodelyTaskCache)
  .groupBy(wodelyTaskCache.deliverDate, wodelyTaskCache.merchantId)
  .orderBy(wodelyTaskCache.deliverDate);

console.log("date\tmerchant\tcount");
for (const r of rows) {
  const d =
    r.deliverDate instanceof Date
      ? r.deliverDate.toISOString().slice(0, 10)
      : String(r.deliverDate).slice(0, 10);
  console.log(`${d}\t${r.merchantId}\t${r.count}`);
}

// Also: what's the columns? Maybe completedAt vs deliverDate
const sample = await db.select().from(wodelyTaskCache).limit(2);
console.log("\nsample row:", JSON.stringify(sample[0], null, 2));

process.exit(0);
