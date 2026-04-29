import { eq, and, asc, sql, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  dailyForecast,
  zoneMetrics,
  drivers,
  timeblocks,
  driverTimeblocks,
  routes,
  routeZones,
  globalSettings,
} from "../drizzle/schema";
// timeblocks already imported above for db helpers
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ---------- Daily Forecast ----------
export async function listDailyForecast() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(dailyForecast).orderBy(asc(dailyForecast.forecastDate));
}

export async function updateDailyForecast(
  id: number,
  data: Partial<typeof dailyForecast.$inferInsert>
) {
  const db = await getDb();
  if (!db) return;
  await db.update(dailyForecast).set(data).where(eq(dailyForecast.id, id));
}

// ---------- Zone Metrics ----------
export async function listZoneMetrics() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(zoneMetrics).orderBy(asc(zoneMetrics.zoneId));
}

export async function updateZoneMetric(
  id: number,
  data: Partial<typeof zoneMetrics.$inferInsert>
) {
  const db = await getDb();
  if (!db) return;
  await db.update(zoneMetrics).set(data).where(eq(zoneMetrics.id, id));
}

// ---------- Drivers ----------
export async function listDrivers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(drivers).orderBy(asc(drivers.id));
}

export async function createDriver(data: typeof drivers.$inferInsert) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(drivers).values(data);
  return result;
}

export async function updateDriver(id: number, data: Partial<typeof drivers.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(drivers).set(data).where(eq(drivers.id, id));
}

export async function deleteDriver(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(drivers).where(eq(drivers.id, id));
}

// ---------- Timeblocks ----------
export async function listTimeblocks() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(timeblocks)
    .orderBy(asc(timeblocks.blockDate), asc(timeblocks.wave));
}

export async function updateTimeblock(
  id: number,
  data: Partial<typeof timeblocks.$inferInsert>
) {
  const db = await getDb();
  if (!db) return;
  await db.update(timeblocks).set(data).where(eq(timeblocks.id, id));
}

// ---------- Driver Timeblocks ----------
export async function listDriverTimeblocks() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(driverTimeblocks);
}

export async function assignDriverTimeblock(data: typeof driverTimeblocks.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  await db.insert(driverTimeblocks).values(data);
}

export async function removeDriverTimeblock(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(driverTimeblocks).where(eq(driverTimeblocks.id, id));
}

export async function updateDriverTimeblockStatus(id: number, status: "Signed Up" | "Scheduled") {
  const db = await getDb();
  if (!db) return;
  await db
    .update(driverTimeblocks)
    .set({ assignmentStatus: status })
    .where(eq(driverTimeblocks.id, id));
}

// ---------- Routes ----------
export async function listRoutes() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(routes).orderBy(asc(routes.id));
}

export async function getRouteZones(routeId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(routeZones).where(eq(routeZones.routeId, routeId));
}

export async function listAllRouteZones() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(routeZones);
}

export async function updateRoute(id: number, data: Partial<typeof routes.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(routes).set(data).where(eq(routes.id, id));
  // Auto-recalc whenever any input that drives route economics changes.
  const triggerKeys = ["stops", "driverId", "status", "payFloorOverride", "payMaxOverride", "holidayPerStopSurcharge", "driverBonus"];
  if (triggerKeys.some((k) => k in data)) {
    await recalculateAllRoutes();
  }
}

export async function createRoute(data: typeof routes.$inferInsert) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(routes).values(data);
  return result;
}

export async function deleteRoute(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(routeZones).where(eq(routeZones.routeId, id));
  await db.delete(routes).where(eq(routes.id, id));
}

export async function setRouteZones(routeId: number, zones: { zoneId: number; taskCount: number }[]) {
  const db = await getDb();
  if (!db) return;
  await db.delete(routeZones).where(eq(routeZones.routeId, routeId));
  if (zones.length > 0) {
    await db.insert(routeZones).values(zones.map((z) => ({ routeId, ...z })));
  }
  // Auto-recalc so duration/mileage/fee reflect new zone assignments immediately.
  await recalculateAllRoutes();
}

