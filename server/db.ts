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
  routeHistory,
  globalSettings,
  historicalDaily2025,
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

  // Load the existing record before mutating so we can handle lock/review transitions.
  const [existing] = await db.select().from(routes).where(eq(routes.id, id)).limit(1);
  const patch: Record<string, unknown> = { ...data };

  // Lifecycle hook: when a route transitions into "Routed", capture the current
  // estimate as the "planned" snapshot (what was sent to the driver) and lock it.
  if (existing && data.status === "Routed" && existing.status !== "Routed") {
    if (patch.plannedMileage === undefined) patch.plannedMileage = existing.estMileage;
    if (patch.plannedDuration === undefined) patch.plannedDuration = existing.estDuration;
    if (patch.plannedDriverPay === undefined) patch.plannedDriverPay = existing.estDriverPay;
    patch.plannedLockedAt = new Date();
    patch.needsReview = 0;
    patch.reviewReason = null;
    await db.insert(routeHistory).values({
      routeId: id,
      event: "lock",
      payload: JSON.stringify({
        plannedMileage: patch.plannedMileage,
        plannedDuration: patch.plannedDuration,
        plannedDriverPay: patch.plannedDriverPay,
      }),
    });
  }

  // Lifecycle hook: when a route transitions into "Completed", capture completion time.
  if (existing && data.status === "Completed" && existing.status !== "Completed") {
    if (patch.completedAt === undefined) patch.completedAt = new Date();
    await db.insert(routeHistory).values({
      routeId: id,
      event: "status_change",
      payload: JSON.stringify({ from: existing.status, to: "Completed" }),
    });
  } else if (existing && data.status && data.status !== existing.status) {
    await db.insert(routeHistory).values({
      routeId: id,
      event: "status_change",
      payload: JSON.stringify({ from: existing.status, to: data.status }),
    });
  }

  await db.update(routes).set(patch).where(eq(routes.id, id));

  // Auto-recalc whenever any input that drives route economics changes.
  const triggerKeys = ["stops", "driverId", "status", "payFloorOverride", "payMaxOverride", "holidayPerStopSurcharge", "driverBonus"];
  if (triggerKeys.some((k) => k in data)) {
    await recalculateAllRoutes({ triggeredBy: `updateRoute:${id}` });
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
  await recalculateAllRoutes({ triggeredBy: `setRouteZones:${routeId}` });
}

// Manual review-resolution helpers for routes that were locked (status=Routed)
// and then had downstream changes.
export async function listRouteHistory(routeId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(routeHistory)
    .where(eq(routeHistory.routeId, routeId))
    .orderBy(desc(routeHistory.at));
}

export async function reviewKeepPlanned(routeId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(routes)
    .set({ needsReview: 0, reviewReason: null })
    .where(eq(routes.id, routeId));
  await db.insert(routeHistory).values({
    routeId,
    event: "review_kept",
    payload: null,
  });
}

