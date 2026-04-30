import { getDb } from "../server/db.ts";
import { sql } from "drizzle-orm";
const db = await getDb();
const cols = [
  ["routeStart", "VARCHAR(8)"],
  ["pickupDwell", "INT NOT NULL DEFAULT 15"],
  ["mileageRate", "DECIMAL(6,3) NOT NULL DEFAULT 0.670"],
  ["targetRoutes", "INT NOT NULL DEFAULT 1"],
  ["merchant", "ENUM('LAF','BC','SMC','SMR','Flex') NOT NULL DEFAULT 'Flex'"],
  ["bookingType", "ENUM('Direct','Flex') NOT NULL DEFAULT 'Flex'"],
  ["notes", "TEXT"],
];
for (const [name, type] of cols) {
  try {
    await db.execute(sql.raw(`ALTER TABLE timeblocks ADD COLUMN ${name} ${type}`));
    console.log("OK add:", name);
  } catch (e) {
    if (String(e?.message).includes("Duplicate column")) console.log("SKIP:", name);
    else throw e;
  }
}
// Relax wave so we can omit it on new rows
try {
  await db.execute(sql.raw(`ALTER TABLE timeblocks MODIFY COLUMN wave ENUM('Wave 1','Wave 2') NULL`));
  console.log("OK: wave made nullable");
} catch (e) { console.log("wave relax skip:", e?.message || e); }
process.exit(0);
