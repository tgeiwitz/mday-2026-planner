import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export default function Settings() {
  const { data: settings, refetch } = trpc.settings.get.useQuery();
  const update = trpc.settings.update.useMutation({
    onSuccess: () => {
      toast.success("Settings updated");
      refetch();
    },
  });
  const recalc = trpc.routes.recalculate.useMutation({
    onSuccess: () => toast.success("Routes recalculated"),
  });

  const [form, setForm] = useState({
    driverPayPct: "0.75",
    mileagePayPerMile: "0.50",
    mileageThreshold: "30",
    platformFeePct: "0.10",
    holidaySurchargePerStop: "5.00",
    holidaySurchargeEnabled: false,
    targetDwellMinutes: "20",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        driverPayPct: String(settings.driverPayPct),
        mileagePayPerMile: String(settings.mileagePayPerMile),
        mileageThreshold: String(settings.mileageThreshold),
        platformFeePct: String(settings.platformFeePct),
        holidaySurchargePerStop: String(settings.holidaySurchargePerStop),
        holidaySurchargeEnabled: !!settings.holidaySurchargeEnabled,
        targetDwellMinutes: String(settings.targetDwellMinutes),
      });
    }
  }, [settings]);

  const save = () => {
    update.mutate(form);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-gradient-to-b from-muted/30 to-transparent">
        <div className="container py-8">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
            Global Parameters
          </span>
          <h1 className="page-title mt-1">Settings</h1>
          <p className="page-subtitle">
            Pay formulas, mileage thresholds, and holiday surcharges. Changes cascade to all routes on save.
          </p>
        </div>
      </div>

      <div className="container py-8 max-w-3xl space-y-6">
        <Card className="border-border/60">
          <CardContent className="pt-6 space-y-4">
            <div>
              <h3 className="font-serif text-lg mb-1">Driver Pay</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Base driver pay is a percentage of the route shipping fee.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Driver Pay %
                  </label>
                  <Input
                    value={form.driverPayPct}
                    onChange={(e) => setForm({ ...form, driverPayPct: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Mileage Pay ($/mi over threshold)
                  </label>
                  <Input
                    value={form.mileagePayPerMile}
                    onChange={(e) => setForm({ ...form, mileagePayPerMile: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Mileage Threshold (miles)
                  </label>
                  <Input
                    type="number"
                    value={form.mileageThreshold}
                    onChange={(e) => setForm({ ...form, mileageThreshold: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Platform Fee %
                  </label>
                  <Input
                    value={form.platformFeePct}
                    onChange={(e) => setForm({ ...form, platformFeePct: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="pt-6 space-y-4">
            <div>
              <h3 className="font-serif text-lg mb-1">Holiday Surcharge</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Per-stop surcharge toggle for holiday week pricing.
              </p>
              <div className="grid grid-cols-2 gap-4 items-end">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Surcharge per Stop ($)
                  </label>
                  <Input
                    value={form.holidaySurchargePerStop}
                    onChange={(e) => setForm({ ...form, holidaySurchargePerStop: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-3 pb-2">
                  <Switch
                    checked={form.holidaySurchargeEnabled}
                    onCheckedChange={(v) => setForm({ ...form, holidaySurchargeEnabled: v })}
                  />
                  <span className="text-sm">
                    {form.holidaySurchargeEnabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="pt-6 space-y-4">
            <div>
              <h3 className="font-serif text-lg mb-1">Dwell Target</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Target loading dwell per route (vs. 30-55min actuals observed last year).
              </p>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Target Minutes per Route Load
                </label>
                <Input
                  type="number"
                  value={form.targetDwellMinutes}
                  onChange={(e) => setForm({ ...form, targetDwellMinutes: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button onClick={save}>Save Settings</Button>
          <Button variant="outline" onClick={() => recalc.mutate()}>
            <RefreshCw className="h-4 w-4 mr-2" /> Recalculate All Routes
          </Button>
        </div>
      </div>
    </div>
  );
}
