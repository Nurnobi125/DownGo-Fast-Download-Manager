(() => {
  "use strict";
  const FEED_URL = "/announcements.json";
  const SEEN_PREFIX = "downgo-announcement-seen:";

  function safeHttpsUrl(value) {
    try {
      const parsed = new URL(String(value || ""), window.location.href);
      return parsed.protocol === "https:" ? parsed.href : "";
    } catch (_) { return ""; }
  }

  function parseDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function activeNow(item, now) {
    const starts = parseDate(item.starts_at);
    const ends = parseDate(item.ends_at);
    return (!starts || starts <= now) && (!ends || ends > now);
  }

  function money(value, currency) {
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value);
    } catch (_) { return `${currency} ${Number(value).toFixed(2)}`; }
  }

  function applyPlanOffer(item) {
    const offer = item && item.offer;
    if (!offer || !["personal", "family", "commercial"].includes(String(offer.plan || ""))) return;
    const checkout = safeHttpsUrl(offer.checkout_url);
    const regular = Number(offer.regular_price);
    const discounted = Number(offer.offer_price);
    const currency = String(offer.currency || "USD").toUpperCase();
    if (!checkout || !Number.isFinite(regular) || !Number.isFinite(discounted) || regular <= 0 || discounted < 0 || discounted >= regular || !/^[A-Z]{3}$/.test(currency)) return;

    const card = document.querySelector(`[data-plan="${offer.plan}"]`);
    const price = card && card.querySelector(`[data-plan-price="${offer.plan}"]`);
    const button = card && card.querySelector(`[data-checkout-plan="${offer.plan}"]`);
    if (!price || !button) return;

    price.replaceChildren();
    const sale = document.createElement("span");
    sale.className = "downgo-sale-price";
    sale.textContent = money(discounted, currency);
    const original = document.createElement("span");
    original.className = "downgo-original-price";
    original.textContent = `${money(regular, currency)} regular price`;
    const note = document.createElement("span");
    note.className = "downgo-sale-note";
    note.textContent = String(offer.label || "Limited-time offer").slice(0, 70);
    price.append(sale, original, note);
    button.href = checkout;
    button.setAttribute("aria-label", `${button.textContent.trim()} — ${sale.textContent}`);
  }

  function showPopup(item) {
    const link = safeHttpsUrl(item.url || (item.offer && item.offer.checkout_url));
    const id = String(item.id || "").slice(0, 120);
    if (!id) return;
    try { if (localStorage.getItem(SEEN_PREFIX + id)) return; } catch (_) {}

    const dialog = document.createElement("dialog");
    dialog.className = "downgo-announcement-dialog";
    const backgroundImage = safeHttpsUrl(item.background_image || (item.offer && item.offer.background_image));
    if (backgroundImage) {
      dialog.style.backgroundImage = `linear-gradient(180deg, rgba(7,13,23,.78), rgba(7,13,23,.94)), url(${JSON.stringify(backgroundImage)})`;
      dialog.style.backgroundSize = "cover";
      dialog.style.backgroundPosition = "center";
    }
    dialog.setAttribute("aria-labelledby", "downgo-announcement-title");
    const style = document.createElement("style");
    style.textContent = `
      .downgo-announcement-dialog{width:min(92vw,470px);padding:0;border:1px solid #3d73bd;border-radius:16px;background:#101724;color:#f4f7fb;box-shadow:0 24px 80px #000a;font:16px/1.55 "Segoe UI",system-ui,sans-serif}
      .downgo-announcement-dialog::backdrop{background:#020611b8;backdrop-filter:blur(3px)}
      .downgo-announcement-inner{padding:24px}.downgo-announcement-kicker{margin:0 0 8px;color:#8db9ff;font-size:.76rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
      .downgo-announcement-dialog h2{margin:0 0 10px;font-size:1.55rem;line-height:1.2}.downgo-announcement-dialog p{margin:0;color:#b8c5d8;white-space:pre-line}
      .downgo-announcement-actions{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;margin-top:22px}.downgo-announcement-actions button,.downgo-announcement-actions a{font:inherit;font-weight:700;border-radius:8px;padding:10px 14px;text-decoration:none;cursor:pointer}
      .downgo-announcement-close{color:#d7e1f0;background:#1b2736;border:1px solid #34445a}.downgo-announcement-cta{color:#061323!important;background:#63a2ff;border:1px solid #63a2ff}
      .downgo-sale-price{font-size:2rem;font-weight:800;color:#8fc0ff}.downgo-original-price{font-size:.88rem!important;color:#9ba9bb!important;text-decoration:line-through}.downgo-sale-note{font-size:.82rem!important;color:#67e8a5!important;font-weight:700}
    `;
    const inner = document.createElement("div");
    inner.className = "downgo-announcement-inner";
    const kicker = document.createElement("p");
    kicker.className = "downgo-announcement-kicker";
    kicker.textContent = item.type === "offer" ? "DownGo offer" : item.type === "update" ? "DownGo update" : "DownGo news";
    const title = document.createElement("h2");
    title.id = "downgo-announcement-title";
    title.textContent = String(item.title || "DownGo notice").slice(0, 120);
    const message = document.createElement("p");
    message.textContent = String(item.message || "").slice(0, 1600);
    const actions = document.createElement("div");
    actions.className = "downgo-announcement-actions";
    const close = document.createElement("button");
    close.type = "button";
    close.className = "downgo-announcement-close";
    close.textContent = "Not now";
    close.addEventListener("click", () => dialog.close());
    actions.append(close);
    if (link) {
      const cta = document.createElement("a");
      cta.className = "downgo-announcement-cta";
      cta.href = link;
      cta.target = "_blank";
      cta.rel = "noopener noreferrer";
      cta.textContent = String(item.button_text || "View details").slice(0, 40);
      actions.append(cta);
    }
    inner.append(kicker, title, message, actions);
    dialog.append(style, inner);
    document.body.append(dialog);
    dialog.addEventListener("close", () => {
      try { localStorage.setItem(SEEN_PREFIX + id, "1"); } catch (_) {}
      dialog.remove();
    }, { once: true });
    if (typeof dialog.showModal === "function") dialog.showModal();
  }

  async function loadAnnouncements() {
    try {
      const response = await fetch(FEED_URL, { cache: "no-store", headers: { Accept: "application/json" } });
      if (!response.ok) return;
      const feed = await response.json();
      if (!feed || !Array.isArray(feed.announcements)) return;
      const now = new Date();
      const active = feed.announcements.find(item => item && item.enabled === true && item.id && item.title && item.message && activeNow(item, now));
      if (!active) return;
      applyPlanOffer(active);
      showPopup(active);
    } catch (_) {
      // The public notice feed is optional; the normal site still works when offline.
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", loadAnnouncements, { once: true });
  else loadAnnouncements();
})();
