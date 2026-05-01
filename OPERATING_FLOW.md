# M-Day 2026 Operating Flow

This document describes the end-to-end operating flow for the M-Day 2026 Scenario Planner. It is the canonical reference for what each role does, what the system does in response, and how data moves between Wodely, the planner, drivers, and merchants. All future feature work must conform to this flow; deviations require an explicit decision update.

## Roles

**Dispatch (admin):** owns capacity planning, timeblocks, route templates, driver scheduling, real-time monitoring, exception handling, and outbound communication. Logs in to the planner with full access.

**Merchant contact (LAF, BC, SMC, SMR):** receives a tokenized share link from dispatch. No login required. Confirms weekly order targets for future weeks, views read-only snapshots for the current week, receives daily reports.

**Driver:** receives route assignments by SMS (link to a tokenized self-help page). No login. Views route estimate, claims time blocks (sign-up only, no cancel), reports issues mid-route, closes route at end.

**Wodely:** the dispatch system of record. Holds the authoritative task list, route assignments, statuses, and completion data. The planner reads from Wodely; it never writes back.

## Data Sources

The planner combines three data sources. Historical 2025 data lives in `historical_daily_2025` and `zone_task_history_2025` (seeded once from Supabase). Live confirmed orders flow from Wodely via `/v2/tasks/search` and are mirrored into `wodely_task_cache`. Planner-internal state (timeblocks, app routes, driver scheduling, merchant tokens, settings) lives in the planner's own tables.

## Phase 1 — Pre-Season Setup (T-90 to T-30)

Dispatch reviews the **Zone Metrics** page to confirm per-zone min/task baselines. Three baselines are stored per zone: `travelTimeLastYear` (M-Day 2025 actuals), `travelTime60Day` (rolling normal-day median), and `travelTime2026` (forward assumption). The Zone Metrics page exposes a global toggle and a per-zone override so dispatch can choose which baseline drives route duration estimates per zone.

Dispatch reviews **Drivers** to confirm the roster, mark Confirmed/Pending/Placeholder status per driver, set differentials for new vs experienced drivers, and capture vehicle-size constraints.

Dispatch generates merchant share tokens on the **Settings → Merchant Share** panel and distributes the tokenized URL to each merchant contact (LAF, BC, SMC, SMR). LAF and BC receive forecast-editing pages; SMC and SMR receive read-only ad-hoc pages because they do not forecast in advance.

## Phase 2 — Weekly Forecast Confirmation (Rolling, T-21 to T-1 per week)

For every week in the M-Day window, the merchant opens their tokenized link. The page shows a Mon–Sat grid with five reference columns per day and one editable column:

| Column | Source | Read/Write |
|---|---|---|
| Trailing 30-day same-DOW avg | `wodely_task_cache` (and `zone_task_history_2025` for older dates), filtered to same day-of-week, last 30 days before today | Read-only |
| Trailing 60-day same-DOW avg | Same, last 60 days | Read-only |
| LY M-Day same-DOW | `zone_task_history_2025` for the corresponding day in the May 5–10 2025 holiday week | Read-only |
| Confirmed (Wodely) | `wodely_task_cache` filtered to the date | Read-only |
| Capacity (route slots) | sum of stops across `routes` for the date | Read-only |
| **Target** | `daily_forecast.lafReforecast` (LAF) or `bcReforecast` (BC) | Editable for future weeks; read-only for current/past weeks |

