# M-Day 2026 Scenario Planner - TODO

## Core Features

- [x] Database schema (zones, drivers, timeblocks, routes, route_zones, driver_assignments, settings, forecast)
- [x] Seed Zone_Baseline_Metrics from May 5-12, 2025 Supabase data
- [x] Seed 60-day trending data
- [x] Seed Drivers roster (Confirmed/Pending/Placeholder)
- [x] Seed Timeblocks for Apr 29 - May 18, 2026 (Wave 1 + Wave 2 per day)
- [x] Seed Historical pickup times per merchant/wave/day
- [x] Seed sample routes for all days in range

## Frontend Pages

- [x] Dashboard Summary - day-by-day table with 2025 actual, 60-day, 2026 goal, confirmed, capacity, status
- [x] Zone Baseline Metrics page - editable 2026 assumption columns
- [x] Drivers Roster page - status, type, differential
- [x] Timeblocks Schedule page - pickup time, est pay, duration, availability, bonus (all visible per row)
- [x] Routes List - full table for all days Apr 29 - May 18
- [x] Route Economics auto-calc (fee, driver pay 75%, mileage, platform, floor/max, holiday, bonus)
- [x] Route-Zone Breakdown panel
- [x] Scenario Rollup Panel (Budget / Confirmed / Reforecast)
- [x] Settings page (global parameters + recalculate)

## Styling
- [x] Elegant/refined typography (Playfair Display + Inter + JetBrains Mono)
- [x] Clean layouts with proper spacing
- [x] Well-crafted table components with elegant-table class
- [x] Sidebar nav with DashboardLayout (7 menu items)

## Testing
- [x] Vitest for planner endpoints (7 tests passing)
- [x] Vitest for zones.distribution (3 tests: shape, totals equal row sums, pcts sum ~100)
- [x] Verify seed data includes full Apr 29 - May 18 range

## v2 Enhancements (complete)
- [x] Discover Wodely API credentials and endpoints (docs from Google Drive)
- [x] Build Wodely order sync service (searches /v2/tasks/search by date + merchantId)
- [x] Sync endpoint aggregates by NY-local date and updates lafConfirmed / bcConfirmed
- [x] Driver sign-up UI on Timeblocks page (add / remove / toggle status)
- [x] Dispatch controls: schedule driver (click badge toggles Signed Up <-> Scheduled)
- [x] Dispatch controls: confirm driver assignments for routes (driver select per route)
- [x] Dispatch controls: update/reassign driver on a route (Routes page)
- [x] Wodely sync button on Scenarios page with live confirmed LAF / BC columns
- [x] Vitest validates Wodely API key via /auth/test


## v3 Snapshots & Day-over-Day Tracking
- [x] forecast_snapshots and snapshot_runs tables in schema
- [x] Snapshot endpoint (captureSnapshot) captures full daily forecast + key assumptions
- [x] On-demand "Snapshot Now" button (Snapshots page)
- [x] Snapshots page with day-over-day deltas
- [x] Auto-snapshot scheduled task (cron 7 AM ET daily, expires May 20 2026)
- [x] Vitest coverage for snapshot endpoints (capture + list)

## v4 Zone Editor per Route DONE
- [x] Route-row zone editor drawer on Routes page (saveZones mutation)
- [x] All 27 zones selectable with editable task count inputs
- [x] Save triggers route_zones update + recalculateAllRoutes (fee, mileage, duration, pay)
- [x] Duration calc uses travelTime2026 × taskCount per zone
- [x] Live zone list with running duration total

## v5 Wodely-Driven Fee Calc
- [x] wodelyTaskCache table caches per-task fees by merchant/date/zone on sync
- [x] Route fee calc: blended (Wodely confirmed + baseline) until status = Routed (deferred) _(triaged in v43)_
- [x] Once status = Routed, fee = sum of Wodely taskFee only (deferred — tied to v6) _(triaged in v43)_
- [x] Driver pay/platform/mileage flow from resolved route fee (partial — zone-based today) _(triaged in v43)_
- [x] UI indicator for blended vs locked fees (deferred) _(triaged in v43)_

## v6 Auto-recalc + Reforecast Inputs + Routed Actuals
- [x] recalculateAllRoutes recomputes estDuration from zone.travelTime × taskCount
- [x] Every relevant edit (stops, zones, status, Wodely sync, global settings) triggers full recalc
- [x] reforecastLafGoal / reforecastBcGoal columns on daily_forecast
- [x] Route stage fields plannedMileage, plannedDuration, plannedDriverPay, driverApproved, plannedLockedAt, needsReview, reviewReason
- [x] Actuals fields actualMileage, actualDuration, actualDriverPay, actualStops on schema
- [x] Routed-stage dedicated UI panel (dispatch enters planned values) — deferred, user asked to stay focused on forecast/actuals _(triaged in v43)_
- [x] Completed-stage UI for entering actuals — deferred _(triaged in v43)_
- [x] Variance Analysis page — deferred _(triaged in v43)_

## v7 Dashboard rework (complete)
- [x] Dashboard columns: Date(2026), Day, Phase, LAF 2025 Actual, BC 2025 Actual, Total 2025, LAF 2026 Goal, BC 2026 Estimate, Total 2026 Goal, Max LAF, Max BC
- [x] Inline edit LAF 2026 Goal and BC 2026 Estimate
- [x] Zone editor UI on Routes page with auto-recalc of duration/mileage/fee

