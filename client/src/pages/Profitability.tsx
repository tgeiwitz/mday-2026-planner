import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

const fmt$ = (n: number) =>
  `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString()}`;

const fmtDayLabel = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${parseInt(m, 10)}/${parseInt(d, 10)}`;
};

const fmtRange = (a: string, b: string) =>
  `${fmtDayLabel(a)} – ${fmtDayLabel(b)}`;

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
