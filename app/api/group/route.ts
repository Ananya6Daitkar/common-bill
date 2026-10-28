import { groupSchema } from "@/lib/group";
import { planGroup } from "@/lib/group-server";
import { assertSameOrigin, readBody, failure } from "@/lib/http";
import { ServiceError } from "@/lib/qloo";
export const maxDuration = 180;
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const parsed = groupSchema.safeParse(await readBody(request));
    if (!parsed.success)
      throw new ServiceError(
        "Choose 2–4 distinct participants, supported favorites, and a valid time limit.",
        400,
      );
    return Response.json(await planGroup(parsed.data), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return failure(e);
  }
}
