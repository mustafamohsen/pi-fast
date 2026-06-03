# Validation

## Automated checks

Run before every implementation commit:

```bash
bun run check
bun run pack:dry-run
```

Current evidence:

- `bun run check` passes Biome, TypeScript typecheck, and Vitest.
- Unit tests cover parser behavior, config normalization, provider/model gating, enabled mutation, disabled no-op, explicit clear, and status formatting.
- `tests/fast-mode.benchmark.test.ts` measures local payload-mutation overhead. This is a regression guard for extension overhead, not a model-speed benchmark.
- `bun run pack:dry-run` includes only package runtime files: `CHANGELOG.md`, `README.md`, `package.json`, `extensions/fast-mode.ts`, and `src/fast-mode.ts`.
- Biome source checks are configured in `biome.jsonc`. Run `bun run biome:fix` to apply safe formatting, lint, and import-organization fixes.

## Manual Pi smoke test

Use a Pi session authenticated with ChatGPT/Codex subscription auth:

```bash
pi -e ./extensions/fast-mode.ts
```

Then test:

```text
/fast status
/fast on
/fast status
/fast off
/fast status
```

Expected behavior:

- Status shows whether Fast mode applies to the current model.
- Supported models currently allowlisted: `openai-codex/gpt-5.4`, `openai-codex/gpt-5.5`.
- Unsupported providers/models show an inactive/not-applicable warning instead of silently claiming Fast mode applies.

## CLI flags

For one-off runs, avoid writing the persisted config and use:

```bash
pi -e ./extensions/fast-mode.ts --model openai-codex/gpt-5.5 --fast on -p "say ok"
pi -e ./extensions/fast-mode.ts --model openai-codex/gpt-5.5 --fast off -p "say ok"
```

`--fast on|off` overrides saved config for that Pi process only.

Use diagnostic logging when validating provider mutation:

```bash
pi -e ./extensions/fast-mode.ts \
  --model openai-codex/gpt-5.5 \
  --fast on \
  --fast-verbose 3 \
  -p "say ok"
```

Verbosity levels:

- `0`: silent
- `1`: config source / CLI override
- `2`: provider-request decision, including model, changed, and reason
- `3`: sanitized payload fields only: `model`, `service_tier`, and `stream`

## Model response speed benchmark

Run the manual E2E benchmark with ChatGPT/Codex subscription auth:

```bash
bun run benchmark:e2e -- --iterations 10 --warmups 1
```

Optional arguments:

```bash
bun run benchmark:e2e -- \
  --model openai-codex/gpt-5.5 \
  --prompt "Write a short TypeScript function that reverses a string." \
  --iterations 30 \
  --warmups 2
```

The benchmark launches Pi repeatedly, interleaves `--fast off` and `--fast on`, and reports median/p95 wall-clock time. It includes Pi process startup and network variability, so interpret only large and repeated differences as evidence. If medians differ by only a few percent or p95 gets worse, the benchmark does not demonstrate practical value for Fast mode in that environment.

## Payload inspection without secrets

If runtime behavior needs confirmation, prefer `--fast-verbose 3`, which logs only sanitized payload fields. Do not log auth headers or credentials.

Expected payload behavior for supported Codex models:

- Fresh install, before `/fast on` or `/fast off`: no `service_tier` mutation.
- After `/fast on`: payload includes `service_tier: "priority"`.
- After `/fast off`: payload includes `service_tier: null` to clear sticky Fast tier state.

## Known caveat

Because this extension mutates the final provider payload after Pi's request options are built, Pi's displayed cost accounting may not include Fast-tier multipliers if the upstream response reports `service_tier: "default"`. Request behavior is the product contract; cost display should be verified during manual testing.
