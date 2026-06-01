# pi-fast

`pi-fast` adds a small `/fast` command to Pi for OpenAI Codex models.

```text
/fast on
/fast off
/fast status
```

This is alpha software. It works against the Pi and Codex behavior I verified on 2026-06-01, but OpenAI's Codex service-tier catalog can change. The extension keeps the request tier configurable for that reason.

## What it does

OpenAI's Codex docs describe Fast mode as a service tier, not a reasoning setting. This extension follows that model.

When Fast mode is on and the selected model is supported, the extension adds a service-tier field to Pi's outgoing Codex provider payload. It does not change Pi's thinking level.

Current model allowlist:

- `openai-codex/gpt-5.4`
- `openai-codex/gpt-5.5`

The extension only applies to Pi's built-in `openai-codex` provider. It will not silently enable Fast mode for custom OpenAI-compatible providers or normal OpenAI API-key usage.

## Install

From this repository:

```bash
pi install -l ./
```

Or try it for one session:

```bash
pi -e ./extensions/fast-mode.ts
```

Restart Pi or run `/reload`, then use:

```text
/fast status
/fast on
/fast off
```

## Behavior

`/fast on` saves the setting in `~/.pi/agent/fast-mode.json`.

`/fast off` saves Fast mode as off. It also sends an explicit service-tier clear for supported Codex models, which avoids sticky Fast state in Codex app-server sessions.

A fresh install does not touch disabled Codex requests until you run `/fast off` or `/fast on`.

`/fast status` reports the saved setting and whether it applies to the current model.

## About `fast` vs `priority`

OpenAI's Codex config uses the user-facing value:

```toml
service_tier = "fast"

[features]
fast_mode = true
```

The current Codex catalog/request tier for that Fast mode is `priority`. For Pi's provider payload, this extension defaults to:

```json
{ "service_tier": "priority" }
```

If OpenAI changes the catalog value later, update `requestServiceTier` in `~/.pi/agent/fast-mode.json` or ship a new package version.

## Limits

OpenAI documents Fast mode credits for Codex when you are signed in with ChatGPT. API-key usage follows standard API pricing, so this extension does not claim API-key Fast-credit support.

Because the extension mutates the final provider payload, Pi's displayed cost may not include Fast-tier multipliers if the upstream response reports the tier as `default`. The request behavior is the important part; verify billing separately if you rely on cost display.

## Development

```bash
bun install
bun run check
bun run pack:dry-run
```

This repo uses Biome for linting, formatting, and import organization:

```bash
bun run format
bun run lint
bun run biome:check
```

Useful docs:

- `docs/execution-plan.md`
- `docs/validation.md`
- `docs/git-workflow.md`

## CI and releases

GitHub Actions runs `bun run check` and `bun run pack:dry-run` on pushes to `main` and pull requests.

Pushing an alpha tag like `v0.1.0-alpha.0` builds a package tarball and attaches it to a GitHub prerelease. The workflow checks that the tag matches `package.json`. It does not publish to npm.

## Versioning

This project uses semver prereleases while the extension is alpha. The first alpha is `0.1.0-alpha.0`, tagged as `v0.1.0-alpha.0`.

See `CHANGELOG.md` for release notes.
