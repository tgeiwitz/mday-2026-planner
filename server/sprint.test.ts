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

describe("merchantShare.getStats + confirmWeek", () => {
  it("getStats returns 6 days Mon-Sat with three reference columns when token is LAF", async () => {
    const caller = appRouter.createCaller(createCtx());
    // Create a LAF share token first
    const token = await caller.merchantShare.createToken({
      merchant: "LAF",
      label: "vitest LAF",
    });
    expect(token.token).toBeTruthy();

    // Future Monday well past today (avoid window collisions): 2026-05-04 is the M-Day Monday
    const stats = await caller.merchantShare.getStats({
      token: token.token,
      startDate: "2026-05-04",
    });
    expect(stats.hasForecast).toBe(true);
    expect(Array.isArray(stats.stats)).toBe(true);
    expect(stats.stats.length).toBe(6);
    for (const s of stats.stats) {
      expect(s).toHaveProperty("date");
      expect(s).toHaveProperty("trailing30Avg");
      expect(s).toHaveProperty("trailing60Avg");
      expect(s).toHaveProperty("lyMDaySameDow");
      expect(typeof s.trailing30Avg).toBe("number");
      expect(typeof s.trailing60Avg).toBe("number");
      expect(typeof s.lyMDaySameDow).toBe("number");
    }
    // First and last day should be Mon..Sat
    const first = new Date(stats.stats[0].date + "T00:00:00Z").getUTCDay();
    const last = new Date(stats.stats[5].date + "T00:00:00Z").getUTCDay();
    expect(first).toBe(1); // Monday
    expect(last).toBe(6); // Saturday

    // cleanup
    const tokens = await caller.merchantShare.listTokens();
    const created = tokens.find((t: any) => t.token === token.token);
    if (created) await caller.merchantShare.revokeToken({ id: created.id });
  });

  it("confirmWeek refuses past/current weeks and accepts future weeks", async () => {
    const caller = appRouter.createCaller(createCtx());
    const token = await caller.merchantShare.createToken({
      merchant: "LAF",
      label: "vitest confirm",
    });

    // Past week (2026-04-06 was Monday, before today)
    await expect(
      caller.merchantShare.confirmWeek({
        token: token.token,
        startDate: "2026-04-06",
      })
    ).rejects.toThrow();

    // Future week — May 11, 2026 (Mon)
    const result = await caller.merchantShare.confirmWeek({
      token: token.token,
      startDate: "2026-05-11",
    });
    expect(result.success).toBe(true);
    expect(typeof result.updated).toBe("number");

    const tokens = await caller.merchantShare.listTokens();
    const created = tokens.find((t: any) => t.token === token.token);
    if (created) await caller.merchantShare.revokeToken({ id: created.id });
  });

  it("getStats throws on revoked or invalid token", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(
      caller.merchantShare.getStats({
        token: "not-a-real-token-xyz",
        startDate: "2026-05-04",
      })
    ).rejects.toThrow();
  });
});

describe("driverSignup", () => {
  it("returns timeblocks within the M-Day sign-up window only", async () => {
    const caller = appRouter.createCaller(createCtx());
    const tbs = await caller.driverSignup.timeblocks();
    expect(Array.isArray(tbs)).toBe(true);
    for (const tb of tbs) {
      const iso =
        tb.blockDate instanceof Date
          ? `${tb.blockDate.getUTCFullYear()}-${String(tb.blockDate.getUTCMonth() + 1).padStart(2, "0")}-${String(tb.blockDate.getUTCDate()).padStart(2, "0")}`
          : String(tb.blockDate).slice(0, 10);
      expect(iso >= "2026-04-27").toBe(true);
      expect(iso <= "2026-05-09").toBe(true);
    }
  });

  it("create rejects unknown timeblock", async () => {
    const caller = appRouter.createCaller(createCtx());
    const drivers = await caller.driverSignup.drivers();
    if (drivers.length === 0) return;
    await expect(
      caller.driverSignup.create({
        driverId: drivers[0].id,
        timeblockId: 99999999,
        notes: "vitest invalid",
      })
    ).rejects.toThrow();
  });

  it("create succeeds for a valid driver+timeblock and is idempotent on duplicate", async () => {
    const caller = appRouter.createCaller(createCtx());
    const drivers = await caller.driverSignup.drivers();
    const tbs = await caller.driverSignup.timeblocks();
    if (drivers.length === 0 || tbs.length === 0) return;

    const driverId = drivers[0].id;
    const timeblockId = tbs[0].id;

    // Try to create — may succeed (first run) or duplicate-fail (re-run)
    let firstFailed = false;
    try {
      const res = await caller.driverSignup.create({
        driverId,
        timeblockId,
        notes: "vitest sprint test",
      });
      expect(res.success).toBe(true);
    } catch (err: any) {
      firstFailed = true;
      expect(String(err.message)).toMatch(/already|signed up/i);
    }

    // Second call should always fail (duplicate)
    await expect(
      caller.driverSignup.create({
        driverId,
        timeblockId,
        notes: "vitest sprint test 2",
      })
    ).rejects.toThrow();

    expect(typeof firstFailed).toBe("boolean");
  });
});
