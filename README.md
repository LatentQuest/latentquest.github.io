# latentquest.github.io

Source for [latentquest.ai](https://latentquest.ai/): the home of LatentQuest courses by
[Mohammad R. Khalili Shoja](https://khalili65.github.io/) and [Seyed Vahid Mirnezami](https://seyedvahidmirnezami.github.io/).

Plain HTML, CSS and JavaScript, with no build step. Edit the files and push to `main`; GitHub Pages publishes it in about a minute.

## Adding a new course

All course content lives in [`assets/data/site.js`](assets/data/site.js). To add a course:

1. Copy the existing entry in `courses` and give it a unique `slug` (for example `agents`).
2. Fill in the title, tagline, Udemy referral link (`url`), tags, pillars and syllabus `tracks`.
3. Use `status: "soon"` while it's in production. It shows as "Coming soon" with no enroll button.
4. Move `featured: true` to whichever course the homepage should spotlight.

With two or more courses, the homepage shows a grid of course cards automatically.

5. Run `python3 tools/build.py` (needs Google Chrome and Node). It copies the rendered course content into `index.html`
   so search engines and AI crawlers can read it without JavaScript, regenerates the Course structured data, and updates
   `sitemap.xml`. The site still works if you forget; you only lose search freshness.
Instructors live in `instructors`. Free-code repos go in `repos`, each with its GitHub `owner` and course `slug`.
Coupon requests go to `couponContact` on LinkedIn.

## Coupon requests

[`/coupon/`](https://latentquest.ai/coupon/) writes a short coupon request, copies it, and opens LinkedIn.
Link to a specific course with `?course=<slug>`, for example
`https://latentquest.ai/coupon/?course=transformers`.

## Preview locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Articles (/learn/)

Free articles live at [latentquest.ai/learn](https://latentquest.ai/learn/). To add one:

1. Write `learn/_articles/<slug>.md` with a front-matter block (title, slug, description, date, hub, and optional
   session and reading_time). See `self-attention-explained.md` for an example.
2. Run `python3 tools/build.py`. It builds `learn/<slug>/index.html`, updates the `learn/` hub page and the sitemap.
3. Open a pull request. After merging, ask Google to index the new page in Search Console (URL inspection).

Base articles on the course's own tutor scripts (`Rasa/session_N_tutor_script.md` in AlgoML), not on the
third-party source transcripts. When republishing on Medium or DEV, set the canonical link to the latentquest.ai article.

## Brand kit

Logo files live in [`assets/brand/`](assets/brand/):

| File | Use |
|---|---|
| `latentquest-logo-original.png` | The original logo (white background) |
| `latentquest-logo-horizontal.png` / `-dark.png` | Icon + name side by side, for light / dark backgrounds |
| `latentquest-logo-stacked.png` / `-dark.png` | Icon above the name |
| `latentquest-mark.png` | Icon only, transparent |
| `profile-800x800.png`, `icon-512.png` | Profile pictures and app icons |

Brand colors: blue `#0E90FB`, navy `#0D2442`, amber `#FCBA46`. On the site, the accent is `#4aa8ff` (dark theme) and `#0a6fd6` (light theme).

## Search engines

`robots.txt` and `sitemap.xml` are at the site root. The sitemap is submitted in Google Search Console
(property: `latentquest.ai`, Domain type).

## Domain

The site is served at **latentquest.ai** (DNS at Porkbun, pointing to GitHub Pages). The `CNAME` file holds the domain; do not delete it. `latentquest.github.io` redirects to it automatically.
