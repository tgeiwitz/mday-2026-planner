import { getDb } from "../server/db.ts";
import { sql } from "drizzle-orm";

const db = await getDb();

// Use NY timezone calendar date
const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
console.log("Today (NY):", today);

const [tbs] = await db.execute(sql`
  SELECT id, blockDate, wave, label, estDuration, availabilityStart, availabilityEnd
  FROM timeblocks WHERE DATE(blockDate) = ${today}
  ORDER BY id
`);
console.log("Timeblocks for today:", tbs.length);
for (const t of tbs) console.log("  ", t);

const [rs] = await db.execute(sql`
  SELECT r.id, r.routeCode, r.timeblockId, r.merchant, r.bookingType, r.stops, r.estDuration, r.status, t.blockDate, t.label
  FROM routes r
  JOIN timeblocks t ON t.id = r.timeblockId
  WHERE DATE(t.blockDate) = ${today}
  ORDER BY r.id
`);
console.log("\nRoutes for today:", rs.length);
for (const r of rs) console.log("  ", r);

process.exit(0);
