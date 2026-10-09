import test from "node:test";
import assert from "node:assert/strict";
import { createPlan } from "../lib/planner";
import { comparePlans } from "../lib/revision";
import { sampleBrief, sampleCatalog } from "../lib/sample";
import type { PlanRequest } from "../lib/types";
const input: PlanRequest = {
  brief: sampleBrief,
  catalog: sampleCatalog,
  mode: "rehearsal",
  excludedPairs: [],
  feedback: "",
};
test("staff repair shows preserved works, new host and actual added cost", async () => {
  const before = await createPlan(input);
  const after = await createPlan({
    ...input,
    brief: { ...sampleBrief, bookshopStaff: false },
  });
  const delta = comparePlans(before, after);
  assert.ok(delta.preserved.includes("Film"));
  assert.ok(delta.preserved.includes("Book"));
  assert.ok(
    delta.changes.some(
      (c) =>
        c.label === "Discussion host" &&
        c.before === "bookshop" &&
        c.after === "cinema",
    ),
  );
  assert.ok(
    delta.changes.some(
      (c) =>
        c.label === "Supplied event cost" &&
        c.before === "165 GBP" &&
        c.after === "210 GBP",
    ),
  );
  assert.ok(delta.preserved.includes("Budget ceiling"));
});
test("failed repair explicitly shows loss of selection rather than preserving a misleading plan", async () => {
  const before = await createPlan(input),
    after = await createPlan({
      ...input,
      brief: { ...sampleBrief, bookshopStaff: false, allowCinemaHost: false },
    });
  const delta = comparePlans(before, after);
  assert.ok(
    delta.changes.some((c) => c.label === "Film" && c.after === "No selection"),
  );
});