The merchant enters a Target per day and clicks **Confirm Week**. The Confirm Week mutation copies the Target value into `dailyForecast.laf2026Goal` (or `bc2026Goal`) for each of the six dates and stamps `dailyForecast.confirmedAt` and `dailyForecast.confirmedBy`. Re-confirmation is allowed any number of times until the week becomes the current week. Within the current week, the merchant can adjust Target on remaining days only (e.g., raise Thursday's target after a Wednesday miss); past days lock automatically. Each change creates an entry in a `forecast_audit` log so dispatch can see who changed what when.

A free-text Notes field per day captures merchant-specific instructions (early cutoff, special items, vehicle constraints).

## Phase 3 — Capacity Planning & Timeblock Creation (T-14 to T-1)

Once the merchant confirms targets for a future week, dispatch reviews the **Dashboard Daily Planning** page. The dashboard shows per day:

| Column | Computation |
|---|---|
| 2026 Goal | sum of LAF + BC Goal from `dailyForecast` |
| Confirmed Wodely | sum of Wodely tasks from `wodely_task_cache` for that date (assigned + unassigned tasks both count) |
| Routes Needed | `ceil(max(Goal, Confirmed) / weighted_avg_stops_per_route)` per zone, summed |
| Routes Scheduled | count of app `routes` where `routes.timeblockId` falls on this date |
| **Route Shortfall** | `max(0, Routes Needed − Routes Scheduled)` — surfaced as **"Need N more routes"** |
| Drivers Assigned | count of distinct `driverId` on those routes whose `drivers.status = Confirmed` |
| Driver Shortfall | `max(0, Routes Scheduled − Drivers Assigned)` — surfaced as a secondary signal |

When dispatch sees a Route Shortfall on a date, they go to **Timeblocks** to create or duplicate a timeblock for that date. The timeblock editor captures: blockDate, label, merchant (LAF/BC/SMC/SMR/Flex), bookingType (Direct/Flex), routeStart, availabilityStart/End, lafPickupTime, bcPickupTime, pickupDwell, mileageRate, targetRoutes, minPayFloor, maxPayFloor, estRoutePay, estDuration, bonus, notes. Saving a timeblock with `targetRoutes = N` auto-creates N placeholder app routes with `bookingType = Flex` by default.

Each placeholder route can have zones allocated via the Routes-page expand-row editor. Zones drive route fee, duration, mileage, and driver pay calculations using the per-zone min/task source the dispatcher selected on Zone Metrics.

## Phase 4 — Driver Scheduling (T-14 to T+0)

Drivers receive a tokenized availability link by SMS. The driver sign-up page shows the timeblocks they qualify for (by team membership and vehicle size). Drivers can **sign up** for any open block but **cannot cancel** once signed up — cancellations require a dispatch action. Each sign-up captures a free-text Notes field for driver constraints (need to finish by 4pm, not using my own van, etc.).

Dispatch reviews sign-ups on the **Drivers / Timeblocks** view, promotes a Pending sign-up to Scheduled by clicking the status badge, and assigns the driver to a specific app route via the Routes-page driver dropdown. A Scheduled driver assignment sets `routes.driverId` and locks the route's stops/duration estimates as the basis for the route estimate sent to the driver.

When all routes for a date have a Scheduled driver, the day's Driver Shortfall reaches zero.

## Phase 5 — Wodely Sync Loop (Continuous, T-7 to T+1)

Every five minutes (cron) and on demand (manual button), the planner pulls from Wodely:

1. `POST /v2/tasks/search` for the active date window (today through M-Day+5), pulling all task statuses. Each task response includes `routePlanId`, `routeSortId`, `routeName`, `driverName`, and `taskStatusId`. These fields are upserted into `wodely_task_cache` keyed on `wodelyTaskId`.
2. `POST /v2/routes/search` for the same window. Each route is upserted into `wodely_routes_cache` keyed on `wodelyRouteId`. Routes seen in a previous sync but missing from the current response are stamped `removedAt`.

After each sync, the planner recomputes the **dailyForecast.lafConfirmed / bcConfirmed** rollups and refreshes the Dashboard. The Dashboard surfaces, per day:

- Total Wodely tasks for the date and the count of unassigned tasks (`routePlanId = null`).
- Number of Wodely routes vs number of app routes; mismatches flag for dispatch review.
- Tasks that moved between Wodely routes since the last sync (compared via prior `routePlanId` snapshot).

## Phase 6 — Manual Merchant Update (Dispatch-Initiated)

No automatic emails or SMS go to merchants. Dispatch composes outbound updates from a per-merchant **Comms** panel inside the planner. The panel offers prebuilt templates with merge variables filled from live data:

- **Daily Status** — `{merchant} {date}: Goal {goal} · Confirmed {confirmed} ({pct}%) · Capacity {capacity} · Room to add {room}`
- **Update Request** — asks merchant to revise targets for a specified week (returns the share-link URL).
- **Confirmation Reminder** — nudge if a future week is still unconfirmed.
- **Capacity Warning** — sent when Confirmed exceeds 90% of Capacity for any day.

Dispatch reviews/edits the templated message, then clicks **Send Email** (uses the merchant contact email on file). Each send writes to a `merchant_comms_log` row capturing template, recipient, date sent, sent by, and rendered body. The log is the audit trail.

## Phase 7 — Driver Route Estimate (Dispatch-Initiated)

No automatic SMS to drivers. The Routes page exposes a **Send Route Estimate** button per route. Clicking it generates a tokenized URL for the route's **Route Estimate** page (route code, pickup time, pickup location, expected stop count, expected duration, expected pay with floor/ceiling, zone summary, per-day dispatch notes) and:

- writes a `route_estimate_sends` row capturing `routeId`, `driverId`, `sentAt`, `sentBy`, `tokenUrl`, and a JSON snapshot of the estimate values at send-time (so we can detect drift between what the driver was promised and what changed afterward),
- copies the rendered SMS body and tokenized URL to the dispatcher's clipboard for paste into the dispatcher's preferred SMS tool.

The driver opens the link and taps **Confirm Route** which sets `routes.driverApproved = true` and stamps `driverApprovedAt`. If a route's underlying values change after the estimate was sent (e.g., a Wodely task is added/removed/reassigned), the Routes page flags the route with a **"Re-send estimate (changes pending)"** badge listing the diff vs. the snapshot.

## Phase 8 — Live Day-of (T-0)

Dispatch monitors the **Day of Operations** view (a focused subset of the dashboard for today only). Every five minutes the Wodely sync runs. The view shows:

- **Per route:** assigned driver, current task, completed/total stops, ETA, any exception flag.
- **Per task:** Wodely status (Assigned/In Transit/Completed/Failed), destination, completion timestamp, route-sort position.
- **Drift signals:** task moved between Wodely routes; route running long vs estimate; unassigned tasks count growing.

Dispatch can drill into any route to see its full task list, sortId, completion times, and the underlying Wodely raw JSON (available via a "View Wodely raw" link that opens the cached `wodely_task_cache.raw` payload). This is the dispatcher's **raw data review**: any field returned by Wodely is one click away.

Drivers use their self-help page mid-route to flag exceptions (wrong address, customer not home, etc.) which create dispatch tasks.

## Phase 9 — Day Close, Pay Reconciliation & Accuracy Review (T+0 evening)

When a route completes in Wodely (`routes.status = Completed`), the planner pulls actual values from the cached tasks: `actualStops` = count, `actualDuration` = last completion − first task start, `actualMileage` = sum of task `distance`. Driver pay is recomputed from actuals and written to `routes.actualDriverPay`. Variance = `actualDriverPay − routeEstimateSends.snapshot.driverPay` (the pay we promised at send-time).

**Task-change pay rule.** When a Wodely task is added, removed, or reassigned to a different route after the route estimate was sent, dispatch decides whether to honor the original promised pay. Each route shows a **Pay Reconciliation** panel listing every task change since estimate-send with toggle: **Honor original promise** (keep `actualDriverPay` = snapshot) or **Recalculate** (use current task list). The chosen value becomes `finalDriverPay` and the decision is logged with the dispatcher's note.

A **Daily Accuracy Report** is generated as an in-app page (no auto-email) showing per route: planned vs actual stops, duration, pay, variance %, task-change events, dispatcher's pay decisions, and any flagged outliers (a stop that added disproportionate distance or time). Dispatch can also open a **Weekly Accuracy Review** that aggregates the same metrics across the prior 7 days, highlighting systematic over/under-estimation per zone/merchant/timeblock so baselines can be tuned.

## Phase 10 — Post-Season Review (T+7 to T+30)

The full snapshot history (auto-snapshotted at 7am daily during the season) is preserved in `forecast_snapshots` and `snapshot_runs`. Dispatch reviews actual vs goal vs forecast trends per merchant, per zone, per day-of-week, and updates the per-zone min/task baselines for next season. Lessons learned are documented; the planner config (zone metrics, pickup dwell, mileage rate, pay %) is updated for the next holiday window.

## Phase 11 — Dispatch Data Explorer & Audit Logs (Always Available)

Dispatch (admin role) has full backend visibility through five panels under **Settings → Data**:

**Browse Tables.** A generic admin grid lists every table in the planner DB (`routes`, `timeblocks`, `wodely_task_cache`, `wodely_routes_cache`, `daily_forecast`, `zone_metrics`, `drivers`, `merchant_share_tokens`, `route_estimate_sends`, `merchant_comms_log`, `driver_comms_log`, `forecast_audit`, `forecast_snapshots`, `historical_daily_2025`, `zone_task_history_2025`, `zones`, etc.). Selecting a table opens a paginated read-only grid with column filters, sort, full-text search, and CSV export. Selecting a row opens a detail drawer with all columns plus links to related rows (a route shows its zones, driver, timeblock, estimate sends, comms log, pay-reconciliation decisions). JSON/text columns (e.g., `wodely_task_cache.raw`) are pretty-printed with a copy button.

**SQL Console.** Read-only `SELECT` only — server enforces and rejects DML. Saved-query dropdown ships with common questions (today's tasks by zone, routes over budget last 7 days, unassigned tasks per merchant, drift events last hour). Results render as a sortable table with CSV export.

**Sync Status.** Last `wodely_task_cache.syncedAt`, last `wodely_routes_cache.lastSeenAt`, list of drift events from the most recent sync (tasks moved between routes, tasks added/removed, routes appearing/disappearing), and a manual **Sync Now** button.

**Comms Log.** Single unified view combining `merchant_comms_log` (every email composed and sent from the Comms panel) and `driver_comms_log` (every Route Estimate send and any other dispatch-initiated driver message). Each row shows: timestamp, sender, recipient (merchant name + email, or driver name + phone), template used, channel (email/SMS), rendered subject + body, link to the entity (route, timeblock, week), and a `resentOf` pointer if the message was a re-send. Filters by recipient, template, channel, date range. Click a row to open the full rendered message and any attached snapshot (e.g., the route estimate values at send-time). The Comms Log is the single source of truth for "what did we tell the merchant/driver and when?"

**Audit Log.** Combined view of `forecast_audit` (every merchant Target edit and Confirm Week event), pay-reconciliation decisions (Honor / Recalculate / dispatcher note), timeblock CRUD, route CRUD, driver-status changes, and zone-metric edits — filterable by user, date, entity type, action.

All five panels are gated to admin role; merchant-share token sessions cannot reach them.

## Communication Channels Summary

All outbound to merchants and drivers is **manual / dispatch-triggered**. The planner provides templates and tracking; dispatch pulls the trigger.

| To | Channel | Trigger | Content |
|---|---|---|---|
| Merchant | Tokenized share link (web) | One-time at season start | Mon–Sat target confirmation page |
| Merchant | Email (dispatch-sent from Comms panel) | On-demand | Daily Status / Update Request / Confirmation Reminder / Capacity Warning templates |
| Driver | SMS w/ tokenized link (dispatch copies to clipboard, pastes into SMS tool) | On-demand from Routes page | Route Estimate page |
| Driver | (Optional) Re-send button | When estimate snapshot drifts | Updated Route Estimate page |
| Dispatch | In-app banner | After each Wodely sync | Drift signals (tasks moved, unassigned growing, route shortfall) |
| Dispatch | In-app Daily Accuracy Report | T+0 end of day | Per-route planned vs actual + variance |
| Dispatch | In-app Weekly Accuracy Review | Weekly on demand | Aggregated 7-day accuracy by zone/merchant/timeblock |

## Sign-off (Locked)

This document is the implementation contract. Any UI or backend that drifts from it is a bug. Confirmed decisions:

- Merchant share columns: Trailing 30 / Trailing 60 / LY M-Day / Confirmed / Capacity / Target; Confirm Week locks past days, allows in-week edits to remaining days.
- Route Shortfall is the primary scarcity signal ("Need N more routes"); driver shortfall is secondary.
- Wodely is read-only from the planner; planner never writes to Wodely.
- All outbound merchant/driver comms are dispatch-triggered from in-app templates; nothing auto-sends.
- Every send writes to `merchant_comms_log` or `driver_comms_log`; log is reviewable in the Dispatch Comms Log panel.
- Route Estimate sends snapshot the values at send-time; later drift triggers a "Re-send (changes pending)" badge with diff.
- Pay reconciliation per route is a dispatcher decision (Honor / Recalculate) with audit log; result becomes `finalDriverPay`.
- Daily Accuracy Report (in-app) at end of day; Weekly Accuracy Review on demand.
- Dispatch sees all backend data via Settings → Data (Browse Tables / SQL Console / Sync Status / Comms Log / Audit Log).
