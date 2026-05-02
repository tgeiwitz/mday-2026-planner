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
import { InlineEnumInput } from "@/components/InlineEnumInput";
import { trpc } from "@/lib/trpc";
import { Plus, Pencil, Copy, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

import { dayName, fmtDate, fmtDateShort, mondayOf, addDays, toISODate } from "@/lib/date";

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
  const { data: routes = [] } = trpc.routes.list.useQuery();

  const invalidate = () => { refetchBlocks(); };

  const createBlock = trpc.timeblocks.create.useMutation({
    onSuccess: () => { invalidate(); toast.success("Timeblock created"); setEditor(null); },
    onError: (e) => toast.error(e.message),
  });
  const autoCreateWeek = trpc.timeblocks.autoCreateWeek.useMutation({
    onSuccess: (r: any) => {
      invalidate();
      toast.success(`Created ${r.created} · skipped ${r.skipped}`);
    },
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

  const [editor, setEditor] = useState<{ mode: EditorMode; form: TBForm } | null>(null);
  const [dupTarget, setDupTarget] = useState<{ id: number; date: string } | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  // Live route counts per timeblock
  const routeCountByBlock = useMemo(() => {
    const m = new Map<number, number>();
    for (const r of routes as any[]) {
      m.set(r.timeblockId, (m.get(r.timeblockId) ?? 0) + 1);
    }
    return m;
  }, [routes]);

  // Group blocks by week (Monday) -> by date
  const grouped = useMemo(() => {
    const out = new Map<string, { weekOf: string; blocks: any[] }>();
    for (const b of blocks as any[]) {
      const iso = toISODate(b.blockDate);
      const wk = mondayOf(iso);
      if (!out.has(wk)) out.set(wk, { weekOf: wk, blocks: [] });
      out.get(wk)!.blocks.push(b);
    }
    // Sort each week's blocks by date asc, then by start time
    for (const v of Array.from(out.values())) {
      v.blocks.sort((a: any, b: any) => {
        const ad = toISODate(a.blockDate);
        const bd = toISODate(b.blockDate);
        if (ad !== bd) return ad < bd ? -1 : 1;
        return (a.routeStart ?? "").localeCompare(b.routeStart ?? "");
      });
    }
    return Array.from(out.values()).sort((a, b) => (a.weekOf < b.weekOf ? -1 : 1));
  }, [blocks]);

  function toggle(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openCreate(dateIso?: string) {
    const today = new Date();
    const fallbackIso = toISODate(today);
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
        <div className="container py-6">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
            Schedule & operating defaults
          </span>
          <div className="flex items-start justify-between gap-4 mt-1">
            <div>
              <h1 className="page-title">Timeblocks</h1>
              <p className="page-subtitle max-w-3xl">
                One row per block. Click a row to expand the editor. Driver sign-ups happen on the public sign-up page.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button onClick={() => openCreate()} className="bg-primary text-primary-foreground">
                <Plus className="h-4 w-4 mr-1.5" /> New Timeblock
              </Button>
              <AutoCreateWeekButton onCreate={(weekOf) => autoCreateWeek.mutate({ weekOf })} pending={autoCreateWeek.isPending} />
            </div>
          </div>
        </div>
      </div>

      <div className="container py-6 space-y-8">
        {grouped.length === 0 && (
          <Card className="border-dashed border-border/60 p-10 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              No timeblocks yet. Use Auto-Create Week to populate a Mon–Sun template.
            </p>
            <Button onClick={() => openCreate()} variant="outline">
              <Plus className="h-4 w-4 mr-1.5" /> Add a single timeblock
            </Button>
          </Card>
        )}

        {grouped.map((week) => {
          const totalTarget = week.blocks.reduce((s: number, b: any) => s + Number(b.targetRoutes ?? 0), 0);
          const totalBuilt = week.blocks.reduce((s: number, b: any) => s + (routeCountByBlock.get(b.id) ?? 0), 0);
          const sun = addDays(week.weekOf, 6);
          return (
            <div key={week.weekOf}>
              <div className="flex items-baseline justify-between mb-2 px-1">
                <h2 className="font-serif text-base">
                  Week of {fmtDateShort(week.weekOf)} – {fmtDateShort(sun)}
                </h2>
                <div className="text-xs text-muted-foreground">
                  {week.blocks.length} blocks · {totalBuilt}/{totalTarget} routes
                </div>
              </div>
              <Card className="border-border/60 overflow-hidden">
                <div className="divide-y divide-border/60">
                  {week.blocks.map((b: any) => {
                    const isOpen = expanded.has(b.id);
                    const built = routeCountByBlock.get(b.id) ?? 0;
                    const target = Number(b.targetRoutes ?? 0);
                    const ratioColor =
                      built >= target
                        ? "text-emerald-700"
                        : built >= target * 0.5
                        ? "text-amber-700"
                        : "text-muted-foreground";
                    const merchant = b.merchant ?? "Flex";
                    const pickup = merchant === "LAF" ? b.lafPickupTime : merchant === "BC" ? b.bcPickupTime : (b.lafPickupTime || b.bcPickupTime);
                    return (
                      <div key={b.id}>
                        {/* Collapsed row */}
                        <button
                          type="button"
                          className="w-full text-left px-4 py-2 hover:bg-muted/30 transition flex items-center gap-3 text-sm"
                          onClick={() => toggle(b.id)}
                        >
                          {isOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                          <div className="w-[88px] shrink-0">
                            <div className="font-medium">{dayName(b.blockDate)} {fmtDateShort(b.blockDate)}</div>
                          </div>
                          <Badge className={`${merchantBadgeClass(merchant)} shrink-0`}>{merchant}</Badge>
                          <div className="w-[64px] shrink-0 font-mono text-xs">
                            {b.routeStart ?? "—"}
                          </div>
                          <div className="hidden md:block w-[64px] shrink-0 font-mono text-xs text-muted-foreground">
                            {pickup ?? "—"}
                          </div>
                          <div className={`w-[88px] shrink-0 font-mono text-xs ${ratioColor}`}>
                            {built}/{target} routes
                          </div>
                          <div className="hidden md:block flex-1 text-xs text-muted-foreground truncate">
                            ${b.minPayFloor}–${b.maxPayFloor} · {b.estDuration}m · ${b.mileageRate}/mi
                          </div>
                          <div className="hidden md:block flex-1 text-xs text-muted-foreground truncate">
                            {b.label}
                          </div>
                        </button>

                        {/* Expanded editor */}
                        {isOpen && (
                          <div className="px-6 py-4 bg-muted/10 border-t border-border/60">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                              <Mini label="Route start" value={b.routeStart ?? "—"} />
                              <Mini label="LAF pickup" value={b.lafPickupTime ?? "—"} />
                              <Mini label="BC pickup" value={b.bcPickupTime ?? "—"} />
                              <Mini label="Avail" value={`${b.availabilityStart}–${b.availabilityEnd}`} />
                              <Mini label="Pickup dwell" value={`${b.pickupDwell} min`} />
                              <Mini label="Target routes" value={`${target}`} />
                              <Mini label="Routes built" value={`${built}`} />
                              <Mini label="Mileage rate" value={`$${b.mileageRate}/mi`} />
                              <Mini label="Est duration" value={`${b.estDuration} min`} />
                              <Mini label="Est route pay" value={`$${b.estRoutePay}`} />
                              <Mini label="Bonus" value={`$${b.bonus}`} />
                              <Mini label="Pay floor" value={`$${b.minPayFloor}–$${b.maxPayFloor}`} />
                            </div>
                            {b.notes && (
                              <div className="text-[12px] text-muted-foreground italic mb-3">
                                Note: {b.notes}
                              </div>
                            )}
                            <div className="flex gap-2 justify-end">
                              <Button size="sm" variant="outline" onClick={() => openEdit(b)}>
                                <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setDupTarget({ id: b.id, date: toISODate(b.blockDate) })}>
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
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
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
            <div className="grid grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto pr-1">
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
              <Field label="Internal Notes (dispatch only)" full>
                <textarea
                  className="w-full min-h-[60px] rounded-md border border-input bg-background p-2 text-sm focus:border-ring outline-none"
                  value={editor.form.notes}
                  onChange={(e) => setEditor({ ...editor, form: { ...editor.form, notes: e.target.value } })}
                  placeholder="Notes for dispatch only — staffing, special handoffs, vehicle requirements, etc. Does not affect any math."
                />
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

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-mono mt-0.5">{value}</div>
    </div>
  );
}

function AutoCreateWeekButton({ onCreate, pending }: { onCreate: (weekOf: string) => void; pending: boolean }) {
  function mondayOfOffset(weekOffset: number): string {
    const today = new Date();
    const day = today.getDay();
    const diff = (day === 0 ? -6 : 1 - day) + weekOffset * 7;
    const d = new Date(today);
    d.setDate(today.getDate() + diff);
    return toISODate(d);
  }
  const presets = [
    { label: "This week", weekOf: mondayOfOffset(0) },
    { label: "Next week (driver schedule)", weekOf: mondayOfOffset(1) },
    { label: "+2 weeks (sign-up open)", weekOf: mondayOfOffset(2) },
    { label: "+3 weeks (planning)", weekOf: mondayOfOffset(3) },
  ];
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button variant="outline" disabled={pending} onClick={() => setOpen((o) => !o)}>
        <Plus className="h-4 w-4 mr-1.5" /> Auto-Create Week
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-background border border-border rounded-md shadow-lg w-[260px]">
          {presets.map((p) => (
            <button
              key={p.weekOf}
              className="w-full text-left text-sm px-3 py-2 hover:bg-muted flex items-center justify-between"
              onClick={() => {
                onCreate(p.weekOf);
                setOpen(false);
              }}
            >
              <span>{p.label}</span>
              <span className="text-[11px] font-mono text-muted-foreground">{p.weekOf}</span>
            </button>
          ))}
          <div className="border-t border-border p-2">
            <input
              type="date"
              className="w-full text-sm h-8 px-2 border border-border rounded bg-background"
              onChange={(e) => {
                if (e.target.value) {
                  onCreate(e.target.value);
                  setOpen(false);
                }
              }}
            />
            <p className="text-[10px] text-muted-foreground mt-1">Pick any Monday for a custom week.</p>
          </div>
        </div>
      )}
    </div>
  );
}
