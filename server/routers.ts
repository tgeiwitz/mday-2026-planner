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
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...rest } = input;
        const update: Record<string, string> = {};
        for (const [k, v] of Object.entries(rest)) {
          if (v !== undefined) update[k] = String(v);
        }
        await db.updateZoneMetric(id, update);
        return { success: true };
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
          estRoutePay: z.union([z.string(), z.number()]).optional(),
          estDuration: z.number().optional(),
          bonus: z.union([z.string(), z.number()]).optional(),
          minPayFloor: z.union([z.string(), z.number()]).optional(),
          maxPayFloor: z.union([z.string(), z.number()]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...rest } = input;
        const data: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(rest)) {
          if (v !== undefined) data[k] = typeof v === "number" && k !== "estDuration" ? String(v) : v;
        }
        await db.updateTimeblock(id, data);
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
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...rest } = input;
        const data: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(rest)) {
          if (v !== undefined && k !== "stops" && k !== "estDuration" && k !== "driverId" && k !== "status" && k !== "notes") {
            data[k] = v === null ? null : String(v);
          } else if (v !== undefined) {
            data[k] = v;
          }
        }
        await db.updateRoute(id, data);
        return { success: true };
      }),
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
        })
      )
      .mutation(async ({ input }) => {
        await db.updateGlobalSettings(input);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
