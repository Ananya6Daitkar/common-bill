"use client";
import { useState } from "react";
import type { Plan } from "@/lib/types";
import { evaluationRecord, type Observation } from "@/lib/evaluation";
import { Button } from "./ui/button";
export function OperatorObservation({ a, b, vote, onReveal }: { a: Plan; b: Plan; vote: string | null; onReveal: () => void }) {
  const [startedAt] = useState(()=>Date.now());
  const [role,setRole] = useState<Observation["role"]>("demo reviewer");
  const [context,setContext] = useState<Observation["context"]>("illustrative demo");
  const [reason,setReason] = useState("");
  const [willingness,setWillingness] = useState<Observation["willingness"]>("not an operator");
  const [changes,setChanges] = useState("");
  const [consent,setConsent] = useState(false);
  const [record,setRecord] = useState<ReturnType<typeof evaluationRecord>|null>(null);
  const [error,setError] = useState("");
  function lock() {
    try { const r=evaluationRecord(a,b,vote || "",{role,context,reason,willingness,changes,consent},startedAt); setRecord(r);setError("");onReveal(); }
    catch(e) {setError(e instanceof Error ? e.message : "Complete the observation.");}
  }
  return <section className="operator-observation" aria-label="Record a blind observation">
    <h3>{record ? "Preference locked before reveal" : "Record your judgment before reveal"}</h3>
    <p>No names or contact details needed. This record stays in this page until you export it; it is not sent to a research database.</p>
    {!record ? <>
      <div className="observation-fields">
        <label>Your role<select value={role} onChange={e=>setRole(e.target.value as Observation["role"])}><option>demo reviewer</option><option>cinema programmer</option><option>bookseller</option><option>other operator</option></select></label>
        <label>Task context<select value={context} onChange={e=>setContext(e.target.value as Observation["context"])}><option>illustrative demo</option>{!a.illustrative && !b.illustrative && <option>real planning task</option>}</select></label>
        <label>Would you consider running your preferred proposal?<select value={willingness} onChange={e=>setWillingness(e.target.value as Observation["willingness"])}><option>not an operator</option><option>yes</option><option>with changes</option><option>no</option></select></label>
      </div>
      <label>Why this preference? Include any concern about either proposal.<textarea value={reason} maxLength={1200} rows={3} onChange={e=>setReason(e.target.value)} /></label>
      <label>What would need to change before an event could happen?<textarea value={changes} maxLength={1200} rows={2} onChange={e=>setChanges(e.target.value)} /></label>
      <label className="observation-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> I agree to include this anonymous feedback in an exported evaluation record.</label>
      <Button onClick={lock} disabled={!vote || !consent || reason.trim().length<15}>Lock preference & reveal methods</Button>
    </> : <><p>Recorded: <strong>{record.vote === "a" || record.vote === "b" ? `Proposal ${record.vote.toUpperCase()}` : record.vote}</strong>. {record.observation.reason}</p><Button variant="outline" onClick={()=>{const blob=new Blob([JSON.stringify(record,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download="common-bill-observation.json";document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}}>Export locked observation</Button><details><summary>Read or copy the evaluation record</summary><textarea aria-label="Evaluation record" readOnly rows={12} value={JSON.stringify(record,null,2)}/></details></>}
    {error && <p role="alert">{error}</p>}
    <small>A demo review is not operator validation. A small operator pilot is not proof of attendance, revenue, or time savings.</small>
  </section>;
}
