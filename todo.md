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
- [ ] Auto-snapshot scheduled task (stretch — run once deployed)
- [ ] Vitest coverage for snapshot endpoints (stretch)

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
- [ ] Zone Metrics: Zone Distribution panel — Range A vs Range B custom date pickers, default next 7 days, LAF/BC separate columns, %-of-total per zone, Δ columns
- [x] Dashboard Daily Planning, Routes, and Scenarios pages all anchor to today with "Show earlier dates" toggle

## v11 Daily Planning View (founder status + merchant update)
- [x] Pull 2025 daily task totals per merchant from Supabase into local `historical_daily_2025` table
- [x] Map each 2026 date to 2025 equivalent by days-before-Mother's-Day (2025 MD = May 11; 2026 MD = May 10)
- [x] Zone-adjusted stops/route calc (equal-weighted across zones)
- [x] Dashboard per-date PlanningPanel: 2026 Budget | 2025 Actual | Confirmed | Routes Needed | Drivers Needed | Status
- [ ] Weight stops/route by per-zone task volume (deferred — needs zone_metrics volume columns)
- [ ] Order Capacity column (deferred)
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
