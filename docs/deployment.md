# Deployment

## Required runtime

A Node.js host supporting Next.js server routes, outbound HTTPS and runtime environment variables. Use Node 22.13+ or another supported LTS release. Build: `npm ci && npm run build`. Start: `npm start -- --port 3000` (adjust binding for the hosting platform).

Public deployment: https://common-bill.ananyadn678.chatgpt.site. The published runtime uses Sites with Vinext on Cloudflare Workers; the main source remains a standard Next.js application.

## Runtime secrets

Set QLOO_API_KEY, QLOO_BASE_URL, LLM_PROVIDER, LLM_API_KEY, LLM_MODEL, and a strong COMMON_BILL_ACCESS_TOKEN in the host's secret store. Never use NEXT_PUBLIC_ for secrets. Do not upload .env.local.

Arbitrary live API routes require the workspace token in production. The fixed public demo is enabled with PUBLIC_DEMO_ENABLED=true and does not need a token. Set PUBLIC_APP_ORIGIN to the actual published origin when running behind a proxy. The public demo accepts only bounded scenarios, reuses successful responses for one hour, and allows at most two active runs per process. These are not distributed spending limits. Rehearsal remains public and incurs no vendor calls.

## Platform constraints

The plan route declares a 180-second duration, but the platform must actually support it. The planner propagates a 140-second deadline to its vendor calls, each also carrying a per-call timeout. Cold public-demo entity resolution is an additional step. Host limits still apply; a durable job worker would be appropriate for longer catalogs.

The current in-memory request guard is per process. Use host-level or distributed rate limiting for a public live demo. The app is a single-device planning pilot; private multi-user coordination is not supported.

## Release checks

- npm test and npm run build pass.
- Real Qloo contract and Groq planning verified using the deployed environment.
- Paid routes reject missing/incorrect workspace tokens.
- No API key appears in browser bundles or logs.
- Desktop/mobile editing, revision, export and error recovery verified.
- Both comparison arms run with matching model and input fingerprints.
- Actual hosting URL and public GitHub URL added to README.
- Vendor data-retention and demonstration terms reviewed; do not include raw Qloo fixtures in the public repository without permission.
