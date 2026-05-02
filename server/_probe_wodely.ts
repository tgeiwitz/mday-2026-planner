import { searchTasks, LAF_MERCHANT_ID } from "./wodely";

(async () => {
  const start = "2026-05-09T00:00:00Z";
  const end   = "2026-05-11T00:00:00Z";
  const r = await searchTasks({ startDateTime: start, endDateTime: end, merchantId: LAF_MERCHANT_ID, taskTypeId: "1", limit: 5 });
  console.log("success=", r.success, "count=", r.data?.length);
  if (r.data?.length) {
    console.log("KEYS:", Object.keys(r.data[0]).sort().join(","));
    console.log("SAMPLE:", JSON.stringify(r.data[0], null, 2));
  }
  // Look across the whole window for a task with route data populated
  const big = await searchTasks({ startDateTime: "2026-05-07T00:00:00Z", endDateTime: "2026-05-11T00:00:00Z", merchantId: LAF_MERCHANT_ID, taskTypeId: "1", limit: 9000 });
  console.log("\nTOTAL=", big.data?.length);
  const withRoute = (big.data || []).filter((t: any) => t.routePlanId || t.routeName || t.routePlanGuid);
  console.log("withRoute=", withRoute.length);
  const sample = (big.data || [])[0];
  if (sample) {
    console.log("ALL KEYS ON SAMPLE:", Object.keys(sample).sort().join(","));
  }
  if (withRoute.length) {
    console.log("WITH-ROUTE SAMPLE:", JSON.stringify(withRoute[0], null, 2));
  } else {
    // Try a different status filter — assigned tasks may have different statusId
    for (const sid of ["10","20","30","40","50"]) {
      const r3 = await searchTasks({ startDateTime: "2026-05-07T00:00:00Z", endDateTime: "2026-05-11T00:00:00Z", merchantId: LAF_MERCHANT_ID, taskTypeId: "1", taskStatusId: sid, limit: 3 });
      console.log(`status=${sid} count=${r3.data?.length || 0}`);
      if (r3.data?.length) {
        const s: any = r3.data[0];
        const routeKeys = Object.keys(s).filter(k => /route|driver|assign|plan/i.test(k));
        console.log(`  route-ish keys: ${routeKeys.join(",")}`);
        if (routeKeys.length) {
          for (const k of routeKeys) console.log(`  ${k} =`, (s as any)[k]);
        }
      }
    }
  }
})();
