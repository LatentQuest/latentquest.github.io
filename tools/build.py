#!/usr/bin/env python3
"""Pre-render the LatentQuest site for search engines.

Run this after editing assets/data/site.js:

    python3 tools/build.py

It does three things, using only the Python standard library plus Google Chrome:

1. Loads the real page in headless Chrome, copies the HTML that main.js
   renders (course details, syllabus, instructors, repos) into index.html,
   so crawlers that don't run JavaScript see the full content.
2. Writes Course structured data (JSON-LD) for every live course.
3. Regenerates sitemap.xml.

The browser still re-renders everything from site.js, so the site stays
correct even if you forget to run this. You just lose the SEO freshness.
"""

import datetime
import functools
import html
import http.server
import json
import os
import re
import shutil
import subprocess
import sys
import threading
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / "index.html"
SITE_URL = "https://latentquest.ai/"

# Containers that main.js fills in. Their rendered contents get baked into index.html.
PRERENDER_IDS = [
    "hc-title", "taught-by",
    "course-grid",
    "fc-kicker", "fc-title", "fc-lead", "fc-pillars",
    "syllabus-tabs", "syllabus-list",
    "fc-cta-title", "fc-cta-sub",
    "repos", "instructor-list",
]
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}

CHROME_CANDIDATES = [
    os.environ.get("CHROME", ""),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    shutil.which("google-chrome") or "",
    shutil.which("chromium") or "",
    shutil.which("chromium-browser") or "",
]


class _Finder(HTMLParser):
    """Find the inner-HTML span (start, end offsets) of the element with a given id."""

    def __init__(self, text, target_id):
        super().__init__(convert_charrefs=False)
        self.text, self.target = text, target_id
        self.line_starts = [0]
        for m in re.finditer("\n", text):
            self.line_starts.append(m.end())
        self.depth = None
        self.inner_start = self.inner_end = None

    def _offset(self):
        line, col = self.getpos()
        return self.line_starts[line - 1] + col

    def handle_starttag(self, tag, attrs):
        if self.inner_end is not None:
            return
        if self.depth is None:
            if dict(attrs).get("id") == self.target:
                self.depth = 0
                self.inner_start = self._offset() + len(self.get_starttag_text())
                if tag in VOID:
                    self.inner_end = self.inner_start
            return
        if tag not in VOID:
            self.depth += 1

    def handle_endtag(self, tag):
        if self.depth is None or self.inner_end is not None or tag in VOID:
            return
        if self.depth == 0:
            self.inner_end = self._offset()
        else:
            self.depth -= 1


def inner_span(text, element_id):
    f = _Finder(text, element_id)
    f.feed(text)
    if f.inner_start is None or f.inner_end is None:
        raise SystemExit(f"Could not find element #{element_id}")
    return f.inner_start, f.inner_end


def render_with_chrome():
    chrome = next((c for c in CHROME_CANDIDATES if c and Path(c).exists()), None)
    if not chrome:
        raise SystemExit("Google Chrome not found. Set CHROME=/path/to/chrome and retry.")
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass

    handler = functools.partial(Quiet, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        url = f"http://127.0.0.1:{server.server_address[1]}/index.html"
        out = subprocess.run(
            [chrome, "--headless=new", "--disable-gpu", "--force-prefers-reduced-motion",
             "--virtual-time-budget=8000", "--dump-dom", url],
            capture_output=True, text=True, timeout=120,
        )
        if not out.stdout.strip():
            raise SystemExit("Chrome returned an empty page:\n" + out.stderr[-2000:])
        return out.stdout
    finally:
        server.shutdown()


def load_site_data():
    script = (
        "global.window={};require(process.argv[1]);"
        "process.stdout.write(JSON.stringify(window.SITE));"
    )
    out = subprocess.run(["node", "-e", script, str(ROOT / "assets/data/site.js")],
                         capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def strip_tags(s):
    return html.unescape(re.sub(r"<[^>]+>", "", s)).strip()


def course_jsonld(site):
    people = {p["name"]: p for p in site.get("instructors", [])}
    provider = {"@type": "Organization", "name": site["brand"]["name"], "url": SITE_URL}
    items = []
    for c in site["courses"]:
        if c.get("status") == "soon":
            continue
        teaches = [lesson[1] for track in c.get("tracks", []) for lesson in track["lessons"]]
        course = {
            "@type": "Course",
            "name": c["title"],
            "description": strip_tags(c["tagline"]),
            "url": c["url"],
            "provider": provider,
            "inLanguage": "en",
            "isAccessibleForFree": False,
            "instructor": [
                {"@type": "Person", "name": n, **({"url": people[n]["links"].get("Website")} if n in people else {})}
                for n in c.get("instructors", [])
            ],
            "offers": {"@type": "Offer", "category": "Paid", "url": c["url"]},
            "hasCourseInstance": {"@type": "CourseInstance", "courseMode": "Online"},
        }
        if c.get("image"):
            course["image"] = SITE_URL + c["image"]
        if teaches:
            course["teaches"] = teaches
        items.append(course)
    if len(items) == 1:
        data = {"@context": "https://schema.org", **items[0]}
    else:
        data = {
            "@context": "https://schema.org",
            "@type": "ItemList",
            "itemListElement": [{"@type": "ListItem", "position": i + 1, "item": c} for i, c in enumerate(items)],
        }
    return json.dumps(data, ensure_ascii=False, indent=2)


def write_sitemap(articles=()):
    today = datetime.date.today().isoformat()
    pages = [("", "1.0"), ("learn/", "0.8"), ("coupon/", "0.5")]
    pages += [(f"learn/{a['slug']}/", "0.7") for a in articles]
    urls = "\n".join(
        f"  <url>\n    <loc>{SITE_URL}{p}</loc>\n    <lastmod>{today}</lastmod>\n    <priority>{prio}</priority>\n  </url>"
        for p, prio in pages
    )
    (ROOT / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"{urls}\n</urlset>\n"
    )


def main():
    source = INDEX.read_text()
    rendered = render_with_chrome()

    # 1. Bake rendered containers into the source, last match first so offsets stay valid.
    spans = []
    for element_id in PRERENDER_IDS:
        s_start, s_end = inner_span(source, element_id)
        r_start, r_end = inner_span(rendered, element_id)
        spans.append((s_start, s_end, rendered[r_start:r_end]))
    for s_start, s_end, content in sorted(spans, reverse=True):
        source = source[:s_start] + content + source[s_end:]

    # Show the course grid section when it has content.
    site = load_site_data()
    grid_has_courses = len(site["courses"]) > 1
    source = re.sub(r'(<section class="section" id="courses")( hidden)?>',
                    lambda m: m.group(1) + ("" if grid_has_courses else " hidden") + ">", source)

    # 2. Course structured data between markers.
    block = f'<script type="application/ld+json" id="course-jsonld">\n{course_jsonld(site)}\n  </script>'
    source = re.sub(r'<script type="application/ld\+json" id="course-jsonld">.*?</script>', lambda m: block, source, flags=re.S)

    INDEX.write_text(source)

    # 3. Articles under /learn/, then the sitemap.
    sys.path.insert(0, str(ROOT / "tools"))
    import articles as article_builder
    built = article_builder.build()
    write_sitemap(built)
    print("Built", len(built), "article(s) under learn/")
    print("Pre-rendered:", ", ".join(PRERENDER_IDS))
    print("Wrote index.html, sitemap.xml")


if __name__ == "__main__":
    sys.exit(main())
