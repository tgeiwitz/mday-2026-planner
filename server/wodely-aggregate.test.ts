import { describe, it, expect } from "vitest";
import {
  aggregateByDate,
  isLiveTask,
  WODELY_STATUS_CANCELLED,
  LAF_MERCHANT_ID,
  BC_MERCHANT_ID,
  type WodelyTask,
} from "./wodely";

function task(over: Partial<WodelyTask>): WodelyTask {
  return {
    id: 1,
    guid: "g",
    typeId: 1,
    typeDesc: "Delivery",
    statusId: 10,
    statusDesc: "Created",
    afterDateTime: "2026-05-10T13:00:00Z",
    beforeDateTime: "2026-05-10T15:00:00Z",
    deliveryFee: 25,
    merchantId: LAF_MERCHANT_ID,
    merchantName: "LAF",
    ...over,
  };
}

describe("aggregateByDate", () => {
  it("buckets by afterDateTime in America/New_York", () => {
    // 2026-05-10T13:00Z = 09:00 EDT same day
    const t1 = task({ id: 1, afterDateTime: "2026-05-10T13:00:00Z" });
    // 2026-05-11T03:00Z = 23:00 EDT on 2026-05-10
    const t2 = task({ id: 2, afterDateTime: "2026-05-11T03:00:00Z" });
    // 2026-05-11T05:00Z = 01:00 EDT on 2026-05-11 (rolls over)
    const t3 = task({ id: 3, afterDateTime: "2026-05-11T05:00:00Z" });
    const out = aggregateByDate([t1, t2, t3]);
    expect(out["2026-05-10"]).toEqual({ laf: 2, bc: 0 });
    expect(out["2026-05-11"]).toEqual({ laf: 1, bc: 0 });
  });

  it("counts LAF and BC separately", () => {
    const out = aggregateByDate([
      task({ id: 1, merchantId: LAF_MERCHANT_ID }),
      task({ id: 2, merchantId: BC_MERCHANT_ID }),
      task({ id: 3, merchantId: BC_MERCHANT_ID }),
    ]);
    expect(out["2026-05-10"]).toEqual({ laf: 1, bc: 2 });
  });

  it("excludes cancelled tasks (statusId=50) — v46 fix", () => {
    const out = aggregateByDate([
      task({ id: 1, statusId: 10 }),
      task({ id: 2, statusId: WODELY_STATUS_CANCELLED }),
      task({ id: 3, statusId: 30 }),
    ]);
    expect(out["2026-05-10"]).toEqual({ laf: 2, bc: 0 });
  });

  it("ignores tasks with no afterDateTime", () => {
    const out = aggregateByDate([
      task({ id: 1, afterDateTime: "" as unknown as string }),
      task({ id: 2 }),
    ]);
    expect(out["2026-05-10"]).toEqual({ laf: 1, bc: 0 });
  });

  it("ignores unknown merchantIds (does not silently bucket as BC)", () => {
    const out = aggregateByDate([
      task({ id: 1, merchantId: "00000000-0000-0000-0000-000000000000" }),
      task({ id: 2, merchantId: LAF_MERCHANT_ID }),
    ]);
    expect(out["2026-05-10"]).toEqual({ laf: 1, bc: 0 });
  });
});

describe("isLiveTask", () => {
  it("treats cancelled tasks as not-live", () => {
    expect(isLiveTask({ statusId: WODELY_STATUS_CANCELLED })).toBe(false);
    expect(isLiveTask({ statusId: 10 })).toBe(true);
    expect(isLiveTask({ statusId: 50 })).toBe(false);
  });
});
