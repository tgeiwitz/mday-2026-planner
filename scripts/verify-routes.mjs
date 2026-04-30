import { getDb } from "../server/db.ts";
import { sql } from "drizzle-orm";
const db = await getDb();
const [rows] = await db.execute(sql`SELECT routeCode, stops, estDuration, estMileage, estRouteFee FROM routes ORDER BY estDuration DESC LIMIT 10`);
console.log("Top 10 routes by duration:");
for (const r of rows) console.log(` ${r.routeCode.padEnd(12)} stops=${String(r.stops).padStart(3)} dur=${String(r.estDuration).padStart(4)}m miles=${r.estMileage} fee=$${r.estRouteFee}`);
const [stats] = await db.execute(sql`SELECT AVG(estDuration) avg, MIN(estDuration) mn, MAX(estDuration) mx FROM routes WHERE stops > 0`);
console.log("\nAll routes duration stats:", stats[0]);
process.exit(0);
