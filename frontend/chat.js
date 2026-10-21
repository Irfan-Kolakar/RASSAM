/* RASSAM — order updates chat (buyer side). Polls every 15 seconds and can show browser alerts. */
(() => {
  "use strict";

  const KEY = "rassam-order";
  const esc = (v) =>
    String(v).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );

  let orderId = localStorage.getItem(KEY) || "";
  const seen = new Set();
  let firstLoad = true;

  const fab = document.createElement("button");
  fab.className = "chat-fab";
  fab.type = "button";
  fab.textContent = "Order updates";

  const panel = document.createElement("section");
  panel.className = "chat-panel";
  panel.hidden = true;
  panel.setAttribute("aria-label", "Order updates");
  panel.innerHTML = `
    <header class="chat-head">
      <span>Order updates</span>
      <button type="button" class="chat-x" aria-label="Close">×</button>
    </header>
    <div class="chat-body"></div>
    <form class="chat-form">
      <input name="orderRef" placeholder="Order reference (ord-…)" maxlength="60" ${orderId ? "hidden" : ""} />
      <textarea name="text" rows="2" maxlength="500" placeholder="Message us about your order"></textarea>
      <div class="chat-row">
        <button type="button" class="chat-alerts">Turn on alerts</button>
        <button type="submit" class="btn btn-primary">Send</button>
      </div>
      <p class="chat-msg" role="status"></p>
    </form>`;
  document.body.append(fab, panel);

  const body = panel.querySelector(".chat-body");
  const msgEl = panel.querySelector(".chat-msg");
  const form = panel.querySelector(".chat-form");
  const alertsBtn = panel.querySelector(".chat-alerts");

  const refreshAlertsLabel = () => {
    if (!("Notification" in window)) alertsBtn.hidden = true;
    else if (Notification.permission === "granted")
      alertsBtn.textContent = "Alerts on";
    else if (Notification.permission === "denied")
      alertsBtn.textContent = "Alerts blocked";
  };

  const render = (data) => {
    const delivery = data.order.delivery
      ? `<div class="chat-m system"><small>Delivery</small>${esc(data.order.delivery)}</div>`
      : "";
    body.innerHTML =
      `<div class="chat-m"><small>Reference</small>${esc(data.order.id)} · ${esc(data.order.status)}</div>` +
      delivery +
      data.messages
        .map(
          (m) =>
            `<div class="chat-m ${esc(m.from)}"><small>${m.from === "admin" ? "RASSAM" : m.from === "system" ? "Update" : "You"} · ${new Date(m.createdAt).toLocaleString()}</small>${esc(m.text)}</div>`,
        )
        .join("");
    body.scrollTop = body.scrollHeight;
  };

  const alertNew = (data) => {
    data.messages.forEach((m) => {
      if (seen.has(m.id)) return;
      seen.add(m.id);
      if (firstLoad || m.from === "customer") return;
      if (
        "Notification" in window &&
        Notification.permission === "granted" &&
        document.hidden
      ) {
        new Notification("RASSAM", { body: m.text });
      }
    });
    firstLoad = false;
  };

  const load = async () => {
    if (!orderId) {
      body.innerHTML = `<div class="chat-m">Enter the reference from your order confirmation to see updates here.</div>`;
      return;
    }
    try {
      const res = await fetch(
        `https://rassam-backend.vercel.app/api/messages?orderId=${encodeURIComponent(orderId)}`,
      );
      const data = await res.json();
      if (!res.ok || !data.success)
        throw new Error(data.message || "Could not load updates.");
      render(data);
      alertNew(data);
    } catch (err) {
      msgEl.textContent = err.message;
    }
  };

  fab.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) load();
  });
  panel
    .querySelector(".chat-x")
    .addEventListener("click", () => (panel.hidden = true));

  alertsBtn.addEventListener("click", async () => {
    if (!("Notification" in window)) return;
    await Notification.requestPermission();
    refreshAlertsLabel();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const text = String(fd.get("text") || "").trim();
    const typedRef = String(fd.get("orderRef") || "").trim();
    if (!orderId && typedRef) orderId = typedRef;
    if (!orderId) {
      msgEl.textContent = "Enter your order reference first.";
      return;
    }
    if (!text) {
      msgEl.textContent = "Write a message first.";
      return;
    }
    try {
      const res = await fetch("https://rassam-backend.vercel.app/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, text }),
      });
      const data = await res.json();
      if (!res.ok || !data.success)
        throw new Error(data.message || "Could not send.");
      localStorage.setItem(KEY, orderId);
      form.reset();
      form.querySelector('[name="orderRef"]').hidden = true;
      msgEl.textContent = "Sent.";
      load();
    } catch (err) {
      msgEl.textContent = err.message;
    }
  });

  refreshAlertsLabel();
  setInterval(() => {
    if (orderId) load();
  }, 15000);
  if (orderId) load();
})();
