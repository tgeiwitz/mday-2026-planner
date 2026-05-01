import 'dotenv/config';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { sql } from 'drizzle-orm';
const conn = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(conn);
const tables = ['zones','zone_metrics','drivers','timeblocks','routes','route_zones','daily_forecast','wodely_task_cache','historical_daily_2025','zone_task_history_2025','merchant_share_tokens','merchant_day_notes','users'];
for (const t of tables) {
  try {
    const [rows] = await conn.query(`select count(*) as c from \`${t}\``);
    console.log(t.padEnd(30), rows[0].c);
  } catch(e){ console.log(t.padEnd(30), 'NOT FOUND'); }
}
await conn.end();
