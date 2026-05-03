// Run with `tsx scripts/inspect-wodely-cache.mts` against a live DATABASE_URL.
// Prints the wodely_task_cache distribution by (deliveryDate, merchant) and the
// matching dailyForecast.lafConfirmed/bcConfirmed values so v46 date-bucket
// drift can be diagnosed in one read.

import { getDb } from "../server/db";
import { wodelyTaskCache, dailyForecast } from "../drizzle/schema";
import { sql } from "drizzle-orm";

const db = await getDb();
if (!db) {
  console.error("no db (set DATABASE_URL)");
  process.exit(1);
}

const cacheRows = await db
  .select({
    deliveryDate: wodelyTaskCache.deliveryDate,
    merchant: wodelyTaskCache.merchant,
    taskStatusId: wodelyTaskCache.taskStatusId,
    count: sql<number>`count(*)`,
  })
  .from(wodelyTaskCache)
  .groupBy(
    wodelyTaskCache.deliveryDate,
    wodelyTaskCache.merchant,
    wodelyTaskCache.taskStatusId,
  )
  .orderBy(wodelyTaskCache.deliveryDate);

const isoOf = (d: unknown) =>
  d instanceof Date
    ? `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
    : String(d).slice(0, 10);

const cacheBy = new Map<string, { laf: number; bc: number; cancelled: number }>();
for (const r of cacheRows) {
  const k = isoOf(r.deliveryDate);
  if (!cacheBy.has(k)) cacheBy.set(k, { laf: 0, bc: 0, cancelled: 0 });
  const row = cacheBy.get(k)!;
  if (r.taskStatusId === 50) {
    row.cancelled += Number(r.count);
  } else if (r.merchant === "LAF") {
    row.laf += Number(r.count);
  } else if (r.merchant === "BC") {
    row.bc += Number(r.count);
  }
}

const fcRows = await db.select().from(dailyForecast);
const fcBy = new Map<string, { laf: number; bc: number }>();
for (const f of fcRows) {
  fcBy.set(isoOf(f.forecastDate), {
    laf: Number(f.lafConfirmed) || 0,
    bc: Number(f.bcConfirmed) || 0,
  });
}

const allDates = new Set<string>();
for (const k of cacheBy.keys()) allDates.add(k);
for (const k of fcBy.keys()) allDates.add(k);
const sorted = [...allDates].sort();

console.log("date        cache_laf cache_bc cache_cxl fc_laf fc_bc drift");
for (const d of sorted) {
  const c = cacheBy.get(d) ?? { laf: 0, bc: 0, cancelled: 0 };
  const f = fcBy.get(d) ?? { laf: 0, bc: 0 };
  const driftLaf = f.laf - c.laf;
  const driftBc = f.bc - c.bc;
  const flag =
    driftLaf !== 0 || driftBc !== 0
      ? `LAF${driftLaf >= 0 ? "+" : ""}${driftLaf} BC${driftBc >= 0 ? "+" : ""}${driftBc}`
      : "";
  const pad = (n: number, w = 9) => String(n).padEnd(w);
  console.log(`${d}  ${pad(c.laf)}${pad(c.bc)}${pad(c.cancelled)} ${pad(f.laf, 6)}${pad(f.bc, 5)}${flag}`);
}

process.exit(0);
