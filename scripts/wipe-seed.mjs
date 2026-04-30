import { getDb } from "../server/db.ts";
import { sql } from "drizzle-orm";

const db = await getDb();

// Order matters: children → parents.
const stmts = [
  `DELETE FROM route_zones`,
  `DELETE FROM route_history`,
  `DELETE FROM routes`,
  `DELETE FROM driver_timeblocks`,
  `DELETE FROM timeblocks`,
];

for (const s of stmts) {
  const [res] = await db.execute(sql.raw(s));
  console.log("OK:", s, "affected:", res?.affectedRows ?? res);
}

// Re-verify counts
for (const t of ["routes", "timeblocks", "route_zones", "driver_timeblocks", "route_history"]) {
  const [r] = await db.execute(sql.raw(`SELECT COUNT(*) AS n FROM ${t}`));
  console.log(t, r[0].n);
}
process.exit(0);
