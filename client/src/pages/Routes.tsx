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

function merchantBadgeClass(m: string): string {
  switch (m) {
    case "LAF": return "bg-rose-50 text-rose-800 border border-rose-200 font-normal";
    case "BC":  return "bg-violet-50 text-violet-800 border border-violet-200 font-normal";
    case "SMC": return "bg-emerald-50 text-emerald-800 border border-emerald-200 font-normal";
    case "SMR": return "bg-amber-50 text-amber-800 border border-amber-200 font-normal";
    default:    return "bg-slate-50 text-slate-700 border border-slate-200 font-normal";
  }
}

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

  const todayIso = toISODate(new Date());

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [merchantFilter, setMerchantFilter] = useState<string>("all");
  const [bookingFilter, setBookingFilter] = useState<string>("all");
  const [driverFilter, setDriverFilter] = useState<string>("all"); // "all" | "unassigned" | driverId
  const [dateFilter, setDateFilter] = useState<string>("upcoming"); // "all" | "upcoming" | "today" | "YYYY-MM-DD"
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const tbMap = useMemo(() => new Map(timeblocks.map((t) => [t.id, t])), [timeblocks]);
  const driverMap = useMemo(() => new Map(drivers.map((d) => [d.id, d])), [drivers]);
  const zonesByRoute = useMemo(() => {
    const m = new Map<number, typeof routeZones>();
    for (const rz of routeZones) {
      if (!m.has(rz.routeId)) m.set(rz.routeId, []);
      m.get(rz.routeId)!.push(rz);
    }
    return m;
  }, [routeZones]);

  // Sorted unique date list for the date dropdown.
  const availableDates = useMemo(() => {
    const s = new Set<string>();
    for (const r of routes) {
      const tb = tbMap.get(r.timeblockId);
      if (tb) s.add(toISODate(tb.blockDate));
    }
    return Array.from(s).sort();
  }, [routes, tbMap]);

  // Resolve rows with a date attached so we can filter + sort flat.
  const enriched = useMemo(() => {
    return routes
      .map((r) => {
        const tb = tbMap.get(r.timeblockId);
        const date = tb ? toISODate(tb.blockDate) : "";
        return { r, tb, date };
      })
      .filter((row) => !!row.date);
  }, [routes, tbMap]);

  const filtered = useMemo(() => {
    return enriched.filter(({ r, date }) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (merchantFilter !== "all" && r.merchant !== merchantFilter) return false;
      if (bookingFilter !== "all" && (r as any).bookingType !== bookingFilter) return false;
      if (driverFilter === "unassigned") {
        if (r.driverId) return false;
      } else if (driverFilter !== "all") {
        if (String(r.driverId ?? "") !== driverFilter) return false;
      }
      if (dateFilter === "upcoming") {
        if (date < todayIso) return false;
      } else if (dateFilter === "today") {
        if (date !== todayIso) return false;
      } else if (dateFilter !== "all") {
        if (date !== dateFilter) return false;
      }
      return true;
    });
  }, [enriched, statusFilter, merchantFilter, bookingFilter, driverFilter, dateFilter, todayIso]);

  // Flat sort: date asc, then routeCode asc.
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      return (a.r.routeCode ?? "").localeCompare(b.r.routeCode ?? "");
    });
  }, [filtered]);

  const totalFee = sorted.reduce((s, { r }) => s + Number(r.estRouteFee), 0);
  const totalPay = sorted.reduce((s, { r }) => s + Number(r.estDriverPay), 0);
  const totalStops = sorted.reduce((s, { r }) => s + Number(r.stops), 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-gradient-to-b from-muted/30 to-transparent">
        <div className="container py-8">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
            Route Operations
          </span>
          <h1 className="page-title mt-1">Routes</h1>
          <p className="page-subtitle max-w-3xl">
            Flat list of every route. Filter by day, status, driver, or merchant.
            Each row is inline-editable; expand for zone assignment.
          </p>

          <div className="flex flex-wrap gap-3 mt-4 items-center">
            <div className="flex flex-col">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Day</label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Today &amp; Upcoming</SelectItem>
                  <SelectItem value="today">Today Only</SelectItem>
                  <SelectItem value="all">All Dates</SelectItem>
                  {availableDates.map((d) => (
                    <SelectItem key={d} value={d}>{fmtDate(d)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Driver</label>
              <Select value={driverFilter} onValueChange={setDriverFilter}>
                <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Drivers</SelectItem>
                  <SelectItem value="unassigned">— Unassigned —</SelectItem>
                  {drivers.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Merchant</label>
              <Select value={merchantFilter} onValueChange={setMerchantFilter}>
                <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Merchants</SelectItem>
                  <SelectItem value="LAF">LAF</SelectItem>
                  <SelectItem value="BC">BC</SelectItem>
                  <SelectItem value="SMC">SMC</SelectItem>
                  <SelectItem value="SMR">SMR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Booking</label>
              <Select value={bookingFilter} onValueChange={setBookingFilter}>
                <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Bookings</SelectItem>
                  <SelectItem value="Direct">Direct</SelectItem>
                  <SelectItem value="Flex">Flex</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <button
              type="button"
              onClick={() => {
                setStatusFilter("all");
                setMerchantFilter("all");
                setBookingFilter("all");
                setDriverFilter("all");
                setDateFilter("upcoming");
              }}
              className="text-xs underline text-muted-foreground hover:text-foreground self-end pb-2"
            >
              Reset filters
            </button>
          </div>

          <div className="mt-4 text-xs text-muted-foreground flex flex-wrap gap-x-5 gap-y-1">
            <span><span className="font-semibold text-foreground">{sorted.length}</span> routes</span>
            <span><span className="font-semibold text-foreground">{totalStops}</span> stops</span>
            <span>Revenue <span className="font-semibold text-foreground">${totalFee.toFixed(0)}</span></span>
            <span>Driver pay <span className="font-semibold text-foreground">${totalPay.toFixed(0)}</span></span>
          </div>
        </div>
      </div>

      <div className="container py-8">
        <Card className="border-border/60 overflow-hidden">
          <div className="table-scroll">
            <table className="elegant-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Date</th>
                  <th>Route</th>
                  <th>Booking</th>
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
                  <th className="text-right" title="Per-stop holiday surcharge added to route fee">Holiday $/stop</th>
                  <th className="text-right" title="Flat driver bonus added to driver pay">Driver Bonus</th>
                  <th className="text-right" title="Net = Fee (incl. Holiday) − Driver Pay (incl. Bonus) − Mileage Pay − Platform Fee">Net Margin</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={19} className="text-center text-muted-foreground py-10">
                      No routes match these filters.
                    </td>
                  </tr>
                )}
                {sorted.map(({ r, tb, date }) => {
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
                        <td className="text-xs whitespace-nowrap">{fmtDate(date)}</td>
                        <td className="font-mono font-medium sticky-col">{r.routeCode}</td>
                        <td>
                          <Select
                            value={(r as any).bookingType ?? "Direct"}
                            onValueChange={(v) => update.mutate({ id: r.id, bookingType: v as any })}
                          >
                            <SelectTrigger className="h-7 w-[80px] text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Direct">Direct</SelectItem>
                              <SelectItem value="Flex">Flex</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td>
                          {(r as any).bookingType === "Flex" ? (
                            <Badge className="bg-sky-50 text-sky-800 border border-sky-200 font-normal" title="Flex route: can carry mixed merchants">
                              Flex
                            </Badge>
                          ) : (
                            <Select
                              value={r.merchant}
                              onValueChange={(v) => update.mutate({ id: r.id, merchant: v as any })}
                            >
                              <SelectTrigger className="h-7 w-[80px] text-xs border-0 p-0">
                                <Badge className={merchantBadgeClass(r.merchant)}>{r.merchant}</Badge>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="LAF">LAF</SelectItem>
                                <SelectItem value="BC">BC</SelectItem>
                                <SelectItem value="SMC">SMC</SelectItem>
                                <SelectItem value="SMR">SMR</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
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
                            onBlur={(e) => {
                              const n = parseInt(e.target.value, 10);
                              if (!Number.isNaN(n) && n !== r.stops) update.mutate({ id: r.id, stops: n });
                            }}
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
                            className="h-7 w-14 ml-auto text-right font-mono border-transparent hover:border-border focus:border-ring"
                            placeholder="0"
                            defaultValue={Number(r.holidayPerStopSurcharge) > 0 ? String(r.holidayPerStopSurcharge) : ""}
                            onBlur={(e) =>
                              update.mutate({ id: r.id, holidayPerStopSurcharge: e.target.value || "0" })
                            }
                            title="Per-stop holiday surcharge added to fee for THIS route only"
                          />
                        </td>
                        <td className="num-cell text-xs">
                          <Input
                            className="h-7 w-16 ml-auto text-right font-mono border-transparent hover:border-border focus:border-ring"
                            placeholder="0"
                            defaultValue={Number(r.driverBonus) > 0 ? String(r.driverBonus) : ""}
                            onBlur={(e) => update.mutate({ id: r.id, driverBonus: e.target.value || "0" })}
                            title="Flat bonus added to this driver's pay"
                          />
                        </td>
                        <td className="num-cell text-xs">
                          {(() => {
                            // estRouteFee already includes per-route holiday differential after recalc;
                            // estDriverPay already includes per-route driver bonus.
                            const fee = Number(r.estRouteFee);
                            const driverPay = Number(r.estDriverPay);
                            const mileagePay = Number(r.estMileagePay);
                            const platform = Number(r.estPlatformFee);
                            const margin = fee - driverPay - mileagePay - platform;
                            const tone =
                              margin >= 0 ? "text-emerald-700" : "text-red-700";
                            return (
                              <span className={`font-medium ${tone}`} title="Net = Fee (incl. Holiday) − Driver Pay (incl. Bonus) − Mileage Pay − Platform Fee">
                                ${margin.toFixed(0)}
                              </span>
                            );
                          })()}
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
                          <td colSpan={19} className="!p-0 bg-muted/20">
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
                                Edit task counts per zone above and click Save zones. Duration, mileage, and fee auto-recalculate based on the zone baselines.
                              </div>
                              {tb && (
                                <div className="mt-3 text-xs text-muted-foreground flex gap-4 flex-wrap">
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
      </div>
    </div>
  );
}
