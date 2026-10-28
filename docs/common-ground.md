# Common Ground

A shared-device group film-night agent at `/common-ground`. Common Bill remains at `/`.

## Judge walkthrough
1. Choose favorites for 2–4 participants. The six options are a bounded demonstration catalog, not unrestricted search.
2. Run the Qloo-assisted proposal. Inspect per-participant results and raw query receipts.
3. Add the fourth participant, change the time limit, or veto the proposed film. Generate again. Prior acceptance is cleared.
4. Each participant responds. Agreement requires everyone to choose “I would watch this” or “Acceptable compromise.” Responses are self-reported on one device, not authenticated.
5. Run the blind comparison. Record preference and reason before revealing the source. Export the record.

## Implementation
Exact title/year Qloo resolution; six taste seeds spanning films and books; four candidate films. Candidate-constrained Insights queries run separately per participant. Within-profile rank percentiles are used by two disclosed policies: maximize minimum then mean, or maximize mean. Stable IDs break ties. Missing/single-result evidence is unknown. Raw affinity is never treated as satisfaction or interpersonal utility. Hard vetoes and runtime are enforced before selection. Groq summarizes the permitted Qloo winner or selects an eligible LLM-only baseline. Invalid model choices fail closed.

Profile receipts and identical plans are reused for one hour with original timestamps. Cache is process-local and bounded; two active group requests per worker process are permitted. This is not distributed abuse protection. Public inputs are constrained enums with no arbitrary prompts or entity IDs. Production requires PUBLIC_DEMO_ENABLED=true. Existing QLOO_API_KEY and LLM_* variables are reused server-side.

## What is and is not validated
Engineering tests cover compromise selection, vetoes, time constraints, missing evidence, invalid inputs and explicit agreement. Real vendor checks establish integration, not customer impact. No real group pilot or measured improvement is claimed. Runtime metadata is a supplied catalog fixture; streaming availability, licensing, content ratings and purchases are outside this pilot.

## Evaluation protocol
Recruit consenting groups of 2–4 adults who actually intend to choose a film. Have people enter their own favorites among supported options; if none fit, record the catalog limitation. Compare the same model, favorites, candidate catalog and constraints. Qloo-assisted selection includes a ranking policy, so this is a workflow comparison, not a causal isolation of Qloo. Record blind preference, individual acceptance, veto violations, and time to decision. Report ties and failures. Do not treat self-testing as participant research or duration as time savings without a valid comparison.

## Recruitment message (send manually)
I’m testing a small film-night planning app with groups of 2–4. Would your group try a 10-minute session using your own preferences? It compares two suggestions and asks whether you would watch either. No names or contact details are needed in the app. Participation is optional; feedback may be exported only with your agreement. This is an early prototype with a small catalog.

## 90-second demo narration
“Common Ground helps a group find a film everyone is willing to watch. Each person chooses a favorite and explicit vetoes. Qloo supplies cultural associations separately for each profile; the app does not equate affinity with happiness. Here is the proposal and the evidence behind it. Now a fourth person joins, or someone vetoes this film. The old approvals disappear and the agent must respect the new constraint. Each person now accepts, requests another option, or vetoes. Only explicit acceptance produces agreement. Finally, we can compare with the same LLM without Qloo and record a blind preference. This is a working shared-device pilot; actual usefulness still needs group testing.”
