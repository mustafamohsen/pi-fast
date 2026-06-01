# pi-fast

Pi package extension for OpenAI Codex Fast mode controls:

```text
/fast on
/fast off
/fast status
```

Fast mode is implemented as a Codex service-tier request, not as Pi thinking/reasoning level.

## Status

Built for Pi `0.78.0` docs and OpenAI Codex docs current as of 2026-06-01.

## Install locally

From this repository:

```bash
pi install -l ./
# or try without installing:
pi -e ./extensions/fast-mode.ts
```

Then in Pi:

```text
/fast status
/fast on
/fast off
```

## Behavior

- `/fast on` persists Fast mode in `~/.pi/agent/fast-mode.json`.
- `/fast off` persists Fast mode off and sends an explicit service-tier clear for supported Codex models. Fresh installs leave disabled requests untouched until the user runs `/fast off`.
- `/fast status` reports the current setting and whether it applies to the selected model.
- Requests are mutated only for Pi's built-in OpenAI Codex provider and currently allowlisted models: `gpt-5.4`, `gpt-5.5`.
- OpenAI's Codex config UX stores user-facing Fast mode as `service_tier = "fast"`. Current Codex catalog/request behavior maps that Fast tier to request value `priority`, so this extension defaults to `service_tier: "priority"` in Pi's provider payload. The value is stored in config so it can be changed if OpenAI's catalog changes.

## Limitations

OpenAI documents Fast mode credits for Codex when signed in with ChatGPT. API-key usage uses standard API pricing, so this extension does not claim API-key Fast-credit support.

## Development

```bash
npm install
npm run check
npm run pack:dry-run
```

See `docs/execution-plan.md`, `docs/git-workflow.md`, and `docs/validation.md`.

## Versioning

This package uses semver. See `CHANGELOG.md` for release notes.
