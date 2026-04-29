import 'dotenv/config';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import fs from 'node:fs';

const url = new URL(process.env.DATABASE_URL);
const pool = await mysql.createPool({
  host: url.hostname,
  port: Number(url.port || 3306),
  user: url.username,
  password: decodeURIComponent(url.password),
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
});
const db = drizzle(pool);

// 1. Create table if it doesn't exist
await pool.query(`CREATE TABLE IF NOT EXISTS zone_task_history_2025 (
  id INT AUTO_INCREMENT PRIMARY KEY,
  taskDate DATE NOT NULL,
  merchant ENUM('LAF','BC') NOT NULL,
  zoneId INT NOT NULL,
  taskCount INT NOT NULL DEFAULT 0,
  avgFee DECIMAL(10,2) NOT NULL DEFAULT '0',
  KEY idx_date_merch (taskDate, merchant),
  KEY idx_zone (zoneId)
)`);
console.log('table ready');

// 2. Clear existing
await pool.query('DELETE FROM zone_task_history_2025');

// 3. Seed from JSON
const rows = JSON.parse(fs.readFileSync('/tmp/zone_task_data.json', 'utf8'));
const merchantMap = { 'Little Acre Flowers': 'LAF', 'Blooms Collective': 'BC' };
let inserted = 0;
for (const r of rows) {
  const m = merchantMap[r.m];
  if (!m) continue;
  const fee = Number(r.avg_fee) || 0;
  await pool.query(
    'INSERT INTO zone_task_history_2025 (taskDate, merchant, zoneId, taskCount, avgFee) VALUES (?, ?, ?, ?, ?)',
    [r.d, m, r.z, r.c, fee.toFixed(2)]
  );
  inserted++;
}
console.log(`seeded ${inserted} rows`);

await pool.end();
