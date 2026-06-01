# Release checklist

Use this checklist before pushing a release branch or tag.

## Before the tag

1. Confirm the working tree contains only intentional changes.
2. Run checks:

   ```bash
   npm run check
   npm run pack:dry-run
   ```

3. Check package contents from `npm run pack:dry-run`.
4. Read `README.md` once as a user would.
5. Confirm `CHANGELOG.md` has an entry for the version.
6. Confirm `package.json` and `package-lock.json` have the same version.

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
