/* RASSAM — swipe-to-stash on Explore cards. Works on top of app.js (no changes to it). */
(() => {
  "use strict";

  const grid = document.querySelector("#product-grid");
  if (!grid) return;

  const THRESHOLD = 90;
  const skipped = new Set();

  // Hint bar under the grid, with a restore button for skipped cards.
  const bar = document.createElement("div");
  bar.className = "swipe-bar";
  bar.innerHTML = `
    <span>Swipe right to <strong>stash</strong> · left to <strong>skip</strong></span>
    <button type="button" class="swipe-restore" hidden>Restore skipped (<span>0</span>)</button>`;
  grid.after(bar);
  const restoreBtn = bar.querySelector(".swipe-restore");

  const refreshBar = () => {
    restoreBtn.hidden = skipped.size === 0;
    restoreBtn.querySelector("span").textContent = skipped.size;
  };

  const applySkips = () => {
    grid.querySelectorAll(".product-card").forEach((card) => {
      const id = card.querySelector("[data-add]")?.dataset.add;
      card.hidden = skipped.has(id);
    });
    refreshBar();
  };

  restoreBtn.addEventListener("click", () => {
    skipped.clear();
    applySkips();
  });

  const fly = (card, direction, done) => {
    card.style.transition = "transform 0.35s ease, opacity 0.35s ease";
    card.style.transform = `translateX(${direction * 140}%) rotate(${direction * 12}deg)`;
    card.style.opacity = "0";
    setTimeout(done, 350);
  };

  const bind = (card) => {
    if (card.dataset.swipe) return;
    card.dataset.swipe = "1";

    const addBtn = card.querySelector("[data-add]");
    const id = addBtn?.dataset.add;
    let startX = 0;
    let dx = 0;
    let active = false;
    let moved = false;

    card.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button")) return;
      active = true;
      moved = false;
      dx = 0;
      startX = e.clientX;
      card.style.transition = "none";
      card.setPointerCapture(e.pointerId);
    });

    card.addEventListener("pointermove", (e) => {
      if (!active) return;
      dx = e.clientX - startX;
      if (Math.abs(dx) > 6) moved = true;
      if (moved)
        card.style.transform = `translateX(${dx}px) rotate(${dx / 30}deg)`;
    });

    const end = () => {
      if (!active) return;
      active = false;
      if (!moved) return;

      card.dataset.dragged = "1"; // blocks the click that follows a drag
      if (dx > THRESHOLD && addBtn && !addBtn.disabled) {
        addBtn.click();
        fly(card, 1, () => {
          card.style.transform = "";
          card.style.opacity = "";
          card.style.transition = "";
        });
      } else if (dx < -THRESHOLD && id) {
        skipped.add(id);
        fly(card, -1, () => applySkips());
      } else {
        card.style.transition = "transform 0.25s ease";
        card.style.transform = "";
      }
    };
    card.addEventListener("pointerup", end);
    card.addEventListener("pointercancel", end);

    card.addEventListener(
      "click",
      (e) => {
        if (card.dataset.dragged === "1") {
          e.preventDefault();
          e.stopPropagation();
          delete card.dataset.dragged;
        }
      },
      true,
    );
  };

  const scan = () => {
    grid.querySelectorAll(".product-card").forEach(bind);
    applySkips();
  };

  // app.js re-renders the grid on every filter change, so watch for new cards.
  new MutationObserver(scan).observe(grid, { childList: true });
  scan();
})();
