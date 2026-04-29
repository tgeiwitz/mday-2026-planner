import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Flower, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";

function formatDate(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
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

export default function Home() {
  const { data: forecast = [], isLoading } = trpc.forecast.list.useQuery();
  const { data: routes = [] } = trpc.routes.list.useQuery();

  // Aggregate key metrics
  const totalLaf2025 = forecast.reduce((sum, f) => sum + (f.laf2025Actual || 0), 0);
  const totalBc2025 = forecast.reduce((sum, f) => sum + (f.bc2025Actual || 0), 0);
  const totalLaf2026 = forecast.reduce((sum, f) => sum + (f.laf2026Goal || 0), 0);
  const totalBc2026 = forecast.reduce((sum, f) => sum + (f.bc2026Goal || 0), 0);
  const totalConfirmed = forecast.reduce((sum, f) => sum + (f.lafConfirmed || 0) + (f.bcConfirmed || 0), 0);
  const totalRoutes = routes.length;

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
            A route-centric view of the holiday week — from April 29 through May 18, 2026 — rolling up
            last year's actuals, 60-day trending, 2026 goals, confirmed orders, and capacity by day.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="container py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-border/60">
            <CardContent className="pt-6">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">2025 LAF Actual</div>
              <div className="font-serif text-3xl">{totalLaf2025.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="pt-6">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">2026 LAF Goal</div>
              <div className="font-serif text-3xl text-primary">{totalLaf2026.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="pt-6">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">2026 BC Goal</div>
              <div className="font-serif text-3xl">{totalBc2026.toLocaleString()}</div>
              <div className="text-[11px] text-muted-foreground mt-1">2025: {totalBc2025}</div>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="pt-6">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Routes Budgeted</div>
              <div className="font-serif text-3xl">{totalRoutes}</div>
              <div className="text-[11px] text-muted-foreground mt-1">
                {totalConfirmed} confirmed orders
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Daily Forecast Table */}
        <Card className="border-border/60 overflow-hidden">
          <div className="px-6 py-4 border-b border-border/60 bg-muted/20">
            <h2 className="font-serif text-xl">Daily Forecast</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Actuals vs. 60-day trending vs. 2026 goal, with confirmed orders and capacity status
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="elegant-table">
              <thead>
                <tr>
                  <th rowSpan={2} className="align-bottom">Date</th>
                  <th rowSpan={2} className="align-bottom">Phase</th>
                  <th colSpan={2} className="text-center border-r border-border/60">2025 Actual</th>
                  <th colSpan={2} className="text-center border-r border-border/60">60-Day Trend</th>
                  <th colSpan={2} className="text-center border-r border-border/60">2026 Goal</th>
                  <th colSpan={2} className="text-center border-r border-border/60">Confirmed</th>
                  <th colSpan={2} className="text-center border-r border-border/60">Max Capacity</th>
                  <th rowSpan={2} className="align-bottom">Status</th>
                </tr>
                <tr>
                  <th className="!py-2">LAF</th>
                  <th className="!py-2 border-r border-border/60">BC</th>
                  <th className="!py-2">LAF</th>
                  <th className="!py-2 border-r border-border/60">BC</th>
                  <th className="!py-2">LAF</th>
                  <th className="!py-2 border-r border-border/60">BC</th>
                  <th className="!py-2">LAF</th>
                  <th className="!py-2 border-r border-border/60">BC</th>
                  <th className="!py-2">LAF</th>
                  <th className="!py-2 border-r border-border/60">BC</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={13} className="text-center text-muted-foreground py-8">Loading...</td>
                  </tr>
                )}
                {forecast.map((f) => {
                  const totalGoal = (f.laf2026Goal || 0) + (f.bc2026Goal || 0);
                  const totalCap = (f.maxLafCapacity || 0) + (f.maxBcCapacity || 0);
                  const status = statusIndicator(totalGoal, totalCap);
                  return (
                    <tr key={f.id}>
                      <td className="whitespace-nowrap font-medium">
                        {formatDate(f.forecastDate)}
                      </td>
                      <td>
                        <Badge className={`${phaseColor(f.phase)} font-normal`}>
                          {f.phase}
                        </Badge>
                      </td>
                      <td className="num-cell">{f.laf2025Actual || "—"}</td>
                      <td className="num-cell border-r border-border/60">{f.bc2025Actual || "—"}</td>
                      <td className="num-cell">{f.laf60DayTrend}</td>
                      <td className="num-cell border-r border-border/60">{f.bc60DayTrend}</td>
                      <td className="num-cell font-medium text-primary">{f.laf2026Goal}</td>
                      <td className="num-cell border-r border-border/60 font-medium">{f.bc2026Goal}</td>
                      <td className="num-cell">{f.lafConfirmed || "—"}</td>
                      <td className="num-cell border-r border-border/60">{f.bcConfirmed || "—"}</td>
                      <td className="num-cell text-muted-foreground">{f.maxLafCapacity}</td>
                      <td className="num-cell border-r border-border/60 text-muted-foreground">{f.maxBcCapacity}</td>
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
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