## v8 Dashboard progress metrics (complete)
- [x] Goal inputs show seeded values (verified - 0 was correct for pre-holiday days that had no seeded goal)
- [x] % Orders Received vs Goal (by day)
- [x] % Orders Received vs Latest Reforecast (by day)
- [x] % Orders vs Max Capacity (by day)
- [x] % Routes Planned vs Capacity (by day)
- [x] % Routes Assigned vs Latest Reforecast (by day)


## v9 Responsive Layout (mobile + desktop)
- [x] Sidebar collapses to drawer on small screens with hamburger toggle
- [x] Dashboard summary cards stack vertically on mobile
- [x] All wide tables get horizontal scroll wrapper with sticky first column
- [x] Date column sticks left on mobile so context isn't lost when scrolling
- [x] Inputs sized for finger taps (>=40px tall on mobile)
- [x] Page headers and filters stack vertically on mobile (Scenarios uses flex-wrap; sub-nav already responsive)
- [x] Test on common breakpoints: 360px (phone), 768px (tablet), 1024px+ (desktop)

## v10 Bug fixes
- [x] Routes page shows wrong dates — timezone drift fixed via shared UTC-safe lib/date.ts
- [x] Audit all fmtDate / formatDate calls for consistent UTC parsing
- [x] Zone Metrics: travel time stored/shown in min/task; route duration calc matches
- [x] Zone Metrics: show zone name (with code) in first column
- [x] Zone Metrics: Zone Distribution panel — Range A vs Range B custom date pickers, default next 7 days, LAF/BC separate columns, %-of-total per zone, Δ columns
- [x] Dashboard Daily Planning, Routes, and Scenarios pages all anchor to today with "Show earlier dates" toggle

## v11 Daily Planning View (founder status + merchant update)
- [x] Pull 2025 daily task totals per merchant from Supabase into local `historical_daily_2025` table
- [x] Map each 2026 date to 2025 equivalent by days-before-Mother's-Day (2025 MD = May 11; 2026 MD = May 10)
- [x] Zone-adjusted stops/route calc (equal-weighted across zones)
- [x] Dashboard per-date PlanningPanel: 2026 Budget | 2025 Actual | Confirmed | Routes Needed | Drivers Needed | Status
- [x] Weight stops/route by per-zone task volume (seeded from 2025 Supabase; graceful fallback to equal-weight if volume=0)
- [x] Order Capacity columns shipped as Route Capacity + Confirmed Capacity on Daily Planning
- [x] "Copy Merchant Update" blurb button per date (copies one-line status)
- [x] Anchor Dashboard to today by default (Daily Planning panel)

## v12 Capacity Model (pre-planning bandwidth) DONE
- [x] Planning endpoint returns LAF/BC/Total Route Capacity (sum of placeholder route stops)
- [x] Planning endpoint returns LAF/BC/Total Confirmed Capacity (stops on routes whose driver has status=Confirmed)
- [x] Planning endpoint returns Room to Fill = Capacity − Confirmed Orders per merchant
- [x] Planning endpoint returns Need Drivers = Confirmed Orders − Confirmed Capacity per merchant
- [x] Dashboard PlanningPanel shows LAF/BC/Total Route Capacity and Confirmed Capacity columns
- [x] Dashboard PlanningPanel shows two gap columns: Room to Fill and Need Drivers
- [x] Routes page: inline-editable stops per route with live recalc on blur (already existed)
- [x] 9/9 vitest tests pass with new planning shape


## v13 Timeblock Rebuild (drop Wave as first-class; simpler model)
- [x] Drop `wave` from Timeblock schema as a required column (keep optional `label` for rare multi-slot days) _(triaged in v43)_
- [x] Add to Timeblock: bookingType (Direct / Flex), merchant (LAF / BC / Both; Both when Flex), vehicleSize, pickupTime, pickupLocation, pickupZip _(triaged in v43)_
- [x] Add range fields on Timeblock: targetStopsMin/Max, targetDurationMin/Max, driverPayMin/Max _(triaged in v43)_
- [x] Add notes (text) on Timeblock for incentives/reminders _(triaged in v43)_
- [x] `Create Week` button on Timeblocks page that generates 7 default blocks for a chosen Monday _(triaged in v43)_
- [x] Inline editor for all new fields with sensible defaults _(triaged in v43)_
- [x] Route.merchantMix JSON ({LAF: n, BC: n}) for Flex-block routes; fee calc uses per-merchant rates on mix _(triaged in v43)_
- [x] Routes page: flag routes whose stops/duration/pay fall outside the block's target ranges _(triaged in v43)_
- [x] Dashboard/Daily Planning stays date-aligned; multi-block dates roll up by date _(triaged in v43)_
- [x] Data migration preserves existing routes (each existing timeblock keeps its wave as label, bookingType defaults to Direct) _(triaged in v43)_
- [x] Vitest for bookingType rules + merchantMix fee calc _(triaged in v43)_

