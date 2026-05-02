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
import { InlineEnumInput } from "@/components/InlineEnumInput";
import { trpc } from "@/lib/trpc";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
  const createRoute = trpc.routes.create.useMutation({
    onSuccess: () => {
      toast.success("Route created");
      refetch();
      refetchZones();
      utils.planning.list.invalidate();
      setNewRouteOpen(false);
    },
    onError: (e) => toast.error(e.message ?? "Failed to create route"),
  });
  const [newRouteOpen, setNewRouteOpen] = useState(false);
  const [newRoute, setNewRoute] = useState<{ timeblockId: string; merchant: "LAF" | "BC" | "SMC" | "SMR"; bookingType: "Direct" | "Flex"; stops: string }>({
    timeblockId: "",
    merchant: "LAF",
    bookingType: "Direct",
    stops: "0",
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
  const totalPay = sorted.reduce((s, { r }) => s + Number((r as any).estTotalDriverPay ?? r.estDriverPay), 0);
  const totalStops = sorted.reduce((s, { r }) => s + Number(r.stops), 0);
  const totalAdjustment = sorted.reduce((s, { r }) => s + Number((r as any).wodelyAdjustment ?? 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-gradient-to-b from-muted/30 to-transparent">
        <div className="container py-8">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
            Route Operations
          </span>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="page-title mt-1">Routes</h1>
              <p className="page-subtitle max-w-3xl">
                Flat list of every route. Filter by day, status, driver, or merchant.
                Each row is inline-editable; expand for zone assignment.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <AutoCreateRoutesButton />
            <Dialog open={newRouteOpen} onOpenChange={setNewRouteOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" /> New Route</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Route</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs uppercase tracking-wider text-muted-foreground">Timeblock</label>
                    <select
                      value={newRoute.timeblockId}
                      onChange={(e) => setNewRoute({ ...newRoute, timeblockId: e.target.value })}
                      aria-label="Timeblock"
                      className="h-9 w-full border border-input bg-background rounded-md px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Pick a timeblock…</option>
                      {timeblocks
                        .slice()
                        .sort((a, b) => String(a.blockDate).localeCompare(String(b.blockDate)))
                        .map((t) => (
                          <option key={t.id} value={String(t.id)}>
                            {fmtDate(toISODate(t.blockDate))} · {t.label} · {t.merchant}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs uppercase tracking-wider text-muted-foreground">Merchant</label>
                      <select
                        value={newRoute.merchant}
                        onChange={(e) => setNewRoute({ ...newRoute, merchant: e.target.value as any })}
                        aria-label="Merchant"
                        className="h-9 w-full border border-input bg-background rounded-md px-2 text-sm uppercase outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="LAF">LAF</option>
                        <option value="BC">BC</option>
                        <option value="SMC">SMC</option>
                        <option value="SMR">SMR</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-wider text-muted-foreground">Booking</label>
                      <select
                        value={newRoute.bookingType}
                        onChange={(e) => setNewRoute({ ...newRoute, bookingType: e.target.value as any })}
                        aria-label="Booking type"
                        className="h-9 w-full border border-input bg-background rounded-md px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="Direct">Direct</option>
                        <option value="Flex">Flex (mixed merchants)</option>
                      </select>
                      <p className="text-[11px] text-muted-foreground mt-1">For Flex, pick the primary pickup merchant above.</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wider text-muted-foreground">Initial Stops (optional)</label>
                    <Input type="number" min="0" value={newRoute.stops} onChange={(e) => setNewRoute({ ...newRoute, stops: e.target.value })} />
                    <p className="text-[11px] text-muted-foreground mt-1">You can also add zones after creating the route — stops will sum from zones.</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => {
                      if (!newRoute.timeblockId) { toast.error("Pick a timeblock"); return; }
                      createRoute.mutate({
                        timeblockId: Number(newRoute.timeblockId),
                        merchant: newRoute.merchant,
                        bookingType: newRoute.bookingType,
                        stops: Number(newRoute.stops || 0),
                      });
                    }}
                    disabled={createRoute.isPending}
                  >
                    {createRoute.isPending ? "Creating…" : "Create Route"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            </div>
          </div>

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
            {totalAdjustment > 0 && (
              <span className="text-amber-700">Wodely workforce-task adjustments to upload <span className="font-semibold">${totalAdjustment.toFixed(0)}</span></span>
            )}
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
                  <th className="text-right" title="Route Base Pay = (Fee × 75%) − Mileage; clamped to driver's hourly band × hours; bonus added on top.">Route Base</th>
                  <th className="text-right" title="What the driver actually receives = Route Base + Mileage.">Total Pay</th>
                  <th className="text-right" title="Workforce task to upload to Wodely when the hourly floor binds.">Wodely Adj</th>
                  <th className="text-right">Floor $</th>
                  <th className="text-right">Max $</th>
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
                    <td colSpan={21} className="text-center text-muted-foreground py-10">
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
                          <InlineEnumInput
                            value={(r as any).bookingType ?? "Direct"}
                            options={["Direct", "Flex"]}
                            onCommit={(v) => {
                              if (v !== "Direct" && v !== "Flex") return;
                              update.mutate({ id: r.id, bookingType: v as any });
                            }}
                            className="h-7 w-[80px]"
                            ariaLabel="Booking type"
                          />
                        </td>
                        <td>
                          {(r as any).bookingType === "Flex" ? (
                            <Badge className="bg-sky-50 text-sky-800 border border-sky-200 font-normal" title="Flex route: can carry mixed merchants">
                              Flex
                            </Badge>
                          ) : (
                            <InlineEnumInput
                              value={r.merchant}
                              options={["LAF", "BC", "SMC", "SMR"]}
                              onCommit={(v) => {
                                const allowed = ["LAF", "BC", "SMC", "SMR"];
                                if (!allowed.includes(v)) return;
                                update.mutate({ id: r.id, merchant: v as any });
                              }}
                              className="h-7 w-[80px] uppercase"
                              ariaLabel="Merchant"
                            />
                          )}
                        </td>
                        <td>
                          <InlineEnumInput
                            value={r.driverId ? String(r.driverId) : ""}
                            options={drivers.map((d) => d.name)}
                            labelMap={Object.fromEntries(drivers.map((d) => [String(d.id), d.name]))}
                            placeholder="— Unassigned —"
                            onCommit={(v) => {
                              if (!v.trim()) {
                                update.mutate({ id: r.id, driverId: null });
                                return;
                              }
                              const match = drivers.find((d) => d.name.toLowerCase() === v.trim().toLowerCase());
                              if (match) update.mutate({ id: r.id, driverId: match.id });
                            }}
                            className="h-8 w-[150px]"
                            ariaLabel="Driver"
                          />
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
                        <td className="num-cell" title="Route Base Pay (time portion of the 75%, post-floor/ceil + bonus)">${Number((r as any).estRouteBasePay ?? 0).toFixed(0)}</td>
                        <td className="num-cell text-primary font-medium" title="Total Driver Pay = Route Base + Mileage">${Number((r as any).estTotalDriverPay ?? r.estDriverPay).toFixed(0)}</td>
                        <td className="num-cell text-xs">
                          {Number((r as any).wodelyAdjustment ?? 0) > 0 ? (
                            <span className="text-amber-700 font-medium" title="Upload as a workforce task on this route in Wodely so the driver's payroll matches plan.">${Number((r as any).wodelyAdjustment).toFixed(0)}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
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
                            // Total Driver Pay already includes Mileage and Bonus (post-floor/ceil).
                            // Wodely Adjustment is paid out of the platform's 25%, so it reduces margin.
                            const fee = Number(r.estRouteFee);
                            const total = Number((r as any).estTotalDriverPay ?? r.estDriverPay);
                            const platform = Number(r.estPlatformFee);
                            const adj = Number((r as any).wodelyAdjustment ?? 0);
                            const margin = fee - total - platform - adj;
                            const tone = margin >= 0 ? "text-emerald-700" : "text-red-700";
                            return (
                              <span className={`font-medium ${tone}`} title="Net = Fee − Total Driver Pay − Platform Fee − Wodely Adj">
                                ${margin.toFixed(0)}
                              </span>
                            );
                          })()}
                        </td>
                        <td>
                          <InlineEnumInput
                            value={r.status}
                            options={STATUSES}
                            onCommit={(v) => {
                              if (!STATUSES.includes(v)) return;
                              update.mutate({ id: r.id, status: v as any });
                            }}
                            className="h-7 w-[110px]"
                            ariaLabel="Status"
                          />
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
                              <ReferenceForecastPanel routeId={r.id} currentStops={r.stops} onApplied={() => { refetch(); utils.planning.list.invalidate(); }} />
                              <div className="mt-4">
                                <label className="text-xs uppercase tracking-wider text-muted-foreground">Internal Notes (dispatch only)</label>
                                <textarea
                                  className="mt-1 w-full min-h-[60px] rounded-md border border-border bg-background p-2 text-sm focus:border-ring outline-none"
                                  placeholder="Notes for dispatch only — vehicle issues, special handoffs, etc. Does not affect any math."
                                  defaultValue={(r as any).notes ?? ""}
                                  onBlur={(e) => {
                                    const val = e.target.value;
                                    if (val !== ((r as any).notes ?? "")) {
                                      update.mutate({ id: r.id, notes: val });
                                    }
                                  }}
                                />
                              </div>
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

function ReferenceForecastPanel({ routeId, currentStops, onApplied }: { routeId: number; currentStops: number; onApplied: () => void }) {
  const { data: ref, isLoading } = trpc.routes.referenceForecast.useQuery({ routeId });
  const apply = trpc.routes.applyReference.useMutation({
    onSuccess: () => { toast.success("Applied to route"); onApplied(); },
    onError: (e) => toast.error(e.message ?? "Apply failed"),
  });

  if (isLoading) {
    return <div className="mt-4 text-xs text-muted-foreground">Loading reference forecast…</div>;
  }
  if (!ref) return null;

  const cells: { label: string; value: number; subtitle: string }[] = [
    { label: "2025 M-Day same DOW", value: ref.lyMDayStops, subtitle: "From last year's actuals" },
    { label: "30-day trending", value: ref.trailing30Avg, subtitle: "Same-DOW avg, last 30 days" },
    { label: "60-day trending", value: ref.trailing60Avg, subtitle: "Same-DOW avg, last 60 days" },
  ];

  return (
    <div className="mt-5 border-t border-border/60 pt-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Reference Forecast</div>
        <div className="text-[11px] text-muted-foreground">Currently {currentStops} stops</div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {cells.map((c) => (
          <div key={c.label} className="rounded-lg border border-border bg-card p-3 flex flex-col">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.label}</div>
            <div className="text-2xl font-light tabular-nums mt-1">{c.value}</div>
            <div className="text-[10px] text-muted-foreground">{c.subtitle}</div>
            <button
              type="button"
              className="mt-2 text-xs px-2 py-1 rounded-md border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50"
              disabled={apply.isPending || c.value === currentStops || c.value === 0}
              onClick={() => apply.mutate({ routeId, stops: c.value })}
            >
              {c.value === currentStops ? "Already applied" : `Use ${c.value} stops`}
            </button>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">
        Holiday differential is per-route only — set it in the row above. Historical holiday $/stop is not yet stored; once it is, an &ldquo;Use 2025 holiday rate&rdquo; button will appear here.
      </p>
    </div>
  );
}

function AutoCreateRoutesButton() {
  const utils = trpc.useUtils();
  const autoForDate = trpc.routes.autoCreateForDate.useMutation({
    onSuccess: (r: any) => {
      utils.routes.list.invalidate();
      utils.timeblocks.list.invalidate();
      utils.planning.list.invalidate();
      toast.success(`Created ${r.created} route${r.created === 1 ? "" : "s"} · skipped ${r.skipped}`);
    },
    onError: (e) => toast.error(e.message ?? "Auto-create failed"),
  });
  const [open, setOpen] = useState(false);
  function dateOffset(daysAhead: number): string {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return toISODate(d);
  }
  const presets = [
    { label: "Today", date: dateOffset(0) },
    { label: "Tomorrow", date: dateOffset(1) },
    { label: "+7 days", date: dateOffset(7) },
    { label: "+14 days (sign-up open)", date: dateOffset(14) },
    { label: "+21 days (planning)", date: dateOffset(21) },
  ];
  return (
    <div className="relative">
      <Button variant="outline" disabled={autoForDate.isPending} onClick={() => setOpen((o) => !o)}>
        <Plus className="h-4 w-4 mr-2" /> Auto-Create Routes
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-background border border-border rounded-md shadow-lg w-[280px]">
          {presets.map((p) => (
            <button
              key={p.date}
              className="w-full text-left text-sm px-3 py-2 hover:bg-muted flex items-center justify-between"
              onClick={() => { autoForDate.mutate({ date: p.date }); setOpen(false); }}
            >
              <span>{p.label}</span>
              <span className="text-[11px] font-mono text-muted-foreground">{p.date}</span>
            </button>
          ))}
          <div className="border-t border-border p-2">
            <input
              type="date"
              className="w-full text-sm h-8 px-2 border border-border rounded bg-background"
              onChange={(e) => {
                if (e.target.value) {
                  autoForDate.mutate({ date: e.target.value });
                  setOpen(false);
                }
              }}
            />
            <p className="text-[10px] text-muted-foreground mt-1">Generates one placeholder route per timeblock for the chosen date (uses each timeblock's targetRoutes setting).</p>
          </div>
        </div>
      )}
    </div>
  );
}
