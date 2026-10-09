import { z } from "zod";
import { sampleBrief, sampleCatalog } from "./sample";
import { searchEntities, ServiceError } from "./qloo";
import { createPlan } from "./planner";
import type { CatalogItem, Plan } from "./types";

// A fixed public demonstration, not an unauthenticated general-purpose LLM proxy.
export const demoRequestSchema = z
  .object({
    scenario: z.enum(["initial", "staff", "budget", "reject"]),
    mode: z.enum(["qloo", "baseline"]).default("qloo"),
    excludedPair: z
      .enum([
        "film-2::book-2",
        "film-2::book-3",
        "film-3::book-2",
        "film-3::book-3",
      ])
      .optional(),
  })
  .strict()
  .refine(
    (x) => x.scenario !== "reject" || Boolean(x.excludedPair),
    "Select a demo pair to reject.",
  );
export type DemoRequest = z.infer<typeof demoRequestSchema>;
export type DemoResult = {
  plan: Plan;
  catalog: CatalogItem[];
  cached: boolean;
  scope: string;
};
const selectedIds = ["film-2", "film-3", "book-2", "book-3"];
export const demoCatalog = sampleCatalog.filter((i) =>
  selectedIds.includes(i.id),
);
let identities: Promise<CatalogItem[]> | undefined;
const plans = new Map<
  string,
  { expires: number; pending: Promise<DemoResult> }
>();
let active = 0;
async function resolveCatalog() {
  if (!identities)
    identities = (async () => {
      const items: CatalogItem[] = [];
      for (const item of demoCatalog) {
        const results = await searchEntities(item.title, item.kind);
        const exact = results.filter(
          (r) =>
            r.name.toLowerCase() === item.title.toLowerCase() &&
            Number(r.year) === item.year,
        );
        if (exact.length !== 1)
          throw new ServiceError(
            `The demo could not uniquely resolve ${item.title}. No entity was guessed.`,
          );
        items.push({ ...item, entityId: exact[0].entityId });
      }
      return items;
    })().catch((e) => {
      identities = undefined;
      throw e;
    });
  return identities;
}
export async function runDemo(input: DemoRequest): Promise<DemoResult> {
  if (process.env.PUBLIC_DEMO_ENABLED !== "true")
    throw new ServiceError(
      "The hosted live demo is not enabled. Rehearsal is available without API keys.",
      503,
    );
  const key = `${input.scenario}:${input.mode}:${input.scenario === "reject" ? input.excludedPair : ""}`;
  const prior = plans.get(key);
  if (prior && prior.expires > Date.now())
    return { ...(await prior.pending), cached: true };
  if (active >= 2)
    throw new ServiceError(
      "The live demo is preparing other proposals. Please retry shortly.",
      429,
    );
  active++;
  const pending = (async () => {
    const catalog = await resolveCatalog();
    const brief = {
      ...sampleBrief,
      ...(input.scenario === "staff" ? { bookshopStaff: false } : {}),
      ...(input.scenario === "budget" ? { budget: 100 } : {}),
    };
    const plan = await createPlan(
      {
        brief,
        catalog,
        mode: input.mode,
        excludedPairs: input.scenario === "reject" ? [input.excludedPair!] : [],
        feedback:
          input.scenario === "staff"
            ? "The bookseller cannot attend. Use only the permitted cinema-host replacement and include its cost."
            : input.scenario === "reject"
              ? "The partners have already programmed this pairing. Propose a different eligible pairing."
              : "",
      },
      { illustrative: true },
    );
    return {
      plan,
      catalog,
      cached: false,
      scope:
        "Real vendor responses; fictional operating assumptions. Responses may be reused for one hour with their original timestamps.",
    };
  })()
    .catch((e) => {
      plans.delete(key);
      throw e;
    })
    .finally(() => {
      active--;
    });
  plans.set(key, { expires: Date.now() + 3600000, pending });
  return pending;
}
