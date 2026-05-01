import { fetchConfirmedOrders } from "../server/wodely";

const tasks = await fetchConfirmedOrders(
  "2026-04-28T00:00:00.000Z",
  "2026-05-19T23:59:59.999Z"
);
console.log(`total tasks fetched: ${tasks.length}`);

// Group by statusId/statusDesc
const byStatus = new Map<string, number>();
for (const t of tasks) {
  const k = `${t.statusId}|${t.statusDesc}`;
  byStatus.set(k, (byStatus.get(k) ?? 0) + 1);
}
console.log("\nstatus distribution:");
for (const [k, v] of [...byStatus.entries()].sort()) {
  console.log(`  ${k}: ${v}`);
}

// Sample one of each
console.log("\nfirst sample of each status:");
const seen = new Set<string>();
for (const t of tasks) {
  if (seen.has(String(t.statusId))) continue;
  seen.add(String(t.statusId));
  console.log(
    JSON.stringify({
      id: t.id,
      statusId: t.statusId,
      statusDesc: t.statusDesc,
      typeDesc: t.typeDesc,
      merchantId: t.merchantId,
      afterDateTime: t.afterDateTime,
      completedDateTime: t.completedDateTime,
      deliveryFee: t.deliveryFee,
    })
  );
}

// Filter to today (NY-local 2026-05-01) and group
console.log("\ntoday (2026-05-01 NY) breakdown:");
const todayBC: typeof tasks = [];
const todayLAF: typeof tasks = [];
for (const t of tasks) {
  if (!t.afterDateTime) continue;
  const local = new Date(t.afterDateTime).toLocaleDateString("en-CA", {
    timeZone: "America/New_York",
  });
  if (local === "2026-05-01") {
    if (t.merchantId === "09cc8b76-6b54-4995-b136-a5dea3f0656a") todayLAF.push(t);
    else todayBC.push(t);
  }
}
console.log(`  LAF total: ${todayLAF.length}`);
for (const t of todayLAF)
  console.log(`    ${t.id} status=${t.statusId} (${t.statusDesc}) fee=${t.deliveryFee}`);
console.log(`  BC total: ${todayBC.length}`);
for (const t of todayBC)
  console.log(`    ${t.id} status=${t.statusId} (${t.statusDesc}) fee=${t.deliveryFee}`);

process.exit(0);
