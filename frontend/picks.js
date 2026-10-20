/* RASSAM — Popular Picks (newest four listings from the real catalogue). */
(() => {
  "use strict";

  const grid = document.querySelector("#picks-grid");
  const data = window.RASSAM;
  if (!grid || !data) return;

  const { PRODUCTS, money, escapeHTML, art } = data;

  const picks = [...PRODUCTS]
    .sort((a, b) => b.listedAt.localeCompare(a.listedAt))
    .slice(0, 4);

  const stockText = (p) =>
    p.stock === 0
      ? "Out of stock"
      : p.stock <= 3
        ? `Only ${p.stock} left`
        : `${p.stock} available`;

  grid.innerHTML = picks
    .map(
      (p) => `
      <article class="pick-card">
        <a class="pick-image" href="buy.html?id=${encodeURIComponent(p.id)}" aria-label="View ${escapeHTML(p.name)}">
          ${art(p)}
        </a>
        <div class="pick-info">
          <p class="product-category">${escapeHTML(p.category)}</p>
          <h3><a href="buy.html?id=${encodeURIComponent(p.id)}">${escapeHTML(p.name)}</a></h3>
          <p class="pick-meta">Condition: <strong>${escapeHTML(p.condition)}</strong> · ${stockText(p)}</p>
          <div class="pick-bottom">
            <span class="pick-price">${money(p.price)}</span>
            <button class="add-to-stash" type="button" data-add="${escapeHTML(p.id)}" ${p.stock === 0 ? "disabled" : ""}>
              STASH IT! <span aria-hidden="true">↗</span>
            </button>
          </div>
        </div>
      </article>`,
    )
    .join("");

  if (
    typeof gsap !== "undefined" &&
    typeof ScrollTrigger !== "undefined" &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    gsap.registerPlugin(ScrollTrigger);
    gsap.from(grid.querySelectorAll(".pick-card"), {
      y: 40,
      opacity: 0,
      duration: 0.8,
      stagger: 0.12,
      ease: "power3.out",
      scrollTrigger: { trigger: grid, start: "top 85%", once: true },
    });
  }
})();
