/* ============================================================================
   SITE CONFIG — the ONE place you need to edit before going live.
   ----------------------------------------------------------------------------
   - "Site URL is still a placeholder" → defined ONCE here, every page reads
     SITE_CONFIG.SITE_URL instead of it being copy-pasted everywhere.
   - UPI ID / WhatsApp number / address / socials are also stored in the
     Supabase `settings` table and editable from the Admin Panel at runtime.
     The values below are only used as a fallback before Supabase is wired up.
   ========================================================================= */

window.SITE_CONFIG = {
  // 1) CHANGE THIS to your real domain before you deploy.
  SITE_URL: "https://srivallis-cosmetics.in",

  BUSINESS_NAME: "Srivalli's The Beauty Shop Cosmetics",
  BUSINESS_ADDRESS: "Ground Floor, Shop No-626B, Eswar Tower, Near Vani Sweets, Periyakulam Main Road, Theni-625531, Tamil Nadu",

  // Fallback values — overridden at runtime by the `settings` table in
  // Supabase once it's connected (see schema.sql). Edit from Admin Panel.
  UPI_ID_FALLBACK: "visu9474-1@oksbi",
  WA_NUMBER_FALLBACK: "918300633810",
  INSTAGRAM_URL_FALLBACK: "https://instagram.com/sri_vallis_cosmetics",
  YOUTUBE_URL_FALLBACK: "https://www.youtube.com/@vallizwomensexclusive4914",

  // 2) Supabase project — CONNECTED ✓
  SUPABASE_URL: "https://edwlwrpjilipvdlpjtxr.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkd2x3cnBqaWxpcHZkbHBqdHhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwMDM2NjgsImV4cCI6MjA5NzU3OTY2OH0.7mr3i-usiLVL8wF0pTakonF2iBinSbvbD6ayOyL4Hmg",

  // 3) Payment — WhatsApp checkout only (no payment gateway).
  //    Orders are sent directly to the shop WhatsApp number below.
  //    WA_NUMBER_FALLBACK is used if Admin → Settings hasn't been saved yet.

  // 4) SITE_URL — your real domain. SEO uses this everywhere as the single
  //    source of truth (canonical tags, Open Graph, sitemap, JSON-LD).
  //    CHANGE THIS to your purchased domain before deploying.
  SITE_URL: "https://srivallis-cosmetics.in",

  // 5) Analytics (optional). Paste your Google Analytics 4 Measurement ID
  //    (looks like "G-XXXXXXXXXX") to turn on traffic + conversion tracking.
  //    Leave empty to disable analytics entirely. No third-party tracking
  //    loads unless you fill this in.
  GA4_MEASUREMENT_ID: ""
};