// ---------- Global Settings ----------
export async function listGlobalSettings() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(globalSettings);
}

export async function updateGlobalSetting(key: string, value: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(globalSettings)
    .set({ settingValue: value })
    .where(eq(globalSettings.settingKey, key));
}

export async function getGlobalSettings() {
  const db = await getDb();
  const defaults = {
    driverPayPct: "0.75",
    mileagePayPerMile: "0.50",
    mileageThreshold: "30",
    platformFeePct: "0.10",
    holidaySurchargePerStop: "5.00",
    holidaySurchargeEnabled: false,
    targetDwellMinutes: "20",
  };
  if (!db) return defaults;
  const rows = await db.select().from(globalSettings);
  const out: Record<string, unknown> = { ...defaults };
  for (const r of rows) {
    if (r.settingKey === "holidaySurchargeEnabled") {
      out[r.settingKey] = r.settingValue === "true";
    } else {
      out[r.settingKey] = r.settingValue;
    }
  }
  return out as typeof defaults;
}

export async function updateGlobalSettings(
  data: Partial<{
    driverPayPct: string;
    mileagePayPerMile: string;
    mileageThreshold: string;
    platformFeePct: string;
    holidaySurchargePerStop: string;
    holidaySurchargeEnabled: boolean;
    targetDwellMinutes: string;
  }>
) {
  const db = await getDb();
  if (!db) return;
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    const strVal = typeof value === "boolean" ? String(value) : String(value);
    // Upsert
    await db
      .insert(globalSettings)
      .values({ settingKey: key, settingValue: strVal })
      .onDuplicateKeyUpdate({ set: { settingValue: strVal } });
  }
}

