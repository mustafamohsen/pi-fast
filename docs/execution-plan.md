# Execution Plan: Pi Codex Fast Mode Extension

## Research snapshot

Date: 2026-06-01
Pi version inspected: 0.78.0

OpenAI Codex Speed docs state:

- Fast mode is a Codex service-tier/speed feature, not reasoning effort.
- It supports GPT-5.5 and GPT-5.4 at the time of research.
- It increases supported model speed by about 1.5x and consumes credits faster.
- Codex CLI UX is `/fast on`, `/fast off`, and `/fast status`.
- Persistent Codex CLI config uses `service_tier = "fast"` and `[features].fast_mode = true`.
- Fast mode credits are available when signed in with ChatGPT; API-key usage uses standard API pricing instead.

Pi docs state:

- Extensions can register slash commands with `pi.registerCommand()`.
- Extensions can inspect and replace provider payloads via `before_provider_request`.
- Extensions can show notifications/status via `ctx.ui`.
- Pi supports ChatGPT Plus/Pro (Codex) subscription auth via `/login`.

## Goal

Create a Pi extension/package that adds:

```text
/fast on
/fast off
/fast status
```

When enabled and a supported Codex model is used, outgoing provider payloads should request Fast mode by setting the Codex/OpenAI service tier. OpenAI's user-facing Codex config uses `service_tier = "fast"`, while current Codex catalog/request behavior maps the Fast tier to request value `priority`; the implementation should document and test the chosen outbound value.

## Non-goals

- Do not change Pi core.
- Do not confuse Fast mode with Pi thinking level.
- Do not enable Fast mode for API-key OpenAI usage unless verified to be accepted and meaningful.
- Do not implement Codex-Spark selection; it is a separate model choice, not Fast mode.

## Proposed implementation phases

### Phase 1: Verify current API and request shape

1. Re-read OpenAI Codex Speed docs.
2. Re-read Pi extension docs and examples for commands, status UI, and provider payload hooks.
3. Inspect Pi's current OpenAI Codex provider payload shape.
4. Use a safe payload-inspection extension or test harness to confirm where `service_tier` should be inserted.

### Phase 2: Package scaffold

1. Add `package.json` with Pi package metadata and peer dependencies for Pi packages.
2. Add `extensions/fast-mode.ts` as the extension entrypoint.
3. Add `src/` helpers only if the extension grows beyond one file.
4. Add TypeScript/test tooling if useful.

### Phase 3: State and command behavior

1. Implement `/fast` argument parsing for `on`, `off`, and `status`.
2. Persist the user's desired Fast mode state across sessions in an explicit extension-owned config file, unless the user chooses session-only behavior before build.
3. Show concise notifications and a footer/status indicator when UI is available.
4. Return helpful errors for unknown arguments.

### Phase 4: Payload mutation

1. In `before_provider_request`, gate on the active provider/model.
2. If Fast mode is enabled and the model is supported, set the validated Fast request tier on the outgoing provider payload.
3. If Fast mode is disabled, leave fresh disabled payloads unchanged; after an explicit `/fast off`, send a safe service-tier clear only for supported Codex models.
4. Report status clearly when Fast mode is enabled but not applicable to the selected model/provider.

### Phase 5: Validation

1. Unit-test parser and payload mutation helpers.
2. Dry-run with payload logging to verify the validated Fast request tier is present only when expected.
3. Interactive smoke-test:
   - `/fast status`
   - `/fast on`
   - one harmless prompt on GPT-5.5 or GPT-5.4 via OpenAI Codex subscription auth
   - `/fast off`
   - another harmless prompt confirming no Fast mode payload mutation
4. Test unsupported model/provider behavior.

### Phase 6: Documentation and handoff

1. Document install options: local path, project-local Pi package, or user-global Pi package.
2. Document limitations around ChatGPT subscription auth versus API keys.
3. Document troubleshooting and how to inspect payloads safely.

## Acceptance criteria

- `/fast on`, `/fast off`, and `/fast status` are registered Pi commands.
- Fast mode state is visible to the user.
- When enabled, supported Codex requests include the validated Fast service-tier request value, currently `service_tier: "priority"` for Pi's Codex payload path.
- Unsupported models/providers do not silently claim Fast mode is active.
- Tests cover parsing, state transitions, and payload mutation gates.
- No secrets are logged or committed.

## Open implementation decision before build

Confirm whether Fast mode state should be global/user-persistent, project-local, or session-only. The default plan is global/user-persistent because OpenAI documents Fast mode as a persistent Codex CLI setting.
