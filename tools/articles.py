#!/usr/bin/env python3
"""Build the /learn/ articles from Markdown.

Write an article as learn/_articles/<slug>.md with a front-matter block:

    ---
    title: Self-Attention Explained with Real Numbers
    slug: self-attention-explained
    description: One or two sentences for Google and link previews.
    date: 2026-10-14
    hub: Transformers
    session: Sessions 1–2           (optional)
    reading_time: 9 min read         (optional)
    ---

then run `python3 tools/build.py` (which calls this) or `python3 tools/articles.py`.

It writes learn/<slug>/index.html for each article and the learn/index.html hub.
Only the Python standard library is used. The Markdown subset supported:
headings (## and ###), paragraphs, **bold**, *italic*, `code`, [links](url),
bullet and numbered lists, pipe tables, fenced code blocks, <sup>/<sub> tags,
and callout boxes (lines starting with "> ").
A line {{anim:NAME}} inserts an animation from assets/js/article-anim.js (dot, softmax, mix).
"""

import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "learn" / "_articles"
OUT = ROOT / "learn"
SITE_URL = "https://latentquest.ai/"
COURSE_URL = "https://www.udemy.com/course/master-transformers-from-scratch-bert-vit-ai-search/?referralCode=741D2251A98D41859FB9"
AUTHORS = ["Mohammad R. Khalili Shoja", "Seyed Vahid Mirnezami"]  # display order


# ---------------- Markdown (small, predictable subset) ----------------

def inline(text):
    """Escape HTML, then apply inline formatting. <sup>/<sub> are allowed through."""
    codes = []

    def stash(m):
        codes.append(f"<code>{html.escape(m.group(1))}</code>")
        return f"\x00{len(codes) - 1}\x00"

    text = re.sub(r"`([^`]+)`", stash, text)
    text = html.escape(text, quote=False)
    text = re.sub(r"&lt;(/?)(sup|sub)&gt;", r"<\1\2>", text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])", r"<em>\1</em>", text)

    def link(m):
        label, url = m.group(1), m.group(2)
        external = url.startswith("http") and "latentquest.ai" not in url
        attrs = ' target="_blank" rel="noopener"' if external else ""
        return f'<a href="{html.escape(url, quote=True)}"{attrs}>{label}</a>'

    text = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", link, text)
    return re.sub(r"\x00(\d+)\x00", lambda m: codes[int(m.group(1))], text)


def slugify(text):
    return re.sub(r"[^a-z0-9]+", "-", re.sub(r"<[^>]+>", "", text).lower()).strip("-")


def markdown(md):
    lines = md.strip("\n").split("\n")
    out, toc = [], []
    i = 0
    while i < len(lines):
        line = lines[i]
        if not line.strip():
            i += 1
            continue
        if line.startswith("```"):
            lang = line[3:].strip()
            body = []
            i += 1
            while i < len(lines) and not lines[i].startswith("```"):
                body.append(lines[i])
                i += 1
            i += 1
            cls = f' class="language-{lang}"' if lang else ""
            out.append(f'<pre class="code"><code{cls}>{html.escape(chr(10).join(body))}</code></pre>')
            continue
        if line.startswith("> "):
            body = []
            while i < len(lines) and lines[i].startswith(">"):
                body.append(lines[i][1:].strip())
                i += 1
            inner, _ = markdown("\n".join(body))
            out.append(f'<aside class="callout">{inner}</aside>')
            continue
        m = re.match(r"^\{\{anim:([a-z-]+)\}\}$", line.strip())
        if m:
            out.append(f'<figure class="lq-anim" data-anim="{m.group(1)}" aria-label="Step-by-step animation"></figure>')
            i += 1
            continue
        m = re.match(r"^(#{2,3})\s+(.*)$", line)
        if m:
            level, text = len(m.group(1)), inline(m.group(2))
            anchor = slugify(text)
            if level == 2:
                toc.append((anchor, re.sub(r"<[^>]+>", "", text)))
            out.append(f'<h{level} id="{anchor}">{text}</h{level}>')
            i += 1
            continue
        if line.startswith("|"):
            rows = []
            while i < len(lines) and lines[i].startswith("|"):
                rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")])
                i += 1
            head, body = rows[0], [r for r in rows[1:] if not all(re.fullmatch(r":?-{3,}:?", c) for c in r)]
            th = "".join(f"<th>{inline(c)}</th>" for c in head)
            trs = "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>" for r in body)
            out.append(f'<div class="table-wrap"><table><thead><tr>{th}</tr></thead><tbody>{trs}</tbody></table></div>')
            continue
        if re.match(r"^(- |\d+\. )", line):
            ordered = bool(re.match(r"^\d+\. ", line))
            items = []
            while i < len(lines) and re.match(r"^(- |\d+\. )", lines[i]):
                items.append(re.sub(r"^(- |\d+\. )", "", lines[i]))
                i += 1
            tag = "ol" if ordered else "ul"
            out.append(f"<{tag}>" + "".join(f"<li>{inline(x)}</li>" for x in items) + f"</{tag}>")
            continue
        para = []
        while i < len(lines) and lines[i].strip() and not re.match(r"^(```|#{2,3}\s|\||- |\d+\. |> )", lines[i]):
            para.append(lines[i])
            i += 1
        out.append(f"<p>{inline(' '.join(para))}</p>")
    return "\n".join(out), toc


