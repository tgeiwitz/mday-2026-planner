import { getDb } from "../server/db.ts";
import { sql } from "drizzle-orm";

const db = await getDb();

const statements = [
  `CREATE TABLE IF NOT EXISTS merchant_share_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(64) NOT NULL UNIQUE,
    merchant ENUM('LAF','BC') NOT NULL,
    label VARCHAR(128),
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revokedAt TIMESTAMP NULL,
    lastUsedAt TIMESTAMP NULL
  )`,
  `CREATE TABLE IF NOT EXISTS merchant_day_notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    merchant ENUM('LAF','BC') NOT NULL,
    noteDate DATE NOT NULL,
    note TEXT,
    updatedBy VARCHAR(128),
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_merchant_day (merchant, noteDate)
  )`,
];

for (const s of statements) {
  await db.execute(sql.raw(s));
  console.log("OK:", s.split("\n")[0]);
}

const [tokens] = await db.execute(sql`SHOW TABLES LIKE 'merchant_share_tokens'`);
const [notes] = await db.execute(sql`SHOW TABLES LIKE 'merchant_day_notes'`);
console.log("tokens table present:", tokens);
console.log("notes table present:", notes);
process.exit(0);
