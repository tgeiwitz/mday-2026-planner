import * as db from "../server/db";
const integ = await db.recalculateAllRoutes({ triggeredBy: "smoke" });
console.log("integrity:", JSON.stringify(integ, null, 2));
