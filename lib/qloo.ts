import { createHash, randomUUID } from "node:crypto";
import type { QueryReceipt } from "./types";
export class ServiceError extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message);
  }
}
let verification: { fingerprint: string; at: string } | null = null;
export function qlooVerification() {
  const fingerprint = createHash("sha256")
    .update(
      (process.env.QLOO_API_KEY || "") +
        (process.env.QLOO_BASE_URL || "https://hackathon.api.qloo.com"),
    )
    .digest("hex");
  return verification?.fingerprint === fingerprint
    ? { at: verification.at }
    : null;
}
function config() {
  const key = process.env.QLOO_API_KEY;
  if (!key)
    throw new ServiceError(
      "Qloo is not connected. Add QLOO_API_KEY to .env.local and restart the server.",
      503,
    );
  const base = process.env.QLOO_BASE_URL || "https://hackathon.api.qloo.com";
  if (
    ![
      "https://hackathon.api.qloo.com",
      "https://api.qloo.com",
      "https://staging.api.qloo.com",
    ].includes(base)
  )
    throw new ServiceError(
      "Qloo base URL is not an approved Qloo environment.",
      503,
    );
  return { key, base };
}
type Json = Record<string, unknown>;
const record = (v: unknown): Json =>
  v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {};
export function extractEntities(body: unknown): Json[] {
  const b = record(body),
    r = record(b.results);
  const list = Array.isArray(b.results)
    ? b.results
    : Array.isArray(r.entities)
      ? r.entities
      : Array.isArray(b.entities)
        ? b.entities
        : null;
  if (!list)
    throw new ServiceError(
      "Qloo returned an unrecognized response shape. No cultural evidence was inferred.",
    );
  return list.map(record);
}
export async function qlooGet(
  endpoint: string,
  parameters: Record<string, string>,
  signal?: AbortSignal,
) {
  const { key, base } = config();
  const start = Date.now();
  const url = new URL(endpoint, base);
  Object.entries(parameters).forEach(([k, v]) => url.searchParams.set(k, v));
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "X-Api-Key": key, accept: "application/json" },
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
        : AbortSignal.timeout(15000),
      cache: "no-store",
      redirect: "error",
    });
  } catch (error) {
    throw new ServiceError(
      error instanceof Error && error.name === "TimeoutError"
        ? "Qloo timed out. Your draft is unchanged. Please retry."
        : "Qloo could not be reached. Check the network and configured endpoint; your draft is unchanged.",
    );
  }
  if (!response.ok) {
    const messages: Record<number, string> = {
      401: "Qloo rejected the API key. Check that the key matches the configured environment.",
      403: "This Qloo request is not permitted for your key. Check entity types and access.",
      429: "Qloo rate limit reached. Wait before retrying; no substitute data was generated.",
    };
    throw new ServiceError(
      messages[response.status] ||
        `Qloo request failed (HTTP ${response.status}). No evidence was fabricated.`,
      response.status === 429 ? 429 : 502,
    );
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ServiceError("Qloo returned an invalid JSON response.");
  }
  verification = {
    fingerprint: createHash("sha256")
      .update(key + base)
      .digest("hex"),
    at: new Date().toISOString(),
  };
  return { body, elapsedMs: Date.now() - start };
}
export async function searchEntities(query: string, kind: "movie" | "book") {
  const { body } = await qlooGet("/search", {
    query,
    types: `urn:entity:${kind}`,
    take: "6",
  });
  return extractEntities(body)
    .map((e) => ({
      entityId: String(e.entity_id || e.id || ""),
      name: String(e.name || ""),
      description: String(record(e.properties).description || "").slice(0, 400),
      year:
        record(e.properties).release_year ||
        record(e.properties).publication_year ||
        null,
    }))
    .filter((e) => e.entityId && e.name);
}
export async function getAffinity(
  seedId: string,
  candidateIds: string[],
  kind: "movie" | "book",
  signal?: AbortSignal,
): Promise<QueryReceipt> {
  const parameters = {
    "filter.type": `urn:entity:${kind}`,
    "signal.interests.entities": seedId,
    "filter.results.entities": candidateIds.join(","),
    "feature.explainability": "true",
    take: "50",
    sort_by: "affinity",
  };
  const { body, elapsedMs } = await qlooGet("/v2/insights", parameters, signal);
  const allowed = new Set(candidateIds);
  const raw = extractEntities(body);
  // Fail closed if candidate restriction was ignored; never silently trust an unsupported filter.
  if (raw.some((e) => !allowed.has(String(e.entity_id || e.id || ""))))
    throw new ServiceError(
      "Qloo returned an entity outside the requested catalog. Candidate filtering must be verified before continuing.",
    );
  const seen = new Set<string>();
  const results = raw
    .filter((e) => {
      const id = String(e.entity_id || e.id || "");
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .map((e, index) => {
      const q = record(e.query),
        aff = q.affinity;
      return {
        entityId: String(e.entity_id || e.id || ""),
        name: String(e.name || ""),
        affinity: typeof aff === "number" && Number.isFinite(aff) ? aff : null,
        rank: index + 1,
        explainability: q.explainability ?? null,
      };
    });
  return {
    id: randomUUID(),
    at: new Date().toISOString(),
    endpoint: "/v2/insights",
    parameters,
    elapsedMs,
    resultCount: results.length,
    warnings:
      record(body).warnings ??
      record(record(record(body).query).explainability).warning ??
      null,
    aggregateExplainability: record(record(body).query).explainability ?? null,
    results,
  };
}
