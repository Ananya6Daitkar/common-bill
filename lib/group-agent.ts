import type { GroupInput, GroupResult, Row } from "./group";
import type { QueryReceipt } from "./types";
export type AgentDeps = {
  decide: (
    context: unknown,
  ) => Promise<{ selectedPairId: string; rationale: string }>;
  query: () => Promise<{ rows: Row[]; receipts: Record<string, QueryReceipt> }>;
};
export async function runGroupAgent(
  input: GroupInput,
  initial: Row[],
  deps: AgentDeps,
) {
  let rows = initial,
    receipts: Record<string, QueryReceipt> = {},
    queried = false,
    calls = 0;
  const trace: NonNullable<GroupResult["trace"]> = [
    {
      action: "check_constraints",
      at: new Date().toISOString(),
      detail: `${rows.filter((r) => !r.blocked.length).length} films satisfy time, veto and set-aside constraints.`,
    },
  ];
  const finish = (
    selected: string | null,
    rationale: string,
    clarification?: GroupResult["clarification"],
  ) => ({
    selected,
    rationale,
    rows,
    receipts,
    trace,
    clarification,
    agentCalls: calls,
  });
  if (rows.every((r) => r.blocked.length))
    return finish(
      null,
      "No film satisfies all constraints. Review the repair options; no veto was overridden.",
    );
  for (let round = 0; round < 3; round++) {
    const eligible = rows.filter((r) => !r.blocked.length && r.floor !== null);
    const missing = input.participants.filter((p) =>
      rows.some((r) => !r.blocked.length && r.ranks[p.id] == null),
    );
    const clarify =
      (input.clarificationRound || 0) < 2
        ? queried
          ? missing
          : input.participants.filter(
              (p) => p.id === input.uncertainParticipant,
            )
        : [];
    const actions = [
      "stop",
      ...(!queried
        ? ["query_evidence"]
        : eligible.map((r) => `propose:${r.id}`)),
      ...clarify.map((p) => `clarify:${p.id}`),
    ];
    const decision = await deps.decide({
      task: "Choose the next tool action",
      round: round + 1,
      allowedActions: actions,
      input,
      observations: queried
        ? rows
        : rows.map((r) => ({ id: r.id, blocked: r.blocked })),
      previousActions: trace,
    });
    calls++;
    if (!actions.includes(decision.selectedPairId))
      throw Error("Agent returned an action outside the validated tool menu.");
    const action = decision.selectedPairId;
    trace.push({
      action,
      at: new Date().toISOString(),
      detail: decision.rationale,
    });
    if (action === "stop")
      return finish(
        null,
        "The agent declined to propose. " + decision.rationale,
      );
    if (action === "query_evidence") {
      const data = await deps.query();
      rows = data.rows;
      receipts = data.receipts;
      queried = true;
      trace.push({
        action: "qloo_results",
        at: new Date().toISOString(),
        detail: `${Object.keys(receipts).length} participant receipts returned. Receipt timestamps disclose reuse; missing results remain unknown.`,
      });
      continue;
    }
    if (action.startsWith("clarify:")) {
      const participantId = action.split(":")[1];
      return finish(
        null,
        "The agent needs a more representative taste signal before proposing.",
        {
          participantId,
          question: `${participantId.toUpperCase()}, which other supported work better represents what you want tonight? This replaces your taste seed; your vetoes remain unchanged.`,
        },
      );
    }
    const id = action.split(":")[1];
    const row = eligible.find((r) => r.id === id)!;
    return finish(
      id,
      `${row.title} was selected by the agent from ${eligible.length} feasible films with evidence for every participant. Lowest within-profile percentile: ${Math.round(row.floor! * 100)}/100; mean: ${Math.round(row.mean! * 100)}/100. These ranks are not satisfaction scores. The policy leader is ${eligible[0].title}; the agent may choose another eligible trade-off. Explicit acceptance is still required.`,
    );
  }
  return finish(
    null,
    "The agent reached its three-action limit. No proposal was fabricated.",
  );
}
