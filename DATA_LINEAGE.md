# Data Lineage & Calculation Reference

This document explains, for the M-Day 2026 Planner, where every visible number on the **Profitability**, **Routes**, and **Dashboard** pages comes from, how routes are created, and how recalculation rolls everything up. It mirrors the implementation in `server/db.ts` (calculation engine) and `server/routers.ts` (tRPC surface).

---

## 1. Source Tables (the four inputs)

The planner derives every dollar figure from four primary sources. Nothing else is authoritative.

| Source | Purpose | Where it comes from |
|---|---|---|
| `zone_metrics` | Per-zone fee, distance, and travel time (the priced unit of work) | Manually maintained via the **Zone Metrics** page |
| `timeblocks` | The schedulable shift on a date (merchant, pickup window, mileage rate, pay floor/max, target route count) | Manually maintained via the **Timeblocks** page |
| `routes` (+ `route_zones`) | Each placeholder or actual route, with stop count and zone mix | Seeded from timeblocks; status-promoted by Wodely sync |
| `wodely_task_cache` | Per-task fees and counts confirmed by Wodely (the merchant's order system) | Hydrated by the **Sync from Wodely** button |

Two secondary sources participate when the relevant feature is in use:

> `zone_task_history_2025` provides last-year actuals used by Daily Planning, the Merchant Share calculator's "LY M-Day same-DOW" column, and the per-route Reference Forecast panel introduced in v34. `global_settings` stores the platform-wide constants (driver pay percent, platform fee percent, mileage rate, mileage threshold, last-sync timestamp). **Important: `holiday differential` and `driver bonus` are NOT in `global_settings` — they are stored only on the `routes` row (`holidayPerStopSurcharge`, `driverBonus`) and default to 0. There is no global fallback. If you want a holiday differential on a route, set it on that route's row; otherwise it does not apply.**

---

## 2. How Routes Are Created

Routes enter the system through four deterministic paths, in order of how often they fire in practice.

### 2.0 Manual creation (NEW as of v34)
The **Routes** page exposes a **+ New Route** button that calls `trpc.routes.create({ timeblockId, merchant, bookingType?, driverId?, stops?, notes? })`. The endpoint generates a unique `routeCode` (`<merchant>-<timeblockId>-<rand4>`), inserts the row with `status="Budgeted"`, and triggers a recalculation pass. Use this whenever a new timeblock fills up faster than the seed assumed.

### 2.1 Initial seed (one-time, per timeblock)
When a timeblock is created or duplicated, the planner expects one **placeholder route per `targetRoutes`** to exist for that block. Seed rows are inserted directly into the `routes` table at setup time (via the seed/import script that built the M-Day window). Each row carries `timeblockId`, a `merchant`, a `bookingType`, an initial `stops` value, and `status="Budgeted"`. The `route_zones` join table records which zones the route is expected to serve and how many stops fall in each zone.

### 2.2 Edits via the Routes page
The **Routes** page is the live editing surface. `trpc.routes.update` accepts patches to roughly any field on a route — `merchant`, `bookingType`, `driverId`, `stops`, `status`, the per-route `holidayPerStopSurcharge` and `driverBonus`, planned and actual fields, and notes. **Crucially, mutating any of `stops`, `driverId`, `status`, `payFloorOverride`, `payMaxOverride`, `holidayPerStopSurcharge`, or `driverBonus` automatically retriggers `recalculateAllRoutes()`** so the dollar fields stay consistent.

### 2.3 Status promotion via Wodely sync
Pressing **Sync from Wodely** on the Dashboard pulls confirmed task counts and per-task fees for the M-Day window. The sync writes to `wodely_task_cache` and updates `global_settings` with `lastSyncedAt`. The next recalc reads the cache and folds confirmed fees into each route's fee. Routes themselves are not duplicated by sync; sync only changes the *fee mode* (see §3.1).

---

## 3. Calculation Engine — `recalculateAllRoutes()`

Every dollar field on a route is derived. The engine runs on every triggering edit (§2.2) and on demand from `Settings → Recalculate`. The following walks through one route, top to bottom, exactly as the engine does it.

Constants from `global_settings` (defaults shown if unset):

| Constant | Default | Purpose |
|---|---|---|
| `driverPayPct` | `0.75` | Share of route fee paid to the driver |
| `platformFeePct` | `0.10` | Share of route fee retained by the platform |
| `mileagePayPerMile` | `$0.50` | Per-mile reimbursement above the threshold |
| `mileageThreshold` | `30 mi` | Free miles before mileage pay applies |
| `holidaySurchargeEnabled` / `holidaySurchargePerStop` | toggle / `$` | Global holiday surcharge fallback |

### 3.1 Baseline fee, miles, and travel time
For each `route_zones` row attached to the route, the engine looks up the zone in `zone_metrics` and accumulates:

> `baselineFee += zoneFee × taskCount` (using `lafFee2026` for LAF, `bcFee2026` for BC)
> `miles += distance2026 × taskCount`
> `travelMinutes += zoneTravelTime × taskCount` (the resolved travel-time field per the zone's `travelTimeSource`)

If the zones don't cover all `stops`, the remainder is filled at the average zone travel time (or 8 minutes per stop if no zones are assigned). The driver's `timePerStopDiff` (extra minutes per stop for new drivers) is added on top.

### 3.2 Confirmed fees from Wodely
For the route's `(merchant, deliveryDate)`, the engine reads the day's aggregate Wodely fees from `wodely_task_cache`. It computes that route's share of the day's total stops, multiplies it by the day's confirmed total fee, and decides a **fee mode**:

| Fee Mode | Trigger | Fee Used |
|---|---|---|
| `locked` | Route is `Routed`/`Completed`, **or** confirmed task count for this route ≥ `stops` | Route's share of Wodely-confirmed fees |
| `blended` | Some Wodely confirmations exist, but fewer than `stops` | Wodely portion + `baselineFee/stops × remainingStops` for the not-yet-confirmed remainder |
| `baseline` | No Wodely data for this route's day | `baselineFee` straight through |

### 3.3 Holiday differential (per route, override-or-global)
After fee mode is picked, the engine adds a holiday differential.

> If the route's own `holidayPerStopSurcharge > 0`, `fee += routeHolidayPerStop × stops` and the global surcharge is **ignored** for that route.
> Otherwise, if `holidaySurchargeEnabled` is on globally, `fee += globalHolidayPerStop × stops`.

This is the answer to the original question: holiday differential lives on the route. The global setting is a fallback, not an override.

### 3.4 Driver pay (with per-route bonus, then floor/max)
> `driverPay = fee × driverPayPct`
> `driverPay += route.driverBonus` (additive, after percent, before clamping)

Then the engine clamps:

> `floor = route.payFloorOverride ?? timeblock.minPayFloor`
> `max = route.payMaxOverride ?? timeblock.maxPayFloor`
> If `driverPay < floor`, raise to `floor`. If `driverPay > max`, lower to `max`.

### 3.5 Mileage pay and platform fee
> `mileagePay = max(0, miles − mileageThreshold) × mileagePayPerMile`
> `platformFee = fee × platformFeePct`

### 3.6 Persisted estimate fields
The engine writes the result to the route as `estRouteFee`, `estDriverPay`, `estMileagePay`, `estPlatformFee`, `estMileage`, `estDuration`, and `feeMode`. **These are the post-recalc, "clean" numbers — the holiday differential is already inside `estRouteFee`, and the per-route bonus is already inside `estDriverPay`.** Every downstream view consumes those fields, never the raw bonus/holiday columns plus the fees, so there is no double-count.

### 3.7 Drift detection (Routed / Completed)
If a route is `Routed` (i.e. `plannedLockedAt` is set) and the freshly computed estimate diverges from the planned snapshot — pay by more than $0.50, mileage by more than 0.5 mi, or duration by more than 2 minutes — the engine sets `needsReview = 1` and appends a `review_flagged` event to `route_history` with the reasons. This is what powers the "Review needed" badge on the Routes page; **Keep planned** and **Apply estimate** clear it.

---

## 4. Profitability Page — Field-by-Field Sources

The Profitability page calls one tRPC procedure: `profitability.rollup`. Every value on the page comes out of that single call.

### 4.1 Per-day row
For each route on a given delivery date (joined through `timeblocks.blockDate`):

| Column on page | Formula | Source |
|---|---|---|
| Routes | count of routes on that day | `routes` |
| Stops | sum of `stops` | `routes.stops` |
| Revenue | sum of `estRouteFee` | post-recalc field on `routes` |
| Holiday Diff (display only) | sum of `holidayPerStopSurcharge × stops` | informational; already inside Revenue |
| Driver Pay | sum of `estDriverPay` | post-recalc; includes bonus |
| Bonus (display only) | sum of `driverBonus` | informational; already inside Driver Pay |
| Mileage | sum of `estMileagePay` | post-recalc |
| Platform | sum of `estPlatformFee` | post-recalc |
| **Net Margin** | `Revenue − Driver Pay − Mileage − Platform` | derived in the rollup |

The Holiday Diff and Bonus columns are surfaced **for visibility only** — they are not subtracted again because they are already absorbed into Revenue and Driver Pay respectively. The Net Margin formula on the page therefore matches the engine's persisted fields exactly.

### 4.2 Weekly totals
Days are grouped Monday-to-Sunday (`weekStart` is the Monday of the row's date). Each week sums its constituent days field-by-field, including margin, so the week total equals the sum of day margins.

### 4.3 Top-of-page totals
The summary cards sum every day in the window. Two invariants enforced by `server/sprint.test.ts`:

> Sum of day margins == top-level `totals.margin` (within $0.01)
> Sum of week margins == top-level `totals.margin` (within $0.01)

If those ever drift, the test fails — meaning a recalc bug shipped, not a display bug.

---

## 5. Routes Page — Field-by-Field Sources

The Routes page table reads `trpc.routes.list` (raw `routes` table joined with timeblock label) and writes via `trpc.routes.update`.

| Column | Source | Editable? |
|---|---|---|
| Date / Day / Block | `timeblocks.blockDate`, `timeblocks.label` | No (edit on Timeblocks page) |
| Merchant | `routes.merchant` | Yes (recalc) |
| Booking Type | `routes.bookingType` | Yes |
| Driver | `routes.driverId` (joined to `drivers.name`) | Yes (recalc — driver differential changes duration) |
| Stops | `routes.stops` | Yes (recalc) |
| Fee | `routes.estRouteFee` (post-recalc, includes holiday) | No (derived) |
| Driver Pay | `routes.estDriverPay` (post-recalc, includes bonus, floor/max applied) | No (derived) |
| Mileage | `routes.estMileagePay` | No (derived) |
| Platform | `routes.estPlatformFee` | No (derived) |
| **Holiday $/stop** | `routes.holidayPerStopSurcharge` | **Yes (per route, recalc)** |
| **Driver Bonus** | `routes.driverBonus` | **Yes (per route, recalc)** |
| **Net Margin** | `Fee − Driver Pay − Mileage − Platform` (computed in browser from the four post-recalc fields) | No (derived) |
| Status | `routes.status` | Yes (recalc) |

Pay-floor/max, planned and actual fields, and notes are also editable through the same mutation but are not displayed by default.

---

## 6. Dashboard — Field-by-Field Sources

The Dashboard reads `trpc.forecast.list` for the daily-planning blurb and `trpc.routes.list` for the route capacity columns. The four hero cards show:

| Card | Source |
|---|---|
| 2025 Total Actual | `daily_forecast.lafActual2025 + bcActual2025` summed across the window |
| 2026 Total Goal | `daily_forecast.lafGoal2026 + bcEstimate2026` summed across the window |
| Confirmed Orders | sum of `wodely_task_cache.taskCount` for the window (refreshed by Sync from Wodely) |
| Routes Budgeted | count of `routes` joined to timeblocks inside the window |

The "Last synced" badge reads `global_settings.lastSyncedAt`; the `Sync from Wodely` button writes it after a successful pull.

---

## 7. Round-Trip Example (one route)

Suppose route #42 is for LAF on May 4 with 25 stops, all in zone 602 (`lafFee2026=$8.50`, `distance2026=2 mi`, travel=10 min/stop). The driver is "John (New)" with `timePerStopDiff=2`. Global settings are at defaults. No Wodely confirmations yet. Per-route `holidayPerStopSurcharge=$1.00`, `driverBonus=$25`.

> Baseline fee = $8.50 × 25 = $212.50.
> Miles = 2 × 25 = 50 mi. Travel = (10 + 2) × 25 = 300 min.
> Fee mode = `baseline` (no Wodely yet).
> Holiday differential (per-route override) = $1.00 × 25 = $25 → fee = $237.50.
> Driver pay = $237.50 × 0.75 = $178.13 + $25 bonus = $203.13. Clamped to floor=$150 / max=$250 → $203.13.
> Mileage pay = max(0, 50 − 30) × $0.50 = $10.00.
> Platform fee = $237.50 × 0.10 = $23.75.
> **Net margin = $237.50 − $203.13 − $10.00 − $23.75 = $0.62.**

That's the row you'd see on Profitability for May 4 (assuming this is the only route that day) and on the Routes table.

---

## 8. Test Coverage Backing These Numbers

`server/sprint.test.ts` enforces:

> `profitability.rollup` returns days/weeks/totals with margin invariants holding to the cent.
> Each `weekStart` is a Monday.
> Per-row margin equals `revenue − driverPay − mileagePay − platformFee`.
> A route updated with non-zero `holidayPerStopSurcharge` and `driverBonus` recalculates without breaking the post-recalc invariant, and restoring the original values returns the route to within 5 % of its prior fee/pay.

Additional suites cover `merchantShare.getStats` / `confirmWeek`, the driver sign-up endpoint, Wodely auth and last-sync shape, planner/zone math, and snapshots. The full suite reports **24 passing / 2 legacy skipped**.
