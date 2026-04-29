// Seed script for M-Day 2026 Scenario Planner
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import 'dotenv/config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const seedData = JSON.parse(readFileSync(join(__dirname, "../seed-data.json"), "utf-8"));

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

console.log("Clearing existing data...");
await connection.execute("DELETE FROM route_zones");
await connection.execute("DELETE FROM routes");
await connection.execute("DELETE FROM driver_timeblocks");
await connection.execute("DELETE FROM timeblocks");
await connection.execute("DELETE FROM drivers");
await connection.execute("DELETE FROM zone_metrics");
await connection.execute("DELETE FROM daily_forecast");
await connection.execute("DELETE FROM global_settings");

// 1. Seed daily forecast Apr 29 - May 18, 2026
console.log("Seeding daily forecast...");
const dates = [];
const startDate = new Date("2026-04-29");
for (let i = 0; i < 20; i++) {
  const d = new Date(startDate);
  d.setDate(d.getDate() + i);
  dates.push(d);
}

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function getPhase(date) {
  const iso = date.toISOString().split("T")[0];
  if (iso === "2026-05-10") return "Mother's Day";
  if (iso >= "2026-05-08" && iso <= "2026-05-11") return "Peak";
  if (iso >= "2026-05-06" && iso <= "2026-05-12") return "Holiday Week";
  return "Standard";
}

// Map 2026 dates back to 2025 equivalents (Mother's Day 2025 = May 11, 2025 / 2026 = May 10, 2026)
// Shift by -364 days so same day of week aligns
function get2025Equivalent(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - 364);
  return d.toISOString().split("T")[0];
}

for (const d of dates) {
  const iso = d.toISOString().split("T")[0];
  const dayName = dayNames[d.getUTCDay()];
  const equiv2025 = get2025Equivalent(d);
  const laf2025 = seedData.laf_2025_by_day[equiv2025] || 0;
  const bc2025 = seedData.bc_2025_by_day[equiv2025] || 0;
  const phase = getPhase(d);

  // 2026 goal: LAF +5%, BC +10% uplift on 2025
  const lafGoal = Math.round(laf2025 * 1.05);
  const bcGoal = Math.round(bc2025 * 1.10);

  await connection.execute(
    `INSERT INTO daily_forecast (forecastDate, dayName, phase, laf2025Actual, bc2025Actual, laf60DayTrend, bc60DayTrend, laf2026Goal, bc2026Goal, lafConfirmed, bcConfirmed, maxLafCapacity, maxBcCapacity) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      iso, dayName, phase,
      laf2025, bc2025,
      17, 4, // 60-day averages
      lafGoal, bcGoal,
      0, 0, // confirmed
      phase === "Mother's Day" ? 180 : phase === "Peak" ? 120 : phase === "Holiday Week" ? 80 : 40,
      phase === "Mother's Day" ? 20 : phase === "Peak" ? 15 : phase === "Holiday Week" ? 12 : 8,
    ]
  );
}

// 2. Seed zone metrics
console.log("Seeding zone metrics...");
for (const [zoneId, m] of Object.entries(seedData.zone_metrics_2025)) {
  // Use last year as default for 2026 assumption & 60-day trending
  await connection.execute(
    `INSERT INTO zone_metrics (zoneId, travelTimeLastYear, distanceLastYear, lafFeeLastYear, bcFeeLastYear, travelTime60Day, distance60Day, lafFee60Day, bcFee60Day, travelTime2026, distance2026, lafFee2026, bcFee2026) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      parseInt(zoneId),
      m.travel_time, m.distance, m.laf_fee, m.bc_fee,
      m.travel_time * 0.95, m.distance, m.laf_fee, m.bc_fee, // 60-day slightly lower travel
      m.travel_time, m.distance, m.laf_fee, m.bc_fee, // 2026 default = last year
    ]
  );
}

// 3. Seed drivers
console.log("Seeding drivers...");
const drivers = [
  ["Todd G", "Confirmed", "Lead", 0],
  ["Bilal Akhtar", "Confirmed", "Lead", 0],
  ["Hash A", "Confirmed", "Lead", 0.5],
  ["Mike R", "Pending", "Lead", 0],
  ["Sarah T", "Pending", "New", 2],
  ["Driver Placeholder 1", "Placeholder", "New", 2],
  ["Driver Placeholder 2", "Placeholder", "New", 2.5],
  ["Driver Placeholder 3", "Placeholder", "Lead", 0.5],
];

