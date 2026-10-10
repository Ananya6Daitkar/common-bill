import test from "node:test";
import assert from "node:assert/strict";
import { askPlanner } from "../lib/llm";

test("Groq uses strict structured output and rejects malformed decisions", async () => {
  const originalFetch = globalThis.fetch;
  const previous = { ...process.env };
  process.env.LLM_PROVIDER = "groq";
  process.env.LLM_MODEL = "openai/gpt-oss-120b";
  process.env.LLM_API_KEY = "test-only-key";
  let malformed = false;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "https://api.groq.com/openai/v1/chat/completions");
    assert.equal(options?.redirect, "manual");
    const body = JSON.parse(String(options?.body));
    assert.equal(body.response_format.json_schema.strict, true);
    assert.equal(body.messages[1].role, "user");
    return Response.json({
      choices: [
        {
          message: {
            content: JSON.stringify(
              malformed
                ? { selectedPairId: 123 }
                : {
                    selectedPairId: "pair",
                    priorityFilmIds: [],
                    rationale: "Test",
                    hostBrief: "Draft",
                    announcement: "Draft",
                  },
            ),
          },
        },
      ],
    });
  };
  try {
    assert.equal(
      (await askPlanner({ stage: "selection" })).selectedPairId,
      "pair",
    );
    malformed = true;
    await assert.rejects(
      askPlanner({ stage: "selection" }),
      /invalid planning decision/,
    );
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of ["LLM_PROVIDER", "LLM_MODEL", "LLM_API_KEY"]) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});
