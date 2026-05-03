#!/bin/bash
# Verify v46 fix on the live Railway deploy.
# 1. Trigger wodely.syncConfirmed
# 2. Pull forecast.list and routes.wodelyConfirmedSummary
# 3. Compare per-date confirmed counts: dailyForecast.lafConfirmed/bcConfirmed should equal summary.byDateMerchant total per (date|merchant)

set -u
BASE="${BASE:-https://mday-2026-planner-production.up.railway.app}"

echo "==> 1. Triggering wodely.syncConfirmed..."
sync_resp=$(curl -sS -X POST -H "content-type: application/json" -d '{}' "$BASE/api/trpc/wodely.syncConfirmed")
echo "$sync_resp" | head -c 400; echo

echo
echo "==> 2. Fetching forecast.list + routes.wodelyConfirmedSummary..."
fc=$(curl -sS "$BASE/api/trpc/forecast.list")
sm=$(curl -sS "$BASE/api/trpc/routes.wodelyConfirmedSummary")

echo "==> 3. Diffing confirmed counts (dailyForecast vs summary)..."
node -e '
const fc = JSON.parse(process.argv[1]);
const sm = JSON.parse(process.argv[2]);
const fcRows = fc?.result?.data ?? [];
const summary = sm?.result?.data?.byDateMerchant ?? {};
const isoOf = (d) => typeof d === "string" ? d.slice(0,10) : new Date(d).toISOString().slice(0,10);
const fcByKey = {};
for (const r of fcRows) {
  const k = isoOf(r.forecastDate);
  fcByKey[`${k}|LAF`] = Number(r.lafConfirmed) || 0;
  fcByKey[`${k}|BC`] = Number(r.bcConfirmed) || 0;
}
const allKeys = new Set([...Object.keys(fcByKey), ...Object.keys(summary)]);
const sorted = [...allKeys].sort();
console.log("date         merchant fc_count summary  drift");
let driftCount = 0;
for (const k of sorted) {
  const [d, m] = k.split("|");
  const fcCount = fcByKey[k] ?? 0;
  const sumCount = summary[k]?.total ?? 0;
  const drift = fcCount - sumCount;
  if (drift !== 0) driftCount++;
  const flag = drift !== 0 ? `DRIFT ${drift > 0 ? "+" : ""}${drift}` : "";
  console.log(`${d}   ${m.padEnd(8)} ${String(fcCount).padEnd(8)} ${String(sumCount).padEnd(8)} ${flag}`);
}
console.log("---");
console.log(driftCount === 0 ? "PASS — fc and summary agree on all dates" : `FAIL — drift on ${driftCount} (date|merchant) keys`);
' "$fc" "$sm"
