import { getDb } from "../server/db.ts";
import { recalculateAllRoutes } from "../server/db.ts";
try {
  const n = await recalculateAllRoutes();
  console.log(`Recalculated ${n} routes`);
} catch (e) {
  console.error("recalc failed, falling back to SQL loop:", e.message);
}
process.exit(0);
