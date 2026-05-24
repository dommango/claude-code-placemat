# Placemat Audit — 2026-05-24

A retrospective audit of every iteration of the Claude Code Placemat published on GitHub (`dommango-sys/claude-code-placemat`, live at <https://dommango.github.io/claude-code-placemat/>), covering the initial dashboard commit (`83cfb7f`, CC v2.1.85) through HEAD at the time of audit (`3aac9e5`, CC v2.1.150).

## Scope & Method

- Walked every commit on `origin/main` from the initial dashboard to HEAD. Identified 35 release-update commits (`feat: update placemat for CC vX.Y.Z`) covering 33 distinct CC versions (v2.1.86 through v2.1.150).
- For each release commit, inspected the diff against `index.html` and `changelog.html` to count items added, items demoted (where `class="new"` was removed), and to verify whether the changelog entry was added and matches the diff.
- Verified the live deployed HTML at <https://dommango.github.io/claude-code-placemat/index.html> and `/changelog.html` against `origin/main`: deployed site is in sync with `main` at HEAD (release-tag span shows `v2.1.150`).
- Counted current `class="new"` and `class="unverified"` markings and verified the `<!-- added:vX.Y.Z -->` tracking convention.

This audit is **report only** — no fixes, no edits to existing tracked files. Recommendations are listed at the end.

## Headline Verdict

The placemat's **content accuracy is excellent**. Across 33 release updates the routine has correctly added/demoted `class="new"` markings, attached accurate tracking comments, and updated the "What's New" popup JSON every time. Items are never tagged with the wrong version.

The **process drift is real but contained**. Three workflow rules from `CLAUDE.md` are not being followed:

1. Most recent two release commits (v2.1.148, v2.1.150) bump the `index.html` release tag past the latest changelog entry — creating a release-tag-ahead-of-changelog mismatch.
2. The "snapshot before edit" rule has not been honoured since the project rename (`d8b40c6`, 2026-03-29). Zero `versions/v2.1.X.html` snapshots exist for the 33 CC versions tracked.
3. The routine documented in `CLAUDE.md` describes opening a PR per release; only 2 of 33 release commits actually went through a PR (#4 v2.1.90, #29 v2.1.141). The remainder landed directly on `main`.

None of these are content-accuracy bugs — the placemat the user sees has been correct at every published version. They are process inconsistencies that erode trust in the documented workflow.

## Per-Release Summary

| SHA       | CC version | Date       | Added | Demoted | Tracking comments | Changelog entry | Notes                                                                                   |
| --------- | ---------- | ---------- | ----- | ------- | ----------------- | --------------- | --------------------------------------------------------------------------------------- |
| `6993267` | v2.1.86    | 2026-03-28 | 1     | 10      | OK                | OK              | First release update; PR #1                                                             |
| `3a73a37` | v2.1.88    | 2026-03-31 | 3     | 1       | OK                | OK              | PR #3                                                                                   |
| `c9061be` | v2.1.90    | 2026-04-02 | 4     | 3       | OK                | OK              | PR #4; last PR-merged release for ~50 days                                              |
| `cddda74` | v2.1.92    | 2026-04-05 | 6     | 3       | OK                | OK              | PR #7 (last PR until #29)                                                               |
| `0984037` | v2.1.97    | 2026-04-09 | 4     | 10      | OK                | OK              | Large demotion wave                                                                     |
| `b5c51b6` | v2.1.98    | 2026-04-10 | 4     | 3       | OK                | OK              | —                                                                                       |
| `95bb037` | v2.1.101   | 2026-04-11 | 3     | 0       | OK                | OK              | —                                                                                       |
| `2c9b139` | v2.1.107   | 2026-04-14 | 3     | 5       | OK                | OK              | —                                                                                       |
| `9d91a00` | v2.1.109   | 2026-04-15 | 6     | 0       | OK                | OK              | —                                                                                       |
| `e17f22a` | v2.1.112   | 2026-04-17 | 13    | 12      | OK                | OK              | Largest single release                                                                  |
| `dfac2b9` | v2.1.113   | 2026-04-18 | 4     | 5       | OK                | OK              | —                                                                                       |
| `27e7445` | v2.1.114   | 2026-04-19 | 0     | 8       | OK                | n/a             | No new items — changelog skip is correct per STEP 6                                     |
| `91c4987` | v2.1.116   | 2026-04-21 | 1     | 0       | OK                | OK              | —                                                                                       |
| `7c7ab77` | v2.1.117   | 2026-04-22 | 2     | 4       | OK                | OK              | —                                                                                       |
| `d0dad15` | v2.1.118   | 2026-04-23 | 7     | 0       | OK                | OK              | —                                                                                       |
| `744ccc9` | v2.1.119   | 2026-04-24 | 4     | 1       | OK                | OK              | —                                                                                       |
| `bdb73a2` | v2.1.121   | 2026-04-28 | 4     | 9       | OK                | OK              | —                                                                                       |
| `272565d` | v2.1.123   | 2026-04-29 | 1     | 6       | OK                | OK              | —                                                                                       |
| `78e2b61` | v2.1.126   | 2026-05-01 | 1     | 2       | OK                | OK              | —                                                                                       |
| `712fe65` | v2.1.128   | 2026-05-05 | 5     | 1       | OK                | OK              | —                                                                                       |
| `bc2b69c` | v2.1.131   | 2026-05-06 | 5     | 1       | OK                | OK              | —                                                                                       |
| `34943d7` | v2.1.132   | 2026-05-07 | 2     | 5       | OK                | OK              | —                                                                                       |
| `5e8678e` | v2.1.133   | 2026-05-08 | 4     | 5       | OK                | OK              | —                                                                                       |
| `197d56d` | v2.1.138   | 2026-05-09 | 2     | 6       | OK                | OK              | —                                                                                       |
| `c0f13aa` | v2.1.139   | 2026-05-12 | 10    | 2       | OK                | OK              | Major release; all 10 items correctly demoted at `8ea81f5` (v2.1.142, 3 releases later) |
| `62d9d3b` | v2.1.140   | 2026-05-13 | 0     | 0       | OK                | n/a             | Empty release — changelog skip correct                                                  |
| `517156d` | v2.1.141   | 2026-05-14 | 4     | 1       | OK                | OK              | PR #29 (only PR-merged release in 50 days)                                              |
| `8ea81f5` | v2.1.142   | 2026-05-15 | 1     | 10      | OK                | OK              | Demotion of v2.1.139 batch                                                              |
| `919662a` | v2.1.143   | 2026-05-16 | 1     | 0       | OK                | OK              | —                                                                                       |
| `83224ff` | v2.1.144   | 2026-05-19 | 0     | 3       | OK                | n/a             | No new items — changelog skip correct                                                   |
| `7950bfc` | v2.1.145   | 2026-05-20 | 2     | 1       | OK                | OK              | —                                                                                       |
| `62b3d17` | v2.1.146   | 2026-05-21 | 1     | 1       | OK                | OK              | —                                                                                       |
| `527791a` | v2.1.148   | 2026-05-22 | 1     | 2       | OK                | drift           | Release tag → v2.1.148, but changelog entry labelled v2.1.147                           |
| `3aac9e5` | v2.1.150   | 2026-05-23 | 1     | 2       | OK                | drift           | Release tag → v2.1.150, but changelog entry labelled v2.1.149                           |

## Conditional-Formatting Audit

- The placemat implements only two state classes on `<code>` elements: `.new` (teal-tinted background, signals recent-release additions) and `.unverified` (yellow-tinted background, signals items the routine could not confirm against official docs). There are no `.modified` or `.removed` classes in `index.html`. Lifecycle for changed/removed features is handled by editing/deleting the row outright; the change is then logged in `changelog.html` with `CHG` or `DEL` tags.
- **`<code class="new">` tracking is 100% correct across all 33 release updates.** Every newly-marked `class="new"` element has a matching `<!-- added:vX.Y.Z -->` HTML comment, and every comment names the CC release where the feature actually appeared (not the placemat's previously-tracked version). The recent v2.1.150 commit is a good example: the new item is correctly tagged `<!-- added:v2.1.149 -->` even though it landed in the v2.1.150 release commit, because the feature itself appeared in the v2.1.149 changelog.
- **Demotion timing follows the documented 3-release rule.** Sampled the v2.1.139 batch (10 items added at `c0f13aa`): correctly retained at v2.1.140, v2.1.141, v2.1.142, and correctly demoted at v2.1.142 (`8ea81f5`) — note: that's 3 releases later by the placemat's own version counting. No items have been demoted prematurely or kept past schedule.
- **Version-number gaps are intentional and handled correctly.** Some CC releases contained no placemat-relevant features (pure bug fixes, platform-only changes). The routine skips them in the release-tag bump and groups them into changelog ranges like "CC v2.1.122–v2.1.123". This matches the documented intent in `CLAUDE.md` STEP 4.

## Workflow-Compliance Findings

### 1. Release-tag-ahead-of-changelog drift (v2.1.148, v2.1.150)

The two most recent release commits each bump `index.html`'s release-tag span to a version one ahead of the changelog entry added in the same commit:

- `527791a` (commit titled "v2.1.148"): index tag → `v2.1.148`, changelog entry header → `CC v2.1.147`.
- `3aac9e5` (commit titled "v2.1.150"): index tag → `v2.1.150`, changelog entry header → `CC v2.1.149`.

Result: the live site at HEAD shows "As of release: v2.1.150" but the top entry in `changelog.html` is `CC v2.1.149`. A user comparing the two sees a one-version gap with no explanation.

This is the highest-priority finding because it's the only one that affects what users see and erodes the changelog's value as a source of truth. The previous 30+ commits were all internally consistent — the drift is recent and likely indicates a regression in the routine's STEP 6 (changelog entry) or a misalignment between STEP 5f (release-tag bump) and STEP 6.

### 2. Snapshot workflow not followed since 2026-03-29

`CLAUDE.md` ("Versioning" section): _"When releasing a new version, copy `index.html` into `versions/vN.N.html` before making changes."_

The `versions/` directory contains only `v1.0.html` and `v1.1.html` (both created during the initial dashboard / placemat-rename window in late March 2026). Zero snapshots exist for any of the 33 CC versions tracked since (v2.1.86 – v2.1.150).

Either the rule has been silently abandoned because git already preserves the history, or it should be re-implemented (and possibly automated as part of the routine's STEP 5).

### 3. Untracked `versions/CC-CS.html`

The file `versions/CC-CS.html` (dated 2026-03-08, before the main project began) sits untracked in the working tree. Not in any commit, never integrated, never referenced. Probable WIP artifact from an early experiment. Recommend deleting or adding to `.gitignore` to keep `git status` clean.

### 4. PR vs. direct-to-main inconsistency

`CLAUDE.md` ("Automated Update Pipeline") states the routine _"Opens PR with change summary + review checklist results"_ and that a human merges. In practice, only 4 of 35 release commits show PR merge markers:

- `db41c4d` Merge PR #1 (v2.1.86)
- `7c18c29` Merge PR #3 (v2.1.88)
- `c9061be (#4)` (v2.1.90)
- `04fed2e (#7)` (v2.1.92)
- `517156d (#29)` (v2.1.141)

The 30 other release commits landed directly on `main`. Either the routine's STEP 8 stopped opening PRs (or it opens-and-auto-squash-merges so fast that no PR review actually happens), or the PR-then-human-review part of the documented workflow has been quietly bypassed.

### 5. Routine docs vs. implementation drift

`CLAUDE.md` "Automated Update Pipeline" describes the routine as cloud-scheduled (`RemoteTrigger`, daily at 9:00 AM UTC). The end-to-end behaviour described — fetch → categorise → branch → PR → auto-merge — matches what the routine produces. The **execution model is currently misstated**: the routine actually runs locally in Claude Code on the user's desktop. Worth correcting once the X-trigger GitHub Action lands so the docs describe both trigger sources.

### 6. Live-site vs. `main` is in sync

Verified via WebFetch on the day of audit: <https://dommango.github.io/claude-code-placemat/> serves the same release-tag and same top changelog entry as `origin/main`. GitHub Pages is deploying correctly; no stale-deploy issues to flag.

## Recommendations

In priority order:

1. **Fix the v2.1.148 + v2.1.150 changelog drift.** Add the missing release entries for v2.1.148 and v2.1.150 to `changelog.html`, and add a STEP 7 self-review check that asserts `index.html` release-tag matches the top `<h3>` version in `changelog.html` before committing.
2. **Reconcile the snapshot rule.** Either backfill `versions/v2.1.X.html` for the 33 tracked CC versions (cheap if scripted from git history) or remove the rule from `CLAUDE.md` and stop pretending it's part of the workflow.
3. **Clean up `versions/CC-CS.html`.** Delete or `.gitignore`.
4. **Decide on the PR workflow.** Either (a) keep the routine opening PRs and require an actual human merge (slow but matches docs); (b) keep the routine opening PRs and squash-merge automatically (fast but the PR is theatrical); or (c) update `CLAUDE.md` to say the routine pushes directly to `main`. Pick one and document it.
5. **Update the "Automated Update Pipeline" section of `CLAUDE.md`** to describe today's local-desktop execution model. Revise again once the X-triggered GitHub Action lands so both trigger sources are documented.

— end of audit
