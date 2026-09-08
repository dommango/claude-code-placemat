<!-- Thanks for the PR. The bot uses the `claude/placemat-update-vX.Y.Z` branch prefix
     for automated CC-release updates — human PRs should use any other branch name. -->

## What this changes

<!-- One or two sentences. Link any related issue. -->

## Type

- [ ] Bug fix (broken layout, link, behavior)
- [ ] Content correction (wrong/outdated/missing entry)
- [ ] Design / CSS / accessibility
- [ ] Style guide or structural change
- [ ] Docs (README / CONTRIBUTING / CLAUDE.md)
- [ ] CI / tooling

## Checklist

- [ ] I read the **Style Guide** and **Content Rules** sections of [CLAUDE.md](../CLAUDE.md)
- [ ] No `versions/*.html` files were edited (they're frozen snapshots)
- [ ] Unverified items are marked with `class="unverified"` (nothing writes `class="new"` — the page computes that per visitor)
- [ ] New rows have an `id="i-<slug>"` and a matching `.row-link` permalink
- [ ] No summary over 90 characters; behaviour changes went into notes, not the summary
- [ ] No code text is truncated with `...`
- [ ] `node tests/placemat.test.js` passes
- [ ] `node scripts/build-changes.js` was run if `changelog.html` changed
- [ ] I previewed locally (`python3 -m http.server 8000`)
- [ ] HTML validation passes (CI will check)

## Source

<!-- For content changes: link the official changelog entry, docs page, or commit that confirms this. -->
