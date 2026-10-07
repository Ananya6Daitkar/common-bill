import type { Plan } from "./types";
export type RevisionChange = { label: string; before: string; after: string };
export function comparePlans(before: Plan, after: Plan) {
  const changes: RevisionChange[] = [];
  const preserved: string[] = [];
  const inspect = (label: string, a: string, b: string) => {
    if (a === b) preserved.push(label);
    else changes.push({ label, before: a, after: b });
  };
  inspect(
    "Film",
    before.selected?.film.title || "No selection",
    after.selected?.film.title || "No selection",
  );
  inspect(
    "Book",
    before.selected?.book.title || "No selection",
    after.selected?.book.title || "No selection",
  );
  inspect(
    "Discussion host",
    before.selected?.host || "Unassigned",
    after.selected?.host || "Unassigned",
  );
  inspect(
    "Supplied event cost",
    before.selected
      ? `${before.selected.cost} ${before.brief.currency}`
      : "Not available",
    after.selected
      ? `${after.selected.cost} ${after.brief.currency}`
      : "Not available",
  );
  inspect(
    "Program duration",
    before.selected ? `${before.selected.duration} min` : "Not available",
    after.selected ? `${after.selected.duration} min` : "Not available",
  );
  inspect(
    "Date and time",
    `${before.brief.date} ${before.brief.startTime}`,
    `${after.brief.date} ${after.brief.startTime}`,
  );
  inspect(
    "Budget ceiling",
    `${before.brief.budget} ${before.brief.currency}`,
    `${after.brief.budget} ${after.brief.currency}`,
  );
  inspect(
    "Bookseller availability",
    before.brief.bookshopStaff ? "Available" : "Unavailable",
    after.brief.bookshopStaff ? "Available" : "Unavailable",
  );
  inspect(
    "Cinema-host permission",
    before.brief.allowCinemaHost ? "Permitted" : "Not permitted",
    after.brief.allowCinemaHost ? "Permitted" : "Not permitted",
  );
  inspect(
    "Book-stock requirement",
    String(before.brief.minimumCopies),
    String(after.brief.minimumCopies),
  );
  inspect(
    "Total time limit",
    `${before.brief.slotMinutes} min`,
    `${after.brief.slotMinutes} min`,
  );
  return { changes, preserved, beforeId: before.id, afterId: after.id };
}
