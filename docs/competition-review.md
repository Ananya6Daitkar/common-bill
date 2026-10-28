# Common Ground — competition review and presentation

Assessment dated 28 October 2026. These are engineering/product judgments, not predicted judge scores. Official rubric: https://qloo.devpost.com/ . Equal weighting here is an assessment convention; no official numerical weights are claimed.

## Strict assessment
| Criterion | Before /10 | After /10 | Evidence and remaining deductions |
|---|---:|---:|---|
| Technological implementation | 7 | 8 | Real exact-entity Qloo calls, per-person receipts, deterministic policies, counterfactual recomputation, veto-safe repair, strict schemas, bounded caches and tests. Deduct for small catalog, one seed/profile, process-local controls and limited LLM agency. |
| Design | 8 | 8.5 | Distinct screening-room identity; taste seats, legible evidence and explicit consent; mobile styles and reduced-motion support. Deduct for shared-device handoff and a long single-page workflow. |
| Potential impact | 5 | 5.5 | Clear task and actionable alternative/blocked-case handling. No actual participant study, adoption or measured time savings. Engineering success is not impact validation. |
| Quality of idea | 6.5 | 8 | Decision sensitivity preserves vetoes while omitting taste signals; comparison of policies makes compromises inspectable. Group recommenders and counterfactual methods are not claimed to be globally novel. |

Indicative equal-weight assessment: 66.25 → 75 /100. This deliberately strict estimate differs from prior optimistic evaluations because it assesses current demonstrated evidence and prototype limits. No guarantee of finalist selection.

## Five plausible competing approaches
These are hypothetical approaches, not researched claims about actual entrants.
| Approach | Likely strength | Likely weakness | Common Ground response / remaining disadvantage |
|---|---|---|---|
| Personalized travel agent | Rich multi-domain discovery, obvious value | Live inventory and booking complexity | We demonstrate a complete bounded choice; travel has broader utility. |
| Taste-based gift finder | Easy pitch and shopping intent | Generic recommendation plus generated explanation | We show multi-person conflict and explicit agreement; gift choice is easier to monetize. |
| Music discovery assistant | Strong emotional appeal and natural taste inputs | Often a ranked list with little agency | Negotiation and veto repair visibly change decisions; our catalog is much smaller. |
| Brand/creator matchmaker | Commercial buyer and measurable campaign potential | Audience overlap and ROI may be asserted without evidence | We retain raw evidence and avoid treating affinity as audience overlap; B2B value remains stronger if competitors validate it. |
| Group restaurant planner | Familiar group problem with real constraints | Dietary facts, opening hours and bookings need other sources | Taste sensitivity and no automatic veto relaxation are inspectable; restaurant planning is more frequent and practical. |

## Winning differentiators implemented
1. Decision lab: omit one participant's taste ranking, retain all vetoes/time/pass constraints, and recompute the policy from the same Qloo receipts. Report unchanged decisions honestly. This is deterministic sensitivity, not causal influence or social importance. Missing evidence can explain a change.
2. Negotiation repair: a request for another option sets a film aside without inventing a permanent veto; earlier choices can be explicitly reconsidered. If all films are blocked, disclose exact per-film time deficits and veto owners. Never auto-relax constraints or claim a repaired choice has cultural support before a new run.

## 90-second demo
0–10s: “Groups don't need another persuasive recommendation. They need a choice everyone can actually accept.” Show the screening room and individual tastes.
10–25s: Generate a Qloo-backed proposal. “These are real per-person cultural results, not generated affinity numbers.” Show the three receipts and one ranking row. If reused, disclose original timestamps.
25–40s: Open the decision lab. “We can remove one taste signal while preserving every veto and see whether the choice changes. If it doesn't, we say so.” Show both policies. Do not promise a change in the default scenario.
40–55s: Participant selects “Suggest another”; click “Find another option.” Show the next proposal, with prior acceptance cleared. A separate hard veto remains visibly distinct.
55–65s: Temporarily choose 100 minutes. No film fits. Show precise time deficits and retained veto owners. Do not imply the application changes them itself.
65–80s: Return to a feasible scenario. Each person explicitly responds; only unanimous acceptance/compromise produces AGREED. Prepare the decision record.
80–90s: “The blind comparison uses the same model and constraints, with and without Qloo plus our policy. Real group trials are next. We have verified the engineering, not claimed improved attendance or time savings.”

## Likely judge questions
**Why Qloo rather than an LLM?** Qloo provides inspectable per-profile cultural ranking evidence across book and film domains. The LLM-only arm lacks those observations. We do not claim Qloo wins every comparison.

**Is this a fairness guarantee?** No. We maximize the minimum ordinal rank as a transparent heuristic. Profiles may have different returned candidate universes. These percentiles are not comparable calibrated utilities, and individual acceptance is essential.

**How agentic is it?** A bounded server workflow resolves entities, obtains evidence, enforces policies and constraints, asks Groq to accept/decline the permitted proposal, and reruns after feedback. It is not an autonomous booking agent. Policy explanations and counterfactuals are deterministic for auditability.

**What happens if someone refuses?** Agreement is blocked. A hard veto excludes the film; a softer alternative request sets it aside for this negotiation. Neither response is silently overridden.

**What impact have you measured?** No real-user impact yet. Tests and real API checks demonstrate correctness, not usefulness. A pilot should record actual group acceptance, blind preference, constraint violations and task duration with consent.

**Why only four films?** Bounded scope makes public API use predictable and permits exhaustive inspection. Broader catalogs and multiple seeds are important next work, not completed features.

**Do you store private profiles?** No names are required. The current session is in-page memory. Bounded taste inputs go to the server and vendors. Server caches are temporary; responses on a shared device are not authenticated identities.

**How would this become a business?** Potential integration into group watch-night or community screening workflows is a hypothesis. No customers, pricing validation, or traction are claimed.

## Architecture / reliability audit
- Server-only credentials, allowlisted Qloo hosts, manual redirects rejected by status checks.
- Strict bounded public request schema; no arbitrary prompt or URL passthrough.
- Veto/time/passed-film gates before vendor calls; invalid LLM selections rejected.
- Process-local caches, two concurrent uncached requests, twelve new requests/minute/process. Not distributed rate limiting; global quotas need deployment infrastructure.
- Client blocks duplicate runs and has a 175-second timeout. Vendor calls have bounded timeouts. Cold-start entity resolution remains sequential; timeout may leave a server call finishing after the client aborts.
- Missing/single-result profiles stay unknown. No invented affinity, consent or claim of calibrated satisfaction.
- Shared-device responses and exported JSON are not cryptographically attested. Page refresh resets the session.
- Scoped CSS, semantic headings/forms, visible focus, responsive layout and reduced-motion styles. No claim of a formal WCAG audit.
- Existing Common Bill route preserved. Earlier unrelated local Common Bill edits are not part of this release.

## Final submission boundaries
Provide the /common-ground URL, public repository, open-source license and accurate description. Final Devpost submission is separate and not completed by this release. Do not present an engineering test vote as participant research. Do not promise a 99+ score.
