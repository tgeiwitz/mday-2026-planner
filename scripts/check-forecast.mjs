import dotenv from 'dotenv';
dotenv.config();
import mysql from 'mysql2/promise';
const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.query("SELECT forecastDate, laf2026Goal, bc2026Goal, maxLafCapacity, maxBcCapacity, lafConfirmed, bcConfirmed FROM daily_forecast ORDER BY forecastDate LIMIT 22");
console.log(JSON.stringify(rows, null, 2));
await conn.end();
