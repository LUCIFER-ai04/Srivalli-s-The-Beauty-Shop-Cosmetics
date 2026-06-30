/* ============================================================================
   AUTH GUARD — runs immediately (synchronous IIFE).
   Every page except login.html and 404.html requires a valid Google session.
   Uses localStorage fast-check so there is NO network call and NO flash.
   ============================================================================ */
(function () {
  var path = window.location.pathname;
  // Skip for login and 404 pages
  if (path.indexOf('login.html') > -1 || path.indexOf('404.html') > -1) return;

  // Fast synchronous check — look for valid Supabase session in localStorage
  var authed = false;
  try {
    for (var k in localStorage) {
      if (k.indexOf('sb-') === 0 && k.indexOf('-auth-token') > -1) {
        var raw = localStorage.getItem(k);
        if (!raw) continue;
        var s = JSON.parse(raw);
        var tok = s.access_token || (s.session && s.session.access_token);
        var exp = s.expires_at || (s.session && s.session.expires_at) || 0;
        if (tok && exp > Date.now() / 1000) { authed = true; break; }
      }
    }
  } catch (e) {}

  if (!authed) {
    // Save current URL so we can return here after login
    try { sessionStorage.setItem('returnTo', window.location.href); } catch(e) {}
    window.location.replace('login.html');
  }
})();

/* ============================================================================
   SHARED — header, footer, floating decor layer, cart storage, toast helper.
   Included on every page. Keeps nav/footer in one place instead of being
   copy-pasted and drifting out of sync across pages.
   ========================================================================= */

