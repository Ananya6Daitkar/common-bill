"use client";
import { useEffect, useRef, useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  BookOpen,
  Film,
  Plus,
  X,
  SlidersHorizontal,
  Download,
  Check,
  Link2,
  LoaderCircle,
  CircleHelp,
  History,
  ShieldCheck,
  ExternalLink,
  Search,
  Sparkles,
  RefreshCw,
  Clock3,
  Wallet,
  Users,
  ChevronRight,
  ChevronDown,
  GitCompareArrows,
  FlaskConical,
  AlertTriangle,
  CheckCheck,
  FileText,
  Unplug,
  Trash2,
  Pencil,
  Circle,
  ArrowUpRight,
  Braces,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { sampleBrief, sampleCatalog } from "@/lib/sample";
import {
  briefSchema,
  catalogItemSchema,
  type Brief,
  type CatalogItem,
  type Plan,
  type Pair,
} from "@/lib/types";
import { buildPairs, schedule } from "@/lib/optimizer";
import { money, cn } from "@/lib/utils";
import { comparePlans } from "@/lib/revision";
type Connection = {
  publicDemo: boolean;
  qloo: boolean;
  llm: boolean;
  provider: string | null;
  model: string | null;
  accessRequired: boolean;
  liveVerified: boolean;
  verifiedAt: string | null;
};
type Approval = { cinema: boolean; bookshop: boolean };
type SearchResult = {
  entityId: string;
  name: string;
  description: string;
  year: number | null;
};
const STORAGE = "common-bill-workspace-v1";
function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
function Mark({ small = false }: { small?: boolean }) {
  return (
    <span className={cn("brand-mark", small && "small")} aria-hidden="true">
      <span />
      <span />
    </span>
  );
}
function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
}
function download(name: string, content: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function Workbench() {
  const [brief, setBrief] = useState<Brief>(sampleBrief),
    [catalog, setCatalog] = useState<CatalogItem[]>(sampleCatalog);
  const [plan, setPlan] = useState<Plan | null>(null),
    [versions, setVersions] = useState<Plan[]>([]),
    [dirty, setDirty] = useState(false);
  const [approvals, setApprovals] = useState<Approval>({
    cinema: false,
    bookshop: false,
  });
  const [excludedPairs, setExcludedPairs] = useState<string[]>([]),
    [feedback, setFeedback] = useState("");
  const [tab, setTab] = useState("desk"),
    [modal, setModal] = useState<
      | "brief"
      | "connections"
      | "evidence"
      | "review"
      | "help"
      | "export"
      | "history"
      | null
    >(null);
  const [editing, setEditing] = useState<CatalogItem | null>(null),
    [status, setStatus] = useState<Connection | null>(null),
    [token, setToken] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [mode, setMode] = useState<"rehearsal" | "qloo">("rehearsal");
  const [loaded, setLoaded] = useState(false),
    [comparison, setComparison] = useState<{
      a: Plan;
      b: Plan;
      revealed: boolean;
    } | null>(null);
  const [vote, setVote] = useState<string | null>(null),
    [searchResults, setSearchResults] = useState<SearchResult[]>([]),
    [searching, setSearching] = useState(false);
  const [exportContent, setExportContent] = useState("");
  const [demoMode, setDemoMode] = useState(false);
  const [demoScenario, setDemoScenario] = useState<
    "initial" | "staff" | "budget" | "reject"
  >("initial");
  const [demoExcluded, setDemoExcluded] = useState<string | undefined>();
  const savedWorkspace = useRef<{
    brief: Brief;
    catalog: CatalogItem[];
  } | null>(null);
  const reduce = useReducedMotion();
  const requestRef = useRef(false);
  const inputRevision = useRef(0);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) {
        const s = JSON.parse(raw);
        const b = briefSchema.safeParse(s.brief),
          c = catalogItemSchema.array().max(16).safeParse(s.catalog);
        if (b.success && c.success) {
          setBrief(b.data);
          setCatalog(c.data);
          setNotice(
            "Your saved briefs and catalog have been restored. Generate a fresh proposal to review.",
          );
        }
      }
    } catch {
      setNotice(
        "The saved draft could not be restored. The rehearsal workspace is ready.",
      );
    }
    setLoaded(true);
    refreshStatus();
  }, []);
  useEffect(() => {
    if (!loaded || demoMode) return;
    try {
      localStorage.setItem(STORAGE, JSON.stringify({ brief, catalog }));
    } catch {
      setNotice(
        "Browser storage is unavailable. Export your brief before closing this page.",
      );
    }
  }, [brief, catalog, loaded, demoMode]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 7000);
    return () => clearTimeout(t);
  }, [notice]);
  async function refreshStatus() {
    try {
      const r = await fetch("/api/status");
      if (!r.ok) throw Error();
      setStatus(await r.json());
    } catch {
      setError(
        "Could not check the server connection. Your draft is still available.",
      );
    }
  }
  function invalidate() {
    setDemoMode(false);
    inputRevision.current += 1;
    setDirty(Boolean(plan));
    setApprovals({ cinema: false, bookshop: false });
    setComparison(null);
    setVote(null);
  }
  function updateBrief(next: Brief) {
    setBrief(next);
    invalidate();
  }
  const viable = buildPairs({
    brief,
    catalog,
    mode: "rehearsal",
    excludedPairs,
    feedback,
  }).filter((p) => p.eligible).length;
  const selected = plan?.selected;
  const both = approvals.cinema && approvals.bookshop;
  const previous = versions.find((v) => v.id !== plan?.id);
  const revision = previous && plan ? comparePlans(previous, plan) : null;
  async function fetchDemo(
    scenario: "initial" | "staff" | "budget" | "reject",
    runMode: "qloo" | "baseline" = "qloo",
    excludedPair?: string,
  ) {
    const r = await fetch("/api/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario, mode: runMode, excludedPair }),
    });
    const data = await r.json();
    if (!r.ok)
      throw new Error(data.error || "The live demo could not be prepared.");
    return data as { plan: Plan; catalog: CatalogItem[]; cached: boolean };
  }
  async function runDemoSession(
    scenario: "initial" | "staff" | "budget" | "reject",
  ) {
    if (requestRef.current) return;
    requestRef.current = true;
    const revisionAtStart = inputRevision.current;
    setBusy(true);
    setError("");
    try {
      const excluded = scenario === "reject" ? selected?.id : undefined;
      const data = await fetchDemo(scenario, "qloo", excluded);
      if (revisionAtStart !== inputRevision.current)
        throw new Error(
          "Inputs changed while the demo was running. Please try again.",
        );
      if (!demoMode) savedWorkspace.current = { brief, catalog };
      setDemoMode(true);
      setDemoScenario(scenario);
      setDemoExcluded(excluded);
      setBrief(data.plan.brief);
      setCatalog(data.catalog);
      setPlan(data.plan);
      setMode("qloo");
      setVersions((v) => [data.plan, ...v].slice(0, 8));
      setDirty(false);
      setApprovals({ cinema: false, bookshop: false });
      setComparison(null);
      setVote(null);
      setExcludedPairs([]);
      setFeedback("");
      setTab("desk");
      refreshStatus();
      setNotice(
        data.cached
          ? "Reusing a real API result with its original timestamp. Demo inputs are fictional."
          : "Live Qloo + Groq run complete. Demo operating assumptions are fictional.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Demo failed.");
    } finally {
      requestRef.current = false;
      setBusy(false);
    }
  }
  function leaveDemo() {
    if (savedWorkspace.current) {
      setBrief(savedWorkspace.current.brief);
      setCatalog(savedWorkspace.current.catalog);
    }
    setDemoMode(false);
    setMode("rehearsal");
    setPlan(null);
    setVersions([]);
    setComparison(null);
    setApprovals({ cinema: false, bookshop: false });
    setDirty(false);
  }
  async function postPlan(
    runMode: "rehearsal" | "qloo" | "baseline",
    extra?: { brief?: Brief; excluded?: string[]; feedback?: string },
  ) {
    const r = await fetch("/api/plan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        brief: extra?.brief || brief,
        catalog,
        mode: runMode,
        excludedPairs: extra?.excluded || excludedPairs,
        feedback: extra?.feedback ?? feedback,
      }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Could not prepare a proposal.");
    return data as Plan;
  }
  async function generate(extra?: {
    brief?: Brief;
    excluded?: string[];
    feedback?: string;
  }) {
    if (requestRef.current) return;
    requestRef.current = true;
    const revisionAtStart = inputRevision.current;
    setBusy(true);
    setError("");
    try {
      const next = await postPlan(mode, extra);
      if (revisionAtStart !== inputRevision.current) {
        setNotice(
          "The brief changed while planning. Generate again to use the latest inputs.",
        );
        return;
      }
      setPlan(next);
      refreshStatus();
      setVersions((v) => [next, ...v].slice(0, 8));
      setApprovals({ cinema: false, bookshop: false });
      setDirty(false);
      setTab("desk");
      setNotice(
        next.selected
          ? "Proposal prepared. Review it with both partners."
          : next.summary,
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not prepare a proposal.",
      );
    } finally {
      requestRef.current = false;
      setBusy(false);
    }
  }
  async function reject() {
    if (!selected || !feedback.trim()) {
      setError("Add a short reason before requesting a revision.");
      return;
    }
    const excluded = [...new Set([...excludedPairs, selected.id])];
    setExcludedPairs(excluded);
    invalidate();
    setModal(null);
    await generate({ excluded, feedback });
  }
  async function repairStaff() {
    if (demoMode) {
      await runDemoSession("staff");
      return;
    }
    const next = { ...brief, bookshopStaff: false };
    updateBrief(next);
    setFeedback(
      "The bookshop cannot provide staff. Respect the cinema-host permission already in the brief.",
    );
    await generate({
      brief: next,
      feedback:
        "The bookshop cannot provide staff. Respect the cinema-host permission already in the brief.",
    });
  }
  async function compare() {
    if (requestRef.current) return;
    requestRef.current = true;
    const revisionAtStart = inputRevision.current;
    setBusy(true);
    setError("");
    setVote(null);
    try {
      const q = demoMode
        ? (await fetchDemo(demoScenario, "qloo", demoExcluded)).plan
        : await postPlan("qloo");
      const b = demoMode
        ? (await fetchDemo(demoScenario, "baseline", demoExcluded)).plan
        : await postPlan("baseline");
      if (revisionAtStart !== inputRevision.current)
        throw new Error(
          "The inputs changed during comparison. Run again with a stable brief.",
        );
      if (
        !q.llmUsed ||
        !b.llmUsed ||
        q.model !== b.model ||
        q.inputFingerprint !== b.inputFingerprint
      )
        throw new Error(
          "Comparison controls did not match. No fair comparison was saved.",
        );
      const flip = crypto.getRandomValues(new Uint8Array(1))[0] % 2 === 0;
      setComparison({ a: flip ? q : b, b: flip ? b : q, revealed: false });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Comparison failed.");
    } finally {
      requestRef.current = false;
      setBusy(false);
    }
  }
  async function resolve() {
    if (!editing) return;
    setSearching(true);
    setError("");
    try {
      const r = await fetch(
        `/api/qloo/search?query=${encodeURIComponent(editing.title)}&kind=${editing.kind}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setSearchResults(data.results);
      refreshStatus();
      if (!data.results.length)
        setNotice(
          "No Qloo entity found. Try a different title; no ID has been invented.",
        );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Entity lookup failed.");
    } finally {
      setSearching(false);
    }
  }
  function saveItem() {
    if (!editing) return;
    const parsed = catalogItemSchema.safeParse(editing);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    if (
      !catalog.some((i) => i.id === editing.id) &&
      catalog.filter((i) => i.kind === editing.kind).length >= 8
    ) {
      setError("Use at most eight items in each catalog for this pilot.");
      return;
    }
    setCatalog((c) =>
      c.some((i) => i.id === editing.id)
        ? c.map((i) => (i.id === editing.id ? parsed.data : i))
        : [...c, parsed.data],
    );
    invalidate();
    setEditing(null);
    setSearchResults([]);
  }
  function exportBrief() {
    if (!plan?.selected || dirty) return;
    const p = plan.selected;
    const text = [
      `# ${brief.title}`,
      "",
      `Status: ${both ? "Both reviews recorded locally" : "Draft — partner review incomplete"}`,
      `Mode: ${plan.mode}. ${plan.mode === "rehearsal" ? "Illustrative operational data; no cultural evidence." : ""}`,
      `Partners: ${brief.cinemaName} + ${brief.bookshopName}`,
      `Date: ${brief.date} at ${brief.startTime}`,
      "",
      `## Program\n${p.film.title} × ${p.book.title}`,
      `Supplied costs: ${money(p.cost, brief.currency)} (not a revenue forecast)`,
      ...schedule(brief, p).map((s) => `${s.time} — ${s.label}: ${s.detail}`),
      "",
      `## Editorial rationale\n${plan.editorialRationale}`,
      `## Host brief\n${plan.hostBrief}`,
      `## Announcement draft\n${plan.announcement}`,
      `## Responsibilities\nCinema: verify screening permissions, projection, access arrangements and hosting.\nBookshop: verify stock and approved contribution.\nDiscussion host: ${p.host}.`,
      `## Evidence\n${plan.receipts.map((r) => `${r.id}: ${r.endpoint}, ${r.at}, ${r.resultCount} results`).join("\n") || "No Qloo evidence in this run."}`,
      `## Limits\n${plan.warnings.join("\n")}\nLocal review states are not authenticated approvals or legal agreements.`,
    ].join("\n\n");
    setExportContent(text);
    setModal("export");
  }
  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Common Bill home">
          <Mark />
          <span>
            COMMON<span className="brand-second">BILL</span>
          </span>
        </a>
        <div className="topbar-center">
          <span className="tiny-rule" /> THE COLLABORATION DESK{" "}
          <span className="tiny-rule" />
        </div>
        <div className="topbar-actions">
          <Button
            variant="ghost"
            size="sm"
            aria-label="How it works"
            onClick={() => setModal("help")}
          >
            <CircleHelp size={17} />
            <span className="hide-mobile">How it works</span>
          </Button>
          <button
            className="connection-button"
            onClick={() => {
              refreshStatus();
              setModal("connections");
            }}
          >
            <span
              className={cn("connection-dot", status?.qloo && "connected")}
            />
            {status?.qloo ? "Qloo configured" : "Connect Qloo"}
            <Link2 size={14} />
          </button>
        </div>
      </header>
      <main id="main" className="main-wrap">
        <div className="workspace-heading">
          <div>
            <div className="eyebrow">
              CINEMA MEETS BOOKSHOP <span> / </span> WORKSPACE 001
            </div>
            <h1>
              Make an evening of it<span className="orange">.</span>
            </h1>
            <p>
              Two catalogs. A shared idea. Something worth coming together for.
            </p>
          </div>
          <div className="heading-side">
            <span className="workspace-label">YOUR WORKING DRAFT</span>
            <span className="save-state">
              <Check size={14} />{" "}
              {demoMode
                ? "Demo · not saved over your workspace"
                : "Brief saved on this device"}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModal("history")}
            >
              <History size={15} /> Revision history{" "}
              {versions.length > 0 && (
                <span className="count">{versions.length}</span>
              )}
            </Button>
          </div>
        </div>
        <div className="rehearsal-strip">
          <FlaskConical size={17} />
          <span>
            <strong>
              {demoMode
                ? "Public live demonstration."
                : mode === "rehearsal"
                  ? "Rehearsal workspace."
                  : "Live cultural evaluation."}
            </strong>{" "}
            {demoMode
              ? "Real Qloo + Groq results. Fictional businesses, costs, stock, and screening permissions."
              : mode === "rehearsal"
                ? "Sample businesses, costs, and stock. Real titles. No invented Qloo evidence."
                : "Verify catalog facts and confirm entity matches before running."}
          </span>
          <button onClick={() => setModal("connections")}>
            {mode === "rehearsal" ? "Set up live mode" : "Connection details"}
            <ChevronRight size={15} />
          </button>
        </div>
        {status?.publicDemo && (
          <section
            className="live-demo-bar"
            aria-label="Public live demonstration"
          >
            <div>
              <strong>
                {demoMode
                  ? "Try a different outcome."
                  : "Here to try Common Bill?"}
              </strong>
              <p>
                {demoMode
                  ? "Fixed scenarios keep the public demo available. Edits switch back to your workspace. Responses may be reused for one hour; receipts retain original timestamps."
                  : "Start a real Qloo + Groq run with two films and two books. No account or API key needed. Operating assumptions are illustrative."}
              </p>
            </div>
            <div className="demo-actions">
              <Button disabled={busy} onClick={() => runDemoSession("initial")}>
                {busy
                  ? "Preparing…"
                  : demoMode
                    ? "Reset live scenario"
                    : "Try the live demo"}
              </Button>
              {demoMode && (
                <>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => runDemoSession("budget")}
                  >
                    Budget drops to £100
                  </Button>
                  <Button variant="ghost" disabled={busy} onClick={leaveDemo}>
                    Return to my workspace
                  </Button>
                </>
              )}
            </div>
          </section>
        )}
        {error && (
          <div className="error-banner" role="alert">
            <AlertTriangle size={18} />
            <span>{error}</span>
            <button aria-label="Dismiss error" onClick={() => setError("")}>
              <X size={18} />
            </button>
          </div>
        )}
        <Tabs.Root value={tab} onValueChange={setTab}>
          <div className="navigation-row">
            <Tabs.List className="tab-list" aria-label="Workspace sections">
              <Tabs.Trigger value="desk">
                <span>01</span> Planning desk
              </Tabs.Trigger>
              <Tabs.Trigger value="catalog">
                <span>02</span> The catalogs{" "}
                <span className="count">{catalog.length}</span>
              </Tabs.Trigger>
              <Tabs.Trigger value="compare">
                <span>03</span> The evidence test
              </Tabs.Trigger>
            </Tabs.List>
            <span className="local-note">
              <ShieldCheck size={14} /> Local planning pilot
            </span>
          </div>
          <Tabs.Content value="desk" className="tab-panel">
            <div className="desk-grid">
              <aside className="partner-column">
                <PartnerCard
                  kind="cinema"
                  name={brief.cinemaName}
                  count={
                    catalog.filter((i) => i.kind === "movie" && i.available)
                      .length
                  }
                  accepted={approvals.cinema && !dirty}
                  onEdit={() => setModal("brief")}
                  onCatalog={() => setTab("catalog")}
                />
                <div className="between-partners">
                  <span />
                  <Link2 size={17} />
                  <span />
                </div>
                <PartnerCard
                  kind="bookshop"
                  name={brief.bookshopName}
                  count={
                    catalog.filter((i) => i.kind === "book" && i.available)
                      .length
                  }
                  accepted={approvals.bookshop && !dirty}
                  onEdit={() => setModal("brief")}
                  onCatalog={() => setTab("catalog")}
                />
                <div className="desk-note">
                  <span className="note-number">A NOTE ON THE PROCESS</span>
                  <p>
                    Good chemistry is a beginning.
                    <br />A workable evening takes both sides.
                  </p>
                  <button onClick={() => setModal("help")}>
                    Meet your planning process <ArrowUpRight size={14} />
                  </button>
                </div>
              </aside>
              <section className="proposal-column" aria-label="Event proposal">
                <div className="section-topline">
                  <span className="eyebrow">THE SHARED BILL</span>
                  <span
                    className={cn("status-pill", both && !dirty && "approved")}
                  >
                    {dirty
                      ? "Brief changed"
                      : both
                        ? "Reviews recorded"
                        : plan
                          ? "For your consideration"
                          : "Waiting for a first proposal"}
                  </span>
                </div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={plan?.id || "empty"}
                    initial={{ opacity: reduce ? 1 : 0, y: reduce ? 0 : 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    {selected ? (
                      <div className="event-poster">
                        <div className="poster-top">
                          <span>A COMMON BILL PRESENTATION</span>
                          <span>
                            NO. {String(versions.length).padStart(2, "0")}
                          </span>
                        </div>
                        <div className="poster-title">
                          <span className="poster-subtitle">
                            ONE SCREEN. ONE SHELF. ONE EVENING.
                          </span>
                          <h2>
                            {selected.film.title}
                            <span className="poster-cross">×</span>
                            {selected.book.title}
                          </h2>
                        </div>
                        <div className="poster-credit">
                          <span>
                            <Film size={15} />
                            {selected.film.creator}
                          </span>
                          <span>
                            <BookOpen size={15} />
                            {selected.book.creator}
                          </span>
                        </div>
                        <div className="poster-bottom">
                          <div>
                            <strong>{formatDate(plan.brief.date)}</strong>
                            <span>
                              {plan.brief.startTime} · {selected.duration}{" "}
                              MINUTES
                            </span>
                          </div>
                          <Mark small />
                        </div>
                        <div className="poster-label">
                          {plan.mode === "rehearsal"
                            ? "FEASIBILITY REHEARSAL · CULTURAL FIT NOT EVALUATED"
                            : plan.mode === "qloo"
                              ? "QLOO-GROUNDED CATALOG PAIRING"
                              : "LLM EDITORIAL PROPOSAL · NO QLOO"}
                        </div>
                      </div>
                    ) : (
                      <div className="empty-poster">
                        <div className="poster-top">
                          <span>A COMMON BILL PRESENTATION</span>
                          <span>NO. 01</span>
                        </div>
                        <div className="empty-poster-main">
                          <span className="poster-subtitle">
                            A LITTLE SHARED GROUND
                          </span>
                          <h2>
                            The next
                            <br />
                            great evening
                            <br />
                            starts <em>here.</em>
                          </h2>
                          <div className="empty-poster-pair">
                            <span>
                              <Film size={18} /> On the screen
                            </span>
                            <span className="poster-cross">×</span>
                            <span>
                              <BookOpen size={18} /> On the shelf
                            </span>
                          </div>
                        </div>
                        <div className="empty-poster-bottom">
                          {plan
                            ? plan.summary
                            : "Bring your catalogs. We’ll help with the common ground."}
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
                {dirty && (
                  <div className="inline-warning">
                    <AlertTriangle size={16} /> This proposal uses the previous
                    brief. Regenerate before review or export.
                  </div>
                )}
                {plan && !selected && (
                  <div className="inline-warning">
                    <AlertTriangle size={18} />
                    <div>
                      <strong>{plan.summary}</strong>
                      <p>
                        {plan.editorialRationale || plan.warnings.join(" ")}
                      </p>
                    </div>
                  </div>
                )}
                <div className="generate-row">
                  <Button
                    onClick={() =>
                      demoMode ? runDemoSession("initial") : generate()
                    }
                    disabled={busy}
                    className="generate-button"
                  >
                    {busy ? (
                      <LoaderCircle className="spin" size={18} />
                    ) : plan ? (
                      <RefreshCw size={18} />
                    ) : (
                      <Sparkles size={18} />
                    )}{" "}
                    {busy
                      ? "Preparing your proposal…"
                      : plan
                        ? "Rebuild the proposal"
                        : "Find our common bill"}
                  </Button>
                  <button
                    className="mode-select"
                    onClick={() => setModal("connections")}
                  >
                    <span>
                      {mode === "rehearsal" ? "Rehearsal mode" : "Qloo mode"}
                    </span>
                    <ChevronDown size={14} />
                  </button>
                </div>
                <p className="generation-note">
                  {mode === "rehearsal"
                    ? "Tests feasibility using supplied costs. No AI or cultural ranking."
                    : "Uses real Qloo queries. Missing evidence stays unknown."}
                </p>
              </section>
              <aside className="constraints-column">
                <div className="section-topline">
                  <span className="eyebrow">THE PRACTICAL STUFF</span>
                  <button
                    className="icon-button"
                    aria-label="Edit partner briefs"
                    onClick={() => setModal("brief")}
                  >
                    <SlidersHorizontal size={17} />
                  </button>
                </div>
                <div className="constraints-panel">
                  <Constraint
                    icon={<Wallet size={18} />}
                    label="Shared budget"
                    value={money(brief.budget, brief.currency)}
                    detail="Supplied event costs"
                  />
                  <Constraint
                    icon={<Clock3 size={18} />}
                    label="Evening window"
                    value={`${brief.slotMinutes} min`}
                    detail={`${brief.discussionMinutes} min for conversation`}
                  />
                  <Constraint
                    icon={<BookOpen size={18} />}
                    label="Books on the table"
                    value={`${brief.minimumCopies} copies`}
                    detail="Minimum available stock"
                  />
                  <Constraint
                    icon={<Users size={18} />}
                    label="Discussion host"
                    value={
                      brief.bookshopStaff
                        ? "Bookseller"
                        : brief.allowCinemaHost
                          ? "Cinema host"
                          : "Unresolved"
                    }
                    detail={
                      brief.bookshopStaff
                        ? "Partner staff available"
                        : brief.allowCinemaHost
                          ? `${money(brief.cinemaHostCost, brief.currency)} additional supplied cost`
                          : "A host is required"
                    }
                  />
                  <button
                    className="edit-brief"
                    onClick={() => setModal("brief")}
                  >
                    <Pencil size={14} /> Edit the shared brief
                  </button>
                </div>
                <div className="feasibility-summary">
                  <span className="big-number">
                    {viable.toString().padStart(2, "0")}
                  </span>
                  <div>
                    <strong>feasible pairings</strong>
                    <span>Before cultural evaluation</span>
                  </div>
                </div>
                <div className="evidence-invite">
                  <Braces size={21} />
                  <h3>Show your workings.</h3>
                  <p>
                    Every live cultural choice comes with a receipt. No mystery
                    match percentages.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setModal("evidence")}
                  >
                    Inspect the evidence <ChevronRight size={14} />
                  </Button>
                </div>
              </aside>
            </div>
            {selected && (
              <div className="proposal-details">
                {revision && (
                  <section className="revision-panel">
                    <div className="section-topline">
                      <span className="eyebrow">
                        WHAT SURVIVED THE REVISION
                      </span>
                      <span className="status-pill">
                        {revision.changes.length} changes
                      </span>
                    </div>
                    <h3>A new draft. A clear difference.</h3>
                    {revision.changes.length ? (
                      <div className="revision-table">
                        {revision.changes.map((c) => (
                          <div key={c.label}>
                            <strong>{c.label}</strong>
                            <span className="old-value">{c.before}</span>
                            <ChevronRight size={14} />
                            <span>{c.after}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p>
                        The selected program and practical requirements are
                        unchanged. The decision receipt records this new
                        evaluation.
                      </p>
                    )}
                    <div className="preserved">
                      <Check size={16} />
                      <span>
                        <strong>Preserved:</strong>{" "}
                        {revision.preserved.join(", ")}
                      </span>
                    </div>
                    <p className="small-disclosure">
                      Partner reviews reset for every revision. No change
                      implies improved attendance or commercial demand.
                    </p>
                  </section>
                )}
                {selected.evidence.length > 0 && (
                  <section className="cultural-evidence-panel">
                    <div className="section-topline">
                      <span className="eyebrow">
                        RETURNED BY QLOO · NOT AN LLM ESTIMATE
                      </span>
                      <button
                        className="text-button"
                        onClick={() => setModal("evidence")}
                      >
                        Open query receipts
                      </button>
                    </div>
                    <h3>The connection, in both directions.</h3>
                    <div className="directional-evidence">
                      {selected.evidence.map((e) => (
                        <div key={e.direction}>
                          <div className="evidence-path">
                            <span>
                              {e.direction === "film-to-book"
                                ? selected.film.title
                                : selected.book.title}
                            </span>
                            <ChevronRight size={18} />
                            <span>
                              {e.direction === "film-to-book"
                                ? selected.book.title
                                : selected.film.title}
                            </span>
                          </div>
                          <div className="evidence-numbers">
                            <div>
                              <strong>
                                {e.affinity === null
                                  ? "Not returned"
                                  : e.affinity.toFixed(3)}
                              </strong>
                              <span>Qloo affinity · raw scale</span>
                            </div>
                            <div>
                              <strong>
                                {e.rank} / {e.count}
                              </strong>
                              <span>Rank in this query</span>
                            </div>
                          </div>
                          <p>
                            {e.count < 2
                              ? "Only one candidate returned; no comparative preference is established."
                              : "Candidate order is specific to this query and its eligible catalog."}
                          </p>
                        </div>
                      ))}
                    </div>
                    <p className="small-disclosure">
                      These are separate directional queries. Scores are not
                      probabilities or measured audience overlap. Single-input
                      explainability identifies the supplied seed; it does not
                      prove a causal cultural explanation.
                    </p>
                  </section>
                )}
                <section className="rationale-panel">
                  <div className="eyebrow">WHY THIS BILL</div>
                  <h3>A proposal, with its workings.</h3>
                  <p>{plan.editorialRationale}</p>
                  <div className="metric-row">
                    <span>
                      <Wallet size={17} />
                      <strong>
                        {money(selected.cost, plan.brief.currency)}
                      </strong>{" "}
                      supplied costs
                    </span>
                    <span>
                      <Clock3 size={17} />
                      <strong>{selected.duration} min</strong> total
                    </span>
                    <span>
                      <BookOpen size={17} />
                      <strong>{selected.book.stock}</strong> copies
                    </span>
                  </div>
                  <div className="small-disclosure">
                    {plan.llmUsed
                      ? "Editorial interpretation by the configured LLM; Qloo evidence is shown separately."
                      : "No language model was used in this run."}
                  </div>
                </section>
                <section className="review-panel">
                  <div className="eyebrow">TWO SIDES OF THE SAME EVENING</div>
                  <h3>
                    {both && !dirty
                      ? "Ready for the next conversation."
                      : "Make sure it works for both."}
                  </h3>
                  <p>
                    Record each partner’s review on this device. These are local
                    planning notes, not authenticated approvals.
                  </p>
                  <div className="approval-actions">
                    <Button
                      variant={approvals.cinema ? "dark" : "outline"}
                      disabled={dirty || busy}
                      onClick={() =>
                        setApprovals((a) => ({ ...a, cinema: !a.cinema }))
                      }
                    >
                      {approvals.cinema ? (
                        <Check size={16} />
                      ) : (
                        <Film size={16} />
                      )}{" "}
                      Cinema reviewed
                    </Button>
                    <Button
                      variant={approvals.bookshop ? "dark" : "outline"}
                      disabled={dirty || busy}
                      onClick={() =>
                        setApprovals((a) => ({ ...a, bookshop: !a.bookshop }))
                      }
                    >
                      {approvals.bookshop ? (
                        <Check size={16} />
                      ) : (
                        <BookOpen size={16} />
                      )}{" "}
                      Bookshop reviewed
                    </Button>
                  </div>
                  <button
                    className="text-button"
                    disabled={dirty || busy}
                    onClick={() =>
                      demoMode ? runDemoSession("reject") : setModal("review")
                    }
                  >
                    This pairing doesn’t work. Revise it.
                  </button>
                </section>
                <section className="schedule-panel">
                  <div className="section-topline">
                    <div className="eyebrow">THE RUNNING ORDER</div>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={dirty}
                      onClick={exportBrief}
                    >
                      <Download size={15} /> Export event brief
                    </Button>
                  </div>
                  {schedule(plan.brief, selected).map((s, i) => (
                    <div className="schedule-item" key={i}>
                      <time>{s.time}</time>
                      <span className="schedule-dot" />
                      <div>
                        <strong>{s.label}</strong>
                        <p>{s.detail}</p>
                      </div>
                    </div>
                  ))}
                </section>
                <section className="repair-panel">
                  <div className="eyebrow">WHEN PLANS CHANGE</div>
                  <h3>Repair the disagreement.</h3>
                  <p>
                    The bookseller can’t make it. Can this evening still work
                    without changing either partner’s hard requirements?
                  </p>
                  <Button
                    variant="dark"
                    disabled={busy || !brief.bookshopStaff || dirty}
                    onClick={repairStaff}
                  >
                    <RefreshCw size={16} /> Bookseller unavailable
                  </Button>
                  <span className="small-disclosure">
                    Changes the staffing brief and generates a new proposal. All
                    reviews reset.
                  </span>
                </section>
                {plan.alternatives.length > 0 && (
                  <section className="alternatives-panel">
                    <div className="eyebrow">OTHER FEASIBLE DIRECTIONS</div>
                    <div className="alternatives-grid">
                      {plan.alternatives.map((p) => (
                        <div className="alternative" key={p.id}>
                          <span>
                            <Film size={14} /> {p.film.title}
                          </span>
                          <strong>{p.book.title}</strong>
                          <small>
                            {money(p.cost, brief.currency)} · {p.duration} min ·{" "}
                            {p.evidence.length
                              ? "Returned evidence in both directions"
                              : "Cultural fit not evaluated"}
                          </small>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </Tabs.Content>
          <Tabs.Content value="catalog" className="tab-panel">
            <div className="page-intro">
              <div>
                <div className="eyebrow">START WITH WHAT YOU ACTUALLY HAVE</div>
                <h2>Two catalogs. Many possibilities.</h2>
                <p>
                  Edit the sample inputs, verify operational facts, then resolve
                  the exact works with Qloo.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setEditing({
                    id: crypto.randomUUID(),
                    kind: "movie",
                    title: "",
                    creator: "",
                    year: 2026,
                    description: "",
                    runtime: 90,
                    cost: 0,
                    stock: 0,
                    available: true,
                    verified: false,
                  });
                  setSearchResults([]);
                }}
              >
                <Plus size={17} /> Add a work
              </Button>
            </div>
            <div className="catalog-columns">
              {(["movie", "book"] as const).map((kind) => (
                <section key={kind} className="catalog-section">
                  <div className="catalog-heading">
                    {kind === "movie" ? (
                      <Film size={21} />
                    ) : (
                      <BookOpen size={21} />
                    )}
                    <h3>
                      {kind === "movie" ? "On the screen" : "On the shelf"}
                    </h3>
                    <span className="count">
                      {catalog.filter((i) => i.kind === kind).length}
                    </span>
                  </div>
                  {catalog
                    .filter((i) => i.kind === kind)
                    .map((item, index) => (
                      <button
                        className={cn(
                          "catalog-item",
                          !item.available && "unavailable",
                        )}
                        key={item.id}
                        onClick={() => {
                          setError("");
                          setEditing({ ...item });
                          setSearchResults([]);
                        }}
                      >
                        <div
                          className={cn(
                            "catalog-art",
                            kind === "book" ? "book-art" : "film-art",
                            `art-${index % 4}`,
                          )}
                        >
                          <span>{String(index + 1).padStart(2, "0")}</span>
                          {kind === "movie" ? (
                            <Film size={24} />
                          ) : (
                            <BookOpen size={24} />
                          )}
                        </div>
                        <div className="catalog-copy">
                          <span className="item-overline">
                            {item.year} ·{" "}
                            {kind === "movie"
                              ? `${item.runtime} MIN`
                              : `${item.stock} COPIES`}
                          </span>
                          <h4>{item.title}</h4>
                          <p>{item.creator}</p>
                          <div className="item-badges">
                            <span className={item.verified ? "verified" : ""}>
                              {item.verified
                                ? "Facts verified"
                                : "Sample / unverified"}
                            </span>
                            <span>
                              {item.entityId
                                ? "Entity confirmed"
                                : "Qloo unresolved"}
                            </span>
                            {!item.available && <span>Unavailable</span>}
                          </div>
                        </div>
                        <Pencil className="catalog-edit" size={16} />
                      </button>
                    ))}
                </section>
              ))}
            </div>
            <div className="catalog-disclosure">
              <ShieldCheck size={18} />
              <p>
                <strong>Availability does not come from Qloo.</strong> Screening
                permission, runtime, stock, and costs must be verified by the
                organizer. A confirmed Qloo identity only establishes which
                cultural work is being queried.
              </p>
            </div>
          </Tabs.Content>
          <Tabs.Content value="compare" className="tab-panel">
            <div className="page-intro">
              <div>
                <div className="eyebrow">A FAIR TEST, NOT A VICTORY LAP</div>
                <h2>Does cultural evidence change the plan?</h2>
                <p>
                  Same model, brief, catalogs, and planning budget. One version
                  also receives Qloo evidence.
                </p>
              </div>
              <Button
                onClick={compare}
                disabled={
                  busy ||
                  !status?.qloo ||
                  !status?.llm ||
                  (demoMode && demoScenario === "budget")
                }
              >
                {busy ? (
                  <LoaderCircle className="spin" size={17} />
                ) : (
                  <GitCompareArrows size={17} />
                )}{" "}
                Run a blind comparison
              </Button>
            </div>
            <div className="comparison-rules">
              <span>
                <Check size={15} /> Identical practical constraints
              </span>
              <span>
                <Check size={15} /> Two LLM calls per completed arm
              </span>
              <span>
                <Check size={15} /> Randomized display order
              </span>
              <span>
                <Check size={15} /> Agreement is a valid result
              </span>
            </div>
            {!comparison ? (
              <div className="comparison-empty">
                <GitCompareArrows size={36} />
                <h3>Two proposals. Your judgment.</h3>
                <p>
                  {demoMode
                    ? "Compare this illustrative scenario with the same Groq model, with and without live Qloo evidence."
                    : "Start the public live demo, or connect your own workspace and verify its catalog facts."}
                </p>
                <Button
                  variant="outline"
                  onClick={() => setModal("connections")}
                >
                  Review connections
                </Button>
                <small>
                  Rehearsal output is never presented as an LLM baseline.
                </small>
              </div>
            ) : (
              <>
                <div className="comparison-grid">
                  {(
                    [
                      ["a", comparison.a],
                      ["b", comparison.b],
                    ] as const
                  ).map(([key, p]) => (
                    <section className="comparison-card" key={key}>
                      <span className="eyebrow">
                        PROPOSAL {key.toUpperCase()}
                        {comparison.revealed
                          ? ` / ${p.mode === "qloo" ? "QLOO + LLM" : "LLM ONLY"}`
                          : ""}
                      </span>
                      <h3>
                        {p.selected
                          ? `${p.selected.film.title} × ${p.selected.book.title}`
                          : p.summary}
                      </h3>
                      <p>
                        {comparison.revealed
                          ? p.editorialRationale
                          : "Rationale and method are hidden until reveal to avoid identifying the evidence source."}
                      </p>
                      {p.selected && (
                        <div className="comparison-facts">
                          {money(p.selected.cost, brief.currency)} ·{" "}
                          {p.selected.duration} min
                        </div>
                      )}
                      <Button
                        variant={vote === key ? "dark" : "outline"}
                        onClick={() => setVote(key)}
                      >
                        Prefer proposal {key.toUpperCase()}
                      </Button>
                    </section>
                  ))}
                </div>
                <div className="comparison-footer">
                  <Button
                    variant={vote === "tie" ? "dark" : "outline"}
                    onClick={() => setVote("tie")}
                  >
                    No preference
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setComparison((c) => (c ? { ...c, revealed: true } : c))
                    }
                  >
                    Reveal the methods
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      download(
                        "common-bill-comparison.json",
                        JSON.stringify(
                          {
                            comparison,
                            vote,
                            recordedAt: new Date().toISOString(),
                            scope:
                              "Single local reviewer preference; not measured impact.",
                          },
                          null,
                          2,
                        ),
                        "application/json",
                      )
                    }
                  >
                    <Download size={15} /> Export comparison
                  </Button>
                </div>
                <p className="small-disclosure">
                  This is a local reviewer observation, not proof of attendance
                  or revenue improvement. Qloo affinity is not the evaluation
                  metric.
                </p>
              </>
            )}
          </Tabs.Content>
        </Tabs.Root>
        <footer className="footer">
          <div>
            <Mark small />
            <span>A better evening starts with a little common ground.</span>
          </div>
          <button onClick={() => setModal("help")}>
            About this pilot <ArrowUpRight size={14} />
          </button>
        </footer>
      </main>
      <AnimatePresence>
        {notice && (
          <motion.div
            className="toast"
            role="status"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <CheckCheck size={18} />
            {notice}
          </motion.div>
        )}
      </AnimatePresence>
      <Dialog
        open={modal !== null}
        onOpenChange={(open) => {
          if (!open) setModal(null);
        }}
      >
        <DialogContent className={modal === "evidence" ? "wide-dialog" : ""}>
          {error && (
            <p className="inline-warning" role="alert">
              {error}
            </p>
          )}
          {modal === "brief" && (
            <>
              <div className="eyebrow">THE CONDITIONS FOR A GOOD EVENING</div>
              <DialogTitle>Shape the shared brief.</DialogTitle>
              <DialogDescription>
                Changes reset both reviews. Hard requirements are never relaxed
                by the agent.
              </DialogDescription>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const parsed = briefSchema.safeParse(brief);
                  if (!parsed.success) {
                    setError(parsed.error.issues[0].message);
                    return;
                  }
                  setModal(null);
                  setNotice(
                    "Brief updated. Generate a fresh proposal when ready.",
                  );
                }}
              >
                <div className="form-grid">
                  <Field label="Cinema name">
                    <input
                      value={brief.cinemaName}
                      required
                      maxLength={100}
                      onChange={(e) =>
                        updateBrief({ ...brief, cinemaName: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Bookshop name">
                    <input
                      value={brief.bookshopName}
                      required
                      maxLength={100}
                      onChange={(e) =>
                        updateBrief({ ...brief, bookshopName: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Event title">
                    <input
                      value={brief.title}
                      required
                      maxLength={120}
                      onChange={(e) =>
                        updateBrief({ ...brief, title: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Currency">
                    <select
                      value={brief.currency}
                      onChange={(e) =>
                        updateBrief({
                          ...brief,
                          currency: e.target.value as Brief["currency"],
                        })
                      }
                    >
                      {["GBP", "USD", "EUR", "INR"].map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Date">
                    <input
                      type="date"
                      required
                      value={brief.date}
                      onChange={(e) =>
                        updateBrief({ ...brief, date: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Start time">
                    <input
                      type="time"
                      required
                      value={brief.startTime}
                      onChange={(e) =>
                        updateBrief({ ...brief, startTime: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Event budget">
                    <input
                      type="number"
                      min={0}
                      max={100000}
                      required
                      value={brief.budget}
                      onChange={(e) =>
                        updateBrief({
                          ...brief,
                          budget: Number(e.target.value),
                        })
                      }
                    />
                  </Field>
                  <Field label="Total available minutes">
                    <input
                      type="number"
                      min={45}
                      max={480}
                      required
                      value={brief.slotMinutes}
                      onChange={(e) =>
                        updateBrief({
                          ...brief,
                          slotMinutes: Number(e.target.value),
                        })
                      }
                    />
                  </Field>
                  <Field label="Discussion minutes">
                    <input
                      type="number"
                      min={10}
                      max={120}
                      required
                      value={brief.discussionMinutes}
                      onChange={(e) =>
                        updateBrief({
                          ...brief,
                          discussionMinutes: Number(e.target.value),
                        })
                      }
                    />
                  </Field>
                  <Field label="Minimum book copies">
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      required
                      value={brief.minimumCopies}
                      onChange={(e) =>
                        updateBrief({
                          ...brief,
                          minimumCopies: Number(e.target.value),
                        })
                      }
                    />
                  </Field>
                </div>
                <Field label="What should this evening achieve?">
                  <textarea
                    rows={3}
                    value={brief.goal}
                    required
                    maxLength={800}
                    onChange={(e) =>
                      updateBrief({ ...brief, goal: e.target.value })
                    }
                  />
                </Field>
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={brief.bookshopStaff}
                    onChange={(e) =>
                      updateBrief({ ...brief, bookshopStaff: e.target.checked })
                    }
                  />{" "}
                  The bookshop can provide a discussion host
                </label>
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={brief.allowCinemaHost}
                    onChange={(e) =>
                      updateBrief({
                        ...brief,
                        allowCinemaHost: e.target.checked,
                      })
                    }
                  />{" "}
                  Both partners permit a cinema-hosted alternative
                </label>
                <Field label="Additional cinema-host cost">
                  <input
                    type="number"
                    min={0}
                    max={10000}
                    value={brief.cinemaHostCost}
                    onChange={(e) =>
                      updateBrief({
                        ...brief,
                        cinemaHostCost: Number(e.target.value),
                      })
                    }
                  />
                </Field>
                <Button type="submit">Done editing</Button>
              </form>
            </>
          )}
          {modal === "connections" && (
            <>
              <div className="eyebrow">REAL EVIDENCE STARTS HERE</div>
              <DialogTitle>Connect the cultural layer.</DialogTitle>
              <DialogDescription>
                API keys stay on the server. Configuration is not proof of a
                successful API call.
              </DialogDescription>
              <div className="connection-card">
                <div>
                  <Link2 size={20} />
                  <strong>Qloo Taste API</strong>
                </div>
                <span className="status-pill">
                  {status?.liveVerified
                    ? "Live request verified"
                    : status?.qloo
                      ? "Configured · not yet verified"
                      : "Key needed"}
                </span>
                <p>
                  Request a hackathon key, add it to <code>.env.local</code>,
                  then restart the server.
                </p>
                <a
                  href="https://forms.gle/zz12orkLHTAneLGz6"
                  target="_blank"
                  rel="noreferrer"
                >
                  Request a Qloo key <ExternalLink size={14} />
                </a>
              </div>
              <div className="connection-card">
                <div>
                  <Sparkles size={20} />
                  <strong>Language model</strong>
                </div>
                <span className="status-pill">
                  {status?.llm
                    ? `${status.provider} · ${status.model}`
                    : "Provider needed"}
                </span>
                <p>
                  Configure <code>LLM_PROVIDER</code>, <code>LLM_API_KEY</code>,
                  and <code>LLM_MODEL</code>. Supports Groq, OpenAI, Gemini, and
                  Anthropic adapters. Groq structured planning has been
                  live-tested.
                </p>
              </div>
              {status?.accessRequired && (
                <Field
                  label="Workspace access token"
                  hint="Protects paid API routes. Kept in memory for this tab only; never stored in the browser."
                >
                  <input
                    type="password"
                    autoComplete="off"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                  />
                </Field>
              )}
              <div className="mode-options">
                <button
                  className={mode === "rehearsal" ? "selected" : ""}
                  onClick={() => {
                    setMode("rehearsal");
                    invalidate();
                  }}
                >
                  <FlaskConical size={19} />
                  <strong>Rehearsal</strong>
                  <span>Feasibility only. No API calls.</span>
                </button>
                <button
                  className={mode === "qloo" ? "selected" : ""}
                  disabled={!status?.qloo}
                  onClick={() => {
                    setMode("qloo");
                    invalidate();
                  }}
                >
                  <Link2 size={19} />
                  <strong>Qloo evidence</strong>
                  <span>Real catalog affinity queries.</span>
                </button>
              </div>
              <div className="dialog-actions">
                <Button variant="outline" onClick={refreshStatus}>
                  <RefreshCw size={15} /> Check configuration
                </Button>
                <Button onClick={() => setModal(null)}>
                  Return to the desk
                </Button>
              </div>
            </>
          )}
          {modal === "evidence" && (
            <>
              <div className="eyebrow">THE DECISION RECEIPT</div>
              <DialogTitle>Nothing behind the curtain.</DialogTitle>
              <DialogDescription>
                Returned vendor signals, application checks, and editorial
                interpretation stay separate.
              </DialogDescription>
              {!plan ? (
                <div className="evidence-empty">
                  <Braces size={30} />
                  <h3>No decision yet.</h3>
                  <p>
                    Prepare a proposal to inspect its checks and execution
                    trace. Live affinity evidence requires Qloo.
                  </p>
                </div>
              ) : (
                <>
                  <div className="evidence-summary">
                    <span className="status-pill">
                      {plan.mode.toUpperCase()}
                    </span>
                    <span>{plan.receipts.length} Qloo queries</span>
                    <span>{plan.llmUsed ? "LLM used" : "No LLM used"}</span>
                  </div>
                  {plan.warnings.map((w, i) => (
                    <p className="inline-warning" key={i}>
                      <AlertTriangle size={16} />
                      {w}
                    </p>
                  ))}
                  <h3>Execution trace</h3>
                  <div className="trace-list">
                    {plan.steps.map((s) => (
                      <div className="trace-item" key={s.id}>
                        <span className="trace-kind">{s.kind}</span>
                        <div>
                          <strong>{s.title}</strong>
                          <p>{s.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {selected && (
                    <>
                      <h3>Hard constraints</h3>
                      <div className="check-list">
                        {selected.checks.map((c) => (
                          <div key={c.label}>
                            <Check size={16} />
                            <strong>{c.label}</strong>
                            <span>{c.detail}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  {plan.receipts.length > 0 ? (
                    <>
                      <h3>Actual Qloo query receipts</h3>
                      {plan.receipts.map((r) => (
                        <details className="receipt" key={r.id}>
                          <summary>
                            {r.endpoint} · {r.resultCount} results ·{" "}
                            {r.elapsedMs} ms
                          </summary>
                          <pre>{JSON.stringify(r, null, 2)}</pre>
                        </details>
                      ))}
                    </>
                  ) : (
                    <div className="no-evidence">
                      <Unplug size={20} />
                      <p>
                        No Qloo responses in this run. The application has not
                        generated affinity values or cultural match percentages.
                      </p>
                    </div>
                  )}
                  {plan.rejected.length > 0 && (
                    <details className="receipt">
                      <summary>
                        {plan.rejected.length} infeasible pairings
                      </summary>
                      {plan.rejected.map((p) => (
                        <p key={p.id}>
                          <strong>
                            {p.film.title} × {p.book.title}
                          </strong>
                          <br />
                          {p.checks
                            .filter((c) => !c.pass)
                            .map((c) => `${c.label}: ${c.detail}`)
                            .join(" · ")}
                        </p>
                      ))}
                    </details>
                  )}
                  <Button
                    variant="outline"
                    onClick={() =>
                      download(
                        "common-bill-decision-receipt.json",
                        JSON.stringify(plan, null, 2),
                        "application/json",
                      )
                    }
                  >
                    <Download size={15} /> Export decision receipt
                  </Button>
                </>
              )}
            </>
          )}
          {modal === "review" && (
            <>
              <div className="eyebrow">A BETTER SECOND DRAFT</div>
              <DialogTitle>What isn’t working?</DialogTitle>
              <DialogDescription>
                This rejects the current pairing and requests another. Change
                practical requirements in the shared brief instead.
              </DialogDescription>
              <Field label="Partner feedback">
                <textarea
                  rows={5}
                  value={feedback}
                  maxLength={800}
                  placeholder="For example: we have already programmed this pairing this season."
                  onChange={(e) => setFeedback(e.target.value)}
                />
              </Field>
              <Button onClick={reject} disabled={busy || !feedback.trim()}>
                <RefreshCw size={16} /> Reject pairing and revise
              </Button>
            </>
          )}
          {modal === "export" && (
            <>
              <div className="eyebrow">TAKE THE PLAN WITH YOU</div>
              <DialogTitle>Your event brief.</DialogTitle>
              <DialogDescription>
                Review the draft before sharing. Illustrative inputs and
                evidence limits are included in the export.
              </DialogDescription>
              <Field label="Event brief text">
                <textarea readOnly rows={16} value={exportContent} />
              </Field>
              <div className="dialog-actions">
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(exportContent);
                      setNotice("Event brief copied.");
                    } catch {
                      setError(
                        "Select the brief text and copy it manually; clipboard access is unavailable.",
                      );
                    }
                  }}
                >
                  Copy brief
                </Button>
                <Button
                  onClick={() =>
                    download(
                      "common-bill-event-brief.md",
                      exportContent,
                      "text/markdown",
                    )
                  }
                >
                  Download Markdown
                </Button>
              </div>
            </>
          )}
          {modal === "history" && (
            <>
              <div className="eyebrow">EVERY CHANGE HAS A REASON</div>
              <DialogTitle>Your revision history.</DialogTitle>
              <DialogDescription>
                Full decision receipts remain in this tab until refresh. Export
                a receipt to retain it; only briefs and catalogs are saved on
                this device.
              </DialogDescription>
              {versions.length === 0 ? (
                <p className="empty-copy">
                  Your first proposal will appear here.
                </p>
              ) : (
                versions.map((v, i) => (
                  <div className="history-item" key={v.id}>
                    <span className="history-index">
                      {String(versions.length - i).padStart(2, "0")}
                    </span>
                    <div>
                      <strong>{v.summary}</strong>
                      <p>
                        {new Date(v.createdAt).toLocaleTimeString()} · {v.mode}{" "}
                        ·{" "}
                        {v.selected
                          ? `${money(v.selected.cost, v.brief.currency)} / ${v.selected.host} host`
                          : "No agreement"}
                      </p>
                      <button
                        className="text-button"
                        onClick={() =>
                          download(
                            `common-bill-revision-${versions.length - i}.json`,
                            JSON.stringify(v, null, 2),
                            "application/json",
                          )
                        }
                      >
                        Export receipt
                      </button>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
          {modal === "help" && (
            <>
              <div className="eyebrow">COMMON BILL / A WORKING PILOT</div>
              <DialogTitle>From shared taste to a shared evening.</DialogTitle>
              <DialogDescription>
                A planning desk for one cinema and one bookshop. No emails,
                contracts, purchases, or public announcements are sent.
              </DialogDescription>
              <div className="help-steps">
                <div>
                  <span>01</span>
                  <h3>Bring the real constraints.</h3>
                  <p>
                    Add your catalogs, budget, stock, timing, and hosting
                    requirements. Verify operational facts yourself.
                  </p>
                </div>
                <div>
                  <span>02</span>
                  <h3>Find the cultural connection.</h3>
                  <p>
                    With Qloo connected, confirm entity matches and query
                    catalog affinities in both directions. Affinity is not
                    audience demand.
                  </p>
                </div>
                <div>
                  <span>03</span>
                  <h3>Make it work for both sides.</h3>
                  <p>
                    Review the proposal, record feedback, and revise. The agent
                    cannot silently relax hard constraints.
                  </p>
                </div>
              </div>
              <div className="privacy-note">
                <ShieldCheck size={20} />
                <p>
                  <strong>Current privacy boundary:</strong> This is a
                  single-device pilot, not private multi-user accounts. Briefs
                  and catalogs are stored in this browser. Live mode sends work
                  IDs to Qloo and planning inputs to your configured LLM. Do not
                  enter confidential partner information. Vendor retention terms
                  apply.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  localStorage.removeItem(STORAGE);
                  setBrief({ ...sampleBrief });
                  setCatalog(sampleCatalog.map((i) => ({ ...i })));
                  setPlan(null);
                  setVersions([]);
                  setApprovals({ cinema: false, bookshop: false });
                  setExcludedPairs([]);
                  setFeedback("");
                  setComparison(null);
                  setDirty(false);
                  setModal(null);
                  setNotice(
                    "Saved workspace reset to the clearly labeled rehearsal.",
                  );
                }}
              >
                <Trash2 size={15} /> Reset this device to rehearsal
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
            setSearchResults([]);
          }
        }}
      >
        <DialogContent>
          {error && (
            <p className="inline-warning" role="alert">
              {error}
            </p>
          )}
          {editing && (
            <>
              <div className="eyebrow">A WORK IN YOUR CATALOG</div>
              <DialogTitle>{editing.title || "Add a film or book"}</DialogTitle>
              <DialogDescription>
                Operational facts are supplied by you. Qloo resolution confirms
                identity, not availability.
              </DialogDescription>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveItem();
                }}
              >
                <div className="form-grid">
                  <Field label="Category">
                    <select
                      value={editing.kind}
                      onChange={(e) => {
                        setEditing({
                          ...editing,
                          kind: e.target.value as CatalogItem["kind"],
                          entityId: undefined,
                        });
                        setSearchResults([]);
                      }}
                    >
                      <option value="movie">Film</option>
                      <option value="book">Book</option>
                    </select>
                  </Field>
                  <Field label="Year">
                    <input
                      type="number"
                      min={1800}
                      max={2100}
                      value={editing.year}
                      onChange={(e) =>
                        setEditing({ ...editing, year: Number(e.target.value) })
                      }
                    />
                  </Field>
                </div>
                <Field label="Title">
                  <input
                    required
                    value={editing.title}
                    maxLength={160}
                    onChange={(e) => {
                      setEditing({
                        ...editing,
                        title: e.target.value,
                        entityId: undefined,
                      });
                      setSearchResults([]);
                    }}
                  />
                </Field>
                <Field label="Director or author">
                  <input
                    value={editing.creator}
                    maxLength={120}
                    onChange={(e) =>
                      setEditing({ ...editing, creator: e.target.value })
                    }
                  />
                </Field>
                <Field label="Factual description">
                  <textarea
                    rows={2}
                    value={editing.description}
                    maxLength={600}
                    onChange={(e) =>
                      setEditing({ ...editing, description: e.target.value })
                    }
                  />
                </Field>
                <div className="form-grid">
                  <Field
                    label={`Event contribution cost (${brief.currency})`}
                    hint="Supplied event cost, not forecast sales or profit."
                  >
                    <input
                      type="number"
                      min={0}
                      max={100000}
                      required
                      value={editing.cost}
                      onChange={(e) =>
                        setEditing({ ...editing, cost: Number(e.target.value) })
                      }
                    />
                  </Field>
                  {editing.kind === "movie" ? (
                    <Field label="Runtime in minutes">
                      <input
                        type="number"
                        min={1}
                        max={400}
                        required
                        value={editing.runtime}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            runtime: Number(e.target.value),
                          })
                        }
                      />
                    </Field>
                  ) : (
                    <Field label="Available copies">
                      <input
                        type="number"
                        min={0}
                        max={10000}
                        required
                        value={editing.stock}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            stock: Number(e.target.value),
                          })
                        }
                      />
                    </Field>
                  )}
                </div>
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={editing.available}
                    onChange={(e) =>
                      setEditing({ ...editing, available: e.target.checked })
                    }
                  />{" "}
                  Available for this proposed event
                </label>
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={editing.verified}
                    onChange={(e) =>
                      setEditing({ ...editing, verified: e.target.checked })
                    }
                  />{" "}
                  I verified operational facts, including screening permission
                  where needed
                </label>
                <div className="entity-resolver">
                  <div>
                    <strong>Qloo entity</strong>
                    <span>
                      {editing.entityId ? "Confirmed match" : "Not resolved"}
                    </span>
                  </div>
                  {editing.entityId && <code>{editing.entityId}</code>}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={
                      !status?.qloo || searching || editing.title.length < 2
                    }
                    onClick={resolve}
                  >
                    {searching ? (
                      <LoaderCircle className="spin" size={15} />
                    ) : (
                      <Search size={15} />
                    )}{" "}
                    Find the exact work
                  </Button>
                  {!status?.qloo && (
                    <small>
                      Requires a Qloo key. No sample entity IDs are supplied.
                    </small>
                  )}
                  {searchResults.map((r) => (
                    <button
                      type="button"
                      className="search-result"
                      key={r.entityId}
                      onClick={() => {
                        setEditing({ ...editing, entityId: r.entityId });
                        setSearchResults([]);
                      }}
                    >
                      <strong>
                        {r.name} {r.year ? `(${r.year})` : ""}
                      </strong>
                      <span>{r.description || r.entityId}</span>
                      <small>Select this identity</small>
                    </button>
                  ))}
                </div>
                <div className="dialog-actions">
                  <Button type="submit">Save catalog item</Button>
                  {catalog.some((i) => i.id === editing.id) && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setCatalog((c) => c.filter((i) => i.id !== editing.id));
                        invalidate();
                        setEditing(null);
                      }}
                    >
                      <Trash2 size={15} /> Remove item
                    </Button>
                  )}
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
function PartnerCard({
  kind,
  name,
  count,
  accepted,
  onEdit,
  onCatalog,
}: {
  kind: "cinema" | "bookshop";
  name: string;
  count: number;
  accepted: boolean;
  onEdit: () => void;
  onCatalog: () => void;
}) {
  return (
    <section className={cn("partner-card", kind)}>
      <div className="partner-top">
        <span className="partner-symbol">
          {kind === "cinema" ? <Film size={22} /> : <BookOpen size={22} />}
        </span>
        <span className="eyebrow">
          {kind === "cinema" ? "THE CINEMA" : "THE BOOKSHOP"}
        </span>
        <button
          className="icon-button"
          aria-label={`Edit ${kind} brief`}
          onClick={onEdit}
        >
          <Pencil size={14} />
        </button>
      </div>
      <h2>{name}</h2>
      <p>
        {kind === "cinema"
          ? "A screen. A room. A new perspective."
          : "A shelf full of conversation starters."}
      </p>
      <button className="partner-catalog" onClick={onCatalog}>
        <span>
          {count} {kind === "cinema" ? "films" : "books"} in the catalog
        </span>
        <ChevronRight size={15} />
      </button>
      <div className="partner-bottom">
        {accepted ? <Check size={14} /> : <Circle size={11} />}
        <span>
          {accepted ? "Review recorded" : "Awaiting a shared proposal"}
        </span>
      </div>
    </section>
  );
}
function Constraint({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="constraint">
      <span className="constraint-icon">{icon}</span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </div>
  );
}
