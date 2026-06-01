# Project Agent Instructions

## Scope

This repository is for a Pi extension that adds Codex Fast mode controls matching OpenAI's `/fast {on|off|status}` UX.

## Current phase

- Planning and repository setup only.
- Do not implement the extension until the user explicitly asks to build.

## Source-of-truth research

Before implementation, re-check the relevant current docs:

- Pi extension docs: `docs/extensions.md` in the installed Pi package.
- Pi package docs: `docs/packages.md`.
- Pi provider/model docs: `docs/providers.md` and `docs/models.md`.
- OpenAI Codex Speed docs: <https://developers.openai.com/codex/speed>.

Fast mode is not Pi thinking/reasoning level. OpenAI documents it as Codex service-tier behavior using `service_tier = "fast"` plus `[features].fast_mode = true` for persistent Codex CLI config, with `/fast on`, `/fast off`, and `/fast status` commands.

## Implementation guardrails

- Keep `/fast` limited to Codex/OpenAI Codex models that actually support Fast mode.
- Do not claim API-key Fast mode support unless verified; OpenAI docs state Fast mode credits apply when signed in with ChatGPT, while API-key usage uses standard API pricing.
- Avoid logging credentials or request auth headers.
- Treat `.env` as local-only and never commit it.
- Use Pi's `before_provider_request` hook for payload mutation only after confirming the provider payload shape.

## Git workflow

- Use `main` as the stable branch.
- Use short-lived feature branches for implementation work, for example `feat/fast-mode-extension`.
- Commit often and atomically using Conventional Commits.
- Include a descriptive commit body explaining what changed and why.
- Run relevant checks before committing implementation changes.
- Never push to a remote unless the user explicitly orders it.

## Validation expectations once implementation starts

- Unit-test command parsing and payload mutation behavior.
- Dry-run or inspect `before_provider_request` payloads without exposing secrets.
- Test `/fast on`, `/fast off`, and `/fast status` in Pi.
- Verify behavior on supported Codex models such as GPT-5.5/GPT-5.4 and on unsupported/non-Codex models.
