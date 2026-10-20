/* RASSAM — Browse by shelf: pinned horizontal scroll (desktop), swipe row (mobile). */
(() => {
  "use strict";

  const section = document.querySelector("#featured");
  const viewport = document.querySelector("#featured .featured-viewport");
  const track = document.querySelector("#featured-track");
  const bar = document.querySelector("#featured-bar");
  const data = window.RASSAM;
  if (!section || !viewport || !track || !data) return;

  const { PRODUCTS, money, escapeHTML } = data;

  const groups = {};
  PRODUCTS.forEach((p) => {
    (groups[p.category] ||= []).push(p);
  });

  track.innerHTML = Object.keys(groups)
    .map((cat, i) => {
      const items = groups[cat];
      const from = Math.min(...items.map((p) => p.price));
      const inStock = items.filter((p) => p.stock > 0).length;
      return `
      <button class="shelf-card" type="button" data-shelf="${escapeHTML(cat)}">
        <span class="shelf-index">${String(i + 1).padStart(2, "0")}</span>
        <h3>${escapeHTML(cat)}</h3>
        <p>${items.length} listings · ${inStock} in stock</p>
        <p class="shelf-from">From ${money(from)}</p>
        <span class="shelf-go">Browse shelf ↗</span>
      </button>`;
    })
    .join("");

  // A shelf card clicks the matching category card (app.js does the filtering).
  track.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-shelf]");
    if (!btn) return;
    const target = [...document.querySelectorAll(".cat-card")].find(
      (c) => c.dataset.category === btn.dataset.shelf,
    );
    if (!target) return;
    // app.js toggles a category off when it is clicked twice, so skip the click if already active.
    if (target.classList.contains("is-active")) {
      document
        .querySelector("#marketplace")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      target.click();
    }
  });

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (
    typeof gsap === "undefined" ||
    typeof ScrollTrigger === "undefined" ||
    reduce
  )
    return;

  gsap.registerPlugin(ScrollTrigger);

  gsap.matchMedia().add("(min-width: 901px)", () => {
    const distance = () =>
      Math.max(0, track.scrollWidth - viewport.clientWidth);
    if (distance() <= 0) return;

    gsap.to(track, {
      x: () => -distance(),
      ease: "none",
      scrollTrigger: {
        trigger: section,
        start: "top 56px", // sits just under the sticky navbar
        end: () => "+=" + (distance() + 200),
        pin: true,
        scrub: 0.6,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          if (bar) bar.style.transform = `scaleX(${self.progress})`;
        },
      },
    });
  });

  // Fonts and the product grid change page height, so measure again once everything has loaded.
  addEventListener("load", () => ScrollTrigger.refresh());
  setTimeout(() => ScrollTrigger.refresh(), 600);
})();
