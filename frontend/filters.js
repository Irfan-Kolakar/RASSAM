/* RASSAM — Sliding price filter for both home and shop pages */
(() => {
  "use strict";

  const data = window.RASSAM;
  const panel = document.querySelector("#fx-panel");
  if (!data || !panel) return;

  const { PRODUCTS, money } = data;
  const maxPrice =
    Math.ceil(Math.max(...PRODUCTS.map((p) => p.price)) / 10) * 10 || 1000;

  const lo = document.querySelector("#fx-lo");
  const hi = document.querySelector("#fx-hi");
  const fill = document.querySelector("#fx-fill");
  const rangeText = document.querySelector("#fx-range-text");

  const minField = document.querySelector("#filter-price-min");
  const maxField = document.querySelector("#filter-price-max");

  if (!lo || !hi || !fill || !rangeText) return;

  [lo, hi].forEach((r) => {
    r.min = 0;
    r.max = maxPrice;
    r.step = 5;
  });

  lo.value = 0;
  hi.value = maxPrice;

  const paint = () => {
    const a = Math.min(+lo.value, +hi.value);
    const b = Math.max(+lo.value, +hi.value);
    fill.style.left = (a / maxPrice) * 100 + "%";
    fill.style.width = ((b - a) / maxPrice) * 100 + "%";
    rangeText.textContent =
      `${money(a)} – ` + (b >= maxPrice ? `${money(maxPrice)}+` : money(b));
  };

  const onChange = () => {
    if (+lo.value > +hi.value) lo.value = hi.value;
    const a = +lo.value;
    const b = +hi.value;
    if (minField) minField.value = a > 0 ? String(a) : "";
    if (maxField) maxField.value = b < maxPrice ? String(b) : "";
    if (minField) minField.dispatchEvent(new Event("input", { bubbles: true }));
    if (maxField) maxField.dispatchEvent(new Event("input", { bubbles: true }));
    paint();
  };

  lo.addEventListener("input", onChange);
  hi.addEventListener("input", onChange);
  paint();
})();