const driverIds = {};
for (const [name, status, type, diff] of drivers) {
  const [result] = await connection.execute(
    `INSERT INTO drivers (name, status, driverType, timePerStopDiff) VALUES (?,?,?,?)`,
    [name, status, type, diff]
  );
  driverIds[name] = result.insertId;
}

// 4. Seed timeblocks Apr 29 - May 18, 2026
console.log("Seeding timeblocks...");
const pickupTimes = seedData.pickup_times_2025;

const timeblockIds = {};
for (const d of dates) {
  const iso = d.toISOString().split("T")[0];
  const dayName = dayNames[d.getUTCDay()];
  const phase = getPhase(d);

  const lafPickups = pickupTimes[dayName]?.LAF || { wave1: "06:00", wave2: "08:00" };
  const bcPickups = pickupTimes[dayName]?.BC || { wave1: "07:00", wave2: "08:00" };

  // Wave 1
  const isPeak = phase === "Mother's Day" || phase === "Peak" || phase === "Holiday Week";
  const bonusW1 = phase === "Mother's Day" ? 75 : phase === "Peak" ? 50 : phase === "Holiday Week" ? 25 : 0;

  const [r1] = await connection.execute(
    `INSERT INTO timeblocks (blockDate, dayName, wave, label, lafPickupTime, bcPickupTime, availabilityStart, availabilityEnd, estRoutePay, estDuration, bonus, minPayFloor, maxPayFloor) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      iso, dayName, "Wave 1",
      `${dayName} ${iso.slice(5)} - Wave 1`,
      lafPickups.wave1, bcPickups.wave1,
      "04:00", "12:00",
      isPeak ? 225 : 175,
      isPeak ? 300 : 210,
      bonusW1,
      150, isPeak ? 300 : 225,
    ]
  );
  timeblockIds[`${iso}-Wave 1`] = r1.insertId;

  // Wave 2
  const [r2] = await connection.execute(
    `INSERT INTO timeblocks (blockDate, dayName, wave, label, lafPickupTime, bcPickupTime, availabilityStart, availabilityEnd, estRoutePay, estDuration, bonus, minPayFloor, maxPayFloor) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      iso, dayName, "Wave 2",
      `${dayName} ${iso.slice(5)} - Wave 2`,
      lafPickups.wave2, bcPickups.wave2,
      "11:00", "19:00",
      isPeak ? 200 : 150,
      isPeak ? 260 : 180,
      bonusW1,
      150, isPeak ? 275 : 225,
    ]
  );
  timeblockIds[`${iso}-Wave 2`] = r2.insertId;
}

// 5. Assign confirmed drivers to some timeblocks
console.log("Assigning drivers to timeblocks...");
const confirmedDriverNames = ["Todd G", "Bilal Akhtar", "Hash A"];
const sampleDates = ["2026-05-08", "2026-05-09", "2026-05-10", "2026-05-11"];
for (const dn of confirmedDriverNames) {
  for (const sd of sampleDates) {
    for (const w of ["Wave 1", "Wave 2"]) {
      const tbId = timeblockIds[`${sd}-${w}`];
      if (tbId) {
        await connection.execute(
          `INSERT INTO driver_timeblocks (driverId, timeblockId, assignmentStatus) VALUES (?,?,?)`,
          [driverIds[dn], tbId, "Scheduled"]
        );
      }
    }
  }
}

// 6. Seed sample routes for each day/wave/merchant
console.log("Seeding routes...");
const zoneGroupsLaf = [
  [662, 770, 771],
  [613, 614, 616],
  [602, 603, 604],
  [776, 777, 778, 779],
  [609, 610, 611, 612],
  [659, 660, 661],
];
const zoneGroupsBc = [
  [614, 615, 616],
  [662, 770, 771],
];

