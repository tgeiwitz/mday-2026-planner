// Wodely API v2 client
// Docs: POST https://api.wodely.com/v2/tasks/search
// Auth: Authorization: Basic {API_KEY}

const BASE = "https://api.wodely.com/v2";

// Merchant IDs confirmed for this org
export const LAF_MERCHANT_ID = "09cc8b76-6b54-4995-b136-a5dea3f0656a";
export const BC_MERCHANT_ID = "752c1bfd-bd9f-4545-a6b2-cabf7fafa2c4";

function authHeaders() {
  const key = process.env.WODELY_API_KEY;
  if (!key) throw new Error("WODELY_API_KEY env var is not set");
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Basic ${key}`,
  };
}

export async function testAuth(): Promise<{ success: boolean; message?: string }> {
  const res = await fetch(`${BASE}/auth/test`, {
    method: "GET",
    headers: authHeaders(),
  });
  if (!res.ok) {
    return { success: false, message: `HTTP ${res.status}` };
  }
  const json = (await res.json()) as { success: boolean; message?: string };
  return json;
}

export type WodelyTask = {
  id: number;
  guid: string;
  typeId: number;
  typeDesc: string;
  statusId: number;
  statusDesc: string;
  afterDateTime: string;
  beforeDateTime: string;
  deliveryFee: number;
  merchantId: string;
  merchantName: string;
  externalKey?: string;
  completedDateTime?: string;
  dispatchAddress?: string;
  destinationAddress?: string;
};

export async function searchTasks(params: {
  startDateTime: string; // ISO UTC
  endDateTime: string; // ISO UTC
  merchantId?: string;
  taskTypeId?: string; // default 1 (Delivery)
  taskStatusId?: string;
  limit?: number;
  lastId?: string;
}): Promise<{ success: boolean; lastId: string; data: WodelyTask[] }> {
  const body = {
    taskTypeId: "1",
    limit: 9000,
    ...params,
  };
  const res = await fetch(`${BASE}/tasks/search`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Wodely search failed (${res.status}): ${text}`);
  }
  return (await res.json()) as { success: boolean; lastId: string; data: WodelyTask[] };
}

/**
 * Fetch all LAF+BC delivery tasks whose afterDateTime (confirmed delivery date)
 * falls within the window. Handles pagination and merchant loops.
 */
export async function fetchConfirmedOrders(
  startIso: string,
  endIso: string
): Promise<WodelyTask[]> {
  const results: WodelyTask[] = [];
  for (const merchantId of [LAF_MERCHANT_ID, BC_MERCHANT_ID]) {
    let lastId: string | undefined = undefined;
    let safety = 0;
    do {
      const page: { success: boolean; lastId: string; data: WodelyTask[] } = await searchTasks({
        startDateTime: startIso,
        endDateTime: endIso,
        merchantId,
        taskTypeId: "1",
        limit: 9000,
        lastId,
      });
      results.push(...(page.data ?? []));
      lastId = page.lastId && page.lastId.length > 0 ? page.lastId : undefined;
      safety += 1;
    } while (lastId && safety < 20);
  }
  return results;
}

/**
 * Aggregate tasks to per-date per-merchant counts using afterDateTime.
 * Converts afterDateTime (UTC) to America/New_York date so it aligns with our day grid.
 */
export function aggregateByDate(tasks: WodelyTask[]) {
  const out: Record<string, { laf: number; bc: number }> = {};
  for (const t of tasks) {
    if (!t.afterDateTime) continue;
    // Convert UTC -> America/New_York date
    const d = new Date(t.afterDateTime);
    const localDate = d.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
    if (!out[localDate]) out[localDate] = { laf: 0, bc: 0 };
    if (t.merchantId === LAF_MERCHANT_ID) out[localDate].laf += 1;
    else if (t.merchantId === BC_MERCHANT_ID) out[localDate].bc += 1;
  }
  return out;
}
