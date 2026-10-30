"use client";
import { decisionSensitivity, repairOptions } from "@/lib/group-insights";
import { movies, type GroupInput, type Row } from "@/lib/group";
const title = (id: string | null) =>
  movies.find((m) => m.id === id)?.title || "No supported choice";
export function DecisionLab({
  input,
  rows,
}: {
  input: GroupInput;
  rows: Row[];
}) {
  const insight = decisionSensitivity(input, rows);
  const blocked = rows.every((r) => r.blocked.length);
  return (
    <section className="cg-lab" aria-label="Decision laboratory">
      <span className="cg-kicker">
        THE DECISION LAB / RECOMPUTED FROM YOUR EVIDENCE
      </span>
      <h3>
        {blocked
          ? "What would need to change?"
          : "Whose taste changes the policy choice?"}
      </h3>
      {blocked ? (
        <>
          <p>
            No automatic compromises. These are the requirements for each film;
            only the participant who set a veto should reconsider it.
          </p>
          <div className="cg-repair-list">
            {repairOptions(input).map((r) => (
              <div key={r.id}>
                <strong>{r.title}</strong>
                <span>
                  {r.extraMinutes
                    ? `Needs ${r.extraMinutes} more minutes. `
                    : "Fits the time limit. "}
                  {r.vetoOwners.length
                    ? `Veto remains with ${r.vetoOwners.join(", ")}. `
                    : "No participant veto. "}
                  {r.passed
                    ? "Group must explicitly reconsider this earlier option."
                    : ""}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <p>
            Hold the catalog, evidence, time limit, and{" "}
            <strong>every veto</strong> fixed. Omit one person’s taste ranking
            at a time and recompute the policy. No new API calls; no invented
            explanation.
          </p>
          <div className="cg-influence">
            {insight.participants.map((p) => (
              <div key={p.id}>
                <span className="cg-influence-person">
                  {p.id.toUpperCase()}
                </span>
                <div>
                  <small>WITHOUT THIS TASTE SIGNAL</small>
                  <strong>{title(p.withoutTaste)}</strong>
                </div>
                <span
                  className={p.withoutTaste !== insight.full ? "cg-shift" : ""}
                >
                  {p.withoutTaste !== insight.full
                    ? "Choice changes"
                    : "Choice unchanged"}
                </span>
              </div>
            ))}
          </div>
          <div className="cg-policy-duel">
            <div>
              <small>LEAST-SUPPORTED FIRST</small>
              <strong>{title(insight.balanced)}</strong>
            </div>
            <span>↔</span>
            <div>
              <small>HIGHEST AVERAGE</small>
              <strong>{title(insight.average)}</strong>
            </div>
          </div>
          <p>
            {insight.average === insight.balanced
              ? "Both policies agree in this run. There is no demonstrated strategy advantage here."
              : "The policies disagree: a visible trade-off, not proof that either outcome is better."}
          </p>
          <small>
            This is policy sensitivity, not causal influence or a measurement of
            a person’s importance. Omitting a ranking can also restore
            candidates with missing evidence for that profile. Explicit
            acceptance remains necessary.
          </small>
        </>
      )}
    </section>
  );
}
