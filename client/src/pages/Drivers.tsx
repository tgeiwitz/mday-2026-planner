import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const VEHICLE_OPTIONS = [
  { value: "sedan", label: "Sedan (×0.80)" },
  { value: "van", label: "Van (×1.10)" },
];

function vehicleBadge(v: string | null | undefined) {
  if (v === "van") return "bg-indigo-50 text-indigo-800 border border-indigo-200";
  return "bg-slate-50 text-slate-700 border border-slate-200";
}

export default function Drivers() {
  const { data: drivers = [], refetch } = trpc.drivers.list.useQuery();
  const create = trpc.drivers.create.useMutation({
    onSuccess: () => {
      toast.success("Driver added");
      refetch();
      setOpen(false);
    },
    onError: (e) => toast.error(e.message ?? "Failed to add driver"),
  });
  const update = trpc.drivers.update.useMutation({
    onSuccess: () => refetch(),
    onError: (e) => toast.error(e.message ?? "Update failed"),
  });
  const del = trpc.drivers.delete.useMutation({
    onSuccess: () => {
      toast.success("Driver removed");
      refetch();
    },
  });

  const [open, setOpen] = useState(false);
  const [newDriver, setNewDriver] = useState({
    name: "",
    timePerStopDiff: "0",
    vehicleType: "sedan" as "sedan" | "van",
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-gradient-to-b from-muted/30 to-transparent">
        <div className="container py-8 flex items-start justify-between">
          <div>
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
              Roster
            </span>
            <h1 className="page-title mt-1">Drivers</h1>
            <p className="page-subtitle">
              One row per driver. Vehicle determines the route-pay multiplier (Sedan ×0.80, Van ×1.10). Hourly Min/Max define the per-driver hourly band that the route pay must fall within after the 0.75 baseline + mileage. Two drivers signed up for the same timeblock can therefore earn different totals.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Add Driver</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Driver</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">Name</label>
                  <Input
                    value={newDriver.name}
                    onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs uppercase tracking-wider text-muted-foreground">Vehicle</label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={newDriver.vehicleType}
                      onChange={(e) => setNewDriver({ ...newDriver, vehicleType: e.target.value as "sedan" | "van" })}
                    >
                      <option value="sedan">Sedan (×0.80)</option>
                      <option value="van">Van (×1.10)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wider text-muted-foreground">
                      Time/Stop Diff (min)
                    </label>
                    <Input
                      type="number"
                      step="0.5"
                      value={newDriver.timePerStopDiff}
                      onChange={(e) => setNewDriver({ ...newDriver, timePerStopDiff: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() =>
                    create.mutate({
                      name: newDriver.name,
                      // legacy required fields — not surfaced in UI any more
                      status: "Pending",
                      driverType: "Lead",
                      timePerStopDiff: newDriver.timePerStopDiff,
                      vehicleType: newDriver.vehicleType,
                    } as any)
                  }
                >
                  Add
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="container py-8">
        <Card className="border-border/60 overflow-hidden">
          <div className="table-scroll">
          <table className="elegant-table">
            <thead>
              <tr>
                <th>Driver</th>
                <th>Vehicle</th>
                <th className="text-right" title="Per-driver share of route fee. Blank = use global 0.75. Founding drivers can override.">Pay %</th>
                <th className="text-right" title="Hourly target floor. Driver Pay must end up at or above this × estimated hours. If short, a Wodely workforce-task adjustment grosses it up.">Hourly Min</th>
                <th className="text-right" title="Hourly target ceiling. Driver Pay caps at this × estimated hours; surplus stays in the platform 25%.">Hourly Max</th>
                <th className="text-right" title="Per-driver minutes added (or subtracted) to the per-stop time baseline. New drivers usually +0.5–1 min.">Time/Stop Diff</th>
                <th>Internal Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d) => (
                <tr key={d.id}>
                  <td className="font-medium">
                    <Input
                      className="h-8 border-transparent bg-transparent hover:border-border focus:border-ring font-medium"
                      defaultValue={d.name}
                      onBlur={(e) => {
                        if (e.target.value !== d.name) update.mutate({ id: d.id, name: e.target.value });
                      }}
                    />
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Badge className={`${vehicleBadge((d as any).vehicleType)} font-normal`}>
                        {(d as any).vehicleType === "van" ? "Van" : "Sedan"}
                      </Badge>
                      <select
                        className="h-8 w-[110px] rounded-md border border-transparent hover:border-border bg-transparent px-2 text-sm focus:border-ring"
                        value={(d as any).vehicleType ?? "sedan"}
                        onChange={(e) => {
                          const v = e.target.value as "sedan" | "van";
                          if (v !== (d as any).vehicleType) update.mutate({ id: d.id, vehicleType: v as any });
                        }}
                      >
                        <option value="sedan">Sedan</option>
                        <option value="van">Van</option>
                      </select>
                    </div>
                  </td>
                  <td className="text-right">
                    <Input
                      className="h-8 w-20 ml-auto text-right font-mono border-transparent bg-transparent hover:border-border focus:border-ring"
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      placeholder=".75"
                      defaultValue={d.payPctOverride ?? ""}
                      onBlur={(e) => {
                        const raw = e.target.value.trim();
                        update.mutate({ id: d.id, payPctOverride: raw === "" ? null : raw });
                      }}
                    />
                  </td>
                  <td className="text-right">
                    <Input
                      className="h-8 w-20 ml-auto text-right font-mono border-transparent bg-transparent hover:border-border focus:border-ring"
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder="—"
                      defaultValue={(d as any).hourlyTargetMin ?? ""}
                      onBlur={(e) => {
                        const raw = e.target.value.trim();
                        update.mutate({ id: d.id, hourlyTargetMin: raw === "" ? null : raw } as any);
                      }}
                    />
                  </td>
                  <td className="text-right">
                    <Input
                      className="h-8 w-20 ml-auto text-right font-mono border-transparent bg-transparent hover:border-border focus:border-ring"
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder="—"
                      defaultValue={(d as any).hourlyTargetMax ?? ""}
                      onBlur={(e) => {
                        const raw = e.target.value.trim();
                        update.mutate({ id: d.id, hourlyTargetMax: raw === "" ? null : raw } as any);
                      }}
                    />
                  </td>
                  <td className="text-right">
                    <Input
                      className="h-8 w-20 ml-auto text-right font-mono border-transparent bg-transparent hover:border-border focus:border-ring"
                      type="number"
                      step="0.5"
                      defaultValue={String(d.timePerStopDiff)}
                      onBlur={(e) => update.mutate({ id: d.id, timePerStopDiff: e.target.value })}
                    />
                  </td>
                  <td>
                    <Input
                      className="h-8 min-w-[180px] border-transparent bg-transparent hover:border-border focus:border-ring text-xs"
                      placeholder="Dispatch notes (e.g. prefers AM, has spare van keys, off Tue)…"
                      defaultValue={(d as any).notes ?? ""}
                      onBlur={(e) => {
                        const val = e.target.value;
                        if (val !== ((d as any).notes ?? "")) update.mutate({ id: d.id, notes: val } as any);
                      }}
                    />
                  </td>
                  <td className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => del.mutate({ id: d.id })}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </Card>
        <p className="text-xs text-muted-foreground mt-3">
          Driver-level Status and Type were removed — confirmation now lives per-route on the Routes page (each assignment can be marked Confirmed independently). Pay Floor / Pay Max in dollars were replaced by the Hourly band; if you need a hard $ override on a single route, do it on the Routes page row.
        </p>
      </div>
    </div>
  );
}
