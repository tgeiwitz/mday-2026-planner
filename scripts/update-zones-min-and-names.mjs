// One-shot migration:
// 1. Populate zone_metrics.zoneName from the Supabase map_zones lookup.
// 2. Convert travelTimeLastYear / travelTime60Day / travelTime2026 from seconds to minutes
//    (divide by 60, round to 2 decimals). Includes a guard to avoid double-conversion:
//    only rows with travelTimeLastYear > 30 (i.e. still in seconds) are converted.

import mysql from "mysql2/promise";

const ZONE_NAMES = {
  602: "Arlington North",
  603: "Arlington RBC",
  604: "Arlington South",
  605: "Arl/Alexandria National Landing",
  606: "Alexandria Old Town",
  607: "Alexandria West",
  608: "McLean",
  609: "Falls Church",
  610: "Fairfax South",
  611: "Fairfax Special South",
  612: "Fairfax Special North",
  613: "DC Georgetown",
  614: "Downtown",
  615: "DC Waterfront",
  616: "DC Capital Hill",
  659: "DC NOMA H St",
  660: "DC NE Brookland",
  661: "DC NW 16th St Heights",
  662: "DC NW Adams Morgan",
  770: "Chevy Chase",
  771: "Silver Spring",
  776: "Cleveland Park",
  777: "Montco West",
  778: "Montco East",
  779: "MD CP H L",
  780: "MD Cap Heights",
  781: "MD Fort Washington",
  1489: "Fairfax West",
};

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  const conn = await mysql.createConnection({
    host: url.hostname,
    port: url.port,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    ssl: {},
  });

  console.log("Updating zone names ...");
  for (const [zoneId, zoneName] of Object.entries(ZONE_NAMES)) {
    await conn.execute(
      "UPDATE zone_metrics SET zoneName = ? WHERE zoneId = ?",
      [zoneName, Number(zoneId)],
    );
  }

  console.log("Converting travel-time columns from seconds to minutes ...");
  // Guard: only convert if any row still has travelTimeLastYear > 30 (minutes should be <10).
  const [guardRows] = await conn.query(
    "SELECT MAX(travelTimeLastYear) AS maxLast FROM zone_metrics",
  );
  const maxLast = Number(guardRows[0]?.maxLast ?? 0);
  if (maxLast > 30) {
    await conn.execute(
      "UPDATE zone_metrics SET travelTimeLastYear = ROUND(travelTimeLastYear/60, 2), travelTime60Day = ROUND(travelTime60Day/60, 2), travelTime2026 = ROUND(travelTime2026/60, 2)",
    );
    console.log("  converted.");
  } else {
    console.log("  skipped (already in minutes).");
  }

  const [sample] = await conn.query(
    "SELECT zoneId, zoneName, travelTimeLastYear, travelTime2026 FROM zone_metrics ORDER BY zoneId LIMIT 5",
  );
  console.log("Sample:", sample);

  await conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
