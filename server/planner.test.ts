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
});
