import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

const db = await getDb();
if (!db) {
  console.error("no db");
  process.exit(1);
}

const targets = [
  { iso: "2026-05-07", label: "Thu May 7" },
  { iso: "2026-05-08", label: "Fri May 8" },
  { iso: "2026-05-09", label: "Sat May 9" },
  { iso: "2026-05-10", label: "Sun May 10 (M-Day)" },
];

const MIN_PER_STOP = 8;
const WAVE_MIN = 240;
const STOPS_PER_ROUTE = WAVE_MIN / MIN_PER_STOP; // 30

console.log(`8min/stop * 240min wave = ${STOPS_PER_ROUTE} stops/route\n`);
console.log("date | LAF goal | BC goal | total goal | routes needed");

for (const tgt of targets) {
  const fc = await db.execute(
    sql.raw(
      `SELECT laf2026Goal, bc2026Goal FROM daily_forecast WHERE DATE(forecastDate) = '${tgt.iso}'`
    )
  );
  const rows = (fc as unknown as Array<Record<string, unknown>>[])[0] ?? [];
  const lafGoal = rows.length ? Number(rows[0].laf2026Goal ?? 0) : 0;
  const bcGoal = rows.length ? Number(rows[0].bc2026Goal ?? 0) : 0;
  const total = lafGoal + bcGoal;
  const routes = Math.ceil(total / STOPS_PER_ROUTE);
  console.log(
    `${tgt.label} | LAF ${lafGoal} | BC ${bcGoal} | total ${total} | ${routes} routes`
  );
}

process.exit(0);
