import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("zones.distribution endpoint", () => {
  it("returns rangeA and rangeB with rows + totals shape", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.zones.distribution({
      startA: "2025-05-05",
      endA: "2025-05-11",
      startB: "2026-05-04",
      endB: "2026-05-10",
    });
    expect(result).toHaveProperty("rangeA");
    expect(result).toHaveProperty("rangeB");
    expect(result.rangeA).toHaveProperty("rows");
    expect(result.rangeA).toHaveProperty("totals");
    expect(result.rangeB).toHaveProperty("rows");
    expect(result.rangeB).toHaveProperty("totals");
    expect(Array.isArray(result.rangeA.rows)).toBe(true);
    expect(Array.isArray(result.rangeB.rows)).toBe(true);
    expect(typeof result.rangeA.totals.laf).toBe("number");
    expect(typeof result.rangeA.totals.bc).toBe("number");
  });

  it("totals equal sum of row counts (by merchant) within each range", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.zones.distribution({
      startA: "2025-05-05",
      endA: "2025-05-11",
      startB: "2025-05-05",
      endB: "2025-05-11",
    });
    const sumLafA = result.rangeA.rows.reduce((s, r) => s + r.lafCount, 0);
    const sumBcA = result.rangeA.rows.reduce((s, r) => s + r.bcCount, 0);
    expect(sumLafA).toBe(result.rangeA.totals.laf);
    expect(sumBcA).toBe(result.rangeA.totals.bc);
  });

  it("percentage columns sum to ~100 when totals > 0", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.zones.distribution({
      startA: "2025-05-05",
      endA: "2025-05-11",
      startB: "2025-05-05",
      endB: "2025-05-11",
    });
    if (result.rangeA.totals.laf > 0) {
      const sumLafPct = result.rangeA.rows.reduce((s, r) => s + r.lafPct, 0);
      // Allow 1-point rounding slack across up to 30 zones.
      expect(Math.abs(sumLafPct - 100)).toBeLessThan(1.5);
    }
    if (result.rangeA.totals.bc > 0) {
      const sumBcPct = result.rangeA.rows.reduce((s, r) => s + r.bcPct, 0);
      expect(Math.abs(sumBcPct - 100)).toBeLessThan(1.5);
    }
  });
});
