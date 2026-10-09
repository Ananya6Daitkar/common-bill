import { planRequestSchema } from "@/lib/types";
import { createPlan } from "@/lib/planner";
import { authorize, failure, readBody } from "@/lib/http";
import { ServiceError } from "@/lib/qloo";
export const maxDuration = 180;
export async function POST(request: Request) {
  try {
    const parsed = planRequestSchema.safeParse(await readBody(request));
    if (!parsed.success)
      throw new ServiceError(
        parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ")
          .slice(0, 1000),
        400,
      );
    if (parsed.data.mode !== "rehearsal") authorize(request);
    const plan = await createPlan(parsed.data);
    return Response.json(plan, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return failure(e);
  }
}
