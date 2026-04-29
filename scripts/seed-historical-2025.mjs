// Seeds historical_daily_2025 from the Supabase completed_tasks aggregate
// we pulled for Apr 20 – May 19, 2025. Pivots merchants so LAF = Little Acre
// Flowers, BC = Blooms Collective, all others collapse into otherTasks.
// daysBeforeMday is computed with 2025 M-Day = 2025-05-11.
import mysql from "mysql2/promise";

const MDAY_2025 = new Date(Date.UTC(2025, 4, 11)); // 2025-05-11
const daysBefore = (iso) => {
  const d = new Date(iso + "T00:00:00Z");
  return Math.round((MDAY_2025 - d) / 86400000);
};

// Raw rows from Supabase query
const rawRows = [
  ["2025-04-21","Blooms Collective",12,10.11],["2025-04-21","Flowers on 14th",2,63.24],
  ["2025-04-21","Little Acre Flowers",21,11.94],["2025-04-21","LunchEras Di Si LLC",15,18.33],
  ["2025-04-21","Shop Made Retail",2,57.15],["2025-04-22","Blooms Collective",4,10.01],
  ["2025-04-22","Little Acre Flowers",15,10.68],["2025-04-22","LunchEras Di Si LLC",12,0.00],
  ["2025-04-23","Blooms Collective",9,7.09],["2025-04-23","Little Acre Flowers",37,11.77],
  ["2025-04-23","LunchEras Di Si LLC",10,0.00],["2025-04-24","Blooms Collective",6,5.14],
  ["2025-04-24","Little Acre Flowers",24,9.64],["2025-04-24","LunchEras Di Si LLC",13,0.00],
  ["2025-04-25","Blooms Collective",7,7.15],["2025-04-25","Little Acre Flowers",29,14.03],
  ["2025-04-25","LunchEras Di Si LLC",12,22.92],["2025-04-26","Little Acre Flowers",28,13.59],
  ["2025-04-26","Maggie O'Neill Studios",1,48.00],["2025-04-26","MIsc/Internal",1,0.00],
  ["2025-04-28","Blooms Collective",6,7.51],["2025-04-28","Little Acre Flowers",20,14.33],
  ["2025-04-28","LunchEras Di Si LLC",17,16.18],["2025-04-29","",1,0.00],
  ["2025-04-29","Blooms Collective",2,5.01],["2025-04-29","Little Acre Flowers",33,12.21],
  ["2025-04-29","LunchEras Di Si LLC",15,18.33],["2025-04-30","Blooms Collective",2,5.01],
  ["2025-04-30","Little Acre Flowers",20,13.36],["2025-04-30","LunchEras Di Si LLC",11,0.00],
  ["2025-05-01","Blooms Collective",5,6.01],["2025-05-01","Little Acre Flowers",33,12.28],
  ["2025-05-01","LunchEras Di Si LLC",15,18.33],["2025-05-01","Shop Made Corporate",2,28.90],
  ["2025-05-02","",1,0.00],["2025-05-02","Blooms Collective",6,7.00],
  ["2025-05-02","Little Acre Flowers",38,10.75],["2025-05-02","LunchEras Di Si LLC",11,25.00],
  ["2025-05-03","Blooms Collective",3,6.67],["2025-05-03","Little Acre Flowers",17,15.09],
  ["2025-05-04","Shop Made Corporate",2,82.27],["2025-05-05","Blooms Collective",5,9.01],
  ["2025-05-05","Little Acre Flowers",27,10.10],["2025-05-05","LunchEras Di Si LLC",15,18.33],
  ["2025-05-06","Blooms Collective",2,0.00],["2025-05-06","Little Acre Flowers",23,10.19],
  ["2025-05-06","LunchEras Di Si LLC",13,21.15],["2025-05-06","Shop Made Corporate",5,42.77],
  ["2025-05-07","Blooms Collective",7,6.43],["2025-05-07","Little Acre Flowers",30,13.44],
  ["2025-05-07","LunchEras Di Si LLC",11,25.00],["2025-05-08","Blooms Collective",8,7.51],
  ["2025-05-08","Little Acre Flowers",33,9.84],["2025-05-08","LunchEras Di Si LLC",14,19.64],
  ["2025-05-08","Test",2,62.96],["2025-05-09","",1,0.00],
  ["2025-05-09","Blooms Collective",14,8.12],["2025-05-09","Little Acre Flowers",80,11.47],
  ["2025-05-09","LunchEras Di Si LLC",8,34.38],["2025-05-09","MIsc/Internal",2,-37.50],
  ["2025-05-09","Shop Made Corporate",4,46.85],["2025-05-10","Blooms Collective",12,11.69],
  ["2025-05-10","Little Acre Flowers",107,11.91],["2025-05-10","MIsc/Internal",2,-37.54],
  ["2025-05-11","",1,11.00],["2025-05-11","Blooms Collective",15,7.18],
  ["2025-05-11","Little Acre Flowers",161,12.57],["2025-05-11","MIsc/Internal",9,16.67],
  ["2025-05-12","Blooms Collective",5,4.00],["2025-05-12","Little Acre Flowers",63,11.05],
  ["2025-05-12","LunchEras Di Si LLC",13,0.00],["2025-05-13","",1,0.00],
  ["2025-05-13","Blooms Collective",5,6.01],["2025-05-13","Little Acre Flowers",30,10.19],
  ["2025-05-13","LunchEras Di Si LLC",15,19.64],["2025-05-14","Little Acre Flowers",25,13.19],
  ["2025-05-14","LunchEras Di Si LLC",14,19.64],["2025-05-14","Shop Made Corporate",2,27.31],
  ["2025-05-15","Blooms Collective",10,11.94],["2025-05-15","Little Acre Flowers",21,9.14],
  ["2025-05-15","LunchEras Di Si LLC",15,0.00],["2025-05-16","",2,0.00],
  ["2025-05-16","Blooms Collective",5,14.37],["2025-05-16","Little Acre Flowers",37,10.77],
  ["2025-05-16","LunchEras Di Si LLC",12,22.92],["2025-05-17","",1,0.00],
  ["2025-05-17","Blooms Collective",3,12.54],["2025-05-17","Little Acre Flowers",22,14.67],
  ["2025-05-17","Shop Made Corporate",1,55.24],["2025-05-19","",1,0.00],
  ["2025-05-19","Blooms Collective",2,0.00],["2025-05-19","Little Acre Flowers",31,14.12],
  ["2025-05-19","LunchEras Di Si LLC",12,0.00],["2025-05-19","Shop Made Corporate",2,81.27],
];

