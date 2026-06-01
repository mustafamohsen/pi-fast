# Changelog

## 0.1.0 - 2026-06-01

- Added Pi extension package scaffolding for Codex Fast mode.
- Added `/fast on`, `/fast off`, and `/fast status` extension command behavior.
- Added guarded provider payload mutation for Pi's built-in `openai-codex` provider on allowlisted Fast-capable models.
- Added unit tests for command parsing, payload mutation, provider/model gating, disabled behavior, and status formatting.
