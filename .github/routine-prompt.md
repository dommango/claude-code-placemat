You are updating the Claude Code Placemat.

STEP 1 — CHECK CURRENT VERSION
Read index.html and find the current CC version in the release-tag span (looks like "As of release: v2.1.86"). Extract the version number.

STEP 2 — FETCH CHANGELOG
Fetch https://code.claude.com/docs/en/changelog via WebFetch. Ask it to return all entries with their version labels, dates, and full bullet point text.

If WebFetch fails or returns empty/truncated content (no version headers found), retry once. If it still fails, commit no changes but open a PR titled "Placemat agent: changelog fetch failed on [today's date]" with the error details so the failure is visible rather than silent, then stop.

STEP 3 — COMPARE VERSIONS
Parse all entries newer than the current placemat version. Then cross-check: for each changelog bullet you'd classify as placemat-relevant, grep for its key term (command name, env var, setting name) in index.html. If a relevant item from a newer version is already present in the HTML, skip it individually but do NOT treat its presence as evidence the placemat is current — the release-tag span is authoritative for what version was officially processed.

If no genuinely new items remain AND the release tag already matches the latest CC version, output "Placemat is current at vX.Y.Z" and stop.

STEP 4 — CATEGORIZE CHANGES
For each new changelog entry, categorize bullets against placemat sections:

- Keyboard shortcuts (Keys & Shortcuts card)
- Slash commands (Core and Tools cards)
- CLI flags (CLI & Headless Flags card)
- Config files, JSON settings, env vars (Config & Environment card)
- Skill/agent frontmatter fields (Skills & Agent Frontmatter card)
- Hooks, rules, memory, MCP (Memory, Hooks & MCP card)

Filter to only placemat-relevant items. Skip pure bug fixes, platform-specific fixes, and performance tweaks unless they add/change/remove a user-facing command, flag, shortcut, or config key.

STEP 5 — PREPARE THE UPDATE
a. Read CLAUDE.md to understand all conventions

b. Copy current index.html content to work with

c. Handle class="new" retention:

- Items with class="new" include an HTML comment tracking when they were added, e.g. <!-- added:v2.1.85 -->
- Count how many CC releases have passed since that version. Only demote (remove class="new" and the tracking comment) if 3 or more CC releases have been published since the item was added.
- Example: if current is v2.1.88 and item was added at v2.1.85, that's 3 releases — demote it. If only v2.1.87, that's 2 — keep it.
- When adding NEW items, always include the tracking comment: <code class="new">command</code> <!-- added:vX.Y.Z -->
- CRITICAL: The vX.Y.Z in <!-- added:vX.Y.Z --> must be the CC changelog version where the feature FIRST APPEARED, NOT the placemat's current version. Example: if the placemat is at v2.1.88 and you're adding a feature from the v2.1.89 changelog entry, tag it <!-- added:v2.1.89 -->.

d. Add new table rows for new features, marking their <code> elements with class="new" and the tracking comment

e. Update or remove rows for changed/deprecated features

f. Update the release-tag span to show the latest CC version

g. Ensure NO code text is truncated with '...' — always show full text

h. Use word-break: break-word on code elements

i. Use shaded code backgrounds (class="new" / class="unverified"), never badges

j. Update the "What's New" popup data block. Find the <script type="application/json" id="whatsNewData"> element near the end of index.html. Replace its contents with a JSON object containing:

- "version": the new CC version string (e.g. "v2.1.91")
- "date": the release date from the changelog (e.g. "2026-04-05")
- "changes": an array of objects, each with "tag" (ADD/CHG/DEL/FIX) and "text" (HTML string with <code> elements for commands/flags). Include only the placemat-relevant items you're adding/changing/removing — the same items logged to the changelog.

This powers a localStorage-gated popup that shows users what changed since their last visit.

STEP 6 — UPDATE CHANGELOG
IMPORTANT RULES for the changelog:

