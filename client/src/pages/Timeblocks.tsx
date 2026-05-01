import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InlineEnumInput } from "@/components/InlineEnumInput";
import { trpc } from "@/lib/trpc";
import { Plus, X, Pencil, Copy, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { fmtDate, toISODate } from "@/lib/date";

type EditorMode = "create" | "edit";
type TBForm = {
  id?: number;
  blockDate: string;
  label: string;
  merchant: "LAF" | "BC" | "SMC" | "SMR" | "Flex";
  bookingType: "Direct" | "Flex";
  routeStart: string;
  availabilityStart: string;
  availabilityEnd: string;
  lafPickupTime: string;
  bcPickupTime: string;
  pickupDwell: number;
  targetRoutes: number;
  mileageRate: string;
  estRoutePay: string;
  estDuration: number;
  bonus: string;
  minPayFloor: string;
  maxPayFloor: string;
  notes: string;
};

const EMPTY_FORM = (date: string): TBForm => ({
  blockDate: date,
  label: "",
  merchant: "Flex",
  bookingType: "Flex",
  routeStart: "",
  availabilityStart: "06:00",
  availabilityEnd: "20:00",
  lafPickupTime: "",
  bcPickupTime: "",
  pickupDwell: 15,
  targetRoutes: 1,
  mileageRate: "0.670",
  estRoutePay: "0",
  estDuration: 0,
  bonus: "0",
  minPayFloor: "150",
  maxPayFloor: "250",
  notes: "",
});

function merchantBadgeClass(m: string): string {
  switch (m) {
    case "LAF": return "bg-rose-50 text-rose-800 border border-rose-200 font-normal";
    case "BC":  return "bg-violet-50 text-violet-800 border border-violet-200 font-normal";
    case "SMC": return "bg-emerald-50 text-emerald-800 border border-emerald-200 font-normal";
    case "SMR": return "bg-amber-50 text-amber-800 border border-amber-200 font-normal";
    default:    return "bg-sky-50 text-sky-800 border border-sky-200 font-normal";
  }
}

export default function Timeblocks() {
  const { data: blocks = [], refetch: refetchBlocks } = trpc.timeblocks.list.useQuery();
  const { data: drivers = [] } = trpc.drivers.list.useQuery();
  const { data: assignments = [], refetch: refetchAssignments } = trpc.driverTimeblocks.list.useQuery();

  const invalidate = () => { refetchBlocks(); refetchAssignments(); };

  const createBlock = trpc.timeblocks.create.useMutation({
    onSuccess: () => { invalidate(); toast.success("Timeblock created"); setEditor(null); },
    onError: (e) => toast.error(e.message),
  });
  const updateBlock = trpc.timeblocks.update.useMutation({
    onSuccess: () => { invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const duplicateBlock = trpc.timeblocks.duplicate.useMutation({
    onSuccess: () => { invalidate(); toast.success("Timeblock duplicated"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteBlock = trpc.timeblocks.delete.useMutation({
    onSuccess: () => { invalidate(); toast.success("Timeblock deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const assign = trpc.driverTimeblocks.assign.useMutation({
    onSuccess: () => { refetchAssignments(); toast.success("Driver assigned"); },
  });
  const remove = trpc.driverTimeblocks.remove.useMutation({ onSuccess: () => refetchAssignments() });
  const updateStatus = trpc.driverTimeblocks.updateStatus.useMutation({ onSuccess: () => refetchAssignments() });

  const [selectedDriver, setSelectedDriver] = useState<Record<number, string>>({});
  const [editor, setEditor] = useState<{ mode: EditorMode; form: TBForm } | null>(null);
  const [dupTarget, setDupTarget] = useState<{ id: number; date: string } | null>(null);

  const assignmentsByBlock = new Map<number, typeof assignments>();
  for (const a of assignments) {
    if (!assignmentsByBlock.has(a.timeblockId)) assignmentsByBlock.set(a.timeblockId, []);
    assignmentsByBlock.get(a.timeblockId)!.push(a);
  }
  const driverMap = new Map(drivers.map((d) => [d.id, d]));

  const byDate = new Map<string, typeof blocks>();
  for (const b of blocks) {
    const k = toISODate(b.blockDate);
    if (!byDate.has(k)) byDate.set(k, []);
    byDate.get(k)!.push(b);
  }
  const sortedDates = Array.from(byDate.keys()).sort();

  function openCreate(dateIso?: string) {
    const today = new Date();
    const fallbackIso = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, "0"), String(today.getDate()).padStart(2, "0")].join("-");
    setEditor({ mode: "create", form: EMPTY_FORM(dateIso ?? fallbackIso) });
  }
  function openEdit(b: any) {
    setEditor({
      mode: "edit",
      form: {
        id: b.id,
        blockDate: toISODate(b.blockDate),
        label: b.label ?? "",
        merchant: (b.merchant ?? "Flex") as any,
        bookingType: (b.bookingType ?? "Flex") as any,
        routeStart: b.routeStart ?? "",
        availabilityStart: b.availabilityStart ?? "06:00",
        availabilityEnd: b.availabilityEnd ?? "20:00",
        lafPickupTime: b.lafPickupTime ?? "",
        bcPickupTime: b.bcPickupTime ?? "",
        pickupDwell: Number(b.pickupDwell ?? 15),
        targetRoutes: Number(b.targetRoutes ?? 1),
        mileageRate: String(b.mileageRate ?? "0.670"),
        estRoutePay: String(b.estRoutePay ?? "0"),
        estDuration: Number(b.estDuration ?? 0),
        bonus: String(b.bonus ?? "0"),
        minPayFloor: String(b.minPayFloor ?? "150"),
        maxPayFloor: String(b.maxPayFloor ?? "250"),
        notes: b.notes ?? "",
      },
    });
  }

  function submitEditor() {
    if (!editor) return;
    const f = editor.form;
    const payload: any = {
      label: f.label || undefined,
      blockDate: f.blockDate,
      merchant: f.merchant,
      bookingType: f.bookingType,
      routeStart: f.routeStart || null,
      availabilityStart: f.availabilityStart,
      availabilityEnd: f.availabilityEnd,
      lafPickupTime: f.lafPickupTime || null,
      bcPickupTime: f.bcPickupTime || null,
      pickupDwell: f.pickupDwell,
      targetRoutes: f.targetRoutes,
      mileageRate: f.mileageRate,
      estRoutePay: f.estRoutePay,
      estDuration: f.estDuration,
      bonus: f.bonus,
      minPayFloor: f.minPayFloor,
      maxPayFloor: f.maxPayFloor,
      notes: f.notes || null,
    };
    if (editor.mode === "create") {
      createBlock.mutate(payload);
    } else if (f.id) {
      updateBlock.mutate({ id: f.id, ...payload });
      toast.success("Timeblock updated");
      setEditor(null);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-gradient-to-b from-muted/30 to-transparent">
        <div className="container py-8">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
            Schedule & operating defaults
          </span>
          <div className="flex items-start justify-between gap-4 mt-1">
            <div>
              <h1 className="page-title">Timeblocks</h1>
              <p className="page-subtitle max-w-3xl">
                Each timeblock defines a shift: route start, pickup window, pay defaults, and targeted route count.
                Flex blocks can carry mixed merchants; Direct blocks are single-merchant.
              </p>
            </div>
            <Button onClick={() => openCreate()} className="shrink-0">
              <Plus className="h-4 w-4 mr-1.5" /> New timeblock
            </Button>
          </div>
        </div>
      </div>

      <div className="container py-8 space-y-6">
        {sortedDates.length === 0 && (
          <Card className="border-dashed border-border/60 p-10 text-center">
            <p className="text-sm text-muted-foreground mb-4">No timeblocks yet.</p>
            <Button onClick={() => openCreate()} variant="outline">
              <Plus className="h-4 w-4 mr-1.5" /> Create your first timeblock
            </Button>
          </Card>
        )}
        {sortedDates.map((dateKey) => {
          const blocksOnDate = byDate.get(dateKey) ?? [];
          return (
            <Card key={dateKey} className="border-border/60 overflow-hidden">
              <div className="px-6 py-3 border-b border-border/60 bg-muted/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="font-serif text-lg">{fmtDate(dateKey)}</h2>
                  <span className="text-xs text-muted-foreground font-mono">{dateKey}</span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => openCreate(dateKey)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add block
                </Button>
              </div>
              <div className="divide-y divide-border/60">
                {blocksOnDate.map((b: any) => {
                  const blockAssignments = assignmentsByBlock.get(b.id) ?? [];
                  return (
                    <div key={b.id} className="px-6 py-4">
                      <div className="grid grid-cols-12 gap-4 items-start">
                        <div className="col-span-12 md:col-span-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={merchantBadgeClass(b.merchant ?? "Flex")}>
                              {b.merchant ?? "Flex"}
                            </Badge>
                            {b.bookingType === "Direct" && (
                              <Badge variant="outline" className="font-normal">Direct</Badge>
                            )}
                            {b.bookingType === "Flex" && (
                              <Badge variant="outline" className="font-normal">Flex</Badge>
                            )}
                          </div>
                          <div className="font-medium text-sm mt-1.5">{b.label}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            Start {b.routeStart ?? "—"} · Avail {b.availabilityStart}–{b.availabilityEnd}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Dwell {b.pickupDwell}m · Target {b.targetRoutes} rte · ${b.mileageRate}/mi
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
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Dur (min)</div>
                          <Input
                            className="h-8 font-mono text-sm border-transparent hover:border-border focus:border-ring"
                            type="number"
                            defaultValue={b.estDuration}
                            onBlur={(e) => updateBlock.mutate({ id: b.id, estDuration: parseInt(e.target.value) || 0 })}
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
                            Drivers ({blockAssignments.length})
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {blockAssignments.map((a) => {
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
                              <InlineEnumInput
                                value={selectedDriver[b.id] ?? ""}
                                options={drivers
                                  .filter((d) => !blockAssignments.some((a) => a.driverId === d.id))
                                  .map((d) => d.name)}
                                labelMap={Object.fromEntries(
                                  drivers.map((d) => [String(d.id), d.name]),
                                )}
                                placeholder="Type a driver name…"
                                onCommit={(v) => {
                                  if (!v.trim()) {
                                    setSelectedDriver((p) => ({ ...p, [b.id]: "" }));
                                    return;
                                  }
                                  const match = drivers.find(
                                    (d) => d.name.toLowerCase() === v.trim().toLowerCase(),
                                  );
                                  if (match) setSelectedDriver((p) => ({ ...p, [b.id]: String(match.id) }));
                                }}
                                className="h-6 w-[140px]"
                                ariaLabel="Driver to assign"
                              />
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
                      {b.notes && (
                        <div className="mt-3 text-[12px] text-muted-foreground italic">
                          Note: {b.notes}
                        </div>
                      )}
                      <div className="mt-3 flex gap-2 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(b)}>
                          <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setDupTarget({ id: b.id, date: dateKey })}>
                          <Copy className="h-3.5 w-3.5 mr-1" /> Duplicate
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm(`Delete timeblock "${b.label}"? This removes its routes and driver assignments.`)) {
                              deleteBlock.mutate({ id: b.id });
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Editor dialog */}
      <Dialog open={!!editor} onOpenChange={(o) => { if (!o) setEditor(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editor?.mode === "create" ? "New timeblock" : "Edit timeblock"}</DialogTitle>
          </DialogHeader>
          {editor && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Date">
                <Input type="date" value={editor.form.blockDate}
                  onChange={(e) => setEditor({ ...editor, form: { ...editor.form, blockDate: e.target.value } })} />
              </Field>
              <Field label="Label (optional)">
                <Input value={editor.form.label}
                  onChange={(e) => setEditor({ ...editor, form: { ...editor.form, label: e.target.value } })}
                  placeholder="Auto-generated if blank" />
              </Field>
              <Field label="Merchant">
                <InlineEnumInput
                  value={editor.form.merchant}
                  options={["Flex", "LAF", "BC", "SMC", "SMR"]}
                  onCommit={(v) => {
                    if (["Flex", "LAF", "BC", "SMC", "SMR"].includes(v))
                      setEditor({ ...editor, form: { ...editor.form, merchant: v as any } });
                  }}
                  className="h-9 w-full"
                  ariaLabel="Merchant"
                />
              </Field>
              <Field label="Booking type">
                <InlineEnumInput
                  value={editor.form.bookingType}
                  options={["Flex", "Direct"]}
                  onCommit={(v) => {
                    if (v === "Flex" || v === "Direct")
                      setEditor({ ...editor, form: { ...editor.form, bookingType: v as any } });
                  }}
                  className="h-9 w-full"
                  ariaLabel="Booking type"
                />
              </Field>
              <Field label="Route start">
                <Input type="time" value={editor.form.routeStart}
                  onChange={(e) => setEditor({ ...editor, form: { ...editor.form, routeStart: e.target.value } })} />
              </Field>
              <Field label="Target routes">
                <Input type="number" min={1} value={editor.form.targetRoutes}
                  onChange={(e) => setEditor({ ...editor, form: { ...editor.form, targetRoutes: parseInt(e.target.value) || 1 } })} />
              </Field>
              <Field label="Availability start">
                <Input type="time" value={editor.form.availabilityStart}
                  onChange={(e) => setEditor({ ...editor, form: { ...editor.form, availabilityStart: e.target.value } })} />
              </Field>
              <Field label="Availability end">
                <Input type="time" value={editor.form.availabilityEnd}
                  onChange={(e) => setEditor({ ...editor, form: { ...editor.form, availabilityEnd: e.target.value } })} />
              </Field>
              <Field label="LAF pickup">
                <Input type="time" value={editor.form.lafPickupTime}
                  onChange={(e) => setEditor({ ...editor, form: { ...editor.form, lafPickupTime: e.target.value } })} />
              </Field>
              <Field label="BC pickup">
                <Input type="time" value={editor.form.bcPickupTime}
                  onChange={(e) => setEditor({ ...editor, form: { ...editor.form, bcPickupTime: e.target.value } })} />
              </Field>
              <Field label="Pickup dwell (min)">
                <Input type="number" min={0} value={editor.form.pickupDwell}
                  onChange={(e) => setEditor({ ...editor, form: { ...editor.form, pickupDwell: parseInt(e.target.value) || 0 } })} />
              </Field>
              <Field label="Mileage rate ($/mi)">
                <Input value={editor.form.mileageRate}
                  onChange={(e) => setEditor({ ...editor, form: { ...editor.form, mileageRate: e.target.value } })} />
              </Field>
              <Field label="Min pay floor">
                <Input value={editor.form.minPayFloor}
                  onChange={(e) => setEditor({ ...editor, form: { ...editor.form, minPayFloor: e.target.value } })} />
              </Field>
              <Field label="Max pay floor">
                <Input value={editor.form.maxPayFloor}
                  onChange={(e) => setEditor({ ...editor, form: { ...editor.form, maxPayFloor: e.target.value } })} />
              </Field>
              <Field label="Est route pay">
                <Input value={editor.form.estRoutePay}
                  onChange={(e) => setEditor({ ...editor, form: { ...editor.form, estRoutePay: e.target.value } })} />
              </Field>
              <Field label="Bonus">
                <Input value={editor.form.bonus}
                  onChange={(e) => setEditor({ ...editor, form: { ...editor.form, bonus: e.target.value } })} />
              </Field>
              <Field label="Est duration (min)">
                <Input type="number" min={0} value={editor.form.estDuration}
                  onChange={(e) => setEditor({ ...editor, form: { ...editor.form, estDuration: parseInt(e.target.value) || 0 } })} />
              </Field>
              <Field label="Notes" full>
                <Input value={editor.form.notes}
                  onChange={(e) => setEditor({ ...editor, form: { ...editor.form, notes: e.target.value } })}
                  placeholder="Optional internal note" />
              </Field>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditor(null)}>Cancel</Button>
            <Button onClick={submitEditor} disabled={createBlock.isPending || updateBlock.isPending}>
              {editor?.mode === "create" ? "Create" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate dialog */}
      <Dialog open={!!dupTarget} onOpenChange={(o) => { if (!o) setDupTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Duplicate to date</DialogTitle>
          </DialogHeader>
          {dupTarget && (
            <div className="space-y-3">
              <Field label="New date">
                <Input type="date" value={dupTarget.date}
                  onChange={(e) => setDupTarget({ ...dupTarget, date: e.target.value })} />
              </Field>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDupTarget(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (dupTarget) {
                  duplicateBlock.mutate({ id: dupTarget.id, blockDate: dupTarget.date });
                  setDupTarget(null);
                }
              }}
            >Duplicate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