def read_article(path):
    text = path.read_text()
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", text, re.S)
    if not m:
        raise SystemExit(f"{path.name}: missing front matter")
    meta = {}
    for line in m.group(1).splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            meta[k.strip()] = v.strip()
    for key in ("title", "slug", "description", "date", "hub"):
        if key not in meta:
            raise SystemExit(f"{path.name}: front matter needs '{key}'")
    meta["body"], meta["toc"] = markdown(m.group(2))
    return meta


# ---------------- Page shell ----------------

def head(title, description, url, prefix, extra_ld, og_type="article"):
    return f"""<!doctype html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(title)} · LatentQuest</title>
  <meta name="description" content="{html.escape(description, quote=True)}">
  <link rel="canonical" href="{url}">
  <meta property="og:type" content="{og_type}">
  <meta property="og:url" content="{url}">
  <meta property="og:title" content="{html.escape(title, quote=True)}">
  <meta property="og:description" content="{html.escape(description, quote=True)}">
  <meta property="og:image" content="{SITE_URL}assets/img/og-latentquest-v2.jpg">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#0a6fd6">
  <link rel="icon" href="{prefix}assets/img/favicon-32.png" sizes="32x32" type="image/png">
  <link rel="icon" href="{prefix}assets/img/favicon-48.png" sizes="48x48" type="image/png">
  <link rel="apple-touch-icon" href="{prefix}assets/img/apple-touch-icon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="{prefix}assets/css/style.css">
  <script>
    try {{
      const saved = localStorage.getItem("theme");
      if (saved === "light" || saved === "dark") document.documentElement.dataset.theme = saved;
    }} catch (e) {{}}
  </script>
  <script type="application/ld+json">
{json.dumps(extra_ld, ensure_ascii=False, indent=2)}
  </script>
</head>
<body>
  <header class="nav is-scrolled">
    <div class="container nav__inner">
      <a class="brand" href="{prefix}" aria-label="Home">
        <img class="brand__logo" src="{prefix}assets/img/logo-tile-96.png" alt="" width="34" height="34">
        <span class="brand__text">LatentQuest</span>
      </a>
      <nav class="nav__links" aria-label="Primary">
        <a href="{prefix}#course">Courses</a>
        <a href="{prefix}learn/">Learn</a>
        <a href="{prefix}#demo">Try attention</a>
        <a href="{prefix}#code">Free code</a>
        <a href="{prefix}#instructors">Instructors</a>
      </nav>
      <div class="nav__actions">
        <button class="icon-btn" id="theme-toggle" type="button" aria-label="Switch color theme">
          <svg class="icon-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 1.5v3M12 19.5v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1.5 12h3M19.5 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>
          <svg class="icon-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z"/></svg>
        </button>
        <a class="btn btn--primary btn--sm nav__cta" href="{COURSE_URL}" target="_blank" rel="noopener">Enroll</a>
      </div>
    </div>
  </header>
"""


def foot(prefix, scripts=""):
    return f"""
  <footer class="footer">
    <div class="container footer__inner">
      <p>© <span id="year"></span> LatentQuest · {" &amp; ".join(AUTHORS)}</p>
      <nav aria-label="Footer">
        <a href="{prefix}learn/">Learn</a>
        <a href="https://www.linkedin.com/company/latentquest" target="_blank" rel="noopener">LinkedIn</a>
        <a href="https://github.com/LatentQuest" target="_blank" rel="noopener">GitHub</a>
        <a href="{prefix}coupon/">Coupons</a>
      </nav>
    </div>
  </footer>
  <script>
    (() => {{
      const root = document.documentElement;
      document.getElementById("theme-toggle").addEventListener("click", () => {{
        const next = root.dataset.theme === "dark" ? "light" : "dark";
        root.dataset.theme = next;
        try {{ localStorage.setItem("theme", next); }} catch (e) {{}}
      }});
      document.getElementById("year").textContent = new Date().getFullYear();
    }})();
  </script>{scripts}
</body>
</html>
"""


