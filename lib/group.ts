import { z } from "zod";
import type { QueryReceipt } from "./types";
export const works = [
  {
    id: "paterson",
    title: "Paterson",
    year: 2016,
    kind: "movie",
    minutes: 118,
  },
  {
    id: "columbus",
    title: "Columbus",
    year: 2017,
    kind: "movie",
    minutes: 104,
  },
  { id: "arrival", title: "Arrival", year: 2016, kind: "movie", minutes: 116 },
  {
    id: "paddington",
    title: "Paddington 2",
    year: 2017,
    kind: "movie",
    minutes: 103,
  },
  {
    id: "cities",
    title: "Invisible Cities",
    year: 1972,
    kind: "book",
    minutes: 0,
  },
  {
    id: "country",
    title: "A Month in the Country",
    year: 1980,
    kind: "book",
    minutes: 0,
  },
] as const;
export const movies = works.filter((w) => w.kind === "movie");
const workId = z.enum([
  "paterson",
  "columbus",
  "arrival",
  "paddington",
  "cities",
  "country",
]);
export const groupSchema = z
  .object({
    participants: z
      .array(
        z
          .object({
            id: z.string().regex(/^p[1-4]$/),
            seed: workId,
            vetoes: z
              .array(z.enum(["paterson", "columbus", "arrival", "paddington"]))
              .max(4),
          })
          .strict(),
      )
      .min(2)
      .max(4),
    maxMinutes: z.number().int().min(90).max(180),
    strategy: z.enum(["balanced", "average"]),
    mode: z.enum(["qloo", "baseline"]),
  })
  .strict()
  .refine(
    (x) =>
      new Set(x.participants.map((p) => p.id)).size === x.participants.length,
    "Participant IDs must be distinct.",
  );
export type GroupInput = z.infer<typeof groupSchema>;
export type Row = {
  id: string;
  title: string;
  minutes: number;
  blocked: string[];
  ranks: Record<string, number | null>;
  mean: number | null;
  floor: number | null;
};
export type GroupResult = {
  id: string;
  at: string;
  input: GroupInput;
  selected: string | null;
  rows: Row[];
  receipts: Record<string, QueryReceipt>;
  rationale: string;
  model: string | null;
  cached?: boolean;
};
export function rankGroup(
  input: GroupInput,
  receipts: Record<string, QueryReceipt>,
  identities: Record<string, string>,
): Row[] {
  const rows = movies.map((m) => {
    const blocked: string[] = [];
    if (m.minutes > input.maxMinutes) blocked.push("Exceeds time limit");
    const ranks: Record<string, number | null> = {};
    for (const p of input.participants) {
      if (p.vetoes.includes(m.id)) blocked.push(`${p.id} veto`);
      const r = receipts[p.id];
      const found = r?.results.find((e) => e.entityId === identities[m.id]);
      ranks[p.id] =
        found && r.resultCount > 1
          ? 1 - (found.rank - 1) / (r.resultCount - 1)
          : null;
    }
    const values = Object.values(ranks);
    const complete = values.every((v) => v !== null);
    const n = values as number[];
    return {
      id: m.id,
      title: m.title,
      minutes: m.minutes,
      blocked,
      ranks,
      mean: complete ? n.reduce((a, b) => a + b, 0) / n.length : null,
      floor: complete ? Math.min(...n) : null,
    };
  });
  return rows.sort((a, b) => {
    const eligible = (r: Row) => !r.blocked.length && r.floor !== null;
    return (
      Number(eligible(b)) - Number(eligible(a)) ||
      (input.strategy === "balanced" ? (b.floor ?? -1) - (a.floor ?? -1) : 0) ||
      (b.mean ?? -1) - (a.mean ?? -1) ||
      a.id.localeCompare(b.id)
    );
  });
}
export function agreed(ids: string[], votes: Record<string, string>) {
  return (
    ids.length >= 2 &&
    ids.every((id) => ["accept", "compromise"].includes(votes[id]))
  );
}
