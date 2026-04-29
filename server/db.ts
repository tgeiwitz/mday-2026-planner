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

  for (const r of allRoutes) {
    const zs = zonesByRoute.get(r.id) ?? [];
    let fee = 0;
    let miles = 0;
    for (const z of zs) {
      const zm = zoneMap.get(z.zoneId);
      if (!zm) continue;
      const taskFee = r.merchant === "LAF" ? parseFloat(String(zm.lafFee2026)) : parseFloat(String(zm.bcFee2026));
      fee += taskFee * z.taskCount;
      miles += parseFloat(String(zm.distance2026)) * z.taskCount;
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
      })
      .where(eq(routes.id, r.id));
  }
}
