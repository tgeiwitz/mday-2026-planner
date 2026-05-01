import { getDb } from "../server/db";
const db = await getDb();
if (!db) throw new Error("no db");
const r: any = await (db as any).execute("DESCRIBE wodely_task_cache");
console.log(r[0].map((row: any) => row.Field).join("\n"));
