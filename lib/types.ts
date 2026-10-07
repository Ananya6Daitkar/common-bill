import { z } from "zod";
export const catalogItemSchema = z.object({
  id: z.string().min(1).max(80),
  kind: z.enum(["movie", "book"]),
  title: z.string().min(1).max(160),
  creator: z.string().max(120),
  year: z.number().int().min(1800).max(2100),
  description: z.string().max(600),
  entityId: z.string().max(120).optional(),
  runtime: z.number().int().min(0).max(400),
  cost: z.number().min(0).max(100000),
  stock: z.number().int().min(0).max(10000),
  available: z.boolean(),
  verified: z.boolean(),
});
export const briefSchema = z.object({
  cinemaName: z.string().min(1).max(100),
  bookshopName: z.string().min(1).max(100),
  title: z.string().min(1).max(120),
  goal: z.string().min(1).max(800),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  currency: z.enum(["GBP", "USD", "EUR", "INR"]),
  budget: z.number().min(0).max(100000),
  slotMinutes: z.number().int().min(45).max(480),
  discussionMinutes: z.number().int().min(10).max(120),
  minimumCopies: z.number().int().min(1).max(1000),
  bookshopStaff: z.boolean(),
  allowCinemaHost: z.boolean(),
  cinemaHostCost: z.number().min(0).max(10000),
});
export const planRequestSchema = z
  .object({
    brief: briefSchema,
    catalog: z.array(catalogItemSchema).min(2).max(16),
    mode: z.enum(["rehearsal", "qloo", "baseline"]),
    excludedPairs: z.array(z.string().max(180)).max(40).default([]),
    feedback: z.string().max(800).default(""),
  })
  .superRefine((value, ctx) => {
    const date = new Date(`${value.brief.date}T12:00:00Z`);
    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value.brief.date
    )
      ctx.addIssue({
        code: "custom",
        path: ["brief", "date"],
        message: "Enter a valid calendar date.",
      });
    for (const item of value.catalog)
      if (item.kind === "movie" && item.runtime < 1)
        ctx.addIssue({
          code: "custom",
          message: "Films need a positive verified runtime.",
        });
    const resolved = value.catalog
      .filter((i) => i.entityId)
      .map((i) => `${i.kind}:${i.entityId}`);
    if (new Set(resolved).size !== resolved.length)
      ctx.addIssue({
        code: "custom",
        message: "The same Qloo entity appears more than once in a catalog.",
      });
    if (new Set(value.catalog.map((i) => i.id)).size !== value.catalog.length)
      ctx.addIssue({ code: "custom", message: "Catalog IDs must be unique." });
    for (const kind of ["movie", "book"])
      if (value.catalog.filter((i) => i.kind === kind).length > 8)
        ctx.addIssue({
          code: "custom",
          message: "Use at most eight items per category.",
        });
  });
export type CatalogItem = z.infer<typeof catalogItemSchema>;
export type Brief = z.infer<typeof briefSchema>;
export type PlanRequest = z.infer<typeof planRequestSchema>;
export type QueryReceipt = {
  id: string;
  at: string;
  endpoint: string;
  parameters: Record<string, string>;
  elapsedMs: number;
  resultCount: number;
  warnings: unknown;
  aggregateExplainability: unknown;
  results: Array<{
    entityId: string;
    name: string;
    affinity: number | null;
    rank: number;
    explainability: unknown;
  }>;
};
export type Evidence = {
  direction: "film-to-book" | "book-to-film";
  queryId: string;
  affinity: number | null;
  rank: number;
  count: number;
  relativeRank: number;
  explainability: unknown;
};
export type Pair = {
  id: string;
  film: CatalogItem;
  book: CatalogItem;
  cost: number;
  duration: number;
  host: "bookshop" | "cinema";
  checks: Array<{ label: string; pass: boolean; detail: string }>;
  eligible: boolean;
  evidence: Evidence[];
};
export type Step = {
  id: string;
  kind: "observe" | "reason" | "query" | "decide" | "act" | "stop";
  title: string;
  detail: string;
  at: string;
};
export type Plan = {
  illustrative?: boolean;
  id: string;
  createdAt: string;
  mode: PlanRequest["mode"];
  brief: Brief;
  selected: Pair | null;
  alternatives: Pair[];
  rejected: Pair[];
  receipts: QueryReceipt[];
  steps: Step[];
  summary: string;
  editorialRationale: string;
  hostBrief: string;
  announcement: string;
  warnings: string[];
  llmUsed: boolean;
  model: string | null;
  inputFingerprint: string;
};
