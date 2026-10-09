import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPairs,
  rankPairs,
  relativeRank,
  schedule,
} from "../lib/optimizer";
import { sampleBrief, sampleCatalog } from "../lib/sample";
import { planRequestSchema, type PlanRequest } from "../lib/types";
const input = (overrides: Partial<PlanRequest> = {}): PlanRequest => ({
  brief: { ...sampleBrief },
  catalog: sampleCatalog.map((i) => ({ ...i })),
  mode: "rehearsal",
  excludedPairs: [],
  feedback: "",
  ...overrides,
});
test("every eligible combination satisfies budget, time, stock and staffing simultaneously", () => {
  for (let budget = 0; budget < 500; budget += 37)
    for (let duration = 45; duration < 230; duration += 19) {
      const data = input({
        brief: { ...sampleBrief, budget, slotMinutes: duration },
      });
      for (const p of buildPairs(data).filter((p) => p.eligible)) {
        assert.ok(p.cost <= budget);
        assert.ok(p.duration <= duration);
        assert.ok(p.book.stock >= data.brief.minimumCopies);
        assert.ok(p.checks.every((c) => c.pass));
      }
    }
});
test("staffing loss cannot silently permit a cinema host", () => {
  const pairs = buildPairs(
    input({
      brief: { ...sampleBrief, bookshopStaff: false, allowCinemaHost: false },
    }),
  );
  assert.equal(pairs.filter((p) => p.eligible).length, 0);
  assert.ok(
    pairs.every((p) => p.checks.some((c) => c.label === "Hosting" && !c.pass)),
  );
});
test("permitted host replacement includes its cost and may invalidate the budget", () => {
  const before = buildPairs(input()).find((p) => p.id === "film-3::book-3")!;
  const after = buildPairs(
    input({
      brief: { ...sampleBrief, bookshopStaff: false, budget: before.cost },
    }),
  ).find((p) => p.id === before.id)!;
  assert.equal(after.cost, before.cost + sampleBrief.cinemaHostCost);
  assert.equal(after.eligible, false);
});
test("rejected pair cannot reappear as eligible", () => {
  const id = "film-3::book-3";
  assert.equal(
    buildPairs(input({ excludedPairs: [id] })).find((p) => p.id === id)
      ?.eligible,
    false,
  );
});
test("live mode requires both facts verification and resolved entities", () => {
  assert.equal(
    buildPairs(input({ mode: "qloo" })).filter((p) => p.eligible).length,
    0,
  );
  const data = input({ mode: "qloo" });
  data.catalog = data.catalog.map((i) => ({
    ...i,
    verified: true,
    entityId: `test-${i.id}`,
  }));
  assert.ok(buildPairs(data).some((p) => p.eligible));
});
test("baseline and Qloo share operational checks when identities are present", () => {
  const data = input();
  data.catalog = data.catalog.map((i) => ({
    ...i,
    verified: true,
    entityId: `test-${i.id}`,
  }));
  assert.deepEqual(
    buildPairs({ ...data, mode: "qloo" })
      .filter((p) => p.eligible)
      .map((p) => p.id),
    buildPairs({ ...data, mode: "baseline" })
      .filter((p) => p.eligible)
      .map((p) => p.id),
  );
});
test("single returned candidate provides no comparative rank advantage", () => {
  assert.equal(relativeRank(1, 1), 0);
  assert.equal(relativeRank(1, 4), 1);
  assert.equal(relativeRank(4, 4), 0);
});
test("rehearsal order is deterministic supplied cost, not fictional affinity", () => {
  const ranked = rankPairs(buildPairs(input()).filter((p) => p.eligible));
  assert.equal(ranked[0].id, "film-3::book-3");
  assert.ok(ranked.every((p) => p.evidence.length === 0));
});
test("schedule reserves welcome and transition and marks next day", () => {
  const pair = buildPairs(input())[0];
  const rows = schedule({ ...sampleBrief, startTime: "23:30" }, pair);
  assert.equal(rows[1].time, "23:40");
  assert.match(rows[4].time, /\(\+1 day\)/);
  assert.equal(
    pair.duration,
    pair.film.runtime + sampleBrief.discussionMinutes + 15,
  );
});
test("request rejects negative costs, oversized catalogs and duplicate IDs", () => {
  const bad = input();
  bad.catalog[0].cost = -1;
  assert.equal(planRequestSchema.safeParse(bad).success, false);
  const dupe = input();
  dupe.catalog[1].id = dupe.catalog[0].id;
  assert.equal(planRequestSchema.safeParse(dupe).success, false);
  assert.equal(
    planRequestSchema.safeParse({
      ...input(),
      catalog: Array.from({ length: 17 }, (_, i) => ({
        ...sampleCatalog[0],
        id: String(i),
      })),
    }).success,
    false,
  );
});
