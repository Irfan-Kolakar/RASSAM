/* RASSAM — Shared catalogue + the ONE Stash module.
   Every page (home, Buy Components, product page, checkout) reads and writes the Stash
   through window.RASSAM so quantities, totals and storage stay consistent.
   Storage format (unchanged): localStorage["rassam-stash-v1"] = { "<productId>": quantity }
   This demo does not reserve stock; the server must re-check prices and stock. */

(() => {
  "use strict";

  // ── Product catalogue ─────────────────────────────────
  const CATEGORIES = {
    boards: "Microcontrollers & Development Boards",
    components: "Sensors & Electronic Components",
    robotics: "Motors, Drivers & Robotics",
    power: "Batteries, Power & Project Kits",
    tools: "Tools, Lab Equipment & Accessories",
  };

  const PRODUCTS = [
    {
      id: "esp32-devkit",
      name: "ESP32 Development Board",
      category: CATEGORIES.boards,
      price: 249,
      badge: "MAKER FAVOURITE",
      description: "Wi-Fi and Bluetooth for your next connected build.",
      icon: "▦",
      art: "board",
      keywords: "wifi bluetooth dev kit microcontroller",
      stock: 10,
    },
    {
      id: "arduino-nano",
      name: "Arduino Nano Compatible",
      category: CATEGORIES.boards,
      price: 180,
      badge: "COMPACT BUILD",
      description: "A small board for compact prototypes.",
      icon: "▤",
      art: "board",
      keywords: "arduino controller",
      stock: 10,
    },
    {
      id: "jumper-wires",
      name: "Jumper Wire Set",
      category: CATEGORIES.components,
      price: 55,
      badge: "SMALL BUT MIGHTY",
      description: "A handy set for breadboard connections.",
      icon: "〰",
      art: "wires",
      keywords: "male female dupont wire",
      stock: 10,
    },
    {
      id: "ir-sensor",
      name: "IR Obstacle Sensor",
      category: CATEGORIES.components,
      price: 45,
      badge: "UNDER ₹50",
      description: "Help a robot detect nearby objects.",
      icon: "◉",
      art: "sensor",
      keywords: "infrared sensor obstacle",
      stock: 10,
    },
    {
      id: "temperature-sensor",
      name: "Temperature Sensor Module",
      category: CATEGORIES.components,
      price: 65,
      badge: "PROJECT BASIC",
      description: "For simple temperature-monitoring experiments.",
      icon: "⌁",
      art: "sensor",
      keywords: "thermal heat temperature",
      stock: 10,
    },
    {
      id: "breadboard",
      name: "830-Point Breadboard",
      category: CATEGORIES.components,
      price: 90,
      badge: "BENCH ESSENTIAL",
      description: "Prototype circuits without soldering.",
      icon: "▥",
      art: "board",
      keywords: "solderless prototyping board",
      stock: 10,
    },
    {
      id: "ic-741",
      name: "IC 741 Op-Amp",
      category: CATEGORIES.components,
      price: 18,
      badge: "TINY COMPONENT",
      description: "A classic IC for analogue electronics practice.",
      icon: "▥",
      art: "chip",
      keywords: "integrated circuit op amp transistor capacitor resistor",
      stock: 10,
    },
    {
      id: "dc-motor-30",
      name: "DC Gear Motor · 30 RPM",
      category: CATEGORIES.robotics,
      price: 110,
      badge: "SLOW & STEADY",
      description: "Low-speed geared movement for student robots.",
      icon: "✳",
      art: "motor",
      keywords: "dc motor gear 30rpm",
      stock: 10,
    },
    {
      id: "dc-motor-60",
      name: "DC Gear Motor · 60 RPM",
      category: CATEGORIES.robotics,
      price: 125,
      badge: "ROBOTICS PICK",
      description: "A versatile geared motor for moving builds.",
      icon: "✳",
      art: "motor",
      keywords: "dc motor gear 60rpm",
      stock: 10,
    },
    {
      id: "servo-motor",
      name: "SG90 Micro Servo",
      category: CATEGORIES.robotics,
      price: 95,
      badge: "PRECISE MOTION",
      description: "Small-angle movement for arms, gates and models.",
      icon: "⚙",
      art: "motor",
      keywords: "servo motor robotics",
      stock: 10,
    },
    {
      id: "stepper-driver",
      name: "Stepper Motor Driver Board",
      category: CATEGORIES.robotics,
      price: 120,
      badge: "CONTROLLED MOTION",
      description: "Pair with a stepper motor for controlled movement.",
      icon: "⚙",
      art: "board",
      keywords: "stepper driver robotics",
      stock: 10,
    },
    {
      id: "l298n",
      name: "L298N Motor Driver",
      category: CATEGORIES.robotics,
      price: 135,
      badge: "DUAL MOTOR CONTROL",
      description: "Drive DC motors in your next moving project.",
      icon: "▦",
      art: "chip",
      keywords: "motor driver h bridge",
      stock: 10,
    },
    {
      id: "battery-9v",
      name: "9V Battery + Clip",
      category: CATEGORIES.power,
      price: 40,
      badge: "POWER UP",
      description: "A simple power source for small experiments.",
      icon: "▯",
      art: "power",
      keywords: "battery clip power",
      stock: 10,
    },
    {
      id: "relay-module",
      name: "5V Relay Module",
      category: CATEGORIES.power,
      price: 75,
      badge: "SWITCH IT",
      description: "Control a separate circuit from your board.",
      icon: "▣",
      art: "power",
      keywords: "relay switch module",
      stock: 10,
    },
    {
      id: "led-pack",
      name: "Assorted LED Pack",
      category: CATEGORIES.power,
      price: 35,
      badge: "COLOUR YOUR BUILD",
      description: "Bright indicators for prototypes and demos.",
      icon: "✦",
      art: "power",
      keywords: "led lights diodes",
      stock: 10,
    },
    {
      id: "wire-cutter",
      name: "Precision Wire Cutter",
      category: CATEGORIES.tools,
      price: 160,
      badge: "TOOLBOX PICK",
      description: "A useful bench tool for neat wire work.",
      icon: "✂",
      art: "tool",
      keywords: "cutting plier cutter tools",
      stock: 10,
    },
    {
      id: "water-pump",
      name: "9V Mini Water Pump",
      category: CATEGORIES.power,
      price: 150,
      badge: "MAKE IT FLOW",
      description: "A compact pump for small water-project prototypes.",
      icon: "↗",
      art: "power",
      keywords: "pump water irrigation",
      stock: 10,
    },
    {
      id: "stepper-motor",
      name: "Stepper Motor",
      category: CATEGORIES.robotics,
      price: 175,
      badge: "CONTROLLED STEPS",
      description: "Repeatable rotation for precise project movement.",
      icon: "⚙",
      art: "motor",
      keywords: "stepper motor",
      stock: 10,
    },
  ];

  // ── Utilities ──────────────────────────────────────────
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [
    ...root.querySelectorAll(selector),
  ];

  const STORAGE_KEY = "rassam-stash-v1";

  const money = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);

  const escapeHTML = (value) =>
    String(value).replace(
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

  const maxFor = (product) =>
    Math.min(99, Math.max(0, Math.floor(Number(product.stock) || 0)));

  let activeCategory = "all";
  let searchTerm = "";
  let toastTimer = null;
  let previousFocus = null;
  let stash = readStash();

  // ── Storage ────────────────────────────────────────────
  function readStash() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      if (!saved || typeof saved !== "object" || Array.isArray(saved))
        return {};

      return Object.fromEntries(
        Object.entries(saved)
          .map(([id, quantity]) => {
            const product = PRODUCTS.find((item) => item.id === id);
            if (!product || !Number.isInteger(quantity) || quantity <= 0)
              return null;
            return [id, Math.min(quantity, maxFor(product))];
          })
          .filter((entry) => entry && entry[1] > 0),
      );
    } catch {
      return {};
    }
  }

  function saveStash() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stash));
      return true;
    } catch {
      showToast("Browser storage is unavailable. Your Stash may not persist.");
      return false;
    }
  }

  // Redraw everything that shows the Stash, then tell other scripts (e.g. the Buy page).
  function refresh() {
    renderStash();
    renderProducts();
    window.dispatchEvent(
      new CustomEvent("rassam:stash-updated", { detail: { source: "app" } }),
    );
  }

  // Save + redraw. Every Stash change goes through here.
  function commit() {
    saveStash();
    refresh();
  }

  // Re-read storage (another tab changed it, or the page was restored).
  function reload() {
    stash = readStash();
    refresh();
  }

  // ── Product artwork ────────────────────────────────────
  function art(product) {
    return `
      <div class="product-art product-art-${escapeHTML(product.art)}" aria-hidden="true">
        <span>${escapeHTML(product.icon)}</span>
        <i></i>
        <b></b>
      </div>
    `;
  }

  // ── Homepage product grid (hidden "marketplace engine" on index.html) ─
  function renderProducts() {
    const grid = $("#product-grid");
    if (!grid) return;

    const term = searchTerm.toLocaleLowerCase();

    const filtered = PRODUCTS.filter(
      (product) =>
        (activeCategory === "all" || product.category === activeCategory) &&
        `${product.name} ${product.category} ${product.description} ${product.keywords}`
          .toLocaleLowerCase()
          .includes(term),
    );

    grid.innerHTML = filtered
      .map((product, index) => {
        const quantity = stash[product.id] || 0;
        const maximum = maxFor(product);

        return `
          <article class="product-card" style="animation-delay:${Math.min(index * 35, 245)}ms">
            <div class="product-image">
              ${art(product)}
              <span class="product-badge">${escapeHTML(product.badge)}</span>
            </div>
            <div class="product-info">
              <p class="product-category">${escapeHTML(product.category)}</p>
              <h3>${escapeHTML(product.name)}</h3>
              <p class="product-description">${escapeHTML(product.description)}</p>
              <div class="product-bottom">
                <div class="product-price">
                  ${money(product.price)}
                  <small>DEMO PRICE</small>
                </div>
                <button
                  class="add-to-stash"
                  type="button"
                  data-add="${escapeHTML(product.id)}"
                  aria-label="Add ${escapeHTML(product.name)} to Stash"
                  ${maximum <= 0 || quantity >= maximum ? "disabled" : ""}
                >
                  ${maximum <= 0 ? "OUT OF STOCK" : quantity ? `STASHED (${quantity})` : "STASH IT!"}
                  <span aria-hidden="true">↗</span>
                </button>
              </div>
            </div>
          </article>
        `;
      })
      .join("");

    const resultsCount = $("#results-count");
    if (resultsCount) {
      resultsCount.textContent = `${filtered.length} ${filtered.length === 1 ? "component" : "components"} to explore`;
    }

    const emptyResults = $("#empty-results");
    if (emptyResults) emptyResults.hidden = filtered.length !== 0;

    grid.hidden = filtered.length === 0;

    const activeFilterRow = $("#active-filter-row");
    if (activeFilterRow) activeFilterRow.hidden = activeCategory === "all";

    const activeFilterLabel = $("#active-filter-label");
    if (activeFilterLabel) {
      activeFilterLabel.textContent =
        activeCategory === "all" ? "" : activeCategory;
    }

    $$(".category-card").forEach((card) => {
      const selected = card.dataset.category === activeCategory;
      card.classList.toggle("is-active", selected);
      card.setAttribute("aria-pressed", String(selected));
    });
  }

  // ── Stash count ────────────────────────────────────────
  function totalQuantity() {
    return Object.values(stash).reduce((sum, quantity) => sum + quantity, 0);
  }

  function updateStashCount() {
    const total = totalQuantity();

    const badge = $("#stash-count");
    if (badge) {
      badge.textContent = total;
      badge.setAttribute("aria-label", `${total} items in Stash`);
    }

    const drawerCount = $("#drawer-count");
    if (drawerCount) {
      drawerCount.textContent =
        total === 1
          ? "· 1 item stashed"
          : total > 1
            ? `· ${total} items stashed`
            : "";
      drawerCount.classList.add("sakura-stash-count");
    }

    return total;
  }

  // ── Stash drawer contents ──────────────────────────────
  function renderStash() {
    const container = $("#stash-items");

    if (!container) {
      updateStashCount();
      return;
    }

    const items = PRODUCTS.filter((product) => (stash[product.id] || 0) > 0);

    const emptyMessage = $("#stash-empty");
    const drawerFooter = $("#drawer-footer");
    if (emptyMessage) emptyMessage.hidden = items.length > 0;
    if (drawerFooter) drawerFooter.hidden = items.length === 0;

    container.innerHTML = items
      .map((product) => {
        const quantity = stash[product.id];
        const subtotal = product.price * quantity;
        const maximum = maxFor(product);

        return `
          <article class="stash-item">
            <div class="stash-item-image">${art(product)}</div>
            <div class="stash-item-info">
              <h3>${escapeHTML(product.name)}</h3>
              <p>${money(product.price)} each</p>
              <div class="stash-item-controls" aria-label="Quantity for ${escapeHTML(product.name)}">
                <button class="quantity-button" type="button"
                  data-quantity="${escapeHTML(product.id)}" data-change="-1"
                  aria-label="Remove one ${escapeHTML(product.name)}">−</button>
                <span class="quantity-value">${quantity}</span>
                <button class="quantity-button" type="button"
                  data-quantity="${escapeHTML(product.id)}" data-change="1"
                  aria-label="Add one ${escapeHTML(product.name)}"
                  ${quantity >= maximum ? "disabled" : ""}>+</button>
              </div>
            </div>
            <div class="stash-item-price">
              ${money(subtotal)}
              <button class="remove-item" type="button"
                data-remove="${escapeHTML(product.id)}"
                aria-label="Remove ${escapeHTML(product.name)} from Stash">Remove</button>
            </div>
          </article>
        `;
      })
      .join("");

    const subtotalElement = $("#stash-subtotal");
    if (subtotalElement) {
      subtotalElement.textContent = money(
        items.reduce(
          (sum, product) => sum + product.price * stash[product.id],
          0,
        ),
      );
    }

    updateStashCount();
  }

  // ── Toast notifications ────────────────────────────────
  function showToast(message) {
    const toast = $("#toast");
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("is-visible");

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2700);
  }

  // ── Stash operations ──────────────────────────────────
  // Adds `quantity` units. Returns { ok, message, quantity } so callers can react.
  function addItem(id, quantity = 1) {
    const product = PRODUCTS.find((item) => item.id === id);
    if (!product)
      return { ok: false, message: "This component could not be found." };

    const amount = Math.floor(Number(quantity));
    if (!Number.isFinite(amount) || amount < 1) {
      return { ok: false, message: "Choose a quantity of at least 1." };
    }

    const maximum = maxFor(product);
    if (maximum <= 0)
      return {
        ok: false,
        message: "This component is currently out of stock.",
      };

    const current = stash[id] || 0;
    const room = maximum - current;

    if (room <= 0)
      return { ok: false, message: `Only ${maximum} units are available.` };
    if (amount > room) {
      return {
        ok: false,
        message: `You can add only ${room} more unit(s) of this product.`,
      };
    }

    stash[id] = current + amount;
    commit();
    return { ok: true, message: "", quantity: stash[id] };
  }

  function addToStash(id) {
    const product = PRODUCTS.find((item) => item.id === id);
    if (!product) return;

    const result = addItem(id, 1);
    showToast(
      result.ok
        ? `${product.name} added to your Stash 🌸 ,Click Stash in right corner to place order !`
        : result.message,
    );
  }

  function changeQuantity(id, amount) {
    const product = PRODUCTS.find((item) => item.id === id);
    if (!product || !stash[id]) return;

    const nextQuantity = stash[id] + amount;
    const maximum = maxFor(product);

    if (nextQuantity <= 0) {
      delete stash[id];
    } else if (nextQuantity > maximum) {
      showToast(`Only ${maximum} units are available.`);
      return;
    } else {
      stash[id] = nextQuantity;
    }

    commit();
  }

  function removeFromStash(id) {
    const product = PRODUCTS.find((item) => item.id === id);
    if (!product || !stash[id]) return;

    delete stash[id];
    commit();
    showToast(`${product.name} removed from your Stash.`);
  }

  function removeItems(ids) {
    ids.forEach((id) => delete stash[id]);
    commit();
  }

  function clearStash() {
    stash = {};
    commit();
  }

  // ── Stash drawer open / close ─────────────────────────
  function isDrawerOpen() {
    return Boolean($("#stash-drawer")?.classList.contains("is-open"));
  }

  function openStash() {
    const drawer = $("#stash-drawer");
    const backdrop = $("#drawer-backdrop");
    if (!drawer || !backdrop || isDrawerOpen()) return;

    previousFocus = document.activeElement;
    renderStash();

    backdrop.hidden = false;
    drawer.inert = false;
    drawer.setAttribute("aria-hidden", "false");
    drawer.classList.add("is-open");
    document.body.classList.add("stash-open");
    $("#open-stash")?.setAttribute("aria-expanded", "true");
    $("#close-stash")?.focus();
  }

  function closeStash() {
    const drawer = $("#stash-drawer");
    const backdrop = $("#drawer-backdrop");
    if (!drawer || !backdrop || !isDrawerOpen()) return;

    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    drawer.inert = true;
    backdrop.hidden = true;
    document.body.classList.remove("stash-open");
    $("#open-stash")?.setAttribute("aria-expanded", "false");

    if (previousFocus && typeof previousFocus.focus === "function") {
      previousFocus.focus();
    }
  }

  // ── Filters (home page grid) ──────────────────────────
  function clearFilters() {
    activeCategory = "all";
    searchTerm = "";
    const searchInput = $("#product-search");
    if (searchInput) searchInput.value = "";
    renderProducts();
  }

  // ── Mobile navigation ─────────────────────────────────
  function closeMobileMenu() {
    const menu = $("#mobile-nav");
    const button = $("#menu-toggle");
    if (menu) menu.hidden = true;
    if (button) {
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-label", "Open menu");
      button.classList.remove("is-open");
    }
  }

  // ── Event handlers ────────────────────────────────────
  function bindEvents() {
    $("#product-search")?.addEventListener("input", (event) => {
      searchTerm = event.target.value.trim();
      renderProducts();
    });

    document.addEventListener("keydown", (event) => {
      const target = event.target;
      const isTyping =
        target instanceof HTMLElement &&
        (target.matches("input, textarea, select") || target.isContentEditable);

      if (
        event.key === "/" &&
        !isTyping &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        const search = $("#product-search") || $("#shop-search");
        if (search) {
          event.preventDefault();
          search.focus();
        }
      }

      if (event.key === "Escape") {
        closeStash();
        closeMobileMenu();
      }
    });

    $$(".category-card").forEach((card) => {
      card.addEventListener("click", () => {
        activeCategory =
          activeCategory === card.dataset.category
            ? "all"
            : card.dataset.category;
        renderProducts();
        $("#marketplace")?.scrollIntoView({
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
          block: "start",
        });
      });
    });

    $("#reset-filters")?.addEventListener("click", clearFilters);
    $("#reset-filters-empty")?.addEventListener("click", clearFilters);

    // Stash drawer controls.
    $("#open-stash")?.addEventListener("click", openStash);
    $("#close-stash")?.addEventListener("click", closeStash);
    $("#drawer-backdrop")?.addEventListener("click", closeStash);
    $("#continue-shopping")?.addEventListener("click", closeStash);

    $("#discover-components")?.addEventListener("click", () => {
      closeStash();
      $("#marketplace")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    // Checkout: checkout.js intercepts this click first and opens the order dialog.
    // This fallback only runs on a page that does not load checkout.js.
    $("#review-stash")?.addEventListener("click", () => {
      if (totalQuantity() === 0) {
        showToast("Your Stash is empty — find a component first 🌸");
        return;
      }
      if (typeof api.openCheckout === "function") {
        closeStash();
        api.openCheckout();
      } else {
        showToast("Checkout is not available on this page.");
      }
    });

    $("#sell-button")?.addEventListener("click", () => {
      showToast(
        "Seller tools are coming soon. Demo listings cannot be purchased yet.",
      );
    });

    // Mobile menu.
    $("#menu-toggle")?.addEventListener("click", () => {
      const menu = $("#mobile-nav");
      const button = $("#menu-toggle");
      if (!menu || !button) return;

      const willOpen = menu.hidden;
      menu.hidden = !willOpen;
      button.setAttribute("aria-expanded", String(willOpen));
      button.setAttribute("aria-label", willOpen ? "Close menu" : "Open menu");
      button.classList.toggle("is-open", willOpen);
    });

    $$("#mobile-nav a").forEach((link) =>
      link.addEventListener("click", closeMobileMenu),
    );

    // Product + Stash drawer buttons (one delegated handler for the whole page).
    document.addEventListener("click", (event) => {
      const target =
        event.target instanceof Element
          ? event.target
          : event.target?.parentElement;
      if (!target) return;

      const addButton = target.closest("[data-add]");
      if (addButton) {
        addToStash(addButton.dataset.add);
        return;
      }

      const quantityButton = target.closest("[data-quantity]");
      if (quantityButton) {
        const amount = Number(quantityButton.dataset.change);
        if (Number.isFinite(amount) && amount !== 0) {
          changeQuantity(quantityButton.dataset.quantity, amount);
        }
        return;
      }

      const removeButton = target.closest("[data-remove]");
      if (removeButton) removeFromStash(removeButton.dataset.remove);
    });

    // Keep keyboard focus inside the open drawer.
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Tab") return;
      const drawer = $("#stash-drawer");
      if (!drawer || !drawer.classList.contains("is-open")) return;

      const focusable = $$(
        'button:not(:disabled), a[href], input:not(:disabled), [tabindex]:not([tabindex="-1"])',
        drawer,
      ).filter((element) => !element.hidden && element.offsetParent !== null);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    const year = $("#current-year");
    if (year) year.textContent = new Date().getFullYear();

    // Stay in sync with other tabs, restored pages, and scripts that changed storage themselves.
    window.addEventListener("storage", (event) => {
      if (event.key !== STORAGE_KEY && event.key !== null) return;
      reload();
    });
    window.addEventListener("pageshow", reload);
    window.addEventListener("rassam:stash-updated", (event) => {
      if (event.detail && event.detail.source === "app") return;
      reload();
    });
  }

  // ── Initialise ────────────────────────────────────────
  function init() {
    renderProducts();
    renderStash();
    updateStashCount();
    bindEvents();
  }

  // ── Shared API for every RASSAM page ──────────────────
  const api = {
    PRODUCTS,
    money,
    escapeHTML,
    art,
    STORAGE_KEY,
    getStash: () => ({ ...stash }),
    addItem,
    removeItems,
    clear: clearStash,
    openStash,
    closeStash,
    showToast,
    openCheckout: undefined, // set by checkout.js
  };
  window.RASSAM = api;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
  /* ===== RASSAM: Order Updates Popup ===== */
  /* ===== RASSAM: Order Updates Popup ===== */

  (() => {
    const openButton = document.getElementById("open-order-updates");
    const closeButton = document.getElementById("close-order-updates");
    const panel = document.getElementById("order-updates-panel");
    const backdrop = document.getElementById("order-panel-backdrop");

    const form = document.getElementById("order-update-form");
    const orderInput = document.getElementById("order-update-id");
    const messageInput = document.getElementById("order-update-message");

    const results = document.getElementById("order-update-results");
    const messageStatus = document.getElementById("order-message-status");
    const checkButton = document.getElementById("check-order-updates");
    const sendButton = document.getElementById("send-order-message");

    if (
      !openButton ||
      !closeButton ||
      !panel ||
      !backdrop ||
      !form ||
      !orderInput ||
      !messageInput ||
      !results ||
      !messageStatus ||
      !checkButton ||
      !sendButton
    ) {
      console.warn("RASSAM Order Updates: Required HTML elements are missing.");
      return;
    }

    let checkedOrderId = "";

    function openPanel() {
      panel.hidden = false;
      backdrop.hidden = false;
      panel.setAttribute("aria-hidden", "false");
      openButton.setAttribute("aria-expanded", "true");
      document.body.classList.add("order-updates-open");

      orderInput.focus();
    }

    function closePanel() {
      panel.hidden = true;
      backdrop.hidden = true;
      panel.setAttribute("aria-hidden", "true");
      openButton.setAttribute("aria-expanded", "false");
      document.body.classList.remove("order-updates-open");

      openButton.focus();
    }

    openButton.addEventListener("click", openPanel);
    closeButton.addEventListener("click", closePanel);
    backdrop.addEventListener("click", closePanel);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !panel.hidden) {
        closePanel();
      }
    });

    async function apiRequest(url, options = {}) {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || data.message || "Request failed.");
      }

      return data;
    }

    function showStatus(element, text, type = "") {
      element.textContent = text;
      element.className = type;
    }

    function showOrder(data) {
      results.replaceChildren();

      /*
      Supports common response shapes:
      { order: {...}, messages: [...] }
      or { ...order fields..., messages: [...] }
    */
      const order = data.order || data;
      const messages = Array.isArray(data.messages)
        ? data.messages
        : Array.isArray(order.messages)
          ? order.messages
          : [];

      const heading = document.createElement("h3");
      heading.textContent = "Order details";
      results.appendChild(heading);

      const details = [
        ["Order ID", order.id || order.orderId || checkedOrderId],
        ["Status", order.status || "Status not provided"],
        ["Delivery", order.delivery || order.deliveryStatus || "Not provided"],
      ];

      details.forEach(([label, value]) => {
        const row = document.createElement("p");
        const strong = document.createElement("strong");
        strong.textContent = `${label}: `;
        row.append(strong, document.createTextNode(String(value)));
        results.appendChild(row);
      });

      const messageHeading = document.createElement("h3");
      messageHeading.textContent = "Conversation";
      results.appendChild(messageHeading);

      if (messages.length === 0) {
        const empty = document.createElement("p");
        empty.textContent = "No messages yet.";
        results.appendChild(empty);
        return;
      }

      messages.forEach((message) => {
        const row = document.createElement("p");
        const sender = document.createElement("strong");

        sender.textContent = `${message.sender || message.from || "Message"}: `;

        row.append(
          sender,
          document.createTextNode(
            String(message.text || message.message || ""),
          ),
        );

        results.appendChild(row);
      });
    }

    async function checkOrder() {
      const orderId = orderInput.value.trim();

      if (!orderId) {
        showStatus(results, "Please enter your order ID.", "order-error");
        return;
      }

      checkedOrderId = orderId;
      checkButton.disabled = true;
      results.textContent = "Checking your order...";

      try {
        const data = await apiRequest(
          `/api/messages?orderId=${encodeURIComponent(orderId)}`,
        );

        showOrder(data);
        showStatus(messageStatus, "");
      } catch (error) {
        results.textContent = error.message;
      } finally {
        checkButton.disabled = false;
      }
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      checkOrder();
    });

    sendButton.addEventListener("click", async () => {
      const orderId = orderInput.value.trim();
      const message = messageInput.value.trim();

      if (!orderId) {
        showStatus(messageStatus, "Enter your order ID first.", "order-error");
        orderInput.focus();
        return;
      }

      if (!message) {
        showStatus(
          messageStatus,
          "Please write a message first.",
          "order-error",
        );
        messageInput.focus();
        return;
      }

      sendButton.disabled = true;
      showStatus(messageStatus, "Sending message...");

      try {
        await apiRequest("/api/messages", {
          method: "POST",
          body: JSON.stringify({
            orderId,
            text: message,
          }),
        });

        messageInput.value = "";
        checkedOrderId = orderId;

        showStatus(
          messageStatus,
          "Message sent successfully.",
          "order-success",
        );

        const data = await apiRequest(
          `/api/messages?orderId=${encodeURIComponent(orderId)}`,
        );

        showOrder(data);
      } catch (error) {
        showStatus(messageStatus, error.message, "order-error");
      } finally {
        sendButton.disabled = false;
      }
    });
  })();
})();
