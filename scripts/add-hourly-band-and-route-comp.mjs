import mysql from "mysql2/promise";
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL missing"); process.exit(1); }
const conn = await mysql.createConnection(url);

async function colsOf(table) {
  const [rows] = await conn.execute(
    "SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ?",
    [table]
  );
  return new Set(rows.map((r) => r.COLUMN_NAME));
}

async function ensure(table, name, ddl) {
  const have = await colsOf(table);
  if (have.has(name)) {
    console.log(`skip ${table}.${name}`);
    return;
  }
  console.log(`ALTER ${table} ADD ${name}`);
  await conn.execute(`ALTER TABLE \`${table}\` ADD COLUMN \`${name}\` ${ddl}`);
}

await ensure("drivers", "hourlyTargetMin", "DECIMAL(6,2) NULL");
await ensure("drivers", "hourlyTargetMax", "DECIMAL(6,2) NULL");
await ensure("routes", "estRouteBasePay", "DECIMAL(10,2) NOT NULL DEFAULT 0");
await ensure("routes", "estTotalDriverPay", "DECIMAL(10,2) NOT NULL DEFAULT 0");
await ensure("routes", "wodelyAdjustment", "DECIMAL(10,2) NOT NULL DEFAULT 0");

await conn.end();
console.log("done");
