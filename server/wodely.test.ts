import { describe, expect, it } from "vitest";
import { testAuth } from "./wodely";

describe("Wodely API auth", () => {
  it("validates API key via /auth/test", async () => {
    const result = await testAuth();
    expect(result.success).toBe(true);
  }, 15000);
});
