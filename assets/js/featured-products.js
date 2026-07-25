/* ============================================================================
   FEATURED HOME PAGE PRODUCTS — stylised "3D-look" SVG placeholders for the
   4 requested products. These render directly as graphics (no product
   copy/wording on the home page, per request). Replace with real photos any
   time via Admin Panel → Products → (edit) → Upload Photo — once a real
   photo_url is set, the home page will automatically use it instead.
   ========================================================================= */
window.FEATURED_HOME_PRODUCTS = [
  {
    id: "FEAT-LIPSTICK",
    name: "Swiss Beauty Lipstick",
    category: "Cosmetics",
    svg: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lipG1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#E85C7B"/><stop offset="1" stop-color="#B3214E"/>
        </linearGradient>
        <linearGradient id="lipG2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#FFD9B3"/><stop offset="1" stop-color="#C99B7A"/>
        </linearGradient>
        <linearGradient id="lipG3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#3A2530"/><stop offset="1" stop-color="#1C1015"/>
        </linearGradient>
      </defs>
      <ellipse cx="100" cy="178" rx="46" ry="8" fill="#000" opacity=".12"/>
      <rect x="68" y="96" width="64" height="78" rx="10" fill="url(#lipG3)"/>
      <rect x="74" y="102" width="14" height="60" rx="6" fill="#ffffff" opacity=".08"/>
      <path d="M70 96 q30 -14 60 0 l-4 30 q-26 16 -52 0 z" fill="url(#lipG2)"/>
      <path d="M76 96 q24 16 48 0 q-6 -38 -24 -52 q-18 14 -24 52z" fill="url(#lipG1)"/>
      <ellipse cx="92" cy="58" rx="6" ry="10" fill="#ffffff" opacity=".35"/>
    </svg>`
  },
  {
    id: "FEAT-PRIMER",
    name: "Faces Canada Ultime Pro Primerizer 30g",
    category: "Cosmetics",
    svg: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="prB" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#F6E7DC"/><stop offset="1" stop-color="#E9C9B4"/>
        </linearGradient>
        <linearGradient id="prCap" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#7E1638"/><stop offset="1" stop-color="#4C0E22"/>
        </linearGradient>
      </defs>
      <ellipse cx="100" cy="178" rx="48" ry="8" fill="#000" opacity=".12"/>
      <rect x="62" y="56" width="76" height="112" rx="14" fill="url(#prB)" stroke="#C99B7A" stroke-width="2"/>
      <rect x="70" y="30" width="60" height="32" rx="8" fill="url(#prCap)"/>
      <rect x="76" y="20" width="48" height="16" rx="6" fill="#5B1029"/>
      <rect x="72" y="92" width="56" height="40" rx="6" fill="#ffffff" opacity=".55"/>
      <circle cx="100" cy="112" r="13" fill="#B3214E" opacity=".85"/>
      <rect x="80" y="62" width="40" height="6" rx="3" fill="#ffffff" opacity=".5"/>
    </svg>`
  },
  {
    id: "FEAT-FOUNDATION",
    name: "Swiss Beauty High Performance Foundation Vitamin C & Niacinamide 55g",
    category: "Cosmetics",
    svg: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fdB" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#D9A877"/><stop offset="1" stop-color="#B9892E"/>
        </linearGradient>
        <linearGradient id="fdCap" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#2C1722"/><stop offset="1" stop-color="#140A0F"/>
        </linearGradient>
      </defs>
      <ellipse cx="100" cy="178" rx="50" ry="8" fill="#000" opacity=".12"/>
      <path d="M60 90 q40 -16 80 0 v62 q-40 18 -80 0 z" fill="url(#fdB)"/>
      <ellipse cx="100" cy="90" rx="40" ry="14" fill="#E9C9B4"/>
      <rect x="76" y="50" width="48" height="40" rx="10" fill="url(#fdCap)"/>
      <ellipse cx="100" cy="50" rx="24" ry="8" fill="#3A2A33"/>
      <ellipse cx="84" cy="122" rx="10" ry="22" fill="#ffffff" opacity=".25"/>
    </svg>`
  },
  {
    id: "FEAT-FACEWASH",
    name: "Glow Oxyglute Rice Face Wash with Niacinamide",
    category: "Cosmetics",
    svg: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fwB" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#FBEFE3"/><stop offset="1" stop-color="#E9C9B4"/>
        </linearGradient>
        <linearGradient id="fwCap" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#2F7D5A"/><stop offset="1" stop-color="#1E5B3F"/>
        </linearGradient>
      </defs>
      <ellipse cx="100" cy="178" rx="42" ry="8" fill="#000" opacity=".12"/>
      <path d="M78 50 h44 l8 18 v92 a10 10 0 0 1 -10 10 H80 a10 10 0 0 1 -10 -10 V68 z" fill="url(#fwB)" stroke="#C99B7A" stroke-width="2"/>
      <rect x="84" y="30" width="32" height="24" rx="6" fill="url(#fwCap)"/>
      <rect x="88" y="22" width="24" height="12" rx="4" fill="#16432E"/>
      <rect x="76" y="90" width="48" height="46" rx="6" fill="#ffffff" opacity=".5"/>
      <circle cx="100" cy="113" r="11" fill="#2F7D5A" opacity=".7"/>
    </svg>`
  }
];
