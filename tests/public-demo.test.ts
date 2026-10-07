import test from "node:test";
import assert from "node:assert/strict";
import { demoRequestSchema } from "../lib/demo";
import { assertSameOrigin } from "../lib/http";
import { createPlan } from "../lib/planner";
import { sampleBrief, sampleCatalog } from "../lib/sample";
import { planRequestSchema } from "../lib/types";

test("public demo accepts only bounded scenarios, never arbitrary prompts or entity IDs", () => {
  assert.equal(
    demoRequestSchema.safeParse({ scenario: "initial", mode: "qloo" }).success,
    true,
  );
  for (const input of [
    { scenario: "initial", prompt: "unbounded" },
    { scenario: "reject", excludedPair: "unknown" },
    { scenario: "reject" },
    { scenario: "initial", catalog: sampleCatalog },
  ])
    assert.equal(demoRequestSchema.safeParse(input).success, false);
});
test("same-origin checks accept the actual host behind Next and reject other origins", () => {
  assert.doesNotThrow(() =>
    assertSameOrigin(
      new Request("http://localhost:3000/api/demo", {
        headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" },
      }),
    ),
  );
  assert.throws(
    () =>
      assertSameOrigin(
        new Request("https://common.example/api/demo", {
          headers: {
            host: "common.example",
            origin: "https://attacker.example",
          },
        }),
      ),
    /Cross-origin/,
  );
});
test("public input cannot enable illustrative verification bypass on the private planner", async () => {
  const input = planRequestSchema.parse({
    brief: sampleBrief,
    catalog: sampleCatalog,
    mode: "qloo",
    illustrative: true,
  });
  const result = await createPlan(input);
  assert.equal(result.selected, null);
  assert.equal(result.illustrative, false);
  assert.ok(
    result.rejected.some((p) =>
      p.checks.some((c) => c.label === "Verified inputs" && !c.pass),
    ),
  );
});