// Pivot by date.
const byDate = new Map();
for (const [d, merchant, tasks, avgFee] of rawRows) {
  if (!byDate.has(d)) byDate.set(d, { lafTasks: 0, lafFeeSum: 0, bcTasks: 0, bcFeeSum: 0, otherTasks: 0 });
  const row = byDate.get(d);
  if (merchant === "Little Acre Flowers") {
    row.lafTasks += tasks;
    row.lafFeeSum += tasks * avgFee;
  } else if (merchant === "Blooms Collective") {
    row.bcTasks += tasks;
    row.bcFeeSum += tasks * avgFee;
  } else {
    row.otherTasks += tasks;
  }
}

const url = new URL(process.env.DATABASE_URL);
const conn = await mysql.createConnection({
  host: url.hostname, port: url.port, user: url.username, password: url.password,
  database: url.pathname.slice(1), ssl: {}, multipleStatements: true,
});

// Apply migration idempotently (CREATE TABLE IF NOT EXISTS workaround: check first)
const [existing] = await conn.query("SHOW TABLES LIKE 'historical_daily_2025'");
if (!existing.length) {
  const fs = await import("node:fs/promises");
  const sql = await fs.readFile("drizzle/0007_gray_toad.sql", "utf8");
  await conn.query(sql);
  console.log("Migration applied.");
}

// Insert / update
await conn.query("DELETE FROM historical_daily_2025");
for (const [d, row] of byDate) {
  const lafAvg = row.lafTasks > 0 ? (row.lafFeeSum / row.lafTasks).toFixed(2) : "0.00";
  const bcAvg = row.bcTasks > 0 ? (row.bcFeeSum / row.bcTasks).toFixed(2) : "0.00";
  await conn.query(
    "INSERT INTO historical_daily_2025 (taskDate, daysBeforeMday, lafTasks, lafAvgFee, bcTasks, bcAvgFee, otherTasks) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [d, daysBefore(d), row.lafTasks, lafAvg, row.bcTasks, bcAvg, row.otherTasks]
  );
}
console.log(`Seeded ${byDate.size} historical days.`);
await conn.end();
