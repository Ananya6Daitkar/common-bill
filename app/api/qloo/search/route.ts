import { authorize, failure } from "@/lib/http";
import { searchEntities, ServiceError } from "@/lib/qloo";
export async function GET(request: Request) {
  try {
    authorize(request);
    const p = new URL(request.url).searchParams,
      q = p.get("query") || "",
      kind = p.get("kind");
    if (
      q.length < 2 ||
      q.length > 160 ||
      !["movie", "book"].includes(kind || "")
    )
      throw new ServiceError("Supply a valid title and category.", 400);
    return Response.json(
      { results: await searchEntities(q, kind as "movie" | "book") },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
