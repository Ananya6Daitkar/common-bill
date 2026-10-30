# Common Bill

**One film. One book. A reason to come together.**

Common Bill is a planning workbench for an independent cinema and a bookshop. It evaluates film–book combinations against both partners' operational requirements, optionally grounds selection in real Qloo cross-domain affinity, and repairs proposals after feedback.

## October 30 release

The public entry is **Common Bill**, at the root URL. Its redesigned film-and-book workbench uses clearer language, a three-step introduction, responsive layouts, and expandable evidence. [Watch/record the current 90-second demo](docs/demo-video-script.md).

[Common Ground](https://common-bill.ananyadn678.chatgpt.site/common-ground) is a companion group-film pilot: a bounded Groq agent can query Qloo, ask a participant to clarify a favorite, or propose a feasible film. It displays recorded tool actions, preserves vetoes, and requires explicit group acceptance. Its six taste starters and four film candidates are a deliberately limited catalog. It is not the primary Common Bill submission.

Verification: **36 automated tests**, TypeScript checking, and the hosted production build passed on October 30, 2026. Mobile layout was inspected; complete desktop interaction testing remains outstanding. Tests establish behavior, not customer impact.

## Current status

Public hackathon pilot with real Qloo + Groq integration. Customer impact is not yet validated.

**[Public source](https://github.com/Ananya6Daitkar/common-bill)** · **[Try the public demo](https://common-bill.ananyadn678.chatgpt.site)** · [Three-minute judge guide](docs/judge-guide.md) · [Submission description](docs/submission.md)

- Editable partner briefs and film/book catalogs.
- Budget, runtime, stock, availability, staffing, and rejection checks.
- Clearly labeled, zero-vendor-call feasibility rehearsal.
- Server-side Qloo search, candidate-constrained Insights, explainability receipts.
- **Live Qloo search and two-direction affinity contract verified on 6 October 2026.** This is integration evidence, not proof of customer impact.
- Structured-output planning through Groq GPT-OSS 120B; live responses verified.
- Local partner-review notes, feedback-driven revision, before/after differences, and Markdown/JSON exports.
- LLM-vs-Qloo comparison with verified matching model IDs and input fingerprints.
- Responsive UI with keyboard-operable dialogs and tabs, reduced-motion support.

The public demo runs fixed live scenarios without credentials. Editable arbitrary live requests remain protected. No user-study results, attendance uplift, or revenue improvement are claimed.

## Run locally

Requires Node.js 22.13+ and npm.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open http://127.0.0.1:3000. Rehearsal works without any API keys.

If `.env.local` already exists, preserve it instead of copying over it. Never paste credentials into screenshots, logs, commits, or issue descriptions.

## Configure live services

```dotenv
QLOO_API_KEY=your-hackathon-key
QLOO_BASE_URL=https://hackathon.api.qloo.com
LLM_PROVIDER=groq
LLM_API_KEY=your-groq-key
LLM_MODEL=openai/gpt-oss-120b
COMMON_BILL_ACCESS_TOKEN=your-long-random-workspace-token
```

Use a model supported by your account and the provider's structured-output API. Anthropic, OpenAI and Gemini adapters are also available but have not been live-tested. All secrets remain server-side. The workspace access token is entered in Connections and kept in tab memory only.

Restart the server after changes. In the catalog, resolve each exact work through Qloo and independently verify operational facts. The bundled businesses, stock, availability, permissions and costs are **fictional rehearsal inputs**; real titles do not make those facts true.

```sh
npm run check:qloo
# Optional full live suite; uses API quota and spaces runs for Groq limits.
node --env-file=.env.local --import tsx scripts/check-live.ts
```

This opt-in command makes five read-only Qloo requests: three exact-work searches and two directional affinity requests. It prints results, never the API key. It stops if identity resolution is ambiguous. It is not run in CI.

## Why Qloo changes the decision

Qloo evaluates eligible books from a film signal and eligible films from a book signal. The two directions remain separate. Candidate restrictions prevent the application from recommending works outside the supplied catalog. The application rejects responses outside that restriction.

The LLM interprets the brief, chooses a bounded evaluation scope, and makes an editorial decision using returned evidence. It cannot change costs, stock, or hard constraints. Catalog affinity is **not measured customer overlap**.

See [Qloo integration](docs/qloo-integration.md), [architecture](docs/architecture.md), and [evaluation protocol](docs/evaluation.md).

## Three modes

| Mode      | Qloo | LLM      | Selection                                                      |
| --------- | ---- | -------- | -------------------------------------------------------------- |
| Rehearsal | No   | No       | Lowest supplied cost among feasible pairs; no cultural claim   |
| Qloo      | Yes  | Optional | Two-direction evidence; configured LLM adds editorial judgment |
| Baseline  | No   | Required | Same planning context using model knowledge alone              |

The comparison requires a configured LLM for **both** arms and matching input fingerprints and model IDs. It randomizes display order. Reviewer preferences are local observations, not validated impact statistics.

## Tests and production build

```sh
npm test
npm run typecheck
npm run build
npm start
```

Webpack is used for production builds because Turbopack's worker-port creation failed in the development sandbox. No application capability depends on that bundler choice.

Tests cover combined constraints, failed staffing repair, rejection handling, unknown evidence, rehearsal isolation, revision differences, and request validation. No test fixture is presented as a live Qloo result.

## Data and privacy boundary

This version is a **single-device planning pilot**, not an authenticated multi-user product. Briefs and catalog entries persist in browser local storage. Plan receipts and review notes remain in memory and are lost on refresh unless exported. Do not enter confidential partner information.

Live mode sends entity IDs to Qloo. The LLM receives the brief, catalog facts, feedback, and evidence needed to plan. API terms and retention policies apply. No vendor payloads are committed to this repository.

Arbitrary live planning/search routes require `COMMON_BILL_ACCESS_TOKEN` in production and fail closed without it. The separate opt-in public demo accepts only fixed scenarios and caches successful results for one hour; it never accepts user prompts or arbitrary entity IDs. The process-local request guard is not a distributed abuse-control system. Add proper accounts, tenant isolation, persistent storage and distributed limits before a multi-customer launch.

## Deployment

See [deployment instructions](docs/deployment.md). This is a standard Node.js Next.js app; it is not a static export. It needs runtime secrets and outbound HTTPS to Qloo and the chosen LLM provider.

## License

Source code is MIT licensed. Qloo data and third-party creative works remain subject to their own rights and terms.

## Hosted source

The `codex/sites-hosting` branch contains the full Vinext/Cloudflare wrapper used by Sites. The default branch is the portable Next.js application. App, component, and library source is shared; the hosting branch adds the runtime build integration.
