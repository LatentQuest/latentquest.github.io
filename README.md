# latentquest.github.io

Source for [latentquest.github.io](https://latentquest.github.io/): the home of LatentQuest courses by
[Mohammad R. Khalili Shoja](https://khalili65.github.io/) and [Seyed Vahid Mirnezami](https://seyedvahidmirnezami.github.io/).

Plain HTML, CSS and JavaScript, with no build step. Edit the files and push to `main`; GitHub Pages publishes it in about a minute.

## Adding a new course

All course content lives in [`assets/data/site.js`](assets/data/site.js). To add a course:

1. Copy the existing entry in `courses` and give it a unique `slug` (for example `agents`).
2. Fill in the title, tagline, Udemy referral link (`url`), tags, pillars and syllabus `tracks`.
3. Use `status: "soon"` while it's in production. It shows as "Coming soon" with no enroll button.
4. Move `featured: true` to whichever course the homepage should spotlight.

With two or more courses, the homepage shows a grid of course cards automatically.
Instructors live in `instructors`. Free-code repos go in `repos`, each with its GitHub `owner` and course `slug`.
Coupon requests go to `couponContact` on LinkedIn.

## Coupon requests

[`/coupon/`](https://latentquest.github.io/coupon/) writes a short coupon request, copies it, and opens LinkedIn.
Link to a specific course with `?course=<slug>`, for example
`https://latentquest.github.io/coupon/?course=transformers`.

## Preview locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```