export async function recalculateAllRoutes() {
  const db = await getDb();
  if (!db) return;
  const settings = await getGlobalSettings();
  const driverPayPct = parseFloat(settings.driverPayPct);
  const mileagePayPerMile = parseFloat(settings.mileagePayPerMile);
  const mileageThreshold = parseFloat(settings.mileageThreshold);
  const platformFeePct = parseFloat(settings.platformFeePct);
  const holidayPerStop = parseFloat(settings.holidaySurchargePerStop);
  const holidayEnabled = settings.holidaySurchargeEnabled;

  const allRoutes = await db.select().from(routes);
  const allZones = await db.select().from(zoneMetrics);
  const zoneMap = new Map(allZones.map((z) => [z.id, z]));
  const allRouteZones = await db.select().from(routeZones);
  const zonesByRoute = new Map<number, typeof allRouteZones>();
  for (const rz of allRouteZones) {
    if (!zonesByRoute.has(rz.routeId)) zonesByRoute.set(rz.routeId, []);
    zonesByRoute.get(rz.routeId)!.push(rz);
  }

  const allTimeblocks = await db.select().from(timeblocks);
  const tbMap = new Map(allTimeblocks.map((t) => [t.id, t]));

  // Driver time-per-stop differentials (extra minutes per stop for New drivers etc)
  const allDrivers = await db.select().from(drivers);
  const driverMap = new Map(allDrivers.map((d) => [d.id, d]));

  // Wodely per-task fees by (merchant|YYYY-MM-DD)
  const wodelyFees = await getWodelyFeeMap();

  for (const r of allRoutes) {
    const zs = zonesByRoute.get(r.id) ?? [];
    let baselineFee = 0;
    let miles = 0;
    let travelMinutes = 0;
    let zoneStops = 0;
    for (const z of zs) {
      const zm = zoneMap.get(z.zoneId);
      if (!zm) continue;
      const taskFee = r.merchant === "LAF" ? parseFloat(String(zm.lafFee2026)) : parseFloat(String(zm.bcFee2026));
      baselineFee += taskFee * z.taskCount;
      miles += parseFloat(String(zm.distance2026)) * z.taskCount;
      travelMinutes += parseFloat(String(zm.travelTime2026)) * z.taskCount;
      zoneStops += z.taskCount;
    }

    // Duration: per-zone travel time + driver differential per stop.
    // If zones don't cover all stops, fall back to average zone travel time for the remainder.
    const driver = r.driverId ? driverMap.get(r.driverId) : null;
    const driverDiff = driver ? parseFloat(String(driver.timePerStopDiff ?? 0)) : 0;
    let estDurationMin = travelMinutes;
    if (zoneStops < r.stops) {
      const avgTravel = zoneStops > 0 ? travelMinutes / zoneStops : 8; // 8 min fallback if no zones assigned
      estDurationMin += avgTravel * (r.stops - zoneStops);
    }
    estDurationMin += driverDiff * r.stops;

    // Resolve confirmed fees from Wodely for this route's date + merchant
    const tbForDate = tbMap.get(r.timeblockId);
    let wodelyKey = "";
    if (tbForDate) {
      const d = tbForDate.blockDate instanceof Date
        ? `${tbForDate.blockDate.getUTCFullYear()}-${String(tbForDate.blockDate.getUTCMonth() + 1).padStart(2, "0")}-${String(tbForDate.blockDate.getUTCDate()).padStart(2, "0")}`
        : String(tbForDate.blockDate).slice(0, 10);
      wodelyKey = `${r.merchant}|${d}`;
    }
    const wodelyAgg = wodelyFees.get(wodelyKey);

    // Distribute Wodely fees proportional to this route's share of the day's task count
    // (Sum task count across all routes for this date/merchant.)
    let fee = baselineFee;
    let feeMode: "baseline" | "blended" | "locked" = "baseline";
    if (wodelyAgg && wodelyAgg.count > 0) {
      const dayRoutes = allRoutes.filter((rr) => {
        const tb = tbMap.get(rr.timeblockId);
        if (!tb) return false;
        const d = tb.blockDate instanceof Date
          ? `${tb.blockDate.getUTCFullYear()}-${String(tb.blockDate.getUTCMonth() + 1).padStart(2, "0")}-${String(tb.blockDate.getUTCDate()).padStart(2, "0")}`
          : String(tb.blockDate).slice(0, 10);
        return rr.merchant === r.merchant && `${rr.merchant}|${d}` === wodelyKey;
      });
      const totalDayStops = dayRoutes.reduce((s, x) => s + x.stops, 0);
      const routeSharePct = totalDayStops > 0 ? r.stops / totalDayStops : 0;
      const routeWodelyFee = wodelyAgg.totalFee * routeSharePct;
      const confirmedTaskCount = Math.round(wodelyAgg.count * routeSharePct);
      const isLocked = ["Routed", "Completed"].includes(r.status);
      if (isLocked) {
        fee = routeWodelyFee;
        feeMode = "locked";
      } else if (confirmedTaskCount >= r.stops) {
        fee = routeWodelyFee;
        feeMode = "locked";
      } else {
        // Blended: Wodely portion + baseline for remaining not-yet-confirmed stops
        const remainingStops = Math.max(r.stops - confirmedTaskCount, 0);
        const baselinePerStop = r.stops > 0 ? baselineFee / r.stops : 0;
        fee = routeWodelyFee + baselinePerStop * remainingStops;
        feeMode = "blended";
      }
    }
    if (holidayEnabled) fee += holidayPerStop * r.stops;
    let driverPay = fee * driverPayPct;
    // Apply floor/max: route-level override wins over timeblock default
    const tb = tbMap.get(r.timeblockId);
    const floor = r.payFloorOverride ? parseFloat(String(r.payFloorOverride)) : tb ? parseFloat(String(tb.minPayFloor)) : 0;
    const max = r.payMaxOverride ? parseFloat(String(r.payMaxOverride)) : tb ? parseFloat(String(tb.maxPayFloor)) : Infinity;
    if (floor > 0 && driverPay < floor) driverPay = floor;
    if (max > 0 && driverPay > max) driverPay = max;
    const mileagePay = miles > mileageThreshold ? (miles - mileageThreshold) * mileagePayPerMile : 0;
    const platformFee = fee * platformFeePct;
    await db
      .update(routes)
      .set({
        estRouteFee: fee.toFixed(2),
        estDriverPay: driverPay.toFixed(2),
        estMileagePay: mileagePay.toFixed(2),
        estPlatformFee: platformFee.toFixed(2),
        estMileage: miles.toFixed(2),
        estDuration: Math.round(estDurationMin),
        feeMode,
      })
      .where(eq(routes.id, r.id));
  }
}


