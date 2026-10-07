import { createHash, randomUUID } from "node:crypto";
import { buildPairs, rankPairs, relativeRank } from "./optimizer";
import { getAffinity, ServiceError } from "./qloo";
import { askPlanner, llmReady, type Decision } from "./llm";
import type { Plan, PlanRequest, Step, QueryReceipt, Pair } from "./types";
function modelCandidates(pairs: Pair[]) {
  return {
    catalog: [
      ...new Map(
        pairs.flatMap((p) => [p.film, p.book]).map((item) => [item.id, item]),
      ).values(),
    ],
    eligiblePairs: pairs.map((p) => ({
      id: p.id,
      filmId: p.film.id,
      bookId: p.book.id,
      cost: p.cost,
      duration: p.duration,
      host: p.host,
      evidence: p.evidence.map((e) => ({
        direction: e.direction,
        affinity: e.affinity,
        rank: e.rank,
        count: e.count,
        relativeRank: e.relativeRank,
        queryId: e.queryId,
      })),
    })),
    note: "All supplied pairs pass the deterministic operational checks. Choose only an eligible pair ID; preparation priorityFilmIds must use catalog film IDs. Relative rank is an application heuristic, not a probability.",
  };
}
export async function createPlan(
  input: PlanRequest,
  options: { illustrative?: boolean } = {},
): Promise<Plan> {
  const signal = AbortSignal.timeout(140000);
  const steps: Step[] = [];
  const receipts: QueryReceipt[] = [];
  const warnings: string[] = options.illustrative ? ["Live API demonstration with fictional businesses, costs, rights, availability and stock. This is not an approved real event or validated customer impact."] : [];
  const step = (kind: Step["kind"], title: string, detail: string) =>
    steps.push({
      id: randomUUID(),
      kind,
      title,
      detail,
      at: new Date().toISOString(),
    });
  const pairs = buildPairs(input, options.illustrative);
  let eligible = pairs.filter((p) => p.eligible);
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        brief: input.brief,
        catalog: input.catalog,
        excludedPairs: input.excludedPairs,
        feedback: input.feedback,
      }),
    )
    .digest("hex");
  const result: Plan = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    mode: input.mode,
    brief: input.brief,
    selected: null,
    alternatives: [],
    rejected: pairs.filter((p) => !p.eligible),
    receipts,
    steps,
    summary: "",
    editorialRationale: "",
    hostBrief: "",
    announcement: "",
    warnings,
    llmUsed: false,
    model: null,
    inputFingerprint: fingerprint,
    illustrative: Boolean(options.illustrative),
  };
  step(
    "observe",
    "Read both partner briefs",
    `${input.catalog.length} catalog items; ${pairs.length} possible pairings. ${input.feedback ? "Revision includes explicit partner feedback." : "No customer audience inference is made from these catalogs."}`,
  );
  step(
    "reason",
    "Check practical constraints",
    `${eligible.length} pairings pass all required checks. Hard constraints are never relaxed automatically.`,
  );
  if (!eligible.length) {
    result.summary = "No proposal satisfies both briefs.";
    const blockers = [
      ...new Set(
        pairs.flatMap((p) =>
          p.checks.filter((c) => !c.pass).map((c) => c.label),
        ),
      ),
    ];
    result.editorialRationale = `Review these blocking conditions: ${blockers.join(", ")}. Change only requirements both partners agree to change.`;
    step("stop", "No feasible agreement", result.editorialRationale);
    return result;
  }
  if (input.mode === "baseline" && !llmReady())
    throw new ServiceError(
      "The LLM-only baseline requires a configured language model. Rehearsal is not an LLM baseline.",
      503,
    );
  let preparation: Decision | undefined;
  if (input.mode !== "rehearsal" && llmReady()) {
    preparation = await askPlanner(
      {
        stage: "preparation",
        mode: input.mode,
        brief: input.brief,
        feedback: input.feedback,
        candidates: modelCandidates(eligible),
        operationalData: options.illustrative
          ? "Fictional demonstration inputs; never present these as verified real partner facts."
          : "Organizer supplied",
      },
      signal,
    );
    result.llmUsed = true;
    result.model = process.env.LLM_MODEL!;
    step("reason", "Choose evaluation priorities", preparation.rationale);
  }
  if (input.mode === "qloo") {
    const allFilms = [
      ...new Map(eligible.map((p) => [p.film.id, p.film])).values(),
    ];
    const chosen =
      preparation?.priorityFilmIds.filter((id) =>
        allFilms.some((f) => f.id === id),
      ) || [];
    const filmIds = chosen.length
      ? [...new Set(chosen)].slice(0, 4)
      : allFilms.slice(0, 4).map((f) => f.id);
    const films = allFilms.filter((f) => filmIds.includes(f.id));
    const scoped = eligible.filter((p) => filmIds.includes(p.film.id));
    const books = [...new Map(scoped.map((p) => [p.book.id, p.book])).values()];
    if (films.length < allFilms.length)
      warnings.push(
        `Bounded evaluation: ${films.length} of ${allFilms.length} eligible films evaluated. No global optimum is claimed.`,
      );
    // Sequential, bounded API calls; each direction retains its own candidate universe.
    for (const film of films) {
      const receipt = await getAffinity(
        film.entityId!,
        books.map((b) => b.entityId!),
        "book",
        signal,
      );
      receipts.push(receipt);
      step(
        "query",
        `Evaluate books from ${film.title}`,
        `${receipt.resultCount} catalog results returned in ${receipt.elapsedMs} ms.`,
      );
      for (const pair of scoped.filter((p) => p.film.id === film.id)) {
        const e = receipt.results.find(
          (e) => e.entityId === pair.book.entityId,
        );
        if (e)
          pair.evidence.push({
            direction: "film-to-book",
            queryId: receipt.id,
            affinity: e.affinity,
            rank: e.rank,
            count: receipt.resultCount,
            relativeRank: relativeRank(e.rank, receipt.resultCount),
            explainability: e.explainability,
          });
      }
    }
    for (const book of books) {
      const receipt = await getAffinity(
        book.entityId!,
        films.map((f) => f.entityId!),
        "movie",
        signal,
      );
      receipts.push(receipt);
      step(
        "query",
        `Evaluate films from ${book.title}`,
        `${receipt.resultCount} catalog results returned; reverse evidence is not assumed symmetrical.`,
      );
      for (const pair of scoped.filter((p) => p.book.id === book.id)) {
        const e = receipt.results.find(
          (e) => e.entityId === pair.film.entityId,
        );
        if (e)
          pair.evidence.push({
            direction: "book-to-film",
            queryId: receipt.id,
            affinity: e.affinity,
            rank: e.rank,
            count: receipt.resultCount,
            relativeRank: relativeRank(e.rank, receipt.resultCount),
            explainability: e.explainability,
          });
      }
    }
    eligible = scoped.filter((p) => p.evidence.length === 2);
    if (!eligible.length) {
      result.summary = "Not enough cultural evidence to propose a pairing.";
      warnings.push(
        "No eligible pair was returned in both query directions. Missing evidence is unknown, not a zero affinity.",
      );
      step(
        "stop",
        "Insufficient evidence",
        "No cultural result was invented. Review resolved entities and catalog coverage.",
      );
      return result;
    }
    warnings.push(
      "Catalog affinity is not measured audience overlap, attendance, or commercial demand.",
    );
  }
  let ranked = rankPairs(eligible);
  let selected = ranked[0];
  if (input.mode !== "rehearsal" && llmReady()) {
    const decision = await askPlanner(
      {
        stage: "selection",
        mode: input.mode,
        brief: input.brief,
        feedback: input.feedback,
        preparation: preparation?.rationale,
        candidates: modelCandidates(ranked),
        operationalData: options.illustrative
          ? "Fictional demonstration inputs; all announcement text must be labeled DEMO DRAFT."
          : "Organizer supplied",
      },
      signal,
    );
    if (!decision.selectedPairId) {
      result.summary = "The agent found no convincing editorial proposal.";
      result.editorialRationale = decision.rationale;
      step("stop", "Editorial review declined", decision.rationale);
      return result;
    }
    const valid = ranked.find((p) => p.id === decision.selectedPairId);
    if (!valid)
      throw new ServiceError(
        "The model selected an ineligible pairing. The constraint engine rejected it.",
      );
    selected = valid;
    result.editorialRationale = decision.rationale;
    result.hostBrief = decision.hostBrief;
    result.announcement = decision.announcement;
  } else {
    result.editorialRationale =
      input.mode === "rehearsal"
        ? "This rehearsal chooses the lowest supplied event cost among feasible pairs. It makes no cultural-fit claim and is not an AI recommendation."
        : "This proposal uses a conservative relative-rank heuristic across both Qloo query directions. Editorial review by the partners is still required; no LLM was configured.";
    result.hostBrief = `Introduce ${selected.film.title} and ${selected.book.title}. Ask each partner to approve an editorial connection before promotion. Discuss which moments stayed with participants and invite different interpretations. Close by explaining the bookshop’s contribution. This is a planning template, not a researched critical essay.`;
    result.announcement = `DRAFT — ${input.brief.cinemaName} and ${input.brief.bookshopName} invite you to a screening of ${selected.film.title} and a conversation around ${selected.book.title}. ${input.brief.date}, ${input.brief.startTime}. Details and publication require both partners’ approval.`;
  }
  result.selected = selected;
  result.alternatives = ranked.filter((p) => p.id !== selected.id).slice(0, 2);
  result.summary = `${selected.film.title} × ${selected.book.title}`;
  if (input.mode === "rehearsal")
    warnings.push(
      "Rehearsal: partner details, stock, availability and costs are illustrative. No Qloo calls or LLM calls were made.",
    );
  step("decide", "Select a feasible proposal", result.editorialRationale);
  step(
    "act",
    "Prepare the event brief",
    `${selected.duration} minutes; ${selected.cost} ${input.brief.currency} in supplied costs. Both partner reviews are required. Nothing is published or sent.`,
  );
  return result;
}
