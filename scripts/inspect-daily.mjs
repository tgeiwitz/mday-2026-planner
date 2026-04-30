import { getDb } from "../server/db.ts";
import { sql } from "drizzle-orm";
const db = await getDb();
const [cols] = await db.execute(sql`SHOW COLUMNS FROM historical_daily_2025`);
console.log("historical_daily_2025 columns:");
for (const c of cols) console.log(" ", c.Field, c.Type);
const [sample] = await db.execute(sql`SELECT * FROM historical_daily_2025 LIMIT 5`);
console.log("Sample:", sample);
process.exit(0);
