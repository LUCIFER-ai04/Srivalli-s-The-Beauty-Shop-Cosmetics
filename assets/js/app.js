(function () {
  var PAGE_SIZE = 24;
  // Category order starts with defaults — updated async from Supabase categories table
  // Admin can add/remove categories via Admin → Categories tab
  var CATEGORY_ORDER = [
    "Cosmetics","Hair","Perfume","Jewellery","Items","Plastic Glows",
    "Electronics","Cream","Fashion Plastic Bangles","Room Spray",
    "Hair Fiber","Fabrics","Brushes"
  ];

  var ALL = [], filtered = [], activeCat = "All", searchTerm = "", page = 1;
  var _catFromDB = false;   // true once Supabase categories are loaded
  var _currentBooking = { name: "", type: "" };

  /* Load categories from Supabase — updates filter dynamically */
  function loadCategoriesFromDB() {
    if (!window.db || !db.getCategories) return;
    db.getCategories().then(function(cats) {
      if (!cats || !cats.length) return;
      // Only show active categories, in admin-defined order
      CATEGORY_ORDER = cats.filter(function(c){ return c.active; }).map(function(c){ return c.name; });
      _catFromDB = true;
      renderCatList(); // re-render with Supabase categories
    }).catch(function(){});
  }

  // ------------------------------------------------------------ SHOP -------
  function applyFilters() {
    var q = searchTerm.trim().toLowerCase();
    filtered = ALL.filter(function (p) {
      var catOk = activeCat === "All" || p.category === activeCat;
      var qOk   = !q || p.name.toLowerCase().indexOf(q) !== -1;
      return catOk && qOk;
    });
    page = 1;
    renderShop();
  }

  function renderCatList() {
    var wrap = document.getElementById("catList");
    if (!wrap) return;
    // If loaded from Supabase: show ALL active admin-configured categories
    // If using local fallback: only show categories that have products
    var cats;
    if (_catFromDB) {
      cats = ["All"].concat(CATEGORY_ORDER);
    } else {
      var counts = { All: ALL.length };
      ALL.forEach(function (p) { counts[p.category] = (counts[p.category] || 0) + 1; });
      cats = ["All"].concat(CATEGORY_ORDER.filter(function (c) { return counts[c]; }));
    }
    wrap.innerHTML = "<h4>Categories</h4>" + cats.map(function (c) {
      return '<button class="cat-btn ' + (c === activeCat ? "active" : "") +
        '" data-cat="' + shared.escapeHtml(c) + '"><span>' + shared.escapeHtml(c) + '</span></button>';
    }).join("");
    wrap.querySelectorAll(".cat-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        activeCat = btn.dataset.cat;
        renderCatList();
        applyFilters();
      });
    });
  }

  // Title-case product names (inventory data is ALL CAPS)
  function fmtName(str) {
    var lower = String(str).toLowerCase();
    return lower.replace(/(^|\s|\/|-)([a-z\u00C0-\u024F])/g, function(m, sep, c) { return sep + c.toUpperCase(); });
  }

  function calcDiscountedPrice(price, discount) {
    if (!discount || discount <= 0) return price;
    return Math.round(price * (1 - discount / 100) * 100) / 100;
  }

  function priceHtml(price, discount) {
    if (!discount || discount <= 0) {
      return '<div class="price-display"><span class="price-final">' + shared.fmtPrice(price) + '</span></div>';
    }
    var disc = calcDiscountedPrice(price, discount);
    return '<div class="price-display">' +
      '<s class="price-original">' + shared.fmtPrice(price) + '</s>' +
      '<span class="price-final">' + shared.fmtPrice(disc) + '</span>' +
    '</div>';
  }

  function productCard(p) {
    var displayName = fmtName(p.name);
    var productUrl  = "product.html?id=" + encodeURIComponent(p.id);
    var discount    = p.discount || 0;
    var img = p.image
      ? '<img src="' + p.image + '" alt="' + shared.escapeHtml(displayName) + ' - ' + shared.escapeHtml(p.category) + '" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover;">'
      : shared.productIconSVG(p.category);

    // Discount badge overlay — shown top-left on the image if discount > 0
    var discBadge = discount > 0
      ? '<div class="card-discount-badge">' + Math.round(discount) + '% OFF</div>'
      : '';

    return '<div class="product-card">' +
      '<div style="position:relative;">' +
        discBadge +
        '<a href="' + productUrl + '" class="imgwrap" style="display:block;text-decoration:none;cursor:pointer;">' + img + '</a>' +
      '</div>' +
      '<div class="body">' +
        '<span class="cat">' + shared.escapeHtml(p.category) + '</span>' +
        '<a href="' + productUrl + '" class="name" style="text-decoration:none;color:inherit;display:block;cursor:pointer;">' + shared.escapeHtml(displayName) + '</a>' +
        '<div class="product-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>' +
        priceHtml(p.price, discount) +
        '<button class="btn btn-primary btn-sm add-cart-btn" data-id="' + shared.escapeHtml(p.id) + '">Add to Cart</button>' +
      '</div></div>';
  }

  function renderShop() {
    var grid    = document.getElementById("productGrid");
    var countEl = document.getElementById("resultCount");
    if (countEl) countEl.textContent = "";  // count sentence removed per request
    if (!grid) return;

    var start     = (page - 1) * PAGE_SIZE;
    var pageItems = filtered.slice(start, start + PAGE_SIZE);

    grid.innerHTML = pageItems.length
      ? pageItems.map(productCard).join("")
      : '<div class="empty-state" style="grid-column:1/-1;"><p>No products match your search.</p></div>';

    grid.querySelectorAll(".add-cart-btn").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        e.preventDefault();
        var p = filtered.find ? filtered.find(function (x) { return x.id === btn.dataset.id; })
          : (function () { for (var i = 0; i < filtered.length; i++) { if (filtered[i].id === btn.dataset.id) return filtered[i]; } return null; })();
        if (p) { shared.addToCart(p, 1); shared.toast(fmtName(p.name) + " added to cart"); if (window.track) window.track("add_to_cart", { item_name: p.name, price: p.price, category: p.category }); }
      });
    });
    renderPagination();
  }

  function renderPagination() {
    var totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    var wrap = document.getElementById("pagination");
    if (!wrap) return;
    if (totalPages <= 1) { wrap.innerHTML = ""; return; }
    var pages = [];
    for (var i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || Math.abs(i - page) <= 2) pages.push(i);
      else if (pages[pages.length - 1] !== "...") pages.push("...");
    }
    wrap.innerHTML =
      '<button ' + (page === 1 ? "disabled" : "") + ' data-go="prev">&larr; Prev</button>' +
      pages.map(function (p) {
        return p === "..."
          ? '<span style="padding:8px 4px;">&hellip;</span>'
          : '<button class="' + (p === page ? "active" : "") + '" data-go="' + p + '">' + p + '</button>';
      }).join("") +
      '<button ' + (page === totalPages ? "disabled" : "") + ' data-go="next">Next &rarr;</button>';
    wrap.querySelectorAll("button[data-go]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var go = btn.dataset.go;
        if (go === "prev") page = Math.max(1, page - 1);
        else if (go === "next") page = Math.min(totalPages, page + 1);
        else page = Number(go);
        renderShop();
        document.getElementById("shop").scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  // ---------------------------------------------------------- HERO VISUAL --
  function renderHeroVisual() {
    var wrap = document.getElementById("heroVisual");
    if (!wrap) return;
    wrap.innerHTML =
      '<div class="hero-logo-wrap">' +
        '<img src="assets/img/logo.jpg" ' +
             'alt="Sri Valli\'s The Beauty Shop Cosmetics — NCFT Academy | Makeup Studio | Bridal Jewellery" ' +
             'class="hero-logo-img" loading="eager" width="420" height="427">' +
      '</div>';
  }

  // ------------------------------------------------------- SERVICES / COURSES
  function makeCardHtml(item, levelTag) {
    var img = item.image_url
      ? '<img src="' + item.image_url + '" alt="' + shared.escapeHtml(item.name) + '" loading="lazy" style="width:100%;height:100%;object-fit:cover;">'
      : shared.productIconSVG("Cosmetics");
    var cls = levelTag ? "course-card" : "service-card";
    return '<div class="' + cls + '" tabindex="0" role="button" data-booking="' + shared.escapeHtml(item.name) + '" data-type="' + (levelTag ? "course" : "service") + '">' +
      '<div class="imgwrap">' + img + '</div>' +
      '<div class="body">' +
        (levelTag ? '<span class="course-level-tag ' + levelTag + '">' + levelTag + '</span>' : '') +
        '<h3>' + shared.escapeHtml(item.name) + '</h3>' +
        (item.description ? '<p>' + shared.escapeHtml(item.description) + '</p>' : '') +
        '<span style="font-size:.78rem;color:var(--berry);font-weight:600;margin-top:6px;display:block;">Tap to Book / Enquire &rarr;</span>' +
      '</div></div>';
  }

  async function renderServicesAndCourses() {
    var services = await db.getServices();
    var sg = document.getElementById("servicesGrid");
    if (sg) {
      sg.innerHTML = services.map(function (s) { return makeCardHtml(s, null); }).join("");
      bindBookingCards(sg);
    }
    var courses = await db.getCourses();
    var bg = document.getElementById("basicCourseGrid");
    var ag = document.getElementById("advancedCourseGrid");
    if (bg) { bg.innerHTML = courses.basic.map(function (c) { return makeCardHtml(c, "basic"); }).join(""); bindBookingCards(bg); }
    if (ag) { ag.innerHTML = courses.advanced.map(function (c) { return makeCardHtml(c, "advanced"); }).join(""); bindBookingCards(ag); }
  }

  // ----------------------------------------------- SERVICE / COURSE BOOKING -
  function bindBookingCards(container) {
    container.querySelectorAll("[data-booking]").forEach(function (card) {
      function trigger() { openBookingModal(card.dataset.booking, card.dataset.type); }
      card.addEventListener("click", trigger);
      card.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); trigger(); } });
    });
  }

  function openBookingModal(name, type) {
    _currentBooking = { name: name, type: type };
    var tag   = document.getElementById("bookingTag");
    var title = document.getElementById("bookingTitle");
    var back  = document.getElementById("bookingBackdrop");
    if (tag)   tag.textContent   = type === "course" ? "Academy Course" : "Beauty Service";
    if (title) title.textContent = name;
    if (back)  back.classList.add("show");
    var inp = document.getElementById("bkName");
    if (inp) setTimeout(function () { inp.focus(); }, 80);
  }

  function initBookingModal() {
    var backdrop = document.getElementById("bookingBackdrop");
    var closeBtn = document.getElementById("bkCloseBtn");
    var submitBtn = document.getElementById("bkSubmitBtn");
    if (!backdrop) return;

    function closeModal() {
      backdrop.classList.remove("show");
      ["bkName","bkPhone","bkMsg"].forEach(function (id) {
        var el = document.getElementById(id); if (el) el.value = "";
      });
    }

    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    backdrop.addEventListener("click", function (e) { if (e.target === backdrop) closeModal(); });

    if (submitBtn) {
      submitBtn.addEventListener("click", function () {
        var name  = (document.getElementById("bkName")  || {}).value || "";
        var phone = (document.getElementById("bkPhone") || {}).value || "";
        var msg   = (document.getElementById("bkMsg")   || {}).value || "";
        name = name.trim(); phone = phone.trim(); msg = msg.trim();
        if (!name || !phone) { shared.toast("Please enter your name and phone number."); return; }
        if (!/^[0-9]{10}$/.test(phone)) { shared.toast("Please enter a valid 10-digit phone number."); return; }
        var typeLabel = _currentBooking.type === "course" ? "Academy Course" : "Beauty Service";
        var text = encodeURIComponent(
          "*" + typeLabel + " Enquiry \u2014 Srivalli's Cosmetics*\n" +
          (_currentBooking.type === "course" ? "Course" : "Service") + ": " + _currentBooking.name + "\n" +
          "My Name: " + name + "\n" +
          "My Phone: " + phone +
          (msg ? "\nMessage: " + msg : "")
        );
        if (window.track) window.track("generate_lead", { type: _currentBooking.type, name: _currentBooking.name });
        window.open("https://wa.me/918300633810?text=" + text, "_blank");
        closeModal();
        shared.toast("Opening WhatsApp\u2026");
      });
    }
  }

  // ------------------------------------------------------- CONTACT FORM ----
  function checkFormRateLimit(key, max, windowMs) {
    try {
      var now = Date.now();
      var rec = JSON.parse(localStorage.getItem(key) || '{"count":0,"reset":0}');
      if (now > rec.reset) rec = { count: 0, reset: now + windowMs };
      if (rec.count >= max) return false;
      rec.count++; localStorage.setItem(key, JSON.stringify(rec)); return true;
    } catch(e) { return true; }
  }

  function initContactForm() {
    var btn = document.getElementById("cfSubmitBtn");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var name    = (document.getElementById("cfName")    || {}).value || "";
      var phone   = (document.getElementById("cfPhone")   || {}).value || "";
      var message = (document.getElementById("cfMessage") || {}).value || "";
      name = name.trim(); phone = phone.trim(); message = message.trim();
      if (!name || !phone || !message) { shared.toast("Please fill in all fields."); return; }
      if (!/^[0-9]{10}$/.test(phone)) { shared.toast("Please enter a valid 10-digit phone number."); return; }
      if (!checkFormRateLimit("rl_contact", 5, 60*60*1000)) {
        shared.toast("Too many messages sent. Please try again after an hour.");
        return;
      }
      var text = encodeURIComponent("*New enquiry — Srivalli's The Beauty Shop Cosmetics*\nName: " + name + "\nPhone: " + phone + "\nMessage: " + message);
      window.open("https://wa.me/918300633810?text=" + text, "_blank");
      document.getElementById("cfName").value = "";
      document.getElementById("cfPhone").value = "";
      document.getElementById("cfMessage").value = "";
      shared.toast("Opening WhatsApp\u2026");
    });
  }

  // ------------------------------------------------------- PRODUCT DETAIL MODAL
  var _currentProduct = null;
  function openProductModal(p) {
    _currentProduct = p;
    var backdrop = document.getElementById("productModalBackdrop");
    if (!backdrop) return;

    var displayName = fmtName(p.name);
    var finalPrice  = calcDiscountedPrice(p.price, p.discount || 0);

    // Photo
    var photoWrap = document.getElementById("pmPhotoWrap");
    photoWrap.innerHTML = p.image
      ? '<img src="' + p.image + '" alt="' + shared.escapeHtml(displayName) + '" style="width:100%;height:100%;object-fit:cover;">'
      : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(160deg,var(--cream-deep),var(--rose-gold-l));">' + shared.productIconSVG(p.category) + '</div>';

    // Share row
    var shareRow = document.getElementById("pmShareRow");
    var shareUrl = encodeURIComponent(window.location.href.split('#')[0] + '#shop');
    var shareText = encodeURIComponent("Check out " + displayName + " on Srivalli's The Beauty Shop Cosmetics!");
    shareRow.innerHTML =
      '<button class="pm-share-btn" id="pmShareNative" title="Share"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/></svg> Share</button>' +
      '<a class="pm-share-btn pm-share-wa" href="https://wa.me/?text=' + shareText + '" target="_blank" rel="noopener"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.905 1.032A10.981 10.981 0 0 0 1 12.002c0 1.926.504 3.737 1.379 5.315L1 23l5.817-1.35A11.007 11.007 0 0 0 11.905 23C17.98 23 23 17.973 23 11.968 23 5.963 17.98 1 11.905 1z"/></svg> WhatsApp</a>' +
      '<button class="pm-share-btn pm-copy-link" id="pmCopyLink" data-url="' + window.location.href.split('#')[0] + '#shop"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> Copy Link</button>';

    // Info
    document.getElementById("pmInfo").innerHTML =
      '<span class="cat" style="font-size:.72rem;">' + shared.escapeHtml(p.category) + '</span>' +
      '<h2 style="margin:6px 0 4px;font-size:1.35rem;">' + shared.escapeHtml(displayName) + '</h2>' +
      '<span style="font-size:.76rem;color:var(--ink-soft);">Product Code: ' + shared.escapeHtml(p.id) + '</span>';

    // Pricing
    var pricingEl = document.getElementById("pmPricing");
    if (p.discount && p.discount > 0) {
      pricingEl.innerHTML =
        '<div class="pm-price-row">' +
          '<span class="pm-price-final">' + shared.fmtPrice(finalPrice) + '</span>' +
          '<span class="pm-price-orig">' + shared.fmtPrice(p.price) + '</span>' +
          '<span class="pm-discount-pill">' + Math.round(p.discount) + '% OFF</span>' +
        '</div>' +
        '<div class="pm-savings">You save ' + shared.fmtPrice(p.price - finalPrice) + '</div>';
    } else {
      pricingEl.innerHTML = '<div class="pm-price-row"><span class="pm-price-final">' + shared.fmtPrice(p.price) + '</span></div>';
    }

    // Actions
    document.getElementById("pmActions").innerHTML =
      '<button class="btn btn-primary pm-add-btn" id="pmAddCart">Add to Cart</button>' +
      '<button class="btn btn-gold pm-buy-btn" id="pmBuyNow">Buy Now</button>';

    // Reviews
    loadProductReviews(p.id);

    backdrop.classList.add("show");

    // Event handlers
    var copyBtn = document.getElementById("pmCopyLink");
    if (copyBtn) {
      copyBtn.addEventListener("click", function() {
        navigator.clipboard && navigator.clipboard.writeText(copyBtn.dataset.url)
          .then(function(){ shared.toast("Link copied!"); })
          .catch(function(){ shared.toast("Copy: " + copyBtn.dataset.url); });
      });
    }
    var nativeShare = document.getElementById("pmShareNative");
    if (nativeShare && navigator.share) {
      nativeShare.addEventListener("click", function() {
        navigator.share({ title: displayName, text: shareText, url: window.location.href.split('#')[0] });
      });
    }
    var addBtn = document.getElementById("pmAddCart");
    if (addBtn) addBtn.addEventListener("click", function() {
      shared.addToCart(p, 1);
      shared.toast(displayName + " added to cart");
    });
    var buyBtn = document.getElementById("pmBuyNow");
    if (buyBtn) buyBtn.addEventListener("click", function() {
      shared.addToCart(p, 1);
      backdrop.classList.remove("show");
      if (window.cartDrawer) window.cartDrawer.open("checkout");
    });
  }

  function loadProductReviews(itemCode) {
    var reviewsEl = document.getElementById("pmReviews");
    if (!reviewsEl) return;
    reviewsEl.innerHTML = '<h3 style="font-size:1rem;margin-bottom:14px;">Customer Reviews</h3><div id="pmReviewList" style="margin-bottom:16px;"><span style="font-size:.84rem;color:var(--ink-soft);">Loading reviews...</span></div>' + reviewFormHtml();

    if (!db.isConnected()) {
      document.getElementById("pmReviewList").innerHTML = '<span style="font-size:.84rem;color:var(--ink-soft);">No reviews yet. Be the first!</span>';
      bindReviewForm(itemCode);
      return;
    }

    var SC = window.SITE_CONFIG || {};
    var sbClient = window.supabase && window.supabase.createClient(SC.SUPABASE_URL, SC.SUPABASE_ANON_KEY);
    if (!sbClient) { document.getElementById("pmReviewList").innerHTML = '<span style="font-size:.84rem;color:var(--ink-soft);">No reviews yet.</span>'; bindReviewForm(itemCode); return; }

    sbClient.from("product_reviews").select("reviewer_name,rating,comment,created_at").eq("item_code", itemCode).order("created_at", {ascending:false}).limit(20)
      .then(function(res) {
        var list = document.getElementById("pmReviewList");
        if (!list) return;
        if (res.error || !res.data || !res.data.length) {
          list.innerHTML = '<span style="font-size:.84rem;color:var(--ink-soft);">No reviews yet. Be the first!</span>';
        } else {
          list.innerHTML = res.data.map(function(r) {
            var stars = "";
            for (var i = 1; i <= 5; i++) stars += '<span style="color:' + (i <= r.rating ? "#C9A227" : "#D4C5B4") + ';">&#9733;</span>';
            return '<div class="review-card">' +
              '<div class="review-header"><strong>' + shared.escapeHtml(r.reviewer_name) + '</strong>' + stars + '</div>' +
              (r.comment ? '<p class="review-comment">' + shared.escapeHtml(r.comment) + '</p>' : '') +
              '<span class="review-date">' + new Date(r.created_at).toLocaleDateString("en-IN") + '</span>' +
            '</div>';
          }).join("");
        }
        bindReviewForm(itemCode, sbClient);
      }).catch(function() {
        var list = document.getElementById("pmReviewList");
        if (list) list.innerHTML = '<span style="font-size:.84rem;color:var(--ink-soft);">Reviews unavailable.</span>';
        bindReviewForm(itemCode, sbClient);
      });
  }

  function reviewFormHtml() {
    return '<div class="review-form-wrap">' +
      '<h4 style="font-size:.92rem;margin-bottom:10px;">Write a Review</h4>' +
      '<div class="field"><label>Your Name *</label><input id="rvName" placeholder="Your name"></div>' +
      '<div class="field"><label>Rating *</label><div class="star-rating-input" id="rvStars">' +
        [1,2,3,4,5].map(function(i){ return '<button type="button" class="star-btn" data-v="'+i+'">&#9733;</button>'; }).join("") +
      '</div><input type="hidden" id="rvRating" value="0"></div>' +
      '<div class="field"><label>Comment</label><textarea id="rvComment" placeholder="Share your experience..." style="min-height:60px;"></textarea></div>' +
      '<button type="button" class="btn btn-primary btn-sm" id="rvSubmit">Submit Review</button>' +
      '<div id="rvStatus" style="font-size:.8rem;margin-top:8px;"></div>' +
    '</div>';
  }

  function bindReviewForm(itemCode, sbClient) {
    var stars = document.getElementById("rvStars");
    if (!stars) return;
    stars.querySelectorAll(".star-btn").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var v = Number(btn.dataset.v);
        document.getElementById("rvRating").value = v;
        stars.querySelectorAll(".star-btn").forEach(function(b,i) {
          b.style.color = (i < v) ? "#C9A227" : "#D4C5B4";
        });
      });
    });
    var submitBtn = document.getElementById("rvSubmit");
    if (!submitBtn) return;
    submitBtn.addEventListener("click", function() {
      var name    = (document.getElementById("rvName")    || {}).value || "";
      var rating  = Number((document.getElementById("rvRating")  || {}).value || 0);
      var comment = (document.getElementById("rvComment") || {}).value || "";
      var status  = document.getElementById("rvStatus");
      name = name.trim(); comment = comment.trim();
      if (!name || !rating) { if (status) status.innerHTML = '<span style="color:var(--warn);">Please enter your name and select a rating.</span>'; return; }
      if (!sbClient) { if (status) status.innerHTML = '<span style="color:var(--warn);">Reviews require internet connection.</span>'; return; }
      submitBtn.disabled = true; submitBtn.textContent = "Submitting...";
      sbClient.from("product_reviews").insert({ item_code: itemCode, reviewer_name: name, rating: rating, comment: comment || null })
        .then(function(res) {
          if (res.error) { if (status) status.innerHTML = '<span style="color:var(--warn);">Failed: ' + res.error.message + '</span>'; submitBtn.disabled = false; submitBtn.textContent = "Submit Review"; return; }
          if (status) status.innerHTML = '<span style="color:var(--success);">\u2713 Review submitted! Thank you.</span>';
          submitBtn.textContent = "Submitted \u2713";
          setTimeout(function() { loadProductReviews(itemCode); }, 500);
        }).catch(function(e) {
          if (status) status.innerHTML = '<span style="color:var(--warn);">Error: ' + (e.message || e) + '</span>';
          submitBtn.disabled = false; submitBtn.textContent = "Submit Review";
        });
    });
  }

  function initProductModal() {
    var backdrop = document.getElementById("productModalBackdrop");
    var closeBtn = document.getElementById("productModalClose");
    if (!backdrop) return;
    if (closeBtn) closeBtn.addEventListener("click", function() { backdrop.classList.remove("show"); });
    backdrop.addEventListener("click", function(e) { if (e.target === backdrop) backdrop.classList.remove("show"); });
    document.addEventListener("keydown", function(e) { if (e.key === "Escape") backdrop.classList.remove("show"); });
  }
  function initReveal() {
    var els = document.querySelectorAll(".reveal");
    if (!window.IntersectionObserver) {
      els.forEach(function (el) { el.classList.add("in"); });
      return;
    }
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); obs.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    els.forEach(function (el) { obs.observe(el); });
  }

  // ------------------------------------------------------- SCROLL SPY NAV -
  function initScrollSpy() {
    var sectionIds = ["home","shop","services","courses","about","contact"];
    var sections   = sectionIds.map(function (id) { return document.getElementById(id); }).filter(Boolean);
    var navLinks   = document.querySelectorAll("nav.main-nav a[data-section]");
    if (!window.IntersectionObserver) return;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          navLinks.forEach(function (a) {
            a.classList.toggle("active", a.dataset.section === entry.target.id);
          });
        }
      });
    }, { rootMargin: "-40% 0px -55% 0px", threshold: 0 });
    sections.forEach(function (s) { observer.observe(s); });

    // smooth scroll for nav / cta [data-go]
    document.querySelectorAll("[data-go]").forEach(function (el) {
      if (el.id === "cartOpenBtn") return;
      el.addEventListener("click", function (e) {
        var target = document.getElementById(el.dataset.go);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: "smooth", block: "start" });
          history.replaceState(null, "", "#" + el.dataset.go);
        }
      });
    });

    // hash on load
    if (location.hash) {
      var hEl = document.getElementById(location.hash.replace("#", ""));
      if (hEl) setTimeout(function () { hEl.scrollIntoView({ behavior: "smooth", block: "start" }); }, 300);
    }
  }

  /* Pull live business_address / wa_number / instagram_url / youtube_url from
     Supabase settings and apply them to the Contact section, so an admin's
     Settings save is reflected on the public site without any manual edit. */
  function applyContactSettings() {
    if (!window.db || !db.getSettings) return;
    db.getSettings().then(function (s) {
      if (!s) return;

      // Address
      var addrEl = document.getElementById("contactAddress");
      if (addrEl && s.business_address) addrEl.textContent = s.business_address;

      // WhatsApp — format "91XXXXXXXXXX" as "+91 XXXXX XXXXX"
      if (s.wa_number) {
        var waUrl = "https://wa.me/" + s.wa_number;
        var waDisplay = s.wa_number;
        var m = /^91(\d{10})$/.exec(s.wa_number);
        if (m) waDisplay = "+91 " + m[1].slice(0, 5) + " " + m[1].slice(5);
        var waLink = document.getElementById("contactWaLink");
        if (waLink) { waLink.href = waUrl; waLink.textContent = waDisplay; }
        var waBtn = document.getElementById("contactWaBtn");
        if (waBtn) waBtn.href = waUrl;
      }

      // Instagram
      if (s.instagram_url) {
        var igLink = document.getElementById("contactIgLink");
        if (igLink) {
          igLink.href = s.instagram_url;
          var igHandle = (/instagram\.com\/([^/?]+)/.exec(s.instagram_url) || [])[1];
          igLink.textContent = igHandle ? "@" + igHandle : s.instagram_url;
        }
      }

      // YouTube
      if (s.youtube_url) {
        var ytLink = document.getElementById("contactYtLink");
        if (ytLink) {
          ytLink.href = s.youtube_url;
          var ytHandle = (/youtube\.com\/(@[^/?]+)/.exec(s.youtube_url) || [])[1];
          ytLink.textContent = ytHandle || s.youtube_url;
        }
      }
    }).catch(function () {});
  }

  async function init() {
    renderHeroVisual();
    initReveal();
    initScrollSpy();
    initContactForm();
    initBookingModal();
    initProductModal();
    applyContactSettings();   // keep Contact section in sync with admin Settings

    // getProducts() is now INSTANT — returns all 5111 from local data immediately
    // No network wait, no possibility of hanging or showing only 1000
    ALL = await db.getProducts();
    var params = new URLSearchParams(location.search);
    if (params.get("cat")) activeCat = params.get("cat");
    renderCatList();
    applyFilters();

    var searchBox = document.getElementById("searchBox");
    if (searchBox) {
      searchBox.addEventListener("input", function (e) { searchTerm = e.target.value; applyFilters(); });
    }

    // Load services/courses (parallel, doesn't block shop)
    renderServicesAndCourses();

    // BACKGROUND: load admin-defined categories from Supabase
    // If admin added/removed categories, the filter updates automatically
    if (db.isConnected()) {
      loadCategoriesFromDB();
    }

    // BACKGROUND: after shop renders, silently fetch Supabase admin-overrides
    // (photos + price edits). If Supabase responds in <4s, update those products.
    // If it times out, the local prices/names already shown are kept. No spinner needed.
    if (db.isConnected()) {
      db.getProductOverrides().then(function(overrides) {
        if (!overrides || !Object.keys(overrides).length) return;
        var updated = false;
        ALL = ALL.map(function(p) {
          var ov = overrides[p.id];
          if (!ov) return p;
          updated = true;
          return {
            id: p.id,
            name: ov.name || p.name,
            category: ov.category || p.category,
            price: Number(ov.price) || p.price,
            discount: Number(ov.discount) || 0,
            image: ov.image_url || null,
            active: ov.active !== undefined ? ov.active : true
          };
        }).filter(function(p){ return p.active !== false; }); // hide deactivated products
        if (updated) {
          renderCatList();
          applyFilters(); // silently re-render with updated photos/prices
        }
      }).catch(function(){ /* overrides unavailable — local data stays */ });
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
