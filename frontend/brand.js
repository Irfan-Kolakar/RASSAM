/* RASSAM — removes leftover demo wording, sets the version label, and adds the Buy Components link. */
(() => {
  "use strict";

  const norm = (s) => s.replace(/\s+/g, " ");
  const RULES = [
    [
      "Demo listings only. Nothing here can be bought yet.",
      "Pay securely online. We keep you updated after every order.",
    ],
    [
      "Sample listings with sample prices. Seller tools will manage the real ones.",
      "Listed by students, priced by students.",
    ],
    [
      "The four newest listings. Prices are demo prices.",
      "The four newest listings.",
    ],
    [
      "Demo prices. Stashing doesn't reserve stock, and checkout isn't live.",
      "Stashing doesn't reserve stock until you pay.",
    ],
    [
      "Demo prices only. Stashing doesn't reserve stock and there's no checkout yet.",
      "Stashing doesn't reserve stock until you pay.",
    ],
    [
      "Adding to your stash doesn't reserve anything, and there's no checkout yet.",
      "Adding to your stash doesn't reserve anything until you pay.",
    ],
    [
      "Demo listing. Adding to your stash does not reserve stock. No real transaction takes place.",
      "Adding to your stash does not reserve stock.",
    ],
    ["DEMO PRICE · does not reflect real market value", "Per unit price"],
    ["DEMO PRICE", "Per unit"],
    ["Demo version 0.1", "RASSAM 1.0"],
  ].map(([a, b]) => [norm(a), b]);

  const fix = (node) => {
    const value = node.nodeValue;
    if (!value || !/demo|0\.1/i.test(value)) return;
    const original = norm(value);
    let out = original;
    for (const [from, to] of RULES) out = out.split(from).join(to);
    if (out !== original) node.nodeValue = out;
  };

  const walk = (root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.parentNode && /SCRIPT|STYLE/.test(node.parentNode.nodeName))
        continue;
      fix(node);
    }
  };

  walk(document.body);

  new MutationObserver((mutations) => {
    mutations.forEach((m) =>
      m.addedNodes.forEach((n) =>
        n.nodeType === 3 ? fix(n) : n.nodeType === 1 && walk(n),
      ),
    );
  }).observe(document.body, { childList: true, subtree: true });

  // Link to the dedicated buying page from the home page navigation.
  const desktop = document.querySelector(".nav-links");
  if (desktop && !desktop.querySelector('[href="shop.html"]')) {
    desktop.insertAdjacentHTML(
      "afterbegin",
      '<a href="shop.html">Buy Components</a>',
    );
  }
  const mobile = document.querySelector("#mobile-nav");
  if (mobile && !mobile.querySelector('[href="shop.html"]')) {
    mobile.insertAdjacentHTML(
      "afterbegin",
      '<a href="shop.html">Buy Components <span>↗</span></a>',
    );
  }
})();
