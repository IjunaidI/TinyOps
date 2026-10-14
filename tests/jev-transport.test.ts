import test from "node:test";
import assert from "node:assert/strict";
import { JevClient } from "../src/ai/jev";

const DUMMY_KEY = "dummy-test-key-never-sent-to-a-network";
const GENERIC_400 =
  "OpenRouter returned HTTP 400. Local assistance is available.";
const INPUT_LIMIT = "The city briefing exceeded Jev’s input limit (HTTP 400).";

async function withFetch(
  fetcher: typeof fetch,
  run: (client: JevClient) => Promise<void>,
) {
  const previous = globalThis.fetch;
  const client = new JevClient();
  globalThis.fetch = fetcher;
  try {
    await run(client);
  } finally {
    client.clearKey();
    globalThis.fetch = previous;
  }
}

test("nested provider token-limit errors become a safe, actionable message", async () => {
  let calls = 0;
  await withFetch(
    async () => {
      calls++;
      return Response.json(
        {
          error: {
            message:
              'HTTP 400: {"detail":{"error_type":"max_tokens_exceeded"}}',
            metadata: { privateRequest: "Sensitive civic briefing" },
          },
        },
        { status: 400 },
      );
    },
    async (client) => {
      const decision = await client.connect(DUMMY_KEY);
      assert.equal(decision.error, INPUT_LIMIT);
      assert.equal(client.error, INPUT_LIMIT);
      assert.equal(client.connected, false);
      assert.equal(client.status, "error");
      assert.equal(calls, 1, "A validation failure must not be retried");
      assert.equal(client.attempts, 1);
      assert.doesNotMatch(JSON.stringify(client.decisions), /Sensitive civic/);
    },
  );
});

test("context_length_exceeded is recognized without exposing provider text", async () => {
  await withFetch(
    async () =>
      Response.json(
        {
          error: {
            code: "context_length_exceeded",
            message: `Echoed request and credential: ${DUMMY_KEY}`,
          },
        },
        { status: 400 },
      ),
    async (client) => {
      const decision = await client.connect(DUMMY_KEY);
      assert.equal(decision.error, INPUT_LIMIT);
      assert.doesNotMatch(JSON.stringify(client.decisions), /dummy-test-key/);
    },
  );
});

test("unknown HTTP 400 responses never echo server bodies or credentials", async () => {
  await withFetch(
    async () =>
      Response.json(
        {
          error: {
            message: `Private note mentions max_tokens_exceeded: ${DUMMY_KEY}`,
            request: { text: "Do not reveal this citizen request." },
          },
        },
        { status: 400 },
      ),
    async (client) => {
      const decision = await client.connect(DUMMY_KEY);
      assert.equal(decision.error, GENERIC_400);
      assert.equal(client.error, GENERIC_400);
      assert.doesNotMatch(
        JSON.stringify(client.decisions),
        /dummy-test-key|Private note|Do not reveal/,
      );
    },
  );
});

test("malformed error bodies retain the generic HTTP failure", async () => {
  await withFetch(
    async () =>
      new Response('<html>{"error":"max_tokens_exceeded"}', { status: 400 }),
    async (client) => {
      const decision = await client.connect(DUMMY_KEY);
      assert.equal(decision.error, GENERIC_400);
      assert.equal(client.connected, false);
      assert.equal(client.attempts, 1);
    },
  );
});

test("oversized error bodies are canceled without parsing or displaying them", async () => {
  let canceled = false;
  let chunks = 0;
  await withFetch(
    async () =>
      new Response(
        new ReadableStream<Uint8Array>({
          pull(controller) {
            chunks++;
            controller.enqueue(new TextEncoder().encode("x".repeat(4_096)));
          },
          cancel() {
            canceled = true;
          },
        }),
        { status: 400 },
      ),
    async (client) => {
      const decision = await client.connect(DUMMY_KEY);
      assert.equal(decision.error, GENERIC_400);
      assert.equal(canceled, true);
      assert.ok(
        chunks <= 4,
        "Stop reading after the bounded error-body budget",
      );
    },
  );
});

test("the connection probe still accepts a valid Jev decision", async () => {
  await withFetch(
    async (url, options) => {
      assert.equal(url, "https://openrouter.ai/api/alpha/decisions");
      const body = JSON.parse(String(options?.body));
      assert.equal(body.model, "typesafe/jev-1.13");
      assert.match(
        body.questions.action.instructions,
        /conditional authorization.*citizen requests a future plan or explicitly accepts its conditions/i,
      );
      const answers = Object.fromEntries(
        Object.entries(body.questions).map(([id, question]) => {
          const q = question as {
            type: string;
            criteria?: Record<string, string>;
          };
          if (q.type === "noul") return [id, { type: "noul", noul: 0 }];
          const choices = Object.keys(q.criteria!);
          return [
            id,
            {
              type: "choice",
              choice: choices[0],
              confidence: 1,
              probabilities: Object.fromEntries(
                choices.map((choice, index) => [choice, index === 0 ? 1 : 0]),
              ),
            },
          ];
        }),
      );
      return Response.json({ model: "typesafe/jev-1.13-20260917", answers });
    },
    async (client) => {
      const decision = await client.connect(DUMMY_KEY);
      assert.equal(decision.source, "jev");
      assert.equal(decision.choice, "ready");
      assert.equal(decision.error, undefined);
      assert.equal(client.connected, true);
      assert.equal(client.status, "ready");
      assert.equal(client.lastModel, "typesafe/jev-1.13-20260917");
      assert.equal(client.attempts, 1);
    },
  );
});
