"use client";
import { useState } from "react";
import {
  works,
  movies,
  agreed,
  type GroupInput,
  type GroupResult,
} from "@/lib/group";
import "./common-ground.css";
const initial: GroupInput = {
  participants: [
    { id: "p1", seed: "cities", vetoes: [] },
    { id: "p2", seed: "arrival", vetoes: [] },
    { id: "p3", seed: "country", vetoes: [] },
  ],
  maxMinutes: 125,
  strategy: "balanced",
  mode: "qloo",
};
export function CommonGround() {
  const [input, setInput] = useState<GroupInput>(initial),
    [result, setResult] = useState<GroupResult | null>(null),
    [previous, setPrevious] = useState<GroupResult | null>(null),
    [votes, setVotes] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [comparison, setComparison] = useState<{
    a: GroupResult;
    b: GroupResult;
    revealed: boolean;
    vote: string;
    reason: string;
  } | null>(null);
  const [exportText, setExportText] = useState("");
  function edit(next: GroupInput) {
    setInput(next);
    setPrevious(result || previous);
    setResult(null);
    setVotes({});
    setComparison(null);
    setExportText("");
  }
  async function request(i: GroupInput) {
    const r = await fetch("/api/group", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(i),
    });
    const data = await r.json();
    if (!r.ok) throw Error(data.error || "Planning failed");
    return data as GroupResult;
  }
  async function run() {
    setBusy(true);
    setError("");
    setComparison(null);
    setExportText("");
    try {
      const next = await request({ ...input, mode: "qloo" });
      setPrevious(result || previous);
      setResult(next);
      setVotes({});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Planning failed");
    } finally {
      setBusy(false);
    }
  }
  async function compare() {
    setBusy(true);
    setError("");
    setComparison(null);
    try {
      const q = await request({ ...input, mode: "qloo" });
      const b = await request({ ...input, mode: "baseline" });
      if (!q.model || q.model !== b.model)
        throw Error(
          "A complete same-model comparison is unavailable for this scenario.",
        );
      const flip = crypto.getRandomValues(new Uint8Array(1))[0] % 2 === 0;
      setComparison({
        a: flip ? q : b,
        b: flip ? b : q,
        revealed: false,
        vote: "",
        reason: "",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Comparison failed");
    } finally {
      setBusy(false);
    }
  }
  function respond(id: string, value: string) {
    if (!result?.selected) return;
    setExportText("");
    if (value === "veto") {
      edit({
        ...input,
        participants: input.participants.map((p) =>
          p.id === id
            ? {
                ...p,
                vetoes: [
                  ...new Set([...p.vetoes, result.selected!]),
                ] as typeof p.vetoes,
              }
            : p,
        ),
      });
      return;
    }
    setVotes((v) => ({ ...v, [id]: value }));
  }
  const selected = movies.find((m) => m.id === result?.selected);
  const accepted =
    !!selected &&
    agreed(
      input.participants.map((p) => p.id),
      votes,
    );
  return (
    <main id="main" className="cg">
      <header className="cg-nav">
        <a href="/common-ground" className="cg-logo">
          <span className="cg-wordmark">
            c/g<span className="cg-wordmark-dot">●</span>
          </span>{" "}
          Common Ground
          <span>A little less scrolling. A little more agreement.</span>
        </a>
        <a href="/">Common Bill archive ↗</a>
      </header>
      <section className="cg-hero">
        <div className="cg-hero-copy">
          <span className="cg-kicker">
            <i className="cg-live-dot" /> THE GROUP FILM-NIGHT NEGOTIATOR
          </span>
          <h1>
            Good taste.
            <br />
            Different tastes.
            <br />
            <em>Common ground.</em>
          </h1>
          <p>
            Find a film everyone will say yes to.
            <br />
            Qloo finds the cultural connections. Your group makes the call.
          </p>
          <a className="cg-hero-cta" href="#people">
            Take your seats <span>↘</span>
          </a>
          <div className="cg-hero-proof">
            INDIVIDUAL TASTES <b>→</b> SHARED POSSIBILITIES <b>→</b> EVERYONE’S
            SAY
          </div>
        </div>
        <aside className="cg-screening" aria-label="Live group illustration">
          <div className="cg-screen-header">
            <span>SCREENING ROOM / 01</span>
            <span>{input.participants.length} SEATS TAKEN</span>
          </div>
          <div className="cg-screen">
            <span className="cg-screen-overline">
              {selected ? "ON THE TABLE" : "TONIGHT’S QUESTION"}
            </span>
            <p>
              {selected?.title || (
                <>
                  What brings
                  <br />
                  us together?
                </>
              )}
            </p>
            <span className="cg-screen-caption">
              {accepted
                ? "EVERYONE HAS ACCEPTED"
                : "A MATCH IS NOT AN AGREEMENT"}
            </span>
          </div>
          <svg
            className="cg-sightlines"
            viewBox="0 0 400 90"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M40 85L200 0L145 85M255 85L200 0L360 85"
              stroke="currentColor"
              strokeDasharray="3 7"
            />
          </svg>
          <div className="cg-seats">
            {input.participants.map((p, i) => (
              <div key={p.id} className={`cg-seat seat-${i}`}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <strong>{works.find((w) => w.id === p.seed)?.title}</strong>
                <small>
                  {votes[p.id] === "accept" || votes[p.id] === "compromise"
                    ? "ACCEPTED"
                    : "A DIFFERENT PERSPECTIVE"}
                </small>
              </div>
            ))}
          </div>
          <div className="cg-screen-footer">
            <span>POWERED BY QLOO + GROQ</span>
            <span>NO ONE LEFT OUT OF THE DECISION.</span>
          </div>
        </aside>
      </section>
      <nav className="cg-chapters" aria-label="Planning chapters">
        <a href="#people">
          <b>01</b> Set the scene
        </a>
        <a href="#proposal">
          <b>02</b> Find the overlap
        </a>
        <a href="#comparison">
          <b>03</b> Challenge the result
        </a>
        <span>YOUR EVENING. YOUR CALL.</span>
      </nav>
      <div className="cg-disclosure">
        Shared-device pilot · Pass the screen to each participant. Starting
        favorites are examples—choose your own from the bounded catalog. No
        accounts, bookings, streaming availability, or measured impact claims.
      </div>
      <section id="people" className="cg-section">
        <div className="cg-section-title">
          <div>
            <span className="cg-kicker">01 / THE PEOPLE</span>
            <h2>Every seat has a story.</h2>
          </div>
          <button
            disabled={busy || input.participants.length === 4}
            onClick={() =>
              edit({
                ...input,
                participants: [
                  ...input.participants,
                  {
                    id: `p${input.participants.length + 1}`,
                    seed: "paddington",
                    vetoes: [],
                  },
                ],
              })
            }
          >
            + Add a perspective
          </button>
        </div>
        <fieldset disabled={busy} className="cg-fieldset">
          <div className="cg-people">
            {input.participants.map((p, i) => (
              <article className="cg-person" key={p.id}>
                <div className="cg-avatar">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3>Participant {i + 1}</h3>
                <label>
                  A work I enjoy
                  <select
                    value={p.seed}
                    onChange={(e) =>
                      edit({
                        ...input,
                        participants: input.participants.map((x) =>
                          x.id === p.id
                            ? { ...x, seed: e.target.value as typeof p.seed }
                            : x,
                        ),
                      })
                    }
                  >
                    {works.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.title} · {w.kind}
                      </option>
                    ))}
                  </select>
                </label>
                <details>
                  <summary>My hard vetoes ({p.vetoes.length})</summary>
                  {movies.map((m) => (
                    <label className="cg-check" key={m.id}>
                      <input
                        type="checkbox"
                        checked={p.vetoes.includes(m.id)}
                        onChange={(e) =>
                          edit({
                            ...input,
                            participants: input.participants.map((x) =>
                              x.id === p.id
                                ? {
                                    ...x,
                                    vetoes: e.target.checked
                                      ? [...x.vetoes, m.id]
                                      : x.vetoes.filter((v) => v !== m.id),
                                  }
                                : x,
                            ),
                          })
                        }
                      />
                      {m.title}
                    </label>
                  ))}
                </details>
              </article>
            ))}
          </div>
          <div className="cg-controls">
            <label>
              Time available
              <select
                value={input.maxMinutes}
                onChange={(e) =>
                  edit({ ...input, maxMinutes: Number(e.target.value) })
                }
              >
                {[100, 105, 115, 125, 150].map((n) => (
                  <option key={n} value={n}>
                    {n} minutes
                  </option>
                ))}
              </select>
            </label>
            <label>
              How should we compromise?
              <select
                value={input.strategy}
                onChange={(e) =>
                  edit({
                    ...input,
                    strategy: e.target.value as GroupInput["strategy"],
                  })
                }
              >
                <option value="balanced">
                  Prioritize the least-supported person
                </option>
                <option value="average">Highest average ranking</option>
              </select>
            </label>
            <button
              disabled={input.participants.length <= 2}
              onClick={() =>
                edit({
                  ...input,
                  participants: input.participants.slice(0, -1),
                })
              }
            >
              Remove last participant
            </button>
          </div>
        </fieldset>
        <div className="cg-action">
          <button className="cg-primary" disabled={busy} onClick={run}>
            {busy ? "Consulting the evidence…" : "Find our common ground →"}
          </button>
          <small>
            Real calls may take a minute. Evidence and identical proposals may
            be reused for one hour, with original timestamps.
          </small>
        </div>
        {error && (
          <p className="cg-error" role="alert">
            {error}
          </p>
        )}
      </section>
      <section id="proposal" className="cg-section" aria-live="polite">
        <span className="cg-kicker">02 / THE PROPOSAL</span>
        {!result ? (
          <div className="cg-empty">
            <h2>
              {previous
                ? "The group changed. Let’s listen again."
                : "The screen is yours."}
            </h2>
            <p>
              {previous
                ? "Previous acceptance has been cleared. Generate a fresh proposal for the current group and constraints."
                : "Choose each person’s favorite and any vetoes, then ask the agent to find common ground."}
            </p>
          </div>
        ) : (
          <>
            <div className="cg-proposal">
              <div>
                <span className="cg-kicker">
                  {accepted
                    ? "EVERYONE EXPLICITLY ACCEPTED"
                    : "FOR YOUR CONSIDERATION"}
                </span>
                <h2>{selected?.title || "No supported agreement yet"}</h2>
                {selected && (
                  <p>
                    {selected.year} · {selected.minutes} min ·{" "}
                    {input.maxMinutes - selected.minutes} minutes to spare
                  </p>
                )}
                <p>{result.rationale}</p>
                <small>
                  Model interpretation; inspect the Qloo ranks below. Cultural
                  affinity is not a satisfaction forecast.
                </small>
              </div>
              <div className="cg-stamp">
                {accepted ? "AGREED" : selected ? "DISCUSS" : "PAUSE"}
                <span>
                  {accepted
                    ? "by participant responses"
                    : "no inferred consent"}
                </span>
              </div>
            </div>
            {previous && (
              <p className="cg-change">
                Previous:{" "}
                {movies.find((m) => m.id === previous.selected)?.title ||
                  "no selection"}{" "}
                → Current: {selected?.title || "no selection"}.{" "}
                {previous.selected === result.selected
                  ? "The outcome stayed the same; this revision does not demonstrate a changed selection."
                  : "The outcome changed after the group or constraints changed; this alone does not prove a better result."}
              </p>
            )}
            {selected && (
              <div className="cg-responses">
                {input.participants.map((p, i) => (
                  <label key={p.id}>
                    Participant {i + 1}: your response
                    <select
                      disabled={busy}
                      value={votes[p.id] || ""}
                      onChange={(e) => respond(p.id, e.target.value)}
                    >
                      <option value="">Not answered</option>
                      <option value="accept">I would watch this</option>
                      <option value="compromise">Acceptable compromise</option>
                      <option value="another">Suggest another</option>
                      <option value="veto">Hard veto—exclude this film</option>
                    </select>
                  </label>
                ))}
              </div>
            )}
            {Object.values(votes).includes("another") && (
              <p>
                Someone wants another option. Add an explicit veto if this film
                must be excluded, or revise their favorite and replan. The group
                has not agreed.
              </p>
            )}
            <div className="cg-table">
              <table>
                <caption>
                  Within-profile rank positions converted to percentiles. These
                  are ordinal comparisons, not comparable happiness scores.
                  “Unknown” includes absent results and profiles with only one
                  returned candidate.
                </caption>
                <thead>
                  <tr>
                    <th>Candidate</th>
                    {input.participants.map((p) => (
                      <th key={p.id}>{p.id.toUpperCase()}</th>
                    ))}
                    <th>Constraints</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((r) => (
                    <tr
                      key={r.id}
                      className={r.id === result.selected ? "cg-selected" : ""}
                    >
                      <th>
                        {r.title}
                        <small>{r.minutes} min</small>
                      </th>
                      {input.participants.map((p) => (
                        <td key={p.id}>
                          {r.ranks[p.id] === null
                            ? "Unknown"
                            : `${Math.round(r.ranks[p.id]! * 100)} / 100`}
                        </td>
                      ))}
                      <td>{r.blocked.join(", ") || "Pass"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <details className="cg-details">
              <summary>
                Why this strategy? What does the evidence actually say?
              </summary>
              <p>
                The balanced strategy maximizes the lowest within-profile
                percentile, then the mean. The average strategy maximizes the
                mean. Alphabetical IDs break ties. These are transparent product
                rules, not Qloo fairness guarantees. Every participant needs
                comparative evidence for a Qloo proposal. We query a fixed
                four-film universe so vetoes do not change the ranking
                denominator.
              </p>
              <p>
                Qloo returns associations for the selected favorite—not a
                complete personal taste model. Identity matches use exact title
                and year. Familiar films are not automatically excluded; veto
                anything you do not want to watch.
              </p>
            </details>
            <details className="cg-details">
              <summary>
                Inspect {Object.keys(result.receipts).length} participant query
                receipts
              </summary>
              <p>
                Proposal: {new Date(result.at).toLocaleString()} ·{" "}
                {result.cached ? "Reused proposal" : "Generated proposal"}.
                Individual evidence can be cached independently.
              </p>
              <pre>{JSON.stringify(result.receipts, null, 2)}</pre>
            </details>
            <button
              onClick={() =>
                setExportText(
                  JSON.stringify(
                    {
                      exportedAt: new Date().toISOString(),
                      result,
                      responses: votes,
                      agreed: accepted,
                      scope:
                        "Shared-device self-reported responses, not authenticated identities. No measured impact claim.",
                    },
                    null,
                    2,
                  ),
                )
              }
            >
              Prepare decision record
            </button>
          </>
        )}
      </section>
      <section className="cg-section">
        <span id="comparison" className="cg-kicker">
          03 / PUT IT TO THE TEST
        </span>
        <h2>Don’t take our word for it.</h2>
        <p>
          Compare Qloo-assisted selection with the same model using only
          favorite titles and constraints. Both arms make one LLM call. The Qloo
          arm includes a deterministic ranking policy, so this tests the whole
          workflow—not Qloo’s isolated causal effect.
        </p>
        <button disabled={busy} onClick={compare}>
          Run a blind comparison
        </button>
        {comparison && (
          <>
            <div className="cg-comparison">
              {(["a", "b"] as const).map((k) => (
                <article key={k}>
                  <span>
                    PROPOSAL {k.toUpperCase()}
                    {comparison.revealed
                      ? ` · ${comparison[k].input.mode === "qloo" ? "QLOO + POLICY + LLM" : "LLM ONLY"}`
                      : ""}
                  </span>
                  <h3>
                    {movies.find((m) => m.id === comparison[k].selected)
                      ?.title || "No proposal"}
                  </h3>
                  <p>
                    {comparison.revealed
                      ? comparison[k].rationale
                      : "Method and explanation hidden until your judgment is locked."}
                  </p>
                </article>
              ))}
            </div>
            <label>
              Group preference
              <select
                disabled={comparison.revealed}
                value={comparison.vote}
                onChange={(e) =>
                  setComparison({ ...comparison, vote: e.target.value })
                }
              >
                <option value="">Choose before reveal</option>
                <option>A</option>
                <option>B</option>
                <option>Tie</option>
                <option>Neither</option>
              </select>
            </label>
            <label>
              Why? No names or contact details.
              <textarea
                disabled={comparison.revealed}
                maxLength={1000}
                value={comparison.reason}
                onChange={(e) =>
                  setComparison({ ...comparison, reason: e.target.value })
                }
              />
            </label>
            <button
              disabled={
                comparison.revealed ||
                !comparison.vote ||
                comparison.reason.trim().length < 15
              }
              onClick={() => setComparison({ ...comparison, revealed: true })}
            >
              Lock judgment & reveal
            </button>
            {comparison.revealed && (
              <>
                <p>
                  {comparison.a.selected === comparison.b.selected
                    ? "Both methods chose the same outcome. This run shows no selection advantage."
                    : "Different outcomes do not establish superiority; your recorded preference is one observation."}
                </p>
                <button
                  onClick={() =>
                    setExportText(
                      JSON.stringify(
                        {
                          comparison,
                          scope:
                            "One local group observation; no identity verification or population-level conclusion.",
                        },
                        null,
                        2,
                      ),
                    )
                  }
                >
                  Prepare comparison record
                </button>
              </>
            )}
          </>
        )}
      </section>
      {exportText && (
        <section className="cg-section">
          <h2>Your portable record</h2>
          <textarea
            aria-label="Export record"
            readOnly
            rows={10}
            value={exportText}
          />
          <button
            onClick={() => {
              const url = URL.createObjectURL(
                new Blob([exportText], { type: "application/json" }),
              );
              const a = document.createElement("a");
              a.href = url;
              a.download = "common-ground-record.json";
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }}
          >
            Download JSON
          </button>
        </section>
      )}
      <footer>
        COMMON GROUND · Built with Qloo + Groq · A working pilot, not a promise
        of perfect agreement.
        <br />
        Sessions stay in this page and reset on reload. Taste selections are
        sent to the planning server and relevant API providers. No private names
        are needed.
      </footer>
    </main>
  );
}
