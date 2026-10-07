import { timingSafeEqual } from "node:crypto";
import { ServiceError } from "./qloo";
const windows = new Map<string, { count: number; reset: number }>();
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  let matches = false;
  try {
    const parsed = new URL(origin);
    matches =
      origin === new URL(request.url).origin ||
      (parsed.host === request.headers.get("host") &&
        ["http:", "https:"].includes(parsed.protocol)) ||
      origin === process.env.PUBLIC_APP_ORIGIN;
  } catch {
    /* malformed origins fail closed */
  }
  if (!matches)
    throw new ServiceError("Cross-origin requests are not allowed.", 403);
}
export function authorize(request: Request) {
  assertSameOrigin(request);
  const expected = process.env.COMMON_BILL_ACCESS_TOKEN;
  if (process.env.NODE_ENV === "production" && !expected)
    throw new ServiceError(
      "Configure COMMON_BILL_ACCESS_TOKEN before enabling paid API routes on a public deployment.",
      503,
    );
  if (expected) {
    const actual = (request.headers.get("authorization") || "").replace(
      /^Bearer /,
      "",
    );
    const a = Buffer.from(actual),
      b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b))
      throw new ServiceError(
        "Enter the workspace access token in Connections.",
        401,
      );
  }
  // Single-process guard, not distributed rate limiting. Documented deployment limitation.
  const now = Date.now(),
    key = "workspace";
  let slot = windows.get(key);
  if (!slot || slot.reset < now) {
    slot = { count: 0, reset: now + 60000 };
    windows.set(key, slot);
  }
  if (++slot.count > 20)
    throw new ServiceError(
      "Workspace request limit reached. Please wait a minute.",
      429,
    );
}
export async function readBody(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 65536)
    throw new ServiceError("Request is too large.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new ServiceError("Request body is required.", 400);
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 65536) {
      await reader.cancel();
      throw new ServiceError("Request is too large.", 413);
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    throw new ServiceError("Request must contain valid JSON.", 400);
  }
}
export function failure(error: unknown) {
  return Response.json(
    {
      error:
        error instanceof ServiceError
          ? error.message
          : "The request could not be completed. Your saved draft is unchanged.",
    },
    { status: error instanceof ServiceError ? error.status : 500 },
  );
}
