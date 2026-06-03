import { describe, expect, it } from "vitest";
import { applyFastModeToPayload, defaultConfig, type FastModeConfig, type ModelLike } from "../src/fast-mode.ts";

interface BenchmarkCase {
  name: string;
  config: FastModeConfig;
  model: ModelLike;
  payload: Record<string, unknown>;
}

function benchmarkMutation(
  testCase: BenchmarkCase,
  iterations: number,
): { totalMs: number; averageMicroseconds: number } {
  // Warm up the JIT and avoid measuring one-time setup costs.
  for (let index = 0; index < 5_000; index += 1) {
    applyFastModeToPayload(testCase.payload, testCase.model, testCase.config);
  }

  const start = process.hrtime.bigint();
  for (let index = 0; index < iterations; index += 1) {
    applyFastModeToPayload(testCase.payload, testCase.model, testCase.config);
  }
  const elapsedNanoseconds = Number(process.hrtime.bigint() - start);
  const totalMs = elapsedNanoseconds / 1_000_000;

  return {
    totalMs,
    averageMicroseconds: (totalMs * 1_000) / iterations,
  };
}

describe("fast mode payload mutation benchmark", () => {
  it("keeps per-request extension overhead negligible", () => {
    const iterations = 100_000;
    const supportedModel = { provider: "openai-codex", id: "gpt-5.5", api: "openai-codex-responses" };
    const cases: BenchmarkCase[] = [
      {
        name: "enabled supported Codex model",
        config: { ...defaultConfig(), enabled: true },
        model: supportedModel,
        payload: { model: "gpt-5.5", stream: true, input: "benchmark" },
      },
      {
        name: "disabled supported Codex model",
        config: { ...defaultConfig(), enabled: false, clearServiceTier: false },
        model: supportedModel,
        payload: { model: "gpt-5.5", stream: true, input: "benchmark" },
      },
      {
        name: "unsupported provider",
        config: { ...defaultConfig(), enabled: true },
        model: { provider: "openai", id: "gpt-5.5" },
        payload: { model: "gpt-5.5", stream: true, input: "benchmark" },
      },
    ];

    const results = cases.map((testCase) => ({ name: testCase.name, ...benchmarkMutation(testCase, iterations) }));

    // Keep this threshold intentionally generous so CI variance does not make the test flaky.
    // The observed local value should normally be far below this; any failure means this hook
    // is doing enough synchronous work to be suspicious for a per-provider-request path.
    for (const result of results) {
      expect(result.averageMicroseconds, `${result.name}: ${JSON.stringify(result)}`).toBeLessThan(50);
    }

    console.table(
      results.map((result) => ({
        case: result.name,
        totalMs: result.totalMs.toFixed(2),
        averageMicroseconds: result.averageMicroseconds.toFixed(3),
      })),
    );
  });
});