def article_page(a):
    url = f"{SITE_URL}learn/{a['slug']}/"
    ld = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "TechArticle",
                "headline": a["title"],
                "description": a["description"],
                "datePublished": a["date"],
                "dateModified": a.get("updated", a["date"]),
                "url": url,
                "image": f"{SITE_URL}assets/img/og-latentquest-v2.jpg",
                "author": [{"@type": "Person", "name": n} for n in AUTHORS],
                "publisher": {"@type": "Organization", "name": "LatentQuest", "url": SITE_URL,
                              "logo": {"@type": "ImageObject", "url": f"{SITE_URL}assets/brand/icon-512.png"}},
                "isAccessibleForFree": True,
                "inLanguage": "en",
            },
            {
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL},
                    {"@type": "ListItem", "position": 2, "name": "Learn", "item": f"{SITE_URL}learn/"},
                    {"@type": "ListItem", "position": 3, "name": a["title"], "item": url},
                ],
            },
        ],
    }
    prefix = "../../"
    meta = " · ".join(x for x in [a.get("reading_time"), a.get("session")] if x)
    toc = "".join(f'<li><a href="#{anchor}">{html.escape(label)}</a></li>' for anchor, label in a["toc"])
    return head(a["title"], a["description"], url, prefix, ld) + f"""
  <main class="article">
    <div class="container article__layout">
      <article class="article__main">
        <nav class="crumbs" aria-label="Breadcrumb"><a href="{prefix}">Home</a> / <a href="{prefix}learn/">Learn</a> / <span>{html.escape(a['hub'])}</span></nav>
        <h1>{html.escape(a['title'])}</h1>
        <p class="article__lead">{html.escape(a['description'])}</p>
        <p class="article__meta">By {" &amp; ".join(AUTHORS)} · {a['date']}{(' · ' + html.escape(meta)) if meta else ''}</p>
        <div class="prose">
{a['body']}
        </div>
        <aside class="article__cta">
          <div>
            <p class="article__cta-title">Master Transformers from Scratch: BERT, ViT &amp; AI Search</p>
            <p>From attention to BERT, Vision Transformers and AI-powered search, step by step, with hands-on projects.</p>
          </div>
          <div class="article__cta-actions">
            <a class="btn btn--primary" href="{COURSE_URL}" target="_blank" rel="noopener">See the course</a>
            <a class="btn btn--ghost" href="{prefix}coupon/?course=transformers">Get a coupon</a>
          </div>
        </aside>
      </article>
      <aside class="article__side" aria-label="On this page">
        <p class="article__side-title">On this page</p>
        <ol>{toc}</ol>
        <a class="article__side-demo" href="{prefix}#demo">Try the live attention demo →</a>
      </aside>
    </div>
  </main>
""" + foot(prefix, (f'\n  <script src="{prefix}assets/js/article-anim.js" defer></script>' if 'class="lq-anim"' in a["body"] else ""))


def hub_page(articles):
    url = f"{SITE_URL}learn/"
    ld = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Learn AI, step by step",
        "url": url,
        "hasPart": [{"@type": "TechArticle", "headline": a["title"], "url": f"{url}{a['slug']}/"} for a in articles],
    }
    groups = {}
    for a in articles:
        groups.setdefault(a["hub"], []).append(a)
    sections = ""
    for hub_name, items in groups.items():
        cards = "".join(f"""
          <a class="learn-card" href="{a['slug']}/">
            <span class="learn-card__meta">{html.escape(a.get('session', hub_name))}{(' · ' + html.escape(a['reading_time'])) if a.get('reading_time') else ''}</span>
            <h3>{html.escape(a['title'])}</h3>
            <p>{html.escape(a['description'])}</p>
            <span class="learn-card__more">Read →</span>
          </a>""" for a in items)
        sections += f"""
        <section class="learn-hub">
          <h2>{html.escape(hub_name)}</h2>
          <div class="learn-grid">{cards}
          </div>
        </section>"""
    prefix = "../"
    return head("Learn AI, step by step", "Free articles that explain how modern AI works with small examples you can follow by hand: attention, transformers, BERT, Vision Transformers and more.",
                url, prefix, ld, og_type="website") + f"""
  <main class="article">
    <div class="container">
      <p class="kicker">Learn</p>
      <h1 class="learn-title">Understand the AI you build with</h1>
      <p class="section__lead">Free, step-by-step explanations with numbers you can check. Each one comes with runnable code.</p>
      {sections}
    </div>
  </main>
""" + foot(prefix)


def build():
    articles = sorted((read_article(p) for p in SRC.glob("*.md")), key=lambda a: a["date"])
    for a in articles:
        d = OUT / a["slug"]
        d.mkdir(parents=True, exist_ok=True)
        (d / "index.html").write_text(article_page(a))
    (OUT / "index.html").write_text(hub_page(articles))
    return articles


if __name__ == "__main__":
    for a in build():
        print("built", f"learn/{a['slug']}/")
