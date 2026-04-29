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

describe("snapshot endpoints", () => {
  it("captures a manual snapshot and returns runId with per-date rows", async () => {
    const caller = appRouter.createCaller(createCtx());
    const before = await caller.snapshots.list();
    const result = await caller.snapshots.capture({ label: "vitest" });
    expect(result.success).toBe(true);
    expect(typeof result.id).toBe("number");
    const after = await caller.snapshots.list();
    expect(after.length).toBeGreaterThan(before.length);
    const rows = await caller.snapshots.getRows({ runId: result.id });
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThan(0);
    const r = rows[0];
    expect(r).toHaveProperty("forecastDate");
    expect(r).toHaveProperty("laf2026Goal");
    expect(r).toHaveProperty("bc2026Goal");
    expect(r).toHaveProperty("lafConfirmed");
    expect(r).toHaveProperty("bcConfirmed");
  });

  it("lists snapshot runs with totals", async () => {
    const caller = appRouter.createCaller(createCtx());
    const runs = await caller.snapshots.list();
    expect(Array.isArray(runs)).toBe(true);
    if (runs.length > 0) {
      const r = runs[0];
      expect(r).toHaveProperty("id");
      expect(r).toHaveProperty("triggerType");
      expect(r).toHaveProperty("totalRoutes");
      expect(r).toHaveProperty("totalGoalLaf");
      expect(r).toHaveProperty("totalGoalBc");
    }
  });
});
