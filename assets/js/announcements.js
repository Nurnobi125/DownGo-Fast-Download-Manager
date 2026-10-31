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
    try { return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value); }
    catch (_) { return `${currency} ${Number(value).toFixed(2)}`; }
  }

  function getOffers(item) {
    const raw = Array.isArray(item && item.offers) ? item.offers : (item && item.offer ? [item.offer] : []);
    return raw.filter(offer => offer && ["personal", "family", "commercial"].includes(String(offer.plan || "")))
      .map(offer => {
        const checkout = safeHttpsUrl(offer.checkout_url);
        const regular = Number(offer.regular_price);
        const discounted = Number(offer.offer_price);
        const currency = String(offer.currency || "USD").toUpperCase();
        if (!checkout || !Number.isFinite(regular) || !Number.isFinite(discounted) || regular <= 0 || discounted < 0 || discounted >= regular || !/^[A-Z]{3}$/.test(currency)) return null;
        return { ...offer, checkout, regular, discounted, currency };
      }).filter(Boolean);
  }

  function applyPlanOffers(offers) {
    for (const offer of offers) {
      const card = document.querySelector(`[data-plan="${offer.plan}"]`);
      const price = card && card.querySelector(`[data-plan-price="${offer.plan}"]`);
      const button = card && card.querySelector(`[data-checkout-plan="${offer.plan}"]`);
      if (!price || !button) continue;

      price.replaceChildren();
      const sale = document.createElement("span");
      sale.className = "downgo-sale-price";
      sale.textContent = money(offer.discounted, offer.currency);
      const original = document.createElement("span");
      original.className = "downgo-original-price";
      original.textContent = `${money(offer.regular, offer.currency)} regular price`;
      const note = document.createElement("span");
      note.className = "downgo-sale-note";
      note.textContent = String(offer.label || "Offer").slice(0, 70);
      price.append(sale, original, note);
      button.href = offer.checkout;
      button.setAttribute("aria-label", `${button.textContent.trim()} — ${sale.textContent}`);
    }
  }

  function appendPlanLinks(container, offers, classPrefix) {
    const list = document.createElement("div");
    list.className = `${classPrefix}-plan-list`;
    for (const offer of offers) {
      const row = document.createElement("div");
      row.className = `${classPrefix}-plan`;
      const details = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = String(offer.name || offer.plan).slice(0, 40);
      const description = document.createElement("span");
      description.textContent = String(offer.description || "").slice(0, 100);
      details.append(name, description);

      const price = document.createElement("div");
      price.className = `${classPrefix}-plan-prices`;
      const sale = document.createElement("strong");
      sale.textContent = money(offer.discounted, offer.currency);
      const original = document.createElement("del");
      original.textContent = money(offer.regular, offer.currency);
      price.append(sale, original);

      const buy = document.createElement("a");
      buy.className = classPrefix === "downgo-announcement" ? "downgo-announcement-cta downgo-announcement-plan-buy" : "home-offer-banner-cta home-offer-plan-buy";
      buy.href = offer.checkout;
      buy.target = "_blank";
      buy.rel = "noopener noreferrer";
      buy.textContent = `Get ${String(offer.name || offer.plan).slice(0, 30)}`;
      row.append(details, price, buy);
      list.append(row);
    }
    container.append(list);
  }

  function renderHomeOffer(item, offers) {
    const banner = document.querySelector("#home-offer-banner");
    if (!banner || item.type !== "offer") return false;
    const fallbackOffer = item.offer || {};
    const checkout = safeHttpsUrl(item.url || fallbackOffer.checkout_url);
    const background = safeHttpsUrl(item.background_image || fallbackOffer.background_image);
    const regular = Number(fallbackOffer.regular_price);
    const discounted = Number(fallbackOffer.offer_price);
    const currency = String(fallbackOffer.currency || "USD").toUpperCase();

    banner.replaceChildren();
    banner.classList.add("home-offer-banner");
    if (background) {
      const image = document.createElement("img");
      image.className = "home-offer-banner-image";
      image.src = background;
      image.alt = "";
      image.loading = "lazy";
      image.setAttribute("aria-hidden", "true");
      banner.append(image);
    }

    const content = document.createElement("div");
    content.className = "home-offer-banner-content";
    const kicker = document.createElement("p");
    kicker.className = "home-offer-banner-kicker";
    kicker.textContent = String(item.type_label || "DownGo offer").slice(0, 80);
    const title = document.createElement("h2");
    title.id = "home-offer-title";
    title.textContent = String(item.title || "A special DownGo offer").slice(0, 120);
    const message = document.createElement("p");
    message.className = "home-offer-banner-message";
    message.textContent = String(item.message || "Explore the current offer.").slice(0, 500);
    content.append(kicker, title, message);

    const validPrice = Number.isFinite(regular) && Number.isFinite(discounted) && regular > 0 && discounted >= 0 && discounted < regular && /^[A-Z]{3}$/.test(currency);
    if (validPrice) {
      const price = document.createElement("p");
      price.className = "home-offer-banner-price";
      price.textContent = `${money(discounted, currency)} · ${money(regular, currency)} regular price`;
      content.append(price);
    }
    if (checkout) {
      const cta = document.createElement("a");
      cta.className = "home-offer-banner-cta";
      cta.href = checkout;
      cta.textContent = String(item.button_text || "View plans and pricing").slice(0, 40);
      content.append(cta);
    }
    banner.append(content);
    banner.hidden = false;
    return true;
  }

  function showPopup(item, offers) {
    const link = safeHttpsUrl(item.url || (item.offer && item.offer.checkout_url));
    const id = String(item.id || "").slice(0, 120);
    if (!id) return;
    // Offers reappear on each homepage reload; informational notices remain one-time.
    if (item.type !== "offer") {
      try { if (localStorage.getItem(SEEN_PREFIX + id)) return; } catch (_) {}
    }

    const dialog = document.createElement("dialog");
    dialog.className = "downgo-announcement-dialog";
    const backgroundImage = safeHttpsUrl(item.background_image || (item.offer && item.offer.background_image));
    if (backgroundImage) {
      dialog.style.backgroundImage = `linear-gradient(180deg, rgba(7,13,23,.78), rgba(7,13,23,.94)), url(${JSON.stringify(backgroundImage)})`;
      dialog.style.backgroundSize = "cover";
      dialog.style.backgroundPosition = "center";
    }
    dialog.setAttribute("aria-labelledby", "downgo-announcement-title");
    const inner = document.createElement("div");
    inner.className = "downgo-announcement-inner";
    const header = document.createElement("div");
    header.className = "downgo-announcement-header";
    const kicker = document.createElement("p");
    kicker.className = "downgo-announcement-kicker";
    kicker.textContent = item.type === "offer" ? "DownGo offer" : item.type === "update" ? "DownGo update" : "DownGo news";
    const dismiss = document.createElement("button");
    dismiss.type = "button";
    dismiss.className = "downgo-announcement-x";
    dismiss.setAttribute("aria-label", "Close announcement");
    dismiss.textContent = "×";
    dismiss.addEventListener("click", () => dialog.close());
    header.append(kicker, dismiss);
    const title = document.createElement("h2");
    title.id = "downgo-announcement-title";
    title.textContent = String(item.title || "DownGo notice").slice(0, 120);
    const message = document.createElement("p");
    message.className = "downgo-announcement-message";
    message.textContent = String(item.message || "").slice(0, 1600);
    inner.append(header, title, message);
    if (offers.length) appendPlanLinks(inner, offers, "downgo-announcement");

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
    inner.append(actions);
    dialog.append(inner);
    document.body.append(dialog);
    dialog.addEventListener("close", () => {
      if (item.type !== "offer") {
        try { localStorage.setItem(SEEN_PREFIX + id, "1"); } catch (_) {}
      }
      dialog.remove();
    }, { once: true });
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
      dismiss.focus();
    }
  }

  function showFallbackHomeOfferPopup() {
    const banner = document.querySelector("#home-offer-banner");
    const content = banner && banner.querySelector(".home-offer-banner-content");
    if (!content || banner.hidden) return;

    const dialog = document.createElement("dialog");
    dialog.className = "downgo-announcement-dialog";
    dialog.setAttribute("aria-label", "DownGo 50% offer");
    const inner = document.createElement("div");
    inner.className = "downgo-announcement-inner";
    const header = document.createElement("div");
    header.className = "downgo-announcement-header";
    const kicker = document.createElement("p");
    kicker.className = "downgo-announcement-kicker";
    kicker.textContent = "DownGo offer";
    const dismiss = document.createElement("button");
    dismiss.type = "button";
    dismiss.className = "downgo-announcement-x";
    dismiss.setAttribute("aria-label", "Close offer");
    dismiss.textContent = "×";
    dismiss.addEventListener("click", () => dialog.close());
    header.append(kicker, dismiss);
    const offerContent = content.cloneNode(true);
    offerContent.querySelectorAll("[id]").forEach(element => element.removeAttribute("id"));
    inner.append(header, offerContent);
    const actions = document.createElement("div");
    actions.className = "downgo-announcement-actions";
    const close = document.createElement("button");
    close.type = "button";
    close.className = "downgo-announcement-close";
    close.textContent = "Not now";
    close.addEventListener("click", () => dialog.close());
    actions.append(close);
    inner.append(actions);
    dialog.append(inner);
    document.body.append(dialog);
    dialog.addEventListener("close", () => dialog.remove(), { once: true });
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
      dismiss.focus();
    }
  }

  async function loadAnnouncements() {
    try {
      const response = await fetch(FEED_URL, { cache: "no-store", headers: { Accept: "application/json" } });
      if (!response.ok) {
        showFallbackHomeOfferPopup();
        return;
      }
      const feed = await response.json();
      if (!feed || !Array.isArray(feed.announcements)) {
        showFallbackHomeOfferPopup();
        return;
      }
      const now = new Date();
      const active = feed.announcements.find(item => item && item.enabled === true && item.id && item.title && item.message && activeNow(item, now));
      if (!active) {
        // The homepage contains a readable static offer fallback for crawlers and no-JS visitors.
        // Once the live feed loads successfully, it is authoritative and can hide an expired offer.
        const banner = document.querySelector("#home-offer-banner");
        if (banner) banner.hidden = true;
        return;
      }
      const offers = getOffers(active);
      applyPlanOffers(offers);
      renderHomeOffer(active, offers);
      // Show the active offer only on the homepage, alongside its persistent banner.
      if (active.type === "offer") {
        if (document.querySelector("#home-offer-banner")) showPopup(active, offers);
      } else {
        showPopup(active, offers);
      }
    } catch (_) {
      // Keep the local-file preview useful when fetch() cannot read announcements.json.
      showFallbackHomeOfferPopup();
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", loadAnnouncements, { once: true });
  else loadAnnouncements();
})();
