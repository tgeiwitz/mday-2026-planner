import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { aggregateByDate, fetchConfirmedOrders, testAuth } from "./wodely";

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
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...rest } = input;
        const data: Record<string, unknown> = { ...rest };
        if (data.timePerStopDiff !== undefined) data.timePerStopDiff = String(data.timePerStopDiff);
        await db.updateDriver(id, data);
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
        })
      )
      .mutation(async ({ input }) => {
        await db.assignDriverTimeblock(input);
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
      return { success: true, syncedDates: updated, totalTasks: tasks.length, lastSyncedAt: new Date().toISOString() };
    }),
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
