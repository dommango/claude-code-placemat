# Claude Code Dashboard

Single-page HTML reference for Claude Code commands, shortcuts, flags, config, and extensibility.

## Structure

```
index.html          — Current dashboard (edit this)
changelog.html      — Detailed changelog across versions
versions/           — Archived snapshots (read-only, never edit)
```

## Versioning

- `index.html` is always the latest version
- When releasing a new version, copy `index.html` into `versions/vN.N.html` before making changes
- Update the `<title>` and header version tag to match the Claude Code version it covers
- Add a new version block to `changelog.html` documenting what changed

## Style Guide

- Dark-first design using Anthropic brand colors (`--anthropic-coral: #d97757`, `--anthropic-teal: #879d86`)
- All content is searchable via the global search (Ctrl+K)
- Tables use `0.8rem` font, `4px 6px` cell padding, fixed first-column width at 42%
- Every `<code>` element is click-to-copy
- Item status is shown via shaded code backgrounds, not badges:
  - Default (dark bg): verified
  - Teal-tinted bg (`code.new`): new in recent release
  - Yellow-tinted bg (`code.unverified`): unverified
- A legend at the top of the dashboard explains the shading
- Card headings are uppercase with letter-spacing
- Code elements use `word-break: break-word` — never truncate with `...`
- No external dependencies — everything is self-contained in a single HTML file

## Content Rules

- Only include features that are verified against official docs or the changelog
- Mark unverified items with the `unverified` class on the `<code>` element
- Mark new items (recent release) with the `new` class — remove after 2+ versions
- Never truncate code text with `...` — always show the full command/flag/path
- Changelog entries use tags: `ADD`, `CHG`, `FIX`, `DEL` with corresponding CSS classes
- Changelog separates **Template/Structure** changes from **Content/CC Release** changes

## Automated Update Pipeline

A cloud-scheduled task (`RemoteTrigger`) runs daily at 5:00 AM to check for new CC releases.

**Flow:**
1. Scheduled agent reads current CC version from `index.html` header
2. Fetches official changelog, filters entries newer than current version
3. If no updates → exits silently
4. If updates found:
   - Categorizes changes against dashboard sections
   - Snapshots current `index.html` to `versions/`
   - Applies changes to a working copy
   - Marks new items with `class="new"`, shifts old "new" to default
   - Updates `changelog.html` with new version block
   - Commits, pushes to `claude/dashboard-update-vX.Y.Z` branch
   - Opens PR with change summary
5. Human reviews PR on GitHub, merges to main
6. GitHub Pages auto-deploys

**Branch convention:** `claude/dashboard-update-vX.Y.Z`
**Commit format:** `feat: update dashboard for CC vX.Y.Z`

## Manual Validation Workflow

When updating manually for a new Claude Code version:
1. Fetch the changelog: `https://code.claude.com/docs/en/changelog`
2. Check cursor date in `~/.claude/changelog_cursor.txt`
3. Cross-reference new features against existing dashboard content
4. Add/update/remove entries as needed
5. Snapshot current `index.html` to `versions/` before editing
6. Update `changelog.html` with a new version block
7. Update cursor date
