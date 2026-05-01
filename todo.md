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
- [ ] Route fee calc: blended (Wodely confirmed + baseline) until status = Routed (deferred)
- [ ] Once status = Routed, fee = sum of Wodely taskFee only (deferred — tied to v6)
- [ ] Driver pay/platform/mileage flow from resolved route fee (partial — zone-based today)
- [ ] UI indicator for blended vs locked fees (deferred)

## v6 Auto-recalc + Reforecast Inputs + Routed Actuals
- [x] recalculateAllRoutes recomputes estDuration from zone.travelTime × taskCount
- [x] Every relevant edit (stops, zones, status, Wodely sync, global settings) triggers full recalc
- [x] reforecastLafGoal / reforecastBcGoal columns on daily_forecast
- [x] Route stage fields plannedMileage, plannedDuration, plannedDriverPay, driverApproved, plannedLockedAt, needsReview, reviewReason
- [x] Actuals fields actualMileage, actualDuration, actualDriverPay, actualStops on schema
- [ ] Routed-stage dedicated UI panel (dispatch enters planned values) — deferred, user asked to stay focused on forecast/actuals
- [ ] Completed-stage UI for entering actuals — deferred
- [ ] Variance Analysis page — deferred

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
- [ ] Drop `wave` from Timeblock schema as a required column (keep optional `label` for rare multi-slot days)
- [ ] Add to Timeblock: bookingType (Direct / Flex), merchant (LAF / BC / Both; Both when Flex), vehicleSize, pickupTime, pickupLocation, pickupZip
- [ ] Add range fields on Timeblock: targetStopsMin/Max, targetDurationMin/Max, driverPayMin/Max
- [ ] Add notes (text) on Timeblock for incentives/reminders
- [ ] `Create Week` button on Timeblocks page that generates 7 default blocks for a chosen Monday
- [ ] Inline editor for all new fields with sensible defaults
- [ ] Route.merchantMix JSON ({LAF: n, BC: n}) for Flex-block routes; fee calc uses per-merchant rates on mix
- [ ] Routes page: flag routes whose stops/duration/pay fall outside the block's target ranges
- [ ] Dashboard/Daily Planning stays date-aligned; multi-block dates roll up by date
- [ ] Data migration preserves existing routes (each existing timeblock keeps its wave as label, bookingType defaults to Direct)
- [ ] Vitest for bookingType rules + merchantMix fee calc

## v14 Driver Availability Form (public, token+PIN+expire)
- [ ] New schema: availability_tokens (token, driverId, windowStart, windowEnd, pin, expiresAt, usedAt, revokedAt, createdAt)
- [ ] New schema: driver_availability_submissions (id, tokenId, week1Signups JSON, week2Preferences JSON, generalNotes, perBlockNotes JSON, submittedAt, submittedIp)
- [ ] New schema: driver_timeblock_assignments (driverId, timeblockId, status Scheduled|Standby|Pending, source, assignedAt)
- [ ] Public route /availability/:token (no auth) with PIN gate when set
- [ ] Form UI: Week+1 view-only + optional sign-up (Pending status) + Week+2 Available/Preferred checkboxes + per-block notes + general notes + "other times" free-text
- [ ] Auto-expire: form blocks submission after expiresAt; shows friendly "window closed" screen
- [ ] Optional 4-digit PIN with 5-attempt lockout per token
- [ ] Drivers page: "Send Availability Form" button per driver → generates token, copies link + PIN to clipboard
- [ ] New dispatch page: Availability Inbox (list submissions with prominent notes, one-click Scheduled/Standby assignment per block)
- [ ] Timeblock page: show Scheduled / Standby / Available-unassigned driver rollups per block
- [ ] Vitest for token expire, PIN lockout, submission persistence

## v15 Travel-Time Source Controls
- [x] Global toggle on Zone Metrics page: route duration uses LY / 60d / 2026
- [x] Per-zone override: zone_metrics.travelTimeSource (global/lastYear/sixtyDay/y2026) with Zones page dropdown per row; falls back to global

## v16 Flex Routes (no merchant split)
- [ ] Remove merchant as a route-separator: routes can carry both LAF and BC stops; audit routes list, filters, labels, fee calc

