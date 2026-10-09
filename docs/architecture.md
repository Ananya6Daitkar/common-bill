# Architecture

## Decision boundaries

1. Organizer supplies catalog facts and constraints.
2. Entity search resolves each cultural work; humans confirm ambiguous matches.
3. `buildPairs` enumerates at most 64 combinations and removes hard-constraint violations.
4. Optional LLM preparation selects up to four eligible films to evaluate.
5. Qloo receives bounded candidate sets in each direction. Requests are sequential and capped by catalog size.
6. Missing directional results remain unknown. A live proposed pair needs both directions.
7. A deterministic heuristic orders evidence-bearing candidates; the optional LLM makes the final editorial selection from the allowed list.
8. The server rejects any model-selected pair outside that list.
9. Partner feedback or changed practical inputs starts a new run; local reviews reset.
10. Export produces a draft event brief; no outreach, publication, contract, or purchase is executed.

## Modules

- `lib/types.ts`: Zod input contracts, typed evidence and plan records.
- `lib/optimizer.ts`: feasibility, ranking and schedule calculations.
- `lib/qloo.ts`: approved-host transport, identity search, response parsing and receipts.
- `lib/llm.ts`: provider-specific structured JSON adapters and validated decisions.
- `lib/planner.ts`: bounded orchestration and execution trace.
- `lib/revision.ts`: deterministic before/after differences.
- `lib/http.ts`: bounded JSON bodies, origin checks, constant-time access-token check, process-local request budget.
- `components/workbench.tsx`: the shared planning UI; local persistence and controlled review states.

## Ranking heuristic

For a returned item with rank r in a request containing n results, relative rank = `1 - (r - 1)/(n - 1)` when n > 1. A singleton yields 0: one result does not establish comparative preference.

Pairs with both evidence directions are ordered by:

1. Highest minimum directional relative rank.
2. Highest mean directional relative rank.
3. Lowest supplied event cost.
4. Stable pair ID.

This is our catalog-specific heuristic, not Qloo affinity, probability, or an established fairness measure. The model may choose another eligible evidence-bearing pair for explicit editorial reasons. It may also decline all proposals. Truncated candidate scope is disclosed; no global optimum is claimed.

## Costs and time

Cost = film event cost + bookshop event contribution cost + cinema-host cost if the bookseller cannot host and a cinema host is permitted. No sales or margin forecast is computed.

Duration = 10-minute welcome + film runtime + 5-minute transition + requested discussion duration. Midnight rollover is labeled.

## Remaining production work

Authenticated partner identities, separate private briefs, audit-backed approvals, durable plan storage, distributed rate limits, cancellation propagation, streaming execution progress and production observability are not implemented. The current interface explicitly identifies local reviews and device-local storage.
