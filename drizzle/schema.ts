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
  wave: mysqlEnum("wave", ["Wave 1", "Wave 2"]).notNull(),
  label: varchar("label", { length: 128 }).notNull(),
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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DriverTimeblock = typeof driverTimeblocks.$inferSelect;
export type InsertDriverTimeblock = typeof driverTimeblocks.$inferInsert;

// Routes
export const routes = mysqlTable("routes", {
  id: int("id").autoincrement().primaryKey(),
  routeCode: varchar("routeCode", { length: 32 }).notNull().unique(),
  timeblockId: int("timeblockId").notNull(),
  merchant: mysqlEnum("merchant", ["LAF", "BC"]).notNull(),
  driverId: int("driverId"),
  stops: int("stops").notNull().default(0),
  estDuration: int("estDuration").notNull().default(0),
  estMileage: decimal("estMileage", { precision: 8, scale: 2 }).notNull().default("0"),
  estRouteFee: decimal("estRouteFee", { precision: 10, scale: 2 }).notNull().default("0"),
  estDriverPay: decimal("estDriverPay", { precision: 10, scale: 2 }).notNull().default("0"),
  estMileagePay: decimal("estMileagePay", { precision: 10, scale: 2 }).notNull().default("0"),
  estPlatformFee: decimal("estPlatformFee", { precision: 10, scale: 2 }).notNull().default("0"),
  payFloorOverride: decimal("payFloorOverride", { precision: 8, scale: 2 }),
  payMaxOverride: decimal("payMaxOverride", { precision: 8, scale: 2 }),
  holidayPerStopSurcharge: decimal("holidayPerStopSurcharge", { precision: 6, scale: 2 }).notNull().default("0"),
  driverBonus: decimal("driverBonus", { precision: 8, scale: 2 }).notNull().default("0"),
  status: mysqlEnum("status", ["Budgeted", "Planned", "Confirmed", "Processed", "Routed", "Completed"]).notNull().default("Budgeted"),
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
