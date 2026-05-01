/**
 * Backfill: for every route currently in the DB with no route_zones rows,
 * run inferZoneMixForRoute and persist the result. Triggers a single recalc
 * at the end. Safe to re-run; no-ops once zones exist.
 */
import { autoAssignZonesAcrossAllRoutes, listRoutes, listAllRouteZones } from "../server/db";

const before = await listAllRouteZones();
console.log("route_zones rows BEFORE:", before.length);

const patched = await autoAssignZonesAcrossAllRoutes();
console.log("routes patched:", patched);

const after = await listAllRouteZones();
console.log("route_zones rows AFTER:", after.length);

const allRoutes = await listRoutes();
let nonZeroMileage = 0;
let nonZeroDuration = 0;
for (const r of allRoutes) {
  if (Number(r.estMileagePay ?? 0) > 0) nonZeroMileage += 1;
  if (Number(r.estDuration ?? 0) > 0) nonZeroDuration += 1;
}
console.log(`routes with estMileagePay>0: ${nonZeroMileage}/${allRoutes.length}`);
console.log(`routes with estDuration>0:   ${nonZeroDuration}/${allRoutes.length}`);

process.exit(0);
