import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function DataIntegrityTile() {
  const { data, isLoading, refetch } = trpc.routes.integrity.useQuery(undefined, {
    refetchInterval: 30_000,
  });
  const recalculate = trpc.routes.recalculate.useMutation({
    onSuccess: (res) => {
      const repaired = res?.integrity?.routesWithStopsButNoZonesRepaired ?? 0;
      if (repaired > 0) {
        toast.success(`Repaired ${repaired} route${repaired === 1 ? "" : "s"} with missing zones`);
      } else {
        toast.success("Recalculate complete — all routes healthy");
      }
      refetch();
    },
  });

  if (isLoading || !data) {
    return (
      <Card className="border-border/60 mb-8">
        <CardContent className="py-4 text-sm text-muted-foreground">
          Checking data integrity…
        </CardContent>
      </Card>
    );
  }

  const allClean = data.missingZones === 0 && data.zeroFee === 0;

  return (
    <Card className={`border-border/60 mb-8 ${allClean ? "" : "border-amber-400/60 bg-amber-50/40"}`}>
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {allClean ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            )}
            <div>
              <div className="text-sm font-medium">
                {allClean
                  ? "All routes have a complete reforecast"
                  : "Some routes need attention before they reforecast correctly"}
              </div>
              <div className="text-xs text-muted-foreground mt-1 space-x-3">
                <span>
                  Missing zones: <strong className={data.missingZones > 0 ? "text-amber-700" : ""}>{data.missingZones}</strong>
                </span>
                <span>·</span>
                <span>
                  Zero fee: <strong className={data.zeroFee > 0 ? "text-amber-700" : ""}>{data.zeroFee}</strong>
                </span>
                <span>·</span>
                <span>
                  Duration fallback: <strong>{data.durationFallback}</strong>
                </span>
              </div>
              {data.offenders.length > 0 && (
                <div className="text-[11px] text-muted-foreground mt-1">
                  {data.offenders.slice(0, 5).map((o) => `${o.routeCode} (${o.reason})`).join(" · ")}
                  {data.offenders.length > 5 ? ` · +${data.offenders.length - 5} more` : ""}
                </div>
              )}
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={recalculate.isPending}
            onClick={() => recalculate.mutate()}
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${recalculate.isPending ? "animate-spin" : ""}`} />
            Recalculate
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
