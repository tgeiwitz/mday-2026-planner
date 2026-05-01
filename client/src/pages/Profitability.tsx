import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

const fmt$ = (n: number) =>
  `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString()}`;

const fmtDayLabel = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${parseInt(m, 10)}/${parseInt(d, 10)}`;
};

const fmtRange = (a: string, b: string) =>
  `${fmtDayLabel(a)} – ${fmtDayLabel(b)}`;

function CalculationExplainer() {
  const [open, setOpen] = useState(false);
  return (
    <Card className="border-border/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-5 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="text-sm font-medium">How is this calculated? Where does the data come from?</span>
        <span className="ml-auto text-xs text-muted-foreground">
          Click to expand
        </span>
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 text-sm text-muted-foreground space-y-4 border-t border-border/40">
          <section>
            <h3 className="text-foreground font-semibold mb-1">Sources of truth</h3>
            <p>
              Every dollar comes from four tables: <code className="text-xs">zone_metrics</code> (per-zone fee, distance, travel time), <code className="text-xs">timeblocks</code> (the schedulable shift &mdash; pickup window, mileage rate, pay floor/max, target route count), <code className="text-xs">routes</code> + <code className="text-xs">route_zones</code> (each placeholder route and its zone mix), and <code className="text-xs">wodely_task_cache</code> (per-task fees confirmed by Wodely, refreshed by the Sync from Wodely button on the Dashboard). Platform constants like driver pay percent, platform fee percent, mileage rate / threshold, and the global holiday surcharge live in <code className="text-xs">global_settings</code>.
            </p>
          </section>
          <section>
            <h3 className="text-foreground font-semibold mb-1">How routes get created</h3>
            <p>
              Today there is no routes.create endpoint exposed in the UI. Placeholder route rows are seeded directly into the routes table at setup time, one per timeblock&apos;s <code className="text-xs">targetRoutes</code>, and edited on the Routes page. Editing <code className="text-xs">stops</code>, <code className="text-xs">driverId</code>, <code className="text-xs">status</code>, <code className="text-xs">payFloorOverride</code>, <code className="text-xs">payMaxOverride</code>, <code className="text-xs">holidayPerStopSurcharge</code>, or <code className="text-xs">driverBonus</code> auto-retriggers the recalculation engine. Wodely sync does not duplicate routes &mdash; it only updates the fee mode on existing rows by hydrating <code className="text-xs">wodely_task_cache</code>.
            </p>
          </section>
          <section>
            <h3 className="text-foreground font-semibold mb-1">Per-route math (recalculateAllRoutes)</h3>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Baseline fee = sum over zones of <code className="text-xs">zoneFee &times; taskCount</code>; baseline miles and travel time computed the same way.</li>
              <li>If Wodely has confirmations for this route&apos;s (merchant, date), fee shifts to <span className="font-medium text-foreground">locked</span> (route&apos;s share of confirmed fee) once the route is Routed/Completed or fully confirmed; otherwise <span className="font-medium text-foreground">blended</span> (Wodely portion + baseline-per-stop &times; remaining stops). With no Wodely data, fee mode is <span className="font-medium text-foreground">baseline</span>.</li>
              <li>Holiday differential: per-route <code className="text-xs">holidayPerStopSurcharge &times; stops</code> when set; otherwise the global surcharge if its toggle is on. Per-route always wins.</li>
              <li>Driver pay = <code className="text-xs">fee &times; driverPayPct</code> + per-route <code className="text-xs">driverBonus</code>, then clamped to the route&apos;s pay-floor/max overrides (or the timeblock&apos;s defaults).</li>
              <li>Mileage pay = <code className="text-xs">max(0, miles &minus; mileageThreshold) &times; mileagePayPerMile</code>. Platform fee = <code className="text-xs">fee &times; platformFeePct</code>.</li>
              <li>The engine writes <code className="text-xs">estRouteFee</code>, <code className="text-xs">estDriverPay</code>, <code className="text-xs">estMileagePay</code>, <code className="text-xs">estPlatformFee</code>, <code className="text-xs">estMileage</code>, and <code className="text-xs">estDuration</code>. Holiday differential is already baked into <code className="text-xs">estRouteFee</code>; bonus is already baked into <code className="text-xs">estDriverPay</code>. No double-count downstream.</li>
            </ol>
          </section>
          <section>
            <h3 className="text-foreground font-semibold mb-1">Profitability roll-up</h3>
            <p>
              Each day sums the post-recalc fields across its routes. <span className="font-medium text-foreground">Net Margin = Revenue &minus; Driver Pay &minus; Mileage &minus; Platform.</span> The Holiday Diff and Bonus columns are display-only because they&apos;re already inside Revenue and Driver Pay respectively. Weeks group Monday-to-Sunday (each row&apos;s <code className="text-xs">weekStart</code> is the Monday of its date). The top summary cards sum every day in the M-Day window.
            </p>
          </section>
          <section>
            <h3 className="text-foreground font-semibold mb-1">Test invariants enforced in CI</h3>
            <p>
              <code className="text-xs">server/sprint.test.ts</code> guarantees that the sum of day margins equals the top-level margin to the cent, the sum of week margins equals the top-level margin, every <code className="text-xs">weekStart</code> is a Monday, and that toggling per-route holiday and bonus does not break the post-recalc invariant. Full reference: <code className="text-xs">DATA_LINEAGE.md</code> in the project root.
            </p>
          </section>
        </div>
      )}
    </Card>
  );
}

export default function Profitability() {
  const { data, isLoading } = trpc.profitability.rollup.useQuery();

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="text-muted-foreground text-sm">Loading profitability…</div>
      </div>
    );
  }

  const days = data?.days ?? [];
  const weeks = data?.weeks ?? [];
  const totals = data?.totals;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-gradient-to-b from-muted/30 to-transparent">
        <div className="container py-8">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
            Margin Visibility
          </span>
          <h1 className="page-title mt-1">Weekly Profitability</h1>
          <p className="page-subtitle">
            Net = Fee (incl. holiday differential) − Driver Pay (incl. bonus) − Mileage Pay − Platform Fee.
            Holiday differential and driver bonus are <span className="font-semibold">per route</span>;
            this view rolls every route up to the day and the week so you can see if the M-Day window pays.
          </p>
        </div>
      </div>

      <div className="container py-8 space-y-8">
        <CalculationExplainer />
        {totals && days.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Routes</div>
              <div className="text-2xl font-semibold mt-1 num-cell">{totals.routes}</div>
              <div className="text-xs text-muted-foreground mt-1">{totals.stops} stops</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Revenue</div>
              <div className="text-2xl font-semibold mt-1 num-cell">{fmt$(totals.revenue)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Holiday diff: {fmt$(totals.holidayDiff)}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Driver Cost</div>
              <div className="text-2xl font-semibold mt-1 num-cell">
                {fmt$(totals.driverPay + totals.mileagePay)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Pay {fmt$(totals.driverPay)} · Mileage {fmt$(totals.mileagePay)} · Bonus {fmt$(totals.bonus)}
              </div>
            </Card>
            <Card
              className={`p-4 ${
                totals.margin >= 0 ? "border-emerald-200 bg-emerald-50/40" : "border-red-200 bg-red-50/40"
              }`}
            >
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Net Margin</div>
              <div
                className={`text-2xl font-semibold mt-1 num-cell ${
                  totals.margin >= 0 ? "text-emerald-700" : "text-red-700"
                }`}
              >
                {fmt$(totals.margin)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Platform fee: {fmt$(totals.platformFee)}
              </div>
            </Card>
          </div>
        )}

        {days.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">
            No routes scheduled yet. Add routes (or run "Sync from Wodely") to see profitability roll up here.
          </Card>
        )}

        {weeks.map((w) => {
          const profitable = w.totals.margin >= 0;
          return (
            <Card key={w.weekStart} className="border-border/60 overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Week of</div>
                  <div className="text-base font-semibold">
                    {fmtRange(w.weekStart, w.weekEnd)}
                  </div>
                </div>
                <div
                  className={`text-right ${
                    profitable ? "text-emerald-700" : "text-red-700"
                  }`}
                >
                  <div className="text-xs uppercase tracking-wider opacity-80">Net Margin</div>
                  <div className="text-xl font-semibold num-cell">{fmt$(w.totals.margin)}</div>
                </div>
              </div>

              <div className="table-scroll">
                <table className="elegant-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Day</th>
                      <th className="text-right">Routes</th>
                      <th className="text-right">Stops</th>
                      <th className="text-right">Revenue</th>
                      <th className="text-right" title="Per-stop holiday surcharge × stops, summed across routes">
                        Holiday Diff
                      </th>
                      <th className="text-right">Driver Pay</th>
                      <th className="text-right">Bonus</th>
                      <th className="text-right">Mileage</th>
                      <th className="text-right">Platform</th>
                      <th className="text-right">Net Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {w.days.map((d) => (
                      <tr key={d.date}>
                        <td className="text-xs whitespace-nowrap">{fmtDayLabel(d.date)}</td>
                        <td className="text-xs text-muted-foreground">{d.dayName}</td>
                        <td className="num-cell">{d.routes}</td>
                        <td className="num-cell">{d.stops}</td>
                        <td className="num-cell font-medium">{fmt$(d.revenue)}</td>
                        <td className="num-cell text-xs text-muted-foreground">
                          {d.holidayDiff > 0 ? fmt$(d.holidayDiff) : "—"}
                        </td>
                        <td className="num-cell">{fmt$(d.driverPay)}</td>
                        <td className="num-cell text-xs">
                          {d.bonus > 0 ? fmt$(d.bonus) : "—"}
                        </td>
                        <td className="num-cell text-xs">{fmt$(d.mileagePay)}</td>
                        <td className="num-cell text-xs text-muted-foreground">
                          {fmt$(d.platformFee)}
                        </td>
                        <td
                          className={`num-cell font-semibold ${
                            d.margin >= 0 ? "text-emerald-700" : "text-red-700"
                          }`}
                        >
                          {fmt$(d.margin)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-muted/20 font-semibold">
                      <td colSpan={2} className="text-xs uppercase tracking-wider">
                        Week total
                      </td>
                      <td className="num-cell">{w.totals.routes}</td>
                      <td className="num-cell">{w.totals.stops}</td>
                      <td className="num-cell">{fmt$(w.totals.revenue)}</td>
                      <td className="num-cell text-xs">
                        {w.totals.holidayDiff > 0 ? fmt$(w.totals.holidayDiff) : "—"}
                      </td>
                      <td className="num-cell">{fmt$(w.totals.driverPay)}</td>
                      <td className="num-cell text-xs">
                        {w.totals.bonus > 0 ? fmt$(w.totals.bonus) : "—"}
                      </td>
                      <td className="num-cell text-xs">{fmt$(w.totals.mileagePay)}</td>
                      <td className="num-cell text-xs">{fmt$(w.totals.platformFee)}</td>
                      <td
                        className={`num-cell ${
                          w.totals.margin >= 0 ? "text-emerald-700" : "text-red-700"
                        }`}
                      >
                        {fmt$(w.totals.margin)}
                      </td>
                    </tr>
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
