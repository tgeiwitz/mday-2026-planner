import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Flower, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { fmtDateShort, dayName, toISODate } from "@/lib/date";

type ForecastRow = {
  id: number;
  forecastDate: string | Date;
  phase: string;
  laf2025Actual: number | null;
  bc2025Actual: number | null;
  laf60DayTrend: number;
  bc60DayTrend: number;
  laf2026Goal: number;
  bc2026Goal: number;
  lafConfirmed: number | null;
  bcConfirmed: number | null;
  reforecastLafGoal?: number | null;
  reforecastBcGoal?: number | null;
  maxLafCapacity: number;
  maxBcCapacity: number;
};

type Timeblock = { id: number; blockDate: string | Date };
type Route = { id: number; timeblockId: number; status: string; driverId: number | null };

const toDateKey = toISODate;

type PlanningRow = {
  forecastDate: string;
  daysBeforeMday: number;
  phase: string;
  lafGoal: number;
  bcEstimate: number;
  lafHistorical: number;
  bcHistorical: number;
  lafConfirmed: number;
  bcConfirmed: number;
  lafRouteCapacity: number;
  bcRouteCapacity: number;
  totalRouteCapacity: number;
  lafConfirmedCapacity: number;
  bcConfirmedCapacity: number;
  totalConfirmedCapacity: number;
  lafRoomToFill: number;
  bcRoomToFill: number;
  totalRoomToFill: number;
  lafNeedDrivers: number;
  bcNeedDrivers: number;
  totalNeedDrivers: number;
  driversConfirmed: number;
};

