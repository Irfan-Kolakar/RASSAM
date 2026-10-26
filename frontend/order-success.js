/* INK premium order confirmation.
   Trigger ONLY after the backend confirms the order:
   window.INKOrderSuccess.show({ orderId: confirmedOrderId });
   or dispatch: document.dispatchEvent(new CustomEvent('ink:order-success',{detail:{orderId: confirmedOrderId}}));
*/
(() => {
  "use strict";
  if (window.INKOrderSuccess) return;
  let overlay, currentCode = "", previousFocus = null;
  const styleId = "ink-order-success-styles";

  function addStyles() {
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .ink-os-overlay{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:22px;background:rgba(18,20,15,.66);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);opacity:0;visibility:hidden;transition:opacity .28s ease,visibility .28s ease}
      .ink-os-overlay.is-open{opacity:1;visibility:visible}
      .ink-os-card{position:relative;isolation:isolate;overflow:hidden;width:min(100%,480px);padding:clamp(26px,5vw,42px);border:1px solid rgba(167,228,119,.24);border-radius:28px;background:radial-gradient(ellipse at 50% -10%,rgba(167,228,119,.16),transparent 48%),linear-gradient(145deg,#15181a,#090a0c);color:#f5f5f2;box-shadow:0 32px 100px rgba(0,0,0,.58);text-align:center;transform:translateY(24px) scale(.96);opacity:0}
      .ink-os-card:before{content:"";position:absolute;inset:10px;border:1px solid rgba(167,228,119,.09);border-radius:21px;pointer-events:none;z-index:-1}
      .ink-os-eyebrow{margin:0 0 16px;font:600 10px/1.4 'Geist Mono',monospace;letter-spacing:.2em;text-transform:uppercase;color:#a7e477}
      .ink-os-mark{position:relative;width:88px;height:88px;margin:0 auto 20px;display:grid;place-items:center}
      .ink-os-ring{position:absolute;inset:0;border:1px solid rgba(167,228,119,.42);border-radius:50%;animation:ink-os-ring 2.8s ease-in-out infinite}
      .ink-os-ring:nth-child(2){inset:8px;border-style:dashed;animation:ink-os-spin 18s linear infinite}
      .ink-os-check{position:relative;display:grid;place-items:center;width:58px;height:58px;border-radius:20px;background:#a7e477;color:#14200f;box-shadow:0 8px 28px rgba(83,132,60,.24);font-size:31px;font-weight:700;animation:ink-os-pop .55s cubic-bezier(.2,1.5,.4,1) both}
      .ink-os-title{margin:0;font:500 clamp(30px,7vw,42px)/1.02 'Instrument Serif',Georgia,serif;letter-spacing:-.035em}
      .ink-os-subtitle{max-width:340px;margin:14px auto 24px;color:#c0c7bd;font:400 14px/1.65 'Geist',system-ui,sans-serif}
      .ink-os-code-label{display:block;margin-bottom:9px;font:600 10px/1.4 'Geist Mono',monospace;letter-spacing:.16em;color:#b6c0b2}
      .ink-os-code-row{display:flex;align-items:center;gap:10px;padding:10px 10px 10px 15px;border:1px solid rgba(255,255,255,.14);border-radius:16px;background:rgba(255,255,255,.045);text-align:left}
      .ink-os-code{flex:1;min-width:0;overflow-wrap:anywhere;font:800 17px/1.4 'Geist Mono',monospace;letter-spacing:.035em;color:#f5f5f2}
      .ink-os-copy{flex:none;border:0;border-radius:11px;padding:12px 13px;background:#a7e477;color:#15200f;font:700 10px/1 'Geist Mono',monospace;letter-spacing:.07em;cursor:pointer;transition:transform .2s ease,background .2s ease}
      .ink-os-copy:hover{transform:translateY(-2px);background:#c0f596}
      .ink-os-note{margin:15px 0 22px;color:#aeb7aa;font:400 12px/1.65 'Geist',system-ui,sans-serif}
      .ink-os-note strong{color:#f5f5f2;font-weight:800}
      .ink-os-continue{width:100%;border:0;border-radius:14px;padding:16px 20px;background:#ff6a32;color:#fff;font:800 11px/1 'Geist Mono',monospace;letter-spacing:.12em;cursor:pointer;transition:transform .2s ease,box-shadow .2s ease}
      .ink-os-continue:hover{transform:translateY(-2px);box-shadow:0 10px 25px rgba(255,90,31,.25)}
      .ink-os-spark{position:absolute;width:6px;height:6px;border-radius:50%;background:#8ecf69;box-shadow:0 0 0 4px rgba(142,207,105,.13);pointer-events:none;opacity:0}
      .ink-os-spark:nth-of-type(1){top:20%;left:12%}.ink-os-spark:nth-of-type(2){top:23%;right:13%;width:4px;height:4px}.ink-os-spark:nth-of-type(3){bottom:27%;left:10%;width:4px;height:4px}.ink-os-spark:nth-of-type(4){bottom:22%;right:12%}
      .ink-os-overlay.is-open .ink-os-spark{animation:ink-os-spark 1.1s ease-out both}
      @keyframes ink-os-ring{0%,100%{transform:scale(.96);opacity:.55}50%{transform:scale(1.08);opacity:1}}
      @keyframes ink-os-spin{to{transform:rotate(360deg)}}
      @keyframes ink-os-pop{0%{transform:scale(.45) rotate(-12deg);opacity:0}75%{transform:scale(1.1) rotate(3deg)}100%{transform:scale(1);opacity:1}}
      @keyframes ink-os-spark{0%{transform:scale(.2);opacity:0}35%{transform:scale(1.8);opacity:1}100%{transform:translateY(-10px) scale(.5);opacity:0}}
      @media(max-width:420px){.ink-os-card{border-radius:23px;padding:26px 20px}.ink-os-code-row{align-items:stretch;flex-direction:column}.ink-os-copy{width:100%;padding:14px}}
      @media(prefers-reduced-motion:reduce){.ink-os-ring,.ink-os-check,.ink-os-overlay.is-open .ink-os-spark{animation:none!important}.ink-os-overlay,.ink-os-card,.ink-os-copy,.ink-os-continue{transition:none!important}}
    `;
    document.head.appendChild(style);
  }
  function ensure() {
    if (overlay) return overlay;
    addStyles();
    overlay = document.createElement('div');
    overlay.className = 'ink-os-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `
      <section class="ink-os-card" role="dialog" aria-modal="true" aria-labelledby="ink-os-title" aria-describedby="ink-os-description">
        <i class="ink-os-spark" aria-hidden="true"></i><i class="ink-os-spark" aria-hidden="true"></i><i class="ink-os-spark" aria-hidden="true"></i><i class="ink-os-spark" aria-hidden="true"></i>
        <div class="ink-os-mark" aria-hidden="true"><span class="ink-os-ring"></span><span class="ink-os-ring"></span><span class="ink-os-check">✓</span></div>
        <p class="ink-os-eyebrow">INK · ORDER CONFIRMED</p>
        <h2 class="ink-os-title" id="ink-os-title">Your next build<br>is in motion.</h2>
        <p class="ink-os-subtitle" id="ink-os-description">Your order was placed successfully. Save this code so you can check your order updates later.</p>
        <span class="ink-os-code-label">YOUR ORDER ID</span>
        <div class="ink-os-code-row"><strong class="ink-os-code" id="ink-os-code"></strong><button class="ink-os-copy" id="ink-os-copy" type="button">COPY ORDER ID ↗</button></div>
        <p class="ink-os-note">We don't store your login/logout details for order updates. <strong>Copy and keep this order ID safe</strong> — you'll need it to look up your order.</p>
        <button class="ink-os-continue" id="ink-os-continue" type="button">CONTINUE EXPLORING ↗</button>
      </section>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) hide(); });
    overlay.querySelector('#ink-os-continue').addEventListener('click', hide);
    overlay.querySelector('#ink-os-copy').addEventListener('click', copyCode);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && overlay?.classList.contains('is-open')) hide(); });
    return overlay;
  }
  async function copyCode() {
    const button = overlay.querySelector('#ink-os-copy');
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(currentCode);
      else {
        const temp = document.createElement('textarea'); temp.value = currentCode; temp.style.position='fixed'; temp.style.opacity='0'; document.body.appendChild(temp); temp.select();
        const ok = document.execCommand('copy'); temp.remove(); if (!ok) throw new Error('copy failed');
      }
      button.textContent = 'COPIED ✓';
    } catch {
      const code = overlay.querySelector('#ink-os-code');
      const range = document.createRange(); range.selectNodeContents(code);
      const selection = window.getSelection(); selection?.removeAllRanges(); selection?.addRange(range);
      button.textContent = 'CODE SELECTED';
    }
  }
  function show(details = {}) {
    const id = String(details.orderId || details.orderID || details.orderCode || details.code || '').trim();
    if (!id) { console.warn('INK order confirmation needs the confirmed order ID/code.'); return false; }
    currentCode = id;
    const root = ensure();
    previousFocus = document.activeElement;
    root.querySelector('#ink-os-code').textContent = id;
    root.querySelector('#ink-os-copy').textContent = 'COPY ORDER ID ↗';
    root.hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      root.classList.add('is-open');
      const card = root.querySelector('.ink-os-card');
      if (window.gsap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        window.gsap.fromTo(card, { y: 24, scale: .96, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: .72, ease: 'back.out(1.5)', overwrite: true });
        window.gsap.fromTo(root.querySelector('.ink-os-mark'), { scale: .7, rotate: -8 }, { scale: 1, rotate: 0, duration: .65, delay: .12, ease: 'elastic.out(1,.55)', overwrite: true });
      } else {
        card.style.transition = 'transform .48s cubic-bezier(.2,1.25,.4,1),opacity .35s ease';
        requestAnimationFrame(() => { card.style.transform = 'translateY(0) scale(1)'; card.style.opacity = '1'; });
      }
      root.querySelector('#ink-os-continue').focus({ preventScroll: true });
    });
    return true;
  }
  function hide() {
    if (!overlay) return;
    overlay.classList.remove('is-open');
    document.body.style.overflow = '';
    const card = overlay.querySelector('.ink-os-card');
    if (window.gsap) window.gsap.killTweensOf(card);
    window.setTimeout(() => { if (overlay && !overlay.classList.contains('is-open')) overlay.hidden = true; }, 300);
    if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus({ preventScroll: true });
  }
  window.INKOrderSuccess = { show, hide };
  document.addEventListener('ink:order-success', e => show(e.detail || {}));
})();