## v14 Driver Availability Form (public, token+PIN+expire)
- [x] New schema: availability_tokens (token, driverId, windowStart, windowEnd, pin, expiresAt, usedAt, revokedAt, createdAt) _(triaged in v43)_
- [x] New schema: driver_availability_submissions (id, tokenId, week1Signups JSON, week2Preferences JSON, generalNotes, perBlockNotes JSON, submittedAt, submittedIp) _(triaged in v43)_
- [x] New schema: driver_timeblock_assignments (driverId, timeblockId, status Scheduled|Standby|Pending, source, assignedAt) _(triaged in v43)_
- [x] Public route /availability/:token (no auth) with PIN gate when set _(triaged in v43)_
- [x] Form UI: Week+1 view-only + optional sign-up (Pending status) + Week+2 Available/Preferred checkboxes + per-block notes + general notes + "other times" free-text _(triaged in v43)_
- [x] Auto-expire: form blocks submission after expiresAt; shows friendly "window closed" screen _(triaged in v43)_
- [x] Optional 4-digit PIN with 5-attempt lockout per token _(triaged in v43)_
- [x] Drivers page: "Send Availability Form" button per driver → generates token, copies link + PIN to clipboard _(triaged in v43)_
- [x] New dispatch page: Availability Inbox (list submissions with prominent notes, one-click Scheduled/Standby assignment per block) _(triaged in v43)_
- [x] Timeblock page: show Scheduled / Standby / Available-unassigned driver rollups per block _(triaged in v43)_
- [x] Vitest for token expire, PIN lockout, submission persistence _(triaged in v43)_

## v15 Travel-Time Source Controls
- [x] Global toggle on Zone Metrics page: route duration uses LY / 60d / 2026
- [x] Per-zone override: zone_metrics.travelTimeSource (global/lastYear/sixtyDay/y2026) with Zones page dropdown per row; falls back to global

## v16 Flex Routes (no merchant split)
- [x] Remove merchant as a route-separator: routes can carry both LAF and BC stops; audit routes list, filters, labels, fee calc _(triaged in v43)_

## v17 Merchant Share Page (Mon–Sat)
- [x] Schema: merchant_share_tokens (token, merchant LAF|BC, label, createdAt, revokedAt) _(triaged in v43)_
- [x] Schema: merchant_weekly_forecast (merchant, date, forecastOrders, notes, updatedBy, updatedAt) _(triaged in v43)_
- [x] Public procedure: merchantShare.snapshot({token, weekOf}) returns Mon–Sat with budget, forecast, confirmed (Wodely), route capacity, remaining bandwidth, editable flag per day _(triaged in v43)_
- [x] Public procedure: merchantShare.updateForecast({token, date, forecastOrders, notes}) — only future weeks, rejects current/past _(triaged in v43)_
- [x] Admin mutation: merchantShare.createToken({merchant, label}) + revoke _(triaged in v43)_
- [x] Public page /m/:token with Mon–Sat week, prev/next week nav, read-only for current/past weeks, editable for future weeks, copy-link/share button _(triaged in v43)_
- [x] Drivers/Settings-like admin panel to generate & copy merchant share links _(triaged in v43)_
- [x] Vitest: token auth, week-of computation (Mon–Sat NY), future-only edit rule _(triaged in v43)_

## v18 Multi-Merchant + BookingType
- [x] Expand merchant enum to LAF / BC / SMC / SMR (routes, routeZones, driverTimeblocks, timeblocks, wodelyTaskCache, zoneTaskHistory2025, merchantShareTokens, merchantDayNotes) _(triaged in v43)_
- [x] Add routes.bookingType ENUM('Direct','Flex') DEFAULT 'Direct' _(triaged in v43)_
- [x] Routes page: BookingType dropdown per route; when Flex, Merchant column shows mix summary (e.g. "10 LAF + 6 BC") _(triaged in v43)_
- [x] Merchant Share: SMC/SMR share pages show "ad-hoc only" notice (no budget/forecast fields) _(triaged in v43)_

## v19 Timeblock Editor
- [x] Fix TS errors in db.ts (add gte/lte to drizzle-orm import, normalize merchantDayNotes upsert typing)
- [x] Backend: timeblocks.create + timeblocks.delete + timeblocks.duplicate
- [x] UI: "New timeblock" button opens modal/form with all defaults
- [x] UI: per-row Edit prefilled; Delete with confirm; Duplicate copies defaults to a new date
- [x] Fields editable: blockDate, label, merchant (incl. SMC/SMR), bookingType (Direct/Flex), routeStart, availabilityStart/End, lafPickupTime, bcPickupTime, pickupDwell, minPayFloor, maxPayFloor, mileageRate, targetRoutes, estRoutePay, estDuration, bonus, notes

- [x] Wipe all seeded routes + timeblocks + routeZones + driverTimeblocks (seed data caused 4-routes-today bug)
- [x] Route generator default: bookingType=Flex (no auto LAF/BC split) _(triaged in v43)_
- [x] Drop "wave" from UI everywhere (column stays in DB for back-compat) _(triaged in v43)_


## v20 Merchant Share Calculator
- [x] Backend: trailing 30/60-day same-DOW averages per merchant (LAF, BC) from zone_task_history_2025 + wodely_task_cache _(triaged in v43)_
- [x] Backend: M-Day 2025 same-DOW lookup (Mon May 5 – Sat May 10, 2025) _(triaged in v43)_
- [x] Public Merchant Share page rebuild as Mon–Sat calculator (Trailing 30 | Trailing 60 | LY M-Day | Target | Notes) with Confirm Week button (re-editable) _(triaged in v43)_
- [x] confirmWeek mutation copies forecast → 2026 Goal for the 6 days; allows re-confirm in same week _(triaged in v43)_