// ======================
// Snapshots
// ======================
import { snapshotRuns, forecastSnapshots } from "../drizzle/schema";

export async function captureSnapshot(triggerType: "auto" | "manual", label?: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const forecast = await db.select().from(dailyForecast);
  const allRoutes = await db.select().from(routes);
  const allTimeblocks = await db.select().from(timeblocks);
  const tbMap = new Map(allTimeblocks.map((t) => [t.id, t]));

  let totalRoutes = 0;
  let totalRevenue = 0;
  let totalDriverPay = 0;
  let totalGoalLaf = 0;
  let totalGoalBc = 0;
  let totalConfirmedLaf = 0;
  let totalConfirmedBc = 0;

  for (const f of forecast) {
    totalGoalLaf += f.laf2026Goal;
    totalGoalBc += f.bc2026Goal;
    totalConfirmedLaf += f.lafConfirmed;
    totalConfirmedBc += f.bcConfirmed;
  }
  for (const r of allRoutes) {
    totalRoutes += 1;
    totalRevenue += Number(r.estRouteFee);
    totalDriverPay += Number(r.estDriverPay) + Number(r.estMileagePay) + Number(r.driverBonus);
  }

  const res = await db.insert(snapshotRuns).values({
    triggerType,
    label: label ?? null,
    totalRoutes,
    totalConfirmedLaf,
    totalConfirmedBc,
    totalGoalLaf,
    totalGoalBc,
    totalRevenue: totalRevenue.toFixed(2),
    totalDriverPay: totalDriverPay.toFixed(2),
  });
  const runId = (res as unknown as { insertId: number }[])[0]?.insertId
    ?? (res as unknown as { insertId: number }).insertId;

  // Per-date aggregation from routes via timeblock date
  const routesByDate = new Map<string, { planned: number; confirmed: number; revenue: number; driverPay: number }>();
  for (const r of allRoutes) {
    const tb = tbMap.get(r.timeblockId);
    if (!tb) continue;
    const d = tb.blockDate instanceof Date
      ? `${tb.blockDate.getUTCFullYear()}-${String(tb.blockDate.getUTCMonth() + 1).padStart(2, "0")}-${String(tb.blockDate.getUTCDate()).padStart(2, "0")}`
      : String(tb.blockDate).slice(0, 10);
    if (!routesByDate.has(d)) routesByDate.set(d, { planned: 0, confirmed: 0, revenue: 0, driverPay: 0 });
    const row = routesByDate.get(d)!;
    row.planned += 1;
    if (["Confirmed", "Processed", "Routed", "Completed"].includes(r.status)) row.confirmed += 1;
    row.revenue += Number(r.estRouteFee);
    row.driverPay += Number(r.estDriverPay) + Number(r.estMileagePay) + Number(r.driverBonus);
  }

  const snapRows: Array<typeof forecastSnapshots.$inferInsert> = [];
  for (const f of forecast) {
    const d = f.forecastDate instanceof Date
      ? `${f.forecastDate.getUTCFullYear()}-${String(f.forecastDate.getUTCMonth() + 1).padStart(2, "0")}-${String(f.forecastDate.getUTCDate()).padStart(2, "0")}`
      : String(f.forecastDate).slice(0, 10);
    const r = routesByDate.get(d) ?? { planned: 0, confirmed: 0, revenue: 0, driverPay: 0 };
    snapRows.push({
      snapshotRunId: runId,
      forecastDate: f.forecastDate,
      dayName: f.dayName,
      laf2026Goal: f.laf2026Goal,
      bc2026Goal: f.bc2026Goal,
      lafConfirmed: f.lafConfirmed,
      bcConfirmed: f.bcConfirmed,
      maxLafCapacity: f.maxLafCapacity,
      maxBcCapacity: f.maxBcCapacity,
      routesPlanned: r.planned,
      routesConfirmed: r.confirmed,
      revenue: r.revenue.toFixed(2),
      driverPay: r.driverPay.toFixed(2),
    });
  }
  if (snapRows.length > 0) await db.insert(forecastSnapshots).values(snapRows);
  return { id: runId, totalRoutes, totalRevenue, totalDriverPay, totalConfirmedLaf, totalConfirmedBc };
}

