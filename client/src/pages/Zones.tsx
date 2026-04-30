import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { addDays, todayNY } from "@/lib/date";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";

export default function Zones() {
  const utils = trpc.useUtils();
  const { data: zones = [], refetch } = trpc.zones.list.useQuery();
  const { data: settings } = trpc.settings.get.useQuery();
  const updateZone = trpc.zones.update.useMutation({
    onSuccess: () => {
      toast.success("Zone updated");
      refetch();
    },
  });
  const updateSettings = trpc.settings.update.useMutation({
    onSuccess: (_d, vars) => {
      const label =
        vars.travelTimeSource === "lastYear" ? "M-Day 2025 (LY)"
        : vars.travelTimeSource === "sixtyDay" ? "60-Day Average"
        : "2026 Assumption";
      toast.success(`Route durations now using ${label}`);
      utils.settings.invalidate();
      utils.zones.invalidate();
      utils.routes?.invalidate?.();
    },
  });
  const travelSource = (settings as { travelTimeSource?: "2026" | "lastYear" | "sixtyDay" } | undefined)?.travelTimeSource ?? "2026";

  const [edits, setEdits] = useState<Record<number, Record<string, string>>>({});

  useEffect(() => {
    const init: Record<number, Record<string, string>> = {};
    for (const z of zones) {
      init[z.id] = {
        travelTime2026: String(z.travelTime2026),
        distance2026: String(z.distance2026),
        lafFee2026: String(z.lafFee2026),
        bcFee2026: String(z.bcFee2026),
      };
    }
    setEdits(init);
  }, [zones.length]);

  const handleBlur = (id: number, field: string, value: string) => {
    updateZone.mutate({ id, [field]: value } as any);
  };

  // ---------- Zone Distribution comparison ----------
  const [today] = useState(() => todayNY());
  const [startA, setStartA] = useState(() => today);
  const [endA, setEndA] = useState(() => addDays(today, 6));
  const [startB, setStartB] = useState(() => today);
  const [endB, setEndB] = useState(() => addDays(today, 6));

  const distQuery = trpc.zones.distribution.useQuery({ startA, endA, startB, endB });

  type DRow = {
    zoneId: number; zoneName: string;
    lafCount: number; bcCount: number;
    lafPct: number; bcPct: number;
    lafAvgFee: number; bcAvgFee: number;
  };

  const merged = useMemo(() => {
    const a = (distQuery.data?.rangeA.rows ?? []) as DRow[];
    const b = (distQuery.data?.rangeB.rows ?? []) as DRow[];
    const byZone = new Map<number, { zoneName: string; a?: DRow; b?: DRow }>();
    for (const r of a) byZone.set(r.zoneId, { zoneName: r.zoneName, a: r });
    for (const r of b) {
      const ex = byZone.get(r.zoneId);
      if (ex) ex.b = r;
      else byZone.set(r.zoneId, { zoneName: r.zoneName, b: r });
    }
    const rows = Array.from(byZone.entries()).map(([zoneId, v]) => ({ zoneId, ...v }));
    rows.sort((x, y) => {
      const xT = (x.a?.lafCount ?? 0) + (x.a?.bcCount ?? 0) + (x.b?.lafCount ?? 0) + (x.b?.bcCount ?? 0);
      const yT = (y.a?.lafCount ?? 0) + (y.a?.bcCount ?? 0) + (y.b?.lafCount ?? 0) + (y.b?.bcCount ?? 0);
      return yT - xT;
    });
    return rows;
  }, [distQuery.data]);

  const totalsA = distQuery.data?.rangeA.totals ?? { laf: 0, bc: 0 };
  const totalsB = distQuery.data?.rangeB.totals ?? { laf: 0, bc: 0 };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-gradient-to-b from-muted/30 to-transparent">
        <div className="container py-8">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
            Historical Baseline
          </span>
          <h1 className="page-title mt-1">Zone Metrics</h1>
          <p className="page-subtitle max-w-3xl">
            Travel time, distance per stop, and task fees by zone. Seeded from May 5–12, 2025.
            The 2026 Assumption column is editable and flows through to route economics.
          </p>

          {/* Travel time source toggle — controls which column drives route duration calculations */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
                Route Duration Source
              </span>
              <span className="text-xs text-muted-foreground">
                Choose which travel-time column the planner uses to estimate route durations.
              </span>
            </div>
            <div className="inline-flex rounded-md border border-border/60 bg-card p-0.5" role="radiogroup" aria-label="Travel time source">
              {[
                { v: "lastYear" as const, label: "M-Day 2025 (LY)" },
                { v: "sixtyDay" as const, label: "60-Day Avg" },
                { v: "2026" as const, label: "2026 Assumption" },
              ].map((opt) => {
                const active = travelSource === opt.v;
                return (
                  <button
                    key={opt.v}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={updateSettings.isPending}
                    onClick={() => {
                      if (active) return;
                      updateSettings.mutate({ travelTimeSource: opt.v });
                    }}
                    className={
                      "px-3 py-1.5 text-xs font-medium rounded-[5px] transition-colors " +
                      (active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50") +
                      (updateSettings.isPending ? " opacity-60 cursor-wait" : "")
                    }
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {updateSettings.isPending && (
              <span className="text-xs text-muted-foreground">Recalculating routes…</span>
            )}
          </div>
        </div>
      </div>

      <div className="container py-8 space-y-8">
        <Card className="border-border/60 overflow-hidden">
          <div className="table-scroll">
            <table className="elegant-table">
              <thead>
                <tr>
                  <th rowSpan={2} className="align-bottom sticky-col">Zone</th>
                  <th colSpan={4} className="text-center border-r border-border/60">Travel Time (min/task)</th>
                  <th colSpan={3} className="text-center border-r border-border/60">Distance (mi/stop)</th>
                  <th colSpan={3} className="text-center border-r border-border/60">LAF Avg Fee</th>
                  <th colSpan={3} className="text-center">BC Avg Fee</th>
                </tr>
                <tr>
                  <th className="!py-2 text-[10px]">Last Year</th>
                  <th className="!py-2 text-[10px]">60-Day</th>
                  <th className="!py-2 text-[10px] bg-primary/5">2026</th>
                  <th className="!py-2 text-[10px] border-r border-border/60" title="Which travel-time column drives this zone's route duration">Source</th>
                  <th className="!py-2 text-[10px]">Last Year</th>
                  <th className="!py-2 text-[10px]">60-Day</th>
                  <th className="!py-2 text-[10px] border-r border-border/60 bg-primary/5">2026</th>
                  <th className="!py-2 text-[10px]">Last Year</th>
                  <th className="!py-2 text-[10px]">60-Day</th>
                  <th className="!py-2 text-[10px] border-r border-border/60 bg-primary/5">2026</th>
                  <th className="!py-2 text-[10px]">Last Year</th>
                  <th className="!py-2 text-[10px]">60-Day</th>
                  <th className="!py-2 text-[10px] bg-primary/5">2026</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((z) => {
                  const e = edits[z.id] || {};
                  return (
                    <tr key={z.id}>
                      <td className="sticky-col min-w-[180px]">
                        <div className="font-medium leading-tight text-sm">{z.zoneName ?? "—"}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">#{z.zoneId}</div>
                      </td>
                      <td className={"num-cell " + ((z as { travelTimeSource?: string }).travelTimeSource === "lastYear" ? "font-semibold text-foreground" : "text-muted-foreground")}>{Number(z.travelTimeLastYear).toFixed(2)}</td>
                      <td className={"num-cell " + ((z as { travelTimeSource?: string }).travelTimeSource === "sixtyDay" ? "font-semibold text-foreground" : "text-muted-foreground")}>{Number(z.travelTime60Day).toFixed(2)}</td>
                      <td className="!py-1 !px-2 bg-primary/5">
                        <Input
                          className="h-8 text-xs font-mono text-right border-transparent bg-transparent hover:border-border focus:border-ring"
                          value={e.travelTime2026 ?? ""}
                          onChange={(ev) =>
                            setEdits((p) => ({ ...p, [z.id]: { ...p[z.id], travelTime2026: ev.target.value } }))
                          }
                          onBlur={(ev) => handleBlur(z.id, "travelTime2026", ev.target.value)}
                        />
                      </td>
                      <td className="!py-1 !px-2 border-r border-border/60">
                        <select
                          className="h-8 text-xs rounded-md border border-border/60 bg-background px-2 w-full focus:outline-none focus:ring-2 focus:ring-ring"
                          value={(z as { travelTimeSource?: string }).travelTimeSource ?? "global"}
                          onChange={(ev) => updateZone.mutate({ id: z.id, travelTimeSource: ev.target.value as "global" | "lastYear" | "sixtyDay" | "y2026" })}
                          title="Travel-time source used for route duration calculations"
                        >
                          <option value="global">Global ({travelSource === "lastYear" ? "LY" : travelSource === "sixtyDay" ? "60d" : "2026"})</option>
                          <option value="lastYear">M-Day 2025 (LY)</option>
                          <option value="sixtyDay">60-Day Avg</option>
                          <option value="y2026">2026 Assumption</option>
                        </select>
                      </td>
                      <td className="num-cell text-muted-foreground">{Number(z.distanceLastYear).toFixed(1)}</td>
                      <td className="num-cell text-muted-foreground">{Number(z.distance60Day).toFixed(1)}</td>
                      <td className="!py-1 !px-2 border-r border-border/60 bg-primary/5">
                        <Input
                          className="h-8 text-xs font-mono text-right border-transparent bg-transparent hover:border-border focus:border-ring"
                          value={e.distance2026 ?? ""}
                          onChange={(ev) =>
                            setEdits((p) => ({ ...p, [z.id]: { ...p[z.id], distance2026: ev.target.value } }))
                          }
                          onBlur={(ev) => handleBlur(z.id, "distance2026", ev.target.value)}
                        />
                      </td>
                      <td className="num-cell text-muted-foreground">${Number(z.lafFeeLastYear).toFixed(2)}</td>
                      <td className="num-cell text-muted-foreground">${Number(z.lafFee60Day).toFixed(2)}</td>
                      <td className="!py-1 !px-2 border-r border-border/60 bg-primary/5">
                        <Input
                          className="h-8 text-xs font-mono text-right border-transparent bg-transparent hover:border-border focus:border-ring"
                          value={e.lafFee2026 ?? ""}
                          onChange={(ev) =>
                            setEdits((p) => ({ ...p, [z.id]: { ...p[z.id], lafFee2026: ev.target.value } }))
                          }
                          onBlur={(ev) => handleBlur(z.id, "lafFee2026", ev.target.value)}
                        />
                      </td>
                      <td className="num-cell text-muted-foreground">${Number(z.bcFeeLastYear).toFixed(2)}</td>
                      <td className="num-cell text-muted-foreground">${Number(z.bcFee60Day).toFixed(2)}</td>
                      <td className="!py-1 !px-2 bg-primary/5">
                        <Input
                          className="h-8 text-xs font-mono text-right border-transparent bg-transparent hover:border-border focus:border-ring"
                          value={e.bcFee2026 ?? ""}
                          onChange={(ev) =>
                            setEdits((p) => ({ ...p, [z.id]: { ...p[z.id], bcFee2026: ev.target.value } }))
                          }
                          onBlur={(ev) => handleBlur(z.id, "bcFee2026", ev.target.value)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Zone Distribution: Range A vs Range B */}
        <Card className="border-border/60 overflow-hidden">
          <div className="px-5 pt-5 pb-4 border-b border-border/60">
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
                Demand Distribution
              </span>
              <h2 className="text-lg font-semibold">Zone Distribution — Range A vs Range B</h2>
              <p className="text-sm text-muted-foreground max-w-3xl">
                Compare two date windows to see where LAF and BC demand is concentrating by zone.
                Uses 2025 history for dates in 2025 and confirmed Wodely tasks for dates in 2026.
                Defaults to today through today + 6 for both ranges — adjust to compare last year
                to this year, week-over-week, or any two windows.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Range A</div>
                <div className="flex items-center gap-2">
                  <Input type="date" value={startA} onChange={(e) => setStartA(e.target.value)} className="h-9 text-sm" />
                  <span className="text-muted-foreground text-xs">to</span>
                  <Input type="date" value={endA} onChange={(e) => setEndA(e.target.value)} className="h-9 text-sm" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Range B</div>
                <div className="flex items-center gap-2">
                  <Input type="date" value={startB} onChange={(e) => setStartB(e.target.value)} className="h-9 text-sm" />
                  <span className="text-muted-foreground text-xs">to</span>
                  <Input type="date" value={endB} onChange={(e) => setEndB(e.target.value)} className="h-9 text-sm" />
                </div>
              </div>
            </div>
          </div>

          <div className="table-scroll">
            <table className="elegant-table">
              <thead>
                <tr>
                  <th rowSpan={2} className="align-bottom sticky-col">Zone</th>
                  <th colSpan={3} className="text-center border-r border-border/60 bg-muted/30">Range A · LAF</th>
                  <th colSpan={3} className="text-center border-r border-border/60 bg-muted/30">Range A · BC</th>
                  <th colSpan={3} className="text-center border-r border-border/60 bg-primary/5">Range B · LAF</th>
                  <th colSpan={3} className="text-center border-r border-border/60 bg-primary/5">Range B · BC</th>
                  <th colSpan={2} className="text-center">Δ Share</th>
                </tr>
                <tr>
                  <th className="!py-2 text-[10px] bg-muted/30">Count</th>
                  <th className="!py-2 text-[10px] bg-muted/30">%</th>
                  <th className="!py-2 text-[10px] border-r border-border/60 bg-muted/30">Avg Fee</th>
                  <th className="!py-2 text-[10px] bg-muted/30">Count</th>
                  <th className="!py-2 text-[10px] bg-muted/30">%</th>
                  <th className="!py-2 text-[10px] border-r border-border/60 bg-muted/30">Avg Fee</th>
                  <th className="!py-2 text-[10px] bg-primary/5">Count</th>
                  <th className="!py-2 text-[10px] bg-primary/5">%</th>
                  <th className="!py-2 text-[10px] border-r border-border/60 bg-primary/5">Avg Fee</th>
                  <th className="!py-2 text-[10px] bg-primary/5">Count</th>
                  <th className="!py-2 text-[10px] bg-primary/5">%</th>
                  <th className="!py-2 text-[10px] border-r border-border/60 bg-primary/5">Avg Fee</th>
                  <th className="!py-2 text-[10px]">LAF</th>
                  <th className="!py-2 text-[10px]">BC</th>
                </tr>
              </thead>
              <tbody>
                {distQuery.isLoading && (
                  <tr><td colSpan={15} className="text-center text-muted-foreground py-6">Loading…</td></tr>
                )}
                {!distQuery.isLoading && distQuery.isError && (
                  <tr><td colSpan={15} className="text-center text-rose-600 py-6">
                    Failed to load distribution — {distQuery.error?.message ?? "unknown error"}.
                    <button
                      onClick={() => distQuery.refetch()}
                      className="ml-2 underline text-rose-700 hover:text-rose-800"
                    >Retry</button>
                  </td></tr>
                )}
                {!distQuery.isLoading && !distQuery.isError && merged.length === 0 && (
                  <tr><td colSpan={15} className="text-center text-muted-foreground py-6">No data in either range.</td></tr>
                )}
                {merged.map((row) => {
                  const a = row.a;
                  const b = row.b;
                  const deltaLaf = (b?.lafPct ?? 0) - (a?.lafPct ?? 0);
                  const deltaBc = (b?.bcPct ?? 0) - (a?.bcPct ?? 0);
                  const fmtPct = (n: number) => `${n.toFixed(1)}%`;
                  const fmtFee = (n: number) => n > 0 ? `$${n.toFixed(2)}` : "—";
                  const fmtDelta = (n: number) => {
                    if (Math.abs(n) < 0.05) return "—";
                    const sign = n > 0 ? "+" : "";
                    return `${sign}${n.toFixed(1)}`;
                  };
                  const deltaClass = (n: number) =>
                    Math.abs(n) < 0.05 ? "text-muted-foreground" : n > 0 ? "text-emerald-600" : "text-rose-600";
                  return (
                    <tr key={row.zoneId}>
                      <td className="sticky-col min-w-[160px]">
                        <div className="font-medium text-sm leading-tight">{row.zoneName}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">#{row.zoneId}</div>
                      </td>
                      <td className="num-cell bg-muted/10">{a?.lafCount ?? 0}</td>
                      <td className="num-cell bg-muted/10">{fmtPct(a?.lafPct ?? 0)}</td>
                      <td className="num-cell border-r border-border/60 bg-muted/10">{fmtFee(a?.lafAvgFee ?? 0)}</td>
                      <td className="num-cell bg-muted/10">{a?.bcCount ?? 0}</td>
                      <td className="num-cell bg-muted/10">{fmtPct(a?.bcPct ?? 0)}</td>
                      <td className="num-cell border-r border-border/60 bg-muted/10">{fmtFee(a?.bcAvgFee ?? 0)}</td>
                      <td className="num-cell bg-primary/5">{b?.lafCount ?? 0}</td>
                      <td className="num-cell bg-primary/5">{fmtPct(b?.lafPct ?? 0)}</td>
                      <td className="num-cell border-r border-border/60 bg-primary/5">{fmtFee(b?.lafAvgFee ?? 0)}</td>
                      <td className="num-cell bg-primary/5">{b?.bcCount ?? 0}</td>
                      <td className="num-cell bg-primary/5">{fmtPct(b?.bcPct ?? 0)}</td>
                      <td className="num-cell border-r border-border/60 bg-primary/5">{fmtFee(b?.bcAvgFee ?? 0)}</td>
                      <td className={`num-cell font-medium ${deltaClass(deltaLaf)}`}>{fmtDelta(deltaLaf)}</td>
                      <td className={`num-cell font-medium ${deltaClass(deltaBc)}`}>{fmtDelta(deltaBc)}</td>
                    </tr>
                  );
                })}
              </tbody>
              {merged.length > 0 && (
                <tfoot>
                  <tr className="font-semibold bg-muted/40">
                    <td className="sticky-col">Totals</td>
                    <td className="num-cell">{totalsA.laf}</td>
                    <td className="num-cell">100.0%</td>
                    <td className="num-cell border-r border-border/60">—</td>
                    <td className="num-cell">{totalsA.bc}</td>
                    <td className="num-cell">100.0%</td>
                    <td className="num-cell border-r border-border/60">—</td>
                    <td className="num-cell">{totalsB.laf}</td>
                    <td className="num-cell">100.0%</td>
                    <td className="num-cell border-r border-border/60">—</td>
                    <td className="num-cell">{totalsB.bc}</td>
                    <td className="num-cell">100.0%</td>
                    <td className="num-cell border-r border-border/60">—</td>
                    <td className="num-cell">—</td>
                    <td className="num-cell">—</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
