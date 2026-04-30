import { getDb } from "../server/db.ts";
import { zoneMetrics } from "../drizzle/schema.ts";
const db = await getDb();
const rows = await db.select().from(zoneMetrics);
console.log("zone_id | zoneName | LY | 60d | 2026 | dist_ly | dist_2026 | laf_vol | bc_vol");
for (const r of rows.slice(0, 30)) {
  console.log(r.zoneId, "|", r.zoneName, "|", r.travelTimeLastYear, "|", r.travelTime60Day, "|", r.travelTime2026, "|", r.distanceLastYear, "|", r.distance2026, "|", r.lafVolume2025, "|", r.bcVolume2025);
}
console.log("Total zones:", rows.length);
process.exit(0);
