import { describe, it, expect } from "vitest";
import { getWodelyConfirmedSummary } from "./db";

describe("getWodelyConfirmedSummary", () => {
  it("returns a stable shape with byRouteName and byDateMerchant maps", async () => {
    const summary = await getWodelyConfirmedSummary();
    expect(summary).toBeTruthy();
    expect(typeof summary.byRouteName).toBe("object");
    expect(typeof summary.byDateMerchant).toBe("object");
    // Every byDateMerchant value must have total = withRoute + withoutRoute
    for (const [k, v] of Object.entries(summary.byDateMerchant)) {
      expect(v.total).toBe(v.withRoute + v.withoutRoute);
      expect(v.total).toBeGreaterThanOrEqual(0);
      // Key is "YYYY-MM-DD|MERCHANT"
      expect(k).toMatch(/^\d{4}-\d{2}-\d{2}\|(LAF|BC|SMC|SMR)$/);
    }
    // routeName keys are lowercase
    for (const k of Object.keys(summary.byRouteName)) {
      expect(k).toBe(k.toLowerCase());
      expect(summary.byRouteName[k]).toBeGreaterThan(0);
    }
  });
});
