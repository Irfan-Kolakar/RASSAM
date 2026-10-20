/* RASSAM — buy.html logic.
   Reads ?id=<product-id>, renders that product from the shared catalogue (app.js),
   and uses the shared Stash / Checkout through window.RASSAM. */
(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const show = (el) => {
    if (el) el.hidden = false;
  };
  const hide = (el) => {
    if (el) el.hidden = true;
  };

  function showError(message) {
    hide($("#buy-loading"));
    hide($("#buy-detail"));
    show($("#buy-error"));
    const box = $("#buy-error-message");
    if (box) box.textContent = message;
  }

  // Back goes to the previous RASSAM page when there is one, otherwise to Explore.
  function setupBack() {
    $("#buy-back")?.addEventListener("click", (event) => {
      let sameSite = false;
      try {
        sameSite =
          Boolean(document.referrer) &&
          new URL(document.referrer).origin === location.origin;
      } catch {
        sameSite = false;
      }
      if (sameSite && history.length > 1) {
        event.preventDefault();
        history.back();
      }
    });
  }

  function init() {
    const data = window.RASSAM;
    if (!data || !Array.isArray(data.PRODUCTS)) {
      showError(
        "Product catalogue unavailable. Check that app.js loads before buy.js.",
      );
      return;
    }

    setupBack();

    const id = (new URLSearchParams(location.search).get("id") || "")
      .trim()
      .toLowerCase();
    if (!id) {
      showError(
        "No product ID provided. Return to Explore and select a component.",
      );
      return;
    }

    const product = data.PRODUCTS.find(
      (item) => String(item.id).toLowerCase() === id,
    );
    if (!product) {
      showError(`No product found with ID "${id}".`);
      return;
    }

    renderProduct(product, data);
  }

  function renderProduct(product, data) {
    const { money, art } = data;
    const price = Number(product.price);
    const stock = Math.max(0, Math.floor(Number(product.stock) || 0));

    if (!Number.isFinite(price) || price < 0) {
      showError("This product has an invalid price.");
      return;
    }

    document.title = `RASSAM — ${product.name}`;

    const setText = (selector, text) => {
      const el = $(selector);
      if (el) el.textContent = text;
    };

    setText("#breadcrumb-name", product.name);
    setText("#buy-category", product.category || "Components");
    setText("#buy-name", product.name);
    setText("#buy-description", product.description || "");
    setText("#buy-price", money(price));
    setText("#buy-condition", product.condition || "Student component");

    const stockEl = $("#buy-stock");
    if (stockEl) {
      stockEl.classList.remove("stock-out", "stock-low");
      if (stock === 0) {
        stockEl.textContent = "Out of stock";
        stockEl.classList.add("stock-out");
      } else if (stock <= 3) {
        stockEl.textContent = `Only ${stock} left`;
        stockEl.classList.add("stock-low");
      } else {
        stockEl.textContent = `${stock} available`;
      }
    }

    // Specifications: only fields that exist in the catalogue are shown.
    const specs = $("#buy-specs");
    if (specs) {
      const rows = [
        ["Product ID", product.id],
        ["Category", product.category],
        ["Availability", stock === 0 ? "Out of stock" : `${stock} in stock`],
        ["Condition", product.condition],
        ["Highlights", product.badge],
        ["Search tags", product.keywords],
      ].filter(([, value]) => value);
      specs.innerHTML = rows
        .map(
          ([k, v]) =>
            `<div><dt>${data.escapeHTML(k)}</dt><dd>${data.escapeHTML(v)}</dd></div>`,
        )
        .join("");
    }

    const imageWrap = $("#buy-image-wrap");
    if (imageWrap) {
      if (typeof art === "function") imageWrap.innerHTML = art(product);
      else imageWrap.textContent = product.icon || "⚙";
    }

    const quantityRow = $("#buy-qty-row");
    const actions = $("#buy-actions");
    const outNotice = $("#buy-out-notice");

    // Out of stock: show details only, no purchase controls.
    if (stock === 0) {
      hide(quantityRow);
      hide(actions);
      show(outNotice);
      hide($("#buy-loading"));
      show($("#buy-detail"));
      return;
    }

    hide(outNotice);
    show(quantityRow);
    show(actions);

    // ── Quantity controls ────────────────────────────────
    const maximum = Math.min(stock, 99);
    const input = $("#buy-qty");
    const dec = $("#buy-qty-dec");
    const inc = $("#buy-qty-inc");

    if (input) {
      input.min = "1";
      input.max = String(maximum);
      input.step = "1";
      input.value = "1";
    }
    setText("#buy-qty-max", `Max: ${maximum}`);

    const getQty = () => {
      const value = Number.parseInt(input ? input.value : "1", 10);
      if (!Number.isFinite(value)) return 1;
      return Math.min(Math.max(value, 1), maximum);
    };

    const syncQty = () => {
      const quantity = getQty();
      if (input) input.value = String(quantity);
      if (dec) dec.disabled = quantity <= 1;
      if (inc) inc.disabled = quantity >= maximum;
    };

    dec?.addEventListener("click", () => {
      if (input) input.value = String(getQty() - 1);
      syncQty();
    });
    inc?.addEventListener("click", () => {
      if (input) input.value = String(getQty() + 1);
      syncQty();
    });
    input?.addEventListener("input", () => {
      // Allow the field to be empty while typing; clamp when finished.
      if (input.value !== "") syncQty();
    });
    input?.addEventListener("blur", syncQty);
    syncQty();

    // ── Add to Stash ─────────────────────────────────────
    const stashButton = $("#buy-add-stash");

    const syncStashButton = () => {
      if (!stashButton) return;
      const inStash = data.getStash()[product.id] || 0;
      stashButton.innerHTML = inStash
        ? `<span aria-hidden="true">✓</span> IN STASH (${inStash})`
        : `<span aria-hidden="true">＋</span> STASH IT!`;
    };

    stashButton?.addEventListener("click", () => {
      const quantity = getQty();
      const result = data.addItem(product.id, quantity);
      data.showToast(
        result.ok
          ? `${product.name} × ${quantity} added to your Stash 🌸`
          : result.message,
      );
    });

    // ── Buy Now: check out just this product × quantity ──
    // The Stash is left untouched; only this item is removed from it after a successful order.
    $("#buy-now")?.addEventListener("click", () => {
      const quantity = getQty();

      if (typeof data.openCheckout === "function") {
        data.openCheckout({ [product.id]: quantity });
        return;
      }

      // Fallback if checkout.js failed to load: stash it and open the drawer.
      const result = data.addItem(product.id, quantity);
      data.showToast(
        result.ok
          ? `${product.name} × ${quantity} added to your Stash 🌸`
          : result.message,
      );
      if (result.ok) data.openStash();
    });

    // Keep the Stash button label right when the drawer or checkout changes the Stash.
    window.addEventListener("rassam:stash-updated", syncStashButton);
    syncStashButton();

    hide($("#buy-loading"));
    show($("#buy-detail"));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
