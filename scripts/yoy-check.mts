import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

const db = await getDb();
if (!db) {
  console.error("no db");
  process.exit(1);
}

// 2026 Thu/Fri/Sat/Sun = May 7-10. 2025 same days-before-MD = May 8-11 (MD was May 11, 2025).
// Pull the 2026 daily_forecast and join against historical_daily_2025 lined up.
const result = await db.execute(
  sql.raw(`
    SELECT
      DATE(forecastDate) AS d2026,
      laf2025Actual AS laf2025,
      bc2025Actual AS bc2025,
      laf2026Goal AS laf2026,
      bc2026Goal AS bc2026
    FROM daily_forecast
    WHERE DATE(forecastDate) BETWEEN '2026-05-07' AND '2026-05-10'
    ORDER BY forecastDate
  `)
);
const rows = (result as unknown as Array<Record<string, unknown>>[])[0] ?? [];
console.log("date | LAF 2025 -> 2026 | BC 2025 -> 2026 | total 2025 -> 2026 | YoY %");
for (const r of rows) {
  const laf25 = Number(r.laf2025 ?? 0);
  const bc25 = Number(r.bc2025 ?? 0);
  const laf26 = Number(r.laf2026 ?? 0);
  const bc26 = Number(r.bc2026 ?? 0);
  const tot25 = laf25 + bc25;
  const tot26 = laf26 + bc26;
  const yoy = tot25 > 0 ? `${(((tot26 - tot25) / tot25) * 100).toFixed(0)}%` : "n/a";
  console.log(
    `${r.d2026} | LAF ${laf25} -> ${laf26} | BC ${bc25} -> ${bc26} | total ${tot25} -> ${tot26} | ${yoy}`
  );
}

// Also pull raw 2025 daily totals from historical_daily_2025 directly to verify
console.log("\n--- raw historical_daily_2025 for May 8-11, 2025 ---");
const histResult = await db.execute(
  sql.raw(`
    SELECT taskDate, merchant, SUM(taskCount) AS cnt
    FROM historical_daily_2025
    WHERE DATE(taskDate) BETWEEN '2025-05-08' AND '2025-05-11'
    GROUP BY taskDate, merchant
    ORDER BY taskDate, merchant
  `)
);
const hRows = (histResult as unknown as Array<Record<string, unknown>>[])[0] ?? [];
for (const r of hRows) {
  console.log(`${r.taskDate} | ${r.merchant} | ${r.cnt}`);
}

process.exit(0);
