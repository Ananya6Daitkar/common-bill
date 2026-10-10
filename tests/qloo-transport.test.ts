import test from "node:test";
import assert from "node:assert/strict";
import { qlooGet } from "../lib/qloo";

test("Qloo uses edge-compatible redirects and refuses redirect responses", async () => {
  const originalFetch = globalThis.fetch;
  const previousKey = process.env.QLOO_API_KEY;
  process.env.QLOO_API_KEY = "test-only-key";
  let calls = 0;
  globalThis.fetch = async (_url, options) => {
    calls++;
    assert.equal(options?.redirect, "manual");
    return new Response(null, { status: 302, headers: { location: "https://example.com" } });
  };
  try {
    await assert.rejects(qlooGet("/search", { query: "Paterson" }), /HTTP 302/);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousKey === undefined) delete process.env.QLOO_API_KEY;
    else process.env.QLOO_API_KEY = previousKey;
  }
});