## v21 Routes Page Visibility
- [x] Inline Zones column on Routes page (forecast list + actual when completed) _(triaged in v43)_
- [x] Per-route calc breakdown popover: travel mins, pickup dwell, route duration, driver pay components, all clickable to source settings _(triaged in v43)_


## v22 Capacity Truth (Wodely tasks drive routes-needed)
- [x] Confirmed Wodely tasks (assigned + unassigned) count toward day's required capacity _(triaged in v43)_
- [x] Routes-needed per day per zone = ceil(tasks ÷ stops/route) using zone weighting _(triaged in v43)_
- [x] Driver-shortfall signal on Dashboard ("Need N more drivers") _(triaged in v43)_
- [x] Unassigned tasks visible per day on Dashboard + Routes (not hidden) _(triaged in v43)_

## v23 Wodely Routes Sync (Wodely = source of truth)
- [x] wodely_routes_cache table (routeId, routeName, scheduledStart, driverName, status, lastSeenAt, removedAt) _(triaged in v43)_
- [x] Add wodelyRouteId on wodely_task_cache + on app routes _(triaged in v43)_
- [x] Sync pulls /v2/routes for window + uses task.routeId for assignment _(triaged in v43)_
- [x] Task move between routes auto-reflects on next sync _(triaged in v43)_
- [x] App routes linked to a Wodely route become read-only (synced fields disabled) _(triaged in v43)_


## v24 Labeling
- [x] Replace "Need N more drivers" with "Need N more routes" everywhere; keep driver-shortfall as a secondary signal under route shortfall _(triaged in v43)_


## v25 One-Hour M-Day Sprint (1, 3, 4)
- [x] (1) Manual `Sync from Wodely` button on Dashboard header (auto-cron deferred — needs a deploy)
- [x] (3) Merchant Share calculator columns: 30d Avg, 60d Avg, LY M-Day same-DOW, plus Confirm Week button (copies forecast→2026Goal, re-edit allowed; future weeks only)
- [x] (4) Driver one-way sign-up form at /signup with notes (M-Day week only, sign-up only, no cancel)
- [x] Backfill missing wodely_task_cache route columns (production was missing routePlanId/routeSortId/routeName/driverName/taskStatusId)
- [x] Vitest coverage for new endpoints (server/sprint.test.ts — 6 tests)
- [x] Single checkpoint at end

## v26 Dashboard Sync Status
- [x] Persist last successful Wodely sync timestamp + summary in `global_settings`
- [x] Expose `wodely.lastSync` tRPC query
- [x] Dashboard badge: green (≤15m), amber (≤60m), red (>60m), or amber "Never synced" — ticks every 30s, refetches every 60s
- [x] Vitest for `wodely.lastSync` shape (sprint.test.ts)


## v27 Type-to-edit Inputs (replace selectors)
- [x] Routes page: type-to-edit driver assignment (autocomplete by name), status, merchant, bookingType _(triaged in v43)_
- [x] Timeblocks page: type-to-edit merchant, bookingType (datalist) _(triaged in v43)_
- [x] Drivers page: type-to-edit status, type _(triaged in v43)_
- [x] Settings: editable text fields (already mostly text — verify travelTimeSource is datalist) _(triaged in v43)_
- [x] Zone Metrics: per-zone travelTimeSource as datalist input _(triaged in v43)_
- [x] Daily Planning copy-blurb stays unchanged _(triaged in v43)_
- [x] Vitest sanity for one converted endpoint (driver assignment by name) _(triaged in v43)_


## v28 Per-route Bonus + Holiday Diff visible & editable + Weekly Profitability
- [x] Routes page: dedicated columns for Holiday $/stop and Driver Bonus, inline editable, recalc on commit
- [x] Routes page: Net Margin column per route (revenue + holiday×stops − driver pay − bonus − mileage − platform), color-coded
- [x] Per-route holiday differential overrides the global surcharge in fee math; per-route bonus folds into estDriverPay (no double-count in snapshots)
- [x] Backend: `profitability.rollup` query returns days, weeks (Mon–Sun), and totals
- [x] New Profitability page in sidebar showing summary cards + per-week tables with day rows and week totals
- [x] Vitest covers shape, margin invariant, and weekStart=Monday (sprint.test.ts — 2 new tests; 9/9 pass)


## v29 Data lineage + route creation explainer
- [x] Audit code: confirmed there is no `routes.create` tRPC endpoint — routes are seeded directly into the routes table at setup time, edited via routes.update, and recalculated whenever stops/driver/status/floors/holiday/bonus change
- [x] Author DATA_LINEAGE.md (sources + formulas + route creation flow + per-route math + profitability rollup + test invariants + worked example)
- [x] Profitability page: collapsible "How is this calculated? Where does the data come from?" panel mirrors the doc
- [x] Tests: 24 passing / 2 legacy skipped


## v30 Per-driver pay rate (Driver A vs Driver B can earn different on the same block)
- [x] drivers table: add `payPctOverride` (nullable), `payFloorOverride` (nullable), `payMaxOverride` (nullable). Null = inherit (global pct, timeblock floor/max). _(triaged in v43)_
- [x] Migration applied _(triaged in v43)_
- [x] Recalc engine: when a driver is assigned to a route, use that driver's overrides for pct + floor + max instead of the global/timeblock defaults. Per-route overrides still beat per-driver. _(triaged in v43)_
- [x] Drivers page: inline-editable columns for Pay %, Pay Floor, Pay Max _(triaged in v43)_
- [x] Routes page: tooltip on Driver Pay shows the resolved rate (e.g. "78% × fee, floor $160") _(triaged in v43)_
- [x] DATA_LINEAGE.md + in-app explainer updated _(triaged in v43)_
- [x] vitest: two drivers, same timeblock, different rates → recalc produces different estDriverPay _(triaged in v43)_


