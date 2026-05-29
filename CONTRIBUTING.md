# Contributing

Thanks for the interest. This project is partly bot-maintained, partly human —
here's how the split works so you know where to land.

## Who owns what

| Area | Owner |
|------|-------|
| New CC release content (commands, flags, config keys) | **Bot** — daily auto-PR |
| Bug fixes (broken layout, typos, dead links) | **Humans** |
| Design / CSS / accessibility / responsive tweaks | **Humans** |
| Style guide changes and structural rework | **Humans** |
| Content corrections to existing entries | **Either** — PRs welcome |
| New version snapshots into `versions/` | **Bot** at release; humans for historical |

If the bot is about to make the same change you're planning, it'll show up as an
open `claude/placemat-update-vX.Y.Z` PR — comment there instead of opening a duplicate.

## Ground rules

Before opening a PR, skim [CLAUDE.md](CLAUDE.md) — the Style Guide and Content
Rules sections are short and they're what reviewers check against. Key points:

- **Verified content only.** New commands/flags must be backed by the official
  [CC changelog](https://code.claude.com/docs/en/changelog) or docs. Anything
  not yet confirmed goes in with `class="unverified"`.
- **Mark new items.** Recent-release additions get `class="new"` and an
  `<!-- added:vX.Y.Z -->` tracking comment.
- **Never truncate code with `...`.** Show the full flag/path.
- **Don't edit `versions/*.html`.** Those are frozen snapshots.
- **No external dependencies.** Inline what you need or add it to `placemat.css`.

## Workflow

1. Open an issue first for non-trivial changes — design rework, new sections,
   or anything that touches the auto-update pipeline.
2. Fork, branch from `main`, keep changes scoped to one concern per PR.
3. Test locally: `python3 -m http.server 8000` and click through.
4. PR against `main`. CI runs HTML validation; please address failures before
   requesting review.

## Reporting issues

- **Bugs / broken content** → use the *Bug report* template
- **Wrong or outdated entry** → use the *Content correction* template
- **Security** → see [SECURITY.md](SECURITY.md), do not file publicly

## Code of Conduct

Participation is governed by the [Code of Conduct](CODE_OF_CONDUCT.md).