(function () {
  // ---- floating "lipstick etc" decor silhouettes (signature element) -----
  const ICONS = {
    lipstick: `<path d="M30 4h12l4 14-10 8-10-8 4-14z" fill="currentColor"/><rect x="26" y="26" width="20" height="34" rx="6" fill="currentColor"/>`,
    perfume: `<rect x="20" y="6" width="10" height="10" rx="2" fill="currentColor"/><path d="M16 20h18l4 8v28a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4V28l4-8z" fill="currentColor"/>`,
    polish: `<rect x="18" y="6" width="10" height="10" rx="2" fill="currentColor"/><path d="M14 18h22a2 2 0 0 1 2 2v32a6 6 0 0 1-6 6H18a6 6 0 0 1-6-6V20a2 2 0 0 1 2-2z" fill="currentColor"/>`,
    bangle: `<circle cx="30" cy="30" r="22" fill="none" stroke="currentColor" stroke-width="8"/>`,
    flower: `<g fill="currentColor"><circle cx="30" cy="14" r="9"/><circle cx="30" cy="46" r="9"/><circle cx="14" cy="30" r="9"/><circle cx="46" cy="30" r="9"/><circle cx="30" cy="30" r="7"/></g>`
  };
  const ICON_KEYS = Object.keys(ICONS);

  function buildDecor() {
    const wrap = document.createElement("div");
    wrap.className = "float-decor";
    wrap.setAttribute("aria-hidden", "true");
    const count = window.innerWidth < 700 ? 7 : 12;
    for (let i = 0; i < count; i++) {
      const key = ICON_KEYS[i % ICON_KEYS.length];
      const size = 26 + Math.round(Math.random() * 30);
      const left = Math.round(Math.random() * 96);
      const duration = 16 + Math.round(Math.random() * 18);
      const delay = -Math.round(Math.random() * 30);
      const hue = ["color:#C9486B;", "color:#C9A07C;", "color:#C9A227;"][i % 3];
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "fi");
      svg.setAttribute("viewBox", "0 0 60 60");
      svg.setAttribute("width", size);
      svg.setAttribute("height", size);
      svg.style.cssText = `left:${left}%; animation-duration:${duration}s; animation-delay:${delay}s; ${hue}`;
      svg.innerHTML = ICONS[key];
      wrap.appendChild(svg);
    }
    document.body.prepend(wrap);
  }

  const NAV_LINKS = [
    ["home", "Home"],
    ["shop", "Shop"],
    ["services", "Service"],
    ["courses", "Courses"],
    ["about", "About Us"],
    ["contact", "Contact Us"]
  ];

  const SOCIAL_SVGS = {
    instagram: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg>`,
    youtube: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="4"/><path d="M10 9.5l5 2.5-5 2.5z" fill="currentColor" stroke="none"/></svg>`,
    whatsapp: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 5a2 2 0 0 1 2-2h3l2 5-2.5 1.5a11 11 0 0 0 5 5L14 12l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 5z"/></svg>`
  };

  function isHomePage() {
    const p = location.pathname.split("/").pop();
    return p === "" || p === "index.html";
  }

  function buildUtilityBar() {
    const bar = document.createElement("div");
    bar.className = "utility-bar";
    bar.innerHTML = `
      <div class="container">
        <div class="utility-left">
          <span>Free Shipping on orders above &#8377;999</span>
        </div>
        <div class="utility-mid">Exclusive Offers &mdash; Beauty, Bridal &amp; Academy</div>
        <div class="utility-right">
          <div class="social-icons">
            <a href="https://instagram.com/sri_vallis_cosmetics" target="_blank" rel="noopener" aria-label="Instagram">${SOCIAL_SVGS.instagram}</a>
            <a href="https://www.youtube.com/@vallizwomensexclusive4914" target="_blank" rel="noopener" aria-label="YouTube">${SOCIAL_SVGS.youtube}</a>
            <a href="https://wa.me/918300633810" target="_blank" rel="noopener" aria-label="WhatsApp">${SOCIAL_SVGS.whatsapp}</a>
          </div>
        </div>
      </div>`;
    document.body.prepend(bar);
  }

  function buildHeader() {
    const home = isHomePage();
    const header = document.createElement("header");
    header.className = "site-header";
    header.innerHTML = `
      <div class="nav-wrap">
        <a class="brand" href="index.html">
          <img src="assets/img/logo-round.png" alt="Srivalli's The Beauty Shop Cosmetics logo" width="46" height="46" loading="eager" style="border-radius:50%;object-fit:cover;">
          <span class="brand-text" style="font-size:1.05rem;">Srivalli's The Beauty Shop<span>Cosmetics &amp; Bridal Studio</span></span>
        </a>
        <nav class="main-nav" id="mainNav">
          ${NAV_LINKS.map(([id, label]) => `<a href="${home ? "#" + id : "index.html#" + id}" data-section="${id}">${label}</a>`).join("")}
        </nav>
        <div class="nav-actions">
          <button class="cart-pill" id="cartOpenBtn" aria-label="Open cart">&#127978; Cart <span class="count" id="navCartCount">0</span></button>
          <button class="menu-toggle" id="menuToggle" aria-label="Toggle menu" aria-expanded="false">&#9776;</button>
        </div>
      </div>`;
    document.body.prepend(header);
    const mainNav = document.getElementById("mainNav");

    // keep the mobile dropdown positioned exactly below the header's current
    // on-screen edge (accounts for the utility bar scrolling away, webfont
    // reflow, and the brand text wrapping on very narrow screens). When
    // closed, CSS forces top:-100vh so it's always fully off-screen
    // regardless of this value.
    function syncNavOffset() {
      mainNav.style.setProperty("--mobile-nav-top", header.getBoundingClientRect().bottom + "px");
    }
    syncNavOffset();
    window.addEventListener("resize", syncNavOffset);
    window.addEventListener("scroll", syncNavOffset, { passive: true });
    window.addEventListener("load", syncNavOffset);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncNavOffset);
    if (window.ResizeObserver) new ResizeObserver(syncNavOffset).observe(header);

    document.getElementById("menuToggle").addEventListener("click", () => {
      syncNavOffset();
      mainNav.classList.toggle("open");
    });
    document.getElementById("cartOpenBtn").addEventListener("click", () => {
      if (window.cartDrawer) window.cartDrawer.open("cart");
    });
    // close mobile menu after tapping a link
    header.querySelectorAll("nav.main-nav a").forEach((a) => {
      a.addEventListener("click", () => mainNav.classList.remove("open"));
    });
  }

  function buildFooter() {
    const footer = document.createElement("footer");
    footer.className = "site-footer";
    footer.innerHTML = `
      <div class="footer-grid">
        <div>
          <h4>Srivalli's The Beauty Shop Cosmetics</h4>
          <p style="color:#CBB7BE;font-size:.88rem;max-width:320px;">Cosmetics shop, beauty services, bridal makeup, bridal jewellery and the NCFT beauty academy — proudly serving Theni.</p>
          <p style="color:#CBB7BE;font-size:.82rem;max-width:320px;">Ground Floor, Shop No-626B, Eswar Tower, Near Vani Sweets, Periyakulam Main Road, Theni-625531, Tamil Nadu.</p>
          <div class="social-icons">
            <a href="https://instagram.com/sri_vallis_cosmetics" target="_blank" rel="noopener" aria-label="Instagram">${SOCIAL_SVGS.instagram}</a>
            <a href="https://www.youtube.com/@vallizwomensexclusive4914" target="_blank" rel="noopener" aria-label="YouTube">${SOCIAL_SVGS.youtube}</a>
            <a href="https://wa.me/918300633810" target="_blank" rel="noopener" aria-label="WhatsApp">${SOCIAL_SVGS.whatsapp}</a>
          </div>
        </div>
        <div>
          <h4>Explore</h4>
          ${NAV_LINKS.map(([id, label]) => `<a href="${isHomePage() ? "#" + id : "index.html#" + id}">${label}</a>`).join("")}
        </div>
        <div>
          <h4>Account &amp; Policies</h4>
          <a href="login.html">Admin Login</a>
          <a href="#" id="footerTermsLink">Terms &amp; Conditions</a>
        </div>
      </div>
      <div class="footer-bottom">&copy; <span id="yr"></span> Srivalli's Cosmetics. All rights reserved.</div>`;
    document.body.appendChild(footer);
    document.getElementById("yr").textContent = new Date().getFullYear();
    const link = document.getElementById("footerTermsLink");
    if (link) link.addEventListener("click", (e) => {
      e.preventDefault();
      const b = document.getElementById("termsBackdrop");
      if (b) b.classList.add("show");
    });
  }

  // ---- cart (localStorage-based, simple) -----------------------------------
  const CART_KEY = "sc_cart_v1";
  function getCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || "[]"); } catch (e) { return []; }
  }
  function saveCart(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    updateCartCount();
  }
  function addToCart(product, qty) {
    qty = qty || 1;
    const cart = getCart();
    const existing = cart.find((i) => i.id === product.id);
    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({
        id:       product.id,
        name:     product.name,
        price:    product.price,
        category: product.category,
        discount: product.discount || 0,
        image:    product.image    || null,   // ← store image for cart display
        qty:      qty
      });
    }
    saveCart(cart);
  }
  function removeFromCart(id) {
    saveCart(getCart().filter((i) => i.id !== id));
  }
  function setQty(id, qty) {
    const cart = getCart();
    const item = cart.find((i) => i.id === id);
    if (item) item.qty = Math.max(1, qty);
    saveCart(cart);
  }
  function clearCart() { saveCart([]); }
  function cartTotal() {
    return getCart().reduce(function(s, i) {
      var disc = i.discount > 0 ? Math.round(i.price*(1-i.discount/100)*100)/100 : i.price;
      return s + disc * i.qty;
    }, 0);
  }
  function cartCount() { return getCart().reduce((s, i) => s + i.qty, 0); }
  function updateCartCount() {
    const el = document.getElementById("navCartCount");
    if (el) el.textContent = cartCount();
  }

  // ---- toast -----------------------------------------------------------------
  function toast(msg) {
    let t = document.querySelector(".toast");
    if (!t) {
      t = document.createElement("div");
      t.className = "toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove("show"), 2600);
  }

  // ---- simple placeholder product illustration (category-based) -----------
  const CAT_ICON = {
    "Cosmetics": ICONS.lipstick, "Hair": ICONS.polish, "Hair Fiber": ICONS.polish,
    "Perfume": ICONS.perfume, "Jewellery": ICONS.bangle, "Fashion Plastic Bangles": ICONS.bangle,
    "Cream": ICONS.perfume, "Room Spray": ICONS.perfume, "Items": ICONS.flower,
    "Plastic Glows": ICONS.flower, "Electronics": ICONS.flower, "Fabrics": ICONS.flower,
    "Brushes": ICONS.polish
  };
  function productIconSVG(category) {
    const path = CAT_ICON[category] || ICONS.flower;
    return `<svg viewBox="0 0 60 60" style="color:#C9486B"><g>${path}</g></svg>`;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  }

  function fmtPrice(n) {
    return "\u20b9" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
  }

  /* ── Update nav with auth state (sign-out + admin link) ────────────── */
  async function updateNavAuth() {
    if (!window.db || !db.isConnected()) return;
    try {
      var session = await db.getSession();
      if (!session) return;
      var email = session.user ? session.user.email : '';
      // Add sign-out link to header
      var cartBtn = document.querySelector('.cart-btn');
      if (cartBtn && cartBtn.parentNode && !document.getElementById('navSignOut')) {
        var signOutLink = document.createElement('a');
        signOutLink.id = 'navSignOut';
        signOutLink.href = '#';
        signOutLink.style.cssText = 'color:var(--cream);font-size:.75rem;opacity:.7;text-decoration:none;margin-right:8px;white-space:nowrap;';
        signOutLink.textContent = 'Sign Out';
        signOutLink.setAttribute('aria-label', 'Sign out of your account');
        signOutLink.addEventListener('click', function(e) {
          e.preventDefault();
          db.signOut().then(function() {
            window.location.replace('login.html');
          }).catch(function() {
            window.location.replace('login.html');
          });
        });
        // Admin link
        var adminCheck = await db.isCurrentUserAdmin();
        if (adminCheck) {
          var adminLink = document.createElement('a');
          adminLink.href = 'admin.html';
          adminLink.style.cssText = 'color:#C9A227;font-size:.75rem;font-weight:700;text-decoration:none;margin-right:8px;white-space:nowrap;';
          adminLink.textContent = '⚙ Admin';
          adminLink.setAttribute('aria-label', 'Open admin panel');
          cartBtn.parentNode.insertBefore(adminLink, cartBtn);
        }
        // My Orders link — visible to every signed-in customer
        if (!/my-orders\.html/.test(location.pathname)) {
          var ordersLink = document.createElement('a');
          ordersLink.href = 'my-orders.html';
          ordersLink.style.cssText = 'color:var(--cream);font-size:.75rem;opacity:.85;text-decoration:none;margin-right:8px;white-space:nowrap;';
          ordersLink.textContent = '📦 My Orders';
          ordersLink.setAttribute('aria-label', 'View my order history');
          cartBtn.parentNode.insertBefore(ordersLink, cartBtn);
        }
        cartBtn.parentNode.insertBefore(signOutLink, cartBtn);
      }
    } catch(e) {}
  }

  document.addEventListener("DOMContentLoaded", () => {
    buildDecor();
    buildHeader();
    buildUtilityBar();
    buildFooter();
    updateCartCount();
    updateNavAuth();  // Show sign-out + admin link for authenticated users
    // 🚀 PRE-FETCH settings immediately on page load so checkout is instant
    if (window.db && db.getSettings) {
      db.getSettings().catch(function(){});
    }

    const termsClose = document.getElementById("termsCloseBtn");
    if (termsClose) termsClose.addEventListener("click", () => document.getElementById("termsBackdrop").classList.remove("show"));
    const termsBackdrop = document.getElementById("termsBackdrop");
    if (termsBackdrop) termsBackdrop.addEventListener("click", (e) => { if (e.target === termsBackdrop) termsBackdrop.classList.remove("show"); });
  });

  window.shared = {
    getCart, saveCart, addToCart, removeFromCart, setQty, clearCart,
    cartTotal, cartCount, updateCartCount, toast, productIconSVG,
    escapeHtml, fmtPrice, NAV_LINKS
  };
})();
