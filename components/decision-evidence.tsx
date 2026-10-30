"use client";
import type { Plan } from "@/lib/types";

export function DecisionEvidence({ plan }: { plan: Plan }) {
  const pair = plan.selected;
  if (!pair || plan.mode !== "qloo") return null;
  return <section className="decision-evidence" aria-label="What supports this decision">
    <span className="eyebrow">THE DECISION, IN THREE PARTS</span>
    <h3>Why this pairing is worth reviewing</h3>
    <div className="evidence-columns">
      <div><strong>1. Cultural evidence</strong>
        {pair.evidence.map(e => <p key={e.direction}>
          {e.direction === "film-to-book" ? "Film → book" : "Book → film"}: rank {e.rank} of {e.count} returned candidates.
          {e.affinity !== null && <> Raw affinity {e.affinity.toFixed(3)}.</>}
        </p>)}
        <small>Ranks apply to this queried catalog. Affinity is not an attendance probability.</small>
      </div>
      <div><strong>2. Practical feasibility</strong>
        <p>{pair.checks.filter(c => c.pass).length} of {pair.checks.length} checks pass. {plan.brief.currency} {plan.brief.budget - pair.cost} budget remains; {plan.brief.slotMinutes - pair.duration} minutes remain in the slot.</p>
        <small>{plan.illustrative ? "Costs, stock, rights and staffing are illustrative." : "Facts are organizer-confirmed, not independently audited."}</small>
      </div>
      <div><strong>3. Human decision</strong>
        <p>Does this suit your local audience? Can you secure the screening rights and available stock?</p>
        <small>Qloo supports cultural selection. Local demand, ticket sales and partner commitment still need validation.</small>
      </div>
    </div>
    <details><summary>Inspect the alternatives and trade-offs</summary>
      <div className="evidence-table-scroll"><table><caption>Returned proposal candidates; this is not a claim of a global optimum.</caption><thead><tr><th>Pairing</th><th>Cost</th><th>Film → book</th><th>Book → film</th><th>Outcome</th></tr></thead><tbody>
        {[pair, ...plan.alternatives, ...plan.rejected].filter((p,i,a)=>a.findIndex(x=>x.id===p.id)===i).map(p => <tr key={p.id}><th scope="row">{p.film.title} × {p.book.title}</th><td>{plan.brief.currency} {p.cost}</td>{(["film-to-book","book-to-film"] as const).map(d=>{const e=p.evidence.find(x=>x.direction===d);return <td key={d}>{e ? `${e.rank} / ${e.count}` : "Not evidenced"}</td>;})}<td>{p.id === pair.id ? "Selected" : !p.eligible ? p.checks.filter(c=>!c.pass).map(c=>c.label).join(", ") : "Alternative"}</td></tr>)}
      </tbody></table></div>
    </details>
    <small>{plan.receipts.length} query receipts · collected {new Date(plan.createdAt).toLocaleString()} · model {plan.model || "not used"}</small>
  </section>;
}
