/* RASSAM — Buy Components (Browse) page.
   Catalogue, search, category / price / stock filters and sorting.
   The Stash drawer, badge, quantities and toasts are handled ONLY by app.js. */
(() => {
  "use strict";

  const data = window.RASSAM;
  if (!data || !Array.isArray(data.PRODUCTS)) return;

  const { PRODUCTS, money, escapeHTML, art } = data;
  const $ = (selector) => document.querySelector(selector);

  // ── State ────────────────────────────────────────────
  const state = {
    q: "",
    cat: "all",
    min: "",
    max: "",
    stock: false,
    sort: "default",
  };

  const categories = [...new Set(PRODUCTS.map((p) => p.category))];

  // Supports links such as shop.html?q=servo and shop.html?cat=<category name>.
  const params = new URLSearchParams(location.search);
  if (params.get("q")) state.q = params.get("q").trim();
  if (categories.includes(params.get("cat"))) state.cat = params.get("cat");

  const buyURL = (product) => `buy.html?id=${encodeURIComponent(product.id)}`;

  const stockText = (product) =>
    product.stock <= 0
      ? "Out of stock"
      : product.stock <= 3
        ? `Only ${product.stock} left`
        : `${product.stock} in stock`;

  // ── Filtering + sorting ──────────────────────────────
  function filtered() {
    const terms = state.q.toLowerCase().split(/\s+/).filter(Boolean);
    const min = state.min === "" ? -Infinity : Number(state.min);
    const max = state.max === "" ? Infinity : Number(state.max);

    const list = PRODUCTS.filter((p) => {
      if (state.cat !== "all" && p.category !== state.cat) return false;

      if (terms.length) {
        const haystack =
          `${p.name} ${p.category} ${p.description} ${p.keywords || ""}`.toLowerCase();
        if (!terms.every((term) => haystack.includes(term))) return false;
      }

      if (state.stock && p.stock <= 0) return false;
      return p.price >= min && p.price <= max;
    });

    if (state.sort === "price-asc") list.sort((a, b) => a.price - b.price);
    if (state.sort === "price-desc") list.sort((a, b) => b.price - a.price);
    if (state.sort === "name")
      list.sort((a, b) => a.name.localeCompare(b.name));

    return list;
  }

  // ── Rendering ────────────────────────────────────────
  function renderFilters() {
    const rows = [
      ["all", "All components", PRODUCTS.length],
      ...categories.map((c) => [
        c,
        c,
        PRODUCTS.filter((p) => p.category === c).length,
      ]),
    ];

    $("#filter-categories").innerHTML = rows
      .map(
        ([value, label, count]) => `
        <button type="button" class="filter-option${state.cat === value ? " is-on" : ""}"
          data-cat="${escapeHTML(value)}" aria-pressed="${state.cat === value}">
          <span>${escapeHTML(label)}</span><em>${count}</em>
        </button>`,
      )
      .join("");

    $("#filter-stock").checked = state.stock;
  }

  function renderActive() {
    const chips = [];
    if (state.cat !== "all") chips.push(["cat", state.cat]);
    if (state.min !== "") chips.push(["min", `From ${money(state.min)}`]);
    if (state.max !== "") chips.push(["max", `Up to ${money(state.max)}`]);
    if (state.stock) chips.push(["stock", "In stock"]);
    if (state.q) chips.push(["q", `"${state.q}"`]);

    $("#shop-active-filters").hidden = !chips.length;
    $("#active-chips").innerHTML = chips
      .map(
        ([key, label]) => `
        <button type="button" class="filter-chip" data-chip="${escapeHTML(key)}"
          aria-label="Remove filter ${escapeHTML(label)}">
          ${escapeHTML(label)} <span aria-hidden="true">×</span>
        </button>`,
      )
      .join("");

    $("#filter-count").textContent = chips.length ? `(${chips.length})` : "";
  }

  function priceHTML(p) {
    return `
      <div class="product-price">
        <div class="product-price-now">${money(p.price)}</div>
        <small>Per unit</small>
      </div>`;
  }

  function renderGrid() {
    const list = filtered();
    const stash = data.getStash();

    $("#results-count").textContent =
      `${list.length} ${list.length === 1 ? "component" : "components"}`;
    $("#empty-results").hidden = list.length > 0;
    $("#shop-grid").hidden = list.length === 0;

    $("#shop-grid").innerHTML = list
      .map((p) => {
        const quantity = stash[p.id] || 0;
        const name = escapeHTML(p.name);
        const badge =
          p.stock <= 0
            ? `<span class="product-badge stock-out">Out of stock</span>`
            : p.stock <= 3
              ? `<span class="product-badge stock-low">Only ${p.stock} left</span>`
              : "";

        return `
          <article class="shop-card">
            <a class="shop-card-image" href="${buyURL(p)}" aria-label="View ${name}">
              ${art(p)}${badge}
            </a>
            <div class="shop-card-body">
              <p class="product-category">${escapeHTML(p.category)}</p>
              <h3><a href="${buyURL(p)}">${name}</a></h3>
              <p class="product-description">${escapeHTML(p.description)}</p>
              <p class="product-meta">
                <span>${escapeHTML(p.badge || "")}</span>
                <span>${stockText(p)}</span>
              </p>
              ${priceHTML(p)}
              <div class="shop-card-actions">
                <a class="btn shop-buy-link" href="${buyURL(p)}"
                  aria-label="Buy ${name} now">BUY NOW <span aria-hidden="true">↗</span></a>
                <button class="btn shop-stash-btn${quantity ? " is-stashed" : ""}"
                  type="button" data-add="${escapeHTML(p.id)}" ${p.stock <= 0 ? "disabled" : ""}
                  aria-label="Add ${name} to Stash">
                  ${quantity ? `IN STASH (${quantity}) · ADD MORE` : "STASH IT!"}
                </button>
              </div>
            </div>
          </article>`;
      })
      .join("");
  }

  function render() {
    renderFilters();
    renderActive();
    renderGrid();
  }

  // ── Price slider helpers (filters.js owns the slider) ─
  function setSlider(which, toMax) {
    const slider = $(which);
    if (!slider) return;
    slider.value = toMax ? slider.max : 0;
    slider.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function resetAll() {
    Object.assign(state, { q: "", cat: "all", min: "", max: "", stock: false });
    $("#shop-search").value = "";
    setSlider("#fx-lo", false);
    setSlider("#fx-hi", true);
    render();
  }

  // ── Events ───────────────────────────────────────────
  $("#shop-search").value = state.q;
  $("#shop-sort").value = state.sort;

  $("#shop-search").addEventListener("input", (event) => {
    state.q = event.target.value.trim();
    renderActive();
    renderGrid();
  });

  $("#shop-sort").addEventListener("change", (event) => {
    state.sort = event.target.value;
    renderGrid();
  });

  $("#filter-price-min")?.addEventListener("input", (event) => {
    state.min = event.target.value;
    renderActive();
    renderGrid();
  });

  $("#filter-price-max")?.addEventListener("input", (event) => {
    state.max = event.target.value;
    renderActive();
    renderGrid();
  });

  $("#filter-stock").addEventListener("change", (event) => {
    state.stock = event.target.checked;
    renderActive();
    renderGrid();
  });

  $("#filter-categories").addEventListener("click", (event) => {
    const button = event.target.closest("[data-cat]");
    if (!button) return;
    state.cat = button.dataset.cat;
    render();
    if (matchMedia("(max-width: 900px)").matches) toggleFilters(false);
  });

  $("#shop-active-filters").addEventListener("click", (event) => {
    const key = event.target.closest("[data-chip]")?.dataset.chip;
    if (!key) return;

    if (key === "cat") state.cat = "all";
    else if (key === "stock") state.stock = false;
    else if (key === "q") {
      state.q = "";
      $("#shop-search").value = "";
    } else if (key === "min") setSlider("#fx-lo", false);
    else if (key === "max") setSlider("#fx-hi", true);

    render();
  });

  $("#clear-all-filters").addEventListener("click", resetAll);
  $("#reset-all-filters").addEventListener("click", resetAll);
  $("#reset-empty").addEventListener("click", resetAll);

  // Mobile filter drawer.
  const drawer = $("#shop-filters");
  const backdrop = $("#filter-backdrop");

  function toggleFilters(open) {
    drawer.classList.toggle("is-open", open);
    backdrop.hidden = !open;
  }

  $("#filter-toggle").addEventListener("click", () => toggleFilters(true));
  $("#filter-close").addEventListener("click", () => toggleFilters(false));
  backdrop.addEventListener("click", () => toggleFilters(false));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") toggleFilters(false);
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      $("#shop-search").focus();
    }
  });

  // app.js announces every Stash change (add, remove, quantity, checkout, other tab).
  window.addEventListener("rassam:stash-updated", renderGrid);

  render();
})();
