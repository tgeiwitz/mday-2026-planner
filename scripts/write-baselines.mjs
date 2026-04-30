import { getDb } from "../server/db.ts";
import { sql } from "drizzle-orm";
import { readFileSync } from "fs";

const mdayBaseline = JSON.parse(readFileSync(new URL("./mday_baseline.json", import.meta.url), "utf8"));

// Per-zone median min/task from Supabase completed_tasks (last 60 days).
const sixty = {
  0: 17, 602: 14, 603: 23, 604: 25.5, 605: 22, 606: 21, 607: 26, 608: 26, 609: 17, 610: 34,
  611: 17, 612: 34, 613: 13, 614: 11, 615: 10, 616: 11, 659: 15, 660: 26, 661: 14.5, 662: 13.5,
  770: 13, 771: 22, 776: 12, 777: 21.5, 778: 30.5, 779: 20, 780: 17.5, 781: 47, 1489: 44.5,
};

const MDAY_GLOBAL = mdayBaseline.global_median_min_per_task; // 8.0
const SIXTY_GLOBAL = 17;

const db = await getDb();
const [zones] = await db.execute(sql`SELECT zoneId, zoneName FROM zone_metrics ORDER BY zoneId`);
console.log(`Updating ${zones.length} zones with per-zone min/task from 2025 actuals...\n`);
console.log("ZoneId | Name                  | M-Day LY (n) | 60d Normal | Source");
console.log("-------|-----------------------|--------------|------------|--------");

for (const z of zones) {
  const zid = z.zoneId;
  const mday = mdayBaseline.zones[zid];
  const mdaySamples = mday?.n_deltas ?? 0;
  const useMday = mday && mdaySamples >= 3;
  const mdayVal = useMday ? mday.median_min : MDAY_GLOBAL;
  const sixtyVal = sixty[zid] ?? SIXTY_GLOBAL;
  await db.execute(sql`
    UPDATE zone_metrics
    SET travelTimeLastYear = ${mdayVal},
        travelTime60Day = ${sixtyVal},
        travelTime2026 = ${mdayVal}
    WHERE zoneId = ${zid}
  `);
  const src = useMday ? `actual n=${mdaySamples}` : `global fallback (n=${mdaySamples})`;
  console.log(`${String(zid).padStart(6)} | ${(z.zoneName ?? '').padEnd(21).slice(0,21)} | ${String(mdayVal).padStart(5)}        | ${String(sixtyVal).padStart(5)}      | ${src}`);
}
console.log("\nDone. All zone_metrics travel times updated from real 2025 task completion data.");
process.exit(0);
