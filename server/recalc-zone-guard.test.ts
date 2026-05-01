import { describe, it, expect } from "vitest";
import * as db from "./db";

/**
 * v44 PLANNING-CORRECTNESS GUARD
 *
 * The contract: any route with stops>0 must end up with a zone mix and a
 * non-zero fee/duration after recalculateAllRoutes runs. If the route was
 * created without zones (e.g., via the New Route dialog in older builds, or
 * via auto-create paths on +3w timeblocks), the recalc engine itself must
 * infer zones from LY same-DOW history and persist them BEFORE computing
 * fee/miles/duration.
 */
describe("recalc layer enforces zone inference", () => {
  it("recalculateAllRoutes returns an integrity report and repairs zoneless routes", async () => {
    // Find a timeblock to attach a probe route to.
    const tbs = await db.listTimeblocks();
    const tb = tbs[0];
    if (!tb) {
      console.warn("[recalc-zone-guard] no timeblock available; skipping");
      return;
    }
    const merchant: "LAF" | "BC" =
      tb.merchant === "LAF" || tb.merchant === "BC" ? tb.merchant : "LAF";

    // Create a route directly in DB (bypassing the routes.create router so
    // we can simulate the legacy zoneless path).
    const code = `TEST-${tb.id}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const created = await db.createRoute({
      routeCode: code,
      timeblockId: tb.id,
      merchant,
      stops: 3,
      status: "Budgeted",
    } as Parameters<typeof db.createRoute>[0]);
    expect(created).toBeDefined();
    const routeId = (created as { insertId: number }).insertId;
    expect(routeId).toBeGreaterThan(0);

    try {
      // Calling setRouteZones with [] deletes existing zones and triggers a
      // recalculate. Our v44 guard inside recalculateAllRoutes must detect a
      // route with stops>0 and zero zones, infer a zone mix from history, and
      // persist it BEFORE returning.
      await db.setRouteZones(routeId, []);
      const afterZones = await db.getRouteZones(routeId);
      expect(afterZones.length).toBeGreaterThan(0); // recalc-layer auto-inference

      // The route must now have a non-zero fee and duration.
      const all = await db.listRoutes();
      const r = all.find((x) => x.id === routeId)!;
      expect(Number(r.estRouteFee)).toBeGreaterThan(0);
      expect(Number(r.estDuration ?? 0)).toBeGreaterThan(0);

      // And a fresh recalc with no zoneless routes left should report a clean
      // integrity state.
      const report = await db.recalculateAllRoutes({ triggeredBy: "vitest-final" });
      expect(report.routesStillMissingZones).toBe(0);
    } finally {
      await db.deleteRoute(routeId);
    }
  });
});
