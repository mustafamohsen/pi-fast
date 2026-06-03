import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";

interface Args {
  iterations: number;
  warmups: number;
  model: string;
  prompt: string;
  extension: string;
  timeoutMs: number;
}

interface RunResult {
  mode: "off" | "on";
  iteration: number;
  elapsedMs: number;
  exitCode: number | null;
  outputBytes: number;
}

function parseArgs(): Args {
  const defaults: Args = {
    iterations: 5,
    warmups: 1,
    model: "openai-codex/gpt-5.5",
    prompt: "Reply with exactly: speed test ok",
    extension: "./extensions/fast-mode.ts",
    timeoutMs: 120_000,
  };

  const args = { ...defaults };
  for (let index = 2; index < process.argv.length; index += 1) {
    const flag = process.argv[index];
    const value = process.argv[index + 1];
    if (!value) continue;
    if (flag === "--iterations") args.iterations = Number(value);
    if (flag === "--warmups") args.warmups = Number(value);
    if (flag === "--model") args.model = value;
    if (flag === "--prompt") args.prompt = value;
    if (flag === "--extension") args.extension = value;
    if (flag === "--timeout-ms") args.timeoutMs = Number(value);
    if (flag.startsWith("--")) index += 1;
  }
  return args;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? Number.NaN;
}

function percentile(values: number[], percentileValue: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentileValue / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))] ?? Number.NaN;
}

function runPi(args: Args, mode: "off" | "on", iteration: number): RunResult {
  const start = performance.now();
  const result = spawnSync(
    "pi",
    [
      "-e",
      resolve(args.extension),
      "--model",
      args.model,
      "--fast",
      mode,
      "--no-session",
      "--mode",
      "text",
      "-p",
      args.prompt,
    ],
    {
      encoding: "utf8",
      timeout: args.timeoutMs,
      env: process.env,
    },
  );
  const elapsedMs = performance.now() - start;
  const combinedOutput = `${result.stdout ?? ""}${result.stderr ?? ""}`;

  if (result.error) {
    throw new Error(`${mode} iteration ${iteration} failed: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`${mode} iteration ${iteration} exited ${result.status}:\n${combinedOutput.slice(-2_000)}`);
  }

  return { mode, iteration, elapsedMs, exitCode: result.status, outputBytes: combinedOutput.length };
}

function main(): void {
  const args = parseArgs();
  const results: RunResult[] = [];
  console.log(`Model response speed benchmark: ${args.model}`);
  console.log(`Prompt: ${args.prompt}`);
  console.log(`Warmups per mode: ${args.warmups}; measured iterations per mode: ${args.iterations}`);

  for (let index = 0; index < args.warmups; index += 1) {
    runPi(args, "off", index + 1);
    runPi(args, "on", index + 1);
  }

  for (let index = 0; index < args.iterations; index += 1) {
    // Interleave to reduce time-of-day and transient load bias.
    results.push(runPi(args, "off", index + 1));
    results.push(runPi(args, "on", index + 1));
  }

  console.table(
    results.map((result) => ({
      mode: result.mode,
      iteration: result.iteration,
      elapsedMs: result.elapsedMs.toFixed(0),
      outputBytes: result.outputBytes,
    })),
  );

  for (const mode of ["off", "on"] as const) {
    const values = results.filter((result) => result.mode === mode).map((result) => result.elapsedMs);
    console.log(
      `${mode}: median=${median(values).toFixed(0)}ms p95=${percentile(values, 95).toFixed(0)}ms min=${Math.min(...values).toFixed(0)}ms max=${Math.max(...values).toFixed(0)}ms`,
    );
  }
}

main();
