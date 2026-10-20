/* RASSAM — Checkout dialog. Works from the home page drawer, the Buy Components page
   and the product page (Buy Now).
   Stash data comes only from window.RASSAM (app.js). The order is still POSTed to
   /api/orders: { name, phone, pincode, address, paymentMethod: "cod"|"online", items:[{id, qty}] }.
   The server re-prices the order and validates everything again; totals here are an estimate.
   Online payment = Razorpay Checkout; the server verifies the payment signature. */
(() => {
  "use strict";

  const data = window.RASSAM;
  if (!data) return;

  const { PRODUCTS, money, escapeHTML } = data;

  // ── Validation (browser side) ────────────────────────
  // The server MUST repeat these checks; frontend validation alone is not security.
  const NAME_RE = /^.{2,60}$/;

  // Indian mobile: 10 digits starting 6-9, optional +91 / 91 prefix, spaces or hyphens allowed.
  // Returns the clean 10-digit number, or null if invalid (never "fixes" a bad number).
  function normalizePhone(raw) {
    const text = String(raw || "").trim();
    if (!/^\+?[0-9\s-]+$/.test(text)) return null;
    let digits = text.replace(/[\s-]/g, "");
    if (digits.startsWith("+91")) digits = digits.slice(3);
    else if (digits.startsWith("+")) return null;
    else if (digits.length === 12 && digits.startsWith("91"))
      digits = digits.slice(2);
    return /^[6-9][0-9]{9}$/.test(digits) ? digits : null;
  }

  // Indian PIN: exactly 6 digits, first digit 1-9.
  const isPincode = (raw) => /^[1-9][0-9]{5}$/.test(String(raw || "").trim());

  const VALIDATORS = {
    name: (v) =>
      NAME_RE.test(v.trim()) ? "" : "Enter your full name (2–60 characters).",
    phone: (v) =>
      normalizePhone(v)
        ? ""
        : "Enter a valid 10-digit Indian mobile number (starts with 6–9). +91 is optional.",
    pincode: (v) =>
      isPincode(v)
        ? ""
        : "Enter a 6-digit PIN code that does not start with 0.",
    address: (v) =>
      v.trim().length >= 10 && v.trim().length <= 300
        ? ""
        : "Enter your full delivery address (10–300 characters).",
  };

  // The Cancel button and fields are styled explicitly so they stay readable on every page.
  // Scoped to dialog.checkout-dialog; buy.css already styles the dialog on the Buy page.
  function ensureStyles() {
    if (document.getElementById("checkout-dialog-styles")) return;
    const style = document.createElement("style");
    style.id = "checkout-dialog-styles";
    style.textContent = `
    dialog.checkout-dialog .checkout-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

dialog.checkout-dialog .checkout-heading h3 {
  margin: 0 0 18px;
}

dialog.checkout-dialog .checkout-top-close {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  margin-bottom: 18px;
  border: 1px solid var(--border, rgba(255, 255, 255, 0.18));
  border-radius: 50%;
  background: transparent;
  color: #ff69b4;
  font-size: 26px;
  cursor: pointer;
}

dialog.checkout-dialog .checkout-top-close:hover {
  background: rgba(255, 105, 180, 0.14);
}
      body:not(.buy-page) dialog.checkout-dialog {
        width: min(560px, calc(100% - 28px)); max-height: 88dvh; overflow-y: auto;
        padding: 0; color: #28221d; background: #fffaf3;
        border: 1px solid #e3d2c5; border-radius: 10px;
        box-shadow: 0 24px 90px rgba(46, 34, 28, 0.3);
      }
      body:not(.buy-page) dialog.checkout-dialog::backdrop { background: rgba(39,30,26,.6); }
      body:not(.buy-page) dialog.checkout-dialog .sell-form { padding: clamp(20px, 5vw, 34px); }
      body:not(.buy-page) dialog.checkout-dialog h3 { color: #28221d; }
      body:not(.buy-page) dialog.checkout-dialog .checkout-lines { padding: 14px; background: #f7efe6; border: 1px solid #e7d9cc; border-radius: 6px; }
      body:not(.buy-page) dialog.checkout-dialog .checkout-line,
      body:not(.buy-page) dialog.checkout-dialog .checkout-line strong,
      body:not(.buy-page) dialog.checkout-dialog .sell-form label { color: #3b322a; text-transform: none; letter-spacing: 0; font: 600 12px var(--sans, sans-serif); }
      body:not(.buy-page) dialog.checkout-dialog input,
      body:not(.buy-page) dialog.checkout-dialog textarea {
        color: #28221d !important; background: #fffdf9 !important;
        border: 1px solid #cdbba9 !important; border-radius: 6px;
      }
      body:not(.buy-page) dialog.checkout-dialog input[aria-invalid="true"],
      body:not(.buy-page) dialog.checkout-dialog textarea[aria-invalid="true"] { border-color: #b3261e !important; }
      body:not(.buy-page) dialog.checkout-dialog .sell-msg { color: #51473d; }
      body:not(.buy-page) dialog.checkout-dialog .sell-actions { gap: 10px; flex-wrap: wrap; }
      /* Cancel: clearly visible but secondary to Place order */
      body:not(.buy-page) dialog.checkout-dialog .sell-cancel {
        min-height: 46px; padding: 0 22px; color: #6b3a4c; background: #fff;
        border: 1.5px solid #b77983; border-radius: 999px; font: 700 13px var(--sans, sans-serif);
        cursor: pointer; transition: background .18s, border-color .18s;
      }
      body:not(.buy-page) dialog.checkout-dialog .sell-cancel:hover { background: #f8e3ea; border-color: #a63f68; }
      body:not(.buy-page) dialog.checkout-dialog .sell-cancel:focus-visible,
      body:not(.buy-page) dialog.checkout-dialog .button-primary:focus-visible { outline: 3px solid #a63f68; outline-offset: 3px; }
      body:not(.buy-page) dialog.checkout-dialog .button-primary { min-height: 46px; }
      body:not(.buy-page) dialog.checkout-dialog .button-primary:disabled { opacity: .55; cursor: not-allowed; }
      dialog.checkout-dialog .field-error { display: block; min-height: 1.2em; margin-top: 5px; color: #b3261e; font: 500 12px/1.4 var(--sans, sans-serif); text-transform: none; letter-spacing: 0; }
      dialog.checkout-dialog .sell-actions .sell-cancel { color: #6b3a4c; }
      dialog.checkout-dialog .pay-methods { margin: 0 0 16px; padding: 0; border: 0; display: grid; gap: 8px; }
      dialog.checkout-dialog .pay-methods legend { padding: 0 0 8px; font: 700 12px var(--sans, sans-serif); color: #51473d; }
      dialog.checkout-dialog label.pay-option { display: flex !important; flex-direction: row !important; align-items: flex-start; gap: 12px; margin: 0 !important; padding: 12px 14px; background: #fffdf9; border: 1.5px solid #dfd0c3; border-radius: 10px; cursor: pointer; text-transform: none; letter-spacing: 0; }
      dialog.checkout-dialog label.pay-option:has(input:checked) { border-color: #a63f68; background: #fdeef3; }
      dialog.checkout-dialog label.pay-option:focus-within { outline: 3px solid #a63f68; outline-offset: 2px; }
      dialog.checkout-dialog .pay-option input[type="radio"] { width: 18px !important; height: 18px !important; min-height: 0 !important; margin: 2px 0 0 !important; padding: 0 !important; display: inline-block !important; flex: 0 0 auto; accent-color: #a63f68; }
      dialog.checkout-dialog .pay-option span { display: grid; gap: 2px; color: #28221d; font: 600 13px var(--sans, sans-serif); text-transform: none; letter-spacing: 0; }
      dialog.checkout-dialog .pay-option small { color: #6a5f55; font: 400 12px/1.4 var(--sans, sans-serif); }
      dialog.checkout-dialog .pay-actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; margin-top: 18px; }
      @media (max-width: 480px) {
        dialog.checkout-dialog .sell-row { grid-template-columns: 1fr; gap: 0; }
        dialog.checkout-dialog .sell-actions { display: grid; grid-template-columns: 1fr; }
        dialog.checkout-dialog .sell-actions button { width: 100%; }
      }`;
    document.head.appendChild(style);
  }

  // Build order lines from either the whole Stash or a { productId: qty } override (Buy Now).
  function buildLines(source) {
    return PRODUCTS.map((p) => {
      const requested = Math.floor(Number(source[p.id])) || 0;
      const available = Math.min(
        99,
        Math.max(0, Math.floor(Number(p.stock) || 0)),
      );
      const qty = Math.max(0, Math.min(requested, available));
      return { id: p.id, name: p.name, qty, sub: p.price * qty };
    }).filter((line) => line.qty > 0);
  }

  // Capture phase runs before the fallback handler in app.js.
  window.addEventListener(
    "click",
    (e) => {
      const trigger =
        e.target instanceof Element &&
        e.target.closest("#review-stash, #stash-checkout");
      if (!trigger) return;
      e.preventDefault();
      e.stopImmediatePropagation();

      // If the stash drawer is open, close it first.
      data.closeStash();
      openCheckout();
    },
    true,
  );

  function openCheckout(override) {
    const lines = buildLines(override || data.getStash());
    const total = lines.reduce((sum, l) => sum + l.sub, 0);

    const dlg = document.createElement("dialog");
    ensureStyles();
    dlg.className = "sell-dialog checkout-dialog";
    dlg.innerHTML = lines.length
      ? `
      <form class="sell-form" id="checkout-form" novalidate>
      <div class="checkout-heading">
  <h3>Place your order 🌸</h3>
  <button
    type="button"
    class="checkout-top-close"
    data-close
    aria-label="Close checkout"
    title="Close checkout"
  >×</button>
</div>
        <div class="checkout-lines">
          ${lines
            .map(
              (l) => `
            <div class="checkout-line">
              <span>${escapeHTML(l.name)} × ${l.qty}</span>
              <strong>${money(l.sub)}</strong>
            </div>`,
            )
            .join("")}
          <div class="checkout-line checkout-total">
            <span>Estimated total</span><strong>${money(total)}</strong>
          </div>
        </div>
        <label>Full name
          <input name="name" required maxlength="60" autocomplete="name" />
          <span class="field-error" data-error-for="name" role="alert"></span>
        </label>
        <div class="sell-row">
          <label>Mobile number
            <input name="phone" type="tel" required inputmode="tel" autocomplete="tel" maxlength="17" placeholder="98765 43210 or +91 98765 43210" />
            <span class="field-error" data-error-for="phone" role="alert"></span>
          </label>
          <label>PIN code
            <input name="pincode" required inputmode="numeric" autocomplete="postal-code" maxlength="6" placeholder="6 digits" />
            <span class="field-error" data-error-for="pincode" role="alert"></span>
          </label>
        </div>
        <label>Delivery address
          <textarea name="address" required maxlength="300" autocomplete="street-address"></textarea>
          <span class="field-error" data-error-for="address" role="alert"></span>
        </label>
        <fieldset class="pay-methods">
          <legend>Payment method</legend>
          <label class="pay-option">
            <input type="radio" name="paymentMethod" value="cod" />
            <span>Cash on Delivery<small>Pay in cash when your order arrives. Not charged now.</small></span>
          </label>
         <label class="pay-option pay-option-disabled">
  <input type="radio" name="paymentMethod" value="online" disabled />
  <span>
    Online payment <small>Currently unavailable. Please choose Cash on Delivery.</small>
  </span>
</label>
          <span class="field-error" data-error-for="paymentMethod" role="alert"></span>
        </fieldset>
        <p class="sell-msg" id="checkout-msg" role="status" aria-live="polite"></p>
        <div class="sell-actions">
          <button class="sell-cancel" type="button" data-close>Cancel</button>
          <button class="btn btn-primary button-primary" type="submit">Place order <span aria-hidden="true">↗</span></button>
        </div>
      </form>`
      : `
      <div class="sell-form">
        <h3>Your stash is empty.</h3>
        <p class="sell-msg">Add a component first, then come back to checkout.</p>
        <div class="sell-actions"><button class="sell-cancel" type="button" data-close>Close</button></div>
      </div>`;

    document.body.appendChild(dlg);
    dlg.addEventListener("close", () => dlg.remove());
    dlg
      .querySelectorAll("[data-close]")
      .forEach((b) => b.addEventListener("click", () => dlg.close()));
    dlg.showModal();

    const form = dlg.querySelector("#checkout-form");
    if (!form) return;
    const msg = dlg.querySelector("#checkout-msg");
    const submit = form.querySelector('[type="submit"]');

    let submitting = false;
    form.noValidate = true;

    function checkField(field) {
      const input = form.elements[field];
      const error = VALIDATORS[field](input.value);
      input.setAttribute("aria-invalid", error ? "true" : "false");
      form.querySelector(`[data-error-for="${field}"]`).textContent = error;
      return !error;
    }

    form.querySelectorAll('input[name="paymentMethod"]').forEach((radio) =>
      radio.addEventListener("change", () => {
        form.querySelector('[data-error-for="paymentMethod"]').textContent = "";
      }),
    );

    Object.keys(VALIDATORS).forEach((field) => {
      const input = form.elements[field];
      input.addEventListener("blur", () => checkField(field));
      input.addEventListener("input", () => {
        if (input.getAttribute("aria-invalid") === "true") checkField(field);
      });
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (submitting) return;

      // Validate every field; keep what the customer typed and show messages beside each field.
      let firstBad = null;
      const payInputs = form.querySelectorAll('input[name="paymentMethod"]');
      const payError = form.querySelector('[data-error-for="paymentMethod"]');
      if (!form.querySelector('input[name="paymentMethod"]:checked')) {
        payError.textContent =
          "Choose Cash on Delivery or Online payment(not available).";
        firstBad = payInputs[0];
      } else {
        payError.textContent = "";
      }
      Object.keys(VALIDATORS).forEach((field) => {
        if (!checkField(field) && !firstBad) firstBad = form.elements[field];
      });
      if (firstBad) {
        msg.textContent = "Please fix the highlighted fields.";
        firstBad.focus();
        return;
      }

      const fd = Object.fromEntries(new FormData(form).entries());
      fd.name = fd.name.trim();
      fd.address = fd.address.trim();
      fd.pincode = fd.pincode.trim();
      fd.phone = normalizePhone(fd.phone); // clean 10-digit number (already validated)
      const items = lines.map((l) => ({ id: l.id, qty: l.qty }));

      msg.textContent = "Placing order…";
      submitting = true;
      submit.disabled = true;
      try {
        const res = await fetch(
          "https://rassam-backend.vercel.app/api/orders",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...fd, items }),
          },
        );
        const result = await res.json();
        if (!res.ok || !result.success) {
          throw new Error(result.message || "Could not place the order.");
        }

        try {
          localStorage.setItem("rassam-order", result.order.id); // lets the support widget follow this order
        } catch {
          /* storage unavailable: harmless */
        }
        const ids = lines.map((l) => l.id);

        if (
          String(result.order.paymentMethod || "").toLowerCase() === "cod" ||
          String(result.order.status || "").toLowerCase() === "awaiting-payment"
        ) {
          data.removeItems(ids);
          showDone(form, dlg, "Your order is placed successfully! 🌸", [
            `Reference: <strong>${escapeHTML(result.order.id)}</strong>`,
            `Payment: <strong>Cash on Delivery</strong> — pay ${money(
              Number.isFinite(Number(result.order.amountRupees))
                ? Number(result.order.amountRupees)
                : lines.reduce((sum, line) => sum + line.sub, 0),
            )} when it arrives. Not paid yet.`,
          ]);
          return;
        }

        // Online payment: open Razorpay. The order stays UNPAID until the server verifies the payment.
        submitting = false;
        await payOnline({
          form,
          dlg,
          order: result.order,
          payment: result.payment,
          customer: fd,
          ids,
        });
      } catch (err) {
        msg.textContent = err.message;
        submitting = false;
        submit.disabled = false;
      }
    });
  }

  // ── Result screens + online payment ───────────────────
  function showDone(form, dlg, title, htmlLines) {
    form.innerHTML = `
      <h3>${title}</h3>
      ${htmlLines.map((l) => `<p class="sell-msg">${l}</p>`).join("")}
      <div class="sell-actions"><button class="btn btn-primary button-primary" type="button" data-done>Done</button></div>`;
    form
      .querySelector("[data-done]")
      .addEventListener("click", () => dlg.close());
  }

  function showUnpaid(form, dlg, order, payment, note, customer, ids) {
    form.innerHTML = `
      <h3>Payment not completed.</h3>
      <p class="sell-msg">${escapeHTML(note)}</p>
      <p class="sell-msg">Reference: <strong>${escapeHTML(order.id)}</strong> · Status: <strong>unpaid</strong>. Nothing has been charged for this order unless your bank says otherwise.</p>
      <div class="sell-actions">
        <button class="sell-cancel" type="button" data-close-unpaid>Close</button>
        <button class="btn btn-primary button-primary" type="button" data-retry>Pay now</button>
      </div>`;
    form
      .querySelector("[data-close-unpaid]")
      .addEventListener("click", () => dlg.close());
    form
      .querySelector("[data-retry]")
      .addEventListener("click", async (event) => {
        const button = event.currentTarget;
        button.disabled = true;
        try {
          const res = await fetch("/api/payments/retry", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: order.id }),
          });
          const result = await res.json();
          if (!res.ok || !result.success)
            throw new Error(result.message || "Could not restart payment.");
          await payOnline({
            form,
            dlg,
            order,
            payment: result.payment,
            customer,
            ids,
          });
        } catch (err) {
          showUnpaid(form, dlg, order, payment, err.message, customer, ids);
        }
      });
  }

  function loadRazorpay() {
    if (window.Razorpay) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = resolve;
      script.onerror = () =>
        reject(
          new Error(
            "Could not load the payment window. Check your connection.",
          ),
        );
      document.head.appendChild(script);
    });
  }

  async function payOnline({ form, dlg, order, payment, customer, ids }) {
    form.innerHTML = `<h3>Opening secure payment…</h3><p class="sell-msg">Reference: <strong>${escapeHTML(order.id)}</strong></p>`;
    try {
      await loadRazorpay();
    } catch (err) {
      showUnpaid(form, dlg, order, payment, err.message, customer, ids);
      return;
    }

    let settled = false;
    const fail = (note) => {
      if (settled) return;
      settled = true;
      showUnpaid(form, dlg, order, payment, note, customer, ids);
    };

    const rzp = new window.Razorpay({
      key: payment.keyId,
      amount: payment.amountPaise,
      currency: payment.currency,
      name: "RASSAM",
      description: `Order ${order.id}`,
      order_id: payment.razorpayOrderId,
      prefill: { name: customer.name, contact: customer.phone },
      theme: { color: "#a63f68" },
      handler: async (response) => {
        settled = true;
        form.innerHTML = `<h3>Verifying payment…</h3><p class="sell-msg">Please don't close this window.</p>`;
        try {
          const res = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: order.id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          const result = await res.json();
          if (!res.ok || !result.success)
            throw new Error(result.message || "Verification failed.");
          data.removeItems(ids);
          showDone(form, dlg, "Payment received.", [
            `Reference: <strong>${escapeHTML(order.id)}</strong>`,
            `Paid: <strong>${money(order.amountRupees)}</strong> — verified by our server. Thank you!`,
          ]);
        } catch (err) {
          form.innerHTML = `
            <h3>We couldn't confirm your payment.</h3>
            <p class="sell-msg">${escapeHTML(err.message)} If money was deducted, please contact support and quote reference <strong>${escapeHTML(order.id)}</strong>. Do not pay again.</p>
            <div class="sell-actions"><button class="btn btn-primary button-primary" type="button" data-done>Close</button></div>`;
          form
            .querySelector("[data-done]")
            .addEventListener("click", () => dlg.close());
        }
      },
      modal: {
        ondismiss: () => fail("The payment window was closed before paying."),
      },
    });
    rzp.on("payment.failed", (response) =>
      fail(
        (response && response.error && response.error.description) ||
          "The payment failed.",
      ),
    );
    rzp.open();
  }

  data.openCheckout = openCheckout;
})();
