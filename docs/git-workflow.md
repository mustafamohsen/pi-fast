# Git Workflow

## Branching

- `main` is the stable branch.
- Use feature branches for implementation, e.g. `feat/fast-mode-extension`.
- Keep each branch focused on one deliverable.

## Commit rules

Use Conventional Commits with a descriptive body:

```text
feat: add fast mode command parser

Implement parsing for /fast on, /fast off, and /fast status so the
extension can validate user input before mutating provider requests.
```

Recommended types:

- `chore:` repository setup, tooling, maintenance
- `docs:` docs-only changes
- `feat:` user-visible extension behavior
- `fix:` bug fixes
- `test:` test additions or corrections
- `refactor:` behavior-preserving code changes

## Local routine

1. Check status: `git status --short --branch`.
2. Make a small focused change.
3. Run relevant checks.
4. Review diff: `git diff --check` and `git diff`.
5. Commit with a Conventional Commit subject and body.
6. Keep the working tree clean before handing off.

## Remote policy

Do not push unless the user explicitly asks.
