import { randomUUID } from "node:crypto";
import {
  works,
  movies,
  rankGroup,
  type GroupInput,
  type GroupResult,
} from "./group";
import { searchEntities, getAffinity, ServiceError } from "./qloo";
import { askPlanner } from "./llm";
import type { QueryReceipt } from "./types";
let ids: Promise<Record<string, string>> | undefined;
const evidence = new Map<
  string,
  { expires: number; promise: Promise<QueryReceipt> }
>();
const results = new Map<
  string,
  { expires: number; promise: Promise<GroupResult> }
>();
let active = 0;
async function resolve() {
  if (!ids)
    ids = (async () => {
      const out: Record<string, string> = {};
      for (const w of works) {
        const matches = (await searchEntities(w.title, w.kind)).filter(
          (x) =>
            x.name.toLowerCase() === w.title.toLowerCase() &&
            Number(x.year) === w.year,
        );
        if (matches.length !== 1)
          throw new ServiceError(
            `Cannot uniquely resolve ${w.title}; no match was guessed.`,
          );
        out[w.id] = matches[0].entityId;
      }
      return out;
    })().catch((e) => {
      ids = undefined;
      throw e;
    });
  return ids;
}
async function profile(seed: string, identities: Record<string, string>) {
  const cached = evidence.get(seed);
  if (cached && cached.expires > Date.now()) return cached.promise;
  const promise = getAffinity(
    identities[seed],
    movies.map((m) => identities[m.id]),
    "movie",
  ).catch((e) => {
    evidence.delete(seed);
    throw e;
  });
  evidence.set(seed, { expires: Date.now() + 3600000, promise });
  return promise;
}
export async function planGroup(input: GroupInput): Promise<GroupResult> {
  if (process.env.PUBLIC_DEMO_ENABLED !== "true")
    throw new ServiceError("Public group planning is not enabled.", 503);
  const key = JSON.stringify(input);
  const cached = results.get(key);
  if (cached && cached.expires > Date.now())
    return { ...(await cached.promise), cached: true };
  if (active >= 2)
    throw new ServiceError(
      "Two groups are planning now. Please retry shortly.",
      429,
    );
  active++;
  const promise = (async () => {
    const receipts: Record<string, QueryReceipt> = {};
    // Hard constraints are checked before paid vendor calls.
    let rows = rankGroup(input, receipts, {});
    const feasible = rows.filter((r) => !r.blocked.length);
    if (!feasible.length)
      return {
        id: randomUUID(),
        at: new Date().toISOString(),
        input,
        selected: null,
        rows,
        receipts,
        rationale:
          "No film meets every veto and the time limit. Ask participants whether they want to change a constraint; no veto was overridden.",
        model: null,
      };
    if (input.mode === "qloo") {
      const identities = await resolve();
      for (const p of input.participants)
        receipts[p.id] = await profile(p.seed, identities);
      rows = rankGroup(input, receipts, identities);
    }
    const eligible = rows.filter(
      (r) =>
        !r.blocked.length && (input.mode === "baseline" || r.floor !== null),
    );
    if (!eligible.length)
      return {
        id: randomUUID(),
        at: new Date().toISOString(),
        input,
        selected: null,
        rows,
        receipts,
        rationale:
          "No feasible film has comparative Qloo evidence for every participant. Missing evidence is unknown, not dislike.",
        model: null,
      };
    const allowed = input.mode === "qloo" ? [eligible[0]] : eligible;
    const decision = await askPlanner(
      {
        mode: input.mode,
        strategy: input.strategy,
        participants: input.participants.map((p) => ({
          id: p.id,
          favorite: works.find((w) => w.id === p.seed),
          vetoes: p.vetoes,
        })),
        eligible: allowed,
        rankingRule:
          "Within-profile rank percentiles among returned candidates, not calibrated interpersonal utility. balanced maximizes minimum then mean; average maximizes mean. Single-result profiles are unknown.",
      },
      AbortSignal.timeout(60000),
      true,
    );
    if (
      decision.selectedPairId &&
      !allowed.some((r) => r.id === decision.selectedPairId)
    )
      throw new ServiceError(
        "The agent proposed an ineligible film. No proposal was accepted.",
      );
    return {
      id: randomUUID(),
      at: new Date().toISOString(),
      input,
      selected: decision.selectedPairId || null,
      rows,
      receipts,
      rationale: decision.rationale,
      model: process.env.LLM_MODEL || null,
    };
  })()
    .catch((e) => {
      results.delete(key);
      throw e;
    })
    .finally(() => {
      active--;
    });
  if (results.size >= 80) {
    const first = results.keys().next().value;
    if (first) results.delete(first);
  }
  results.set(key, { expires: Date.now() + 3600000, promise });
  return promise;
}
