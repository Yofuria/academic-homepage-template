#!/usr/bin/env python3
"""Check the template's local assets, links, and JSON without third-party packages."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import json
import sys

ROOT = Path(__file__).resolve().parents[1]

class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.refs = []
        self.duplicates = []
    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if "id" in attrs:
            if attrs["id"] in self.ids:
                self.duplicates.append(attrs["id"])
            self.ids.add(attrs["id"])
        for key in ("href", "src"):
            if key in attrs:
                self.refs.append(attrs[key])

def main():
    errors = []
    pages = {}
    for file in ROOT.rglob("*.html"):
        if ".git" in file.parts:
            continue
        page = Page()
        page.feed(file.read_text(encoding="utf-8"))
        pages[file.resolve()] = page
        errors.extend(str(file.relative_to(ROOT)) + ": duplicate id " + item for item in page.duplicates)
    checked = 0
    for file, page in pages.items():
        for reference in page.refs:
            url = urlsplit(reference)
            if url.scheme or url.netloc:
                continue
            target = ((ROOT if url.path.startswith("/") else file.parent) / unquote(url.path).lstrip("/")).resolve() if url.path else file
            if target.is_dir():
                target /= "index.html"
            if not target.exists():
                errors.append(str(file.relative_to(ROOT)) + ": missing " + reference)
            elif url.fragment and target in pages and unquote(url.fragment) not in pages[target].ids:
                errors.append(str(file.relative_to(ROOT)) + ": missing anchor " + reference)
            checked += 1
    site = json.loads((ROOT / "data/site.json").read_text(encoding="utf-8"))
    for key in ("name", "role", "description", "email", "location", "portrait", "affiliations", "links"):
        if key not in site:
            errors.append("data/site.json: missing " + key)
    if not (ROOT / site.get("portrait", "")).is_file():
        errors.append("data/site.json: portrait file does not exist")
    publications = json.loads((ROOT / "data/publications.json").read_text(encoding="utf-8"))
    for index, paper in enumerate(publications):
        for key in ("title", "authors", "type", "year", "tags"):
            if key not in paper:
                errors.append("publication " + str(index) + ": missing " + key)
        if paper.get("type") not in ("accepted", "preprint"):
            errors.append("publication " + str(index) + ": type must be accepted or preprint")
        for tag in paper.get("tags", []):
            url = urlsplit(tag.get("link", ""))
            if not url.scheme and not url.netloc and url.path:
                target = ROOT / unquote(url.path)
                if target.is_dir():
                    target /= "index.html"
                if not target.is_file():
                    errors.append("publication " + str(index) + ": missing resource " + tag["link"])
    news = json.loads((ROOT / "data/news.json").read_text(encoding="utf-8"))
    for item in news:
        if not item.get("date") or not item.get("content"):
            errors.append("news items require date and content")
        for link in item.get("links", []):
            url = urlsplit(link.get("url", ""))
            if not url.scheme and not url.netloc and url.path:
                target = ROOT / unquote(url.path)
                if target.is_dir():
                    target /= "index.html"
                if not target.is_file():
                    errors.append("news: missing resource " + link["url"])
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    print("OK: " + str(len(pages)) + " pages, " + str(checked) + " local references, " + str(len(publications)) + " example publications, " + str(len(news)) + " news items.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
