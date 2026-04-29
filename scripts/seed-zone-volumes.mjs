// Seed per-zone task volumes (LAF + BC) from 2025 May 5-12 Supabase data.
// Adds laf_volume_2025 and bc_volume_2025 columns to zone_metrics and populates them.
import mysql from "mysql2/promise";
import "dotenv/config";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

// Volumes pulled from Supabase 2025-05-05..2025-05-12.
// Only Little Acre Flowers (LAF) and Blooms Collective (BC) kept.
const volumes = {
  602: { laf: 16, bc: 1 },
  603: { laf: 15, bc: 0 },
  604: { laf: 3, bc: 0 },
  605: { laf: 5, bc: 0 },
  606: { laf: 2, bc: 0 },
  607: { laf: 7, bc: 0 },
  608: { laf: 2, bc: 0 },
  609: { laf: 2, bc: 0 },
  610: { laf: 4, bc: 0 },
  611: { laf: 7, bc: 0 },
  612: { laf: 5, bc: 0 },
  613: { laf: 50, bc: 1 },
  614: { laf: 40, bc: 28 },
  615: { laf: 4, bc: 2 },
  616: { laf: 30, bc: 5 },
  659: { laf: 18, bc: 0 },
  660: { laf: 10, bc: 1 },
  661: { laf: 24, bc: 1 },
  662: { laf: 91, bc: 12 },
  770: { laf: 98, bc: 11 },
  771: { laf: 25, bc: 0 },
  776: { laf: 26, bc: 3 },
  777: { laf: 19, bc: 1 },
  778: { laf: 7, bc: 0 },
  779: { laf: 4, bc: 1 },
  780: { laf: 5, bc: 0 },
  781: { laf: 3, bc: 0 },
};

const conn = await mysql.createConnection({ uri: DATABASE_URL, ssl: { rejectUnauthorized: false } });

// Add columns if not present.
const [cols] = await conn.execute("show columns from zone_metrics");
const names = new Set(cols.map((c) => c.Field));
if (!names.has("laf_volume_2025")) {
  await conn.execute("alter table zone_metrics add column laf_volume_2025 int default 0 not null");
  console.log("added laf_volume_2025");
}
if (!names.has("bc_volume_2025")) {
  await conn.execute("alter table zone_metrics add column bc_volume_2025 int default 0 not null");
  console.log("added bc_volume_2025");
}

// Seed.
let updated = 0;
for (const [zoneId, v] of Object.entries(volumes)) {
  const [res] = await conn.execute(
    "update zone_metrics set laf_volume_2025 = ?, bc_volume_2025 = ? where zoneId = ?",
    [v.laf, v.bc, Number(zoneId)]
  );
  if (res.affectedRows > 0) updated++;
}
console.log(`seeded volumes for ${updated} zones`);

const [check] = await conn.execute(
  "select zoneId, zoneName, laf_volume_2025, bc_volume_2025 from zone_metrics where laf_volume_2025 > 0 or bc_volume_2025 > 0 order by laf_volume_2025 + bc_volume_2025 desc limit 10"
);
console.table(check);

await conn.end();
