import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { useMemo, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";

type Mode = "Budget" | "Confirmed" | "Reforecast";

import { fmtDate, toISODate } from "@/lib/date";

export default function Scenarios() {
  const [mode, setMode] = useState<Mode>("Budget");
  const [volumeAdj, setVolumeAdj] = useState([100]); // percentage
  const [feeAdj, setFeeAdj] = useState([100]);
  const [showPast, setShowPast] = useState(false);
  const todayIso = toISODate(new Date());
  const { data: routes = [] } = trpc.routes.list.useQuery();
  const { data: timeblocks = [] } = trpc.timeblocks.list.useQuery();
  const { data: forecast = [], refetch: refetchForecast } = trpc.forecast.list.useQuery();
  const [lastSync, setLastSync] = useState<string | null>(null);
  const syncWodely = trpc.wodely.syncConfirmed.useMutation({
    onSuccess: (res) => {
      setLastSync(new Date().toLocaleString());
      refetchForecast();
      toast.success(`Wodely sync: ${res.syncedDates} days updated (${res.totalTasks} tasks)`);
    },
    onError: (err) => {
      toast.error(`Wodely sync failed: ${err.message}`);
    },
  });

  const tbMap = new Map(timeblocks.map((t) => [t.id, t]));

  const rows = useMemo(() => {
    const byDate = new Map<string, {
      date: string;
      routes: number;
      tasks: number;
      revenue: number;
      driverPay: number;
      platform: number;
      capacity: number;
    }>();

    for (const r of routes) {
      const tb = tbMap.get(r.timeblockId);
      if (!tb) continue;
      const dateKey = toISODate(tb.blockDate);

      // Determine if route is "active" under this mode
      if (mode === "Confirmed" && !["Confirmed", "Processed", "Routed", "Completed"].includes(r.status)) continue;
      // Reforecast uses confirmed as base, then applies volume/fee multipliers
      const applyMultipliers = mode === "Reforecast";
      const volMult = applyMultipliers ? volumeAdj[0] / 100 : 1;
      const feeMult = applyMultipliers ? feeAdj[0] / 100 : 1;
      if (!byDate.has(dateKey)) {
        byDate.set(dateKey, {
          date: dateKey,
          routes: 0,
          tasks: 0,
          revenue: 0,
          driverPay: 0,
          platform: 0,
          capacity: 0,
        });
      }
      const row = byDate.get(dateKey)!;
      row.routes += 1;
      row.tasks += Math.round(r.stops * volMult);
      row.revenue += Number(r.estRouteFee) * volMult * feeMult;
      row.driverPay += (Number(r.estDriverPay) * volMult * feeMult) + Number(r.estMileagePay) + Number(r.driverBonus);
      row.platform += Number(r.estPlatformFee) * volMult * feeMult;
    }

    // Merge with forecast for capacity
    for (const f of forecast) {
      const k = toISODate(f.forecastDate);
      if (!byDate.has(k)) {
        byDate.set(k, {
          date: k,
          routes: 0,
          tasks: 0,
          revenue: 0,
          driverPay: 0,
          platform: 0,
          capacity: (f.maxLafCapacity || 0) + (f.maxBcCapacity || 0),
        });
      } else {
        byDate.get(k)!.capacity = (f.maxLafCapacity || 0) + (f.maxBcCapacity || 0);
      }
    }

    return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [routes, timeblocks, forecast, mode]);

  const totals = rows.reduce(
    (acc, r) => ({
      routes: acc.routes + r.routes,
      tasks: acc.tasks + r.tasks,
      revenue: acc.revenue + r.revenue,
      driverPay: acc.driverPay + r.driverPay,
      platform: acc.platform + r.platform,
      capacity: acc.capacity + r.capacity,
    }),
    { routes: 0, tasks: 0, revenue: 0, driverPay: 0, platform: 0, capacity: 0 }
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-gradient-to-b from-muted/30 to-transparent">
        <div className="container py-8">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
            Rollup
          </span>
          <h1 className="page-title mt-1">Scenarios</h1>
          <p className="page-subtitle max-w-3xl">
            Three modes: Budget (all planned routes), Confirmed Orders (confirmed+ only),
            and Reforecast (confirmed + new assumptions). Compare revenue, driver pay, and capacity utilization.
          </p>
        </div>
      </div>

      <div className="container py-8">
        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
          <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
            <TabsList>
              <TabsTrigger value="Budget">Budget</TabsTrigger>
              <TabsTrigger value="Confirmed">Confirmed Orders</TabsTrigger>
              <TabsTrigger value="Reforecast">Reforecast</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-3">
              {lastSync && (
                <span className="text-[11px] text-muted-foreground">Last sync: {lastSync}</span>
              )}
              <Button
                variant="outline"
                size="sm"
                disabled={syncWodely.isPending}
                onClick={() => syncWodely.mutate()}
                className="gap-2"
              >
                {syncWodely.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Sync from Wodely
              </Button>
              {rows.length > rows.filter((r) => r.date >= todayIso).length && (
                <button
                  onClick={() => setShowPast((v) => !v)}
                  className="text-xs underline text-muted-foreground hover:text-foreground"
                >
                  {showPast
                    ? "Hide past dates"
                    : `Show ${rows.length - rows.filter((r) => r.date >= todayIso).length} earlier date${rows.length - rows.filter((r) => r.date >= todayIso).length === 1 ? "" : "s"}`}
                </button>
              )}
            </div>
          </div>

          {mode === "Reforecast" && (
            <Card className="border-border/60 mb-6">
              <CardContent className="pt-6">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-4">
                  Reforecast Assumptions (applied on top of confirmed orders)
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <label>Volume Adjustment</label>
                      <span className="font-mono text-primary">{volumeAdj[0]}%</span>
                    </div>
                    <Slider value={volumeAdj} onValueChange={setVolumeAdj} min={50} max={200} step={5} />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <label>Fee Adjustment</label>
                      <span className="font-mono text-primary">{feeAdj[0]}%</span>
                    </div>
                    <Slider value={feeAdj} onValueChange={setFeeAdj} min={50} max={200} step={5} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <TabsContent value={mode}>
            {/* Totals */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <Card className="border-border/60">
                <CardContent className="pt-5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Routes</div>
                  <div className="font-serif text-2xl">{totals.routes}</div>
                </CardContent>
              </Card>
              <Card className="border-border/60">
                <CardContent className="pt-5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Tasks</div>
                  <div className="font-serif text-2xl">{totals.tasks}</div>
                </CardContent>
              </Card>
              <Card className="border-border/60">
                <CardContent className="pt-5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Revenue</div>
                  <div className="font-serif text-2xl text-primary">${totals.revenue.toFixed(0)}</div>
                </CardContent>
              </Card>
              <Card className="border-border/60">
                <CardContent className="pt-5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Driver Pay</div>
                  <div className="font-serif text-2xl">${totals.driverPay.toFixed(0)}</div>
                </CardContent>
              </Card>
              <Card className="border-border/60">
                <CardContent className="pt-5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Platform</div>
                  <div className="font-serif text-2xl">${totals.platform.toFixed(0)}</div>
                </CardContent>
              </Card>
            </div>

            {/* By day */}
            <Card className="border-border/60 overflow-hidden">
              <div className="px-6 py-4 border-b border-border/60 bg-muted/20">
                <h2 className="font-serif text-xl">By Day</h2>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Capacity utilization shown as tasks / max capacity. Live confirmed orders from Wodely shown separately.
                </p>
              </div>
              <div className="table-scroll">
              <table className="elegant-table">
                <thead>
                  <tr>
                    <th className="sticky-col">Date</th>
                    <th className="text-right">Routes</th>
                    <th className="text-right">Tasks</th>
                    <th className="text-right">LAF Conf.</th>
                    <th className="text-right">BC Conf.</th>
                    <th className="text-right">Revenue</th>
                    <th className="text-right">Driver Pay</th>
                    <th className="text-right">Platform</th>
                    <th className="text-right">Capacity</th>
                    <th>Utilization</th>
                  </tr>
                </thead>
                <tbody>
                  {(showPast ? rows : rows.filter((r) => r.date >= todayIso)).map((r) => {
                    const pct = r.capacity > 0 ? (r.tasks / r.capacity) * 100 : 0;
                    const fRow = forecast.find((f) => {
                      return toISODate(f.forecastDate) === r.date;
                    });
                    return (
                      <tr key={r.date}>
                        <td className="whitespace-nowrap font-medium sticky-col">{fmtDate(r.date)}</td>
                        <td className="num-cell">{r.routes}</td>
                        <td className="num-cell">{r.tasks}</td>
                        <td className="num-cell text-emerald-700">{fRow?.lafConfirmed ?? 0}</td>
                        <td className="num-cell text-emerald-700">{fRow?.bcConfirmed ?? 0}</td>
                        <td className="num-cell">${r.revenue.toFixed(0)}</td>
                        <td className="num-cell text-primary">${r.driverPay.toFixed(0)}</td>
                        <td className="num-cell text-muted-foreground">${r.platform.toFixed(0)}</td>
                        <td className="num-cell text-muted-foreground">{r.capacity}</td>
                        <td className="w-40">
                          <div className="flex items-center gap-2">
                            <Progress value={Math.min(pct, 100)} className="h-2 flex-1" />
                            <span className="text-[11px] font-mono text-muted-foreground w-10 text-right">
                              {pct.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
