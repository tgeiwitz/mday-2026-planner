import { eq, and, asc, sql, desc, gte, lte } from "drizzle-orm";
import { sql as _sql } from "drizzle-orm";
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
  zoneTaskHistory2025,
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
    .orderBy(asc(timeblocks.blockDate), asc(timeblocks.id));
}

export async function updateTimeblock(
  id: number,
  data: Partial<typeof timeblocks.$inferInsert>
) {
  const db = await getDb();
  if (!db) return;
  await db.update(timeblocks).set(data).where(eq(timeblocks.id, id));
}

export async function createTimeblock(
  data: Partial<typeof timeblocks.$inferInsert> & { blockDate: any; label: string }
) {
  const db = await getDb();
  if (!db) throw new Error("db unavailable");
  const { dayName, availabilityStart, availabilityEnd, ...rest } = data as any;
  const d = new Date(String(rest.blockDate));
  const computedDay = dayName || ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getUTCDay()];
  const [result] = await db.insert(timeblocks).values({
    dayName: computedDay,
    availabilityStart: availabilityStart ?? "06:00",
    availabilityEnd: availabilityEnd ?? "20:00",
    ...rest,
  } as any);
  return { id: (result as any).insertId as number };
}

export async function deleteTimeblock(id: number) {
  const db = await getDb();
  if (!db) return;
  // cascade: remove dependent rows first
  try { await db.execute(sql`DELETE FROM route_zones WHERE routeId IN (SELECT id FROM routes WHERE timeblockId = ${id})`); } catch {}
  try { await db.execute(sql`DELETE FROM routes WHERE timeblockId = ${id}`); } catch {}
  try { await db.execute(sql`DELETE FROM driver_timeblocks WHERE timeblockId = ${id}`); } catch {}
  await db.delete(timeblocks).where(eq(timeblocks.id, id));
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

  // If stops just became > 0 and no zone mix exists yet, auto-assign zones from
  // historical signal so the reforecast (fee, miles, duration, pay) populates
  // without anyone touching a zone editor.
  if ("stops" in data && Number((data as any).stops) > 0) {
    try { await autoAssignZonesIfMissing(id); }
    catch (e) { console.error("auto-zone-assign in updateRoute failed", e); }
  }

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

/**
 * Infer a zone mix for a route from historical signal so the planner can produce
 * a complete reforecast (fee, miles, duration, pay) without anyone manually
 * picking zones in the UI.
 *
 * Sources, in order of preference:
 *   1. LY same-DOW per-merchant zone distribution from zone_task_history_2025
 *      (M-Day weekend if the route is in M-Day week, else trailing 30d window).
 *   2. LY overall same-merchant distribution if same-DOW is too thin (<5 tasks).
 *   3. zone_metrics ordered by recent merchant volume; even allocation across
 *      the top 3 zones if no historical data at all.
 *
 * The output is normalized so total taskCount === route.stops.
 */
export async function inferZoneMixForRoute(
  routeId: number,
): Promise<{ zoneId: number; taskCount: number }[]> {
  const db = await getDb();
  if (!db) return [];
  const [r] = await db.select().from(routes).where(eq(routes.id, routeId)).limit(1);
  if (!r) return [];
  const stops = r.stops || 0;
  if (stops <= 0) return [];

  const merchant = r.merchant as "LAF" | "BC" | "SMC" | "SMR";
  const [tb] = await db.select().from(timeblocks).where(eq(timeblocks.id, r.timeblockId)).limit(1);
  const blockDate = tb?.blockDate instanceof Date
    ? tb.blockDate
    : tb ? new Date(String(tb.blockDate)) : new Date();
  const dow = blockDate.getUTCDay();

  // Collect candidate distributions from history. Use M-Day 2025 weekend (May 9-10)
  // when the route falls in M-Day week (Sun May 3 .. Sun May 10 2026); otherwise
  // use a wide same-DOW window across the whole 2025 dataset.
  const blockIso = blockDate.toISOString().slice(0, 10);
  const inMdayWeek = blockIso >= "2026-05-03" && blockIso <= "2026-05-10";

  // ---- Source 1: same-DOW historical ----
  let histRows: Array<{ zoneId: number; taskCount: number }> = [];
  if (inMdayWeek) {
    // M-Day weekend bucket: 2025-05-09 + 2025-05-10
    const rows = await db
      .select()
      .from(zoneTaskHistory2025)
      .where(
        _sql`${zoneTaskHistory2025.merchant} = ${merchant} AND ${zoneTaskHistory2025.taskDate} IN ('2025-05-09','2025-05-10')`,
      );
    histRows = rows.map((x) => ({ zoneId: x.zoneId, taskCount: Number(x.taskCount) || 0 }));
  } else {
    const rows = await db
      .select()
      .from(zoneTaskHistory2025)
      .where(_sql`${zoneTaskHistory2025.merchant} = ${merchant}`);
    // filter to same DOW
    histRows = rows
      .filter((row) => {
        const d = row.taskDate instanceof Date ? row.taskDate : new Date(String(row.taskDate));
        return d.getUTCDay() === dow;
      })
      .map((x) => ({ zoneId: x.zoneId, taskCount: Number(x.taskCount) || 0 }));
  }

  // Aggregate by zoneId
  const byZone = new Map<number, number>();
  for (const h of histRows) {
    byZone.set(h.zoneId, (byZone.get(h.zoneId) ?? 0) + h.taskCount);
  }
  let total = Array.from(byZone.values()).reduce((s, x) => s + x, 0);

  // ---- Source 2: overall merchant distribution (any DOW) ----
  if (total < 5) {
    byZone.clear();
    const rows = await db
      .select()
      .from(zoneTaskHistory2025)
      .where(_sql`${zoneTaskHistory2025.merchant} = ${merchant}`);
    for (const row of rows) {
      const tc = Number(row.taskCount) || 0;
      byZone.set(row.zoneId, (byZone.get(row.zoneId) ?? 0) + tc);
    }
    total = Array.from(byZone.values()).reduce((s, x) => s + x, 0);
  }

  // ---- Source 3: zone_metrics top-volume zones, even allocation ----
  if (total <= 0) {
    const zm = await db
      .select()
      .from(zoneMetrics)
      .orderBy(
        merchant === "LAF"
          ? _sql`laf_volume_2025 DESC`
          : _sql`bc_volume_2025 DESC`,
      )
      .limit(3);
    if (zm.length === 0) return [];
    const per = Math.max(1, Math.floor(stops / zm.length));
    const out = zm.map((z) => ({ zoneId: z.zoneId, taskCount: per }));
    // distribute remainder to first zone
    const sum = out.reduce((s, x) => s + x.taskCount, 0);
    if (sum < stops && out.length > 0) out[0].taskCount += stops - sum;
    return out;
  }

  // Largest-remainder method: scale proportionally so taskCounts sum to `stops`.
  type Entry = { zoneId: number; share: number; floor: number; remainder: number };
  const entries: Entry[] = Array.from(byZone.entries())
    .map(([zoneId, count]) => {
      const share = (count / total) * stops;
      return { zoneId, share, floor: Math.floor(share), remainder: share - Math.floor(share) };
    })
    .sort((a, b) => b.share - a.share);
  // Drop zones whose share is too small to round to even 1 unit *and* not in the top results
  let assigned = entries.reduce((s, e) => s + e.floor, 0);
  let remaining = stops - assigned;
  // Distribute remaining stops to entries with the largest fractional remainder
  const byRemainder = [...entries].sort((a, b) => b.remainder - a.remainder);
  for (const e of byRemainder) {
    if (remaining <= 0) break;
    e.floor += 1;
    remaining -= 1;
  }
  const result = entries
    .filter((e) => e.floor > 0)
    .map((e) => ({ zoneId: e.zoneId, taskCount: e.floor }));
  // Sanity: ensure sum === stops; if mismatch (shouldn't happen), push residual to top zone.
  const sum = result.reduce((s, x) => s + x.taskCount, 0);
  if (sum !== stops && result.length > 0) result[0].taskCount += stops - sum;
  return result;
}

/**
 * If a route has no zone assignments, infer one from history and persist it.
 * No-op when zones already exist or no inference is possible. Caller is
 * responsible for triggering recalc afterwards (typically the next
 * recalculateAllRoutes call covers it).
 */
export async function autoAssignZonesIfMissing(routeId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const existing = await db.select().from(routeZones).where(eq(routeZones.routeId, routeId));
  if (existing.length > 0) return false;
  const mix = await inferZoneMixForRoute(routeId);
  if (mix.length === 0) return false;
  await db.insert(routeZones).values(mix.map((z) => ({ routeId, ...z })));
  return true;
}

/**
 * Run autoAssignZonesIfMissing across every route that has zero zones. Returns
 * the count of routes patched. Triggers a single recalc at the end if any
 * patches were applied.
 */
export async function autoAssignZonesAcrossAllRoutes(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const allRoutes = await db.select().from(routes);
  const allZones = await db.select().from(routeZones);
  const haveZones = new Set(allZones.map((z) => z.routeId));
  let patched = 0;
  for (const r of allRoutes) {
    if (haveZones.has(r.id)) continue;
    const ok = await autoAssignZonesIfMissing(r.id);
    if (ok) patched += 1;
  }
  if (patched > 0) {
    await recalculateAllRoutes({ triggeredBy: "auto-zone-assign" });
  }
  return patched;
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
    // Forecasting defaults (route override > driver override > these).
    targetMaxCapacity: "30",
    targetDuration: "180",
    targetStops: "25",
    targetHourlyMin: "28.00",
    targetHourlyMax: "35.00",
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
    targetMaxCapacity: string;
    targetDuration: string;
    targetStops: string;
    targetHourlyMin: string;
    targetHourlyMax: string;
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

export type RecalcIntegrityReport = {
  routesWithStopsButNoZonesRepaired: number; // routes where zones were just inferred & persisted
  routesStillMissingZones: number;            // post-repair: should always be 0
  routesWithZeroFee: number;                  // post-recalc: routes whose fee evaluated to $0
  routesOnDurationFallback: number;            // routes whose duration used the 8-min/stop fallback (zones < stops)
  inferredRouteIds: number[];
};

export async function recalculateAllRoutes(opts: { triggeredBy?: string } = {}): Promise<RecalcIntegrityReport> {
  const db = await getDb();
  const empty: RecalcIntegrityReport = {
    routesWithStopsButNoZonesRepaired: 0,
    routesStillMissingZones: 0,
    routesWithZeroFee: 0,
    routesOnDurationFallback: 0,
    inferredRouteIds: [],
  };
  if (!db) return empty;
  const settings = await getGlobalSettings();
  const driverPayPct = parseFloat(settings.driverPayPct);
  const mileagePayPerMile = parseFloat(settings.mileagePayPerMile);
  const mileageThreshold = parseFloat(settings.mileageThreshold);
  const platformFeePct = parseFloat(settings.platformFeePct);
  // Holiday differential is PER-ROUTE only (routes.holidayPerStopSurcharge).
  // No global fallback by design — global value here is intentionally ignored.
  const globalTravelSource = (settings as { travelTimeSource?: string }).travelTimeSource ?? "2026";
  const globalTravelField: "travelTime2026" | "travelTimeLastYear" | "travelTime60Day" =
    globalTravelSource === "lastYear" ? "travelTimeLastYear"
    : globalTravelSource === "sixtyDay" ? "travelTime60Day"
    : "travelTime2026";
  // Per-zone override: if zm.travelTimeSource is not "global", it wins.
  const resolveZoneTravelField = (zoneSrc: string | null | undefined): "travelTime2026" | "travelTimeLastYear" | "travelTime60Day" => {
    switch (zoneSrc) {
      case "lastYear": return "travelTimeLastYear";
      case "sixtyDay": return "travelTime60Day";
      case "y2026":    return "travelTime2026";
      case "global":
      default:         return globalTravelField;
    }
  };

  // Forecasting global defaults (route override > driver override > global default).
  // We only consume `targetHourlyMin/Max` here; `targetMaxCapacity` /
  // `targetDuration` / `targetStops` are advisory in the UI and don't gate
  // recalc math directly today.
  const globalHourlyMin = settings.targetHourlyMin
    ? parseFloat(String(settings.targetHourlyMin)) : null;
  const globalHourlyMax = settings.targetHourlyMax
    ? parseFloat(String(settings.targetHourlyMax)) : null;

  const allRoutes = await db.select().from(routes);
  const allZones = await db.select().from(zoneMetrics);
  // route_zones.zoneId stores the business zone code (e.g. 602, 770), not the
  // zone_metrics PK. Key the lookup map by zoneId so recalc resolves.
  const zoneMap = new Map(allZones.map((z) => [z.zoneId, z]));
  let allRouteZones = await db.select().from(routeZones);
  let zonesByRoute = new Map<number, typeof allRouteZones>();
  for (const rz of allRouteZones) {
    if (!zonesByRoute.has(rz.routeId)) zonesByRoute.set(rz.routeId, []);
    zonesByRoute.get(rz.routeId)!.push(rz);
  }

  // ---- v44 PLANNING-CORRECTNESS GUARD ----
  // Any route with stops>0 and no zones must have a zone mix BEFORE we compute fee/miles.
  // Otherwise fee/miles/duration silently evaluate to zero. Auto-infer + persist now.
  const integrity: RecalcIntegrityReport = {
    routesWithStopsButNoZonesRepaired: 0,
    routesStillMissingZones: 0,
    routesWithZeroFee: 0,
    routesOnDurationFallback: 0,
    inferredRouteIds: [],
  };
  for (const r of allRoutes) {
    if ((r.stops ?? 0) > 0 && (zonesByRoute.get(r.id)?.length ?? 0) === 0) {
      try {
        const repaired = await autoAssignZonesIfMissing(r.id);
        if (repaired) {
          integrity.routesWithStopsButNoZonesRepaired += 1;
          integrity.inferredRouteIds.push(r.id);
        }
      } catch (e) {
        console.error(`[recalc] auto-zone-infer failed for route ${r.id}`, e);
      }
    }
  }
  // Re-read route_zones if we repaired anything, so the loop below sees the new mix.
  if (integrity.routesWithStopsButNoZonesRepaired > 0) {
    allRouteZones = await db.select().from(routeZones);
    zonesByRoute = new Map<number, typeof allRouteZones>();
    for (const rz of allRouteZones) {
      if (!zonesByRoute.has(rz.routeId)) zonesByRoute.set(rz.routeId, []);
      zonesByRoute.get(rz.routeId)!.push(rz);
    }
    if (opts.triggeredBy) {
      console.log(`[recalc:${opts.triggeredBy}] auto-inferred zone mixes for ${integrity.routesWithStopsButNoZonesRepaired} route(s)`);
    }
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
      const zField = resolveZoneTravelField((zm as { travelTimeSource?: string }).travelTimeSource);
      travelMinutes += parseFloat(String(zm[zField] ?? zm.travelTime2026)) * z.taskCount;
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
    // Holiday differential: PER-ROUTE only (routes.holidayPerStopSurcharge). No global fallback.
    // If a route should carry a holiday differential, it must be set explicitly on that route.
    const routeHolidayPerStop = r.holidayPerStopSurcharge ? parseFloat(String(r.holidayPerStopSurcharge)) : 0;
    if (routeHolidayPerStop > 0) {
      fee += routeHolidayPerStop * r.stops;
    }
    // Driver bonus: PER-ROUTE only (routes.driverBonus). Folded into estDriverPay below.
    // No global fallback by design.
    // ---- v31 PAY MODEL ----
    // 75% of fee is the driver's all-in cut. Split it into Mileage Reimbursement
    // (miles × IRS-style rate) and Route Base Pay (the time portion).
    // Then clamp Route Base Pay to the per-driver hourly target band × estDuration
    // (in hours). When the floor binds, the gross-up is logged as `wodelyAdjustment`
    // — the platform uploads it as a workforce task in Wodely so the driver's
    // payroll matches our intent without changing the merchant's invoice.
    const tb = tbMap.get(r.timeblockId);
    const effectivePct = driver && driver.payPctOverride
      ? parseFloat(String(driver.payPctOverride))
      : driverPayPct;
    // Vehicle multiplier on the driver-pay slice. Route override > driver default. sedan=0.80, van=1.10.
    const VEHICLE_MULT: Record<string, number> = { sedan: 0.80, van: 1.10 };
    const routeVehicle = (r as { vehicleType?: string | null }).vehicleType;
    const driverVehicle = driver ? (driver as { vehicleType?: string | null }).vehicleType : null;
    const effVehicle = routeVehicle ?? driverVehicle ?? "sedan";
    const vehicleMult = VEHICLE_MULT[effVehicle] ?? 1.0;
    const grossDriverShare = fee * effectivePct * vehicleMult;
    // Mileage rate: prefer the timeblock's mileageRate (per-mile), fall back to
    // global mileagePayPerMile. The global threshold is honored: only miles above
    // the threshold are reimbursed, matching prior behavior.
    const tbMileageRate = tb && tb.mileageRate ? parseFloat(String(tb.mileageRate)) : mileagePayPerMile;
    const mileagePay = miles > mileageThreshold ? (miles - mileageThreshold) * tbMileageRate : 0;
    const netPay = grossDriverShare - mileagePay; // time-portion of the 75%

    // Hourly band: per-driver hourlyTargetMin/Max × estDuration (in hours).
    // If hourly is unset, fall back to dollar overrides, then timeblock floor/max.
    const hours = estDurationMin / 60;
    // Hourly band precedence: route override > driver override > global default.
    const routeHourlyMin = (r as { hourlyTargetMin?: string | null }).hourlyTargetMin
      ? parseFloat(String((r as { hourlyTargetMin?: string | null }).hourlyTargetMin)) : null;
    const routeHourlyMax = (r as { hourlyTargetMax?: string | null }).hourlyTargetMax
      ? parseFloat(String((r as { hourlyTargetMax?: string | null }).hourlyTargetMax)) : null;
    const driverHourlyMin = driver && driver.hourlyTargetMin
      ? parseFloat(String(driver.hourlyTargetMin)) : null;
    const driverHourlyMax = driver && driver.hourlyTargetMax
      ? parseFloat(String(driver.hourlyTargetMax)) : null;
    const effHourlyMin = routeHourlyMin ?? driverHourlyMin ?? globalHourlyMin;
    const effHourlyMax = routeHourlyMax ?? driverHourlyMax ?? globalHourlyMax;
    const hourlyFloor = effHourlyMin !== null ? effHourlyMin * hours : null;
    const hourlyCeil = effHourlyMax !== null ? effHourlyMax * hours : null;
    const dollarFloor = r.payFloorOverride
      ? parseFloat(String(r.payFloorOverride))
      : driver && driver.payFloorOverride
        ? parseFloat(String(driver.payFloorOverride))
        : tb ? parseFloat(String(tb.minPayFloor)) : 0;
    const dollarCeil = r.payMaxOverride
      ? parseFloat(String(r.payMaxOverride))
      : driver && driver.payMaxOverride
        ? parseFloat(String(driver.payMaxOverride))
        : tb ? parseFloat(String(tb.maxPayFloor)) : Infinity;
    const effectiveFloor = hourlyFloor !== null ? hourlyFloor : dollarFloor;
    const effectiveCeil = hourlyCeil !== null ? hourlyCeil : dollarCeil;

    // Apply floor / ceil to netPay.
    let routeBasePay = netPay;
    let wodelyAdjustment = 0;
    if (effectiveFloor > 0 && routeBasePay < effectiveFloor) {
      wodelyAdjustment = effectiveFloor - routeBasePay; // grossUp uploaded as workforce task
      routeBasePay = effectiveFloor;
    }
    if (effectiveCeil > 0 && routeBasePay > effectiveCeil) {
      // Surplus stays in the platform 25%; cap routeBasePay.
      routeBasePay = effectiveCeil;
    }
    // Bonus is additive on top of Route Base Pay (already past floor/ceil).
    const routeBonus = r.driverBonus ? parseFloat(String(r.driverBonus)) : 0;
    if (routeBonus > 0) routeBasePay += routeBonus;

    // Total comp the driver actually receives across Route Base + Mileage line items.
    const totalDriverPay = routeBasePay + mileagePay;
    // Back-compat field kept in lock-step with the new total so existing reports
    // keep working until they're migrated to estTotalDriverPay / estRouteBasePay.
    const driverPay = totalDriverPay;

    const platformFee = fee * platformFeePct;

    // Estimate values always update (pre-Routed source of truth).
    const estUpdate: Record<string, unknown> = {
      estRouteFee: fee.toFixed(2),
      estDriverPay: driverPay.toFixed(2),
      estRouteBasePay: routeBasePay.toFixed(2),
      estTotalDriverPay: totalDriverPay.toFixed(2),
      wodelyAdjustment: wodelyAdjustment.toFixed(2),
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

    // Integrity tally (post-recalc): which routes are still in degraded states?
    if ((r.stops ?? 0) > 0 && (zonesByRoute.get(r.id)?.length ?? 0) === 0) {
      integrity.routesStillMissingZones += 1;
    }
    if (fee <= 0) integrity.routesWithZeroFee += 1;
    if (zoneStops < (r.stops ?? 0)) integrity.routesOnDurationFallback += 1;
  }
  return integrity;
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
    // estDriverPay already includes per-route driverBonus after recalculateAllRoutes; add mileage pay only here.
    totalDriverPay += Number(r.estDriverPay) + Number(r.estMileagePay);
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
    // estDriverPay already includes per-route driverBonus.
    row.driverPay += Number(r.estDriverPay) + Number(r.estMileagePay);
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
  }>,
  /** Optional sync window: if provided, the cache rows whose deliveryDate falls
   * inside [windowStartIso, windowEndIso] (NY-local YYYY-MM-DD) are deleted
   * before the new tasks are inserted. This makes the cache a true mirror of
   * what Wodely currently returns and removes stale tasks (cancelled/deleted
   * upstream). When called without a window, behaves as a pure upsert. */
  windowStartIso?: string,
  windowEndIso?: string,
) {
  const db = await getDb();
  if (!db) return;
  const LAF = "09cc8b76-6b54-4995-b136-a5dea3f0656a";

  // Step 1: if a window was provided, clear stale rows in that window so
  // tasks Wodely no longer returns are removed from our cache.
  if (windowStartIso && windowEndIso) {
    const startDate = windowStartIso.slice(0, 10);
    const endDate = windowEndIso.slice(0, 10);
    await db.execute(
      sql.raw(
        `DELETE FROM wodely_task_cache WHERE DATE(deliveryDate) >= '${startDate}' AND DATE(deliveryDate) <= '${endDate}'`
      )
    );
  }

  if (tasks.length === 0) return;

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
  if (rows.length === 0) return;
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
  const rows = await db.select({
    deliveryDate: wodelyTaskCache.deliveryDate,
    merchant: wodelyTaskCache.merchant,
    taskFee: wodelyTaskCache.taskFee,
  }).from(wodelyTaskCache);
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
// (zoneTaskHistory2025 + _sql imported at top of file)

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
    // Select only the columns we use, to avoid schema-drift on optional Wodely
    // routing fields (routePlanId/routeSortId/routeName/driverName/taskStatusId)
    // that may not yet exist in the deployed MySQL even though they're declared
    // in the Drizzle schema.
    const rows = await db.select({
      zoneId: wodelyTaskCache.zoneId,
      merchant: wodelyTaskCache.merchant,
      taskFee: wodelyTaskCache.taskFee,
    }).from(wodelyTaskCache)
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


// ---------- Merchant Share ----------
import {
  merchantShareTokens,
  merchantDayNotes,
} from "../drizzle/schema";
import { randomBytes } from "node:crypto";

export type MerchantCode = "LAF" | "BC" | "SMC" | "SMR";

export async function listShareTokens() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(merchantShareTokens)
    .orderBy(asc(merchantShareTokens.createdAt));
}

export async function createShareToken(merchant: MerchantCode, label?: string) {
  const db = await getDb();
  if (!db) throw new Error("db unavailable");
  const token = randomBytes(24).toString("base64url");
  await db.insert(merchantShareTokens).values({
    token,
    merchant,
    label: label || null,
  });
  return token;
}

export async function revokeShareToken(id: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(merchantShareTokens)
    .set({ revokedAt: new Date() })
    .where(eq(merchantShareTokens.id, id));
}

export async function getShareTokenRow(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(merchantShareTokens)
    .where(eq(merchantShareTokens.token, token))
    .limit(1);
  return rows[0];
}

export async function touchShareToken(id: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(merchantShareTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(merchantShareTokens.id, id));
}

export async function getMerchantDayNote(merchant: MerchantCode, isoDate: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(merchantDayNotes)
    .where(
      and(
        eq(merchantDayNotes.merchant, merchant),
        eq(merchantDayNotes.noteDate, new Date(isoDate + "T00:00:00Z")),
      ),
    )
    .limit(1);
  return rows[0];
}

export async function upsertMerchantDayNote(
  merchant: MerchantCode,
  isoDate: string,
  note: string | null,
  updatedBy: string | null,
) {
  const db = await getDb();
  if (!db) return;
  // Use insert ... on duplicate key update (unique: merchant+noteDate)
  await db
    .insert(merchantDayNotes)
    .values({
      merchant,
      noteDate: new Date(isoDate + "T00:00:00Z"),
      note: note ?? null,
      updatedBy: updatedBy ?? null,
    } as any)
    .onDuplicateKeyUpdate({
      set: { note: note ?? null, updatedBy: updatedBy ?? null },
    });
}

/** Returns { date, laf, bc, smc, smr } keyed by ISO date. */
export async function listForecastByDateRange(startIso: string, endIso: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(dailyForecast)
    .where(
      and(
        gte(dailyForecast.forecastDate, new Date(startIso + "T00:00:00Z")),
        lte(dailyForecast.forecastDate, new Date(endIso + "T00:00:00Z")),
      ),
    )
    .orderBy(asc(dailyForecast.forecastDate));
}


// ---------- Merchant Share Calculator ----------
// Returns per-day reference stats for a Mon-Sat week:
// - trailing30Avg: avg same-DOW count across the last 30 days before today
// - trailing60Avg: avg same-DOW count across the last 60 days before today
// - lyMDaySameDow: count from M-Day 2025 week (May 5-10, 2025) for matching DOW
//
// Sources: zoneTaskHistory2025 for dates <= 2025-12-31; wodelyTaskCache for 2026 dates.
// Aggregates to per-merchant daily totals (sums across zones).
export type ShareStats = {
  date: string;
  dow: number;
  trailing30Avg: number;
  trailing60Avg: number;
  lyMDaySameDow: number;
};

function isoToUTCDate(iso: string): Date {
  return new Date(iso + "T00:00:00Z");
}
function utcDateToIso(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export async function getMerchantShareStats(
  merchant: "LAF" | "BC",
  weekStartIso: string,
  weekEndIso: string,
): Promise<ShareStats[]> {
  const db = await getDb();
  if (!db) return [];

  // Today (UTC) — the trailing window ends "yesterday" so today is excluded.
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const todayUtc = isoToUTCDate(todayIso);

  // 60-day trailing window: [today - 60, today - 1]
  const win60Start = new Date(todayUtc);
  win60Start.setUTCDate(win60Start.getUTCDate() - 60);
  const win60End = new Date(todayUtc);
  win60End.setUTCDate(win60End.getUTCDate() - 1);
  const win60StartIso = utcDateToIso(win60Start);
  const win60EndIso = utcDateToIso(win60End);

  // Pull historical (2025) rows in window
  const histRows = await db
    .select()
    .from(zoneTaskHistory2025)
    .where(
      _sql`${zoneTaskHistory2025.taskDate} >= ${win60StartIso} AND ${zoneTaskHistory2025.taskDate} <= ${win60EndIso} AND ${zoneTaskHistory2025.merchant} = ${merchant}`,
    );
  // Pull 2026 rows in window
  const wodelyRows = await db
    .select()
    .from(wodelyTaskCache)
    .where(
      _sql`${wodelyTaskCache.deliveryDate} >= ${win60StartIso} AND ${wodelyTaskCache.deliveryDate} <= ${win60EndIso} AND ${wodelyTaskCache.merchant} = ${merchant}`,
    );

  // Build daily totals map: iso -> count
  const dailyTotals = new Map<string, number>();
  for (const r of histRows) {
    const iso = (r.taskDate instanceof Date)
      ? utcDateToIso(r.taskDate)
      : String(r.taskDate).slice(0, 10);
    dailyTotals.set(iso, (dailyTotals.get(iso) || 0) + (r.taskCount || 0));
  }
  for (const r of wodelyRows) {
    const iso = (r.deliveryDate instanceof Date)
      ? utcDateToIso(r.deliveryDate)
      : String(r.deliveryDate).slice(0, 10);
    dailyTotals.set(iso, (dailyTotals.get(iso) || 0) + 1); // each wodely row = 1 task
  }

  // For LY M-Day reference: M-Day 2025 was Sunday May 11, 2025.
  // Use the week May 5 (Mon) - May 10 (Sat) 2025 as the reference week.
  const lyWeekStart = "2025-05-05";
  const lyWeekEnd = "2025-05-10";
  const lyRows = await db
    .select()
    .from(zoneTaskHistory2025)
    .where(
      _sql`${zoneTaskHistory2025.taskDate} >= ${lyWeekStart} AND ${zoneTaskHistory2025.taskDate} <= ${lyWeekEnd} AND ${zoneTaskHistory2025.merchant} = ${merchant}`,
    );
  const lyByDow = new Map<number, number>(); // dow (1=Mon..6=Sat) -> count
  for (const r of lyRows) {
    const d = (r.taskDate instanceof Date) ? r.taskDate : isoToUTCDate(String(r.taskDate).slice(0, 10));
    const dow = d.getUTCDay(); // 0 Sun .. 6 Sat
    lyByDow.set(dow, (lyByDow.get(dow) || 0) + (r.taskCount || 0));
  }

  // Iterate Mon-Sat for the requested week
  const result: ShareStats[] = [];
  const monday = isoToUTCDate(weekStartIso);
  for (let i = 0; i < 6; i++) {
    const cur = new Date(monday);
    cur.setUTCDate(cur.getUTCDate() + i);
    const dayDow = cur.getUTCDay(); // for Mon..Sat -> 1..6

    // Trailing 30/60 same-DOW averages: scan the trailing window for matching DOW dates
    let count30 = 0, n30 = 0;
    let count60 = 0, n60 = 0;
    const cursor = new Date(win60Start);
    while (cursor <= win60End) {
      if (cursor.getUTCDay() === dayDow) {
        const iso = utcDateToIso(cursor);
        const v = dailyTotals.get(iso) || 0;
        count60 += v;
        n60 += 1;
        // 30-day window: last 30 days before today
        const daysFromToday = Math.round((todayUtc.getTime() - cursor.getTime()) / 86400000);
        if (daysFromToday >= 1 && daysFromToday <= 30) {
          count30 += v;
          n30 += 1;
        }
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    result.push({
      date: utcDateToIso(cur),
      dow: dayDow,
      trailing30Avg: n30 > 0 ? Math.round(count30 / n30) : 0,
      trailing60Avg: n60 > 0 ? Math.round(count60 / n60) : 0,
      lyMDaySameDow: lyByDow.get(dayDow) || 0,
    });
  }

  return result;
}

// Confirm a week of forecasts: copy lafReforecast (or bcReforecast) into laf2026Goal (or bc2026Goal)
// for every existing daily_forecast row in the Mon-Sat range.
export async function confirmShareWeek(
  merchant: "LAF" | "BC",
  weekStartIso: string,
  weekEndIso: string,
) {
  const db = await getDb();
  if (!db) return { updated: 0 };
  const rows = await listForecastByDateRange(weekStartIso, weekEndIso);
  let updated = 0;
  for (const row of rows) {
    const patch: any = {};
    if (merchant === "LAF") {
      const target = row.lafReforecast ?? row.laf2026Goal ?? 0;
      patch.laf2026Goal = target;
    } else {
      const target = row.bcReforecast ?? row.bc2026Goal ?? 0;
      patch.bc2026Goal = target;
    }
    await db.update(dailyForecast).set(patch).where(eq(dailyForecast.id, row.id));
    updated += 1;
  }
  return { updated };
}

// ---------- Driver Sign-Up (one-way, Week 1 only) ----------
// Week 1 is defined as the M-Day week itself: Sun May 3 - Sat May 9, 2026 (and the Mon-Fri lead-in).
// Configurable below; sign-ups outside the window are rejected.
export const DRIVER_SIGNUP_WEEK_START = "2026-04-27"; // Mon
export const DRIVER_SIGNUP_WEEK_END = "2026-05-09"; // Sat (covers week 1 + immediate lead-in)

export async function listSignupTimeblocks() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(timeblocks)
    .where(
      _sql`${timeblocks.blockDate} >= ${DRIVER_SIGNUP_WEEK_START} AND ${timeblocks.blockDate} <= ${DRIVER_SIGNUP_WEEK_END}`,
    )
    .orderBy(asc(timeblocks.blockDate), asc(timeblocks.id));
}

export async function listExistingSignups(driverId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(driverTimeblocks)
    .where(eq(driverTimeblocks.driverId, driverId));
}

export async function createDriverSignup(input: {
  driverId: number;
  timeblockId: number;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("db unavailable");
  // Validate timeblock is within the sign-up window
  const tbRows = await db
    .select()
    .from(timeblocks)
    .where(eq(timeblocks.id, input.timeblockId))
    .limit(1);
  if (tbRows.length === 0) throw new Error("Timeblock not found");
  const tbIso = (tbRows[0].blockDate instanceof Date)
    ? utcDateToIso(tbRows[0].blockDate as any)
    : String(tbRows[0].blockDate).slice(0, 10);
  if (tbIso < DRIVER_SIGNUP_WEEK_START || tbIso > DRIVER_SIGNUP_WEEK_END) {
    throw new Error("Sign-ups are only open for the M-Day week");
  }
  // Prevent duplicate sign-up
  const existing = await db
    .select()
    .from(driverTimeblocks)
    .where(
      and(
        eq(driverTimeblocks.driverId, input.driverId),
        eq(driverTimeblocks.timeblockId, input.timeblockId),
      ),
    )
    .limit(1);
  if (existing.length > 0) {
    throw new Error("You're already signed up for this block");
  }
  await db.insert(driverTimeblocks).values({
    driverId: input.driverId,
    timeblockId: input.timeblockId,
    assignmentStatus: "Signed Up",
    notes: input.notes ?? null,
  } as any);
  return { success: true };
}


// ---------- Wodely Sync Metadata ----------
const WODELY_LAST_SYNC_KEY = "wodelyLastSyncedAt";
const WODELY_LAST_SYNC_SUMMARY_KEY = "wodelyLastSyncSummary";

export async function setWodelyLastSync(summary: {
  syncedDates: number;
  totalTasks: number;
}) {
  const db = await getDb();
  if (!db) return;
  const ts = new Date().toISOString();
  for (const [key, value] of [
    [WODELY_LAST_SYNC_KEY, ts],
    [WODELY_LAST_SYNC_SUMMARY_KEY, JSON.stringify(summary)],
  ] as const) {
    await db
      .insert(globalSettings)
      .values({ settingKey: key, settingValue: value })
      .onDuplicateKeyUpdate({ set: { settingValue: value } });
  }
  return ts;
}

export async function getWodelyLastSync(): Promise<{
  lastSyncedAt: string | null;
  syncedDates: number;
  totalTasks: number;
}> {
  const db = await getDb();
  if (!db) return { lastSyncedAt: null, syncedDates: 0, totalTasks: 0 };
  const rows = await db
    .select()
    .from(globalSettings)
    .where(_sql`${globalSettings.settingKey} IN (${WODELY_LAST_SYNC_KEY}, ${WODELY_LAST_SYNC_SUMMARY_KEY})`);
  let lastSyncedAt: string | null = null;
  let syncedDates = 0;
  let totalTasks = 0;
  for (const r of rows) {
    if (r.settingKey === WODELY_LAST_SYNC_KEY) lastSyncedAt = r.settingValue;
    if (r.settingKey === WODELY_LAST_SYNC_SUMMARY_KEY) {
      try {
        const parsed = JSON.parse(r.settingValue);
        syncedDates = Number(parsed.syncedDates) || 0;
        totalTasks = Number(parsed.totalTasks) || 0;
      } catch {
        // ignore
      }
    }
  }
  return { lastSyncedAt, syncedDates, totalTasks };
}


// ---------- Profitability Rollup ----------
export type ProfitabilityDay = {
  date: string; // ISO yyyy-mm-dd
  dayName: string;
  weekStart: string; // ISO Monday for that date
  routes: number;
  stops: number;
  revenue: number; // estRouteFee total (already includes per-route holiday)
  holidayDiff: number; // holiday $ × stops, summed
  driverPay: number; // estDriverPay total (already includes per-route bonus)
  bonus: number; // sum of driverBonus
  mileagePay: number; // estMileagePay total
  platformFee: number; // estPlatformFee total
  margin: number; // revenue − driverPay − mileagePay − platformFee
};

export type ProfitabilityWeek = {
  weekStart: string;
  weekEnd: string;
  days: ProfitabilityDay[];
  totals: Omit<ProfitabilityDay, "date" | "dayName" | "weekStart">;
};

function isoUTC(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function mondayOf(iso: string): string {
  // Treat as UTC-noon to dodge DST drift, then walk back to Monday.
  const d = new Date(iso + "T12:00:00Z");
  const dow = d.getUTCDay(); // 0=Sun..6=Sat
  const offset = dow === 0 ? -6 : 1 - dow;
  d.setUTCDate(d.getUTCDate() + offset);
  return isoUTC(d);
}

function addDaysIso(iso: string, n: number): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return isoUTC(d);
}

function dayNameOf(iso: string): string {
  const d = new Date(iso + "T12:00:00Z");
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getUTCDay()];
}

export async function getProfitabilityRollup(): Promise<{
  days: ProfitabilityDay[];
  weeks: ProfitabilityWeek[];
  totals: Omit<ProfitabilityDay, "date" | "dayName" | "weekStart">;
}> {
  const allRoutes = await listRoutes();
  const tbs = await listTimeblocks();
  const tbDate = new Map<number, string>();
  for (const tb of tbs) {
    const d = tb.blockDate;
    const iso = d instanceof Date ? isoUTC(d) : String(d).slice(0, 10);
    tbDate.set(tb.id, iso);
  }

  const byDay = new Map<string, ProfitabilityDay>();
  for (const r of allRoutes) {
    const iso = tbDate.get(r.timeblockId);
    if (!iso) continue;
    if (!byDay.has(iso)) {
      byDay.set(iso, {
        date: iso,
        dayName: dayNameOf(iso),
        weekStart: mondayOf(iso),
        routes: 0,
        stops: 0,
        revenue: 0,
        holidayDiff: 0,
        driverPay: 0,
        bonus: 0,
        mileagePay: 0,
        platformFee: 0,
        margin: 0,
      });
    }
    const row = byDay.get(iso)!;
    const fee = Number(r.estRouteFee);
    const driverPay = Number(r.estDriverPay);
    const mileagePay = Number(r.estMileagePay);
    const platform = Number(r.estPlatformFee);
    const bonus = Number(r.driverBonus) || 0;
    const holiday = (Number(r.holidayPerStopSurcharge) || 0) * r.stops;
    row.routes += 1;
    row.stops += r.stops;
    row.revenue += fee;
    row.holidayDiff += holiday;
    row.driverPay += driverPay;
    row.bonus += bonus;
    row.mileagePay += mileagePay;
    row.platformFee += platform;
    row.margin += fee - driverPay - mileagePay - platform;
  }

  const days = Array.from(byDay.values()).sort((a, b) => (a.date < b.date ? -1 : 1));

  // Group into weeks (Mon..Sun)
  const weekMap = new Map<string, ProfitabilityWeek>();
  for (const d of days) {
    if (!weekMap.has(d.weekStart)) {
      weekMap.set(d.weekStart, {
        weekStart: d.weekStart,
        weekEnd: addDaysIso(d.weekStart, 6),
        days: [],
        totals: {
          routes: 0,
          stops: 0,
          revenue: 0,
          holidayDiff: 0,
          driverPay: 0,
          bonus: 0,
          mileagePay: 0,
          platformFee: 0,
          margin: 0,
        },
      });
    }
    const w = weekMap.get(d.weekStart)!;
    w.days.push(d);
    w.totals.routes += d.routes;
    w.totals.stops += d.stops;
    w.totals.revenue += d.revenue;
    w.totals.holidayDiff += d.holidayDiff;
    w.totals.driverPay += d.driverPay;
    w.totals.bonus += d.bonus;
    w.totals.mileagePay += d.mileagePay;
    w.totals.platformFee += d.platformFee;
    w.totals.margin += d.margin;
  }
  const weeks = Array.from(weekMap.values()).sort((a, b) =>
    a.weekStart < b.weekStart ? -1 : 1
  );

  const totals = days.reduce(
    (acc, d) => {
      acc.routes += d.routes;
      acc.stops += d.stops;
      acc.revenue += d.revenue;
      acc.holidayDiff += d.holidayDiff;
      acc.driverPay += d.driverPay;
      acc.bonus += d.bonus;
      acc.mileagePay += d.mileagePay;
      acc.platformFee += d.platformFee;
      acc.margin += d.margin;
      return acc;
    },
    {
      routes: 0,
      stops: 0,
      revenue: 0,
      holidayDiff: 0,
      driverPay: 0,
      bonus: 0,
      mileagePay: 0,
      platformFee: 0,
      margin: 0,
    }
  );

  return { days, weeks, totals };
}


// ======================
// Wodely Adjustments (gross-ups uploaded as workforce tasks)
// ======================
// Returns every route with a positive `wodelyAdjustment`, with enough context
// (date / route code / merchant / driver name) to upload as a workforce task.
// Includes the `total` (sum) so the UI can render a one-shot rollup.
export async function listWodelyAdjustments() {
  const db = await getDb();
  if (!db) return { rows: [], total: 0 };
  const allRoutes = await db.select().from(routes);
  const allTimeblocks = await db.select().from(timeblocks);
  const allDrivers = await db.select().from(drivers);
  const tbMap = new Map(allTimeblocks.map((t) => [t.id, t]));
  const drvMap = new Map(allDrivers.map((d) => [d.id, d]));
  const rows = allRoutes
    .filter((r) => Number(r.wodelyAdjustment ?? 0) > 0)
    .map((r) => {
      const tb = tbMap.get(r.timeblockId);
      const drv = r.driverId ? drvMap.get(r.driverId) : null;
      const dateIso = tb && tb.blockDate
        ? (tb.blockDate instanceof Date
            ? `${tb.blockDate.getUTCFullYear()}-${String(tb.blockDate.getUTCMonth() + 1).padStart(2, "0")}-${String(tb.blockDate.getUTCDate()).padStart(2, "0")}`
            : String(tb.blockDate).slice(0, 10))
        : "";
      return {
        routeId: r.id,
        routeCode: r.routeCode,
        date: dateIso,
        merchant: r.merchant,
        driverId: r.driverId ?? null,
        driverName: drv ? drv.name : null,
        stops: Number(r.stops),
        estDuration: Number(r.estDuration), // minutes
        estMileage: Number(r.estMileage),
        estRouteFee: Number(r.estRouteFee),
        estRouteBasePay: Number(r.estRouteBasePay ?? 0),
        estMileagePay: Number(r.estMileagePay),
        estTotalDriverPay: Number(r.estTotalDriverPay ?? r.estDriverPay),
        wodelyAdjustment: Number(r.wodelyAdjustment ?? 0),
      };
    })
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.routeCode.localeCompare(b.routeCode)));
  const total = rows.reduce((s, r) => s + r.wodelyAdjustment, 0);
  return { rows, total };
}


// ---------- Per-route Reference Forecast ----------
// For a given route, return reference numbers we can use to seed stops + holiday $/stop:
// - lyMDayStops: count of same-DOW tasks during 2025 M-Day week for the route's merchant (NOT yet zone-scoped — full merchant on that DOW)
// - trailing30Avg / trailing60Avg: avg same-DOW count across trailing windows for the merchant
// - lyMDayHolidayPerStop: heuristic — derived from any zoneTaskHistory2025 rows in the LY M-Day week
//     where holiday surcharge can be inferred. Today we have no historical holiday differential
//     captured, so this returns 0 unless a future migration backfills it. Field is reserved for
//     when historical holiday data is loaded.
//
// Sources: zoneTaskHistory2025, wodelyTaskCache, routes (for the merchant + timeblock date)
export type RouteReferenceForecast = {
  routeId: number;
  blockDateIso: string;
  dow: number;
  merchant: "LAF" | "BC" | "SMC" | "SMR";
  lyMDayStops: number;
  trailing30Avg: number;
  trailing60Avg: number;
  lyMDayHolidayPerStop: number;
};

export async function getRouteReferenceForecast(
  routeId: number,
): Promise<RouteReferenceForecast | null> {
  const db = await getDb();
  if (!db) return null;

  const [r] = await db.select().from(routes).where(eq(routes.id, routeId)).limit(1);
  if (!r) return null;
  const [tb] = await db.select().from(timeblocks).where(eq(timeblocks.id, r.timeblockId)).limit(1);
  if (!tb) return null;
  const blockDate = tb.blockDate instanceof Date ? tb.blockDate : new Date(String(tb.blockDate));
  const blockIso = utcDateToIso(blockDate);
  const dow = blockDate.getUTCDay();
  const merchant = r.merchant as "LAF" | "BC" | "SMC" | "SMR";

  // Today (UTC) — trailing window ends "yesterday".
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const todayUtc = isoToUTCDate(todayIso);
  const win60Start = new Date(todayUtc); win60Start.setUTCDate(win60Start.getUTCDate() - 60);
  const win60End = new Date(todayUtc); win60End.setUTCDate(win60End.getUTCDate() - 1);
  const win60StartIso = utcDateToIso(win60Start);
  const win60EndIso = utcDateToIso(win60End);

  // Historical 2025 rows in trailing window
  const histRows = await db
    .select()
    .from(zoneTaskHistory2025)
    .where(
      _sql`${zoneTaskHistory2025.taskDate} >= ${win60StartIso} AND ${zoneTaskHistory2025.taskDate} <= ${win60EndIso} AND ${zoneTaskHistory2025.merchant} = ${merchant}`,
    );
  // 2026 rows in trailing window
  const wodelyRows = await db
    .select()
    .from(wodelyTaskCache)
    .where(
      _sql`${wodelyTaskCache.deliveryDate} >= ${win60StartIso} AND ${wodelyTaskCache.deliveryDate} <= ${win60EndIso} AND ${wodelyTaskCache.merchant} = ${merchant}`,
    );
  const dailyTotals = new Map<string, number>();
  for (const row of histRows) {
    const iso = row.taskDate instanceof Date ? utcDateToIso(row.taskDate) : String(row.taskDate).slice(0, 10);
    dailyTotals.set(iso, (dailyTotals.get(iso) || 0) + (row.taskCount || 0));
  }
  for (const row of wodelyRows) {
    const iso = row.deliveryDate instanceof Date ? utcDateToIso(row.deliveryDate) : String(row.deliveryDate).slice(0, 10);
    dailyTotals.set(iso, (dailyTotals.get(iso) || 0) + 1);
  }

  let count30 = 0, n30 = 0, count60 = 0, n60 = 0;
  const cursor = new Date(win60Start);
  while (cursor <= win60End) {
    if (cursor.getUTCDay() === dow) {
      const iso = utcDateToIso(cursor);
      const v = dailyTotals.get(iso) || 0;
      count60 += v; n60 += 1;
      const daysFromToday = Math.round((todayUtc.getTime() - cursor.getTime()) / 86400000);
      if (daysFromToday >= 1 && daysFromToday <= 30) { count30 += v; n30 += 1; }
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  // LY M-Day: 2025-05-05..2025-05-10 (Mon..Sat). For Sunday rows, fall back to 2025-05-11.
  const lyMonday = "2025-05-05";
  const lyEnd = "2025-05-11";
  const lyRows = await db
    .select()
    .from(zoneTaskHistory2025)
    .where(
      _sql`${zoneTaskHistory2025.taskDate} >= ${lyMonday} AND ${zoneTaskHistory2025.taskDate} <= ${lyEnd} AND ${zoneTaskHistory2025.merchant} = ${merchant}`,
    );
  let lyMDayStops = 0;
  for (const row of lyRows) {
    const d = row.taskDate instanceof Date ? row.taskDate : isoToUTCDate(String(row.taskDate).slice(0, 10));
    if (d.getUTCDay() === dow) lyMDayStops += (row.taskCount || 0);
  }

  return {
    routeId,
    blockDateIso: blockIso,
    dow,
    merchant,
    lyMDayStops,
    trailing30Avg: n30 > 0 ? Math.round(count30 / n30) : 0,
    trailing60Avg: n60 > 0 ? Math.round(count60 / n60) : 0,
    lyMDayHolidayPerStop: 0, // placeholder until historical holiday data is loaded
  };
}
