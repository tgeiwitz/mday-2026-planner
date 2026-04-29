import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Sunrise, Sun, Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function fmtDate(d: string | Date) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function Timeblocks() {
  const { data: blocks = [], refetch: refetchBlocks } = trpc.timeblocks.list.useQuery();
  const { data: drivers = [] } = trpc.drivers.list.useQuery();
  const { data: assignments = [], refetch: refetchAssignments } = trpc.driverTimeblocks.list.useQuery();
  const updateBlock = trpc.timeblocks.update.useMutation({ onSuccess: () => refetchBlocks() });
  const assign = trpc.driverTimeblocks.assign.useMutation({
    onSuccess: () => {
      refetchAssignments();
      toast.success("Driver assigned");
    },
  });
  const remove = trpc.driverTimeblocks.remove.useMutation({
    onSuccess: () => refetchAssignments(),
  });
  const updateStatus = trpc.driverTimeblocks.updateStatus.useMutation({
    onSuccess: () => refetchAssignments(),
  });

  const [selectedDriver, setSelectedDriver] = useState<Record<number, string>>({});

  const assignmentsByBlock = new Map<number, typeof assignments>();
  for (const a of assignments) {
    if (!assignmentsByBlock.has(a.timeblockId)) assignmentsByBlock.set(a.timeblockId, []);
    assignmentsByBlock.get(a.timeblockId)!.push(a);
  }

  const driverMap = new Map(drivers.map((d) => [d.id, d]));

  // Group by date
  const byDate = new Map<string, typeof blocks>();
  for (const b of blocks) {
    const k = String(b.blockDate).slice(0, 10);
    if (!byDate.has(k)) byDate.set(k, []);
    byDate.get(k)!.push(b);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-gradient-to-b from-muted/30 to-transparent">
        <div className="container py-8">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
            Schedule · April 29 – May 18, 2026
          </span>
          <h1 className="page-title mt-1">Timeblocks</h1>
          <p className="page-subtitle max-w-3xl">
            Wave 1 and Wave 2 for each day. Pickup times are derived from 2025 historical data.
            Drivers can sign up or be scheduled; pay floor, max, bonus, and estimated route pay are editable.
          </p>
        </div>
      </div>

      <div className="container py-8 space-y-6">
        {Array.from(byDate.entries()).map(([dateKey, waves]) => (
          <Card key={dateKey} className="border-border/60 overflow-hidden">
            <div className="px-6 py-3 border-b border-border/60 bg-muted/20 flex items-center justify-between">
              <h2 className="font-serif text-lg">{fmtDate(dateKey)}</h2>
              <span className="text-xs text-muted-foreground font-mono">{dateKey}</span>
            </div>
            <div className="divide-y divide-border/60">
              {waves.map((b) => {
                const waveAssignments = assignmentsByBlock.get(b.id) ?? [];
                const Icon = b.wave === "Wave 1" ? Sunrise : Sun;
                return (
                  <div key={b.id} className="px-6 py-4">
                    <div className="grid grid-cols-12 gap-4 items-start">
                      <div className="col-span-12 md:col-span-2 flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary" />
                        <div>
                          <div className="font-medium text-sm">{b.wave}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {b.availabilityStart}–{b.availabilityEnd}
                          </div>
                        </div>
                      </div>
                      <div className="col-span-6 md:col-span-2">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">LAF Pickup</div>
                        <div className="font-mono text-sm">{b.lafPickupTime ?? "—"}</div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">BC Pickup</div>
                        <div className="font-mono text-sm">{b.bcPickupTime ?? "—"}</div>
                      </div>
                      <div className="col-span-6 md:col-span-1">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Est Pay</div>
                        <Input
                          className="h-8 font-mono text-sm border-transparent hover:border-border focus:border-ring"
                          defaultValue={String(b.estRoutePay)}
                          onBlur={(e) => updateBlock.mutate({ id: b.id, estRoutePay: e.target.value })}
                        />
                      </div>
                      <div className="col-span-6 md:col-span-1">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Duration (min)</div>
                        <Input
                          className="h-8 font-mono text-sm border-transparent hover:border-border focus:border-ring"
                          type="number"
                          defaultValue={b.estDuration}
                          onBlur={(e) => updateBlock.mutate({ id: b.id, estDuration: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="col-span-6 md:col-span-1">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Bonus</div>
                        <Input
                          className="h-8 font-mono text-sm border-transparent hover:border-border focus:border-ring"
                          defaultValue={String(b.bonus)}
                          onBlur={(e) => updateBlock.mutate({ id: b.id, bonus: e.target.value })}
                        />
                      </div>
                      <div className="col-span-6 md:col-span-1">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Min</div>
                        <Input
                          className="h-8 font-mono text-sm border-transparent hover:border-border focus:border-ring"
                          defaultValue={String(b.minPayFloor)}
                          onBlur={(e) => updateBlock.mutate({ id: b.id, minPayFloor: e.target.value })}
                        />
                      </div>
                      <div className="col-span-6 md:col-span-1">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Max</div>
                        <Input
                          className="h-8 font-mono text-sm border-transparent hover:border-border focus:border-ring"
                          defaultValue={String(b.maxPayFloor)}
                          onBlur={(e) => updateBlock.mutate({ id: b.id, maxPayFloor: e.target.value })}
                        />
                      </div>
                      <div className="col-span-12 md:col-span-3">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                          Drivers ({waveAssignments.length})
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {waveAssignments.map((a) => {
                            const d = driverMap.get(a.driverId);
                            if (!d) return null;
                            return (
                              <Badge
                                key={a.id}
                                className={`font-normal cursor-pointer gap-1 ${
                                  a.assignmentStatus === "Scheduled"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-secondary text-secondary-foreground"
                                }`}
                                onClick={() =>
                                  updateStatus.mutate({
                                    id: a.id,
                                    status: a.assignmentStatus === "Scheduled" ? "Signed Up" : "Scheduled",
                                  })
                                }
                              >
                                {d.name}
                                <X
                                  className="h-3 w-3 ml-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    remove.mutate({ id: a.id });
                                  }}
                                />
                              </Badge>
                            );
                          })}
                          <div className="flex gap-1">
                            <Select
                              value={selectedDriver[b.id] ?? ""}
                              onValueChange={(v) => setSelectedDriver((p) => ({ ...p, [b.id]: v }))}
                            >
                              <SelectTrigger className="h-6 text-xs w-[140px]">
                                <SelectValue placeholder="Assign..." />
                              </SelectTrigger>
                              <SelectContent>
                                {drivers
                                  .filter((d) => !waveAssignments.some((a) => a.driverId === d.id))
                                  .map((d) => (
                                    <SelectItem key={d.id} value={String(d.id)}>
                                      {d.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 w-6 p-0"
                              onClick={() => {
                                const did = selectedDriver[b.id];
                                if (did) {
                                  assign.mutate({
                                    driverId: parseInt(did),
                                    timeblockId: b.id,
                                    assignmentStatus: "Signed Up",
                                  });
                                  setSelectedDriver((p) => ({ ...p, [b.id]: "" }));
                                }
                              }}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
