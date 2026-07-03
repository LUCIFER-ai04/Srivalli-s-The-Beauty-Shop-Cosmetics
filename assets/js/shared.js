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
    facebook:  `<svg viewBox="0 0 24 24" width="20" height="20" fill="#1877F2" xmlns="http://www.w3.org/2000/svg"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
    instagram: `<svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="ig" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#f09433"/><stop offset="25%" stop-color="#e6683c"/><stop offset="50%" stop-color="#dc2743"/><stop offset="75%" stop-color="#cc2366"/><stop offset="100%" stop-color="#bc1888"/></linearGradient></defs><path fill="url(#ig)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>`,
    youtube:   `<svg viewBox="0 0 24 24" width="20" height="20" fill="#FF0000" xmlns="http://www.w3.org/2000/svg"><path d="M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>`,
    whatsapp:  `<svg viewBox="0 0 24 24" width="20" height="20" fill="#25D366" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`
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
            <a href="https://www.facebook.com/thebeautyshoptheni/" target="_blank" rel="noopener" aria-label="Facebook">${SOCIAL_SVGS.facebook}</a>
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
            <a href="https://www.facebook.com/thebeautyshoptheni/" target="_blank" rel="noopener" aria-label="Facebook">${SOCIAL_SVGS.facebook}</a>
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
          <h4>Social</h4>
          <a href="https://www.facebook.com/thebeautyshoptheni/" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:8px;">${SOCIAL_SVGS.facebook} Facebook</a>
          <a href="https://instagram.com/sri_vallis_cosmetics" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:8px;">${SOCIAL_SVGS.instagram} Instagram</a>
          <a href="https://www.youtube.com/@vallizwomensexclusive4914" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:8px;">${SOCIAL_SVGS.youtube} YouTube</a>
          <a href="https://wa.me/918300633810" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:8px;">${SOCIAL_SVGS.whatsapp} WhatsApp</a>
        </div>
        <div>
          <h4>Policies</h4>
          <a href="#" id="footerTermsLink">Terms &amp; Conditions</a>
        </div>
      </div>
      <div class="footer-bottom">&copy; <span id="yr"></span> Srivalli's Cosmetics. All rights reserved. <a href="login.html" style="color:transparent;font-size:1px;pointer-events:auto;" tabindex="-1" aria-hidden="true">&#8203;</a></div>`;
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
      var cartBtn = document.querySelector('.cart-btn');
      if (!cartBtn || !cartBtn.parentNode) return;

      if (!session) {
        // Visitor not logged in — show a subtle Sign In link in the nav
        if (!document.getElementById('navSignIn')) {
          var signInLink = document.createElement('a');
          signInLink.id = 'navSignIn';
          signInLink.href = 'login.html';
          signInLink.style.cssText = 'color:var(--cream);font-size:.75rem;opacity:.7;text-decoration:none;margin-right:8px;white-space:nowrap;';
          signInLink.textContent = 'Sign In';
          signInLink.setAttribute('aria-label', 'Sign in to your account');
          cartBtn.parentNode.insertBefore(signInLink, cartBtn);
        }
        return;
      }

      var email = session.user ? session.user.email : '';
      // Add sign-out link to header
      if (!document.getElementById('navSignOut')) {
        var signOutLink = document.createElement('a');
        signOutLink.id = 'navSignOut';
        signOutLink.href = '#';
        signOutLink.style.cssText = 'color:var(--cream);font-size:.75rem;opacity:.7;text-decoration:none;margin-right:8px;white-space:nowrap;';
        signOutLink.textContent = 'Sign Out';
        signOutLink.setAttribute('aria-label', 'Sign out of your account');
        signOutLink.addEventListener('click', function(e) {
          e.preventDefault();
          db.signOut().then(function() {
            window.location.replace('index.html');
          }).catch(function() {
            window.location.replace('index.html');
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