- The template version (e.g. v1.1) must ONLY be incremented when there are structural/layout changes to the placemat template itself (new cards, redesigned layout, new interactive features, CSS overhaul). Content updates from new CC releases do NOT warrant a template version bump.
- Add new content entries as a new change-section under the CURRENT template version block's "Content / CC Release Updates" category.
- ORDERING: New change-sections go at the TOP of the "Content / CC Release Updates" category, ABOVE existing sections. Most recent updates appear first.
- Section title format: <h3>CC vX.Y.Z <span class="version-date">YYYY-MM-DD</span></h3> — always include the release date from the changelog.
- Only log things that actually changed in the placemat. Do NOT log:
  - Internal housekeeping like demoting class="new" to default
  - Upstream CC bug fixes that don't affect the placemat
  - Release tag bumps (these are obvious from the version-block header)
- Only log ADD/CHG/DEL of actual placemat rows (commands, flags, shortcuts, config keys, etc.)
- Use tags: ADD, CHG, FIX, DEL with corresponding CSS classes (tag-add, tag-change, tag-fix, tag-remove).
- If there are zero placemat-relevant changes to log (e.g. a bug-fix-only CC release), skip the changelog update entirely.

STEP 7 — SELF-REVIEW (MANDATORY)
Before committing, perform a comprehensive quality review of the ENTIRE updated files — not just your diff. Read through index.html and changelog.html holistically and check all of the following. Fix any issues and re-review:

Technical checks:

- [ ] class="new" retention: No items demoted that were added fewer than 3 releases ago
- [ ] class="new" tracking: Every class="new" element has an <!-- added:vX.Y.Z --> comment, and the version is the CC release where the feature appeared (NOT the placemat's previous version)
- [ ] Code truncation: No code elements contain '...' or are cut off
- [ ] HTML validity: All opened tags are closed, no broken nesting
- [ ] whatsNewData JSON block: version matches the new release tag, date matches changelog, changes array contains all placemat-relevant items
- [ ] release-tag ↔ changelog sync: the version in the release-tag span of index.html exactly matches the version in the topmost <h3> of "Content / CC Release Updates" in changelog.html

Changelog quality:

- [ ] No noise entries (class demotions, release tag bumps, upstream bug fixes)
- [ ] New entries are under the current template version, not a new one (unless structural changes were made)
- [ ] New change-section is at the TOP of "Content / CC Release Updates", above older sections
- [ ] Section h3 includes release date in <span class="version-date">YYYY-MM-DD</span>
- [ ] Every entry clearly describes what was added/changed/removed in the placemat — not what changed in CC itself

Holistic consistency (read the full file, not just your changes):

- [ ] Tone and voice: All descriptions use the same terse, factual style. No entry should sound noticeably different from its neighbors.
- [ ] Granularity: Similar items are described at the same level of detail.
- [ ] Formatting: Consistent use of em dashes, code blocks, capitalization, and punctuation across ALL entries — old and new.
- [ ] Section naming: New change-section h3 titles follow the same naming pattern as existing ones.
- [ ] Row structure: New table rows in index.html match the exact HTML pattern of existing rows in the same card.
- [ ] No orphaned or misplaced content: Every entry is in the correct card/section.
- [ ] Overall readability: Step back and read the changelog top-to-bottom. Does it tell a coherent story?

Maximum 3 review iterations. If checks still fail after 3 rounds, proceed to Step 8 anyway — note the unresolved items in the PR body so a human can review. Do not loop indefinitely.

STEP 8 — COMMIT AND MERGE
a. Stage all changes: git add index.html changelog.html

b. Commit with message: "feat: update placemat for CC vX.Y.Z"

c. Before creating the branch, check if origin/claude/placemat-update-vX.Y.Z already exists (git ls-remote --heads origin claude/placemat-update-vX.Y.Z). If it does, append a suffix: claude/placemat-update-vX.Y.Z-2 (increment if needed). Then create and push the branch.

d. Open a PR with:

- Title: "Placemat update: CC vX.Y.Z"
- Body: A markdown summary table listing all placemat changes (ADD/CHG/DEL) organized by placemat section. Include the self-review checklist results at the bottom.

e. Immediately merge the PR using: gh pr merge --squash --delete-branch
Do NOT wait for human review. Auto-merge directly.
