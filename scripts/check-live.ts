import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { runDemo } from "../lib/demo";
async function main() {
  const records: object[] = [];
  const start = Date.now();
  console.log("Checking first scenario...");
  const first = await runDemo({ scenario: "initial", mode: "qloo" });
  assert.ok(first.plan.selected, "Initial plan must select a pair");
  assert.equal(first.plan.selected.evidence.length, 2);
  assert.ok(first.plan.llmUsed);
  assert.ok(first.plan.selected.checks.every((c) => c.pass));
  await new Promise(resolve => setTimeout(resolve, 61000));
  console.log("Checking staff scenario...");
  const staff = await runDemo({ scenario: "staff", mode: "qloo" });
  assert.ok(staff.plan.selected);
  assert.equal(staff.plan.selected.host, "cinema");
  assert.equal(
    staff.plan.selected.cost,
    staff.plan.selected.film.cost + staff.plan.selected.book.cost + 45,
  );
  await new Promise(resolve => setTimeout(resolve, 61000));
  console.log("Checking reject scenario...");
  const reject = await runDemo({
    scenario: "reject",
    mode: "qloo",
    excludedPair: first.plan.selected.id as "film-2::book-2",
  });
  assert.ok(reject.plan.selected);
  assert.notEqual(reject.plan.selected.id, first.plan.selected.id);
  console.log("Checking budget scenario...");
  const budget = await runDemo({ scenario: "budget", mode: "qloo" });
  assert.equal(budget.plan.selected, null);
  assert.equal(budget.plan.receipts.length, 0);
  await new Promise(resolve => setTimeout(resolve, 61000));
  console.log("Checking baseline scenario...");
  const baseline = await runDemo({ scenario: "initial", mode: "baseline" });
  assert.ok(baseline.plan.llmUsed);
  assert.equal(baseline.plan.receipts.length, 0);
  assert.equal(baseline.plan.model, first.plan.model);
  assert.equal(baseline.plan.inputFingerprint, first.plan.inputFingerprint);
  const cached = await runDemo({ scenario: "initial", mode: "qloo" });
  assert.equal(cached.cached, true);
  assert.equal(cached.plan.id, first.plan.id);
  for (const [name, result] of Object.entries({
    initial: first,
    staff,
    reject,
    budget,
    baseline,
  }))
    records.push({
      scenario: name,
      selected: result.plan.summary,
      cost: result.plan.selected?.cost ?? null,
      host: result.plan.selected?.host ?? null,
      qlooQueries: result.plan.receipts.length,
      llmUsed: result.plan.llmUsed,
      model: result.plan.model,
      allChecksPass: result.plan.selected?.checks.every((c) => c.pass) ?? null,
    });
  const report = {
    at: new Date().toISOString(),
    elapsedSeconds: Math.round((Date.now() - start) / 1000),
    status: "passed",
    scope:
      "Live API integration using fictional operational assumptions. Not user validation or a preference study.",
    comparison:
      "Same model and input fingerprints verified; agreement or disagreement is not proof of superiority.",
    records,
  };
  await writeFile(
    "docs/live-verification.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : "Live check failed");
  process.exitCode = 1;
});
