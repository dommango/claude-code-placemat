#!/usr/bin/env python3
"""
Detect Claude Code release announcements on X (@ClaudeDevs) and decide whether
to invoke the placemat-update routine.

Inputs (env):
  X_API_TOKEN            X API v2 bearer token (read access for @ClaudeDevs)
  X_WATCH_HANDLE         Defaults to "ClaudeDevs"
  STATE_FILE             Path to JSON state file
  DEBOUNCE_SECONDS       Defaults to 1800 (30 minutes)
  GITHUB_OUTPUT          Path to GH Actions outputs file
  DRY_RUN                "true" to suppress the should_fire signal

Outputs (written to $GITHUB_OUTPUT):
  match_found            "true" if a new, relevant post was seen
  should_fire            "true" if match_found and outside debounce window
  matched_post_id        ID of the matching post (if any)
  matched_post_text      Body of the matching post (first 280 chars)

Also rewrites STATE_FILE in place with the latest last_seen_post_id and (if
fired) the new last_fired_at timestamp.
"""

from __future__ import annotations

import json
import os
import re
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone

X_API_BASE = "https://api.x.com/2"

RELEVANCE_PATTERNS = [
    re.compile(r"v2\.\d+\.\d+"),
    re.compile(r"\b(release|shipped|now available|changelog|what'?s new)\b", re.IGNORECASE),
    re.compile(r"code\.claude\.com/docs/en/changelog"),
    re.compile(r"github\.com/anthropics/claude-code"),
]


def x_get(path: str, token: str) -> dict:
    req = urllib.request.Request(
        f"{X_API_BASE}{path}",
        headers={"Authorization": f"Bearer {token}"},
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read())


def resolve_user_id(handle: str, token: str) -> str:
    data = x_get(f"/users/by/username/{handle}", token)
    if "data" not in data or "id" not in data["data"]:
        raise RuntimeError(f"Could not resolve @{handle}: {data}")
    return data["data"]["id"]


def fetch_recent_tweets(user_id: str, token: str, limit: int = 10) -> list[dict]:
    data = x_get(
        f"/users/{user_id}/tweets?max_results={limit}&tweet.fields=created_at",
        token,
    )
    return data.get("data", [])


def is_relevant(text: str) -> bool:
    return any(pattern.search(text) for pattern in RELEVANCE_PATTERNS)


def write_outputs(pairs: dict) -> None:
    out_path = os.environ.get("GITHUB_OUTPUT")
    if not out_path:
        return
    with open(out_path, "a", encoding="utf-8") as fh:
        for key, value in pairs.items():
            if "\n" in str(value):
                fh.write(f"{key}<<EOFPOST\n{value}\nEOFPOST\n")
            else:
                fh.write(f"{key}={value}\n")


def main() -> int:
    token = os.environ.get("X_API_TOKEN")
    if not token:
        print("X_API_TOKEN not set", file=sys.stderr)
        return 1

    handle = os.environ.get("X_WATCH_HANDLE", "ClaudeDevs")
    state_file = os.environ.get("STATE_FILE", ".github/x-trigger-state.json")
    debounce = int(os.environ.get("DEBOUNCE_SECONDS", "1800"))
    dry_run = os.environ.get("DRY_RUN", "false").lower() == "true"

    try:
        with open(state_file, "r", encoding="utf-8") as fh:
            state = json.load(fh)
    except FileNotFoundError:
        state = {"last_seen_post_id": None, "last_fired_at": None}

    last_seen = state.get("last_seen_post_id")
    last_fired = state.get("last_fired_at")

    user_id = resolve_user_id(handle, token)
    tweets = fetch_recent_tweets(user_id, token)

    if not tweets:
        write_outputs({"match_found": "false", "should_fire": "false"})
        return 0

    newest_id = tweets[0]["id"]

    matched_post = None
    for tweet in tweets:
        if last_seen and tweet["id"] == last_seen:
            break
        if is_relevant(tweet["text"]):
            matched_post = tweet
            break

    match_found = matched_post is not None
    should_fire = False
    fired_at = last_fired

    if match_found:
        now = datetime.now(timezone.utc)
        if last_fired:
            try:
                last_fired_dt = datetime.fromisoformat(last_fired.replace("Z", "+00:00"))
                elapsed = (now - last_fired_dt).total_seconds()
                outside_debounce = elapsed > debounce
            except ValueError:
                outside_debounce = True
        else:
            outside_debounce = True
        should_fire = outside_debounce and not dry_run
        if should_fire:
            fired_at = now.isoformat()

    new_state = {"last_seen_post_id": newest_id, "last_fired_at": fired_at}
    with open(state_file, "w", encoding="utf-8") as fh:
        json.dump(new_state, fh, indent=2)
        fh.write("\n")

    outputs = {
        "match_found": "true" if match_found else "false",
        "should_fire": "true" if should_fire else "false",
    }
    if matched_post:
        outputs["matched_post_id"] = matched_post["id"]
        outputs["matched_post_text"] = matched_post["text"][:280]
    write_outputs(outputs)

    print(f"match_found={outputs['match_found']} should_fire={outputs['should_fire']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
