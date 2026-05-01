import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, date } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Daily Forecast: LAF/BC 2025 actual, 60-day trending, 2026 goal, confirmed orders
export const dailyForecast = mysqlTable("daily_forecast", {
  id: int("id").autoincrement().primaryKey(),
  forecastDate: date("forecastDate").notNull().unique(),
  dayName: varchar("dayName", { length: 16 }).notNull(),
  phase: varchar("phase", { length: 32 }).notNull().default("Standard"),
  laf2025Actual: int("laf2025Actual").notNull().default(0),
  bc2025Actual: int("bc2025Actual").notNull().default(0),
  laf60DayTrend: int("laf60DayTrend").notNull().default(0),
  bc60DayTrend: int("bc60DayTrend").notNull().default(0),
  laf2026Goal: int("laf2026Goal").notNull().default(0),
  bc2026Goal: int("bc2026Goal").notNull().default(0),
  lafConfirmed: int("lafConfirmed").notNull().default(0),
  bcConfirmed: int("bcConfirmed").notNull().default(0),
  maxLafCapacity: int("maxLafCapacity").notNull().default(0),
  maxBcCapacity: int("maxBcCapacity").notNull().default(0),
  lafReforecast: int("lafReforecast").notNull().default(0),
  bcReforecast: int("bcReforecast").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DailyForecast = typeof dailyForecast.$inferSelect;
export type InsertDailyForecast = typeof dailyForecast.$inferInsert;

// Zone Baseline Metrics
export const zoneMetrics = mysqlTable("zone_metrics", {
  id: int("id").autoincrement().primaryKey(),
  zoneId: int("zoneId").notNull().unique(),
  zoneName: varchar("zoneName", { length: 128 }),
  // Last Year (May 5-12 2025)
  travelTimeLastYear: decimal("travelTimeLastYear", { precision: 8, scale: 2 }).notNull().default("0"),
  distanceLastYear: decimal("distanceLastYear", { precision: 8, scale: 2 }).notNull().default("0"),
  lafFeeLastYear: decimal("lafFeeLastYear", { precision: 8, scale: 2 }).notNull().default("0"),
  bcFeeLastYear: decimal("bcFeeLastYear", { precision: 8, scale: 2 }).notNull().default("0"),
  // 60-Day Trending
  travelTime60Day: decimal("travelTime60Day", { precision: 8, scale: 2 }).notNull().default("0"),
  distance60Day: decimal("distance60Day", { precision: 8, scale: 2 }).notNull().default("0"),
  lafFee60Day: decimal("lafFee60Day", { precision: 8, scale: 2 }).notNull().default("0"),
  bcFee60Day: decimal("bcFee60Day", { precision: 8, scale: 2 }).notNull().default("0"),
  // 2026 Assumption (editable)
  travelTime2026: decimal("travelTime2026", { precision: 8, scale: 2 }).notNull().default("0"),
  distance2026: decimal("distance2026", { precision: 8, scale: 2 }).notNull().default("0"),
  lafFee2026: decimal("lafFee2026", { precision: 8, scale: 2 }).notNull().default("0"),
  bcFee2026: decimal("bcFee2026", { precision: 8, scale: 2 }).notNull().default("0"),
  lafVolume2025: int("laf_volume_2025").notNull().default(0),
  bcVolume2025: int("bc_volume_2025").notNull().default(0),
  // Per-zone travel-time source override. "global" = follow global setting.
  travelTimeSource: mysqlEnum("travelTimeSource", ["global", "lastYear", "sixtyDay", "y2026"]).notNull().default("global"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ZoneMetric = typeof zoneMetrics.$inferSelect;
export type InsertZoneMetric = typeof zoneMetrics.$inferInsert;

// Drivers
export const drivers = mysqlTable("drivers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  status: mysqlEnum("status", ["Confirmed", "Pending", "Placeholder"]).notNull().default("Pending"),
  driverType: mysqlEnum("driverType", ["Lead", "New"]).notNull().default("Lead"),
  timePerStopDiff: decimal("timePerStopDiff", { precision: 5, scale: 2 }).notNull().default("0"),
  // Per-driver pay overrides. Null = inherit (global driverPayPct, timeblock floor/max).
  // payPctOverride is the percent of route fee paid to this driver, e.g. "0.78" for 78%.
  payPctOverride: decimal("payPctOverride", { precision: 5, scale: 4 }),
  payFloorOverride: decimal("payFloorOverride", { precision: 10, scale: 2 }),
  payMaxOverride: decimal("payMaxOverride", { precision: 10, scale: 2 }),
  // Hourly target band used by the recalc engine to clamp Route Base Pay.
  // Floor = hourlyTargetMin × estDuration (hours); Max = hourlyTargetMax × estDuration.
  // If unset, falls back to the dollar overrides above, then to the timeblock defaults.
  hourlyTargetMin: decimal("hourlyTargetMin", { precision: 6, scale: 2 }),
  hourlyTargetMax: decimal("hourlyTargetMax", { precision: 6, scale: 2 }),
  // Forecasting overrides. Null = inherit global default.
  // maxCapacity = max stops this driver will accept on a single route.
  // targetDuration = preferred minutes per route.
  // targetStops = sweet-spot stop count for this driver.
  maxCapacity: int("maxCapacity"),
  targetDuration: int("targetDuration"),
  targetStops: int("targetStops"),
  // Vehicle: drives a multiplier on the 75% driver-pay slice. sedan=0.80, van=1.10.
  vehicleType: mysqlEnum("vehicleType", ["sedan", "van"]).notNull().default("sedan"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Driver = typeof drivers.$inferSelect;
export type InsertDriver = typeof drivers.$inferInsert;

// Timeblocks
export const timeblocks = mysqlTable("timeblocks", {
  id: int("id").autoincrement().primaryKey(),
  blockDate: date("blockDate").notNull(),
  dayName: varchar("dayName", { length: 16 }).notNull(),
  wave: mysqlEnum("wave", ["Wave 1", "Wave 2"]),
  label: varchar("label", { length: 128 }).notNull(),
  // Merchant this block primarily serves (Flex = mixed)
  merchant: mysqlEnum("merchant", ["LAF", "BC", "SMC", "SMR", "Flex"]).notNull().default("Flex"),
  // Direct = single-merchant routes; Flex = routes can mix merchants
  bookingType: mysqlEnum("bookingType", ["Direct", "Flex"]).notNull().default("Flex"),
  // Driver on-the-road start time (e.g. "06:30")
  routeStart: varchar("routeStart", { length: 8 }),
  // Minutes of pickup dwell time (loading at merchant)
  pickupDwell: int("pickupDwell").notNull().default(15),
  // Per-mile pay rate
  mileageRate: decimal("mileageRate", { precision: 6, scale: 3 }).notNull().default("0.670"),
  // Target route count (capacity planning)
  targetRoutes: int("targetRoutes").notNull().default(1),
  // Pickup times from historical data
  lafPickupTime: varchar("lafPickupTime", { length: 8 }),
  bcPickupTime: varchar("bcPickupTime", { length: 8 }),
  // Required availability window
  availabilityStart: varchar("availabilityStart", { length: 8 }).notNull(),
  availabilityEnd: varchar("availabilityEnd", { length: 8 }).notNull(),
  // Economics
  estRoutePay: decimal("estRoutePay", { precision: 8, scale: 2 }).notNull().default("0"),
  estDuration: int("estDuration").notNull().default(0),
  bonus: decimal("bonus", { precision: 8, scale: 2 }).notNull().default("0"),
  minPayFloor: decimal("minPayFloor", { precision: 8, scale: 2 }).notNull().default("150"),
  maxPayFloor: decimal("maxPayFloor", { precision: 8, scale: 2 }).notNull().default("250"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Timeblock = typeof timeblocks.$inferSelect;
export type InsertTimeblock = typeof timeblocks.$inferInsert;

// Driver Timeblock Assignments
export const driverTimeblocks = mysqlTable("driver_timeblocks", {
  id: int("id").autoincrement().primaryKey(),
  driverId: int("driverId").notNull(),
  timeblockId: int("timeblockId").notNull(),
  assignmentStatus: mysqlEnum("assignmentStatus", ["Signed Up", "Scheduled"]).notNull().default("Signed Up"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DriverTimeblock = typeof driverTimeblocks.$inferSelect;
export type InsertDriverTimeblock = typeof driverTimeblocks.$inferInsert;

// Routes
export const routes = mysqlTable("routes", {
  id: int("id").autoincrement().primaryKey(),
  routeCode: varchar("routeCode", { length: 32 }).notNull().unique(),
  timeblockId: int("timeblockId").notNull(),
  merchant: mysqlEnum("merchant", ["LAF", "BC", "SMC", "SMR"]).notNull(),
  bookingType: mysqlEnum("bookingType", ["Direct", "Flex"]).notNull().default("Direct"),
  driverId: int("driverId"),
  stops: int("stops").notNull().default(0),
  estDuration: int("estDuration").notNull().default(0),
  estMileage: decimal("estMileage", { precision: 8, scale: 2 }).notNull().default("0"),
  estRouteFee: decimal("estRouteFee", { precision: 10, scale: 2 }).notNull().default("0"),
  estDriverPay: decimal("estDriverPay", { precision: 10, scale: 2 }).notNull().default("0"),
  // Route Base Pay = (fee × pct) − mileagePay, clamped to driver's hourly band × hours, plus bonus.
  // Total Driver Pay = estRouteBasePay + estMileagePay (what the driver sees on their route sheet).
  estRouteBasePay: decimal("estRouteBasePay", { precision: 10, scale: 2 }).notNull().default("0"),
  estTotalDriverPay: decimal("estTotalDriverPay", { precision: 10, scale: 2 }).notNull().default("0"),
  // When the hourly floor binds, this is the workforce-task gross-up to upload to Wodely.
  wodelyAdjustment: decimal("wodelyAdjustment", { precision: 10, scale: 2 }).notNull().default("0"),
  estMileagePay: decimal("estMileagePay", { precision: 10, scale: 2 }).notNull().default("0"),
  estPlatformFee: decimal("estPlatformFee", { precision: 10, scale: 2 }).notNull().default("0"),
  payFloorOverride: decimal("payFloorOverride", { precision: 8, scale: 2 }),
  payMaxOverride: decimal("payMaxOverride", { precision: 8, scale: 2 }),
  // Forecasting overrides. Null = inherit driver → global default.
  maxCapacity: int("maxCapacity"),
  targetDuration: int("targetDuration"),
  targetStops: int("targetStops"),
  hourlyTargetMin: decimal("hourlyTargetMin", { precision: 6, scale: 2 }),
  hourlyTargetMax: decimal("hourlyTargetMax", { precision: 6, scale: 2 }),
  // Vehicle override (null = inherit driver). sedan=0.80, van=1.10.
  vehicleType: mysqlEnum("vehicleType", ["sedan", "van"]),
  // Assignment confirmation: did the driver accept this assignment?
  // Independent of route status (status = where ops is in the pipeline).
  assignmentConfirmed: int("assignmentConfirmed").notNull().default(0),
  assignmentConfirmedAt: timestamp("assignmentConfirmedAt"),
  holidayPerStopSurcharge: decimal("holidayPerStopSurcharge", { precision: 6, scale: 2 }).notNull().default("0"),
  driverBonus: decimal("driverBonus", { precision: 8, scale: 2 }).notNull().default("0"),
  status: mysqlEnum("status", ["Budgeted", "Planned", "Confirmed", "Processed", "Routed", "Completed"]).notNull().default("Budgeted"),
  feeMode: mysqlEnum("feeMode", ["baseline", "blended", "locked"]).notNull().default("baseline"),
  plannedMileage: decimal("plannedMileage", { precision: 8, scale: 2 }),
  plannedDuration: int("plannedDuration"),
  plannedDriverPay: decimal("plannedDriverPay", { precision: 10, scale: 2 }),
  plannedLockedAt: timestamp("plannedLockedAt"),
  needsReview: int("needsReview").notNull().default(0),
  reviewReason: text("reviewReason"),
  driverApproved: int("driverApproved").notNull().default(0),
  driverApprovedAt: timestamp("driverApprovedAt"),
  actualStops: int("actualStops"),
  actualMileage: decimal("actualMileage", { precision: 8, scale: 2 }),
  actualDuration: int("actualDuration"),
  actualDriverPay: decimal("actualDriverPay", { precision: 10, scale: 2 }),
  actualStopsReturned: int("actualStopsReturned"),
  completionNotes: text("completionNotes"),
  completedAt: timestamp("completedAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Route = typeof routes.$inferSelect;
export type InsertRoute = typeof routes.$inferInsert;

// Route Zones (M2M)
export const routeZones = mysqlTable("route_zones", {
  id: int("id").autoincrement().primaryKey(),
  routeId: int("routeId").notNull(),
  zoneId: int("zoneId").notNull(),
  taskCount: int("taskCount").notNull().default(0),
});

export type RouteZone = typeof routeZones.$inferSelect;
export type InsertRouteZone = typeof routeZones.$inferInsert;

// Route History (audit log for lifecycle transitions and locked-field overrides)
export const routeHistory = mysqlTable("route_history", {
  id: int("id").autoincrement().primaryKey(),
  routeId: int("routeId").notNull(),
  event: varchar("event", { length: 48 }).notNull(), // status_change | lock | review_flagged | review_kept | review_applied | pay_override | actuals_logged
  payload: text("payload"), // JSON string with before/after/context
  at: timestamp("at").defaultNow().notNull(),
});

export type RouteHistory = typeof routeHistory.$inferSelect;
export type InsertRouteHistory = typeof routeHistory.$inferInsert;

// Historical 2025 daily task totals per merchant — seeded from Supabase
// `completed_tasks`. Used for equivalent-day comparison in 2026 planning
// (2025 M-Day = May 11; 2026 M-Day = May 10 → matched on daysBeforeMday).
export const historicalDaily2025 = mysqlTable("historical_daily_2025", {
  id: int("id").autoincrement().primaryKey(),
  taskDate: varchar("taskDate", { length: 10 }).notNull().unique(), // YYYY-MM-DD
  daysBeforeMday: int("daysBeforeMday").notNull(), // May 11, 2025 = 0
  lafTasks: int("lafTasks").notNull().default(0),
  lafAvgFee: decimal("lafAvgFee", { precision: 8, scale: 2 }).notNull().default("0"),
  bcTasks: int("bcTasks").notNull().default(0),
  bcAvgFee: decimal("bcAvgFee", { precision: 8, scale: 2 }).notNull().default("0"),
  otherTasks: int("otherTasks").notNull().default(0),
});

export type HistoricalDaily2025 = typeof historicalDaily2025.$inferSelect;

// Global Settings / Assumptions
export const globalSettings = mysqlTable("global_settings", {
  id: int("id").autoincrement().primaryKey(),
  settingKey: varchar("settingKey", { length: 64 }).notNull().unique(),
  settingValue: varchar("settingValue", { length: 255 }).notNull(),
  description: text("description"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GlobalSetting = typeof globalSettings.$inferSelect;
export type InsertGlobalSetting = typeof globalSettings.$inferInsert;

// Snapshot Runs: one row per snapshot captured (daily auto or on-demand)
export const snapshotRuns = mysqlTable("snapshot_runs", {
  id: int("id").autoincrement().primaryKey(),
  triggerType: mysqlEnum("triggerType", ["auto", "manual"]).notNull().default("manual"),
  label: varchar("label", { length: 128 }),
  totalRoutes: int("totalRoutes").notNull().default(0),
  totalConfirmedLaf: int("totalConfirmedLaf").notNull().default(0),
  totalConfirmedBc: int("totalConfirmedBc").notNull().default(0),
  totalGoalLaf: int("totalGoalLaf").notNull().default(0),
  totalGoalBc: int("totalGoalBc").notNull().default(0),
  totalRevenue: decimal("totalRevenue", { precision: 12, scale: 2 }).notNull().default("0"),
  totalDriverPay: decimal("totalDriverPay", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SnapshotRun = typeof snapshotRuns.$inferSelect;
export type InsertSnapshotRun = typeof snapshotRuns.$inferInsert;

// Forecast Snapshots: per-date rows captured during each snapshot run
export const forecastSnapshots = mysqlTable("forecast_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  snapshotRunId: int("snapshotRunId").notNull(),
  forecastDate: date("forecastDate").notNull(),
  dayName: varchar("dayName", { length: 16 }).notNull(),
  laf2026Goal: int("laf2026Goal").notNull().default(0),
  bc2026Goal: int("bc2026Goal").notNull().default(0),
  lafConfirmed: int("lafConfirmed").notNull().default(0),
  bcConfirmed: int("bcConfirmed").notNull().default(0),
  maxLafCapacity: int("maxLafCapacity").notNull().default(0),
  maxBcCapacity: int("maxBcCapacity").notNull().default(0),
  routesPlanned: int("routesPlanned").notNull().default(0),
  routesConfirmed: int("routesConfirmed").notNull().default(0),
  revenue: decimal("revenue", { precision: 12, scale: 2 }).notNull().default("0"),
  driverPay: decimal("driverPay", { precision: 12, scale: 2 }).notNull().default("0"),
});

export type ForecastSnapshot = typeof forecastSnapshots.$inferSelect;
export type InsertForecastSnapshot = typeof forecastSnapshots.$inferInsert;

// Wodely Task Cache: per-task fees pulled from Wodely sync
export const wodelyTaskCache = mysqlTable("wodely_task_cache", {
  id: int("id").autoincrement().primaryKey(),
  wodelyTaskId: varchar("wodelyTaskId", { length: 64 }).notNull().unique(),
  merchant: mysqlEnum("merchant", ["LAF", "BC", "SMC", "SMR"]).notNull(),
  deliveryDate: date("deliveryDate").notNull(),
  zoneId: int("zoneId"),
  taskFee: decimal("taskFee", { precision: 8, scale: 2 }).notNull().default("0"),
  // Route assignment from Wodely (source of truth)
  routePlanId: int("routePlanId"),
  routeSortId: int("routeSortId"),
  routeName: varchar("routeName", { length: 128 }),
  driverName: varchar("driverName", { length: 128 }),
  taskStatusId: int("taskStatusId"),
  raw: text("raw"),
  syncedAt: timestamp("syncedAt").defaultNow().notNull(),
});

export type WodelyTaskCache = typeof wodelyTaskCache.$inferSelect;
export type InsertWodelyTaskCache = typeof wodelyTaskCache.$inferInsert;

// Wodely Routes Cache: route-level metadata pulled from /v2/routes/search
export const wodelyRoutesCache = mysqlTable("wodely_routes_cache", {
  id: int("id").autoincrement().primaryKey(),
  wodelyRouteId: int("wodelyRouteId").notNull().unique(),
  routeName: varchar("routeName", { length: 128 }),
  statusId: varchar("statusId", { length: 32 }),
  startTime: timestamp("startTime"),
  endTime: timestamp("endTime"),
  actualStartTime: timestamp("actualStartTime"),
  actualEndTime: timestamp("actualEndTime"),
  driverUserId: varchar("driverUserId", { length: 64 }),
  driverFullName: varchar("driverFullName", { length: 128 }),
  startAddress: varchar("startAddress", { length: 255 }),
  endAddress: varchar("endAddress", { length: 255 }),
  distance: int("distance"),
  duration: int("duration"),
  routeDate: date("routeDate").notNull(),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
  removedAt: timestamp("removedAt"),
});

export type WodelyRouteCache = typeof wodelyRoutesCache.$inferSelect;
export type InsertWodelyRouteCache = typeof wodelyRoutesCache.$inferInsert;


// Per-zone per-date per-merchant task counts seeded from 2025 Supabase data.
// Used by the Zone Distribution Range A vs Range B comparison panel.
export const zoneTaskHistory2025 = mysqlTable("zone_task_history_2025", {
  id: int("id").autoincrement().primaryKey(),
  taskDate: date("taskDate").notNull(),
  merchant: mysqlEnum("merchant", ["LAF", "BC", "SMC", "SMR"]).notNull(),
  zoneId: int("zoneId").notNull(),
  taskCount: int("taskCount").notNull().default(0),
  avgFee: decimal("avgFee", { precision: 10, scale: 2 }).notNull().default("0"),
});


// Merchant share tokens — one per merchant, lets an external merchant contact
// view/update their forecast via a public tokenized URL (/m/:token).
export const merchantShareTokens = mysqlTable("merchant_share_tokens", {
  id: int("id").autoincrement().primaryKey(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  merchant: mysqlEnum("merchant", ["LAF", "BC", "SMC", "SMR"]).notNull(),
  label: varchar("label", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  revokedAt: timestamp("revokedAt"),
  lastUsedAt: timestamp("lastUsedAt"),
});

export type MerchantShareToken = typeof merchantShareTokens.$inferSelect;
export type InsertMerchantShareToken = typeof merchantShareTokens.$inferInsert;

// Per-date free-text note from the merchant (e.g. "running promo", "holiday closed").
export const merchantDayNotes = mysqlTable("merchant_day_notes", {
  id: int("id").autoincrement().primaryKey(),
  merchant: mysqlEnum("merchant", ["LAF", "BC", "SMC", "SMR"]).notNull(),
  noteDate: date("noteDate").notNull(),
  note: text("note"),
  updatedBy: varchar("updatedBy", { length: 128 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MerchantDayNote = typeof merchantDayNotes.$inferSelect;
export type InsertMerchantDayNote = typeof merchantDayNotes.$inferInsert;
