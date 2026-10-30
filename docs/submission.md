# Common Bill — Devpost submission copy

## Tagline
One film. One book. A reason to come together.

## What it does
Common Bill helps an independent cinema and a bookshop plan a shared film-and-book evening. It combines cultural evidence with the unglamorous constraints that determine whether an event can actually happen: budget, screening length, stock, availability, and a discussion host.

The agent reads both briefs, identifies feasible combinations, chooses an evaluation scope, queries Qloo in both directions, and selects an evidence-backed program. It prepares a running order, host brief, and announcement draft. Both partners can record their review. Rejecting a pairing or losing the bookseller triggers another constrained planning run, with visible before/after differences.

## Why Qloo is essential
A language model can invent a persuasive thematic link between almost any film and book. Common Bill asks for evidence in addition to that story. It resolves exact works through Qloo search, then queries candidate-constrained film-to-book and book-to-film affinities. The application retains source entities, query parameters, returned scores, ranking universes, and timestamps. A Qloo-mode proposal needs both directions; missing results stay unknown.

Removing Qloo removes the cultural evidence gate and its inspectable provenance. The app can still produce an LLM-only editorial proposal, but cannot represent it as a culturally grounded selection. The included comparison lets reviewers judge the difference using the same model and operational inputs; it does not assume that Qloo wins every time.

## How we built it
TypeScript, React, Next.js, Tailwind CSS, Radix UI components, and Framer Motion power the workbench. Server-side Qloo adapters handle entity resolution and Insights queries. Groq's GPT-OSS 120B produces schema-constrained planning decisions. A deterministic engine enforces feasibility and rejects model choices outside the allowed set. The external deployment uses a Vinext/Cloudflare Workers adapter through Sites.

The public demonstration uses real Qloo and Groq calls over a fixed catalog. The business names, costs, staffing, permissions, and stock are explicitly fictional. Results may be reused for one hour and keep their original timestamps. API secrets are never sent to the browser.

## Challenges we addressed
- Ambiguous title editions: exact title/year matching or a clear stop; no guessed entity IDs.
- Directional evidence: film-to-book and book-to-film results are separate, not assumed symmetric.
- Practical feasibility: cultural appeal never overrides budget, stock, runtime, or staffing.
- Rate limits: compact model context, bounded retry, fixed demo scenarios, and result reuse.
- Honest comparison: identical inputs/model, randomized display order, and a valid “no preference” outcome.

## Latest product experience
The redesigned interface opens with a clear cinema-and-bookshop use case, a three-step introduction, plain-language controls, and a distinct printed-programme visual identity. Evidence is available for inspection without obscuring the main planning task. The comparison can record a reviewer’s role, explanation and willingness to try the proposal before revealing the methods. These are local self-reports, not verified operator endorsements.

The companion Common Ground page demonstrates group-film negotiation with a bounded tool-using agent, targeted clarification, Qloo receipts, veto protection, explicit acceptance and policy sensitivity. Common Bill remains the primary submission.

## What we demonstrated
As of October 30, 2026, 36 automated tests, TypeScript checking, and the hosted production build pass. Mobile layout was inspected; complete desktop interaction testing remains outstanding. A dated live integration check exercises initial planning, staffing repair, rejected-pair exclusion, an infeasible budget, and an LLM-only comparison. The repository contains the dated verification summary. These are engineering checks using illustrative operational assumptions, not a customer trial.

## Potential impact
The intended audience is independent cinema programmers and booksellers coordinating a joint event. The value hypothesis is that a shared, evidence-backed draft reduces the effort of finding common programming ground while catching operational disagreements early. That hypothesis is testable through operator task completion, time-to-agreed-draft, and willingness to run a proposal.

We have not measured attendance, revenue, customer retention, or time savings. No real organizer endorsements are claimed. A pilot protocol is included so actual operator feedback can be collected and reported transparently.

## What's next
Pilot with consenting cinema/bookshop pairs using verified local catalogs; record blind proposal preference and planning time; add authenticated partner workspaces and durable review history after validating usefulness.

## Built with
Qloo, Groq, GPT-OSS 120B, TypeScript, React, Next.js, Tailwind CSS, Radix UI, Framer Motion, Zod, Cloudflare Workers, Vinext, Sites.

## Links
- Live app: https://common-bill.ananyadn678.chatgpt.site
- Public source: https://github.com/Ananya6Daitkar/common-bill

## Organizer requirements checked
Source: [official overview](https://qloo.devpost.com/) and [rules](https://qloo.devpost.com/rules), checked 7 October 2026.

A functional externally published demo, public source repository, English description, and open-source license are required. The overview explicitly says a video is not required. The advertised deadline is 30 October 2026 at 11:45 p.m. EDT (31 October at 9:15 a.m. IST). Maintain demo availability through judging. The entrant must review eligibility and accept the rules themselves when submitting.
