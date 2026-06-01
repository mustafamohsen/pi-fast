# Validation

## Automated checks

Run before every implementation commit:

```bash
npm run check
npm run pack:dry-run
```

Current evidence:

- `npm run check` passes TypeScript typecheck and Vitest.
- Unit tests cover parser behavior, config normalization, provider/model gating, enabled mutation, disabled no-op, explicit clear, and status formatting.
- `npm run pack:dry-run` includes only package runtime files: `CHANGELOG.md`, `README.md`, `package.json`, `extensions/fast-mode.ts`, and `src/fast-mode.ts`.

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

## Payload inspection without secrets

If runtime behavior needs confirmation, use Pi's `before_provider_request` hook to inspect only sanitized payload fields. Do not log auth headers or credentials.

Expected payload behavior for supported Codex models:

- Fresh install, before `/fast on` or `/fast off`: no `service_tier` mutation.
- After `/fast on`: payload includes `service_tier: "priority"`.
- After `/fast off`: payload includes `service_tier: null` to clear sticky Fast tier state.

## Known caveat

Because this extension mutates the final provider payload after Pi's request options are built, Pi's displayed cost accounting may not include Fast-tier multipliers if the upstream response reports `service_tier: "default"`. Request behavior is the product contract; cost display should be verified during manual testing.
