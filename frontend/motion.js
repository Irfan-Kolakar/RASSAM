/* RASSAM — hero and scroll motion. GSAP when loaded, plain JS fallback. */
(() => {
  "use strict";

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGSAP =
    typeof window.gsap !== "undefined" &&
    typeof window.ScrollTrigger !== "undefined";
  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);

  // 1. Hero entrance
  if (hasGSAP && !reduce) {
    document.documentElement.classList.add("has-gsap");
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.from(".hero-kicker", { y: 14, opacity: 0, duration: 0.6 })
      .from(
        "#hero-title",
        { y: 50, opacity: 0, clipPath: "inset(0% 0% 100% 0%)", duration: 1.1 },
        "-=0.3",
      )
      .from(".hero-subtitle", { y: 20, opacity: 0, duration: 0.7 }, "-=0.6")
      .from(
        ".hero-actions .button",
        { y: 16, opacity: 0, duration: 0.5, stagger: 0.12 },
        "-=0.5",
      )
      .from(
        ".stage-orbit",
        { opacity: 0, duration: 1.2, stagger: 0.2 },
        "-=0.8",
      )
      .from(
        ".stage-board",
        { y: 80, rotation: -4, opacity: 0, duration: 1.1 },
        "-=1",
      )
      .from(
        ".part-float",
        { scale: 0.6, opacity: 0, duration: 0.6, stagger: 0.12 },
        "-=0.5",
      )
      .from(".stage-caption", { opacity: 0, duration: 0.6 }, "-=0.3");

    const canHover = matchMedia("(hover: hover) and (pointer: fine)").matches;
    const board = document.querySelector(".stage-board");
    const hero = document.querySelector(".hero-stage");
    if (canHover && board && hero) {
      const moveX = gsap.quickTo(board, "x", { duration: 0.8, ease: "power3" });
      const moveY = gsap.quickTo(board, "y", { duration: 0.8, ease: "power3" });
      hero.addEventListener("pointermove", (e) => {
        const r = hero.getBoundingClientRect();
        moveX(((e.clientX - r.left) / r.width - 0.5) * 16);
        moveY(((e.clientY - r.top) / r.height - 0.5) * 10);
      });
      hero.addEventListener("pointerleave", () => {
        moveX(0);
        moveY(0);
      });
    }
  }

  // 2. Reveals
  const targets = [...document.querySelectorAll("[data-reveal]")];
  if (reduce || !("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("is-in"));
  } else {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }),
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    targets.forEach((el) => io.observe(el));
  }

  // 3. Relay: trace and cards follow scroll progress
  const relay = document.querySelector(".relay");
  if (!relay) return;

  const cards = [...relay.querySelectorAll(".relay-card")];
  const trace = relay.querySelector(".relay-track span");
  const vertical = () => matchMedia("(max-width: 900px)").matches;

  const setProgress = (p) => {
    p = Math.min(1, Math.max(0, p));
    if (trace) {
      trace.style.transform = vertical() ? `scaleY(${p})` : `scaleX(${p})`;
    }
    cards.forEach((card, i) =>
      card.classList.toggle("is-lit", p > 0.12 + i * 0.3),
    );
  };

  if (reduce) {
    setProgress(1);
    return;
  }

  if (hasGSAP) {
    ScrollTrigger.create({
      trigger: relay,
      start: "top 80%",
      end: "bottom 50%",
      onUpdate: (self) => setProgress(self.progress),
      onRefresh: (self) => setProgress(self.progress),
    });
    setProgress(0);
    return;
  }

  // Fallback without GSAP
  let ticking = false;
  const update = () => {
    ticking = false;
    const rect = relay.getBoundingClientRect();
    setProgress((innerHeight * 0.8 - rect.top) / (rect.height * 0.7));
  };
  addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    },
    { passive: true },
  );
  addEventListener("resize", update);
  update();
})();