let routeCounter = 1;
for (const d of dates) {
  const iso = d.toISOString().split("T")[0];
  const phase = getPhase(d);
  const isPeak = phase === "Mother's Day" || phase === "Peak" || phase === "Holiday Week";
  const equiv2025 = get2025Equivalent(d);
  const lafVol = seedData.laf_2025_by_day[equiv2025] || 15;
  const bcVol = seedData.bc_2025_by_day[equiv2025] || 3;

  // Determine LAF routes per wave based on volume
  const lafRoutesPerWave = Math.max(1, Math.ceil(lafVol / 25));
  const bcRoutesPerWave = bcVol > 0 ? 1 : 0;

  for (const wave of ["Wave 1", "Wave 2"]) {
    const tbId = timeblockIds[`${iso}-${wave}`];
    // LAF routes
    for (let i = 0; i < lafRoutesPerWave && i < zoneGroupsLaf.length; i++) {
      const zones = zoneGroupsLaf[i];
      const stops = Math.ceil(lafVol / lafRoutesPerWave / (wave === "Wave 1" ? 1 : 1.5));
      const taskCountPerZone = Math.max(1, Math.floor(stops / zones.length));
      const estDuration = 30 + stops * 12; // 30 min base + 12 min per stop
      const estMileage = 15 + stops * 1.5;

      // Compute fee: avg 15 per stop
      const avgFee = 12;
      const estRouteFee = stops * avgFee + (isPeak ? stops * 5 : 0); // holiday surcharge
      const estDriverPay = estRouteFee * 0.75;
      const estMileagePay = estMileage > 30 ? (estMileage - 30) * 0.65 : 0;
      const estPlatformFee = estRouteFee * 0.15;

      const [rr] = await connection.execute(
        `INSERT INTO routes (routeCode, timeblockId, merchant, stops, estDuration, estMileage, estRouteFee, estDriverPay, estMileagePay, estPlatformFee, holidayPerStopSurcharge, driverBonus, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          `R${String(routeCounter).padStart(4, "0")}`, tbId, "LAF",
          stops, estDuration, estMileage,
          estRouteFee.toFixed(2), estDriverPay.toFixed(2), estMileagePay.toFixed(2), estPlatformFee.toFixed(2),
          isPeak ? 5 : 0,
          isPeak && wave === "Wave 1" ? 25 : 0,
          "Budgeted",
        ]
      );

      for (const zid of zones) {
        await connection.execute(
          `INSERT INTO route_zones (routeId, zoneId, taskCount) VALUES (?,?,?)`,
          [rr.insertId, zid, taskCountPerZone]
        );
      }
      routeCounter++;
    }

    // BC routes
    for (let i = 0; i < bcRoutesPerWave; i++) {
      const zones = zoneGroupsBc[i % zoneGroupsBc.length];
      const stops = Math.max(1, Math.ceil(bcVol / 2));
      const taskCountPerZone = Math.max(1, Math.floor(stops / zones.length));
      const estDuration = 30 + stops * 12;
      const estMileage = 10 + stops * 1.5;
      const avgFee = 14;
      const estRouteFee = stops * avgFee + (isPeak ? stops * 5 : 0);
      const estDriverPay = estRouteFee * 0.75;
      const estMileagePay = estMileage > 30 ? (estMileage - 30) * 0.65 : 0;
      const estPlatformFee = estRouteFee * 0.15;

      const [rr] = await connection.execute(
        `INSERT INTO routes (routeCode, timeblockId, merchant, stops, estDuration, estMileage, estRouteFee, estDriverPay, estMileagePay, estPlatformFee, holidayPerStopSurcharge, driverBonus, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          `R${String(routeCounter).padStart(4, "0")}`, tbId, "BC",
          stops, estDuration, estMileage,
          estRouteFee.toFixed(2), estDriverPay.toFixed(2), estMileagePay.toFixed(2), estPlatformFee.toFixed(2),
          isPeak ? 5 : 0, 0,
          "Budgeted",
        ]
      );

      for (const zid of zones) {
        await connection.execute(
          `INSERT INTO route_zones (routeId, zoneId, taskCount) VALUES (?,?,?)`,
          [rr.insertId, zid, taskCountPerZone]
        );
      }
      routeCounter++;
    }
  }
}

// 7. Global settings
console.log("Seeding global settings...");
const settings = [
  ["driverPayRate", "0.75", "Driver pay as % of route fee"],
  ["mileageThreshold", "30", "Miles before mileage pay kicks in"],
  ["mileageRate", "0.65", "Per mile rate above threshold"],
  ["platformFeePct", "0.15", "Platform fee as % of route fee"],
  ["holidaySurchargePerStop", "5", "Per-stop holiday surcharge"],
  ["scenarioMode", "Budget", "Current scenario mode: Budget|Confirmed|Reforecast"],
];
for (const [k, v, desc] of settings) {
  await connection.execute(
    `INSERT INTO global_settings (settingKey, settingValue, description) VALUES (?,?,?)`,
    [k, v, desc]
  );
}

console.log("Seeding complete!");
console.log(`Routes created: ${routeCounter - 1}`);
await connection.end();
