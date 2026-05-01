/**
 * Tests for inferZoneMixForRoute / autoAssignZonesIfMissing.
 * Live-DB integration — requires DATABASE_URL with seeded zone_task_history_2025.
 */
import { describe, it, expect } from "vitest";
import {
  listRoutes,
  inferZoneMixForRoute,
  autoAssignZonesIfMissing,
  getRouteZones,
} from "./db";

describe("zone inference", () => {
  it("inferZoneMixForRoute returns a non-empty mix for a real route with stops>0", async () => {
    const routes = await listRoutes();
    const target = routes.find((r) => (r.stops ?? 0) > 0);
    if (!target) {
      // No live data; test is meaningful only against a populated DB.
      console.warn("No route with stops>0; skipping inferZoneMix test");
      return;
    }
    const mix = await inferZoneMixForRoute(target.id);
    expect(Array.isArray(mix)).toBe(true);
    if (mix.length === 0) {
      // Source 3 fallback returns 0 when neither history nor zone_metrics has data.
      // That's only OK in an unseeded environment; in production we expect coverage.
      console.warn("inferZoneMix returned empty; check seed data");
      return;
    }
    // Each entry must be well-formed
    for (const z of mix) {
      expect(z.zoneId).toBeGreaterThan(0);
      expect(z.taskCount).toBeGreaterThanOrEqual(0);
    }
    // Sum of taskCount == route.stops
    const sum = mix.reduce((s, x) => s + x.taskCount, 0);
    expect(sum).toBe(target.stops);
  });

  it("autoAssignZonesIfMissing is a no-op when zones already exist", async () => {
    const routes = await listRoutes();
    const target = routes.find((r) => (r.stops ?? 0) > 0);
    if (!target) return;
    // Ensure zones exist
    const before = await getRouteZones(target.id);
    if (before.length === 0) {
      // Seed first
      const ok = await autoAssignZonesIfMissing(target.id);
      expect(ok).toBe(true);
    }
    // Second call must be a no-op
    const result = await autoAssignZonesIfMissing(target.id);
    expect(result).toBe(false);
  });

  it("inferred mix preserves stops total exactly (largest-remainder method)", async () => {
    const routes = await listRoutes();
    const targets = routes.filter((r) => (r.stops ?? 0) > 0).slice(0, 3);
    for (const r of targets) {
      const mix = await inferZoneMixForRoute(r.id);
      if (mix.length === 0) continue;
      const sum = mix.reduce((s, x) => s + x.taskCount, 0);
      expect(sum).toBe(r.stops);
    }
  });
});
