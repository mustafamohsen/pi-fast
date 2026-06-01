I did not write `/Users/mustafamohsen/Projects/pi-fast/research/local-scout.md` because the active scout instructions are read-only/no-edit. Findings below.

# Code Context

## Files Retrieved

1. `README.md` (lines 1-11) - repo is planning-only for `/fast`.
2. `AGENTS.md` (lines 1-45) - guardrails: no implementation yet, use `before_provider_request`, limit to supported Codex/OpenAI Codex models.
3. `docs/execution-plan.md` (lines 1-93) - existing plan and acceptance criteria.
4. `.gitignore` (lines 1-20) - excludes `.env`, logs, `.pi/provider-payload.log`.
5. `/Users/mustafamohsen/.bun/install/global/node_modules/@earendil-works/pi-coding-agent/docs/extensions.md` (lines 53-149, 601-655, 883-936, 977-1016, 1375-1419) - extension API, command registration, provider hook.
6. `/Users/mustafamohsen/.bun/install/global/node_modules/@earendil-works/pi-coding-agent/docs/packages.md` (lines 1-149) - package manifest structure.
7. `/Users/mustafamohsen/.bun/install/global/node_modules/@earendil-works/pi-coding-agent/docs/providers.md` (lines 1-78) - OpenAI Codex auth provider and API key caveat.
8. `/Users/mustafamohsen/.bun/install/global/node_modules/@earendil-works/pi-coding-agent/docs/models.md` (lines 1-162) - custom provider/model shape.
9. `/Users/mustafamohsen/.bun/install/global/node_modules/@earendil-works/pi-coding-agent/examples/extensions/provider-payload.ts` (lines 1-16) - payload inspection example.
10. `/Users/mustafamohsen/.bun/install/global/node_modules/@earendil-works/pi-coding-agent/dist/core/extensions/types.d.ts` (lines 205-264, 456-462, 770-818) - exact extension context/event/command types.
11. `/Users/mustafamohsen/.bun/install/global/node_modules/@earendil-works/pi-ai/dist/providers/openai-codex-responses.js` (lines 300-348) - Codex request body shape and `service_tier` field.
12. `/Users/mustafamohsen/.bun/install/global/node_modules/@earendil-works/pi-ai/dist/models.generated.js` (lines 7055-7170) - built-in `openai-codex` provider models including GPT-5.4/GPT-5.5.
13. `/Users/mustafamohsen/.bun/install/global/node_modules/@earendil-works/pi-coding-agent/package.json` (lines 1-93) - Pi version 0.78.0, ESM, vitest.

## Key Code

Package structure should use Pi package manifest:

```json
{
  "keywords": ["pi-package"],
  "pi": {
    "extensions": ["./extensions"]
  },
  "peerDependencies": {
    "@earendil-works/pi-coding-agent": "*"
  }
}
```

Register command:

```ts
pi.registerCommand("fast", {
  description: "Manage OpenAI Codex Fast mode",
  handler: async (args, ctx) => {
    // parse: on | off | status
    ctx.ui.notify("...", "info");
  },
});
```

Provider hook:

```ts
pi.on("before_provider_request", (event, ctx) => {
  if (ctx.model?.provider !== "openai-codex") return;
  if (!["gpt-5.4", "gpt-5.5"].includes(ctx.model.id)) return;
  if (!isFastEnabled()) return;

  return { ...(event.payload as object), service_tier: "fast" };
});
```

Codex payload shape from `openai-codex-responses.js:316-348`:

```js
const body = {
  model: model.id,
  store: false,
  stream: true,
  instructions: context.systemPrompt || "You are a helpful assistant.",
  input: messages,
  text: { verbosity: options?.textVerbosity || "low" },
  include: ["reasoning.encrypted_content"],
  prompt_cache_key: clampOpenAIPromptCacheKey(options?.sessionId),
  tool_choice: "auto",
  parallel_tool_calls: true,
};
if (options?.serviceTier !== undefined) {
  body.service_tier = options.serviceTier;
}
```

Model gate source: `models.generated.js:7111-7158` defines `openai-codex` models `gpt-5.4`, `gpt-5.4-mini`, `gpt-5.5` using `api: "openai-codex-responses"` and `provider: "openai-codex"`.

## Architecture

This repo has no implementation files or `package.json` yet; it is planning-only. Pi extensions are TypeScript modules loaded from a Pi package via `package.json.pi.extensions`. `/fast` should be a single extension that owns command parsing/state plus a `before_provider_request` listener. The listener sees only `event.payload`; model gating should use `ctx.model` (`provider`, `id`, `api`) because `BeforeProviderRequestEvent` itself only has `payload`.

State needs a product decision later: existing plan suggests persistent config, but implementation can start with helper functions isolated for tests. Avoid logging payloads except via an explicit debug path; logs are gitignored.

## Start Here

Open `/Users/mustafamohsen/.bun/install/global/node_modules/@earendil-works/pi-ai/dist/providers/openai-codex-responses.js` lines 300-348 first; it confirms the exact `service_tier` insertion point and payload shape.