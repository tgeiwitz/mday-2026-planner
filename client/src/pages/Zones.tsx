import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function Zones() {
  const { data: zones = [], refetch } = trpc.zones.list.useQuery();
  const updateZone = trpc.zones.update.useMutation({
    onSuccess: () => {
      toast.success("Zone updated");
      refetch();
    },
  });

  const [edits, setEdits] = useState<Record<number, Record<string, string>>>({});

  useEffect(() => {
    const init: Record<number, Record<string, string>> = {};
    for (const z of zones) {
      init[z.id] = {
        travelTime2026: String(z.travelTime2026),
        distance2026: String(z.distance2026),
        lafFee2026: String(z.lafFee2026),
        bcFee2026: String(z.bcFee2026),
      };
    }
    setEdits(init);
  }, [zones.length]);

  const handleBlur = (id: number, field: string, value: string) => {
    updateZone.mutate({ id, [field]: value } as any);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-gradient-to-b from-muted/30 to-transparent">
        <div className="container py-8">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
            Historical Baseline
          </span>
          <h1 className="page-title mt-1">Zone Metrics</h1>
          <p className="page-subtitle max-w-3xl">
            Travel time, distance per stop, and task fees by zone. Seeded from May 5–12, 2025.
            The 2026 Assumption column is editable and flows through to route economics.
          </p>
        </div>
      </div>

      <div className="container py-8">
        <Card className="border-border/60 overflow-hidden">
          <div className="table-scroll">
            <table className="elegant-table">
              <thead>
                <tr>
                  <th rowSpan={2} className="align-bottom sticky-col">Zone</th>
                  <th colSpan={3} className="text-center border-r border-border/60">Travel Time (sec/task)</th>
                  <th colSpan={3} className="text-center border-r border-border/60">Distance (mi/stop)</th>
                  <th colSpan={3} className="text-center border-r border-border/60">LAF Task Fee</th>
                  <th colSpan={3} className="text-center">BC Task Fee</th>
                </tr>
                <tr>
                  <th className="!py-2 text-[10px]">Last Year</th>
                  <th className="!py-2 text-[10px]">60-Day</th>
                  <th className="!py-2 text-[10px] border-r border-border/60 bg-primary/5">2026</th>
                  <th className="!py-2 text-[10px]">Last Year</th>
                  <th className="!py-2 text-[10px]">60-Day</th>
                  <th className="!py-2 text-[10px] border-r border-border/60 bg-primary/5">2026</th>
                  <th className="!py-2 text-[10px]">Last Year</th>
                  <th className="!py-2 text-[10px]">60-Day</th>
                  <th className="!py-2 text-[10px] border-r border-border/60 bg-primary/5">2026</th>
                  <th className="!py-2 text-[10px]">Last Year</th>
                  <th className="!py-2 text-[10px]">60-Day</th>
                  <th className="!py-2 text-[10px] bg-primary/5">2026</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((z) => {
                  const e = edits[z.id] || {};
                  return (
                    <tr key={z.id}>
                      <td className="font-medium font-mono sticky-col">{z.zoneId}</td>
                      <td className="num-cell text-muted-foreground">{Number(z.travelTimeLastYear).toFixed(1)}</td>
                      <td className="num-cell text-muted-foreground">{Number(z.travelTime60Day).toFixed(1)}</td>
                      <td className="!py-1 !px-2 border-r border-border/60 bg-primary/5">
                        <Input
                          className="h-8 text-xs font-mono text-right border-transparent bg-transparent hover:border-border focus:border-ring"
                          value={e.travelTime2026 ?? ""}
                          onChange={(ev) =>
                            setEdits((p) => ({ ...p, [z.id]: { ...p[z.id], travelTime2026: ev.target.value } }))
                          }
                          onBlur={(ev) => handleBlur(z.id, "travelTime2026", ev.target.value)}
                        />
                      </td>
                      <td className="num-cell text-muted-foreground">{Number(z.distanceLastYear).toFixed(1)}</td>
                      <td className="num-cell text-muted-foreground">{Number(z.distance60Day).toFixed(1)}</td>
                      <td className="!py-1 !px-2 border-r border-border/60 bg-primary/5">
                        <Input
                          className="h-8 text-xs font-mono text-right border-transparent bg-transparent hover:border-border focus:border-ring"
                          value={e.distance2026 ?? ""}
                          onChange={(ev) =>
                            setEdits((p) => ({ ...p, [z.id]: { ...p[z.id], distance2026: ev.target.value } }))
                          }
                          onBlur={(ev) => handleBlur(z.id, "distance2026", ev.target.value)}
                        />
                      </td>
                      <td className="num-cell text-muted-foreground">${Number(z.lafFeeLastYear).toFixed(2)}</td>
                      <td className="num-cell text-muted-foreground">${Number(z.lafFee60Day).toFixed(2)}</td>
                      <td className="!py-1 !px-2 border-r border-border/60 bg-primary/5">
                        <Input
                          className="h-8 text-xs font-mono text-right border-transparent bg-transparent hover:border-border focus:border-ring"
                          value={e.lafFee2026 ?? ""}
                          onChange={(ev) =>
                            setEdits((p) => ({ ...p, [z.id]: { ...p[z.id], lafFee2026: ev.target.value } }))
                          }
                          onBlur={(ev) => handleBlur(z.id, "lafFee2026", ev.target.value)}
                        />
                      </td>
                      <td className="num-cell text-muted-foreground">${Number(z.bcFeeLastYear).toFixed(2)}</td>
                      <td className="num-cell text-muted-foreground">${Number(z.bcFee60Day).toFixed(2)}</td>
                      <td className="!py-1 !px-2 bg-primary/5">
                        <Input
                          className="h-8 text-xs font-mono text-right border-transparent bg-transparent hover:border-border focus:border-ring"
                          value={e.bcFee2026 ?? ""}
                          onChange={(ev) =>
                            setEdits((p) => ({ ...p, [z.id]: { ...p[z.id], bcFee2026: ev.target.value } }))
                          }
                          onBlur={(ev) => handleBlur(z.id, "bcFee2026", ev.target.value)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