## v17 Merchant Share Page (Mon–Sat)
- [ ] Schema: merchant_share_tokens (token, merchant LAF|BC, label, createdAt, revokedAt)
- [ ] Schema: merchant_weekly_forecast (merchant, date, forecastOrders, notes, updatedBy, updatedAt)
- [ ] Public procedure: merchantShare.snapshot({token, weekOf}) returns Mon–Sat with budget, forecast, confirmed (Wodely), route capacity, remaining bandwidth, editable flag per day
- [ ] Public procedure: merchantShare.updateForecast({token, date, forecastOrders, notes}) — only future weeks, rejects current/past
- [ ] Admin mutation: merchantShare.createToken({merchant, label}) + revoke
- [ ] Public page /m/:token with Mon–Sat week, prev/next week nav, read-only for current/past weeks, editable for future weeks, copy-link/share button
- [ ] Drivers/Settings-like admin panel to generate & copy merchant share links
- [ ] Vitest: token auth, week-of computation (Mon–Sat NY), future-only edit rule

## v18 Multi-Merchant + BookingType
- [ ] Expand merchant enum to LAF / BC / SMC / SMR (routes, routeZones, driverTimeblocks, timeblocks, wodelyTaskCache, zoneTaskHistory2025, merchantShareTokens, merchantDayNotes)
- [ ] Add routes.bookingType ENUM('Direct','Flex') DEFAULT 'Direct'
- [ ] Routes page: BookingType dropdown per route; when Flex, Merchant column shows mix summary (e.g. "10 LAF + 6 BC")
- [ ] Merchant Share: SMC/SMR share pages show "ad-hoc only" notice (no budget/forecast fields)

## v19 Timeblock Editor
- [x] Fix TS errors in db.ts (add gte/lte to drizzle-orm import, normalize merchantDayNotes upsert typing)
- [x] Backend: timeblocks.create + timeblocks.delete + timeblocks.duplicate
- [x] UI: "New timeblock" button opens modal/form with all defaults
- [x] UI: per-row Edit prefilled; Delete with confirm; Duplicate copies defaults to a new date
- [x] Fields editable: blockDate, label, merchant (incl. SMC/SMR), bookingType (Direct/Flex), routeStart, availabilityStart/End, lafPickupTime, bcPickupTime, pickupDwell, minPayFloor, maxPayFloor, mileageRate, targetRoutes, estRoutePay, estDuration, bonus, notes

- [x] Wipe all seeded routes + timeblocks + routeZones + driverTimeblocks (seed data caused 4-routes-today bug)
- [ ] Route generator default: bookingType=Flex (no auto LAF/BC split)
- [ ] Drop "wave" from UI everywhere (column stays in DB for back-compat)


## v20 Merchant Share Calculator
- [ ] Backend: trailing 30/60-day same-DOW averages per merchant (LAF, BC) from zone_task_history_2025 + wodely_task_cache
- [ ] Backend: M-Day 2025 same-DOW lookup (Mon May 5 – Sat May 10, 2025)
- [ ] Public Merchant Share page rebuild as Mon–Sat calculator (Trailing 30 | Trailing 60 | LY M-Day | Target | Notes) with Confirm Week button (re-editable)
- [ ] confirmWeek mutation copies forecast → 2026 Goal for the 6 days; allows re-confirm in same week

## v21 Routes Page Visibility
- [ ] Inline Zones column on Routes page (forecast list + actual when completed)
- [ ] Per-route calc breakdown popover: travel mins, pickup dwell, route duration, driver pay components, all clickable to source settings


## v22 Capacity Truth (Wodely tasks drive routes-needed)
- [ ] Confirmed Wodely tasks (assigned + unassigned) count toward day's required capacity
- [ ] Routes-needed per day per zone = ceil(tasks ÷ stops/route) using zone weighting
- [ ] Driver-shortfall signal on Dashboard ("Need N more drivers")
- [ ] Unassigned tasks visible per day on Dashboard + Routes (not hidden)

## v23 Wodely Routes Sync (Wodely = source of truth)
- [ ] wodely_routes_cache table (routeId, routeName, scheduledStart, driverName, status, lastSeenAt, removedAt)
- [ ] Add wodelyRouteId on wodely_task_cache + on app routes
- [ ] Sync pulls /v2/routes for window + uses task.routeId for assignment
- [ ] Task move between routes auto-reflects on next sync
- [ ] App routes linked to a Wodely route become read-only (synced fields disabled)