export async function listSnapshotRuns(limit = 30) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(snapshotRuns).orderBy(desc(snapshotRuns.createdAt)).limit(limit);
}

export async function getSnapshotRows(runId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(forecastSnapshots).where(eq(forecastSnapshots.snapshotRunId, runId));
}


// ======================
// Wodely task fee cache
// ======================
import { wodelyTaskCache } from "../drizzle/schema";

/**
 * Cache Wodely tasks in our DB so routes can use per-task fees.
 * Stores one row per wodelyTaskId (upserts on duplicate).
 */
export async function cacheWodelyTasks(
  tasks: Array<{
    id: number;
    merchantId: string;
    afterDateTime?: string;
    deliveryFee?: number;
  }>
) {
  const db = await getDb();
  if (!db || tasks.length === 0) return;
  const LAF = "09cc8b76-6b54-4995-b136-a5dea3f0656a";
  const rows: Array<typeof wodelyTaskCache.$inferInsert> = [];
  for (const t of tasks) {
    if (!t.afterDateTime) continue;
    const dt = new Date(t.afterDateTime);
    const localDate = dt.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
    rows.push({
      wodelyTaskId: String(t.id),
      merchant: t.merchantId === LAF ? "LAF" : "BC",
      deliveryDate: localDate as unknown as Date,
      taskFee: String((t.deliveryFee ?? 0).toFixed(2)),
    });
  }
  // Chunked upsert
  const chunk = 500;
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
    await db
      .insert(wodelyTaskCache)
      .values(slice)
      .onDuplicateKeyUpdate({
        set: {
          merchant: sql`VALUES(merchant)`,
          deliveryDate: sql`VALUES(deliveryDate)`,
          taskFee: sql`VALUES(taskFee)`,
          syncedAt: sql`CURRENT_TIMESTAMP`,
        },
      });
  }
}

/**
 * Returns an aggregated map of confirmed Wodely fees by (merchant|localDate):
 *   key = `${merchant}|YYYY-MM-DD`   -> { count, totalFee, avgFee }
 */
export async function getWodelyFeeMap() {
  const db = await getDb();
  const map = new Map<string, { count: number; totalFee: number; avgFee: number }>();
  if (!db) return map;
  const rows = await db.select().from(wodelyTaskCache);
  for (const r of rows) {
    const d = r.deliveryDate instanceof Date
      ? `${r.deliveryDate.getUTCFullYear()}-${String(r.deliveryDate.getUTCMonth() + 1).padStart(2, "0")}-${String(r.deliveryDate.getUTCDate()).padStart(2, "0")}`
      : String(r.deliveryDate).slice(0, 10);
    const key = `${r.merchant}|${d}`;
    const prev = map.get(key) ?? { count: 0, totalFee: 0, avgFee: 0 };
    prev.count += 1;
    prev.totalFee += Number(r.taskFee);
    map.set(key, prev);
  }
  Array.from(map.values()).forEach((v) => {
    v.avgFee = v.count > 0 ? v.totalFee / v.count : 0;
  });
  return map;
}
