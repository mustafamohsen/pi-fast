# Changelog

All notable changes to this project are recorded here.

This project uses semver. Alpha releases use prerelease versions such as `0.1.0-alpha.0`.

## [Unreleased]

- No unreleased changes yet.

## [0.1.0-alpha.0] - 2026-06-01

First alpha release.

### Added

- Added a Pi package extension that registers `/fast on`, `/fast off`, and `/fast status`.
- Added guarded payload mutation for Pi's built-in `openai-codex` provider.
- Added an allowlist for Fast-capable Codex models: `gpt-5.4` and `gpt-5.5`.
- Added persistent config at `~/.pi/agent/fast-mode.json`.
- Added unit tests for command parsing, config normalization, provider and model gating, payload mutation, disabled behavior, explicit service-tier clearing, and status formatting.
- Added validation docs and release notes.

### Notes

- OpenAI's user-facing Codex config uses `service_tier = "fast"`; the current Codex request tier for that mode is `priority`, so the extension sends `service_tier: "priority"` by default.
- API-key Fast-credit support is not claimed. OpenAI documents Fast mode credits for Codex when signed in with ChatGPT.

[Unreleased]: https://github.com/mustafamohsen/pi-fast/compare/v0.1.0-alpha.0...HEAD
[0.1.0-alpha.0]: https://github.com/mustafamohsen/pi-fast/releases/tag/v0.1.0-alpha.0
