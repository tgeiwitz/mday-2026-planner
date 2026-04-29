import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useMemo, useState, useEffect } from "react";
import { Camera, Loader2, ArrowRight, Minus, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function fmtDate(d: string | Date) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function fmtRunTime(d: string | Date) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function Delta({ cur, prev, currency = false }: { cur: number; prev: number; currency?: boolean }) {
  const diff = cur - prev;
  const pct = prev !== 0 ? (diff / prev) * 100 : 0;
  if (Math.abs(diff) < 0.01) {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground text-[11px]">
        <Minus className="h-3 w-3" /> 0
      </span>
    );
  }
  const up = diff > 0;
  const color = up ? "text-emerald-600" : "text-rose-600";
  const Icon = up ? TrendingUp : TrendingDown;
  const sign = up ? "+" : "";
  const val = currency ? `${sign}$${diff.toFixed(0)}` : `${sign}${diff}`;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${color}`}>
      <Icon className="h-3 w-3" />
      {val}
      {prev !== 0 && <span className="text-[10px] opacity-60">({sign}{pct.toFixed(0)}%)</span>}
    </span>
  );
}

export default function Snapshots() {
  const { data: runs = [], refetch: refetchRuns } = trpc.snapshots.list.useQuery();
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [compareRunId, setCompareRunId] = useState<number | null>(null);

  useEffect(() => {
    if (runs.length > 0 && selectedRunId === null) {
      setSelectedRunId(runs[0].id);
      if (runs.length > 1) setCompareRunId(runs[1].id);
    }
  }, [runs, selectedRunId]);

  const { data: currentRows = [] } = trpc.snapshots.getRows.useQuery(
    { runId: selectedRunId ?? 0 },
    { enabled: selectedRunId !== null }
  );
  const { data: compareRows = [] } = trpc.snapshots.getRows.useQuery(
    { runId: compareRunId ?? 0 },
    { enabled: compareRunId !== null }
  );

  const capture = trpc.snapshots.capture.useMutation({
    onSuccess: () => {
      refetchRuns();
      toast.success("Snapshot captured");
    },
    onError: (err) => toast.error(`Snapshot failed: ${err.message}`),
  });

  const compareMap = useMemo(() => {
    const m = new Map<string, (typeof compareRows)[number]>();
    for (const r of compareRows) {
      const k =
        r.forecastDate instanceof Date
          ? `${r.forecastDate.getUTCFullYear()}-${String(r.forecastDate.getUTCMonth() + 1).padStart(2, "0")}-${String(r.forecastDate.getUTCDate()).padStart(2, "0")}`
          : String(r.forecastDate).slice(0, 10);
      m.set(k, r);
    }
    return m;
  }, [compareRows]);

  const selectedRun = runs.find((r) => r.id === selectedRunId);
  const compareRun = runs.find((r) => r.id === compareRunId);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-gradient-to-b from-muted/30 to-transparent">
        <div className="container py-8">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
            History &amp; Deltas
          </span>
          <h1 className="page-title mt-1">Snapshots</h1>
          <p className="page-subtitle max-w-3xl">
            Daily auto-captures plus on-demand snapshots. Compare any two points in time to see how
            goals, confirmed orders, revenue, and driver pay have shifted.
          </p>
        </div>
      </div>

      <div className="container py-8 space-y-6">
        <Card className="border-border/60">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  Viewing
                </div>
                <Select
                  value={selectedRunId ? String(selectedRunId) : ""}
                  onValueChange={(v) => setSelectedRunId(parseInt(v))}
                >
                  <SelectTrigger className="w-[260px]">
                    <SelectValue placeholder="Pick a snapshot..." />
                  </SelectTrigger>
                  <SelectContent>
                    {runs.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {fmtRunTime(r.createdAt)} — {r.triggerType}
                        {r.label ? ` (${r.label})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground mb-3" />
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  Compare to
                </div>
                <Select
                  value={compareRunId ? String(compareRunId) : "none"}
                  onValueChange={(v) => setCompareRunId(v === "none" ? null : parseInt(v))}
                >
                  <SelectTrigger className="w-[260px]">
                    <SelectValue placeholder="No comparison" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No comparison</SelectItem>
                    {runs.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {fmtRunTime(r.createdAt)} — {r.triggerType}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1" />
              <Button
                variant="outline"
                size="sm"
                disabled={capture.isPending}
                onClick={() => capture.mutate({ label: "manual" })}
                className="gap-2"
              >
                {capture.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
                Snapshot Now
              </Button>
            </div>
          </CardContent>
        </Card>

        {selectedRun && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: "Routes", cur: selectedRun.totalRoutes, prev: compareRun?.totalRoutes ?? 0 },
              {
                label: "LAF Confirmed",
                cur: selectedRun.totalConfirmedLaf,
                prev: compareRun?.totalConfirmedLaf ?? 0,
              },
              {
                label: "BC Confirmed",
                cur: selectedRun.totalConfirmedBc,
                prev: compareRun?.totalConfirmedBc ?? 0,
              },
              {
                label: "Revenue",
                cur: Number(selectedRun.totalRevenue),
                prev: Number(compareRun?.totalRevenue ?? 0),
                currency: true,
              },
              {
                label: "Driver Pay",
                cur: Number(selectedRun.totalDriverPay),
                prev: Number(compareRun?.totalDriverPay ?? 0),
                currency: true,
              },
            ].map((m) => (
              <Card key={m.label} className="border-border/60">
                <CardContent className="pt-5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {m.label}
                  </div>
                  <div className="font-serif text-2xl">
                    {m.currency ? `$${m.cur.toFixed(0)}` : m.cur}
                  </div>
                  {compareRun && <Delta cur={m.cur} prev={m.prev} currency={m.currency} />}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="border-border/60 overflow-hidden">
          <div className="px-6 py-4 border-b border-border/60 bg-muted/20 flex items-center justify-between">
            <div>
              <h2 className="font-serif text-xl">Day-by-Day</h2>
              <p className="text-[11px] text-muted-foreground mt-1">
                {compareRun && selectedRun
                  ? `Deltas: ${fmtRunTime(compareRun.createdAt)} → ${fmtRunTime(selectedRun.createdAt)}`
                  : "Select a comparison snapshot to see deltas"}
              </p>
            </div>
            {selectedRun && (
              <Badge variant="outline" className="font-mono text-[11px]">
                {selectedRun.triggerType === "auto" ? "Auto" : "Manual"}
              </Badge>
            )}
          </div>
          <table className="elegant-table">
            <thead>
              <tr>
                <th>Date</th>
                <th className="text-right">LAF Goal</th>
                <th className="text-right">BC Goal</th>
                <th className="text-right">LAF Conf.</th>
                <th className="text-right">BC Conf.</th>
                <th className="text-right">Planned</th>
                <th className="text-right">Conf. Routes</th>
                <th className="text-right">Revenue</th>
                <th className="text-right">Driver Pay</th>
              </tr>
            </thead>
            <tbody>
              {currentRows.map((r) => {
                const k =
                  r.forecastDate instanceof Date
                    ? `${r.forecastDate.getUTCFullYear()}-${String(r.forecastDate.getUTCMonth() + 1).padStart(2, "0")}-${String(r.forecastDate.getUTCDate()).padStart(2, "0")}`
                    : String(r.forecastDate).slice(0, 10);
                const prev = compareMap.get(k);
                return (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap font-medium">{fmtDate(r.forecastDate)}</td>
                    <td className="num-cell">
                      {r.laf2026Goal}
                      {prev && (
                        <div>
                          <Delta cur={r.laf2026Goal} prev={prev.laf2026Goal} />
                        </div>
                      )}
                    </td>
                    <td className="num-cell">
                      {r.bc2026Goal}
                      {prev && (
                        <div>
                          <Delta cur={r.bc2026Goal} prev={prev.bc2026Goal} />
                        </div>
                      )}
                    </td>
                    <td className="num-cell text-emerald-700">
                      {r.lafConfirmed}
                      {prev && (
                        <div>
                          <Delta cur={r.lafConfirmed} prev={prev.lafConfirmed} />
                        </div>
                      )}
                    </td>
                    <td className="num-cell text-emerald-700">
                      {r.bcConfirmed}
                      {prev && (
                        <div>
                          <Delta cur={r.bcConfirmed} prev={prev.bcConfirmed} />
                        </div>
                      )}
                    </td>
                    <td className="num-cell">
                      {r.routesPlanned}
                      {prev && (
                        <div>
                          <Delta cur={r.routesPlanned} prev={prev.routesPlanned} />
                        </div>
                      )}
                    </td>
                    <td className="num-cell">
                      {r.routesConfirmed}
                      {prev && (
                        <div>
                          <Delta cur={r.routesConfirmed} prev={prev.routesConfirmed} />
                        </div>
                      )}
                    </td>
                    <td className="num-cell text-primary">
                      ${Number(r.revenue).toFixed(0)}
                      {prev && (
                        <div>
                          <Delta cur={Number(r.revenue)} prev={Number(prev.revenue)} currency />
                        </div>
                      )}
                    </td>
                    <td className="num-cell">
                      ${Number(r.driverPay).toFixed(0)}
                      {prev && (
                        <div>
                          <Delta cur={Number(r.driverPay)} prev={Number(prev.driverPay)} currency />
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {currentRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-muted-foreground text-sm">
                    No snapshot selected. Click "Snapshot Now" to capture the current state.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
