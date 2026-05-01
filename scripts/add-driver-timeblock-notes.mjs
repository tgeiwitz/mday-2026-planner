import mysql from "mysql2/promise";

const conn = await mysql.createConnection({ uri: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
try {
  // Check if column already exists
  const [cols] = await conn.query(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'driver_timeblocks' AND COLUMN_NAME = 'notes'"
  );
  if (cols.length === 0) {
    await conn.query("ALTER TABLE driver_timeblocks ADD COLUMN notes TEXT");
    console.log("Added notes column to driver_timeblocks");
  } else {
    console.log("notes column already exists");
  }
} finally {
  await conn.end();
}
