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
