# Git Workflow (Gitflow)

- **main**: Production branch -- never commit directly to it.
- **develop**: Long-lived integration branch -- kept indefinitely.
- **Feature branches**: Created off `develop`, short-lived, merged back via PR, deleted after merge.
- **Release branches**: Created from `develop` when ready for production. Merge into **both** `main` and back into `develop`, then delete.
- **Hotfix branches**: Branch off `main`, fix, merge into both `main` and `develop`.
- **STRICT**: Always use a release branch when merging `develop` to `main` -- never create a direct PR from `develop` to `main`.
- Features must be fully functional and tested before merging to `develop`.

# Versioning

- **Semver 3-part**: `vMAJOR.MINOR.PATCH` (e.g. `v1.0.0`, `v1.1.0`, `v1.0.1`).
- **Major**: Breaking changes. **Minor**: New features. **Patch**: Bug fixes.
- After merging a release branch into `main`, always create a **git tag** and a **GitHub Release** via `gh release create vX.Y.Z --target main --title "vX.Y.Z" --notes "..."`.
- Release branch naming: `release/vX.Y.Z` (matches the version tag).
- Current version: **v1.4.1**.

# Commit Rules

- Never add a Co-Authored-By watermark or any other watermark to commit messages.
