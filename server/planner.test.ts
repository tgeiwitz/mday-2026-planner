import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("planner endpoints", () => {
  it("lists zones with Last Year / 60 Day / 2026 columns", async () => {
    const caller = appRouter.createCaller(createCtx());
    const zones = await caller.zones.list();
    expect(Array.isArray(zones)).toBe(true);
    if (zones.length > 0) {
      const z = zones[0];
      expect(z).toHaveProperty("zoneId");
      expect(z).toHaveProperty("travelTimeLastYear");
      expect(z).toHaveProperty("travelTime60Day");
      expect(z).toHaveProperty("travelTime2026");
      expect(z).toHaveProperty("lafFee2026");
      expect(z).toHaveProperty("bcFee2026");
    }
  });

  it("lists timeblocks with pickup times, pay, duration, bonus, window", async () => {
    const caller = appRouter.createCaller(createCtx());
    const blocks = await caller.timeblocks.list();
    expect(Array.isArray(blocks)).toBe(true);
    if (blocks.length > 0) {
      const b = blocks[0];
      expect(b).toHaveProperty("wave");
      expect(b).toHaveProperty("estRoutePay");
      expect(b).toHaveProperty("estDuration");
      expect(b).toHaveProperty("bonus");
      expect(b).toHaveProperty("availabilityStart");
      expect(b).toHaveProperty("availabilityEnd");
    }
  });

  it("lists routes with full economics", async () => {
    const caller = appRouter.createCaller(createCtx());
    const routes = await caller.routes.list();
    expect(Array.isArray(routes)).toBe(true);
    if (routes.length > 0) {
      const r = routes[0];
      expect(r).toHaveProperty("routeCode");
      expect(r).toHaveProperty("estRouteFee");
      expect(r).toHaveProperty("estDriverPay");
      expect(r).toHaveProperty("estMileagePay");
      expect(r).toHaveProperty("estPlatformFee");
      expect(r).toHaveProperty("status");
    }
  });

  function toDateKey(d: unknown): string {
    if (d instanceof Date) {
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    }
    return String(d).slice(0, 10);
  }

  it("timeblocks cover every day from Apr 29 through May 18, 2026", async () => {
    const caller = appRouter.createCaller(createCtx());
    const blocks = await caller.timeblocks.list();
    const dates = new Set(blocks.map((b) => toDateKey(b.blockDate)));
    // Generate expected date range
    const expected: string[] = [];
    const start = new Date(Date.UTC(2026, 3, 29));
    const end = new Date(Date.UTC(2026, 4, 18));
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      expected.push(d.toISOString().slice(0, 10));
    }
    for (const d of expected) {
      expect(dates.has(d)).toBe(true);
    }
    expect(expected.length).toBe(20);
  });

  it("routes exist for every day in the Apr 29 - May 18 range", async () => {
    const caller = appRouter.createCaller(createCtx());
    const routes = await caller.routes.list();
    const blocks = await caller.timeblocks.list();
    const tbMap = new Map(blocks.map((b) => [b.id, toDateKey(b.blockDate)]));
    const datesWithRoutes = new Set(routes.map((r) => tbMap.get(r.timeblockId)).filter(Boolean));
    const start = new Date(Date.UTC(2026, 3, 29));
    const end = new Date(Date.UTC(2026, 4, 18));
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      expect(datesWithRoutes.has(key)).toBe(true);
    }
  });

  it("settings get returns structured object with defaults", async () => {
    const caller = appRouter.createCaller(createCtx());
    const s = await caller.settings.get();
    expect(s).toHaveProperty("driverPayPct");
    expect(s).toHaveProperty("mileageThreshold");
    expect(s).toHaveProperty("holidaySurchargeEnabled");
  });

  it("recalculate routes does not throw", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.routes.recalculate();
    expect(result.success).toBe(true);
  });

  it("planning.list returns LAF/BC/Total Route Capacity + Confirmed Capacity + gaps", async () => {
    const caller = appRouter.createCaller(createCtx());
    const rows = await caller.planning.list();
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThan(0);
    const r = rows[0];
    // Capacity columns present
    expect(r).toHaveProperty("lafRouteCapacity");
    expect(r).toHaveProperty("bcRouteCapacity");
    expect(r).toHaveProperty("totalRouteCapacity");
    expect(r).toHaveProperty("lafConfirmedCapacity");
    expect(r).toHaveProperty("bcConfirmedCapacity");
    expect(r).toHaveProperty("totalConfirmedCapacity");
    // Two-gap math
    expect(r).toHaveProperty("lafRoomToFill");
    expect(r).toHaveProperty("bcRoomToFill");
    expect(r).toHaveProperty("totalRoomToFill");
    expect(r).toHaveProperty("lafNeedDrivers");
    expect(r).toHaveProperty("bcNeedDrivers");
    expect(r).toHaveProperty("totalNeedDrivers");
    // Totals equal the sum of merchant components
    expect(r.totalRouteCapacity).toBe(r.lafRouteCapacity + r.bcRouteCapacity);
    expect(r.totalConfirmedCapacity).toBe(r.lafConfirmedCapacity + r.bcConfirmedCapacity);
    expect(r.totalRoomToFill).toBe(r.lafRouteCapacity + r.bcRouteCapacity - (r.lafConfirmed + r.bcConfirmed));
  });

  it("editing a route's stops changes the day's Route Capacity", async () => {
    const caller = appRouter.createCaller(createCtx());
    const routes = await caller.routes.list();
    const blocks = await caller.timeblocks.list();
    const tbMap = new Map(blocks.map((b) => [b.id, toDateKey(b.blockDate)]));
    const target = routes.find((r) => tbMap.get(r.timeblockId) != null);
    expect(target).toBeDefined();
    const dateKey = tbMap.get(target!.timeblockId)!;
    const originalStops = target!.stops;
    const before = await caller.planning.list();
    const beforeRow = before.find((p) => p.forecastDate === dateKey)!;
    const beforeCap = target!.merchant === "LAF" ? beforeRow.lafRouteCapacity : beforeRow.bcRouteCapacity;
    // Bump stops by +1
    await caller.routes.update({ id: target!.id, stops: originalStops + 1 });
    const after = await caller.planning.list();
    const afterRow = after.find((p) => p.forecastDate === dateKey)!;
    const afterCap = target!.merchant === "LAF" ? afterRow.lafRouteCapacity : afterRow.bcRouteCapacity;
    expect(afterCap).toBe(beforeCap + 1);
    // Restore original
    await caller.routes.update({ id: target!.id, stops: originalStops });
  });
});
