# Handoff — Mother's Day 2026 Planner

**Date:** 2026-05-03 · **M-Day:** 2026-05-10 (6 days out) · **Branch:** `main`

## TL;DR

- **Code:** all v46/v48 fixes shipped to `main` and tested. PR #2 merged.
- **Railway:** built, seeded, container running, but **edge proxy returns HTTP 502 on every request**. Cause unknown without container shell or Railway CLI.
- **What's needed next:** someone with `railway` CLI access on a laptop to run two commands and report back, or click through the Railway dashboard to reset routing.

---

## Code state (on `main`)

| Commit | What |
|---|---|
| `c54b1c1` | v46 fix: cancelled-task filter aligned across `aggregateByDate`, `cacheWodelyTasks`, `wodely.syncConfirmed` (zeros stale rows). +6 unit tests. |
| `bcf8f00` | Bootstrap baked into `pnpm start`. |
| `5dbf1be` | SSL fix in `seed-historical-2025.mjs` (`rejectUnauthorized: false`). |
| `f8da17c` | Bootstrap skips Step 4 seed when `/tmp/zone_task_data.json` absent (v42 fallback handles it). |
| `61215ab` | Added `scripts/verify-v46-live.sh` — post-deploy v46 sanity check. |
| `e35a90b` | Tried `0.0.0.0` bind (didn't help). |
| `31e3b28` | Now binds to `[::]` IPv6 dual-stack — current. |

`pnpm test`: 36 passed, 7 fail (all need live `DATABASE_URL` / `WODELY_API_KEY` — same as `main` baseline pre-session).

---

## Railway state

**Project:** `mday-2026-planner` (id `4b5a58b9-9f07-423b-9494-8d85307350f9`)
**Service:** `mday-2026-planner` (id `0775cf05-0edb-4af9-8561-fd56a5f50cc7`)
**Environment:** `production` (id `f9a22f14-aede-4782-a9a5-2eed9c2522d1`)
**Domain:** https://mday-2026-planner-production.up.railway.app

| Item | State |
|---|---|
| Source branch | `main` |
| Active deploy | `75eaf971` (commit `31e3b28`), status SUCCESS |
| Replica | 1 running, 0 crashed, "online" |
| Container last log | `Server running on http://[::]:8080/` |
| MySQL | Linked via reference variable, schema migrated, 27 zone_metrics rows + 27 historical_daily_2025 rows seeded |
| Env vars set | `DATABASE_URL`, `WODELY_API_KEY`, `JWT_SECRET`, `NODE_ENV=production`, `PORT=8080` |
| Env vars NOT set | `OAUTH_SERVER_URL`, `VITE_APP_ID`, `OWNER_OPEN_ID` (login won't work; non-fatal) |
| Domain → port | 8080 |
| Healthcheck path | none |
| TCP proxies | none |
| `startCommand` (service config) | removed (npm start handles bootstrap) |
| **Public URL response** | **HTTP 502 "Application failed to respond" on every path** |

---

## What was tried (all failed)

1. Aligned domain target port from 3000 → 8080.
2. Added explicit `PORT=8080` env var.
3. Bound Express to `0.0.0.0` (IPv4 only).
4. Bound Express to `[::]` (IPv6 dual-stack — current).
5. Removed conflicting `startCommand` from service config.
6. Restarted active deployment (kill replica + respin).
7. Removed and re-added the public domain.
8. Multiple fresh deploys with explicit commit hashes.

In every case: deploy reaches SUCCESS, replica goes "running", app logs `Server running on http://[::]:8080/`, but the edge proxy returns 502 to every external request.

---

## Resume steps for next session / human

### Diagnose with Railway CLI (5 min)

```bash
npm i -g @railway/cli
railway login
railway link            # pick mday-2026-planner / production
railway logs --service mday-2026-planner --tail 200
railway run --service mday-2026-planner curl -v http://localhost:8080/
```

The two questions that answer:
- **Does `curl localhost:8080` from inside the container return HTML?** If yes → it's a Railway edge routing bug (open a Railway support ticket; no code fix possible). If no → app is silently dying after the "Server running" log.
- **Are there errors after the "Server running" line in `railway logs`?** Anything after `Server running on http://[::]:8080/` would be a smoking gun. Last time we checked, that's the final log line.

### If app is silently dying (no response from inside)

Likely culprits to check in order:
1. `vite build` produced empty `dist/public/` — `serveStatic` can't find `index.html`. Run `pnpm build` locally and confirm `dist/public/index.html` exists. If not, the Railpack build step is broken.
2. The `findAvailablePort` race — replace with direct `server.listen(parseInt(process.env.PORT) || 3000, "::")` and skip the available-port probe.

### If app is fine internally (Railway routing bug)

1. Try a brand-new service: in Railway dashboard, **delete the `mday-2026-planner` service** (keep MySQL), recreate from the GitHub repo, copy env vars over. Often clears stuck routing tables.
2. Or: open a Railway support ticket with the deploy ID `75eaf971-bbfc-4c43-95e1-aab99a36929a` and ask why the edge can't reach a healthy upstream on port 8080.

### Once edge returns non-502

```bash
bash scripts/verify-v46-live.sh
```

That script (committed at `61215ab`) triggers `wodely.syncConfirmed` and prints a per-(date, merchant) diff between `dailyForecast.lafConfirmed/bcConfirmed` and `routes.wodelyConfirmedSummary`. **PASS = v46 fix verified live.**

Open https://mday-2026-planner-production.up.railway.app/ and:
- Confirm Dashboard "Confirmed" column shows single-digit numbers on May 4–8 weekdays and large numbers on May 9–10 weekend.
- Confirm the Routes page Wodely summary tile matches dailyForecast counts on every date.

---

## What's NOT done

1. **Edge 502 unblocked.** Live URL needs to actually serve.
2. **v46 verification on live data.** Cannot run `verify-v46-live.sh` until #1 is fixed.
3. **OAuth env vars** — `OAUTH_SERVER_URL`, `VITE_APP_ID`, `OWNER_OPEN_ID`. Login won't work without them. The dashboard / planner / sync work without login (most procedures are `publicProcedure`), so this is post-launch cleanup.
4. **Zone task history seed.** Step 4 of bootstrap is skipped because `/tmp/zone_task_data.json` (744-row Supabase extract) was never committed. Zone inference falls back to `zone_metrics` top-volume zones, which is acceptable for go-live but produces less precise reforecast. To fix: extract the JSON from Supabase, commit to repo, restore Step 4 in `scripts/railway-bootstrap.mjs`.

---

## File map

- `server/wodely.ts` — `aggregateByDate` (v46 fix), `WODELY_STATUS_CANCELLED`, `isLiveTask`.
- `server/db.ts:1086` — `cacheWodelyTasks` skips `statusId=50`.
- `server/routers.ts:660` — `wodely.syncConfirmed` writes zeros for cancelled-only dates.
- `server/wodely-aggregate.test.ts` — 6 unit tests, NY-tz boundary + cancelled exclusion.
- `server/_core/index.ts:54-66` — `[::]` dual-stack bind.
- `scripts/railway-bootstrap.mjs` — idempotent migrate + conditional seed.
- `scripts/verify-v46-live.sh` — post-deploy v46 sanity check.
- `scripts/inspect-wodely-cache.mts` — dispatcher tool: prints cache vs dailyForecast drift in one read.
- `todo.md` — every v5–v48 item resolved or classified.
