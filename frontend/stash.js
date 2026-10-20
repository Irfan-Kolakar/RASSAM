javascript(
  /* RASSAM — Sakura Stash page
   Shared storage: rassam-stash-v1
   Product images and names are not clickable.
   Individual BUY NOW buttons open the selected product's details.
*/

  () => {
    "use strict";

    const STORAGE_KEY = "rassam-stash-v1";

    const $ = (selector, root = document) => root.querySelector(selector);

    let toastTimer;

    const money = (value) =>
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(Number(value) || 0);

    const escapeHTML = (value) =>
      String(value ?? "").replace(
        /[&<>"']/g,
        (character) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[character],
      );

    function getProducts() {
      return Array.isArray(window.RASSAM?.PRODUCTS)
        ? window.RASSAM.PRODUCTS
        : [];
    }

    function readStash() {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");

        if (!saved || typeof saved !== "object" || Array.isArray(saved)) {
          return {};
        }

        const products = getProducts();
        const result = {};

        products.forEach((product) => {
          const quantity = Number(saved[product.id]);
          const stock = Math.max(0, Math.floor(Number(product.stock) || 0));

          if (Number.isInteger(quantity) && quantity > 0 && stock > 0) {
            result[product.id] = Math.min(quantity, 99, stock);
          }
        });

        return result;
      } catch (error) {
        console.error("Unable to read RASSAM Stash:", error);
        return {};
      }
    }

    function writeStash(stash) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stash));
        return true;
      } catch (error) {
        console.error("Unable to save RASSAM Stash:", error);
        showToast("Unable to save your Stash. Check browser storage.");
        return false;
      }
    }

    function showToast(message) {
      const toast = $("#toast");
      if (!toast) return;

      toast.textContent = message;
      toast.classList.add("is-visible");

      clearTimeout(toastTimer);

      toastTimer = setTimeout(() => {
        toast.classList.remove("is-visible");
      }, 2800);
    }

    function createArtwork(product) {
      if (typeof window.RASSAM?.art === "function") {
        return window.RASSAM.art(product);
      }

      return `
      <div
        class="product-art product-art-${escapeHTML(product.art)}"
        aria-hidden="true"
      >
        <span>${escapeHTML(product.icon || "⚙")}</span>
        <i></i>
        <b></b>
      </div>
    `;
    }

    function getItems(stash) {
      return getProducts().filter((product) => (stash[product.id] || 0) > 0);
    }

    // ── Render an individual Stash product ──────────────────
    // Product image and name are plain elements, not links.
    function renderItem(product, quantity) {
      const id = escapeHTML(product.id);
      const name = escapeHTML(product.name);

      const maximum = Math.min(
        99,
        Math.max(0, Math.floor(Number(product.stock) || 0)),
      );

      const productURL = `buy.html?id=${encodeURIComponent(product.id)}`;

      return `
      <article class="stash-page-item">

        <div class="stash-page-item-image">
          ${createArtwork(product)}
        </div>

        <div class="stash-page-item-info">

          <p class="product-category">
            ${escapeHTML(product.category || "Components")}
          </p>

          <h3>${name}</h3>

          <p class="stash-page-item-condition">
            <span
              class="sakura-status-dot"
              aria-hidden="true"
            ></span>
            ${escapeHTML(product.condition || "Student component")}
          </p>

          <p class="stash-page-item-unit">
            ${money(product.price)} each
          </p>

          <div
            class="stash-item-controls"
            aria-label="Quantity for ${name}"
          >

            <button
              class="quantity-button"
              type="button"
              data-s-qty="${id}"
              data-s-change="-1"
              aria-label="Remove one ${name}"
            >−</button>

            <output
              class="quantity-value"
              aria-label="Quantity"
            >${quantity}</output>

            <button
              class="quantity-button"
              type="button"
              data-s-qty="${id}"
              data-s-change="1"
              aria-label="Add one ${name}"
              ${quantity >= maximum ? "disabled" : ""}
            >+</button>

          </div>
        </div>

        <div class="stash-page-item-right">

          <span class="stash-page-item-sub">
            ${money(product.price * quantity)}
          </span>

          <a
            class="stash-buy-btn"
            href="${productURL}"
            aria-label="Buy ${name}"
          >
            BUY NOW <span aria-hidden="true">↗</span>
          </a>

          <button
            class="remove-item"
            type="button"
            data-s-remove="${id}"
            aria-label="Remove ${name} from Stash"
          >
            Remove
          </button>

        </div>
      </article>
    `;
    }

    // ── Render the complete Stash ──────────────────────────
    function render() {
      const products = getProducts();

      if (!products.length) return;

      const stash = readStash();
      const items = getItems(stash);

      const itemCount = items.reduce(
        (sum, product) => sum + stash[product.id],
        0,
      );

      const subtotal = items.reduce(
        (sum, product) => sum + Number(product.price) * stash[product.id],
        0,
      );

      const badge = $("#stash-count");

      if (badge) {
        badge.textContent = itemCount;
        badge.setAttribute("aria-label", `${itemCount} items in Stash`);
      }

      const subtitle = $("#stash-subtitle");

      if (subtitle) {
        subtitle.textContent = items.length
          ? `${items.length} component${items.length === 1 ? "" : "s"} · ${itemCount} item${itemCount === 1 ? "" : "s"} saved`
          : "Your little collection of possibilities";
      }

      const emptyState = $("#stash-page-empty");
      const content = $("#stash-page-content");

      if (emptyState) {
        emptyState.hidden = items.length !== 0;
      }

      if (content) {
        content.hidden = items.length === 0;
      }

      const list = $("#stash-item-list");

      if (list) {
        list.innerHTML = items
          .map((product) => renderItem(product, stash[product.id]))
          .join("");
      }

      // ── Order summary ───────────────────────────────────
      const summary = $("#stash-summary-lines");

      if (summary) {
        summary.innerHTML = items.length
          ? items
              .map(
                (product) => `
                <div class="stash-summary-line">
                  <span>
                    ${escapeHTML(product.name)} × ${stash[product.id]}
                  </span>
                  <span>
                    ${money(product.price * stash[product.id])}
                  </span>
                </div>
              `,
              )
              .join("")
          : `
            <p class="stash-summary-empty">
              Your next project starts with one little part. 🌸
            </p>
          `;
      }

      // ── Total ───────────────────────────────────────────
      const total = $("#stash-total");

      if (total) {
        total.textContent = money(subtotal);
      }

      // ── Footer year ─────────────────────────────────────
      const year = $("#current-year");

      if (year) {
        year.textContent = new Date().getFullYear();
      }
    }

    // ── Quantity controls ─────────────────────────────────
    function changeQuantity(id, change) {
      if (!Number.isInteger(change) || change === 0) return;

      const product = getProducts().find((item) => item.id === id);
      if (!product) return;

      const stash = readStash();
      const current = stash[id] || 0;
      const next = current + change;

      const maximum = Math.min(
        99,
        Math.max(0, Math.floor(Number(product.stock) || 0)),
      );

      if (next <= 0) {
        delete stash[id];
      } else if (next > maximum) {
        showToast(`Only ${maximum} units are available.`);
        return;
      } else {
        stash[id] = next;
      }

      if (writeStash(stash)) {
        render();
        window.dispatchEvent(new CustomEvent("rassam:stash-updated"));
      }
    }

    // ── Remove product ────────────────────────────────────
    function removeItem(id) {
      const product = getProducts().find((item) => item.id === id);
      const stash = readStash();

      if (!Object.prototype.hasOwnProperty.call(stash, id)) {
        return;
      }

      delete stash[id];

      if (writeStash(stash)) {
        render();

        window.dispatchEvent(new CustomEvent("rassam:stash-updated"));

        showToast(
          product
            ? `${product.name} removed from your Stash.`
            : "Item removed from your Stash.",
        );
      }
    }

    // ── Events ────────────────────────────────────────────
    function bindEvents() {
      document.addEventListener("click", (event) => {
        const target = event.target instanceof Element ? event.target : null;

        if (!target) return;

        const quantityButton = target.closest("[data-s-qty]");

        if (quantityButton) {
          changeQuantity(
            quantityButton.dataset.sQty,
            Number(quantityButton.dataset.sChange),
          );
          return;
        }

        const removeButton = target.closest("[data-s-remove]");

        if (removeButton) {
          removeItem(removeButton.dataset.sRemove);
        }

        // BUY NOW remains a normal link to the selected product's details.
        // Product images and names do not navigate anywhere.
      });

      window.addEventListener("pageshow", render);

      window.addEventListener("storage", (event) => {
        if (event.key === STORAGE_KEY || event.key === null) {
          render();
        }
      });

      window.addEventListener("rassam:stash-updated", render);
    }

    // ── Initialization ────────────────────────────────────
    function init(attempt = 0) {
      if (!getProducts().length) {
        if (attempt < 40) {
          setTimeout(() => init(attempt + 1), 100);
        } else {
          console.error(
            "RASSAM Stash: Product catalogue failed to load. Check app.js.",
          );
        }

        return;
      }

      bindEvents();
      render();
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => init(), {
        once: true,
      });
    } else {
      init();
    }
  },
)();
