import test from "node:test";
import assert from "node:assert/strict";
import { rankGroup, groupSchema, agreed, type GroupInput } from "../lib/group";
import type { QueryReceipt } from "../lib/types";
const input: GroupInput = {
  participants: [
    { id: "p1", seed: "cities", vetoes: [] },
    { id: "p2", seed: "arrival", vetoes: [] },
  ],
  strategy: "balanced",
  mode: "qloo",
  maxMinutes: 125,
};
const ids = { paterson: "a", columbus: "b", arrival: "c", paddington: "d" };
function receipt(order: string[]): QueryReceipt {
  return {
    id: "test",
    at: "2026-10-28",
    endpoint: "/test",
    parameters: {},
    elapsedMs: 1,
    resultCount: order.length,
    warnings: null,
    aggregateExplainability: null,
    results: order.map((entityId, i) => ({
      entityId,
      name: entityId,
      rank: i + 1,
      affinity: 0.5,
      explainability: null,
    })),
  };
}
test("balanced policy chooses compromise and never overrides veto", () => {
  const receipts = {
    p1: receipt(["a", "b", "c", "d"]),
    p2: receipt(["d", "b", "c", "a"]),
  };
  assert.equal(rankGroup(input, receipts, ids)[0].id, "columbus");
  const vetoed = {
    ...input,
    participants: [
      { ...input.participants[0], vetoes: ["columbus" as const] },
      input.participants[1],
    ],
  };
  assert.notEqual(rankGroup(vetoed, receipts, ids)[0].id, "columbus");
});
test("missing and single-result profiles remain unknown", () => {
  for (const r of [receipt([]), receipt(["a"])]) {
    const rows = rankGroup(input, { p1: r, p2: receipt(["a", "b"]) }, ids);
    assert.ok(rows.every((x) => x.floor === null));
  }
});
test("all vetoed and time-ineligible films are blocked", () => {
  const rows = rankGroup({ ...input, maxMinutes: 90 }, {}, ids);
  assert.ok(rows.every((x) => x.blocked.length));
});
test("agreement requires explicit acceptance from every participant", () => {
  assert.equal(agreed(["p1", "p2"], { p1: "accept" }), false);
  assert.equal(agreed(["p1", "p2"], { p1: "accept", p2: "another" }), false);
  assert.equal(agreed(["p1", "p2"], { p1: "accept", p2: "compromise" }), true);
});
test("public requests reject duplicate identities and arbitrary seeds", () => {
  assert.equal(
    groupSchema.safeParse({
      ...input,
      participants: [input.participants[0], input.participants[0]],
    }).success,
    false,
  );
  assert.equal(
    groupSchema.safeParse({
      ...input,
      participants: [
        { ...input.participants[0], seed: "arbitrary" },
        input.participants[1],
      ],
    }).success,
    false,
  );
});
