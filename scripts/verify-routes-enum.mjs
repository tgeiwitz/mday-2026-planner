import { getDb } from "../server/db.ts";
import { sql } from "drizzle-orm";
const db = await getDb();
const [r] = await db.execute(sql`SHOW COLUMNS FROM routes LIKE 'merchant'`);
console.log(r);
process.exit(0);
