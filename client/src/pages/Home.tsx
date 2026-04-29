import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Flower, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
  maxLafCapacity: number;
  maxBcCapacity: number;
};

function formatDate(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function dayName(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
}

function phaseColor(phase: string) {
  if (phase === "Mother's Day") return "bg-primary text-primary-foreground";
  if (phase === "Peak") return "bg-amber-100 text-amber-900 border border-amber-200";
  if (phase === "Holiday Week") return "bg-rose-50 text-rose-900 border border-rose-200";
  return "bg-muted text-muted-foreground border border-border";
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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

        {/* Daily Forecast Table */}
        <Card className="border-border/60 overflow-hidden">
          <div className="px-6 py-4 border-b border-border/60 bg-muted/20">
            <h2 className="font-serif text-xl">Daily Forecast</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Date · Day · Phase · 2025 actuals · 2026 goals (editable) · Max capacity
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="elegant-table">
              <thead>
                <tr>
                  <th>Date (2026)</th>
                  <th>Day</th>
                  <th>Phase</th>
                  <th className="text-right">LAF 2025 Actual</th>
                  <th className="text-right">BC 2025 Actual</th>
                  <th className="text-right border-r border-border/60">Total 2025</th>
                  <th className="text-right">LAF 2026 Goal</th>
                  <th className="text-right">BC 2026 (Estimate)</th>
                  <th className="text-right border-r border-border/60">Total 2026 Goal</th>
                  <th className="text-right">Max LAF</th>
                  <th className="text-right">Max BC</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={12} className="text-center text-muted-foreground py-8">Loading…</td>
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
                  return (
                    <tr key={f.id}>
                      <td className="whitespace-nowrap font-medium">{formatDate(f.forecastDate)}</td>
                      <td className="text-muted-foreground">{dayName(f.forecastDate)}</td>
                      <td>
                        <Badge className={`${phaseColor(f.phase)} font-normal`}>{f.phase}</Badge>
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
                      <td className="num-cell text-muted-foreground">{f.maxBcCapacity}</td>
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
                  <td className="num-cell font-medium">
                    {forecast.reduce((s, f) => s + (f.maxBcCapacity || 0), 0).toLocaleString()}
                  </td>
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
