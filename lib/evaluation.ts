import { z } from "zod";
import type { Plan } from "./types";
export const observationSchema = z.object({
  role: z.enum(["cinema programmer", "bookseller", "other operator", "demo reviewer"]),
  context: z.enum(["illustrative demo", "real planning task"]),
  reason: z.string().trim().min(15, "Explain your preference in at least 15 characters.").max(1200),
  willingness: z.enum(["yes", "with changes", "no", "not an operator"]),
  changes: z.string().trim().max(1200),
  consent: z.literal(true),
});
export type Observation = z.infer<typeof observationSchema>;
export function evaluationRecord(a: Plan, b: Plan, vote: string, observation: unknown, startedAt: number, now = Date.now()) {
  const details = observationSchema.parse(observation);
  if (!["a", "b", "tie", "neither"].includes(vote)) throw Error("Record a preference before reveal.");
  if (!a.llmUsed || !b.llmUsed || a.model !== b.model || a.inputFingerprint !== b.inputFingerprint || new Set([a.mode,b.mode]).size !== 2 || ![a.mode,b.mode].includes("qloo") || ![a.mode,b.mode].includes("baseline")) throw Error("Comparison controls do not match.");
  if ((a.illustrative || b.illustrative) && details.context === "real planning task") throw Error("Illustrative inputs cannot be recorded as a real planning task.");
  return { schemaVersion: 1, recordedAt: new Date(now).toISOString(), observation: details, vote, preferredMethod: vote === "a" ? a.mode : vote === "b" ? b.mode : vote, blindAtRecording: true, reviewSeconds: Math.max(0,Math.round((now-startedAt)/1000)), inputFingerprint: a.inputFingerprint, model: a.model, proposals: { a, b }, scope: "One self-reported local observation. Reviewer identity is not verified. Review duration is not time saved. No attendance or revenue effect established." };
}
