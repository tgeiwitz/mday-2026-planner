import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { aggregateByDate, fetchConfirmedOrders, testAuth } from "./wodely";
import { notifyOwner } from "./_core/notification";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  planning: router({
    list: publicProcedure.query(() => db.getPlanningView()),
  }),

  forecast: router({
    list: publicProcedure.query(() => db.listDailyForecast()),
    update: publicProcedure
      .input(
        z.object({
          id: z.number(),
          laf2026Goal: z.number().optional(),
          bc2026Goal: z.number().optional(),
          lafConfirmed: z.number().optional(),
          bcConfirmed: z.number().optional(),
          maxLafCapacity: z.number().optional(),
          maxBcCapacity: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...rest } = input;
        await db.updateDailyForecast(id, rest);
        return { success: true };
      }),
  }),

  zones: router({
    list: publicProcedure.query(() => db.listZoneMetrics()),
    update: publicProcedure
      .input(
        z.object({
          id: z.number(),
          travelTime2026: z.union([z.string(), z.number()]).optional(),
          distance2026: z.union([z.string(), z.number()]).optional(),
          lafFee2026: z.union([z.string(), z.number()]).optional(),
          bcFee2026: z.union([z.string(), z.number()]).optional(),
          travelTimeSource: z.enum(["global", "lastYear", "sixtyDay", "y2026"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...rest } = input;
        const update: Record<string, string> = {};
        for (const [k, v] of Object.entries(rest)) {
          if (v !== undefined) update[k] = String(v);
        }
        await db.updateZoneMetric(id, update);
        await db.recalculateAllRoutes({ triggeredBy: `zones.update:${id}` });
        return { success: true };
      }),
    distribution: publicProcedure
      .input(z.object({ startA: z.string(), endA: z.string(), startB: z.string(), endB: z.string() }))
      .query(async ({ input }) => {
        const [a, b] = await Promise.all([
          db.getZoneDistribution(input.startA, input.endA),
          db.getZoneDistribution(input.startB, input.endB),
        ]);
        return { rangeA: a, rangeB: b };
      }),
  }),

  drivers: router({
    list: publicProcedure.query(() => db.listDrivers()),
    create: publicProcedure
      .input(
        z.object({
          name: z.string(),
          status: z.enum(["Confirmed", "Pending", "Placeholder"]),
          driverType: z.enum(["Lead", "New"]),
          timePerStopDiff: z.union([z.string(), z.number()]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        await db.createDriver({
          ...input,
          timePerStopDiff: input.timePerStopDiff ? String(input.timePerStopDiff) : "0",
        });
        return { success: true };
      }),
    update: publicProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          status: z.enum(["Confirmed", "Pending", "Placeholder"]).optional(),
          driverType: z.enum(["Lead", "New"]).optional(),
          timePerStopDiff: z.union([z.string(), z.number()]).optional(),
          payPctOverride: z.union([z.string(), z.number()]).nullable().optional(),
          payFloorOverride: z.union([z.string(), z.number()]).nullable().optional(),
          payMaxOverride: z.union([z.string(), z.number()]).nullable().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...rest } = input;
        const data: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(rest)) {
          if (v === undefined) continue;
          if (v === null) {
            data[k] = null;
          } else if (["timePerStopDiff", "payPctOverride", "payFloorOverride", "payMaxOverride"].includes(k)) {
            data[k] = String(v);
          } else {
            data[k] = v;
          }
        }
        await db.updateDriver(id, data);
        // If a pay override (or time differential) changed, route estimates that depend
        // on this driver are stale — fire a global recalc so Routes / Profitability stay correct.
        const recalcKeys = ["payPctOverride", "payFloorOverride", "payMaxOverride", "timePerStopDiff"];
        if (recalcKeys.some((k) => k in data)) {
          try {
            await db.recalculateAllRoutes({ triggeredBy: "driver-pay-override" });
          } catch (e) {
            // best-effort; do not fail the driver update on a recalc hiccup
            console.error("recalc after driver pay override failed", e);
          }
        }
        return { success: true };
      }),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteDriver(input.id);
        return { success: true };
      }),
  }),

  timeblocks: router({
    list: publicProcedure.query(() => db.listTimeblocks()),
    update: publicProcedure
      .input(
        z.object({
          id: z.number(),
          label: z.string().optional(),
          blockDate: z.string().optional(),
          merchant: z.enum(["LAF", "BC", "SMC", "SMR", "Flex"]).optional(),
          bookingType: z.enum(["Direct", "Flex"]).optional(),
          routeStart: z.string().nullable().optional(),
          availabilityStart: z.string().optional(),
          availabilityEnd: z.string().optional(),
          lafPickupTime: z.string().nullable().optional(),
          bcPickupTime: z.string().nullable().optional(),
          pickupDwell: z.number().optional(),
          targetRoutes: z.number().optional(),
          mileageRate: z.union([z.string(), z.number()]).optional(),
          estRoutePay: z.union([z.string(), z.number()]).optional(),
          estDuration: z.number().optional(),
          bonus: z.union([z.string(), z.number()]).optional(),
          minPayFloor: z.union([z.string(), z.number()]).optional(),
          maxPayFloor: z.union([z.string(), z.number()]).optional(),
          notes: z.string().nullable().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...rest } = input;
        const intKeys = new Set(["estDuration", "pickupDwell", "targetRoutes"]);
        const passthroughKeys = new Set([
          "label", "blockDate", "merchant", "bookingType",
          "routeStart", "availabilityStart", "availabilityEnd",
          "lafPickupTime", "bcPickupTime", "notes",
        ]);
        const data: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(rest)) {
          if (v === undefined) continue;
          if (intKeys.has(k) || passthroughKeys.has(k)) {
            data[k] = v;
          } else {
            data[k] = v === null ? null : String(v);
          }
        }
        await db.updateTimeblock(id, data);
        return { success: true };
      }),
    create: publicProcedure
      .input(
        z.object({
          blockDate: z.string(),
          label: z.string().optional(),
          merchant: z.enum(["LAF", "BC", "SMC", "SMR", "Flex"]).default("Flex"),
          bookingType: z.enum(["Direct", "Flex"]).default("Flex"),
          routeStart: z.string().nullable().optional(),
          availabilityStart: z.string().default("06:00"),
          availabilityEnd: z.string().default("20:00"),
          lafPickupTime: z.string().nullable().optional(),
          bcPickupTime: z.string().nullable().optional(),
          pickupDwell: z.number().default(15),
          targetRoutes: z.number().default(1),
          mileageRate: z.union([z.string(), z.number()]).default("0.670"),
          estRoutePay: z.union([z.string(), z.number()]).default("0"),
          estDuration: z.number().default(0),
          bonus: z.union([z.string(), z.number()]).default("0"),
          minPayFloor: z.union([z.string(), z.number()]).default("150"),
          maxPayFloor: z.union([z.string(), z.number()]).default("250"),
          notes: z.string().nullable().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const data: any = { ...input };
        for (const k of ["mileageRate", "estRoutePay", "bonus", "minPayFloor", "maxPayFloor"]) {
          if (typeof data[k] === "number") data[k] = String(data[k]);
        }
        if (!data.label) {
          const d = new Date(data.blockDate);
          const dn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getUTCDay()];
          data.label = `${dn} ${String(data.blockDate).slice(5)} — ${data.merchant}`;
        }
        const res = await db.createTimeblock(data);
        return { success: true, id: res.id };
      }),
    duplicate: publicProcedure
      .input(z.object({ id: z.number(), blockDate: z.string() }))
      .mutation(async ({ input }) => {
        const all = await db.listTimeblocks();
        const src = all.find((t: any) => t.id === input.id);
        if (!src) throw new Error("Timeblock not found");
        const d = new Date(input.blockDate);
        const dn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getUTCDay()];
        const { id: _id, createdAt: _c, ...copy } = src as any;
        copy.blockDate = input.blockDate;
        copy.dayName = dn;
        copy.label = `${dn} ${input.blockDate.slice(5)} — ${src.merchant || "Flex"}`;
        const res = await db.createTimeblock(copy);
        return { success: true, id: res.id };
      }),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteTimeblock(input.id);
        return { success: true };
      }),
  }),

  driverTimeblocks: router({
    list: publicProcedure.query(() => db.listDriverTimeblocks()),
    assign: publicProcedure
      .input(
        z.object({
          driverId: z.number(),
          timeblockId: z.number(),
          assignmentStatus: z.enum(["Signed Up", "Scheduled"]).default("Signed Up"),
          notes: z.string().max(500).optional(),
        })
      )
      .mutation(async ({ input }) => {
        await db.assignDriverTimeblock(input as any);
        return { success: true };
      }),
    remove: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.removeDriverTimeblock(input.id);
        return { success: true };
      }),
    updateStatus: publicProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["Signed Up", "Scheduled"]),
        })
      )
      .mutation(async ({ input }) => {
        await db.updateDriverTimeblockStatus(input.id, input.status);
        return { success: true };
      }),
  }),

  routes: router({
    list: publicProcedure.query(() => db.listRoutes()),
    listZones: publicProcedure.query(() => db.listAllRouteZones()),
    update: publicProcedure
      .input(
        z.object({
          id: z.number(),
          bookingType: z.enum(["Direct", "Flex"]).optional(),
          merchant: z.enum(["LAF", "BC", "SMC", "SMR"]).optional(),
          driverId: z.number().nullable().optional(),
          stops: z.number().optional(),
          estDuration: z.number().optional(),
          estMileage: z.union([z.string(), z.number()]).optional(),
          estRouteFee: z.union([z.string(), z.number()]).optional(),
          estDriverPay: z.union([z.string(), z.number()]).optional(),
          estMileagePay: z.union([z.string(), z.number()]).optional(),
          estPlatformFee: z.union([z.string(), z.number()]).optional(),
          payFloorOverride: z.union([z.string(), z.number()]).nullable().optional(),
          payMaxOverride: z.union([z.string(), z.number()]).nullable().optional(),
          holidayPerStopSurcharge: z.union([z.string(), z.number()]).optional(),
          driverBonus: z.union([z.string(), z.number()]).optional(),
          status: z.enum(["Budgeted", "Planned", "Confirmed", "Processed", "Routed", "Completed"]).optional(),
          notes: z.string().optional(),
          // Planned (Routed stage)
          plannedMileage: z.union([z.string(), z.number()]).nullable().optional(),
          plannedDuration: z.number().nullable().optional(),
          plannedDriverPay: z.union([z.string(), z.number()]).nullable().optional(),
          driverApproved: z.number().optional(),
          // Actual (Completed stage)
          actualStops: z.number().nullable().optional(),
          actualStopsReturned: z.number().nullable().optional(),
          actualMileage: z.union([z.string(), z.number()]).nullable().optional(),
          actualDuration: z.number().nullable().optional(),
          actualDriverPay: z.union([z.string(), z.number()]).nullable().optional(),
          completionNotes: z.string().nullable().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...rest } = input;
        const numericIntKeys = new Set([
          "stops",
          "estDuration",
          "driverId",
          "plannedDuration",
          "driverApproved",
          "actualStops",
          "actualStopsReturned",
          "actualDuration",
        ]);
        const passthroughKeys = new Set(["status", "notes", "completionNotes", "bookingType", "merchant"]);
        const data: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(rest)) {
          if (v === undefined) continue;
          if (numericIntKeys.has(k) || passthroughKeys.has(k)) {
            data[k] = v;
          } else {
            data[k] = v === null ? null : String(v);
          }
        }
        await db.updateRoute(id, data);
        return { success: true };
      }),
    reviewKeep: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.reviewKeepPlanned(input.id);
        return { success: true };
      }),
    reviewApply: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.reviewApplyEstimate(input.id);
        return { success: true };
      }),
    history: publicProcedure
      .input(z.object({ routeId: z.number() }))
      .query(({ input }) => db.listRouteHistory(input.routeId)),
    setZones: publicProcedure
      .input(
        z.object({
          routeId: z.number(),
          zones: z.array(z.object({ zoneId: z.number(), taskCount: z.number() })),
        })
      )
      .mutation(async ({ input }) => {
        await db.setRouteZones(input.routeId, input.zones);
        return { success: true };
      }),
    recalculate: publicProcedure.mutation(async () => {
      await db.recalculateAllRoutes();
      return { success: true };
    }),
  }),

  wodely: router({
    testAuth: publicProcedure.query(() => testAuth()),
    lastSync: publicProcedure.query(() => db.getWodelyLastSync()),
    syncConfirmed: publicProcedure.mutation(async () => {
      const startIso = "2026-04-28T00:00:00.000Z";
      const endIso = "2026-05-19T23:59:59.999Z";
      const tasks = await fetchConfirmedOrders(startIso, endIso);
      const agg = aggregateByDate(tasks);
      const forecast = await db.listDailyForecast();
      let updated = 0;
      for (const row of forecast) {
        const d = row.forecastDate;
        const key = d instanceof Date
          ? `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
          : String(d).slice(0, 10);
        const counts = agg[key];
        if (counts) {
          await db.updateDailyForecast(row.id, {
            lafConfirmed: counts.laf,
            bcConfirmed: counts.bc,
          });
          updated += 1;
        }
      }
      // Cache per-task fees so routes can compute confirmed revenue
      await db.cacheWodelyTasks(tasks);
      // Recalculate all routes so blended fees reflect latest sync
      await db.recalculateAllRoutes();
      const lastSyncedAt = await db.setWodelyLastSync({
        syncedDates: updated,
        totalTasks: tasks.length,
      });
      return { success: true, syncedDates: updated, totalTasks: tasks.length, lastSyncedAt };
    }),
  }),

  profitability: router({
    rollup: publicProcedure.query(() => db.getProfitabilityRollup()),
  }),

  wodelyAdjustments: router({
    list: publicProcedure.query(() => db.listWodelyAdjustments()),
  }),

  snapshots: router({
    list: publicProcedure.query(() => db.listSnapshotRuns()),
    getRows: publicProcedure
      .input(z.object({ runId: z.number() }))
      .query(({ input }) => db.getSnapshotRows(input.runId)),
    capture: publicProcedure
      .input(z.object({ label: z.string().optional() }).optional())
      .mutation(async ({ input }) => {
        const result = await db.captureSnapshot("manual", input?.label);
        return { success: true, ...result };
      }),
  }),

  // Scheduled-task entrypoint for daily auto snapshot. Open to any signed-in user
  // (scheduled tasks run with role="user").
  scheduled: router({
    dailySnapshot: protectedProcedure.mutation(async () => {
      const result = await db.captureSnapshot("auto", `auto-${new Date().toISOString().slice(0, 10)}`);
      return { success: true, ...result };
    }),
  }),

  merchantShare: router({
    // --- Admin
    listTokens: publicProcedure.query(() => db.listShareTokens()),
    createToken: publicProcedure
      .input(z.object({ merchant: z.enum(["LAF", "BC", "SMC", "SMR"]), label: z.string().optional() }))
      .mutation(async ({ input }) => {
        const token = await db.createShareToken(input.merchant, input.label);
        return { success: true, token };
      }),
    revokeToken: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.revokeShareToken(input.id);
        return { success: true };
      }),
    // --- Public (token-gated)
    view: publicProcedure
      .input(z.object({ token: z.string(), startDate: z.string() }))
      .query(async ({ input }) => {
        const tokenRow = await db.getShareTokenRow(input.token);
        if (!tokenRow || tokenRow.revokedAt) {
          throw new Error("Share link is invalid or revoked");
        }
        await db.touchShareToken(tokenRow.id);

        // Derive Mon–Sat week from startDate
        const d = new Date(input.startDate + "T00:00:00Z");
        const dow = d.getUTCDay(); // 0 Sun .. 6 Sat
        const mondayOffset = dow === 0 ? -6 : 1 - dow;
        const monday = new Date(d);
        monday.setUTCDate(monday.getUTCDate() + mondayOffset);
        const saturday = new Date(monday);
        saturday.setUTCDate(saturday.getUTCDate() + 5);
        const toIso = (x: Date) =>
          `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, "0")}-${String(x.getUTCDate()).padStart(2, "0")}`;
        const weekStartIso = toIso(monday);
        const weekEndIso = toIso(saturday);

        // Current-week boundary: any date <= today is read-only snapshot
        const today = new Date();
        const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

        const forecastRows = await db.listForecastByDateRange(weekStartIso, weekEndIso);
        const routes = await db.listRoutes();
        const timeblocks = await db.listTimeblocks();
        const tbDate = new Map<number, string>();
        for (const tb of timeblocks) {
          const v = tb.blockDate as any;
          const iso = v instanceof Date
            ? toIso(v)
            : String(v).slice(0, 10);
          tbDate.set(tb.id, iso);
        }
        // Build a per-day capacity map segmented by merchant
        const byDay = new Map<string, { lafCap: number; bcCap: number; smcCap: number; smrCap: number; flexCap: number }>();
        for (const r of routes) {
          const iso = tbDate.get(r.timeblockId);
          if (!iso) continue;
          if (iso < weekStartIso || iso > weekEndIso) continue;
          let cap = byDay.get(iso);
          if (!cap) { cap = { lafCap: 0, bcCap: 0, smcCap: 0, smrCap: 0, flexCap: 0 }; byDay.set(iso, cap); }
          const stops = r.stops || 0;
          if (r.bookingType === "Flex") cap.flexCap += stops;
          else if (r.merchant === "LAF") cap.lafCap += stops;
          else if (r.merchant === "BC") cap.bcCap += stops;
          else if (r.merchant === "SMC") cap.smcCap += stops;
          else if (r.merchant === "SMR") cap.smrCap += stops;
        }

        const merchant = tokenRow.merchant as "LAF" | "BC" | "SMC" | "SMR";

        // Compose Mon–Sat day rows
        const days: Array<{
          date: string;
          dayName: string;
          isPast: boolean;
          isEditable: boolean;
          budget: number;
          forecast: number;
          confirmed: number;
          capacity: number;
          remaining: number;
          note: string;
          noteUpdatedBy: string | null;
        }> = [];
        for (let i = 0; i < 6; i++) {
          const cur = new Date(monday);
          cur.setUTCDate(cur.getUTCDate() + i);
          const iso = toIso(cur);
          const dayName = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i];
          const isPast = iso < todayIso;
          // Editable iff this week starts AFTER today (strictly future weeks) AND merchant has forecast fields (LAF/BC).
          const weekStartsAfterToday = weekStartIso > todayIso;
          const hasForecast = merchant === "LAF" || merchant === "BC";
          const isEditable = weekStartsAfterToday && hasForecast && !isPast;

          const fcRow = forecastRows.find((f: any) => toIso(f.forecastDate) === iso);
          let budget = 0, forecast = 0, confirmed = 0;
          if (fcRow) {
            if (merchant === "LAF") {
              budget = fcRow.laf2026Goal ?? 0;
              forecast = fcRow.lafReforecast ?? fcRow.laf2026Goal ?? 0;
              confirmed = fcRow.lafConfirmed ?? 0;
            } else if (merchant === "BC") {
              budget = fcRow.bc2026Goal ?? 0;
              forecast = fcRow.bcReforecast ?? fcRow.bc2026Goal ?? 0;
              confirmed = fcRow.bcConfirmed ?? 0;
            }
          }
          const dayCap = byDay.get(iso);
          const mFlex = dayCap?.flexCap ?? 0;
          const capDirect =
            merchant === "LAF" ? (dayCap?.lafCap ?? 0)
            : merchant === "BC" ? (dayCap?.bcCap ?? 0)
            : merchant === "SMC" ? (dayCap?.smcCap ?? 0)
            : (dayCap?.smrCap ?? 0);
          const capacity = capDirect + mFlex;
          const note = await db.getMerchantDayNote(merchant, iso);
          days.push({
            date: iso,
            dayName,
            isPast,
            isEditable,
            budget,
            forecast,
            confirmed,
            capacity,
            remaining: Math.max(0, capacity - Math.max(forecast, confirmed)),
            note: note?.note ?? "",
            noteUpdatedBy: note?.updatedBy ?? null,
          });
        }

        return {
          merchant,
          label: tokenRow.label,
          weekStart: weekStartIso,
          weekEnd: weekEndIso,
          isCurrentWeek: weekStartIso <= todayIso && todayIso <= weekEndIso,
          isFutureWeek: weekStartIso > todayIso,
          isPastWeek: weekEndIso < todayIso,
          hasForecast: merchant === "LAF" || merchant === "BC",
          days,
        };
      }),
    getStats: publicProcedure
      .input(z.object({ token: z.string(), startDate: z.string() }))
      .query(async ({ input }) => {
        const tokenRow = await db.getShareTokenRow(input.token);
        if (!tokenRow || tokenRow.revokedAt) throw new Error("Invalid or revoked share link");
        if (!(tokenRow.merchant === "LAF" || tokenRow.merchant === "BC")) {
          return { stats: [] as any[], hasForecast: false };
        }
        const d = new Date(input.startDate + "T00:00:00Z");
        const dow = d.getUTCDay();
        const mondayOffset = dow === 0 ? -6 : 1 - dow;
        const monday = new Date(d);
        monday.setUTCDate(monday.getUTCDate() + mondayOffset);
        const sat = new Date(monday);
        sat.setUTCDate(sat.getUTCDate() + 5);
        const toIso = (x: Date) => `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, "0")}-${String(x.getUTCDate()).padStart(2, "0")}`;
        const stats = await db.getMerchantShareStats(
          tokenRow.merchant as "LAF" | "BC",
          toIso(monday),
          toIso(sat),
        );
        return { stats, hasForecast: true };
      }),
    confirmWeek: publicProcedure
      .input(z.object({ token: z.string(), startDate: z.string() }))
      .mutation(async ({ input }) => {
        const tokenRow = await db.getShareTokenRow(input.token);
        if (!tokenRow || tokenRow.revokedAt) throw new Error("Invalid or revoked share link");
        if (!(tokenRow.merchant === "LAF" || tokenRow.merchant === "BC")) {
          throw new Error(`${tokenRow.merchant} uses ad-hoc delivery, no forecast to confirm`);
        }
        const today = new Date();
        const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        const d = new Date(input.startDate + "T00:00:00Z");
        const dow = d.getUTCDay();
        const mondayOffset = dow === 0 ? -6 : 1 - dow;
        const monday = new Date(d);
        monday.setUTCDate(monday.getUTCDate() + mondayOffset);
        const sat = new Date(monday);
        sat.setUTCDate(sat.getUTCDate() + 5);
        const toIso = (x: Date) => `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, "0")}-${String(x.getUTCDate()).padStart(2, "0")}`;
        const mondayIso = toIso(monday);
        const satIso = toIso(sat);
        if (mondayIso <= todayIso) {
          throw new Error("Only future weeks can be confirmed");
        }
        await db.touchShareToken(tokenRow.id);
        const result = await db.confirmShareWeek(
          tokenRow.merchant as "LAF" | "BC",
          mondayIso,
          satIso,
        );
        try {
          await notifyOwner({
            title: `${tokenRow.merchant} confirmed week ${mondayIso}`,
            content: `${tokenRow.label || tokenRow.merchant} confirmed forecast for ${mondayIso} – ${satIso}. ${result.updated} day(s) updated. Re-edits remain allowed.`,
          });
        } catch (err) {
          console.warn("notifyOwner failed:", err);
        }
        return { success: true, updated: result.updated };
      }),
    setForecast: publicProcedure
      .input(z.object({
        token: z.string(),
        date: z.string(),
        forecast: z.number().min(0),
      }))
      .mutation(async ({ input }) => {
        const tokenRow = await db.getShareTokenRow(input.token);
        if (!tokenRow || tokenRow.revokedAt) throw new Error("Invalid or revoked share link");
        if (!(tokenRow.merchant === "LAF" || tokenRow.merchant === "BC")) {
          throw new Error(`${tokenRow.merchant} uses ad-hoc delivery, no forecast to set`);
        }
        // Guard: only allow edits for future weeks (strictly after today)
        const today = new Date();
        const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        const d = new Date(input.date + "T00:00:00Z");
        const dow = d.getUTCDay();
        const mondayOffset = dow === 0 ? -6 : 1 - dow;
        const monday = new Date(d);
        monday.setUTCDate(monday.getUTCDate() + mondayOffset);
        const mondayIso = `${monday.getUTCFullYear()}-${String(monday.getUTCMonth() + 1).padStart(2, "0")}-${String(monday.getUTCDate()).padStart(2, "0")}`;
        if (mondayIso <= todayIso) {
          throw new Error("Current and past weeks are read-only");
        }
        await db.touchShareToken(tokenRow.id);
        const forecastRows = await db.listForecastByDateRange(input.date, input.date);
        if (forecastRows.length === 0) throw new Error("No forecast row for that date");
        const row = forecastRows[0];
        const patch: any = {};
        if (tokenRow.merchant === "LAF") patch.lafReforecast = input.forecast;
        else if (tokenRow.merchant === "BC") patch.bcReforecast = input.forecast;
        await db.updateDailyForecast(row.id, patch);
        return { success: true };
      }),
    setNote: publicProcedure
      .input(z.object({
        token: z.string(),
        date: z.string(),
        note: z.string().max(500),
      }))
      .mutation(async ({ input }) => {
        const tokenRow = await db.getShareTokenRow(input.token);
        if (!tokenRow || tokenRow.revokedAt) throw new Error("Invalid or revoked share link");
        await db.touchShareToken(tokenRow.id);
        await db.upsertMerchantDayNote(
          tokenRow.merchant as any,
          input.date,
          input.note || null,
          tokenRow.label || tokenRow.merchant,
        );
        return { success: true };
      }),
  }),

  driverSignup: router({
    // Public list of timeblocks within sign-up window + drivers (so a driver can pick themselves)
    timeblocks: publicProcedure.query(() => db.listSignupTimeblocks()),
    drivers: publicProcedure.query(() => db.listDrivers()),
    listAssignments: publicProcedure.query(() => db.listDriverTimeblocks()),
    create: publicProcedure
      .input(
        z.object({
          driverId: z.number(),
          timeblockId: z.number(),
          notes: z.string().max(500).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const result = await db.createDriverSignup(input);
        try {
          await notifyOwner({
            title: `Driver signed up for timeblock #${input.timeblockId}`,
            content: `Driver #${input.driverId} signed up.${input.notes ? ` Notes: ${input.notes}` : ""}`,
          });
        } catch (err) {
          console.warn("notifyOwner failed:", err);
        }
        return result;
      }),
  }),

  settings: router({
    get: publicProcedure.query(() => db.getGlobalSettings()),
    update: publicProcedure
      .input(
        z.object({
          driverPayPct: z.string().optional(),
          mileagePayPerMile: z.string().optional(),
          mileageThreshold: z.string().optional(),
          platformFeePct: z.string().optional(),
          holidaySurchargePerStop: z.string().optional(),
          holidaySurchargeEnabled: z.boolean().optional(),
          targetDwellMinutes: z.string().optional(),
          travelTimeSource: z.enum(["2026", "lastYear", "sixtyDay"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        await db.updateGlobalSettings(input);
        await db.recalculateAllRoutes();
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