function gapCell(n: number, type: "room" | "need") {
  if (n === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  if (type === "room") {
    if (n > 0) return <span className="text-emerald-700 tabular-nums">+{n}</span>;
    return <span className="text-destructive tabular-nums">{n}</span>;
  }
  return <span className="text-amber-700 tabular-nums">{n}</span>;
}

function PlanningPanel() {
  const { data: rows = [], isLoading } = trpc.planning.list.useQuery();
  return (
    <Card className="border-border/60 overflow-hidden mb-8">
      <div className="px-6 py-4 border-b border-border/60 bg-muted/20">
        <h2 className="font-serif text-xl">Daily Planning</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Budget (2026 Goal) · 2025 Actual for the equivalent day-before-Mother's-Day · Confirmed (Wodely) · Route Capacity (stops across placeholder routes) vs Confirmed Capacity (routes with a driver whose status = Confirmed). Room to Fill = capacity minus orders landed; Need Drivers = orders minus confirmed capacity.
        </p>
      </div>
      <div className="table-scroll">
        <table className="elegant-table">
          <thead>
            <tr>
              <th className="sticky-col" rowSpan={2}>Date</th>
              <th rowSpan={2}>D-Day</th>
              <th className="text-center border-r border-border/60" colSpan={3}>2026 Budget</th>
              <th className="text-center border-r border-border/60" colSpan={3}>2025 Actual</th>
              <th className="text-center border-r border-border/60" colSpan={3}>Confirmed (Wodely)</th>
              <th className="text-center border-r border-border/60" colSpan={3}>Route Capacity</th>
              <th className="text-center border-r border-border/60" colSpan={3}>Confirmed Capacity</th>
              <th className="text-center border-r border-border/60" colSpan={3}>Room to Fill</th>
              <th className="text-center" colSpan={3}>Need Drivers</th>
            </tr>
            <tr>
              <th className="text-right">LAF</th>
              <th className="text-right">BC</th>
              <th className="text-right border-r border-border/60">Total</th>
              <th className="text-right">LAF</th>
              <th className="text-right">BC</th>
              <th className="text-right border-r border-border/60">Total</th>
              <th className="text-right">LAF</th>
              <th className="text-right">BC</th>
              <th className="text-right border-r border-border/60">Total</th>
              <th className="text-right">LAF</th>
              <th className="text-right">BC</th>
              <th className="text-right border-r border-border/60">Total</th>
              <th className="text-right">LAF</th>
              <th className="text-right">BC</th>
              <th className="text-right border-r border-border/60">Total</th>
              <th className="text-right">LAF</th>
              <th className="text-right">BC</th>
              <th className="text-right border-r border-border/60">Total</th>
              <th className="text-right">LAF</th>
              <th className="text-right">BC</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={23} className="text-center text-muted-foreground py-8">Loading…</td>
              </tr>
            )}
            {(rows as PlanningRow[]).map((r) => {
              const totalBudget = r.lafGoal + r.bcEstimate;
              const total2025 = r.lafHistorical + r.bcHistorical;
              const totalConfirmed = r.lafConfirmed + r.bcConfirmed;
              return (
                <tr key={r.forecastDate}>
                  <td className="sticky-col font-medium">{fmtDateShort(r.forecastDate)}<div className="text-[10px] text-muted-foreground">{dayName(r.forecastDate)}</div></td>
                  <td className="tabular-nums">{r.daysBeforeMday >= 0 ? `${r.daysBeforeMday}d` : `M+${-r.daysBeforeMday}`}</td>
                  {/* 2026 Budget */}
                  <td className="text-right tabular-nums">{r.lafGoal}</td>
                  <td className="text-right tabular-nums">{r.bcEstimate}</td>
                  <td className="text-right tabular-nums font-medium border-r border-border/60">{totalBudget}</td>
                  {/* 2025 Actual */}
                  <td className="text-right tabular-nums text-muted-foreground">{r.lafHistorical}</td>
                  <td className="text-right tabular-nums text-muted-foreground">{r.bcHistorical}</td>
                  <td className="text-right tabular-nums text-muted-foreground border-r border-border/60">{total2025}</td>
                  {/* Confirmed */}
                  <td className="text-right tabular-nums">{r.lafConfirmed}</td>
                  <td className="text-right tabular-nums">{r.bcConfirmed}</td>
                  <td className="text-right tabular-nums font-medium border-r border-border/60">{totalConfirmed}</td>
                  {/* Route Capacity */}
                  <td className="text-right tabular-nums">{r.lafRouteCapacity}</td>
                  <td className="text-right tabular-nums">{r.bcRouteCapacity}</td>
                  <td className="text-right tabular-nums font-medium border-r border-border/60">{r.totalRouteCapacity}</td>
                  {/* Confirmed Capacity */}
                  <td className="text-right tabular-nums">{r.lafConfirmedCapacity}</td>
                  <td className="text-right tabular-nums">{r.bcConfirmedCapacity}</td>
                  <td className="text-right tabular-nums font-medium border-r border-border/60">{r.totalConfirmedCapacity}</td>
                  {/* Room to Fill */}
                  <td className="text-right">{gapCell(r.lafRoomToFill, "room")}</td>
                  <td className="text-right">{gapCell(r.bcRoomToFill, "room")}</td>
                  <td className="text-right font-medium border-r border-border/60">{gapCell(r.totalRoomToFill, "room")}</td>
                  {/* Need Drivers */}
                  <td className="text-right">{gapCell(r.lafNeedDrivers, "need")}</td>
                  <td className="text-right">{gapCell(r.bcNeedDrivers, "need")}</td>
                  <td className="text-right font-medium">{gapCell(r.totalNeedDrivers, "need")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function pctBadge(pct: number | null) {
  if (pct === null) return <span className="text-muted-foreground">—</span>;
  const cls = pct >= 100 ? "text-destructive" : pct >= 85 ? "text-amber-600" : pct >= 50 ? "text-emerald-600" : "text-muted-foreground";
  return <span className={`tabular-nums ${cls}`}>{pct.toFixed(0)}%</span>;
}

const formatDate = fmtDateShort;

function deriveSop(lafGoal: number): { label: string; cls: string } {
  if (lafGoal >= 100) return { label: "Exception", cls: "bg-primary text-primary-foreground" };
  if (lafGoal >= 30) return { label: "High Volume", cls: "bg-amber-100 text-amber-900 border border-amber-200" };
  return { label: "Standard", cls: "bg-muted text-muted-foreground border border-border" };
}

function statusIndicator(current: number, max: number) {
  if (max === 0) return null;
  const pct = (current / max) * 100;
  if (pct >= 100) return { label: "Over", icon: AlertCircle, cls: "text-destructive" };
  if (pct >= 85) return { label: "At Risk", icon: AlertCircle, cls: "text-amber-600" };
  if (pct >= 60) return { label: "On Track", icon: TrendingUp, cls: "text-emerald-600" };
  return { label: "Open", icon: CheckCircle2, cls: "text-muted-foreground" };
}

type GoalDraft = { laf: string; bc: string };

export default function Home() {
  const { data: forecast = [], isLoading, refetch } = trpc.forecast.list.useQuery();
  const { data: routes = [] } = trpc.routes.list.useQuery();
  const { data: timeblocks = [] } = trpc.timeblocks.list.useQuery();

  // Build routes-per-date stats
  const routeStatsByDate = useMemo(() => {
    const tbDate = new Map<number, string>();
    for (const tb of timeblocks as Timeblock[]) tbDate.set(tb.id, toDateKey(tb.blockDate));
    const map = new Map<string, { total: number; planned: number; assigned: number }>();
    for (const r of routes as Route[]) {
      const dk = tbDate.get(r.timeblockId);
      if (!dk) continue;
      if (!map.has(dk)) map.set(dk, { total: 0, planned: 0, assigned: 0 });
      const s = map.get(dk)!;
      s.total++;
      if (["Planned", "Confirmed", "Processed", "Routed", "Completed"].includes(r.status)) s.planned++;
      if (r.driverId) s.assigned++;
    }
    return map;
  }, [routes, timeblocks]);
  const update = trpc.forecast.update.useMutation({ onSuccess: () => refetch() });

  const [drafts, setDrafts] = useState<Record<number, GoalDraft>>({});

  // Seed drafts when forecast loads (stable)
  useEffect(() => {
    if (forecast.length === 0) return;
    setDrafts((prev) => {
      const next = { ...prev };
      for (const f of forecast as ForecastRow[]) {
        if (!next[f.id]) {
          next[f.id] = { laf: String(f.laf2026Goal ?? 0), bc: String(f.bc2026Goal ?? 0) };
        }
      }
      return next;
    });
  }, [forecast]);

  const totals = useMemo(() => {
    let laf2025 = 0, bc2025 = 0, laf2026 = 0, bc2026 = 0, confirmed = 0;
    for (const f of forecast as ForecastRow[]) {
      laf2025 += f.laf2025Actual || 0;
      bc2025 += f.bc2025Actual || 0;
      laf2026 += f.laf2026Goal || 0;
      bc2026 += f.bc2026Goal || 0;
      confirmed += (f.lafConfirmed || 0) + (f.bcConfirmed || 0);
    }
    return { laf2025, bc2025, laf2026, bc2026, confirmed };
  }, [forecast]);

  function saveLaf(f: ForecastRow) {
    const val = parseInt(drafts[f.id]?.laf ?? String(f.laf2026Goal ?? 0), 10);
    if (!Number.isFinite(val) || val === f.laf2026Goal) return;
    update.mutate({ id: f.id, laf2026Goal: val });
  }
  function saveBc(f: ForecastRow) {
    const val = parseInt(drafts[f.id]?.bc ?? String(f.bc2026Goal ?? 0), 10);
    if (!Number.isFinite(val) || val === f.bc2026Goal) return;
    update.mutate({ id: f.id, bc2026Goal: val });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-gradient-to-b from-muted/30 to-transparent">
        <div className="container py-8">
          <div className="flex items-center gap-3 mb-2">
            <Flower className="h-6 w-6 text-primary" />
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
              Mother's Day 2026 · Operations Planning
            </span>
          </div>
          <h1 className="page-title">Scenario Planner</h1>
          <p className="page-subtitle max-w-2xl">
            Daily forecast for the holiday window — April 29 through May 18, 2026. Click any 2026 goal
            or BC estimate to edit inline; totals and scenarios update automatically.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="container py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-border/60">
            <CardContent className="pt-6">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">2025 Total Actual</div>
              <div className="font-serif text-3xl">{(totals.laf2025 + totals.bc2025).toLocaleString()}</div>
              <div className="text-[11px] text-muted-foreground mt-1">
                LAF {totals.laf2025.toLocaleString()} · BC {totals.bc2025.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="pt-6">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">2026 Total Goal</div>
              <div className="font-serif text-3xl text-primary">{(totals.laf2026 + totals.bc2026).toLocaleString()}</div>
              <div className="text-[11px] text-muted-foreground mt-1">
                LAF {totals.laf2026.toLocaleString()} · BC {totals.bc2026.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="pt-6">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Confirmed Orders</div>
              <div className="font-serif text-3xl">{totals.confirmed.toLocaleString()}</div>
              <div className="text-[11px] text-muted-foreground mt-1">
                Sync in Scenarios to refresh from Wodely
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="pt-6">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Routes Budgeted</div>
              <div className="font-serif text-3xl">{routes.length}</div>
              <div className="text-[11px] text-muted-foreground mt-1">
                Across {forecast.length} day{forecast.length === 1 ? "" : "s"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Daily Planning Table — Budget vs 2025 Actual vs Confirmed vs Routes Needed */}
        <PlanningPanel />

        {/* Daily Forecast Table */}
        <Card className="border-border/60 overflow-hidden">
          <div className="px-6 py-4 border-b border-border/60 bg-muted/20">
            <h2 className="font-serif text-xl">Daily Forecast</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Date · Day · SOP · 2025 actuals · 2026 goals (editable) · Max capacity. SOP auto-derived: under 30 Standard, 30-99 High Volume, 100+ Exception.
            </p>
          </div>
          <div className="table-scroll">
            <table className="elegant-table">
              <thead>
                <tr>
                  <th className="sticky-col">Date (2026)</th>
                  <th>Day</th>
                  <th>SOP</th>
                  <th className="text-right">LAF 2025 Actual</th>
                  <th className="text-right">BC 2025 Actual</th>
                  <th className="text-right border-r border-border/60">Total 2025</th>
                  <th className="text-right">LAF 2026 Goal</th>
                  <th className="text-right">BC 2026 (Estimate)</th>
                  <th className="text-right border-r border-border/60">Total 2026 Goal</th>
                  <th className="text-right">Max LAF</th>
                  <th className="text-right border-r border-border/60">Max BC</th>
                  <th className="text-right" title="Confirmed orders / 2026 Goal">% Conf vs Goal</th>
                  <th className="text-right" title="Confirmed orders / Reforecast (or Goal)">% Conf vs Reforecast</th>
                  <th className="text-right" title="Confirmed orders / Max Capacity">% of Max Cap</th>
                  <th className="text-right" title="Routes in Planned+ status / total routes for the day">% Routes Planned</th>
                  <th className="text-right border-r border-border/60" title="Routes with driver assigned / total routes">% Routes Assigned</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={17} className="text-center text-muted-foreground py-8">Loading…</td>
                  </tr>
                )}
                {(forecast as ForecastRow[]).map((f) => {
                  const draft = drafts[f.id] ?? {
                    laf: String(f.laf2026Goal ?? 0),
                    bc: String(f.bc2026Goal ?? 0),
                  };
                  const total2025 = (f.laf2025Actual || 0) + (f.bc2025Actual || 0);
                  const totalGoal = (f.laf2026Goal || 0) + (f.bc2026Goal || 0);
                  const totalCap = (f.maxLafCapacity || 0) + (f.maxBcCapacity || 0);
                  const status = statusIndicator(totalGoal, totalCap);
                  const dKey = toDateKey(f.forecastDate);
                  const totalConfirmed = (f.lafConfirmed || 0) + (f.bcConfirmed || 0);
                  const reforecast = (f.reforecastLafGoal ?? f.laf2026Goal ?? 0) + (f.reforecastBcGoal ?? f.bc2026Goal ?? 0);
                  const pctVsGoal = totalGoal > 0 ? (totalConfirmed / totalGoal) * 100 : null;
                  const pctVsReforecast = reforecast > 0 ? (totalConfirmed / reforecast) * 100 : null;
                  const pctVsMax = totalCap > 0 ? (totalConfirmed / totalCap) * 100 : null;
                  const stats = routeStatsByDate.get(dKey) ?? { total: 0, planned: 0, assigned: 0 };
                  const pctRoutesPlanned = stats.total > 0 ? (stats.planned / stats.total) * 100 : null;
                  const pctRoutesAssigned = stats.total > 0 ? (stats.assigned / stats.total) * 100 : null;
                  return (
                    <tr key={f.id}>
                      <td className="whitespace-nowrap font-medium sticky-col">{formatDate(f.forecastDate)}</td>
                      <td className="text-muted-foreground">{dayName(f.forecastDate)}</td>
                      <td>
                        {(() => {
                          const sop = deriveSop(f.laf2026Goal || 0);
                          return <Badge className={`${sop.cls} font-normal`}>{sop.label}</Badge>;
                        })()}
                      </td>
                      <td className="num-cell">{f.laf2025Actual || "—"}</td>
                      <td className="num-cell">{f.bc2025Actual || "—"}</td>
                      <td className="num-cell border-r border-border/60 font-medium">
                        {total2025 || "—"}
                      </td>
                      <td className="num-cell">
                        <Input
                          type="number"
                          min={0}
                          value={draft.laf}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [f.id]: { ...(prev[f.id] ?? draft), laf: e.target.value },
                            }))
                          }
                          onBlur={() => saveLaf(f)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                          }}
                          className="h-8 w-20 text-right text-sm num-cell ml-auto"
                        />
                      </td>
                      <td className="num-cell">
                        <Input
                          type="number"
                          min={0}
                          value={draft.bc}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [f.id]: { ...(prev[f.id] ?? draft), bc: e.target.value },
                            }))
                          }
                          onBlur={() => saveBc(f)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                          }}
                          className="h-8 w-20 text-right text-sm num-cell ml-auto"
                        />
                      </td>
                      <td className="num-cell border-r border-border/60 font-medium text-primary">
                        {totalGoal}
                      </td>
                      <td className="num-cell text-muted-foreground">{f.maxLafCapacity}</td>
                      <td className="num-cell text-muted-foreground border-r border-border/60">{f.maxBcCapacity}</td>
                      <td className="num-cell">{pctBadge(pctVsGoal)}</td>
                      <td className="num-cell">{pctBadge(pctVsReforecast)}</td>
                      <td className="num-cell">{pctBadge(pctVsMax)}</td>
                      <td className="num-cell">{pctBadge(pctRoutesPlanned)}</td>
                      <td className="num-cell border-r border-border/60">{pctBadge(pctRoutesAssigned)}</td>
                      <td>
                        {status && (
                          <span className={`inline-flex items-center gap-1.5 text-xs ${status.cls}`}>
                            <status.icon className="h-3.5 w-3.5" />
                            {status.label}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border/70 bg-muted/30">
                  <td colSpan={3} className="font-medium">Totals</td>
                  <td className="num-cell font-medium">{totals.laf2025.toLocaleString()}</td>
                  <td className="num-cell font-medium">{totals.bc2025.toLocaleString()}</td>
                  <td className="num-cell border-r border-border/60 font-medium">
                    {(totals.laf2025 + totals.bc2025).toLocaleString()}
                  </td>
                  <td className="num-cell font-medium">{totals.laf2026.toLocaleString()}</td>
                  <td className="num-cell font-medium">{totals.bc2026.toLocaleString()}</td>
                  <td className="num-cell border-r border-border/60 font-medium text-primary">
                    {(totals.laf2026 + totals.bc2026).toLocaleString()}
                  </td>
                  <td className="num-cell font-medium">
                    {forecast.reduce((s, f) => s + (f.maxLafCapacity || 0), 0).toLocaleString()}
                  </td>
                  <td className="num-cell font-medium border-r border-border/60">
                    {forecast.reduce((s, f) => s + (f.maxBcCapacity || 0), 0).toLocaleString()}
                  </td>
                  <td colSpan={5} />
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