## v24 Labeling
- [ ] Replace "Need N more drivers" with "Need N more routes" everywhere; keep driver-shortfall as a secondary signal under route shortfall


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
- [ ] Routes page: type-to-edit driver assignment (autocomplete by name), status, merchant, bookingType
- [ ] Timeblocks page: type-to-edit merchant, bookingType (datalist)
- [ ] Drivers page: type-to-edit status, type
- [ ] Settings: editable text fields (already mostly text — verify travelTimeSource is datalist)
- [ ] Zone Metrics: per-zone travelTimeSource as datalist input
- [ ] Daily Planning copy-blurb stays unchanged
- [ ] Vitest sanity for one converted endpoint (driver assignment by name)


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
- [ ] drivers table: add `payPctOverride` (nullable), `payFloorOverride` (nullable), `payMaxOverride` (nullable). Null = inherit (global pct, timeblock floor/max).
- [ ] Migration applied
- [ ] Recalc engine: when a driver is assigned to a route, use that driver's overrides for pct + floor + max instead of the global/timeblock defaults. Per-route overrides still beat per-driver.
- [ ] Drivers page: inline-editable columns for Pay %, Pay Floor, Pay Max
- [ ] Routes page: tooltip on Driver Pay shows the resolved rate (e.g. "78% × fee, floor $160")
- [ ] DATA_LINEAGE.md + in-app explainer updated
- [ ] vitest: two drivers, same timeblock, different rates → recalc produces different estDriverPay


## v31 Hourly-band pay model + Wodely workforce-task adjustments
- [ ] drivers schema: hourlyTargetMin (decimal), hourlyTargetMax (decimal), nullable. Defaults 28 / 35.
- [ ] routes schema: store estRouteBasePay, estTotalDriverPay, wodelyAdjustment (all derived).
- [ ] Recalc engine: gross = fee * pct; netPay = gross - mileagePay; floor = hourlyTargetMin * hours; max = hourlyTargetMax * hours; if netPay < floor -> wodelyAdjustment = floor - netPay, routeBasePay = floor, else if netPay > max -> routeBasePay = max (surplus stays in 25%), else routeBasePay = netPay; routeBasePay += bonus; total = routeBasePay + mileagePay.
- [ ] Routes page: columns for Miles, Hours, Route Base, Mileage, Total Pay, Wodely Adj
- [ ] Driver-facing Route Sheet (modal/print) per route: Duration, Miles, Stops, Route Base + Mileage = Total
- [ ] New Wodely Adjustments page: per-route delta, total to upload as workforce tasks; copy/CSV export
- [ ] Drivers page: hourly band columns
- [ ] DATA_LINEAGE.md + Profitability explainer updated
- [ ] vitests: floor binds / no bind / max binds / mileage included


## v32 Forecasting precedence chain (global → driver → route)
- [ ] global_settings: targetMaxCapacity, targetDuration (min), targetStops, targetHourlyMin, targetHourlyMax
- [ ] drivers: maxCapacity, targetDuration, targetStops (already have hourlyTargetMin/Max + payPctOverride)
- [ ] routes: maxCapacity, targetDuration, targetStops, hourlyTargetMin, hourlyTargetMax (nullable = inherit)
- [ ] Precedence resolver: route override > driver override > global default; used by recalc + UI
- [ ] Settings → Forecasting Defaults section
- [ ] Drivers + Routes pages: inline override columns showing effective value + source badge
- [ ] DATA_LINEAGE.md updated to describe the chain
- [ ] vitest: precedence resolution for each field; unit test for recalc using a route override


