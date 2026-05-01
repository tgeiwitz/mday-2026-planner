import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, AlertCircle, Calendar } from "lucide-react";
import { toast } from "sonner";

function fmtDate(iso: string) {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function tbDateIso(blockDate: any): string {
  if (blockDate instanceof Date) {
    return `${blockDate.getUTCFullYear()}-${String(blockDate.getUTCMonth() + 1).padStart(2, "0")}-${String(blockDate.getUTCDate()).padStart(2, "0")}`;
  }
  return String(blockDate).slice(0, 10);
}

export default function DriverSignup() {
  const { data: drivers = [], isLoading: driversLoading } =
    trpc.driverSignup.drivers.useQuery();
  const { data: timeblocks = [], isLoading: tbLoading } =
    trpc.driverSignup.timeblocks.useQuery();
  const { data: assignments = [], refetch: refetchAssignments } =
    trpc.driverSignup.listAssignments.useQuery();

  const [driverId, setDriverId] = useState<string>("");
  const [selectedTbIds, setSelectedTbIds] = useState<Set<number>>(new Set());
  const [notes, setNotes] = useState("");
  const [submittedTbIds, setSubmittedTbIds] = useState<Set<number>>(new Set());

  const create = trpc.driverSignup.create.useMutation();

  const myAssignments = useMemo(() => {
    if (!driverId) return new Set<number>();
    const did = parseInt(driverId, 10);
    return new Set(
      (assignments ?? [])
        .filter((a: any) => a.driverId === did)
        .map((a: any) => a.timeblockId as number),
    );
  }, [assignments, driverId]);

  const groupedTimeblocks = useMemo(() => {
    const groups = new Map<string, any[]>();
    for (const tb of timeblocks ?? []) {
      const iso = tbDateIso((tb as any).blockDate);
      if (!groups.has(iso)) groups.set(iso, []);
      groups.get(iso)!.push(tb);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [timeblocks]);

  function toggleTb(id: number, alreadyTaken: boolean) {
    if (alreadyTaken) return;
    setSelectedTbIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit() {
    if (!driverId) {
      toast.error("Please select your name first");
      return;
    }
    if (selectedTbIds.size === 0) {
      toast.error("Please select at least one timeblock");
      return;
    }
    const did = parseInt(driverId, 10);
    const ids = Array.from(selectedTbIds);
    let success = 0;
    for (const tbId of ids) {
      try {
        await create.mutateAsync({
          driverId: did,
          timeblockId: tbId,
          notes: notes.trim() || undefined,
        });
        success += 1;
        setSubmittedTbIds((p) => new Set(p).add(tbId));
      } catch (err: any) {
        toast.error(`${tbId}: ${err.message ?? "failed"}`);
      }
    }
    if (success > 0) {
      toast.success(
        `Signed up for ${success} timeblock(s). Dispatch has been notified.`,
      );
      setSelectedTbIds(new Set());
      setNotes("");
      refetchAssignments();
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-gradient-to-b from-muted/30 to-transparent">
        <div className="container py-8 max-w-3xl">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
            Local Delivery Group · Driver Sign-Up
          </span>
          <h1 className="page-title mt-1">Mother's Day 2026 — sign up</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl">
            Pick the timeblocks you can drive. Sign-ups are <b>one-way</b>:
            once you commit, dispatch will plan around you. If you need to
            cancel, message dispatch directly.
          </p>
        </div>
      </div>

      <div className="container max-w-3xl py-8 space-y-6">
        <Card className="p-5">
          <label className="text-sm font-medium block mb-2">Your name</label>
          {driversLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : (
            <Select value={driverId} onValueChange={setDriverId}>
              <SelectTrigger className="w-full max-w-sm">
                <SelectValue placeholder="Select your name" />
              </SelectTrigger>
              <SelectContent>
                {drivers.map((d: any) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.name} ({d.driverType})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            Don't see your name? Text dispatch and we'll add you.
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-medium">Available timeblocks (M-Day week)</h2>
          </div>

          {tbLoading && (
            <div className="text-sm text-muted-foreground">Loading…</div>
          )}
          {!tbLoading && groupedTimeblocks.length === 0 && (
            <div className="text-sm text-muted-foreground">
              No timeblocks open for sign-up yet. Check back shortly.
            </div>
          )}

          <div className="space-y-4">
            {groupedTimeblocks.map(([iso, blocks]) => (
              <div key={iso}>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  {fmtDate(iso)}
                </div>
                <div className="grid gap-2">
                  {blocks.map((tb: any) => {
                    const alreadyMine =
                      myAssignments.has(tb.id) || submittedTbIds.has(tb.id);
                    const selected = selectedTbIds.has(tb.id);
                    return (
                      <button
                        type="button"
                        key={tb.id}
                        onClick={() => toggleTb(tb.id, alreadyMine)}
                        disabled={alreadyMine}
                        className={[
                          "w-full text-left rounded-md border px-4 py-3 transition-colors",
                          alreadyMine
                            ? "bg-emerald-50 border-emerald-200 cursor-default"
                            : selected
                              ? "bg-primary/10 border-primary"
                              : "bg-background border-border hover:bg-muted/40",
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-medium">{tb.label}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {tb.availabilityStart}–{tb.availabilityEnd}
                              {tb.routeStart ? ` · roll-out ${tb.routeStart}` : ""}
                              {" · "}
                              {tb.merchant}
                              {tb.bookingType ? ` · ${tb.bookingType}` : ""}
                            </div>
                          </div>
                          {alreadyMine ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Signed up
                            </Badge>
                          ) : selected ? (
                            <Badge className="bg-primary text-primary-foreground">
                              Selected
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              tap to select
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <label className="text-sm font-medium block mb-2">
            Notes for dispatch (optional)
          </label>
          <Textarea
            rows={3}
            placeholder='e.g. "need to be done by 4", "not using my van", "prefer LAF"'
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-2">
            These notes go to all the timeblocks you submit in this batch.
          </p>
        </Card>

        <div className="flex items-center gap-3">
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={
              create.isPending || !driverId || selectedTbIds.size === 0
            }
          >
            {create.isPending
              ? "Submitting…"
              : `Confirm ${selectedTbIds.size || ""} timeblock${selectedTbIds.size === 1 ? "" : "s"}`.trim()}
          </Button>
          {selectedTbIds.size > 0 && (
            <span className="text-sm text-muted-foreground">
              Sign-ups are one-way. Once submitted, contact dispatch to cancel.
            </span>
          )}
        </div>

        <Card className="p-4 border-amber-300/60 bg-amber-50/50 text-amber-900 text-sm flex gap-2 items-start">
          <AlertCircle className="h-4 w-4 mt-0.5" />
          <span>
            By submitting, you commit to driving these blocks. Dispatch will
            assign your routes within the next 24 hours.
          </span>
        </Card>
      </div>
    </div>
  );
}
