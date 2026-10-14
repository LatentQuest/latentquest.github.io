(() => {
  "use strict";

    // Each repo carries its own owner, so free code can live in either instructor's account.
  const repoUrl = (r) => `https://github.com/${r.owner}/${r.name}`;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (sel, root = document) => root.querySelector(sel);

  /* ---------- Theme ---------- */
  const root = document.documentElement;
  $("#theme-toggle").addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch (e) {}
  });

  /* ---------- Nav border on scroll ---------- */
  const nav = $(".nav");
  const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 8);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  $("#year").textContent = new Date().getFullYear();

  /* ---------- Reveal on scroll ---------- */
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reducedMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  /* ---------- Linear algebra for the demo ---------- */
  const matmul = (A, B) => A.map((row) => B[0].map((_, j) => row.reduce((s, a, k) => s + a * B[k][j], 0)));
  const transpose = (A) => A[0].map((_, j) => A.map((row) => row[j]));
  const softmaxRows = (S) => S.map((row) => {
    const m = Math.max(...row);
    const e = row.map((v) => Math.exp(v - m));
    const sum = e.reduce((a, b) => a + b, 0);
    return e.map((v) => v / sum);
  });

  // The "bank of river" example from Sessions 2 and 3 of the course.
  const WORDS = ["bank", "of", "river"];
  const X = [[1, 0, 1, 0], [0, 1, 0, 1], [1, 1, 0, 0]];
  const W_Q = [[1, 0, 1], [0, 1, 0], [0, 0, 1], [1, 1, 0]];
  const W_K = [[0, 1, 1], [1, 0, 0], [1, 0, 1], [0, 1, 0]];
  const W_V = [[1, 0, 0], [0, 0, 1], [0, 1, 0], [1, 0, 1]];

  const raw = (() => {
    const A = softmaxRows(matmul(X, transpose(X)));
    return { A, Y: matmul(A, X), V: X };
  })();
  const qkv = (() => {
    const Q = matmul(X, W_Q), K = matmul(X, W_K), V = matmul(X, W_V);
    const d = K[0].length;
    const S = matmul(Q, transpose(K)).map((r) => r.map((v) => v / Math.sqrt(d)));
    const A = softmaxRows(S);
    return { A, Y: matmul(A, V), V };
  })();

  const fmt = (v) => (Math.abs(v) < 0.0005 ? "0.000" : v.toFixed(3));
  const cssVar = (name) => getComputedStyle(root).getPropertyValue(name).trim();

  // Interpolate between the low-cell color and cyan/amber by weight.
  const cellStyle = (w) => {
    const t = Math.min(1, Math.max(0, w));
    const hot = t > 0.5 ? "var(--amber)" : "var(--cyan)";
    const pct = Math.round(18 + t * 82);
    const ink = t > 0.45 ? "#04121a" : "var(--text)";
    return `background: color-mix(in srgb, ${hot} ${pct}%, var(--cell-low)); color: ${ink};`;
  };

  /* ---------- Hero mini matrix ---------- */
  const mini = $("#mini-matrix");
  const renderMini = (A) => {
    mini.innerHTML = '<span></span>' + WORDS.map((w) => `<span class="mm-head">${w}</span>`).join("") +
      A.map((row, i) => `<span class="mm-row">${WORDS[i]}</span>` +
        row.map((v) => `<span class="mm-cell" style="${cellStyle(v)}">${v.toFixed(2)}</span>`).join("")).join("");
  };
  renderMini(raw.A);
  if (!reducedMotion) {
    let flip = false;
    setInterval(() => { flip = !flip; renderMini(flip ? qkv.A : raw.A); }, 3200);
  }

  /* ---------- Interactive demo ---------- */
  const state = { mode: "raw", query: 0 };
  const wordsEl = $("#demo-words");
  wordsEl.innerHTML = WORDS.map((w, i) =>
    `<button type="button" class="word" role="radio" aria-checked="${i === 0}" data-i="${i}">${w}</button>`).join("");

  const renderDemo = () => {
    const data = state.mode === "raw" ? raw : qkv;
    const row = data.A[state.query];
    $("#demo-query").textContent = WORDS[state.query];
    $("#demo-hint").textContent = state.mode === "raw"
      ? "Session 2: attention with no learned weights."
      : "Session 3: learnable query, key and value matrices, scaled by √3.";

    wordsEl.querySelectorAll(".word").forEach((b) => b.setAttribute("aria-checked", String(+b.dataset.i === state.query)));

    $("#demo-bars").innerHTML = row.map((w, j) => `
      <div class="bar">
        <span class="bar__label">${WORDS[j]}</span>
        <span class="bar__track"><span class="bar__fill" style="width:${(w * 100).toFixed(1)}%"></span></span>
        <span class="bar__val">${w.toFixed(3)}</span>
      </div>`).join("");

    $("#demo-matrix").innerHTML = '<span></span>' + WORDS.map((w) => `<span class="mm-head">${w}</span>`).join("") +
      data.A.map((r, i) => `<span class="mm-row">${WORDS[i]}</span>` +
        r.map((v) => `<span class="mm-cell${i === state.query ? " is-row" : ""}" data-i="${i}" style="${cellStyle(v)}">${v.toFixed(2)}</span>`).join("")).join("");

    const before = state.mode === "raw" ? X[state.query] : data.V[state.query];
    const after = data.Y[state.query];
    const cls = after.length === 3 ? "vec__cells vec__cells--3" : "vec__cells";
    $("#demo-vecs").innerHTML = `
      <div><p class="vec__label">${state.mode === "raw" ? "embedding" : "value vector"} of "${WORDS[state.query]}"</p>
        <div class="${cls}">${before.map((v) => `<span class="vcell">${fmt(v)}</span>`).join("")}</div></div>
      <div><p class="vec__label">context-aware output</p>
        <div class="${cls}">${after.map((v) => `<span class="vcell" style="${cellStyle(v * 0.85)}">${fmt(v)}</span>`).join("")}</div></div>`;
    $("#demo-vec-note").textContent = state.mode === "raw"
      ? "The new vector is a weighted mix of every word's embedding."
      : "With learned weights, the mix is over value vectors instead.";
  };

  wordsEl.addEventListener("click", (e) => {
    const b = e.target.closest(".word");
    if (b) { state.query = +b.dataset.i; renderDemo(); }
  });
  $("#demo-matrix").addEventListener("click", (e) => {
    const c = e.target.closest(".mm-cell");
    if (c) { state.query = +c.dataset.i; renderDemo(); }
  });
  document.querySelectorAll(".segmented button").forEach((b) => b.addEventListener("click", () => {
    state.mode = b.dataset.mode;
    document.querySelectorAll(".segmented button").forEach((o) => o.setAttribute("aria-checked", String(o === b)));
    renderDemo();
  }));
  renderDemo();

  /* ---------- Courses (from assets/data/site.js) ---------- */
  const SITE = window.SITE || { courses: [], repos: [] };
  const courses = SITE.courses;
  const featured = courses.find((c) => c.featured) || courses[0];
  const couponHref = (slug) => `coupon/?course=${encodeURIComponent(slug)}`;
  const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  const PILLAR_ICONS = {
    numbers: '<path d="M4 7h16M4 12h10M4 17h7"/><circle cx="18" cy="16" r="3"/>',
    code: '<path d="M8 6l-6 6 6 6M16 6l6 6-6 6"/>',
    star: '<path d="M12 2l3 6 6 .9-4.5 4.3 1 6.3L12 16.8 6.5 19.5l1-6.3L3 8.9 9 8z"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    chip: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
  };

  // Every enroll button points at the featured course's referral link.
  if (featured) {
    document.querySelectorAll("[data-featured-link]").forEach((a) => { a.href = featured.url; });
    document.querySelectorAll("[data-coupon-link]").forEach((a) => { a.href = couponHref(featured.slug); });
  }

  // Course cards appear once there is more than one course.
  if (courses.length > 1) {
    $("#courses").hidden = false;
    $("#fc-kicker").textContent = "Featured course";
    $("#course-grid").innerHTML = courses.map((c) => `
      <article class="course-card reveal is-visible">
        ${c.image ? `<img class="course-card__img" src="${c.image}" alt="" loading="lazy">` : ""}
        <div class="course-card__body">
          <p class="course-card__status course-card__status--${c.status}">${c.status === "soon" ? "Coming soon" : (c.sessionsLabel || "Available now")}</p>
          <h3>${c.title}</h3>
          <p class="course-card__tagline">${c.tagline}</p>
          <div class="repo__tags">${(c.tags || []).map((t) => `<span>${t}</span>`).join("")}</div>
          <div class="course-card__actions">
            ${c.status === "soon"
              ? `<a class="btn btn--ghost btn--sm" href="${SITE.couponContact.linkedin}" target="_blank" rel="noopener">Follow for launch news</a>`
              : `<a class="btn btn--primary btn--sm" href="${c.url}" target="_blank" rel="noopener">Enroll ${arrow}</a>
                 <a class="btn btn--ghost btn--sm" href="${couponHref(c.slug)}">Get a coupon</a>`}
          </div>
        </div>
      </article>`).join("");
  }

  // Featured course detail.
  if (featured) {
    $("#fc-title").textContent = featured.title;
    const names = (featured.instructors || []).join(" and ");
    $("#fc-lead").innerHTML = `${featured.tagline}${names ? ` Taught by ${names}.` : ""}
      You won't just hear definitions. You'll see the numbers, build the layers, and ship code that runs.`;
    $("#hc-title").textContent = featured.title;
    $("#fc-pillars").innerHTML = (featured.pillars || []).map((p) => `
      <article class="pillar reveal is-visible">
        <div class="pillar__icon pillar__icon--${p.color}" aria-hidden="true"><svg viewBox="0 0 24 24">${PILLAR_ICONS[p.icon] || PILLAR_ICONS.star}</svg></div>
        <h3>${p.title}</h3>
        <p>${p.text}</p>
      </article>`).join("");
    $("#fc-cta-title").textContent = featured.ctaTitle || "";
    $("#fc-cta-sub").textContent = featured.ctaSub || "";
  }

  /* ---------- Instructors ---------- */
  const people = SITE.instructors || [];
  // The hero card follows the featured course's own instructor order.
  const teaching = (featured && featured.instructors || []).map((n) => people.find((p) => p.name === n)).filter(Boolean);
  const heroPeople = teaching.length ? teaching : people;
  $("#taught-by").innerHTML = `<div class="taught-by__faces">${heroPeople.map((p) =>
    `<img src="${p.photo}" alt="" width="40" height="40" loading="lazy">`).join("")}</div>
    <p>Taught by <strong>${heroPeople.map((p) => p.name).join("</strong> &amp; <strong>")}</strong></p>`;
  $("#instructor-list").innerHTML = people.map((p) => `
    <article class="instructor reveal is-visible">
      <img class="instructor__photo" src="${p.photo}" alt="Portrait of ${p.name}" width="120" height="120" loading="lazy">
      <div>
        <h3>${p.name}</h3>
        <p class="person__role">${p.role}</p>
        <p class="instructor__bio">${p.bio}</p>
        <div class="person__links">${Object.entries(p.links).map(([label, url]) =>
          `<a href="${url}" target="_blank" rel="noopener">${label}</a>`).join("")}</div>
      </div>
    </article>`).join("");

  /* ---------- Syllabus ---------- */
  const TRACKS = (featured && featured.tracks) || [];
  const tabsEl = $(".syllabus__tabs");
  const listEl = $("#syllabus-list");
  if (!TRACKS.length) $("#syllabus").hidden = true;
  tabsEl.innerHTML = TRACKS.map((t, i) =>
    `<button type="button" class="tab" role="tab" aria-selected="${i === 0}" data-i="${i}">${t.name}<small>${t.range}</small></button>`).join("");
  const renderTrack = (i) => {
    tabsEl.querySelectorAll(".tab").forEach((b) => b.setAttribute("aria-selected", String(+b.dataset.i === i)));
    listEl.innerHTML = TRACKS[i].lessons.map(([n, title, repo], k) => `
      <li class="lesson" style="animation-delay:${k * 40}ms">
        <span class="lesson__num">${String(n).padStart(2, "0")}</span>
        <span class="lesson__title">${title}</span>
        ${repo ? `<a class="lesson__tag" href="${repoUrl((SITE.repos || []).find((r) => r.name === repo) || { owner: SITE.brand.github, name: repo })}" target="_blank" rel="noopener">free code</a>` : ""}
      </li>`).join("");
  };
  tabsEl.addEventListener("click", (e) => {
    const b = e.target.closest(".tab");
    if (b) renderTrack(+b.dataset.i);
  });
  if (TRACKS.length) renderTrack(0);

  /* ---------- Repos ---------- */
  const REPOS = SITE.repos || [];
  const repoIcon = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.71 1.71.75.75 0 0 1-1.07 1.06A2.49 2.49 0 0 1 2 11.5v-9zm10.5-1h-8a1 1 0 0 0-1 1v6.71A2.5 2.5 0 0 1 4.5 9h8V1.5z"/></svg>';
  const starIcon = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 .25a.75.75 0 0 1 .67.42l1.88 3.8 4.19.61a.75.75 0 0 1 .42 1.28l-3.04 2.96.72 4.17a.75.75 0 0 1-1.09.79L8 12.31l-3.75 1.97a.75.75 0 0 1-1.09-.79l.72-4.17L.84 6.36a.75.75 0 0 1 .42-1.28l4.19-.61L7.33.67A.75.75 0 0 1 8 .25z"/></svg>';
  $("#repos").innerHTML = REPOS.map((r) => `
    <a class="repo reveal is-visible" href="${repoUrl(r)}" target="_blank" rel="noopener">
      <div class="repo__top">${repoIcon}<span class="repo__name">${r.name}</span><span class="repo__session">${r.sessions}</span></div>
      <p class="repo__desc">${r.desc}</p>
      <div class="repo__meta">
        <span><i class="lang-dot lang-dot--nb"></i>${r.lang || "Jupyter Notebook"}</span>
        <span data-stars="${r.name}" hidden>${starIcon}<b>0</b></span>
      </div>
      <div class="repo__tags">${r.tags.map((t) => `<span>${t}</span>`).join("")}</div>
    </a>`).join("");

  // Live star counts. Shown only once loaded, so a rate-limited API never breaks the layout.
  REPOS.forEach((r) => {
    fetch(`https://api.github.com/repos/${r.owner}/${r.name}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((repo) => {
        const el = document.querySelector(`[data-stars="${r.name}"]`);
        if (repo && el && repo.stargazers_count > 0) {
          el.querySelector("b").textContent = repo.stargazers_count;
          el.hidden = false;
        }
      })
      .catch(() => {});
  });

  /* ---------- Hero canvas: drifting attention grid ---------- */
  const canvas = $("#attention-canvas");
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, dpr = 1, cols = 0, rows = 0;
  const CELL = 34, GAP = 6;
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(W / (CELL + GAP)) + 1;
    rows = Math.ceil(H / (CELL + GAP)) + 1;
  };
  const draw = (t) => {
    ctx.clearRect(0, 0, W, H);
    const cyan = cssVar("--cyan"), amber = cssVar("--amber");
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        // A soft diagonal band (tokens attending to their neighbours) plus drifting waves.
        const diag = Math.exp(-Math.pow((j - i * (cols / rows) - Math.sin(t / 2600 + i / 4) * 2.2), 2) / 6);
        const wave = 0.5 + 0.5 * Math.sin(t / 1900 + i * 0.7 + j * 0.45);
        const w = Math.min(1, diag * 0.9 + wave * 0.12);
        if (w < 0.06) continue;
        ctx.globalAlpha = w * 0.85;
        ctx.fillStyle = w > 0.62 ? amber : cyan;
        const x = j * (CELL + GAP), y = i * (CELL + GAP);
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(x, y, CELL, CELL, 7) : ctx.rect(x, y, CELL, CELL);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  };
  let raf = 0, visible = true;
  const loop = (t) => { draw(t); raf = requestAnimationFrame(loop); };
  resize();
  window.addEventListener("resize", () => { resize(); if (reducedMotion) draw(0); });
  if (reducedMotion) {
    draw(0);
  } else {
    // Pause the animation when the hero is off screen.
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) raf = requestAnimationFrame(loop);
    }).observe(canvas);
  }
})();