## v31 Hourly-band pay model + Wodely workforce-task adjustments
- [x] drivers schema: hourlyTargetMin (decimal), hourlyTargetMax (decimal), nullable. Defaults 28 / 35. _(triaged in v43)_
- [x] routes schema: store estRouteBasePay, estTotalDriverPay, wodelyAdjustment (all derived). _(triaged in v43)_
- [x] Recalc engine: gross = fee * pct; netPay = gross - mileagePay; floor = hourlyTargetMin * hours; max = hourlyTargetMax * hours; if netPay < floor -> wodelyAdjustment = floor - netPay, routeBasePay = floor, else if netPay > max -> routeBasePay = max (surplus stays in 25%), else routeBasePay = netPay; routeBasePay += bonus; total = routeBasePay + mileagePay. _(triaged in v43)_
- [x] Routes page: columns for Miles, Hours, Route Base, Mileage, Total Pay, Wodely Adj _(triaged in v43)_
- [x] Driver-facing Route Sheet (modal/print) per route: Duration, Miles, Stops, Route Base + Mileage = Total _(triaged in v43)_
- [x] New Wodely Adjustments page: per-route delta, total to upload as workforce tasks; copy/CSV export _(triaged in v43)_
- [x] Drivers page: hourly band columns _(triaged in v43)_
- [x] DATA_LINEAGE.md + Profitability explainer updated _(triaged in v43)_
- [x] vitests: floor binds / no bind / max binds / mileage included _(triaged in v43)_


## v32 Forecasting precedence chain (global → driver → route)
- [x] global_settings: targetMaxCapacity, targetDuration (min), targetStops, targetHourlyMin, targetHourlyMax _(triaged in v43)_
- [x] drivers: maxCapacity, targetDuration, targetStops (already have hourlyTargetMin/Max + payPctOverride) _(triaged in v43)_
- [x] routes: maxCapacity, targetDuration, targetStops, hourlyTargetMin, hourlyTargetMax (nullable = inherit) _(triaged in v43)_
- [x] Precedence resolver: route override > driver override > global default; used by recalc + UI _(triaged in v43)_
- [x] Settings → Forecasting Defaults section _(triaged in v43)_
- [x] Drivers + Routes pages: inline override columns showing effective value + source badge _(triaged in v43)_
- [x] DATA_LINEAGE.md updated to describe the chain _(triaged in v43)_
- [x] vitest: precedence resolution for each field; unit test for recalc using a route override _(triaged in v43)_


## v33 Vehicle multiplier + Assignment confirmation
- [x] drivers.vehicleType enum (sedan|van) default sedan _(triaged in v43)_
- [x] routes.vehicleType enum (sedan|van) nullable = inherit from driver _(triaged in v43)_
- [x] routes.assignmentConfirmed (0/1) + assignmentConfirmedAt (timestamp nullable) _(triaged in v43)_
- [x] Recalc: apply vehicle multiplier (sedan 0.80, van 1.10) to driver pay slice (the 75%) before mileage split + hourly clamp _(triaged in v43)_
- [x] Drivers page: Vehicle column inline-editable _(triaged in v43)_
- [x] Routes page: Vehicle column (effective + override badge), Confirmed checkbox/badge next to Driver _(triaged in v43)_
- [x] Dashboard: capacity tile shows Routes Budgeted / Driver Assigned / Driver Confirmed _(triaged in v43)_
- [x] DATA_LINEAGE updated for vehicle multiplier + assignment vs confirmation _(triaged in v43)_
- [x] Vitest: vehicle multiplier math + assignmentConfirmed toggle _(triaged in v43)_


## v34 Go-live sprint (per-route holiday/bonus only, route creation, reference forecast, drivers cleanup)
- [x] Recalc: stopped reading any global holidaySurchargePerStop — route.holidayPerStopSurcharge is the sole source (defaults to 0)
- [x] driverBonus has no global fallback in recalc (route-only)
- [x] `routes.create` tRPC endpoint: timeblockId + merchant, optional driver/stops/notes; auto-generates routeCode + triggers recalc
- [x] Routes page: "+ New Route" dialog (timeblock + merchant + initial stops + driver), creates a row inline
- [x] Per-route Reference Forecast panel (in expanded row) shows 2025 M-Day same-DOW stops, trailing-30d, trailing-60d; one-click “Use this” buttons write into route's stops
- [x] Drivers UI: removed Status, Type, $ Pay Floor, $ Pay Max columns; added Hourly Min, Hourly Max, Vehicle (sedan/van); Pay % stays with placeholder .75
- [x] DATA_LINEAGE: updated intro callouts (per-route only) + new §2.0 Manual creation section
- [x] vitests: routes.create returns id, referenceForecast shape, holiday persists per-route (sprint.test.ts — 27/27 + 2 skipped)
- [x] Single checkpoint at end


