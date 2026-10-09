import test from "node:test";
import assert from "node:assert/strict";
import { createPlan } from "../lib/planner";
import { sampleBrief, sampleCatalog } from "../lib/sample";
import { extractEntities } from "../lib/qloo";
import type { PlanRequest } from "../lib/types";
const input: PlanRequest = {
  brief: sampleBrief,
  catalog: sampleCatalog,
  mode: "rehearsal",
  excludedPairs: [],
  feedback: "",
};
test("rehearsal makes zero vendor requests and never fabricates evidence", async () => {
  const original = global.fetch;
  global.fetch = async () => {
    throw Error("No network calls allowed in rehearsal");
  };
  try {
    const p = await createPlan(input);
    assert.ok(p.selected);
    assert.equal(p.receipts.length, 0);
    assert.equal(p.llmUsed, false);
    assert.match(p.warnings.join(" "), /illustrative/);
    assert.match(p.editorialRationale, /no cultural-fit claim/);
  } finally {
    global.fetch = original;
  }
});
test("impossible brief stops with actionable blockers", async () => {
  const p = await createPlan({
    ...input,
    brief: { ...sampleBrief, budget: 1 },
  });
  assert.equal(p.selected, null);
  assert.equal(p.steps.at(-1)?.kind, "stop");
  assert.match(p.editorialRationale, /Event budget/);
});
test("repair honors a rejection and produces a different feasible pair", async () => {
  const first = await createPlan(input);
  const second = await createPlan({
    ...input,
    excludedPairs: [first.selected!.id],
    feedback: "We have already done this pairing.",
  });
  assert.notEqual(second.selected?.id, first.selected?.id);
  assert.ok(second.selected?.checks.every((c) => c.pass));
  assert.notEqual(second.inputFingerprint, first.inputFingerprint);
});
test("recognized Qloo envelopes are parsed and unknown envelopes fail closed", () => {
  assert.deepEqual(
    extractEntities({ results: { entities: [{ entity_id: "fixture-1" }] } }),
    [{ entity_id: "fixture-1" }],
  );
  assert.deepEqual(extractEntities({ results: [] }), []);
  assert.throws(() => extractEntities({ unexpected: [] }));
});
test("baseline never substitutes rehearsal when no LLM exists", async () => {
  const original = process.env.LLM_API_KEY;
  delete process.env.LLM_API_KEY;
  try {
    await assert.rejects(
      createPlan({
        ...input,
        mode: "baseline",
        catalog: sampleCatalog.map((i) => ({ ...i, verified: true })),
      }),
      /requires a configured language model/,
    );
  } finally {
    if (original) process.env.LLM_API_KEY = original;
  }
});