export async function reviewApplyEstimate(routeId: number) {
  const db = await getDb();
  if (!db) return;
  const [r] = await db.select().from(routes).where(eq(routes.id, routeId)).limit(1);
  if (!r) return;
  await db
    .update(routes)
    .set({
      plannedMileage: r.estMileage,
      plannedDuration: r.estDuration,
      plannedDriverPay: r.estDriverPay,
      plannedLockedAt: new Date(),
      needsReview: 0,
      reviewReason: null,
    })
    .where(eq(routes.id, routeId));
  await db.insert(routeHistory).values({
    routeId,
    event: "review_applied",
    payload: JSON.stringify({
      plannedMileage: r.estMileage,
      plannedDuration: r.estDuration,
      plannedDriverPay: r.estDriverPay,
    }),
  });
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
    travelTimeSource: "2026" as "2026" | "lastYear" | "sixtyDay",
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
    travelTimeSource: "2026" | "lastYear" | "sixtyDay";
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

export async function recalculateAllRoutes(opts: { triggeredBy?: string } = {}) {
  const db = await getDb();
  if (!db) return;
  const settings = await getGlobalSettings();
  const driverPayPct = parseFloat(settings.driverPayPct);
  const mileagePayPerMile = parseFloat(settings.mileagePayPerMile);
  const mileageThreshold = parseFloat(settings.mileageThreshold);
  const platformFeePct = parseFloat(settings.platformFeePct);
  const holidayPerStop = parseFloat(settings.holidaySurchargePerStop);
  const holidayEnabled = settings.holidaySurchargeEnabled;
  const travelSource = (settings as { travelTimeSource?: string }).travelTimeSource ?? "2026";
  const travelField: "travelTime2026" | "travelTimeLastYear" | "travelTime60Day" =
    travelSource === "lastYear" ? "travelTimeLastYear"
    : travelSource === "sixtyDay" ? "travelTime60Day"
    : "travelTime2026";

  const allRoutes = await db.select().from(routes);
  const allZones = await db.select().from(zoneMetrics);
  // route_zones.zoneId stores the business zone code (e.g. 602, 770), not the
  // zone_metrics PK. Key the lookup map by zoneId so recalc resolves.
  const zoneMap = new Map(allZones.map((z) => [z.zoneId, z]));
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
      travelMinutes += parseFloat(String(zm[travelField] ?? zm.travelTime2026)) * z.taskCount;
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

    // Estimate values always update (pre-Routed source of truth).
    const estUpdate: Record<string, unknown> = {
      estRouteFee: fee.toFixed(2),
      estDriverPay: driverPay.toFixed(2),
      estMileagePay: mileagePay.toFixed(2),
      estPlatformFee: platformFee.toFixed(2),
      estMileage: miles.toFixed(2),
      estDuration: Math.round(estDurationMin),
      feeMode,
    };

    // If the route is locked (status=Routed or Completed) and the newly-computed
    // estimate diverges from the planned snapshot, flag for review.
    const isLocked = !!r.plannedLockedAt;
    if (isLocked && r.status !== "Completed") {
      const plannedPay = r.plannedDriverPay ? parseFloat(String(r.plannedDriverPay)) : null;
      const plannedMiles = r.plannedMileage ? parseFloat(String(r.plannedMileage)) : null;
      const plannedDur = r.plannedDuration ?? null;
      const reasons: string[] = [];
      if (plannedPay !== null && Math.abs(plannedPay - driverPay) > 0.5) {
        reasons.push(`pay ${plannedPay.toFixed(2)} → ${driverPay.toFixed(2)}`);
      }
      if (plannedMiles !== null && Math.abs(plannedMiles - miles) > 0.5) {
        reasons.push(`mileage ${plannedMiles.toFixed(1)} → ${miles.toFixed(1)}`);
      }
      if (plannedDur !== null && Math.abs(plannedDur - estDurationMin) > 2) {
        reasons.push(`duration ${plannedDur}m → ${Math.round(estDurationMin)}m`);
      }
      if (reasons.length > 0 && r.needsReview !== 1) {
        estUpdate.needsReview = 1;
        estUpdate.reviewReason = reasons.join("; ");
        await db.insert(routeHistory).values({
          routeId: r.id,
          event: "review_flagged",
          payload: JSON.stringify({ reasons, triggeredBy: opts.triggeredBy ?? null }),
        });
      }
    }

    await db.update(routes).set(estUpdate).where(eq(routes.id, r.id));
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


// ---------- Daily Planning (Forecast vs 2025 Actual vs Confirmed vs Capacity) ----------

// M-Day anchors. 2025-05-11 and 2026-05-10 both fall on Sunday, so
// daysBeforeMday mapping is apples-to-apples for day-of-week too.
const MDAY_2026_UTC = Date.UTC(2026, 4, 10);
const MSEC_PER_DAY = 86_400_000;

function daysBeforeMday2026(iso: string): number {
  const d = Date.UTC(
    parseInt(iso.slice(0, 4), 10),
    parseInt(iso.slice(5, 7), 10) - 1,
    parseInt(iso.slice(8, 10), 10),
  );
  return Math.round((MDAY_2026_UTC - d) / MSEC_PER_DAY);
}

export async function listHistoricalDaily2025() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(historicalDaily2025);
}

// Computes a day-by-day planning view combining:
//   - 2026 goal (from dailyForecast)
//   - 2025 equivalent-day actual (matched on daysBeforeMday)
//   - Wodely confirmed (from dailyForecast.lafConfirmed / bcConfirmed)
//   - Routes planned + drivers assigned (counted from routes)
//   - Capacity from confirmed drivers × weighted avg stops/route
// Returns one row per date in the forecast window.
export async function getPlanningView() {
  const db = await getDb();
  if (!db) return [];

  const [forecastRows, historicalRows, routeRows, zoneRows, driverTbRows, tbRows, driverRows] = await Promise.all([
    db.select().from(dailyForecast).orderBy(asc(dailyForecast.forecastDate)),
    db.select().from(historicalDaily2025),
    db.select().from(routes),
    db.select().from(zoneMetrics),
    db.select().from(driverTimeblocks),
    db.select().from(timeblocks),
    db.select().from(drivers),
  ]);

  // Driver status lookup
  const driverStatusById = new Map<number, string>();
  for (const d of driverRows) driverStatusById.set(d.id, d.status);

  // Zone lookup (business zoneId -> metrics).
  const zoneById = new Map<number, typeof zoneRows[number]>();
  for (const z of zoneRows) zoneById.set(z.zoneId, z);

  // Weighted avg stops/route per merchant (from zone baselines).
  // For each zone, tasks-per-route = targetDuration / travelTime2026 (min).
  // Weight each zone by its 2025 task volume so mix reflects reality
  // (e.g. Chevy Chase is a much bigger share of LAF volume than downtown).
  const TARGET_LAF_MIN = 90; // Wave 1 window typical
  const TARGET_BC_MIN = 120;
  let lafNum = 0, lafWeight = 0, bcNum = 0, bcWeight = 0;
  let lafFallbackSum = 0, bcFallbackSum = 0, fallbackCount = 0;
  for (const z of zoneRows) {
    const travel = Number(z.travelTime2026) || 0;
    if (travel <= 0) continue;
    const stopsPerRouteLaf = TARGET_LAF_MIN / travel;
    const stopsPerRouteBc = TARGET_BC_MIN / travel;
    const wLaf = Number(z.lafVolume2025) || 0;
    const wBc = Number(z.bcVolume2025) || 0;
    lafNum += stopsPerRouteLaf * wLaf;
    lafWeight += wLaf;
    bcNum += stopsPerRouteBc * wBc;
    bcWeight += wBc;
    lafFallbackSum += stopsPerRouteLaf;
    bcFallbackSum += stopsPerRouteBc;
    fallbackCount++;
  }
  const avgLafStopsPerRoute = lafWeight > 0
    ? lafNum / lafWeight
    : (fallbackCount > 0 ? lafFallbackSum / fallbackCount : 10);
  const avgBcStopsPerRoute = bcWeight > 0
    ? bcNum / bcWeight
    : (fallbackCount > 0 ? bcFallbackSum / fallbackCount : 10);

  const tbById = new Map<number, typeof tbRows[number]>();
  for (const tb of tbRows) tbById.set(tb.id, tb);

  const toIso = (v: unknown): string => {
    if (v instanceof Date) {
      return `${v.getUTCFullYear()}-${String(v.getUTCMonth() + 1).padStart(2, "0")}-${String(v.getUTCDate()).padStart(2, "0")}`;
    }
    const s = String(v);
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  };

  // Group routes by forecast date.
  const routesByDate = new Map<string, typeof routeRows>();
  for (const r of routeRows) {
    const tb = tbById.get(r.timeblockId);
    if (!tb) continue;
    const key = toIso(tb.blockDate);
    if (!routesByDate.has(key)) routesByDate.set(key, []);
    routesByDate.get(key)!.push(r);
  }

  // Driver-confirmed counts per date.
  const confirmedDriversByDate = new Map<string, Set<number>>();
  for (const dt of driverTbRows) {
    if (dt.assignmentStatus !== "Scheduled" && dt.assignmentStatus !== "Signed Up") continue;
    const tb = tbById.get(dt.timeblockId);
    if (!tb) continue;
    const key = toIso(tb.blockDate);
    if (!confirmedDriversByDate.has(key)) confirmedDriversByDate.set(key, new Set());
    confirmedDriversByDate.get(key)!.add(dt.driverId);
  }

  // Historical lookup by daysBeforeMday.
  const histByOffset = new Map<number, typeof historicalRows[number]>();
  for (const h of historicalRows) histByOffset.set(h.daysBeforeMday, h);

  return forecastRows.map((f) => {
    const iso = toIso(f.forecastDate);
    const offset = daysBeforeMday2026(iso);
    const hist = histByOffset.get(offset);
    const dayRoutes = routesByDate.get(iso) ?? [];
    const lafRoutes = dayRoutes.filter((r) => r.merchant === "LAF").length;
    const bcRoutes = dayRoutes.filter((r) => r.merchant === "BC").length;
    const assignedRoutes = dayRoutes.filter((r) => r.driverId != null).length;
    // Route Capacity = sum of stops across all placeholder routes for the day.
    const lafRouteCapacity = dayRoutes.filter((r) => r.merchant === "LAF").reduce((s, r) => s + (r.stops || 0), 0);
    const bcRouteCapacity = dayRoutes.filter((r) => r.merchant === "BC").reduce((s, r) => s + (r.stops || 0), 0);
    // Confirmed Capacity = stops on routes whose assigned driver has status=Confirmed.
    const confirmedRoutes = dayRoutes.filter((r) => {
      if (r.driverId == null) return false;
      return driverStatusById.get(r.driverId) === "Confirmed";
    });
    const lafConfirmedCapacity = confirmedRoutes.filter((r) => r.merchant === "LAF").reduce((s, r) => s + (r.stops || 0), 0);
    const bcConfirmedCapacity = confirmedRoutes.filter((r) => r.merchant === "BC").reduce((s, r) => s + (r.stops || 0), 0);
    const lafGoal = Number(f.laf2026Goal) || 0;
    const bcEstimate = Number(f.bc2026Goal) || 0;
    const lafConfirmed = Number(f.lafConfirmed) || 0;
    const bcConfirmed = Number(f.bcConfirmed) || 0;
    const lafRoutesNeeded = Math.ceil(lafGoal / Math.max(avgLafStopsPerRoute, 1));
    const bcRoutesNeeded = Math.ceil(bcEstimate / Math.max(avgBcStopsPerRoute, 1));
    const driversNeeded = lafRoutesNeeded + bcRoutesNeeded;
    const driversConfirmed = confirmedDriversByDate.get(iso)?.size ?? 0;
    // Capacity: confirmed drivers allocated proportionally to goal mix, then
    // converted to tasks via weighted stops/route.
    const goalTotal = lafGoal + bcEstimate;
    const lafShare = goalTotal > 0 ? lafGoal / goalTotal : 0.5;
    const lafCapacityDrivers = driversConfirmed * lafShare;
    const bcCapacityDrivers = driversConfirmed * (1 - lafShare);
    const lafCapacity = Math.floor(lafCapacityDrivers * avgLafStopsPerRoute);
    const bcCapacity = Math.floor(bcCapacityDrivers * avgBcStopsPerRoute);
    return {
      forecastDate: iso,
      daysBeforeMday: offset,
      phase: f.phase,
      // 2026 goal
      lafGoal,
      bcEstimate,
      // 2025 equivalent-day actual
      lafHistorical: hist ? hist.lafTasks : 0,
      bcHistorical: hist ? hist.bcTasks : 0,
      historicalDate: hist ? hist.taskDate : null,
      // Confirmed (Wodely)
      lafConfirmed,
      bcConfirmed,
      // Capacity plan
      lafRoutesNeeded,
      bcRoutesNeeded,
      routesNeeded: lafRoutesNeeded + bcRoutesNeeded,
      driversNeeded,
      driversConfirmed,
      lafCapacity,
      bcCapacity,
      capacityTotal: lafCapacity + bcCapacity,
      // Route Capacity (placeholder routes — total seats available)
      lafRouteCapacity,
      bcRouteCapacity,
      totalRouteCapacity: lafRouteCapacity + bcRouteCapacity,
      // Confirmed Capacity (routes whose driver has status=Confirmed)
      lafConfirmedCapacity,
      bcConfirmedCapacity,
      totalConfirmedCapacity: lafConfirmedCapacity + bcConfirmedCapacity,
      // Two-gap math
      lafRoomToFill: lafRouteCapacity - lafConfirmed,
      bcRoomToFill: bcRouteCapacity - bcConfirmed,
      totalRoomToFill: (lafRouteCapacity + bcRouteCapacity) - (lafConfirmed + bcConfirmed),
      lafNeedDrivers: Math.max(0, lafConfirmed - lafConfirmedCapacity),
      bcNeedDrivers: Math.max(0, bcConfirmed - bcConfirmedCapacity),
      totalNeedDrivers: Math.max(0, (lafConfirmed + bcConfirmed) - (lafConfirmedCapacity + bcConfirmedCapacity)),
      // Existing operational counts
      lafRoutesPlanned: lafRoutes,
      bcRoutesPlanned: bcRoutes,
      routesPlanned: dayRoutes.length,
      routesAssigned: assignedRoutes,
      // Pacing
      lafGapToGoal: lafGoal > 0 ? lafConfirmed / lafGoal : 0,
      bcGapToGoal: bcEstimate > 0 ? bcConfirmed / bcEstimate : 0,
    };
  });
}


// Zone distribution: for a date range, per-zone and per-merchant task counts + avg fee + % of total.
// Sources: zone_task_history_2025 for 2025 dates; wodely_task_cache for 2026 dates (by completed order).
import { zoneTaskHistory2025 } from "../drizzle/schema";
import { sql as _sql } from "drizzle-orm";

export async function getZoneDistribution(startIso: string, endIso: string) {
  const db = await getDb();
  const emptyResult = { rows: [] as { zoneId: number; zoneName: string; lafCount: number; bcCount: number; lafPct: number; bcPct: number; lafAvgFee: number; bcAvgFee: number }[], totals: { laf: 0, bc: 0 } };
  if (!db) return emptyResult;
  const startYear = Number(startIso.slice(0, 4));
  const endYear = Number(endIso.slice(0, 4));
  const zones = await db.select().from(zoneMetrics);
  const zoneMap = new Map(zones.map((z) => [z.zoneId, z]));
  // Accumulate by zoneId
  const acc = new Map<number, { lafC: number; bcC: number; lafFeeSum: number; bcFeeSum: number; lafFeeN: number; bcFeeN: number }>();
  function bump(zoneId: number, merchant: "LAF" | "BC", count: number, feeAvg: number) {
    let a = acc.get(zoneId);
    if (!a) { a = { lafC: 0, bcC: 0, lafFeeSum: 0, bcFeeSum: 0, lafFeeN: 0, bcFeeN: 0 }; acc.set(zoneId, a); }
    if (merchant === "LAF") { a.lafC += count; if (feeAvg > 0) { a.lafFeeSum += feeAvg * count; a.lafFeeN += count; } }
    else { a.bcC += count; if (feeAvg > 0) { a.bcFeeSum += feeAvg * count; a.bcFeeN += count; } }
  }
  if (startYear <= 2025 && endYear >= 2025) {
    const s = startYear <= 2025 ? startIso : "2025-01-01";
    const e = endYear >= 2025 ? endIso : "2025-12-31";
    const rows = await db.select().from(zoneTaskHistory2025)
      .where(_sql`${zoneTaskHistory2025.taskDate} >= ${s} AND ${zoneTaskHistory2025.taskDate} <= ${e}`);
    for (const r of rows) bump(r.zoneId, r.merchant as "LAF" | "BC", r.taskCount, Number(r.avgFee));
  }
  if (endYear >= 2026) {
    const s = startYear >= 2026 ? startIso : "2026-01-01";
    const e = endIso;
    const rows = await db.select().from(wodelyTaskCache)
      .where(_sql`${wodelyTaskCache.deliveryDate} >= ${s} AND ${wodelyTaskCache.deliveryDate} <= ${e}`);
    const grouped = new Map<string, { c: number; feeSum: number }>();
    for (const r of rows) {
      if (!r.zoneId) continue;
      const key = `${r.zoneId}|${r.merchant}`;
      let g = grouped.get(key);
      if (!g) { g = { c: 0, feeSum: 0 }; grouped.set(key, g); }
      g.c += 1;
      g.feeSum += Number(r.taskFee || 0);
    }
    grouped.forEach((g, key) => {
      const [zoneId, merchant] = key.split("|");
      bump(Number(zoneId), merchant as "LAF" | "BC", g.c, g.c > 0 ? g.feeSum / g.c : 0);
    });
  }
  let lafTotal = 0, bcTotal = 0;
  acc.forEach((a) => { lafTotal += a.lafC; bcTotal += a.bcC; });
  const out: {
    zoneId: number; zoneName: string; lafCount: number; bcCount: number;
    lafPct: number; bcPct: number; lafAvgFee: number; bcAvgFee: number;
  }[] = [];
  acc.forEach((a, zoneId) => {
    const z = zoneMap.get(zoneId);
    out.push({
      zoneId,
      zoneName: z?.zoneName || `Zone ${zoneId}`,
      lafCount: a.lafC,
      bcCount: a.bcC,
      lafPct: lafTotal > 0 ? Math.round((a.lafC / lafTotal) * 1000) / 10 : 0,
      bcPct: bcTotal > 0 ? Math.round((a.bcC / bcTotal) * 1000) / 10 : 0,
      lafAvgFee: a.lafFeeN > 0 ? Math.round((a.lafFeeSum / a.lafFeeN) * 100) / 100 : 0,
      bcAvgFee: a.bcFeeN > 0 ? Math.round((a.bcFeeSum / a.bcFeeN) * 100) / 100 : 0,
    });
  });
  out.sort((a, b) => (b.lafCount + b.bcCount) - (a.lafCount + a.bcCount));
  return { rows: out, totals: { laf: lafTotal, bc: bcTotal } };
}
