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
- [ ] Add forecast_snapshots and snapshot_runs tables
- [ ] Snapshot endpoint that captures entire daily forecast + key assumptions
- [ ] Auto-snapshot trigger (scheduled task hitting an API endpoint daily)
- [ ] On-demand "Snapshot Now" button on Dashboard
- [ ] Snapshots page with day-over-day deltas (Goals, Confirmed, Revenue, Capacity %)
- [ ] Vitest coverage for snapshot endpoints

## v4 Zone Editor per Route (in progress)
- [ ] Add "Manage Zones" drawer/modal on each route row in Routes page
- [ ] List all 27 zones with editable task count inputs
- [ ] Save mutation -> update route_zones then trigger route recalc (fee, mileage, duration, driver pay)
- [ ] Duration calc uses travelTime2026 × taskCount per zone + driver differential
- [ ] Show zone list and duration total live in the drawer before save

## v5 Wodely-Driven Fee Calc
- [ ] Cache per-task Wodely fees by (merchant, date, zone) on sync
- [ ] Route fee calc: blended (Wodely confirmed + baseline for unconfirmed) until status = Routed
- [ ] Once status = Routed or later, fee = sum of Wodely taskFee only
- [ ] Driver pay, platform fee, mileage pay all flow from the resolved route fee
- [ ] UI indicates when fee is blended vs locked

## v6 Auto-recalc + Reforecast Inputs + Routed Actuals
- [ ] recalculateAllRoutes also recomputes estDuration (zone.travelTime × stops_per_zone + driver differential)
- [ ] Any edit (stops, zones, drivers, assumptions, Wodely sync) triggers full recalc automatically
- [ ] Remove reforecast sliders; replace with editable per-date reforecast inputs that persist
- [ ] Add reforecastLafGoal / reforecastBcGoal to daily_forecast, used by Routes when status < Routed
- [ ] Add route stage fields: plannedMileage, plannedDuration, driverApproved, driverApprovedAt
- [ ] Add actuals fields: actualMileage, actualDuration, actualDriverPay, actualStops
- [ ] Routed stage UI: dispatch enters planned mileage/duration; driver approval toggle
- [ ] Completed stage UI: enter actuals; calc variance
- [ ] Variance Analysis page: forecast vs planned vs actual

## v7 Dashboard rework (complete)
- [x] Dashboard columns: Date(2026), Day, Phase, LAF 2025 Actual, BC 2025 Actual, Total 2025, LAF 2026 Goal, BC 2026 Estimate, Total 2026 Goal, Max LAF, Max BC
- [x] Inline edit LAF 2026 Goal and BC 2026 Estimate
- [x] Zone editor UI on Routes page with auto-recalc of duration/mileage/fee

## v8 Dashboard progress metrics
- [ ] Fix inline-edit display bug: goal inputs show seeded values, not 0
- [ ] % Orders Received vs Goal (by day and overall)
- [ ] % Orders Received vs Latest Reforecast (by day and overall)
- [ ] % Orders vs Max Capacity (by day and overall)
- [ ] % Routes Planned vs Capacity
- [ ] % Routes Assigned vs Latest Reforecast
