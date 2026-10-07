# Deployment

## Required runtime

A Node.js host supporting Next.js server routes, outbound HTTPS and runtime environment variables. Use Node 22.13+ or another supported LTS release. Build: `npm ci && npm run build`. Start: `npm start -- --port 3000` (adjust binding for the hosting platform).

The repository has no deployment credentials and no verified public URL. Do not label localhost as a public demo.

## Runtime secrets

Set QLOO_API_KEY, QLOO_BASE_URL, LLM_PROVIDER, LLM_API_KEY, LLM_MODEL, and a strong COMMON_BILL_ACCESS_TOKEN in the host's secret store. Never use NEXT_PUBLIC_ for secrets. Do not upload .env.local.

Paid API routes require the workspace token in production. Provide it privately to authorized judges if using a closed pilot. Rehearsal remains public and incurs no vendor calls.

## Platform constraints

The plan route declares a 180-second duration, but the platform must actually support it. Worst-case sequential vendor timeouts plus LLM calls can exceed that duration. Before public judging, measure real latency and configure appropriate request budgets / hosting limits or move runs to a durable job worker. Do not promise the declared duration is universally available.

The current in-memory request guard is per process. Use host-level or distributed rate limiting for a public live demo. The app is a single-device planning pilot; private multi-user coordination is not supported.

## Release checks

- npm test and npm run build pass.
- Real Qloo contract and Anthropic planning verified using the deployed environment.
- Paid routes reject missing/incorrect workspace tokens.
- No API key appears in browser bundles or logs.
- Desktop/mobile editing, revision, export and error recovery verified.
- Both comparison arms run with matching model and input fingerprints.
- Actual hosting URL and public GitHub URL added to README.
- Vendor data-retention and demonstration terms reviewed; do not include raw Qloo fixtures in the public repository without permission.
