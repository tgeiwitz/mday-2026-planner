// v33 — vehicle multiplier + assignment confirmation
import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const conn = await mysql.createConnection({
  uri: url, ssl: { rejectUnauthorized: false },
});

async function colExists(t, c) {
  const [r] = await conn.query(
    `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?`, [t, c]);
  return r[0].n > 0;
}
async function add(t, c, ddl) {
  if (await colExists(t, c)) { console.log(`  SKIP ${t}.${c}`); return; }
  await conn.query(`ALTER TABLE \`${t}\` ADD COLUMN ${ddl}`);
  console.log(`  ADD  ${t}.${c}`);
}

console.log("Drivers:");
await add("drivers", "vehicleType",
  "`vehicleType` ENUM('sedan','van') NOT NULL DEFAULT 'sedan'");

console.log("Routes:");
await add("routes", "vehicleType",
  "`vehicleType` ENUM('sedan','van') NULL");
await add("routes", "assignmentConfirmed",
  "`assignmentConfirmed` INT NOT NULL DEFAULT 0");
await add("routes", "assignmentConfirmedAt",
  "`assignmentConfirmedAt` TIMESTAMP NULL");

await conn.end();
console.log("Done.");
