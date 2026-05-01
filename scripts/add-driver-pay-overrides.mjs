import mysql from "mysql2/promise";
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}
const conn = await mysql.createConnection(url);
const [cols] = await conn.execute(
  "SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'drivers'"
);
const have = new Set(cols.map((c) => c.COLUMN_NAME));
const wants = [
  ["payPctOverride", "DECIMAL(5,4) NULL"],
  ["payFloorOverride", "DECIMAL(10,2) NULL"],
  ["payMaxOverride", "DECIMAL(10,2) NULL"],
];
for (const [name, ddl] of wants) {
  if (!have.has(name)) {
    console.log("ALTER drivers ADD", name);
    await conn.execute(`ALTER TABLE drivers ADD COLUMN \`${name}\` ${ddl}`);
  } else {
    console.log("skip", name);
  }
}
await conn.end();
console.log("done");