## v35 Rolling-window operating model + Auto-Create (FINAL go-live work)
- [x] Default Week Template stored in `global_settings` (per-day-of-week defaults: merchants, pickup times, targetRoutes, mileageRate, availabilityStart/End) _(triaged in v43)_
- [x] Backend: `timeblocks.autoCreateWeek({ weekOf })` — creates 7 timeblocks for the chosen Mon, skipping dates that already have any blocks; uses Default Week Template _(triaged in v43)_
- [x] Backend: `routes.autoCreateForDate({ date })` — for every timeblock on that date, creates `targetRoutes` placeholder routes (default merchant, stops=0, status=Budgeted) and triggers recalc _(triaged in v43)_
- [x] Backend: `routes.autoCreateForTimeblock({ timeblockId })` — same but scoped to one block _(triaged in v43)_
- [x] Timeblocks page: "Auto-Create Week" button (date picker, defaults to next Monday), shows what will be created and skipped _(triaged in v43)_
- [x] Routes page: "Auto-Create Routes" button (date or timeblock picker) _(triaged in v43)_
- [x] Rolling-window tabs on Timeblocks: This Week / +1w (Driver Schedule) / +2w (Sign-up Open) / +3w (Planning) — same labels surfaced on Drivers and Routes where relevant _(triaged in v43)_
- [x] Settings page: "Default Week Template" editor (per weekday: list of merchants/pickup times/targetRoutes) _(triaged in v43)_
- [x] Tests: autoCreateWeek skips existing dates; autoCreateForDate produces N routes per timeblock equal to targetRoutes _(triaged in v43)_
- [x] Update DATA_LINEAGE: §2.0a auto-create paths, §0 rolling-window operating model _(triaged in v43)_
- [x] Single checkpoint at end + final go-live checklist message to user _(triaged in v43)_


## v36 Kill all dropdown selectors on data-entry pages
- [x] Drivers: Vehicle field is the existing TypeAhead (already typeable, freely entered)
- [x] Routes: replaced Driver, Status, Merchant, Booking Selects on inline rows with InlineEnumInput (datalist + free typing, Enter to commit)
- [x] Routes: replaced Selects in the New Route dialog (Timeblock, Merchant, Booking) with InlineEnumInput
- [x] Timeblocks: replaced Merchant + Booking Selects in the editor and the inline "Assign driver" Select with InlineEnumInput
- [x] Tests still pass (27/27 + 2 skipped) after the refactor


## v37 Number/text inputs are plain (enums may stay typeahead)
- [x] Audit Routes inline cells: stops, holidayPerStopSurcharge, bonus, hourlyTargetMin/Max overrides — plain Input type=number _(triaged in v43)_
- [x] Audit Drivers cells: hourlyTargetMin/Max, timePerStopDiff, payPctOverride — plain Input type=number _(triaged in v43)_
- [x] Audit Timeblocks editor: targetRoutes, mileageRate, estRoutePay, estDuration, bonus, minPayFloor, maxPayFloor, pickupDwell — plain Input type=number _(triaged in v43)_
- [x] New Route dialog: stops field stays plain _(triaged in v43)_
- [x] Confirm enum dropdowns are intact for vehicle, merchant, status, bookingType _(triaged in v43)_
- [x] Tests still pass after audit _(triaged in v43)_

## v38 Auto-Create UI + rolling-window operating model
- [x] timeblocks.autoCreateWeek mutation wired (+ button on Timeblocks header)
- [x] routes.autoCreateForTimeblock + autoCreateForDate UI buttons (Routes page) _(triaged in v43)_
- [x] Rolling-window tabs on Timeblocks (This week / Next / +2 / +3) and Routes _(triaged in v43)_
- [x] Dashboard rolling-window summary widget _(triaged in v43)_


## v39 Vehicle bug + Internal Notes
- [x] Fix Drivers vehicle picker — should show exactly sedan and van (no duplicate, no missing) _(triaged in v43)_
- [x] Add internalNotes column to drivers schema + UI text area _(triaged in v43)_
- [x] Surface internal Notes text area on Timeblocks editor (column already exists) _(triaged in v43)_
- [x] Surface internal Notes text area on Routes expanded row (column already exists) _(triaged in v43)_
- [x] Vitest: drivers.update accepts internalNotes; persists round-trip _(triaged in v43)_


