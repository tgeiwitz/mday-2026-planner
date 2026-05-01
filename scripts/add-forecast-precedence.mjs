// Adds forecasting-precedence override columns to drivers + routes
// and seeds the corresponding global_settings rows.
// All columns are nullable so existing data stays valid.
import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const conn = await mysql.createConnection({
  uri: url,
  ssl: { rejectUnauthorized: false },
});

async function colExists(table, col) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, col],
  );
  return rows[0].n > 0;
}

async function add(table, col, ddl) {
  if (await colExists(table, col)) {
    console.log(`  SKIP ${table}.${col} (exists)`);
    return;
  }
  await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN ${ddl}`);
  console.log(`  ADD  ${table}.${col}`);
}

console.log("Drivers:");
await add("drivers", "maxCapacity", "`maxCapacity` INT NULL");
await add("drivers", "targetDuration", "`targetDuration` INT NULL");
await add("drivers", "targetStops", "`targetStops` INT NULL");

console.log("Routes:");
await add("routes", "maxCapacity", "`maxCapacity` INT NULL");
await add("routes", "targetDuration", "`targetDuration` INT NULL");
await add("routes", "targetStops", "`targetStops` INT NULL");
await add("routes", "hourlyTargetMin", "`hourlyTargetMin` DECIMAL(6,2) NULL");
await add("routes", "hourlyTargetMax", "`hourlyTargetMax` DECIMAL(6,2) NULL");

// Seed forecasting-default settings rows if not present.
console.log("Global defaults:");
const defaults = [
  ["targetMaxCapacity", "30", "Default max stops per route (forecasting)."],
  ["targetDuration", "180", "Default route duration in minutes (forecasting)."],
  ["targetStops", "25", "Default sweet-spot stop count (forecasting)."],
  ["targetHourlyMin", "28.00", "Default hourly target floor for drivers without a personal band."],
  ["targetHourlyMax", "35.00", "Default hourly target ceiling for drivers without a personal band."],
];
for (const [k, v, desc] of defaults) {
  const [r] = await conn.query(
    `SELECT id FROM global_settings WHERE settingKey = ?`,
    [k],
  );
  if (r.length === 0) {
    await conn.query(
      `INSERT INTO global_settings (settingKey, settingValue, description) VALUES (?, ?, ?)`,
      [k, v, desc],
    );
    console.log(`  ADD  global_settings.${k} = ${v}`);
  } else {
    console.log(`  SKIP global_settings.${k} (exists)`);
  }
}

await conn.end();
console.log("Done.");
