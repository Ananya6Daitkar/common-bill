import { demoRequestSchema, runDemo } from "@/lib/demo";
import { assertSameOrigin, failure, readBody } from "@/lib/http";
import { ServiceError } from "@/lib/qloo";
export const maxDuration = 180;
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = demoRequestSchema.safeParse(await readBody(request));
    if (!input.success)
      throw new ServiceError(
        "Choose one of the supported public demo scenarios.",
        400,
      );
    return Response.json(await runDemo(input.data), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return failure(e);
  }
}
