# Release checklist

Use this checklist before pushing a release branch or tag.

## Before the tag

1. Confirm the working tree contains only intentional changes.
2. Run checks:

   ```bash
   bun run check
   bun run pack:dry-run
   ```

3. Check package contents from `bun run pack:dry-run`.
4. Read `README.md` once as a user would.
5. Confirm `CHANGELOG.md` has an entry for the version.
6. Confirm `package.json` and `bun.lock` have the expected release version.

## Tagging

Use annotated tags:

```bash
git tag -a v0.1.0-alpha.0 -m "v0.1.0-alpha.0"
```

## Push policy

Do not push commits or tags unless the user explicitly asks.

When the user explicitly asks:

```bash
git push origin main
git push origin v0.1.0-alpha.0
```

Pushing an alpha tag runs the release workflow. It verifies the tag matches `package.json`, creates a GitHub prerelease, and attaches the packed `.tgz` artifact. It does not publish to npm.
