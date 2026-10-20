/* RASSAM — Sell form. Blocks the old "coming soon" click and opens a real form. */
(() => {
  "use strict";

  const CATEGORIES = [
    "Microcontrollers & Development Boards",
    "Sensors & Electronic Components",
    "Motors, Drivers & Robotics",
    "Batteries, Power & Project Kits",
    "Tools, Lab Equipment & Accessories",
  ];
  const CONDITIONS = ["New", "Like New", "Good", "Fair"];

  // Capture phase on window runs before app.js's listener on the button.
  window.addEventListener(
    "click",
    (e) => {
      if (!e.target.closest("#sell-button")) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      openDialog();
    },
    true,
  );

  function build() {
    const dlg = document.createElement("dialog");
    dlg.id = "sell-dialog";
    dlg.className = "sell-dialog";
    dlg.innerHTML = `
      <form class="sell-form" id="sell-form" novalidate>
        <h3>List a component.</h3>
        <label>Title
          <input name="title" required minlength="3" maxlength="80" placeholder="e.g. HC-SR04 ultrasonic sensor" autocomplete="off" />
        </label>
        <label>Category
          <select name="category" required>
            ${CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join("")}
          </select>
        </label>
        <div class="sell-row">
          <label>Condition
            <select name="condition" required>
              ${CONDITIONS.map((c) => `<option value="${c}">${c}</option>`).join("")}
            </select>
          </label>
          <label>Stock
            <input name="stock" type="number" min="1" max="99" step="1" required value="1" />
          </label>
        </div>
        <label>Price (₹)
          <input name="price" type="number" min="1" max="100000" step="1" required placeholder="e.g. 120" />
        </label>
        <label>Description
          <textarea name="description" maxlength="500" placeholder="Working condition, what's included, anything to know."></textarea>
        </label>
        <p class="sell-msg" id="sell-msg" role="status" aria-live="polite"></p>
        <div class="sell-actions">
          <button class="sell-cancel" type="button">Cancel</button>
          <button class="btn btn-primary" type="submit">List component <span aria-hidden="true">↗</span></button>
        </div>
      </form>`;
    return dlg;
  }

  function openDialog() {
    let dlg = document.querySelector("#sell-dialog");
    if (!dlg) {
      dlg = build();
      document.body.appendChild(dlg);
      bind(dlg);
    }
    dlg.querySelector("#sell-msg").textContent = "";
    dlg.querySelector("#sell-msg").className = "sell-msg";
    dlg.showModal();
  }

  function bind(dlg) {
    const form = dlg.querySelector("#sell-form");
    const msg = dlg.querySelector("#sell-msg");
    const submit = form.querySelector('[type="submit"]');

    dlg
      .querySelector(".sell-cancel")
      .addEventListener("click", () => dlg.close());

    // Click on the dark backdrop closes the dialog.
    dlg.addEventListener("click", (e) => {
      if (e.target === dlg) dlg.close();
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;

      const raw = Object.fromEntries(new FormData(form).entries());
      const payload = {
        title: raw.title,
        category: raw.category,
        condition: raw.condition,
        price: Number(raw.price),
        stock: Number(raw.stock),
        description: raw.description,
      };

      msg.className = "sell-msg";
      msg.textContent = "Saving…";
      submit.disabled = true;
      try {
        const res = await fetch("/api/listings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || !data.success)
          throw new Error(data.message || "Could not save the listing.");
        msg.className = "sell-msg is-ok";
        msg.textContent = `Listed. Reference: ${data.listing.id}`;
        form.reset();
        form.querySelector('[name="stock"]').value = 1;
        setTimeout(() => dlg.open && dlg.close(), 2200);
      } catch (err) {
        msg.className = "sell-msg is-err";
        msg.textContent = err.message;
      } finally {
        submit.disabled = false;
      }
    });
  }
})();
