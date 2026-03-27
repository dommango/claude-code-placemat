# Claude Code Reference Dashboard

Single-page reference for Claude Code — commands, shortcuts, flags,
configuration, hooks, MCP, skills, and agents.

**Live:** https://dommango.github.io/claude-code-dashboard/

## How It Stays Current

A cloud-scheduled Claude Code task runs daily during off-peak hours.
It fetches the official changelog, compares against the current
dashboard version, and opens a PR with proposed updates for review.

### Update Process
1. Scheduled task detects new CC release(s)
2. Parses changelog, maps changes to dashboard sections
3. Creates updated draft on a `claude/` branch
4. Opens PR with change summary
5. Human reviews and merges
6. GitHub Pages auto-deploys

## Attribution

- **Initial compilation** — Based on reference material curated by
  [AI Edge](https://x.com/aiedge)
- **Automated updates** — Powered by
  [claude-changelog](https://github.com/jheur) by jheur
- **Dashboard design & maintenance** — Built with
  [Claude Code](https://claude.ai/code)

## License

MIT