## v33 Vehicle multiplier + Assignment confirmation
- [ ] drivers.vehicleType enum (sedan|van) default sedan
- [ ] routes.vehicleType enum (sedan|van) nullable = inherit from driver
- [ ] routes.assignmentConfirmed (0/1) + assignmentConfirmedAt (timestamp nullable)
- [ ] Recalc: apply vehicle multiplier (sedan 0.80, van 1.10) to driver pay slice (the 75%) before mileage split + hourly clamp
- [ ] Drivers page: Vehicle column inline-editable
- [ ] Routes page: Vehicle column (effective + override badge), Confirmed checkbox/badge next to Driver
- [ ] Dashboard: capacity tile shows Routes Budgeted / Driver Assigned / Driver Confirmed
- [ ] DATA_LINEAGE updated for vehicle multiplier + assignment vs confirmation
- [ ] Vitest: vehicle multiplier math + assignmentConfirmed toggle


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
- [ ] Default Week Template stored in `global_settings` (per-day-of-week defaults: merchants, pickup times, targetRoutes, mileageRate, availabilityStart/End)
- [ ] Backend: `timeblocks.autoCreateWeek({ weekOf })` — creates 7 timeblocks for the chosen Mon, skipping dates that already have any blocks; uses Default Week Template
- [ ] Backend: `routes.autoCreateForDate({ date })` — for every timeblock on that date, creates `targetRoutes` placeholder routes (default merchant, stops=0, status=Budgeted) and triggers recalc
- [ ] Backend: `routes.autoCreateForTimeblock({ timeblockId })` — same but scoped to one block
- [ ] Timeblocks page: "Auto-Create Week" button (date picker, defaults to next Monday), shows what will be created and skipped
- [ ] Routes page: "Auto-Create Routes" button (date or timeblock picker)
- [ ] Rolling-window tabs on Timeblocks: This Week / +1w (Driver Schedule) / +2w (Sign-up Open) / +3w (Planning) — same labels surfaced on Drivers and Routes where relevant
- [ ] Settings page: "Default Week Template" editor (per weekday: list of merchants/pickup times/targetRoutes)
- [ ] Tests: autoCreateWeek skips existing dates; autoCreateForDate produces N routes per timeblock equal to targetRoutes
- [ ] Update DATA_LINEAGE: §2.0a auto-create paths, §0 rolling-window operating model
- [ ] Single checkpoint at end + final go-live checklist message to user


## v36 Kill all dropdown selectors on data-entry pages
- [x] Drivers: Vehicle field is the existing TypeAhead (already typeable, freely entered)
- [x] Routes: replaced Driver, Status, Merchant, Booking Selects on inline rows with InlineEnumInput (datalist + free typing, Enter to commit)
- [x] Routes: replaced Selects in the New Route dialog (Timeblock, Merchant, Booking) with InlineEnumInput
- [x] Timeblocks: replaced Merchant + Booking Selects in the editor and the inline "Assign driver" Select with InlineEnumInput
- [x] Tests still pass (27/27 + 2 skipped) after the refactor


## v37 Number/text inputs are plain (enums may stay typeahead)
- [ ] Audit Routes inline cells: stops, holidayPerStopSurcharge, bonus, hourlyTargetMin/Max overrides — plain Input type=number
- [ ] Audit Drivers cells: hourlyTargetMin/Max, timePerStopDiff, payPctOverride — plain Input type=number
- [ ] Audit Timeblocks editor: targetRoutes, mileageRate, estRoutePay, estDuration, bonus, minPayFloor, maxPayFloor, pickupDwell — plain Input type=number
- [ ] New Route dialog: stops field stays plain
- [ ] Confirm enum dropdowns are intact for vehicle, merchant, status, bookingType
- [ ] Tests still pass after audit

## v38 Auto-Create UI + rolling-window operating model
- [x] timeblocks.autoCreateWeek mutation wired (+ button on Timeblocks header)
- [ ] routes.autoCreateForTimeblock + autoCreateForDate UI buttons (Routes page)
- [ ] Rolling-window tabs on Timeblocks (This week / Next / +2 / +3) and Routes
- [ ] Dashboard rolling-window summary widget


## v39 Vehicle bug + Internal Notes
- [ ] Fix Drivers vehicle picker — should show exactly sedan and van (no duplicate, no missing)
- [ ] Add internalNotes column to drivers schema + UI text area
- [ ] Surface internal Notes text area on Timeblocks editor (column already exists)
- [ ] Surface internal Notes text area on Routes expanded row (column already exists)
- [ ] Vitest: drivers.update accepts internalNotes; persists round-trip


## v40 Timeblocks page cleanup
- [ ] Remove the inline driver sign-up widget from Timeblocks page entirely (sign-ups live on `/signup` only)
- [ ] Remove the duplicate "+ New timeblock" + "Add block" buttons; keep one CTA: Auto-Create Week
- [ ] Group rows by week (Mon–Sun heading) with totals (# blocks, routes built / target)
- [ ] Collapsed row = one line that fits screen: Date · Day · Merchant · Pickup · Routes (live count / target) · Pay range
- [ ] Click row to expand; expanded shows full editor inline + Edit/Duplicate/Delete; no edit fields visible in collapsed mode
- [ ] Live "# routes built / target" count in collapsed + expanded (uses routes.list)
- [ ] No horizontal scroll on the collapsed list
- [ ] Tests still green


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
