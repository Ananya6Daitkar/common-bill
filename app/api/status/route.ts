import { qlooVerification } from "@/lib/qloo";
import { llmReady } from "@/lib/llm";
export const dynamic = "force-dynamic";
export function GET() {
  return Response.json(
    {
      publicDemo: process.env.PUBLIC_DEMO_ENABLED === "true",
      qloo: Boolean(process.env.QLOO_API_KEY),
      llm: llmReady(),
      provider: process.env.LLM_PROVIDER || null,
      model: process.env.LLM_MODEL || null,
      accessRequired:
        Boolean(process.env.COMMON_BILL_ACCESS_TOKEN) ||
        process.env.NODE_ENV === "production",
      liveVerified: Boolean(qlooVerification()),
      verifiedAt: qlooVerification()?.at || null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
