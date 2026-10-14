/*
 * Step-by-step animations for /learn/ articles.
 * Markdown line {{anim:NAME}} becomes <div class="lq-anim" data-anim="NAME"></div>.
 * Each animation plays when scrolled into view and has Replay / step controls.
 * With prefers-reduced-motion, the final state is shown without movement.
 */
(() => {
  "use strict";

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sleep = (ms) => new Promise((r) => setTimeout(r, reduced ? 0 : ms));
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };
  const fmt = (v, d = 3) => (Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : v.toFixed(d));

  const WORDS = ["bank", "of", "river"];
  const X = [[1, 0, 1, 0], [0, 1, 0, 1], [1, 1, 0, 0]];
  const SCORES = [2, 0, 1];
  const EXP = SCORES.map(Math.exp);
  const SUM = EXP.reduce((a, b) => a + b, 0);
  const FOCUS = EXP.map((v) => v / SUM);
  const NEW_BANK = [0, 1, 2, 3].map((j) => FOCUS.reduce((s, w, i) => s + w * X[i][j], 0));

  /* ---------- Shell: title, stage, caption, controls ---------- */
  function shell(root, title, steps) {
    root.innerHTML = "";
    const head = el("div", "lq-anim__head");
    head.append(el("span", "lq-anim__title", title));
    const controls = el("div", "lq-anim__controls");
    const replay = el("button", "lq-anim__btn", "↻ Replay");
    replay.type = "button";
    controls.append(replay);
    head.append(controls);
    const stage = el("div", "lq-anim__stage");
    const caption = el("p", "lq-anim__caption");
    caption.setAttribute("aria-live", "polite");
    const dots = el("div", "lq-anim__steps");
    steps.forEach((s) => dots.append(el("span", "lq-anim__step", s)));
    root.append(head, stage, dots, caption);
    const setStep = (i) => [...dots.children].forEach((d, k) => d.classList.toggle("is-on", k <= i));
    return { stage, caption, replay, setStep };
  }

  function vectorRow(label, values, cls = "") {
    const row = el("div", "lq-row " + cls);
    row.append(el("span", "lq-row__label", label));
    const cells = el("div", "lq-cells");
    values.forEach((v) => cells.append(el("span", "lq-cell", fmt(v))));
    row.append(cells);
    return row;
  }

  /* ---------- 1. Score: dot products ---------- */
  function animDot(root) {
    const ui = shell(root, "Step 1 · Score: dot products for “bank”", ["bank · bank", "bank · of", "bank · river"]);
    let run = 0;

    async function play() {
      const id = ++run;
      ui.stage.innerHTML = "";
      const top = vectorRow("bank", X[0], "is-query");
      const other = vectorRow("", [0, 0, 0, 0], "is-key");
      const prod = vectorRow("×", ["", "", "", ""], "is-prod");
      const result = el("div", "lq-scores");
      result.append(el("span", "lq-row__label", "scores"));
      const chips = el("div", "lq-chips");
      WORDS.forEach((w) => {
        const c = el("span", "lq-chip");
        c.append(el("small", "", w), el("b", "", "?"));
        chips.append(c);
      });
      result.append(chips);
      ui.stage.append(top, other, prod, result);
      ui.setStep(-1);

      for (let t = 0; t < 3; t++) {
        if (id !== run) return;
        ui.setStep(t);
        other.querySelector(".lq-row__label").textContent = WORDS[t];
        const oc = other.querySelectorAll(".lq-cell");
        X[t].forEach((v, j) => (oc[j].textContent = v));
        prod.querySelectorAll(".lq-cell").forEach((c) => { c.textContent = ""; c.classList.remove("is-hot"); });
        ui.caption.textContent = `Multiply “bank” and “${WORDS[t]}” position by position…`;
        await sleep(500);
        let total = 0;
        for (let j = 0; j < 4; j++) {
          if (id !== run) return;
          const cols = [top, other, prod].map((r) => r.querySelectorAll(".lq-cell")[j]);
          cols.forEach((c) => c.classList.add("is-focus"));
          const p = X[0][j] * X[t][j];
          total += p;
          cols[2].textContent = p;
          cols[2].classList.toggle("is-hot", p > 0);
          await sleep(520);
          cols.forEach((c) => c.classList.remove("is-focus"));
        }
        ui.caption.textContent = `…then add them up: bank · ${WORDS[t]} = ${total}`;
        const chip = chips.children[t];
        chip.querySelector("b").textContent = total;
        chip.classList.add("is-done");
        await sleep(1100);
      }
      ui.caption.textContent = "Scores for “bank”: 2 with itself, 0 with “of”, 1 with “river”.";
    }
    ui.replay.addEventListener("click", play);
    return play;
  }

  /* ---------- 2. Normalize: softmax bars ---------- */
  function animSoftmax(root) {
    const ui = shell(root, "Step 2 · Normalize: softmax turns scores into percentages", ["scores", "e^score", "÷ sum = focus"]);
    let run = 0;

    async function play() {
      const id = ++run;
      ui.stage.innerHTML = "";
      const chart = el("div", "lq-bars");
      const bars = WORDS.map((w) => {
        const col = el("div", "lq-bar");
        const val = el("span", "lq-bar__val", "");
        const track = el("div", "lq-bar__track");
        const fill = el("div", "lq-bar__fill");
        track.append(fill);
        col.append(val, track, el("span", "lq-bar__label", w));
        chart.append(col);
        return { val, fill };
      });
      const total = el("p", "lq-bars__total", "");
      ui.stage.append(chart, total);
      const set = (heights, labels, max) =>
        bars.forEach((b, i) => {
          b.fill.style.height = `${(heights[i] / max) * 100}%`;
          b.val.textContent = labels[i];
        });

      set([0, 0, 0], ["", "", ""], 1);
      ui.setStep(-1);
      await sleep(300);
      if (id !== run) return;

      ui.setStep(0);
      set(SCORES, SCORES.map(String), 8);
      ui.caption.textContent = "Raw scores for “bank”: 2, 0, 1. They don’t add up to anything useful yet.";
      total.textContent = "";
      await sleep(2000);
      if (id !== run) return;

      ui.setStep(1);
      set(EXP, EXP.map((v) => v.toFixed(3)), 8);
      ui.caption.textContent = "Raise e (≈2.718) to each score. Everything becomes positive, and big scores grow faster.";
      total.textContent = `Sum = ${SUM.toFixed(3)}`;
      await sleep(2400);
      if (id !== run) return;

      ui.setStep(2);
      set(FOCUS, FOCUS.map((v) => (v * 100).toFixed(1) + "%"), 1);
      ui.caption.textContent = "Divide each by the sum. “bank” focuses 66.5% on itself, 24.5% on “river”, 9% on “of”.";
      total.textContent = "Total = 100%";
    }
    ui.replay.addEventListener("click", play);
    return play;
  }

  /* ---------- 3. Mix: blend vectors into the new "bank" ---------- */
  function animMix(root) {
    const ui = shell(root, "Step 3 · Mix: blend the words using the focus", ["weigh each word", "add them up", "new “bank”"]);
    let run = 0;
    const heat = (cell, v) => {
      cell.style.setProperty("--heat", Math.min(1, v));
      cell.classList.toggle("is-zero", v < 1e-9);
    };

    async function play() {
      const id = ++run;
      ui.stage.innerHTML = "";
      const rows = WORDS.map((w, i) => {
        const row = vectorRow(w, X[i], "is-mix");
        const weight = el("span", "lq-weight", `× ${FOCUS[i].toFixed(3)}`);
        row.append(weight);
        row.querySelectorAll(".lq-cell").forEach((c, j) => heat(c, X[i][j]));
        ui.stage.append(row);
        return row;
      });
      const line = el("div", "lq-sumline");
      ui.stage.append(line);
      const out = vectorRow("new bank", [0, 0, 0, 0], "is-out");
      out.querySelectorAll(".lq-cell").forEach((c) => { c.textContent = ""; heat(c, 0); });
      ui.stage.append(out);
      const before = el("p", "lq-before", "before: [1, 0, 1, 0]");
      ui.stage.append(before);
      ui.setStep(-1);
      ui.caption.textContent = "Each row of the focus matrix is a recipe: how much of each word to take.";
      await sleep(1500);
      if (id !== run) return;

      ui.setStep(0);
      for (let i = 0; i < 3; i++) {
        if (id !== run) return;
        rows[i].classList.add("is-active");
        rows[i].querySelectorAll(".lq-cell").forEach((c, j) => {
          const v = X[i][j] * FOCUS[i];
          c.textContent = fmt(v);
          heat(c, v);
        });
        ui.caption.textContent = `Take ${(FOCUS[i] * 100).toFixed(1)}% of “${WORDS[i]}”.`;
        await sleep(1000);
        rows[i].classList.remove("is-active");
      }
      if (id !== run) return;

      ui.setStep(1);
      ui.caption.textContent = "Add the three weighted rows, column by column.";
      const oc = out.querySelectorAll(".lq-cell");
      for (let j = 0; j < 4; j++) {
        if (id !== run) return;
        rows.forEach((r) => r.querySelectorAll(".lq-cell")[j].classList.add("is-focus"));
        oc[j].textContent = NEW_BANK[j].toFixed(3);
        heat(oc[j], NEW_BANK[j]);
        oc[j].classList.add("is-focus");
        await sleep(650);
        rows.forEach((r) => r.querySelectorAll(".lq-cell")[j].classList.remove("is-focus"));
        oc[j].classList.remove("is-focus");
      }
      if (id !== run) return;

      ui.setStep(2);
      [1, 3].forEach((j) => oc[j].classList.add("is-new"));
      before.classList.add("is-shown");
      ui.caption.textContent = "Positions 2 and 4 were 0. Now they carry information from “river” and “of”: “bank” has absorbed context.";
    }
    ui.replay.addEventListener("click", play);
    return play;
  }

  /* ---------- Wire up ---------- */
  const MAKERS = { dot: animDot, softmax: animSoftmax, mix: animMix };
  const io = "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !e.target.dataset.played) {
            e.target.dataset.played = "1";
            e.target._play();
          }
        });
      }, { threshold: 0.45 })
    : null;

  document.querySelectorAll(".lq-anim[data-anim]").forEach((root) => {
    const make = MAKERS[root.dataset.anim];
    if (!make) return;
    root._play = make(root);
    if (io && !reduced) io.observe(root);
    else root._play();
  });
})();
