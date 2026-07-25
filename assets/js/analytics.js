/* ============================================================================
   ANALYTICS.JS — Analytics & Conversion tracking system
   ----------------------------------------------------------------------------
   - Loads Google Analytics 4 ONLY if a Measurement ID is set in site-config.js
     (GA4_MEASUREMENT_ID). If empty, nothing third-party loads — privacy first.
   - Exposes window.track(eventName, params) used across the site to record
     conversion events (add to cart, begin checkout, purchase intent, service
     enquiry, WhatsApp click). These power your CRO + analytics dashboards.
   - Always logs events to console in a harmless way so you can verify tracking
     even before GA4 is connected.
   ========================================================================= */
(function () {
  var cfg = window.SITE_CONFIG || {};
  var GA_ID = cfg.GA4_MEASUREMENT_ID || "";

  // Initialise dataLayer + gtag stub regardless (queues events until GA loads)
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  if (GA_ID) {
    // Load GA4 script
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA_ID);
    document.head.appendChild(s);
    gtag("js", new Date());
    gtag("config", GA_ID, { anonymize_ip: true });
  }

  // Central event tracker used by the rest of the site
  window.track = function (eventName, params) {
    params = params || {};
    try {
      if (GA_ID && typeof window.gtag === "function") {
        window.gtag("event", eventName, params);
      }
      // Always available for debugging / future analytics back-ends
      if (window.console && console.debug) {
        console.debug("[track]", eventName, params);
      }
    } catch (e) { /* analytics must never break the site */ }
  };

  // Auto-track outbound WhatsApp clicks (key conversion for this business)
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href*="wa.me"], a[href*="api.whatsapp.com"]');
    if (a) {
      window.track("whatsapp_click", { link_url: a.href });
    }
  }, true);

  // Track scroll depth milestones (engagement signal for SEO/CRO)
  var milestones = [25, 50, 75, 100];
  var hit = {};
  window.addEventListener("scroll", function () {
    var h = document.documentElement;
    var scrolled = (h.scrollTop) / (h.scrollHeight - h.clientHeight) * 100;
    milestones.forEach(function (m) {
      if (!hit[m] && scrolled >= m) {
        hit[m] = true;
        window.track("scroll_depth", { percent: m });
      }
    });
  }, { passive: true });
})();