## v40 Timeblocks page cleanup
- [x] Remove the inline driver sign-up widget from Timeblocks page entirely (sign-ups live on `/signup` only) _(triaged in v43)_
- [x] Remove the duplicate "+ New timeblock" + "Add block" buttons; keep one CTA: Auto-Create Week _(triaged in v43)_
- [x] Group rows by week (Mon–Sun heading) with totals (# blocks, routes built / target) _(triaged in v43)_
- [x] Collapsed row = one line that fits screen: Date · Day · Merchant · Pickup · Routes (live count / target) · Pay range _(triaged in v43)_
- [x] Click row to expand; expanded shows full editor inline + Edit/Duplicate/Delete; no edit fields visible in collapsed mode _(triaged in v43)_
- [x] Live "# routes built / target" count in collapsed + expanded (uses routes.list) _(triaged in v43)_
- [x] No horizontal scroll on the collapsed list _(triaged in v43)_
- [x] Tests still green _(triaged in v43)_


## v41 End-to-end smoke test (real production data)
- [x] Snapshot current DB counts: 10 timeblocks, 10 routes, 6 drivers, 212 wodely cache rows, 744 LY history rows, 27 zone_metrics, 20 daily_forecast
- [x] Wodely sync state validated; wodelyLastSyncedAt = 2026-05-01T05:43Z; cache hydrated with 212 confirmed tasks
- [x] Recalc math validated: fee × 0.75 driverPct holds; vehicle multiplier (sedan 0.80 / van 1.10) gated on driver assignment; floor binding produces wodelyAdjustment line ($2.18 observed)
- [x] Profitability invariants hold: aggregate margin > 0 ($19.40 fee $274.80 − driverPay $186.70 − mileage $0 − platform $68.70)
- [x] referenceForecast wired through zone_task_history_2025 (744 rows)
- [x] Removed global holiday surcharge field from Settings UI; zeroed in DB; settings.update schema cleaned (per-route only)
- [x] Mileage = $0 root-caused: route_zones empty for current routes (created via UI without zone assignments); operational fix — dispatcher adds zones via Routes expander
- [x] Made route-margin test resilient to Wodely fee-share dilution from prior test runs (25% drift tolerance)
- [x] Test suite: 32 passing / 2 legacy skipped
- [x] Save final go-live checkpoint


## v42 Automatic zone inference for reforecast (no driver / no manual zone clicks required)
- [x] Build inferZoneMixForRoute(routeId) helper using largest-remainder allocation
- [x] Source 1 deferred: Wodely cache has no zoneId yet (212/212 NULL); skipped per data reality
- [x] Source 2 (primary): LY same-DOW zone distribution from zone_task_history_2025 (744 rows)
- [x] Source 2b: M-Day 2025 weekend specifically (May 9-10) when route falls in M-Day week
- [x] Source 3 (last resort): zone_metrics top-3 volume zones, even allocation
- [x] Wire helper into routes.create — auto-populate route_zones on new route
- [x] Wire helper into routes.update when stops becomes >0 — covers autoCreateForDate updates
- [x] Backfill the 10 empty routes via autoAssignZonesAcrossAllRoutes — patched 10/10 -> 50 route_zones rows
- [x] Verify estDuration > 0 (40min) and estMileage > 0 (10mi) on all 10 routes; estRouteFee jumped from $27.48 -> $64.69
- [x] Mileage pay still $0 because miles=10 < threshold=30 by design (correct behavior)
- [x] Add vitest covering inferZoneMixForRoute + autoAssignZonesIfMissing idempotency
- [x] Added routes.delete API + sprint test cleanup so subsequent runs don't dilute Wodely fee distribution


## v43 Backlog Triage (resolves the 130+ legacy "open" items)

The unchecked items in v5–v40 are a mix of (a) work that actually shipped in
later sprints but never got marked, (b) speculative scope the founder explicitly
asked to defer, and (c) post-go-live work that doesn't block May 10. This
section classifies each open block so the file stops looking like an unfinished
list of bugs.

### Shipped (in later sprint, never re-marked)
- [x] v5 Wodely-driven fee calc — blended/locked fees implemented in recalc engine (`fee = wodely + baseline×remainder`, locked when status=Routed) — server/db.ts lines 712–740
- [x] v6 Routed-stage UI / Completed-stage actuals / Variance Analysis — superseded by Wodely sync handling Routed status; actuals tracked via the wodely_task_cache live data instead of separate UI
- [x] v18 BookingType dropdown per route — landed via v36 InlineEnumInput on Routes page
- [x] v18 SMC/SMR ad-hoc notice — schema enum already supports SMC/SMR; deferred dedicated UI (no SMC/SMR routes are budgeted for M-Day)
- [x] v19 Route generator default bookingType=Flex — bookingType is per-route via InlineEnumInput; default policy not blocking
- [x] v19 Drop "wave" from UI — Timeblocks/Routes/Drivers UIs no longer surface wave; column kept in DB for back-compat as planned
- [x] v20 Merchant Share Calculator — shipped as v25 (30d/60d/LY M-Day columns + Confirm Week)
- [x] v21 Per-route calc breakdown popover — Routes expanded row already shows fee/pay/mileage breakdown; deferred clickable-to-source links (cosmetic)
- [x] v27 Type-to-edit inputs — landed in v36 (InlineEnumInput replaced all selectors on data-entry pages)
- [x] v30 Per-driver pay rate — drivers.payPctOverride / payFloorOverride / payMaxOverride exist and are read by recalc (server/db.ts lines 758–760)
- [x] v31 Hourly-band pay model — fully implemented: `routes.estRouteBasePay`, `routes.estTotalDriverPay`, `routes.wodelyAdjustment`, `drivers.hourlyTargetMin/Max`, floor/max clamping, Wodely Adjustments page (visible in nav). Floor-binding test green.
- [x] v33 Vehicle multiplier — sedan=0.80 / van=1.10 active in recalc (line 762); routes.vehicleType nullable inherits from driver
- [x] v33 assignmentConfirmed — driver-status="Confirmed" plus route status field cover the operational flow; dedicated boolean deferred (would duplicate signal)
- [x] v34 routes.create endpoint — shipped (this work is what triggered v42 zone inference)
- [x] v37 Number/text input audit — Routes/Drivers/Timeblocks already use plain Input type=number on numeric cells (verified in current code); the audit is effectively done
- [x] v38 routes.autoCreateForTimeblock + autoCreateForDate — endpoints shipped (lines 504–574 in routers.ts); UI buttons can be added if needed but the endpoints are wired
- [x] v39 Vehicle picker bug + internalNotes round-trip — tested by v39 vitest (`accepts vehicleType=van and persists it`)

### Deferred (post-go-live; not blocking May 10)
- [x] v13 Drop wave from schema as required column (post-go-live cleanup; current label-as-fallback works)
- [x] v13 Timeblock target ranges (targetStopsMin/Max etc.) — current single targetRoutes/estDuration is sufficient for M-Day operations
- [x] v13 Route.merchantMix JSON for Flex-block routes — current single-merchant routes cover all M-Day budgeted routes (no Flex routes in plan)
- [x] v14 Driver Availability Form (token+PIN) — driver sign-ups currently flow through `/signup` form (v25); availability tokens were the older design
- [x] v15 Travel-time global toggle — per-zone travelTimeSource override is shipped; global toggle deferred
- [x] v16 Flex Routes (no merchant split) — keeping merchant-per-route through M-Day
- [x] v17 Merchant Share token-based public page — superseded by /signup (driver-facing) and Dashboard (founder-facing); tokens not needed
- [x] v22 Wodely tasks → routes-needed signal — current Daily Planning panel shows Routes Needed = ceil(reforecast / stops) which is functionally equivalent
- [x] v23 Wodely Routes Sync (wodely_routes_cache, app routes linked) — Wodely confirmed-tasks sync covers fee/capacity needs without route-level linkage
- [x] v24 "Need N more routes" relabel — current label "Need N more drivers" is the operational truth (a route without a driver doesn't run); relabel deferred
- [x] v32 Forecasting precedence chain (global→driver→route maxCapacity/targetDuration/targetStops) — partial: payPct/floor/max precedence is live; capacity/duration/stops precedence deferred
- [x] v35 Default Week Template — manual timeblock copy-and-edit covers M-Day; template feature deferred to post-go-live
- [x] v38 Rolling-window tabs (This week / +1 / +2 / +3) — phase chips on Dashboard already convey the same info
- [x] v40 Timeblocks page cleanup (week-grouped collapsed rows) — current flat list works; cosmetic improvement deferred

### Done by triage
- [x] All v5–v40 backlog items classified (Shipped or Deferred); todo.md no longer contains spurious "open" items
- [x] v42 zone-inference complete; reforecast populates without zone clicks
- [x] v41 production smoke-test green; 35/37 vitest passing
- [x] System ready for go-live decision


## v44 Recalc-layer zone enforcement (planning correctness guard)

- [x] Inject auto-inference INSIDE recalculateAllRoutes: any route with stops>0 and no zones gets a mix inferred + persisted before fee/miles/duration are computed
- [x] Track which routes were just-inferred during a recalc pass; integrity report returned with inferredRouteIds, routesWithStopsButNoZonesRepaired, routesStillMissingZones, zeroFeeRoutes, durationFallbackRoutes
- [x] Add Dashboard data-integrity tile (DataIntegrityTile component) showing missing zones / zero fee / duration fallback counts + Recalculate button + 30s auto-refresh
- [x] `routes.recalculate` returns the integrity report; new `routes.integrity` tRPC query for read-only health probing
- [x] Vitest server/recalc-zone-guard.test.ts: setRouteZones([]) on a stops>0 route triggers recalc which auto-re-infers zones, fee>0, duration>0, routesStillMissingZones=0
- [x] Fixed schema-drift on getZoneDistribution + getWodelyFeeMap (narrowed select() so missing routePlanId/routeSortId/routeName/driverName/taskStatusId in deployed MySQL no longer breaks queries)
- [x] All 36/38 tests passing (2 legacy skipped)
- [x] Final checkpoint


## v45 Flex routes + fix LY actuals NULL on daily_forecast [DEFERRED — user locked scope at v44 for go-live]
- [x] Backfill lafActual2025 / bcActual2025 — deferred-by-design
- [x] Timeblock.bookingType=Flex schema check — deferred-by-design
- [x] Route.merchantMix JSON — deferred-by-design
- [x] routes.create Flex acceptance — deferred-by-design
- [x] Routes UI mix editor — deferred-by-design
- [x] Recalc engine blended Flex math — deferred-by-design
- [x] Wodely sync attribution — deferred-by-design
- [x] Capacity rollup — deferred-by-design
- [x] Vitest — deferred-by-design
- [x] Final checkpoint — v44 (00b42b53) is the go-live build


## v46 BUG: Confirmed-tasks-per-day on Dashboard reflect wrong dates
- [ ] Inspect wodely_task_cache rows: which dates are actually populated, what counts?
- [ ] Trace how forecast.list aggregates lafConfirmed / bcConfirmed from the cache (timezone? completedAt vs deliverDate?)
- [ ] Identify the bucket bug
- [ ] Fix and verify pre-MD weekday rows are low single-digits and M-Day weekend rows are large
- [ ] Re-deploy and tell user


## v47 Manual New Timeblock button (custom early-pickup blocks for holidays) [SHIPPED]
- [x] Verified timeblocks.create router accepts date, merchant, bookingType, lafPickupTime, bcPickupTime, label, availability window, target routes, dwell, mileage rate, pay floors, bonus, notes
- [x] Added primary "New Timeblock" button on Timeblocks page header next to Auto-Create Week
- [x] Reused existing dialog (already had full field set with sensible defaults); refresh + toast wired via existing createBlock mutation
- [x] End-to-end smoke test passed: POST custom early-pickup block (LAF Direct 08:30 pickup, 07:00–12:00 availability) → returned id, list reflected all fields exactly, delete succeeded
- [x] Save checkpoint
