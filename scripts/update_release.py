"""Refresh the same-origin release manifest from GitHub Releases."""
from __future__ import annotations

import datetime as dt
import json
import os
import re
import urllib.request
from pathlib import Path

API_URL = (
    "https://api.github.com/repos/BNU-ToolBox/"
    "BNU-ToolBox/releases?per_page=20"
)
OUTPUT = Path(__file__).resolve().parents[1] / "releases.json"
INSTALLER_RE = re.compile(
    r"^BNU-ToolBox-Setup-(\d+)\.(\d+)\.(\d+)\.exe$",
    re.IGNORECASE,
)


def version_key(release: dict) -> tuple[int, int, int]:
    tag = str(release.get("tag_name") or "")
    match = re.search(r"(\d+)\.(\d+)\.(\d+)", tag)
    if not match:
        return (0, 0, 0)
    return tuple(int(part) for part in match.groups())


def fetch_releases() -> list[dict]:
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "BNU-ToolBox-Website-Updater",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    token = os.environ.get("GITHUB_TOKEN", "").strip()
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(API_URL, headers=headers)
    with urllib.request.urlopen(request, timeout=30) as response:
        payload = json.loads(response.read().decode("utf-8"))
    if not isinstance(payload, list):
        raise RuntimeError("GitHub Releases response is not a list")
    return payload


def select_release(releases: list[dict]) -> tuple[dict, dict]:
    candidates: list[tuple[dict, dict]] = []
    for release in releases:
        if not isinstance(release, dict) or release.get("draft"):
            continue
        installer = next(
            (
                asset for asset in release.get("assets", [])
                if isinstance(asset, dict)
                and INSTALLER_RE.fullmatch(str(asset.get("name") or ""))
            ),
            None,
        )
        if installer:
            candidates.append((release, installer))
    if not candidates:
        raise RuntimeError("No release with an installer asset was found")
    return max(candidates, key=lambda item: version_key(item[0]))


def main() -> None:
    release, installer = select_release(fetch_releases())
    previous = {}
    try:
        previous = json.loads(OUTPUT.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        pass
    previous_release = previous.get("release", {}) if isinstance(previous, dict) else {}
    previous_installer = previous.get("installer", {}) if isinstance(previous, dict) else {}
    unchanged = (
        previous_release.get("tag_name") == release.get("tag_name")
        and previous_installer.get("browser_download_url")
        == installer.get("browser_download_url")
        and previous_installer.get("size") == installer.get("size")
    )
    if unchanged:
        print("Release manifest is already current")
        return

    payload = {
        "schema_version": 1,
        "generated_at": dt.datetime.now(dt.timezone.utc).replace(
            microsecond=0).isoformat().replace("+00:00", "Z"),
        "release": {
            "tag_name": release.get("tag_name"),
            "name": release.get("name"),
            "published_at": release.get("published_at"),
            "prerelease": bool(release.get("prerelease")),
            "draft": bool(release.get("draft")),
            "html_url": release.get("html_url"),
        },
        "installer": {
            "name": installer.get("name"),
            "size": installer.get("size"),
            "browser_download_url": installer.get("browser_download_url"),
        },
    }
    OUTPUT.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Updated release manifest to {release.get('tag_name')}")


if __name__ == "__main__":
    main()
