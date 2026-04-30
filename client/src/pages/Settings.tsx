import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Copy, Plus, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

        <MerchantShareAdmin />
      </div>
    </div>
  );
}

function MerchantShareAdmin() {
  const { data: tokens, refetch } = trpc.merchantShare.listTokens.useQuery();
  const createToken = trpc.merchantShare.createToken.useMutation({
    onSuccess: () => { refetch(); toast.success("Share link created"); },
    onError: (e) => toast.error(e.message),
  });
  const revokeToken = trpc.merchantShare.revokeToken.useMutation({
    onSuccess: () => { refetch(); toast.success("Share link revoked"); },
  });

  const [merchant, setMerchant] = useState<"LAF" | "BC" | "SMC" | "SMR">("LAF");
  const [label, setLabel] = useState("");

  const urlFor = (token: string) => `${window.location.origin}/m/${token}`;
  const copy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(urlFor(token));
      toast.success("Link copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <Card className="border-border/60">
      <CardContent className="pt-6 space-y-4">
        <div>
          <h3 className="font-serif text-lg mb-1">Merchant Share Links</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Generate a tokenized URL each merchant can open to view/update their weekly forecast.
            Future weeks editable, current/past weeks read-only. SMC/SMR portals are ad-hoc view only.
          </p>
        </div>
        <div className="flex gap-2 items-end">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Merchant</label>
            <Select value={merchant} onValueChange={(v) => setMerchant(v as any)}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="LAF">LAF</SelectItem>
                <SelectItem value="BC">BC</SelectItem>
                <SelectItem value="SMC">SMC</SelectItem>
                <SelectItem value="SMR">SMR</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Label (optional)</label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g., Main LAF contact" />
          </div>
          <Button onClick={() => { createToken.mutate({ merchant, label: label || undefined }); setLabel(""); }}>
            <Plus className="h-4 w-4 mr-1" /> Create link
          </Button>
        </div>

        <div className="divide-y divide-border/60">
          {(tokens ?? []).map((t: any) => (
            <div key={t.id} className={`flex items-center gap-2 py-3 ${t.revokedAt ? "opacity-50" : ""}`}>
              <Badge variant="outline" className="font-mono">{t.merchant}</Badge>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{t.label || "(no label)"}</div>
                <code className="text-xs text-muted-foreground truncate block">{urlFor(t.token)}</code>
              </div>
              <div className="text-xs text-muted-foreground whitespace-nowrap">
                {t.lastUsedAt ? `used ${new Date(t.lastUsedAt).toLocaleDateString()}` : "unused"}
              </div>
              {!t.revokedAt && (
                <>
                  <Button variant="outline" size="sm" onClick={() => copy(t.token)}>
                    <Copy className="h-3 w-3 mr-1" /> Copy
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => revokeToken.mutate({ id: t.id })}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              )}
              {t.revokedAt && <span className="text-xs text-destructive">revoked</span>}
            </div>
          ))}
          {(tokens ?? []).length === 0 && (
            <div className="text-sm text-muted-foreground py-4">No share links yet.</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
