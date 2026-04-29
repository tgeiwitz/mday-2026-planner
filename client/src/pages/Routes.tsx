import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useMemo, useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  Budgeted: "bg-slate-100 text-slate-700 border-slate-200",
  Planned: "bg-blue-50 text-blue-800 border-blue-200",
  Confirmed: "bg-emerald-50 text-emerald-800 border-emerald-200",
  Processed: "bg-violet-50 text-violet-800 border-violet-200",
  Routed: "bg-amber-50 text-amber-800 border-amber-200",
  Completed: "bg-primary text-primary-foreground border-primary",
};
const STATUSES = ["Budgeted", "Planned", "Confirmed", "Processed", "Routed", "Completed"];

import { fmtDate, toISODate } from "@/lib/date";

export default function Routes() {
  const utils = trpc.useUtils();
  const { data: routes = [], refetch } = trpc.routes.list.useQuery();
  const { data: timeblocks = [] } = trpc.timeblocks.list.useQuery();
  const { data: drivers = [] } = trpc.drivers.list.useQuery();
  const { data: routeZones = [], refetch: refetchZones } = trpc.routes.listZones.useQuery();
  const { data: allZones = [] } = trpc.zones.list.useQuery();
  const update = trpc.routes.update.useMutation({
    onSuccess: () => {
      refetch();
      utils.planning.list.invalidate();
    },
  });
  const setZones = trpc.routes.setZones.useMutation({
    onSuccess: () => {
      refetch();
      refetchZones();
      utils.planning.list.invalidate();
    },
  });
  const [zoneDrafts, setZoneDrafts] = useState<Record<number, Record<number, number>>>({});

  function getDraft(routeId: number, existing: { zoneId: number; taskCount: number }[]) {
    if (zoneDrafts[routeId]) return zoneDrafts[routeId];
    const d: Record<number, number> = {};
    for (const z of existing) d[z.zoneId] = z.taskCount;
    return d;
  }
  function updateDraft(routeId: number, zoneId: number, count: number, existing: { zoneId: number; taskCount: number }[]) {
    const base = getDraft(routeId, existing);
    const next = { ...base, [zoneId]: count };
    if (count <= 0) delete next[zoneId];
    setZoneDrafts((prev) => ({ ...prev, [routeId]: next }));
  }
  function saveZones(routeId: number, existing: { zoneId: number; taskCount: number }[]) {
    const draft = getDraft(routeId, existing);
    const zones = Object.entries(draft)
      .filter(([, cnt]) => (cnt as number) > 0)
      .map(([zid, cnt]) => ({ zoneId: Number(zid), taskCount: Number(cnt) }));
    setZones.mutate({ routeId, zones });
    setZoneDrafts((prev) => {
      const copy = { ...prev };
      delete copy[routeId];
      return copy;
    });
  }

  const [filter, setFilter] = useState<string>("all");
  const [merchantFilter, setMerchantFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [showPast, setShowPast] = useState(false);
  const todayIso = toISODate(new Date());

  const tbMap = new Map(timeblocks.map((t) => [t.id, t]));
  const driverMap = new Map(drivers.map((d) => [d.id, d]));
  const zonesByRoute = useMemo(() => {
    const m = new Map<number, typeof routeZones>();
    for (const rz of routeZones) {
      if (!m.has(rz.routeId)) m.set(rz.routeId, []);
      m.get(rz.routeId)!.push(rz);
    }
    return m;
  }, [routeZones]);

  const filtered = routes.filter((r) => {
    if (filter !== "all" && r.status !== filter) return false;
    if (merchantFilter !== "all" && r.merchant !== merchantFilter) return false;
    return true;
  });

  // Group by date (sorted); optionally hide past dates.
  const groupedAll = new Map<string, typeof filtered>();
  for (const r of filtered) {
    const tb = tbMap.get(r.timeblockId);
    if (!tb) continue;
    const key = toISODate(tb.blockDate);
    if (!groupedAll.has(key)) groupedAll.set(key, []);
    groupedAll.get(key)!.push(r);
  }
  const sortedKeys = Array.from(groupedAll.keys()).sort();
  const visibleKeys = showPast ? sortedKeys : sortedKeys.filter((k) => k >= todayIso);
  const hiddenDateCount = sortedKeys.length - visibleKeys.length;
  const grouped = new Map<string, typeof filtered>();
  for (const k of visibleKeys) grouped.set(k, groupedAll.get(k)!);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-gradient-to-b from-muted/30 to-transparent">
        <div className="container py-8">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
            Route Operations
          </span>
          <h1 className="page-title mt-1">Routes</h1>
          <p className="page-subtitle max-w-3xl">
            Each route's pickup, zones, stops, estimated duration, mileage, driver pay (75% of fees),
            mileage pay ({">30 miles"}), platform fee, and holiday surcharge.
            Status workflow: Budgeted → Planned → Confirmed → Processed → Routed → Completed.
          </p>
          <div className="flex gap-3 mt-4">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={merchantFilter} onValueChange={setMerchantFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Merchants</SelectItem>
                <SelectItem value="LAF">LAF</SelectItem>
                <SelectItem value="BC">BC</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground flex items-center">
              {filtered.length} routes
            </div>
            {hiddenDateCount > 0 && (
              <button
                onClick={() => setShowPast((v) => !v)}
                className="text-xs underline text-muted-foreground hover:text-foreground self-center"
              >
                {showPast ? "Hide past dates" : `Show ${hiddenDateCount} earlier date${hiddenDateCount === 1 ? "" : "s"}`}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="container py-8 space-y-6">
        {Array.from(grouped.entries()).map(([date, dayRoutes]) => {
          const dayTotal = dayRoutes.reduce((s, r) => s + Number(r.estRouteFee), 0);
          const dayDriver = dayRoutes.reduce((s, r) => s + Number(r.estDriverPay), 0);
          return (
            <Card key={date} className="border-border/60 overflow-hidden">
              <div className="px-6 py-3 border-b border-border/60 bg-muted/20 flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-lg">{fmtDate(date)}</h2>
                  <div className="text-xs text-muted-foreground">
                    {dayRoutes.length} routes · ${dayTotal.toFixed(0)} revenue · ${dayDriver.toFixed(0)} driver pay
                  </div>
                </div>
              </div>
              <div className="table-scroll">
                <table className="elegant-table">
                  <thead>
                    <tr>
                      <th></th>
                      <th>Route</th>
                      <th>Wave</th>
                      <th>Merchant</th>
                      <th>Driver</th>
                      <th className="text-right">Stops</th>
                      <th className="text-right">Dur</th>
                      <th className="text-right">Miles</th>
                      <th className="text-right">Fee</th>
                      <th className="text-right">Driver Pay</th>
                      <th className="text-right">Floor</th>
                      <th className="text-right">Max</th>
                      <th className="text-right">Mileage</th>
                      <th className="text-right">Platform</th>
                      <th className="text-right">Bonus</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayRoutes.map((r) => {
                      const tb = tbMap.get(r.timeblockId);
                      const zs = zonesByRoute.get(r.id) ?? [];
                      const isExpanded = expanded[r.id];
                      return (
                        <>
                          <tr key={r.id}>
                            <td className="!px-2">
                              <button
                                className="p-1 hover:bg-muted rounded"
                                onClick={() => setExpanded((p) => ({ ...p, [r.id]: !p[r.id] }))}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )}
                              </button>
                            </td>
                            <td className="font-mono font-medium sticky-col">{r.routeCode}</td>
                            <td className="text-xs text-muted-foreground">{tb?.wave}</td>
                            <td>
                              <Badge className={r.merchant === "LAF" ? "bg-rose-50 text-rose-800 border border-rose-200 font-normal" : "bg-violet-50 text-violet-800 border border-violet-200 font-normal"}>
                                {r.merchant}
                              </Badge>
                            </td>
                            <td>
                              <Select
                                value={r.driverId ? String(r.driverId) : "unassigned"}
                                onValueChange={(v) =>
                                  update.mutate({ id: r.id, driverId: v === "unassigned" ? null : parseInt(v) })
                                }
                              >
                                <SelectTrigger className="h-8 w-[150px] text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="unassigned">— Unassigned —</SelectItem>
                                  {drivers.map((d) => (
                                    <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="num-cell">
                              <Input
                                className="h-7 w-14 ml-auto text-right font-mono border-transparent hover:border-border focus:border-ring"
                                type="number"
                                defaultValue={r.stops}
                                onBlur={(e) => update.mutate({ id: r.id, stops: parseInt(e.target.value) || 0 })}
                              />
                            </td>
                            <td className="num-cell text-xs">{r.estDuration}m</td>
                            <td className="num-cell text-xs">{Number(r.estMileage).toFixed(1)}</td>
                            <td className="num-cell font-medium">${Number(r.estRouteFee).toFixed(0)}</td>
                            <td className="num-cell text-primary font-medium">${Number(r.estDriverPay).toFixed(0)}</td>
                            <td className="num-cell text-xs">
                              <Input
                                className="h-7 w-16 ml-auto text-right font-mono border-transparent hover:border-border focus:border-ring"
                                placeholder={tb ? String(tb.minPayFloor) : "—"}
                                defaultValue={r.payFloorOverride ? String(r.payFloorOverride) : ""}
                                onBlur={(e) => update.mutate({ id: r.id, payFloorOverride: e.target.value || null })}
                              />
                            </td>
                            <td className="num-cell text-xs">
                              <Input
                                className="h-7 w-16 ml-auto text-right font-mono border-transparent hover:border-border focus:border-ring"
                                placeholder={tb ? String(tb.maxPayFloor) : "—"}
                                defaultValue={r.payMaxOverride ? String(r.payMaxOverride) : ""}
                                onBlur={(e) => update.mutate({ id: r.id, payMaxOverride: e.target.value || null })}
                              />
                            </td>
                            <td className="num-cell text-xs">${Number(r.estMileagePay).toFixed(0)}</td>
                            <td className="num-cell text-xs text-muted-foreground">${Number(r.estPlatformFee).toFixed(0)}</td>
                            <td className="num-cell text-xs">
                              <Input
                                className="h-7 w-16 ml-auto text-right font-mono border-transparent hover:border-border focus:border-ring"
                                defaultValue={String(r.driverBonus)}
                                onBlur={(e) => update.mutate({ id: r.id, driverBonus: e.target.value })}
                              />
                            </td>
                            <td>
                              <Select
                                value={r.status}
                                onValueChange={(v) => update.mutate({ id: r.id, status: v as any })}
                              >
                                <SelectTrigger className="h-7 w-[110px] border-0 p-0">
                                  <Badge className={`${STATUS_COLORS[r.status]} border font-normal`}>
                                    {r.status}
                                  </Badge>
                                </SelectTrigger>
                                <SelectContent>
                                  {STATUSES.map((s) => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={16} className="!p-0 bg-muted/20">
                                <div className="px-12 py-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="text-xs uppercase tracking-wider text-muted-foreground">
                                      Zone Assignment
                                    </div>
                                    <div className="flex items-center gap-3 text-xs">
                                      <span className="text-muted-foreground">
                                        Draft total:{' '}
                                        <span className="font-semibold text-foreground num-cell">
                                          {Object.values(getDraft(r.id, zs)).reduce((s, n) => s + (n || 0), 0)}
                                        </span>{' '}
                                        / Stops <span className="font-semibold text-foreground num-cell">{r.stops}</span>
                                      </span>
                                      <button
                                        type="button"
                                        className="text-xs px-3 py-1 rounded-md border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50"
                                        disabled={!zoneDrafts[r.id] || setZones.isPending}
                                        onClick={() => saveZones(r.id, zs)}
                                      >
                                        Save zones
                                      </button>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-1.5">
                                    {allZones.map((zm) => {
                                      const draft = getDraft(r.id, zs);
                                      const cnt = draft[zm.id] ?? 0;
                                      const pct = r.stops > 0 ? (cnt / r.stops) * 100 : 0;
                                      return (
                                        <div key={zm.id} className="flex items-center gap-2 text-xs">
                                          <span className="font-mono text-muted-foreground w-28 truncate" title={zm.zoneName ?? undefined}>
                                            {zm.zoneName}
                                          </span>
                                          <Input
                                            type="number"
                                            min={0}
                                            value={cnt || ''}
                                            onChange={(e) => updateDraft(r.id, zm.id, parseInt(e.target.value || '0', 10) || 0, zs)}
                                            className="h-7 w-16 text-xs num-cell"
                                            placeholder="0"
                                          />
                                          <span className="text-muted-foreground num-cell w-8 text-right">
                                            {cnt > 0 ? `${pct.toFixed(0)}%` : ''}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <div className="mt-3 text-[11px] text-muted-foreground">
                                    Edit task counts per zone above and click Save zones. Duration, mileage, and fee will auto-recalculate based on the zone baselines.
                                  </div>
                                  {tb && (
                                    <div className="mt-3 text-xs text-muted-foreground flex gap-4">
                                      <span>Pickup LAF: <span className="font-mono">{tb.lafPickupTime ?? "—"}</span></span>
                                      <span>Pickup BC: <span className="font-mono">{tb.bcPickupTime ?? "—"}</span></span>
                                      <span>Window: <span className="font-mono">{tb.availabilityStart}–{tb.availabilityEnd}</span></span>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
