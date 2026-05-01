import { useParams } from "wouter";
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, AlertCircle, Lock } from "lucide-react";
import { toast } from "sonner";

function todayMondayIso(): string {
  const d = new Date();
  const dow = d.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + mondayOffset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function fmt(iso: string) {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
}

export default function MerchantShare() {
  const { token } = useParams<{ token: string }>();
  const [weekStart, setWeekStart] = useState<string>(() => todayMondayIso());
  const [forecastEdits, setForecastEdits] = useState<Record<string, string>>({});
  const [noteEdits, setNoteEdits] = useState<Record<string, string>>({});

  const { data, isLoading, error, refetch } = trpc.merchantShare.view.useQuery(
    { token: token ?? "", startDate: weekStart },
    { enabled: !!token, retry: false }
  );

  const setForecast = trpc.merchantShare.setForecast.useMutation({
    onSuccess: () => { refetch(); toast.success("Forecast saved"); },
    onError: (e) => toast.error(e.message),
  });
  const setNote = trpc.merchantShare.setNote.useMutation({
    onSuccess: () => { refetch(); toast.success("Note saved"); },
    onError: (e) => toast.error(e.message),
  });

  const { data: statsData } = trpc.merchantShare.getStats.useQuery(
    { token: token ?? "", startDate: weekStart },
    { enabled: !!token, retry: false }
  );
  const statsByDate = useMemo(() => {
    const m = new Map<string, { trailing30Avg: number; trailing60Avg: number; lyMDaySameDow: number }>();
    (statsData?.stats ?? []).forEach((s: any) => m.set(s.date, s));
    return m;
  }, [statsData]);

  const utils = trpc.useUtils();
  const confirmWeek = trpc.merchantShare.confirmWeek.useMutation({
    onSuccess: (res: any) => {
      toast.success(`Week confirmed — ${res?.updated ?? 0} day(s) locked in. You can still re-edit if needed.`);
      utils.merchantShare.view.invalidate();
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const merchantLabelClass = useMemo(() => {
    switch (data?.merchant) {
      case "LAF": return "bg-rose-50 text-rose-800 border-rose-200";
      case "BC":  return "bg-violet-50 text-violet-800 border-violet-200";
      case "SMC": return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case "SMR": return "bg-amber-50 text-amber-800 border-amber-200";
      default:    return "bg-muted text-muted-foreground";
    }
  }, [data?.merchant]);

  if (!token) {
    return <div className="p-8 text-center text-muted-foreground">Missing token</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-gradient-to-b from-muted/30 to-transparent">
        <div className="container py-8 max-w-5xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
                Local Delivery Group · Merchant Portal
              </span>
              <h1 className="page-title mt-1">
                Weekly delivery plan
              </h1>
              {data && (
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={`border ${merchantLabelClass} font-normal`}>
                    {data.merchant}
                  </Badge>
                  {data.label && (
                    <span className="text-sm text-muted-foreground">{data.label}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWeekStart(addDays(weekStart, -7))}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Prev week
            </Button>
            <div className="text-sm font-medium">
              {data ? `${fmt(data.weekStart)} – ${fmt(data.weekEnd)}` : fmt(weekStart)}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWeekStart(addDays(weekStart, 7))}
            >
              Next week <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setWeekStart(todayMondayIso())}>
              Today
            </Button>
          </div>
        </div>
      </div>

      <div className="container max-w-5xl py-8 space-y-4">
        {isLoading && (
          <Card className="p-6 text-sm text-muted-foreground">Loading…</Card>
        )}
        {error && (
          <Card className="p-6 border-destructive/40 bg-destructive/5">
            <div className="flex gap-3 items-start">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <div className="font-medium text-destructive">Unable to load</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {error.message || "This link may have expired or been revoked. Please contact LDG."}
                </div>
              </div>
            </div>
          </Card>
        )}

        {data && !data.hasForecast && (
          <Card className="p-4 border-amber-300/60 bg-amber-50/50 text-amber-900 text-sm">
            {data.merchant} uses ad-hoc delivery — no weekly budget or forecast to set.
            This page shows confirmed orders already in our system for the week.
          </Card>
        )}

        {data && data.isCurrentWeek && (
          <Card className="p-4 border-sky-300/60 bg-sky-50/50 text-sky-900 text-sm flex gap-2 items-start">
            <Lock className="h-4 w-4 mt-0.5" />
            <span>
              Current week — read-only snapshot. Budget, current forecast, and remaining bandwidth are shown
              based on today's live data. For next week and beyond, click <b>Next week</b> to adjust forecasts.
            </span>
          </Card>
        )}
        {data && data.isPastWeek && (
          <Card className="p-4 border-border/60 bg-muted/30 text-muted-foreground text-sm flex gap-2 items-start">
            <Lock className="h-4 w-4 mt-0.5" />
            <span>Past week — read-only historical record.</span>
          </Card>
        )}
        {data && data.isFutureWeek && data.hasForecast && (
          <Card className="p-4 border-emerald-300/60 bg-emerald-50/50 text-emerald-900 text-sm flex items-center justify-between gap-4 flex-wrap">
            <div>
              Future week — use the reference columns (30d Avg, 60d Avg, LY M-Day) to set your
              Forecast per day. When you're ready, click <b>Confirm Week</b> to lock in those
              forecasts as the budget. You can still re-edit afterward.
            </div>
            <Button
              size="sm"
              className="bg-emerald-700 hover:bg-emerald-800 text-white"
              disabled={confirmWeek.isPending}
              onClick={() => {
                if (!token) return;
                if (!confirm(`Confirm forecasts for ${fmt(data.weekStart)} – ${fmt(data.weekEnd)}? Re-edits will still be allowed.`)) return;
                confirmWeek.mutate({ token, startDate: weekStart });
              }}
            >
              {confirmWeek.isPending ? "Confirming…" : "Confirm Week"}
            </Button>
          </Card>
        )}

        {data && (
          <Card className="border-border/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="p-3 font-medium w-[130px]">Day</th>
                    {data.hasForecast && (
                      <>
                        <th className="p-3 font-medium text-right" title="Avg of last 4-5 same-DOW counts (last 30 days)">30d Avg</th>
                        <th className="p-3 font-medium text-right" title="Avg of last 8-9 same-DOW counts (last 60 days)">60d Avg</th>
                        <th className="p-3 font-medium text-right" title="Same DOW from M-Day 2025 week (May 5-10, 2025)">LY M-Day</th>
                      </>
                    )}
                    {data.hasForecast && <th className="p-3 font-medium text-right">Budget</th>}
                    <th className="p-3 font-medium text-right">
                      {data.hasForecast ? "Forecast" : "Planned"}
                    </th>
                    <th className="p-3 font-medium text-right">Confirmed</th>
                    <th className="p-3 font-medium text-right">Capacity</th>
                    <th className="p-3 font-medium text-right">Remaining</th>
                    <th className="p-3 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {data.days.map((d: any) => {
                    const forecastValue = forecastEdits[d.date] ?? String(d.forecast);
                    const noteValue = noteEdits[d.date] ?? d.note ?? "";
                    const stat = statsByDate.get(d.date);
                    return (
                      <tr key={d.date} className={d.isPast ? "bg-muted/20 text-muted-foreground" : ""}>
                        <td className="p-3">
                          <div className="font-medium">{d.dayName}</div>
                          <div className="text-xs text-muted-foreground">{fmt(d.date)}</div>
                        </td>
                        {data.hasForecast && (
                          <>
                            <td className="p-3 text-right font-mono text-muted-foreground">{stat?.trailing30Avg ?? 0}</td>
                            <td className="p-3 text-right font-mono text-muted-foreground">{stat?.trailing60Avg ?? 0}</td>
                            <td className="p-3 text-right font-mono text-muted-foreground">{stat?.lyMDaySameDow ?? 0}</td>
                          </>
                        )}
                        {data.hasForecast && (
                          <td className="p-3 text-right font-mono">{d.budget}</td>
                        )}
                        <td className="p-3 text-right font-mono">
                          {d.isEditable ? (
                            <Input
                              type="number"
                              min={0}
                              className="h-8 w-20 ml-auto text-right font-mono"
                              value={forecastValue}
                              onChange={(e) => setForecastEdits((p) => ({ ...p, [d.date]: e.target.value }))}
                              onBlur={() => {
                                const n = parseInt(forecastValue, 10);
                                if (!Number.isFinite(n) || n < 0) return;
                                if (n === d.forecast) return;
                                setForecast.mutate({ token: token!, date: d.date, forecast: n });
                              }}
                            />
                          ) : (
                            <span>{d.forecast}</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono">{d.confirmed}</td>
                        <td className="p-3 text-right font-mono">{d.capacity}</td>
                        <td className={`p-3 text-right font-mono ${d.remaining === 0 ? "text-destructive" : ""}`}>
                          {d.remaining}
                        </td>
                        <td className="p-3 min-w-[220px]">
                          <Textarea
                            rows={1}
                            className="text-xs min-h-[32px]"
                            placeholder={d.isPast ? "" : "Anything we should know?"}
                            value={noteValue}
                            readOnly={d.isPast}
                            onChange={(e) => setNoteEdits((p) => ({ ...p, [d.date]: e.target.value }))}
                            onBlur={() => {
                              if ((d.note ?? "") === noteValue) return;
                              setNote.mutate({ token: token!, date: d.date, note: noteValue });
                            }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <div className="text-xs text-muted-foreground pt-2">
          Questions? Reply to your LDG rep or email dispatch@localdeliverygroup.com.
        </div>
      </div>
    </div>
  );
}
