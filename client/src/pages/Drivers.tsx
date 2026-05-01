import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TypeAhead } from "@/components/TypeAhead";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";

const STATUS_OPTIONS = [
  { value: "Confirmed", label: "Confirmed" },
  { value: "Pending", label: "Pending" },
  { value: "Placeholder", label: "Placeholder" },
];
const TYPE_OPTIONS = [
  { value: "Lead", label: "Lead" },
  { value: "New", label: "New" },
];
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

function statusBadge(status: string) {
  if (status === "Confirmed") return "bg-emerald-50 text-emerald-800 border border-emerald-200";
  if (status === "Pending") return "bg-amber-50 text-amber-800 border border-amber-200";
  return "bg-muted text-muted-foreground border border-border";
}

export default function Drivers() {
  const { data: drivers = [], refetch } = trpc.drivers.list.useQuery();
  const create = trpc.drivers.create.useMutation({
    onSuccess: () => {
      toast.success("Driver added");
      refetch();
      setOpen(false);
    },
  });
  const update = trpc.drivers.update.useMutation({
    onSuccess: () => refetch(),
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
    status: "Pending" as "Confirmed" | "Pending" | "Placeholder",
    driverType: "Lead" as "Lead" | "New",
    timePerStopDiff: "0",
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
              Confirmed, pending, and placeholder drivers with per-driver time differentials and per-driver pay overrides. Two drivers on the same timeblock can earn different rates.
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
                    <label className="text-xs uppercase tracking-wider text-muted-foreground">Status</label>
                    <TypeAhead
                      value={newDriver.status}
                      options={STATUS_OPTIONS}
                      strict
                      onCommit={(v) => v && setNewDriver({ ...newDriver, status: v as any })}
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wider text-muted-foreground">Type</label>
                    <TypeAhead
                      value={newDriver.driverType}
                      options={TYPE_OPTIONS}
                      strict
                      onCommit={(v) => v && setNewDriver({ ...newDriver, driverType: v as any })}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Time per Stop Diff (min)
                  </label>
                  <Input
                    type="number"
                    step="0.5"
                    value={newDriver.timePerStopDiff}
                    onChange={(e) => setNewDriver({ ...newDriver, timePerStopDiff: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => create.mutate({ ...newDriver, timePerStopDiff: newDriver.timePerStopDiff })}>
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
                <th>Status</th>
                <th>Type</th>
                <th className="text-right">Time/Stop Diff</th>
                <th className="text-right" title="Per-driver share of route fee. Blank = use global driverPayPct (75%).">Pay %</th>
                <th className="text-right" title="Per-driver pay floor. Blank = inherit timeblock minPayFloor.">Pay Floor</th>
                <th className="text-right" title="Per-driver pay max. Blank = inherit timeblock maxPayFloor.">Pay Max</th>
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
                      <Badge className={`${statusBadge(d.status)} font-normal`}>{d.status}</Badge>
                      <TypeAhead
                        className="w-[130px]"
                        value={d.status}
                        options={STATUS_OPTIONS}
                        strict
                        onCommit={(v) => v && v !== d.status && update.mutate({ id: d.id, status: v as any })}
                      />
                    </div>
                  </td>
                  <td>
                    <TypeAhead
                      className="w-[110px]"
                      value={d.driverType}
                      options={TYPE_OPTIONS}
                      strict
                      onCommit={(v) => v && v !== d.driverType && update.mutate({ id: d.id, driverType: v as any })}
                    />
                  </td>
                  <td className="text-right">
                    <Input
                      className="h-8 w-24 ml-auto text-right font-mono border-transparent bg-transparent hover:border-border focus:border-ring"
                      type="number"
                      step="0.5"
                      defaultValue={String(d.timePerStopDiff)}
                      onBlur={(e) => update.mutate({ id: d.id, timePerStopDiff: e.target.value })}
                    />
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
                      className="h-8 w-24 ml-auto text-right font-mono border-transparent bg-transparent hover:border-border focus:border-ring"
                      type="number"
                      step="1"
                      min="0"
                      placeholder="—"
                      defaultValue={d.payFloorOverride ?? ""}
                      onBlur={(e) => {
                        const raw = e.target.value.trim();
                        update.mutate({ id: d.id, payFloorOverride: raw === "" ? null : raw });
                      }}
                    />
                  </td>
                  <td className="text-right">
                    <Input
                      className="h-8 w-24 ml-auto text-right font-mono border-transparent bg-transparent hover:border-border focus:border-ring"
                      type="number"
                      step="1"
                      min="0"
                      placeholder="—"
                      defaultValue={d.payMaxOverride ?? ""}
                      onBlur={(e) => {
                        const raw = e.target.value.trim();
                        update.mutate({ id: d.id, payMaxOverride: raw === "" ? null : raw });
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
      </div>
    </div>
  );
}
