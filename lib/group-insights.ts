import { movies, type GroupInput, type Row } from "./group";
function winner(rows: Row[], ids: string[], strategy: GroupInput["strategy"]) {
  const eligible = rows.filter(
    (r) => !r.blocked.length && ids.every((id) => r.ranks[id] != null),
  );
  const score = (r: Row) => {
    const n = ids.map((id) => r.ranks[id]!);
    return {
      floor: Math.min(...n),
      mean: n.reduce((a, b) => a + b, 0) / n.length,
    };
  };
  return (
    eligible.sort((a, b) => {
      const x = score(a),
        y = score(b);
      return (
        (strategy === "balanced" ? y.floor - x.floor : 0) ||
        y.mean - x.mean ||
        a.id.localeCompare(b.id)
      );
    })[0]?.id || null
  );
}
export function decisionSensitivity(input: GroupInput, rows: Row[]) {
  const ids = input.participants.map((p) => p.id);
  const full = winner(rows, ids, input.strategy);
  return {
    full,
    average: winner(rows, ids, "average"),
    balanced: winner(rows, ids, "balanced"),
    participants: ids.map((id) => ({
      id,
      withoutTaste: winner(
        rows,
        ids.filter((x) => x !== id),
        input.strategy,
      ),
    })),
  };
}
export function repairOptions(input: GroupInput) {
  return movies
    .map((m) => ({
      id: m.id,
      title: m.title,
      extraMinutes: Math.max(0, m.minutes - input.maxMinutes),
      vetoOwners: input.participants
        .filter((p) => p.vetoes.includes(m.id))
        .map((p) => p.id),
      passed: (input.passed || []).includes(m.id),
    }))
    .sort(
      (a, b) =>
        a.vetoOwners.length - b.vetoOwners.length ||
        Number(a.passed) - Number(b.passed) ||
        a.extraMinutes - b.extraMinutes ||
        a.id.localeCompare(b.id),
    );
}
