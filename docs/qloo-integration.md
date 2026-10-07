# Qloo integration and evidence

## Verified contract

On 6 October 2026, the supplied hackathon key successfully completed:

- `GET /search` with `types=urn:entity:movie` and `types=urn:entity:book`.
- Title-and-year disambiguation for Columbus (2017), Invisible Cities (1972), and A Month in the Country (1980).
- `GET /v2/insights` with `signal.interests.entities`, `filter.results.entities`, `filter.type`, `sort_by=affinity`, `take=50`, and `feature.explainability=true`.
- Candidate-restricted book results from a film signal, and film results from a book signal.
- Numeric `query.affinity`, per-result `query.explainability`, and aggregate explainability.

This verifies those requests, not exhaustive catalog coverage or commercial usefulness. Values can change between calls. Run `npm run check:qloo` to obtain a fresh receipt.

## Authentication

`X-Api-Key` is sent only to the exact approved Qloo base origins. Redirects are rejected to prevent credential forwarding. Production and staging origins are accepted only when explicitly configured. Hackathon keys normally use `https://hackathon.api.qloo.com`.

No key is sent to the browser, used in URL parameters, or written to receipts.

## Explainability is not causality

With one input entity, a returned contribution of 1 identifies that seed. It does not explain a deep cultural mechanism or establish an attendance probability. The interface displays input contributions separately from an LLM's editorial interpretation.

## Provenance

Each receipt includes timestamp, request parameters, endpoint, latency, result count, returned affinity/rank, per-item explanation, aggregate explanation, and warnings. Warnings and aggregate explanations are distinct fields.

Unknown response envelopes, out-of-catalog results, API errors and missing evidence stop or limit planning. They never trigger fabricated cultural data.

## Official references

- https://docs.qloo.com/reference/qloo-llm-hackathon-developer-guide
- https://docs.qloo.com/reference/get-search
- https://docs.qloo.com/reference/parameters
- https://docs.qloo.com/reference/insights-api-deep-dive

The hackathon guide and general documentation contain method/type inconsistencies. This app uses the verified GET movie/book subset.
