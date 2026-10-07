import type { Pair, PlanRequest } from "./types";
export function buildPairs(input: PlanRequest, illustrative = false): Pair[] {
  const { brief: b, catalog, mode, excludedPairs } = input;
  return catalog
    .filter((i) => i.kind === "movie")
    .flatMap((film) =>
      catalog
        .filter((i) => i.kind === "book")
        .map((book) => {
          const id = `${film.id}::${book.id}`;
          const host = b.bookshopStaff ? "bookshop" : "cinema";
          const cost =
            film.cost + book.cost + (host === "cinema" ? b.cinemaHostCost : 0);
          const duration = film.runtime + b.discussionMinutes + 15;
          const checks = [
            {
              label: "Availability",
              pass: film.available && book.available,
              detail: "Both catalog items must be available.",
            },
            {
              label: "Event budget",
              pass: cost <= b.budget,
              detail: `${cost} ${b.currency} of ${b.budget} ${b.currency}; supplied event costs only.`,
            },
            {
              label: "Screening slot",
              pass: duration <= b.slotMinutes,
              detail: `${film.runtime} min film + ${b.discussionMinutes} min discussion + 15 min welcome / transition.`,
            },
            {
              label: "Book stock",
              pass: book.stock >= b.minimumCopies,
              detail: `${book.stock} copies available; ${b.minimumCopies} required.`,
            },
            {
              label: "Hosting",
              pass: b.bookshopStaff || b.allowCinemaHost,
              detail:
                host === "bookshop"
                  ? "Bookseller-led discussion."
                  : "Cinema host required; explicit permission and cost apply.",
            },
            {
              label: "Partner feedback",
              pass: !excludedPairs.includes(id),
              detail: "Rejected pairings are excluded from this revision.",
            },
            {
              label: illustrative ? "Illustrative inputs" : "Verified inputs",
              pass:
                illustrative ||
                mode === "rehearsal" ||
                (film.verified && book.verified),
              detail:
                illustrative || mode === "rehearsal"
                  ? "Demonstration only: operational inputs are illustrative, not verified real-world facts."
                  : "Organizer must verify rights, availability, runtime, stock and costs.",
            },
            {
              label: "Qloo identity",
              pass: mode !== "qloo" || Boolean(film.entityId && book.entityId),
              detail:
                "Live cultural evaluation requires confirmed Qloo entities for both works.",
            },
          ];
          return {
            id,
            film,
            book,
            cost,
            duration,
            host,
            checks,
            eligible: checks.every((c) => c.pass),
            evidence: [],
          } as Pair;
        }),
    );
}
export function rankPairs(pairs: Pair[]): Pair[] {
  const score = (p: Pair) =>
    p.evidence.length === 2
      ? Math.min(...p.evidence.map((e) => e.relativeRank))
      : -1;
  const mean = (p: Pair) =>
    p.evidence.reduce((s, e) => s + e.relativeRank, 0) /
    Math.max(1, p.evidence.length);
  return [...pairs].sort(
    (a, b) =>
      score(b) - score(a) ||
      mean(b) - mean(a) ||
      a.cost - b.cost ||
      a.id.localeCompare(b.id),
  );
}
export function relativeRank(rank: number, count: number): number {
  if (count < 2) return 0; // A lone result does not establish comparative preference.
  return 1 - (rank - 1) / (count - 1);
}
export function schedule(brief: PlanRequest["brief"], pair: Pair) {
  const [h, m] = brief.startTime.split(":").map(Number);
  const base = h * 60 + m;
  const time = (v: number) =>
    `${String(Math.floor(v / 60) % 24).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}${v >= 1440 ? " (+1 day)" : ""}`;
  return [
    {
      time: time(base),
      label: "Doors & introduction",
      detail: "10 minutes · welcome, context, and access information",
    },
    {
      time: time(base + 10),
      label: pair.film.title,
      detail: `${pair.film.runtime} minutes · screening`,
    },
    {
      time: time(base + 10 + pair.film.runtime),
      label: "A short pause",
      detail: "5 minutes · transition",
    },
    {
      time: time(base + 15 + pair.film.runtime),
      label: "Between the film and the page",
      detail: `${brief.discussionMinutes} minutes · ${pair.host === "bookshop" ? "bookseller" : "cinema host"}-led discussion`,
    },
    {
      time: time(base + pair.duration),
      label: "Close",
      detail: "Optional book browsing after the programmed session",
    },
  ];
}
