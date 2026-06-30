
/* ============================================================================
   ADMIN.JS — Full admin panel with product image/price editing.
   Products, Services, Courses, Orders, Settings — all stored in Supabase.
   After any save, the live website reads from Supabase and shows the change.
   ========================================================================= */
(function () {
  var allProducts = [];
  var allServices = [];
  var allCourses  = [];
  var SB = null;   // raw Supabase client (available once admin is gated)

  /* ---------------------------------------------------------------- GATE -- */
  async function gate() {
    // Fast synchronous session check (no network — instant redirect if not logged in)
    var hasSession = false;
    try {
      for (var k in localStorage) {
        if (k.indexOf("sb-") === 0 && k.indexOf("-auth-token") > -1) {
          var raw = localStorage.getItem(k);
          if (raw) {
            var s = JSON.parse(raw);
            var tok = s.access_token || (s.session && s.session.access_token);
            if (tok) { hasSession = true; break; }
          }
        }
      }
    } catch(e) {}

    if (!hasSession) { window.location.replace("login.html"); return false; }

    // Async admin verification
    try {
      var session = await db.getSession();
      if (!session) { window.location.replace("login.html"); return false; }
      var isAdmin = await db.isCurrentUserAdmin();
      if (!isAdmin) {
        document.getElementById("adminGate").innerHTML =
          '<div class="alert alert-error" style="max-width:480px;margin:0 auto;margin-top:60px;">' +
          'This Google/email account does not have admin access. ' +
          '<a href="login.html">Sign in with the admin account</a></div>';
        return false;
      }
      // Show admin panel + user info bar
      document.getElementById("adminGate").style.display = "none";
      document.getElementById("adminApp").style.display  = "block";
      // Show signed-in email
      var bar = document.getElementById("adminUserBar");
      if (bar && session.user) {
        bar.innerHTML = 'Signed in as <b>' + shared.escapeHtml(session.user.email||"Admin") + '</b>' +
          ' &nbsp;|&nbsp; <a href="index.html" style="color:#C9A227;">View Site</a>' +
          ' &nbsp;|&nbsp; <a href="#" id="adminSignOutBtn" style="color:#ef4444;">Sign Out</a>';
        var soBtn = document.getElementById("adminSignOutBtn");
        if (soBtn) soBtn.addEventListener("click", function(e) {
          e.preventDefault();
          db.signOut().then(function(){ window.location.replace("login.html"); })
                      .catch(function()   { window.location.replace("login.html"); });
        });
      }
      return true;
    } catch(e) {
      // Network error — show retry option instead of redirect loop
      document.getElementById("adminGate").innerHTML =
        '<div class="alert alert-warn" style="max-width:480px;margin:60px auto;">' +
        'Connection error. <a href="javascript:location.reload()">Reload</a> or ' +
        '<a href="login.html">sign in again</a>.</div>';
      return false;
    }
  }

  /* --------------------------------------------------------------- TABS --- */
  function initTabs() {
    document.querySelectorAll(".tab-link").forEach(function (link) {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        var tab = link.dataset.tab;
        document.querySelectorAll(".tab-link").forEach(function (l) { l.classList.remove("active"); });
        link.classList.add("active");
        document.querySelectorAll(".admin-tab").forEach(function (s) { s.style.display = "none"; });
        var el = document.getElementById("tab-" + tab);
        if (el) el.style.display = "block";
      });
    });
    document.getElementById("logoutBtn").addEventListener("click", async function (e) {
      e.preventDefault();
      await db.signOut();
      window.location.href = "login.html";
    });
  }

  /* -------------------------------------------------------------- MODAL --- */
  function openModal(html, wide) {
    var body    = document.getElementById("modalBody");
    var backdrop = document.getElementById("modalBackdrop");
    body.innerHTML = html;
    body.style.maxWidth = wide ? "640px" : "520px";
    backdrop.classList.add("show");
  }
  function closeModal() {
    document.getElementById("modalBackdrop").classList.remove("show");
    document.getElementById("modalBody").innerHTML = "";
  }
  document.addEventListener("click", function (e) {
    if (e.target && e.target.id === "modalBackdrop") closeModal();
  });

  /* ----------------------------------------------------------- ORDERS ---- */
  /* DESIGN:
     - Supabase Realtime subscription: new/updated orders appear in < 1 second
     - Active tab: pending + confirmed (50 per page)
     - History tab: delivered orders (50 per page)
     - Pagination: ← Prev | Page N of M | Next → on both tabs
     - Orders NEVER deleted — permanent lifetime storage                      */

  var ordersCache   = [];
  var ordersChannel = null;   // Realtime channel handle
  var activePage    = 1;
  var historyPage   = 1;
  var PAGE_SIZE     = 50;

  /* ── Realtime: subscribe to order changes, reload within 1 second ─────── */
  function subscribeOrderRealtime() {
    if (!SB || ordersChannel) return;
    try {
      ordersChannel = SB.channel('admin-orders-live')
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'orders'
        }, function (payload) {
          // New or updated order received — refresh both tabs
          shared.toast('\uD83D\uDD14 Orders updated!');
          loadOrders();
        })
        .subscribe(function (status) {
          var ind = document.getElementById('ordersRealtimeIndicator');
          if (!ind) return;
          if (status === 'SUBSCRIBED') {
            ind.innerHTML = '<span style="color:#22c55e;">\u25cf LIVE</span>';
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            ind.innerHTML = '<span style="color:#f97316;">\u25cf Reconnecting\u2026</span>';
            // Retry
            setTimeout(function () {
              if (ordersChannel) { SB.removeChannel(ordersChannel); ordersChannel = null; }
              subscribeOrderRealtime();
            }, 5000);
          }
        });
    } catch (e) {
      console.warn('Realtime subscription failed:', e);
    }
  }

  /* ── Pagination wrapper ─────────────────────────────────────────────────── */
  function renderPagedOrders(orders, wrap, isHistory, page, onPageChange) {
    var total = orders.length;
    var pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    page = Math.max(1, Math.min(page, pages));
    var slice = orders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    renderOrderRows(slice, wrap, isHistory);

    if (total <= PAGE_SIZE) return; // no pagination needed

    var pager = document.createElement('div');
    pager.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:12px;' +
      'padding:14px 0;margin-top:8px;border-top:1px solid var(--cream-deep);font-size:.85rem;';
    pager.innerHTML =
      '<button class="pg-prev" style="padding:7px 18px;border:1px solid var(--rose-gold-l);' +
        'border-radius:6px;cursor:pointer;background:var(--cream-deep);font-weight:600;"' +
        (page <= 1 ? ' disabled' : '') + '>&larr; Prev</button>' +
      '<span style="color:var(--ink-soft);">Page <b>' + page + '</b> of <b>' + pages + '</b>' +
        ' <span style="font-size:.78rem;">(' + total + ' orders)</span></span>' +
      '<button class="pg-next" style="padding:7px 18px;border:1px solid var(--rose-gold-l);' +
        'border-radius:6px;cursor:pointer;background:var(--cream-deep);font-weight:600;"' +
        (page >= pages ? ' disabled' : '') + '>Next &rarr;</button>';

    wrap.appendChild(pager);

    if (onPageChange) {
      pager.querySelector('.pg-prev').addEventListener('click', function () {
        if (page > 1) onPageChange(page - 1);
      });
      pager.querySelector('.pg-next').addEventListener('click', function () {
        if (page < pages) onPageChange(page + 1);
      });
    }
  }

  /* ── Render order rows ──────────────────────────────────────────────────── */
  function renderOrderRows(orders, wrap, isHistory) {
    if (!orders.length) {
      wrap.innerHTML = '<div class="empty-state" style="padding:30px;text-align:center;">' +
        '<p style="color:var(--ink-soft);">' +
        (isHistory ? 'No delivered orders yet.' : 'No active orders. New orders appear here instantly.') +
        '</p></div>';
      return;
    }

    var sett    = window._adminSettings || {};
    var BIZ     = sett.business_name || "Srivalli\u2019s The Beauty Shop Cosmetics";
    var SC      = { pending: '#E65100', confirmed: '#1A6B3C', delivered: '#0D5C4B', rejected: '#C62828' };
    var rowsHtml = '';

    orders.forEach(function (o) {
      var status = o.status || 'pending';
      if (['pending_verification', 'payment_requested', 'payment_received'].indexOf(status) > -1) status = 'pending';

      var phone = (o.customer_phone || '').replace(/\D/g, '');
      if (phone.length === 10) phone = '91' + phone;

      var items = (o.items || []).map(function (i) {
        return shared.escapeHtml(String(i.name || '').replace(/^[^a-zA-Z]+/, '')) + ' \xd7' + i.qty;
      }).join('<br>');

      var statusOpts = (isHistory ? ['delivered'] : ['pending', 'confirmed', 'delivered', 'rejected'])
        .map(function (s) {
          return '<option value="' + s + '"' + (status === s ? ' selected' : '') + '>' +
            s.charAt(0).toUpperCase() + s.slice(1) + '</option>';
        }).join('');

      var sc    = SC[status] || '#888';
      var badge = '<span style="background:' + sc + ';color:#fff;font-size:.65rem;font-weight:700;' +
        'padding:2px 8px;border-radius:999px;text-transform:uppercase;">' + status + '</span>';

      var confMsg  = encodeURIComponent(
        'Hello ' + o.customer_name + '! \uD83C\uDF38\n\n\uD83C\uDF89 Your Order *#' + o.order_number +
        '* is *CONFIRMED* \u2705\n\n' +
        (o.items || []).map(function (i) { return '\u2022 ' + i.name + ' \xd7' + i.qty; }).join('\n') +
        '\n\n*Total: \u20b9' + o.total + '*\n\uD83D\uDE9A Delivery within *10 days*.\n\nThank you! \uD83D\uDC84\u2728\n\u2014 ' + BIZ
      );
      var thankMsg = encodeURIComponent(
        'Hello ' + o.customer_name + '! \uD83C\uDF38\n\nThank you for shopping at *' + BIZ + '*!\n' +
        'Order *#' + o.order_number + '* delivered! \u2705\n\nHope you love it! \uD83D\uDC84\u2728\n\u2014 ' + BIZ
      );

      rowsHtml +=
        '<tr>' +
          '<td style="min-width:150px;">' +
            '<b style="font-size:.82rem;">' + shared.escapeHtml(o.order_number || '') + '</b><br>' +
            '<span style="font-size:.68rem;color:var(--ink-soft);">' +
              new Date(o.created_at).toLocaleString('en-IN', {
                dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Kolkata'
              }) +
            '</span><br>' + badge +
            '<div style="display:flex;flex-direction:column;gap:4px;margin-top:6px;">' +
              (!isHistory
                ? '<a href="https://wa.me/' + phone + '?text=' + confMsg + '" target="_blank" rel="noopener" ' +
                  'style="background:#1A6B3C;color:#fff;border-radius:6px;padding:4px 8px;font-size:.7rem;font-weight:700;text-decoration:none;text-align:center;">\uD83D\uDCE9 Confirm</a>'
                : '') +
              '<a href="https://wa.me/' + phone + '?text=' + thankMsg + '" target="_blank" rel="noopener" ' +
                'style="background:#25D366;color:#fff;border-radius:6px;padding:4px 8px;font-size:.7rem;font-weight:700;text-decoration:none;text-align:center;">\uD83D\uDCAC Thank</a>' +
              '<button class="print-order-btn" data-oid="' + o.id + '" ' +
                'style="background:var(--cream-deep);border:1px solid var(--rose-gold-l);border-radius:4px;cursor:pointer;padding:3px 8px;font-size:.7rem;">\uD83D\uDDA8\uFE0F Print</button>' +
            '</div>' +
          '</td>' +
          '<td style="min-width:120px;"><b>' + shared.escapeHtml(o.customer_name || '') + '</b><br>' +
            shared.escapeHtml(o.customer_phone || '') + '</td>' +
          '<td style="max-width:180px;font-size:.76rem;">' + shared.escapeHtml(o.to_address || '') + '</td>' +
          '<td style="font-size:.76rem;">' + items + '</td>' +
          '<td style="font-weight:700;">\u20b9' + Number(o.total || 0).toFixed(0) + '</td>' +
          '<td>' +
            (isHistory
              ? '<span style="color:#0D5C4B;font-weight:700;">\u2705 Delivered</span>'
              : '<select class="status-select" data-id="' + o.id + '">' + statusOpts + '</select>' +
                '<div class="smsg-' + o.id + '" style="font-size:.7rem;min-height:14px;"></div>') +
          '</td>' +
        '</tr>';
    });

    wrap.innerHTML =
      '<div style="overflow-x:auto;">' +
      '<table class="admin-table"><thead><tr>' +
      '<th>Order</th><th>Customer</th><th>Deliver To</th><th>Items</th><th>Total</th><th>Status</th>' +
      '</tr></thead><tbody>' + rowsHtml + '</tbody></table></div>';

    /* Status change */
    wrap.querySelectorAll('.status-select').forEach(function (sel) {
      sel.addEventListener('change', async function () {
        sel.disabled = true;
        var msg = wrap.querySelector('.smsg-' + sel.dataset.id);
        if (msg) msg.innerHTML = '<span style="color:var(--ink-soft);">Saving\u2026</span>';
        try {
          var res = await SB.from('orders').update({
            status: sel.value, updated_at: new Date().toISOString()
          }).eq('id', sel.dataset.id);
          if (res.error) throw res.error;
          shared.toast('Status \u2192 ' + sel.value + (sel.value === 'delivered' ? ' \u2014 moved to History!' : ''));
          // Realtime will trigger loadOrders automatically, but also refresh manually
          loadOrders();
        } catch (e) {
          if (msg) msg.innerHTML = '<span style="color:var(--warn);">\u26a0 Failed</span>';
          shared.toast('Error: ' + (e.message || e));
          sel.disabled = false;
        }
      });
    });

    /* Print */
    wrap.querySelectorAll('.print-order-btn').forEach(function (btn) {
      var order = ordersCache.find(function (o) { return o.id === btn.dataset.oid; });
      if (order) btn.addEventListener('click', function () { printOrder(order); });
    });
  }

  /* ── Main load function ─────────────────────────────────────────────────── */
  async function loadOrders() {
    var wrap = document.getElementById('ordersTableWrap');
    if (!wrap) return;

    // Show loading only on first load (not on realtime refresh)
    if (!ordersCache.length) {
      wrap.innerHTML = '<p style="color:var(--ink-soft);padding:20px;">' +
        'Loading orders\u2026 <span id="ordersRealtimeIndicator"></span></p>';
    }

    try {
      var orders = await db.adminListOrders();
      ordersCache = orders || [];

      // Pre-fetch settings once
      if (!window._adminSettings) {
        window._adminSettings = await db.getSettings().catch(function () { return {}; });
      }

      var active    = ordersCache.filter(function (o) { return o.status !== 'delivered'; });
      var delivered = ordersCache.filter(function (o) { return o.status === 'delivered'; });

      wrap.innerHTML =
        /* Toolbar: live indicator + refresh button */
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px;">' +
          '<div style="display:flex;align-items:center;gap:10px;">' +
            '<span id="ordersRealtimeIndicator" style="font-size:.78rem;font-weight:700;"></span>' +
            '<span style="font-size:.78rem;color:var(--ink-soft);">Auto-updates in real time</span>' +
          '</div>' +
          '<button id="refreshOrdersBtn" style="background:var(--cream-deep);border:1px solid var(--rose-gold-l);' +
            'border-radius:6px;padding:6px 14px;cursor:pointer;font-size:.78rem;font-weight:600;">' +
            '\u21BB Refresh</button>' +
        '</div>' +

        /* Sub-tabs */
        '<div style="display:flex;gap:0;border-bottom:2px solid var(--cream-deep);margin-bottom:16px;">' +
          '<button id="oTabActive" style="padding:10px 20px;border:none;cursor:pointer;font-weight:700;font-size:.88rem;' +
            'background:var(--berry);color:#fff;border-radius:var(--radius-sm) 0 0 0;">' +
            '\uD83D\uDCCB Active (' + active.length + ')</button>' +
          '<button id="oTabHistory" style="padding:10px 20px;border:none;cursor:pointer;font-weight:700;font-size:.88rem;' +
            'background:var(--cream-deep);color:var(--ink);border-radius:0 var(--radius-sm) 0 0;">' +
            '\uD83D\uDDC2\uFE0F History (' + delivered.length + ')</button>' +
        '</div>' +
        '<div id="oActive"></div>' +
        '<div id="oHistory" style="display:none;"></div>';

      // Render active orders with pagination
      function renderActive(pg) {
        activePage = pg;
        renderPagedOrders(active, document.getElementById('oActive'), false, activePage,
          function (p) { renderActive(p); });
      }
      // Render history with pagination
      function renderHistory(pg) {
        historyPage = pg;
        renderPagedOrders(delivered, document.getElementById('oHistory'), true, historyPage,
          function (p) { renderHistory(p); });
      }

      renderActive(activePage);
      renderHistory(historyPage);

      // Update live indicator after rendering
      subscribeOrderRealtime();
      var ind = document.getElementById('ordersRealtimeIndicator');
      if (ind && ordersChannel) ind.innerHTML = '<span style="color:#22c55e;">\u25cf LIVE</span>';

      // Sub-tab switching
      document.getElementById('oTabActive').addEventListener('click', function () {
        document.getElementById('oActive').style.display  = '';
        document.getElementById('oHistory').style.display = 'none';
        this.style.background = 'var(--berry)'; this.style.color = '#fff';
        document.getElementById('oTabHistory').style.background = 'var(--cream-deep)';
        document.getElementById('oTabHistory').style.color      = 'var(--ink)';
      });
      document.getElementById('oTabHistory').addEventListener('click', function () {
        document.getElementById('oHistory').style.display = '';
        document.getElementById('oActive').style.display  = 'none';
        this.style.background = 'var(--berry)'; this.style.color = '#fff';
        document.getElementById('oTabActive').style.background = 'var(--cream-deep)';
        document.getElementById('oTabActive').style.color      = 'var(--ink)';
      });

      // Manual refresh
      document.getElementById('refreshOrdersBtn').addEventListener('click', function () {
        ordersCache = [];  // force reload animation
        loadOrders();
      });

    } catch (e) {
      wrap.innerHTML =
        '<div class="alert alert-error" style="margin:20px 0;">Could not load orders: ' +
        shared.escapeHtml(e.message || String(e)) +
        '<br><button onclick="loadOrders()" class="btn btn-sm" style="margin-top:8px;">Retry</button></div>';
    }
  }

  /* ---------------------------------------------------------- PRODUCTS --- */
  async function loadProducts(filterTerm) {
    try {
      var res = await SB.from("products").select("id,item_code,name,category,price,other_charges,discount,image_url,active").order("name");
      allProducts = (res.data || []);
    } catch (e) {
      shared.toast("Could not load products from Supabase. Have you run schema.sql + seed-products.sql yet?");
      allProducts = [];
    }

    var term = (filterTerm || "").toLowerCase();
    var list = allProducts.filter(function (p) {
      return !term || p.name.toLowerCase().indexOf(term) !== -1;
    });

    var wrap = document.getElementById("productsTableWrap");
    if (!list.length) {
      wrap.innerHTML = '<div class="alert alert-warn" style="margin-top:10px;">' +
        (allProducts.length === 0
          ? '<b>No products found in Supabase.</b> You need to run <code>seed-products.sql</code> in the Supabase SQL Editor first. ' +
            'Go to <a href="https://supabase.com/dashboard/project/edwlwrpjilipvdlpjtxr/sql" target="_blank" rel="noopener">SQL Editor</a>, paste the file contents, and click Run.'
          : 'No products match your search.') +
        '</div>';
      return;
    }

    var rows = list.slice(0, 300).map(function (p) {
      var thumb = p.image_url
        ? '<img src="' + shared.escapeHtml(p.image_url) + '" style="width:44px;height:44px;border-radius:8px;object-fit:cover;border:2px solid var(--cream-deep);">'
        : '<div style="width:44px;height:44px;border-radius:8px;background:var(--cream-deep);display:flex;align-items:center;justify-content:center;font-size:1.2rem;">\ud83d\udcf7</div>';
      return '<tr>' +
        '<td>' + thumb + '</td>' +
        '<td style="font-weight:600;max-width:220px;">' + shared.escapeHtml(p.name) +
          (p.discount > 0 ? ' <span style="background:var(--berry);color:#fff;font-size:.65rem;padding:1px 5px;border-radius:999px;font-weight:700;">' + Math.round(p.discount) + '% OFF</span>' : '') +
        '</td>' +
        '<td>' + shared.escapeHtml(p.category) + '</td>' +
        '<td style="color:var(--berry-dark);font-weight:700;">' + shared.fmtPrice(p.price) +
          (p.discount > 0 ? '<br><span style="font-size:.7rem;color:var(--success);">\u20b9' + (Math.round(p.price*(1-p.discount/100)*100)/100).toFixed(2) + ' final</span>' : '') +
        '</td>' +
        '<td><button class="btn btn-sm btn-primary edit-product-btn" data-id="' + p.id + '">\u270f\ufe0f Edit</button></td>' +
        '</tr>';
    }).join("");

    var note = list.length > 300
      ? '<p class="helper" style="margin-top:10px;">Showing first 300 of ' + list.length + ' results. Use search to narrow down.</p>'
      : "";
    wrap.innerHTML = '<div style="overflow-x:auto;"><table class="admin-table">' +
      '<thead><tr><th>Photo</th><th>Product Name</th><th>Category</th><th>Price</th><th>Action</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>' + note;

    wrap.querySelectorAll(".edit-product-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var p = allProducts.find ? allProducts.find(function (x) { return x.id === btn.dataset.id; })
          : (function () { for (var i = 0; i < allProducts.length; i++) { if (allProducts[i].id === btn.dataset.id) return allProducts[i]; } })();
        if (p) openProductModal(p);
      });
    });
  }

  /* ---------- Product Edit Modal (image + price + name) ----------------- */
  function openProductModal(p) {
    var currentImage = p.image_url || "";
    var hasImage = currentImage.length > 0;
    var imgPreviewHtml = hasImage
      ? '<img id="mImgPreview" src="' + shared.escapeHtml(currentImage) + '" style="width:100%;height:100%;object-fit:cover;border-radius:10px;" alt="Product photo">'
      : '<div id="mImgPreview" style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--ink-soft);"><span style="font-size:2.5rem;">\ud83d\udcf7</span><span style="font-size:.8rem;margin-top:6px;">No photo yet</span></div>';

    openModal('<div style="display:grid;grid-template-columns:200px 1fr;gap:20px;align-items:start;">' +
      /* LEFT column — image */
      '<div>' +
        '<div id="mImgWrap" style="width:200px;height:200px;border-radius:12px;border:2px dashed var(--rose-gold-l);background:var(--cream-deep);overflow:hidden;cursor:pointer;position:relative;" title="Click to change photo">' +
          imgPreviewHtml +
          '<div style="position:absolute;bottom:0;left:0;right:0;background:rgba(44,23,34,.65);color:#fff;font-size:.72rem;font-weight:600;padding:6px;text-align:center;">Click to change photo</div>' +
        '</div>' +
        '<input type="file" id="mPhotoInput" accept="image/*" style="display:none;">' +
        '<div id="mPhotoStatus" style="font-size:.75rem;color:var(--success);margin-top:6px;min-height:16px;"></div>' +
      '</div>' +
      /* RIGHT column — fields */
      '<div>' +
        '<h3 style="margin-bottom:16px;">Edit Product</h3>' +
        '<div class="field">' +
          '<label for="mName" style="font-weight:700;">Product Name</label>' +
          '<input id="mName" value="' + shared.escapeHtml(p.name) + '" style="font-size:15px;">' +
        '</div>' +
        '<div class="field">' +
          '<label for="mPrice" style="font-weight:700;">Price (&#8377;)</label>' +
          '<input id="mPrice" type="number" step="0.01" min="0" value="' + p.price + '" style="font-size:20px;font-weight:700;color:var(--berry-dark);">' +
        '</div>' +
        '<div class="field">' +
          '<label for="mOther">Other / Delivery Charges (&#8377;)</label>' +
          '<input id="mOther" type="number" step="0.01" min="0" value="' + (p.other_charges || 0) + '">' +
        '</div>' +
        '<div class="field">' +
          '<label for="mDiscount">Discount (%) &mdash; 0 = no discount</label>' +
          '<input id="mDiscount" type="number" step="1" min="0" max="99" value="' + (p.discount || 0) + '" placeholder="e.g. 20 for 20% off">' +
          '<div id="mDiscountPreview" style="font-size:.82rem;min-height:20px;margin-top:4px;"></div>' +
        '</div>' +
        '<div class="field">' +
          '<label for="mCategory">Category</label>' +
          '<input id="mCategory" value="' + shared.escapeHtml(p.category) + '">' +
        '</div>' +
        '<div id="mSaveStatus" style="min-height:18px;font-size:.8rem;"></div>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;">' +
          '<button class="btn btn-primary" id="mSaveBtn" style="flex:1;">&#128190; Save to Website</button>' +
          '<button class="btn btn-outline" id="mCancelBtn">Cancel</button>' +
        '</div>' +
      '</div>' +
    '</div>', true);

    /* Wire up image click-to-upload */
    var wrap = document.getElementById("mImgWrap");
    var fileInput = document.getElementById("mPhotoInput");
    wrap.addEventListener("click", function () { fileInput.click(); });
    fileInput.addEventListener("change", function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (e) {
        document.getElementById("mImgWrap").innerHTML =
          '<img src="' + e.target.result + '" style="width:100%;height:100%;object-fit:cover;border-radius:10px;" alt="New photo preview">' +
          '<div style="position:absolute;bottom:0;left:0;right:0;background:rgba(44,23,34,.65);color:#fff;font-size:.72rem;font-weight:600;padding:6px;text-align:center;">\u2713 New photo selected</div>';
        document.getElementById("mPhotoStatus").textContent = "\u2713 " + file.name + " selected";
      };
      reader.readAsDataURL(file);
    });

    document.getElementById("mCancelBtn").addEventListener("click", closeModal);

    /* Live discount preview — shows ~~original~~ discounted price as admin types */
    function updateDiscountPreview() {
      var price    = parseFloat((document.getElementById("mPrice")    ||{}).value) || 0;
      var discount = parseFloat((document.getElementById("mDiscount") ||{}).value) || 0;
      var prev     = document.getElementById("mDiscountPreview");
      if (!prev) return;
      if (discount > 0 && price > 0) {
        var finalPrice = Math.round(price * (1 - discount/100) * 100) / 100;
        prev.innerHTML =
          '<s style="color:var(--ink-soft);">\u20b9' + price.toFixed(2) + '</s> ' +
          '<b style="color:var(--success);">\u20b9' + finalPrice.toFixed(2) + '</b> ' +
          '<span style="background:var(--berry);color:#fff;font-size:.7rem;padding:2px 6px;border-radius:999px;">' +
          Math.round(discount) + '% OFF</span>';
      } else {
        prev.innerHTML = '<span style="color:var(--ink-soft);">No discount</span>';
      }
    }
    updateDiscountPreview(); // run immediately on modal open
    var _priceInp    = document.getElementById("mPrice");
    var _discountInp = document.getElementById("mDiscount");
    if (_priceInp)    _priceInp.addEventListener("input",    updateDiscountPreview);
    if (_discountInp) _discountInp.addEventListener("input", updateDiscountPreview);

    document.getElementById("mSaveBtn").addEventListener("click", async function () {
      var saveBtn    = document.getElementById("mSaveBtn");
      var saveStatus = document.getElementById("mSaveStatus");
      var name     = (document.getElementById("mName")     || {}).value || "";
      var price    = (document.getElementById("mPrice")    || {}).value;
      var other    = (document.getElementById("mOther")    || {}).value;
      var discount = (document.getElementById("mDiscount") || {}).value;  // ✅ FIX: read discount
      var category = (document.getElementById("mCategory") || {}).value || "";
      name = name.trim(); category = category.trim();
      var discountNum = Math.min(99, Math.max(0, parseFloat(discount) || 0)); // clamp 0-99
      if (!name) { saveStatus.innerHTML = '<span style="color:var(--warn);">Product name is required.</span>'; return; }

      saveBtn.disabled    = true;
      saveBtn.textContent = "\u23f3 Saving\u2026";
      saveStatus.innerHTML = "";

      var newImageUrl = p.image_url || null;
      var file = fileInput.files && fileInput.files[0];
      if (file) {
        try {
          saveStatus.innerHTML = '<span style="color:var(--ink-soft);">Uploading photo\u2026</span>';
          var uploadedUrl = await db.adminUploadImage(file, "products");
          if (uploadedUrl) newImageUrl = uploadedUrl;
        } catch (e) {
          saveStatus.innerHTML = '<span style="color:var(--warn);">\u26a0\ufe0f Photo upload failed — saving without new photo. (' + (e.message || e) + ')</span>';
        }
      }

      try {
        await SB.from("products").update({
          name:          name,
          category:      category,
          price:         parseFloat(price) || 0,
          other_charges: parseFloat(other) || 0,
          discount:      discountNum,          // ✅ FIX: save discount to Supabase
          image_url:     newImageUrl,
          updated_at:    new Date().toISOString()
        }).eq("id", p.id);

        // Update local cache so the table refreshes without a full reload
        var idx = allProducts.findIndex ? allProducts.findIndex(function (x) { return x.id === p.id; })
          : (function () { for (var i = 0; i < allProducts.length; i++) { if (allProducts[i].id === p.id) return i; } return -1; })();
        if (idx !== -1) {
          allProducts[idx].name         = name;
          allProducts[idx].category     = category;
          allProducts[idx].price        = parseFloat(price) || 0;
          allProducts[idx].other_charges = parseFloat(other) || 0;
          allProducts[idx].discount     = discountNum;    // ✅ FIX: update cache
          allProducts[idx].image_url    = newImageUrl;
        }

        saveStatus.innerHTML = '<span style="color:var(--success);font-weight:600;">\u2713 Saved! The website now shows this change.</span>';
        saveBtn.textContent  = "\u2713 Saved";
        shared.toast(name + " updated on website \u2713");
        // Refresh the table behind the modal after short delay
        setTimeout(function () { loadProducts(document.getElementById("adminProductSearch") && document.getElementById("adminProductSearch").value || ""); }, 800);
      } catch (e) {
        saveStatus.innerHTML = '<span style="color:var(--warn);">\u26a0\ufe0f Save failed: ' + shared.escapeHtml(e.message || String(e)) + '</span>';
        saveBtn.disabled    = false;
        saveBtn.textContent = "\ud83d\udcbe Save to Website";
      }
    });
  }

  /* ---------------------------------------------------------- SERVICES --- */
  async function loadServices() {
    var res = await SB.from("services").select("*").order("sort_order");
    allServices = res.data || [];
    var wrap = document.getElementById("servicesTableWrap");
    wrap.innerHTML = '<table class="admin-table"><thead><tr><th>Photo</th><th>Name</th><th>Description</th><th></th></tr></thead><tbody>' +
      allServices.map(function (s) {
        var thumb = s.image_url
          ? '<img src="' + shared.escapeHtml(s.image_url) + '" style="width:40px;height:40px;border-radius:6px;object-fit:cover;">'
          : '\u2014';
        return '<tr>' +
          '<td>' + thumb + '</td>' +
          '<td><b>' + shared.escapeHtml(s.name) + '</b></td>' +
          '<td style="max-width:280px;font-size:.82rem;">' + shared.escapeHtml(s.description || "") + '</td>' +
          '<td><button class="btn btn-sm btn-outline edit-service-btn" data-id="' + s.id + '">\u270f\ufe0f Edit</button></td>' +
          '</tr>';
      }).join("") + '</tbody></table>';
    wrap.querySelectorAll(".edit-service-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var svc = allServices.find ? allServices.find(function (x) { return x.id === btn.dataset.id; })
          : (function () { for (var i = 0; i < allServices.length; i++) { if (allServices[i].id === btn.dataset.id) return allServices[i]; } })();
        if (svc) openServiceModal(svc);
      });
    });
  }

  function openServiceModal(s) {
    s = s || { name: "", description: "", image_url: "", sort_order: 0 };
    openModal(
      '<h3 style="margin-bottom:16px;">' + (s.id ? "Edit" : "Add") + ' Service</h3>' +
      '<div class="field"><label>Name</label><input id="sName" value="' + shared.escapeHtml(s.name) + '"></div>' +
      '<div class="field"><label>Wording / Description</label><textarea id="sDesc" style="min-height:80px;">' + shared.escapeHtml(s.description || "") + '</textarea></div>' +
      (s.image_url ? '<img src="' + shared.escapeHtml(s.image_url) + '" style="width:80px;height:80px;border-radius:8px;object-fit:cover;margin-bottom:10px;">' : "") +
      '<div class="field"><label>Photo</label><input id="sPhoto" type="file" accept="image/*"></div>' +
      '<div id="sSaveStatus" style="min-height:16px;font-size:.8rem;"></div>' +
      '<div style="display:flex;gap:10px;margin-top:12px;">' +
        '<button class="btn btn-primary" id="sSaveBtn">Save to Website</button>' +
        '<button class="btn btn-outline" id="sCancelBtn">Cancel</button>' +
      '</div>');
    document.getElementById("sCancelBtn").addEventListener("click", closeModal);
    document.getElementById("sSaveBtn").addEventListener("click", async function () {
      var btn = document.getElementById("sSaveBtn");
      btn.disabled = true; btn.textContent = "Saving\u2026";
      var imageUrl = s.image_url || null;
      var file = (document.getElementById("sPhoto").files || [])[0];
      if (file) imageUrl = await db.adminUploadImage(file, "services") || imageUrl;
      var row = {
        name:        (document.getElementById("sName").value || "").trim(),
        description: (document.getElementById("sDesc").value || "").trim(),
        image_url:   imageUrl,
        sort_order:  s.sort_order || 0,
        active:      true
      };
      if (s.id) row.id = s.id;
      await db.adminUpsertService(row);
      closeModal();
      shared.toast("Service saved \u2713");
      loadServices();
    });
  }

  /* ----------------------------------------------------------- COURSES --- */
  async function loadCourses() {
    var res = await SB.from("courses").select("*").order("sort_order");
    allCourses = res.data || [];
    var wrap = document.getElementById("coursesTableWrap");
    wrap.innerHTML = '<table class="admin-table"><thead><tr><th>Photo</th><th>Name</th><th>Level</th><th>Description</th><th></th></tr></thead><tbody>' +
      allCourses.map(function (c) {
        var thumb = c.image_url ? '<img src="' + shared.escapeHtml(c.image_url) + '" style="width:40px;height:40px;border-radius:6px;object-fit:cover;">' : "\u2014";
        return '<tr>' +
          '<td>' + thumb + '</td>' +
          '<td><b>' + shared.escapeHtml(c.name) + '</b></td>' +
          '<td>' + shared.escapeHtml(c.level) + '</td>' +
          '<td style="max-width:240px;font-size:.82rem;">' + shared.escapeHtml(c.description || "") + '</td>' +
          '<td><button class="btn btn-sm btn-outline edit-course-btn" data-id="' + c.id + '">\u270f\ufe0f Edit</button></td>' +
          '</tr>';
      }).join("") + '</tbody></table>';
    wrap.querySelectorAll(".edit-course-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var crs = allCourses.find ? allCourses.find(function (x) { return x.id === btn.dataset.id; })
          : (function () { for (var i = 0; i < allCourses.length; i++) { if (allCourses[i].id === btn.dataset.id) return allCourses[i]; } })();
        if (crs) openCourseModal(crs);
      });
    });
  }

  function openCourseModal(c) {
    c = c || { name: "", level: "basic", description: "", image_url: "", sort_order: 0 };
    openModal(
      '<h3 style="margin-bottom:16px;">' + (c.id ? "Edit" : "Add") + ' Course</h3>' +
      '<div class="field"><label>Name</label><input id="cName" value="' + shared.escapeHtml(c.name) + '"></div>' +
      '<div class="field"><label>Level</label>' +
        '<select id="cLevel"><option value="basic" ' + (c.level === "basic" ? "selected" : "") + '>Basic</option>' +
        '<option value="advanced" ' + (c.level === "advanced" ? "selected" : "") + '>Advanced</option></select></div>' +
      '<div class="field"><label>Wording / Description</label><textarea id="cDesc" style="min-height:80px;">' + shared.escapeHtml(c.description || "") + '</textarea></div>' +
      (c.image_url ? '<img src="' + shared.escapeHtml(c.image_url) + '" style="width:80px;height:80px;border-radius:8px;object-fit:cover;margin-bottom:10px;">' : "") +
      '<div class="field"><label>Photo</label><input id="cPhoto" type="file" accept="image/*"></div>' +
      '<div style="display:flex;gap:10px;margin-top:12px;">' +
        '<button class="btn btn-primary" id="cSaveBtn">Save to Website</button>' +
        '<button class="btn btn-outline" id="cCancelBtn">Cancel</button>' +
      '</div>');
    document.getElementById("cCancelBtn").addEventListener("click", closeModal);
    document.getElementById("cSaveBtn").addEventListener("click", async function () {
      var btn = document.getElementById("cSaveBtn");
      btn.disabled = true; btn.textContent = "Saving\u2026";
      var imageUrl = c.image_url || null;
      var file = (document.getElementById("cPhoto").files || [])[0];
      if (file) imageUrl = await db.adminUploadImage(file, "courses") || imageUrl;
      var row = {
        name:        (document.getElementById("cName").value || "").trim(),
        level:       document.getElementById("cLevel").value,
        description: (document.getElementById("cDesc").value || "").trim(),
        image_url:   imageUrl,
        sort_order:  c.sort_order || 0,
        active:      true
      };
      if (c.id) row.id = c.id;
      await db.adminUpsertCourse(row);
      closeModal();
      shared.toast("Course saved \u2713");
      loadCourses();
    });
  }

  /* ----------------------------------------------------------- SETTINGS -- */
  async function loadSettings() {
    var s = await db.getSettings();
    var setVal = function(id, val) {
      var el = document.getElementById(id);
      if (el) el.value = val || "";
    };
    setVal("setUpi",       s.upi_id);
    setVal("setWa",        s.wa_number);
    setVal("setAddress",   s.business_address);
    setVal("setInstagram", s.instagram_url);
    setVal("setYoutube",   s.youtube_url);
  }

  /* ----------------------------------------------------------- NEW PROD -- */
  function openNewProductModal() {
    openModal(
      '<h3 style="margin-bottom:16px;">Add New Product</h3>' +
      '<div class="field"><label>Product Name *</label><input id="npName" placeholder="e.g. Swiss Beauty Matte Lipstick"></div>' +
      '<div class="field"><label>Category *</label><input id="npCategory" placeholder="e.g. Cosmetics"></div>' +
      '<div class="field-row">' +
        '<div class="field"><label>Price (&#8377;) *</label><input id="npPrice" type="number" step="0.01" min="0" value="0"></div>' +
        '<div class="field"><label>Other Charges (&#8377;)</label><input id="npOther" type="number" step="0.01" min="0" value="0"></div>' +
      '</div>' +
      '<div class="field"><label>Photo</label><input id="npPhoto" type="file" accept="image/*"></div>' +
      '<div id="npStatus" style="min-height:16px;font-size:.8rem;"></div>' +
      '<div style="display:flex;gap:10px;margin-top:12px;">' +
        '<button class="btn btn-primary" id="npSaveBtn">Add to Website</button>' +
        '<button class="btn btn-outline" id="npCancelBtn">Cancel</button>' +
      '</div>');
    document.getElementById("npCancelBtn").addEventListener("click", closeModal);
    document.getElementById("npSaveBtn").addEventListener("click", async function () {
      var btn = document.getElementById("npSaveBtn");
      var status = document.getElementById("npStatus");
      var name     = (document.getElementById("npName").value || "").trim();
      var category = (document.getElementById("npCategory").value || "").trim();
      if (!name || !category) { status.innerHTML = '<span style="color:var(--warn);">Name and category are required.</span>'; return; }
      btn.disabled = true; btn.textContent = "Saving\u2026";
      var imageUrl = null;
      var file = (document.getElementById("npPhoto").files || [])[0];
      if (file) imageUrl = await db.adminUploadImage(file, "products") || null;
      try {
        await SB.from("products").insert({
          item_code:     "CUSTOM-" + Date.now(),
          name:          name,
          category:      category,
          price:         parseFloat(document.getElementById("npPrice").value) || 0,
          other_charges: parseFloat(document.getElementById("npOther").value) || 0,
          image_url:     imageUrl,
          active:        true
        });
        closeModal();
        shared.toast(name + " added to website \u2713");
        allProducts = [];
        loadProducts("");
      } catch (e) {
        status.innerHTML = '<span style="color:var(--warn);">Failed: ' + shared.escapeHtml(e.message || String(e)) + '</span>';
        btn.disabled = false; btn.textContent = "Add to Website";
      }
    });
  }

  /* ------------------------------------------------------------ INIT ----- */
  async function init() {
    var ok = await gate();
    if (!ok) return;

    SB = window.supabase.createClient(window.SITE_CONFIG.SUPABASE_URL, window.SITE_CONFIG.SUPABASE_ANON_KEY);

    initTabs();
    loadOrders();
    loadProducts();
    loadServices();
    loadCourses();
    loadSettings();
    loadCategories();

    document.getElementById("newProductBtn").addEventListener("click", openNewProductModal);
    document.getElementById("newServiceBtn").addEventListener("click", function () { openServiceModal(null); });
    document.getElementById("newCourseBtn").addEventListener("click", function () { openCourseModal(null); });

    var searchEl = document.getElementById("adminProductSearch");
    if (searchEl) searchEl.addEventListener("input", function (e) { loadProducts(e.target.value); });

    document.getElementById("saveSettingsBtn").addEventListener("click", async function () {
      var btn = document.getElementById("saveSettingsBtn");
      var msg = document.getElementById("settingsSaveMsg");
      var get = function(id){ var el=document.getElementById(id); return el ? el.value.trim() : ""; };
      btn.disabled = true; btn.textContent = "Saving\u2026";
      if (msg) msg.innerHTML = "";
      try {
        await db.adminUpdateSetting("upi_id",           get("setUpi"));
        await db.adminUpdateSetting("wa_number",        get("setWa"));
        await db.adminUpdateSetting("business_address", get("setAddress"));
        await db.adminUpdateSetting("instagram_url",    get("setInstagram"));
        await db.adminUpdateSetting("youtube_url",      get("setYoutube"));
        if (msg) msg.innerHTML = '<span style="color:var(--success);">\u2713 All settings saved successfully!</span>';
        shared.toast("Settings saved \u2713");
        // Invalidate settings cache so live site picks up new values
        if (window.db && db.clearSettingsCache) db.clearSettingsCache();
      } catch(e) {
        if (msg) msg.innerHTML = '<span style="color:var(--warn);">\u26a0 Save failed: ' + shared.escapeHtml(e.message||e) + '</span>';
        shared.toast("Error saving settings");
      } finally {
        btn.disabled = false; btn.textContent = "\u2713 Save All Settings";
      }
    });
  }

  document.addEventListener("DOMContentLoaded", init);


  /* ------------------------------------------------------------ PRINT ---- */
  function printOrder(order) {
    var win = window.open("","_blank","width=860,height=750");
    if (!win) { shared.toast("\u26a0 Allow pop-ups to print. Check browser settings."); return; }
    var rows = (order.items||[]).map(function(i){
      var fp = i.final_price || i.price || 0;
      var name = String(i.name||"").replace(/^[^a-zA-Z]+/,"").replace(/\b\w/g,function(c){return c.toUpperCase();});
      return "<tr><td style=\"padding:8px 12px;border-bottom:1px solid #F0E8E0;\">"+
        "<b>"+escHtml(name)+"</b>"+(i.item_code?"<br><span style=\"font-size:.7rem;color:#aaa;\">SKU: "+escHtml(i.item_code)+"</span>":"")+
        "</td><td style=\"padding:8px 12px;border-bottom:1px solid #F0E8E0;text-align:center;\">"+i.qty+
        "</td><td style=\"padding:8px 12px;border-bottom:1px solid #F0E8E0;text-align:right;\">"+shared.fmtPrice(fp)+
        "</td><td style=\"padding:8px 12px;border-bottom:1px solid #F0E8E0;text-align:right;font-weight:700;\">"+shared.fmtPrice(fp*i.qty)+"</td></tr>";
    }).join("");
    function escHtml(s){ return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
    var date = order.created_at ? new Date(order.created_at).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Kolkata"}) : new Date().toLocaleString("en-IN");
    var html =
      "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><title>Order "+escHtml(order.order_number||"")+"</title>"+
      "<style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Arial,sans-serif;color:#222;padding:30px;max-width:760px;margin:0 auto;}"+
      ".header{text-align:center;padding-bottom:18px;border-bottom:3px solid #C9A227;margin-bottom:22px;}"+
      ".shop-name{font-size:1.4rem;font-weight:700;color:#1A1015;}.shop-sub{font-size:.78rem;color:#888;margin-top:4px;}"+
      ".order-no{display:inline-block;background:#1A1015;color:#C9A227;padding:3px 14px;border-radius:999px;font-size:.8rem;font-weight:700;margin-top:8px;}"+
      ".addr-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:0 0 20px;}"+
      ".addr-box{border:1px solid #EDE0D8;border-radius:8px;padding:12px;}.addr-label{font-size:.7rem;font-weight:700;text-transform:uppercase;color:#C9486B;margin-bottom:4px;}"+
      ".addr-name{font-weight:700;font-size:.88rem;}.addr-text{font-size:.82rem;color:#555;line-height:1.5;}"+
      "table{width:100%;border-collapse:collapse;}thead tr{background:#F8F0EA;}th{padding:8px 12px;text-align:left;font-size:.75rem;text-transform:uppercase;color:#888;}"+
      ".total-row td{padding:10px 12px;font-weight:700;background:#FBF3EC;border-top:2px solid #C9A227;}"+
      ".footer{margin-top:20px;padding-top:12px;border-top:1px solid #EDE0D8;font-size:.75rem;color:#888;display:flex;justify-content:space-between;align-items:center;}"+
      ".thank{text-align:center;margin-top:16px;font-size:.84rem;color:#C9A227;font-weight:600;}"+
      "@media print{.no-print{display:none!important;}}"+
      "</style></head><body>"+
      "<div class=\"header\"><div class=\"shop-name\">&hearts; Srivalli's The Beauty Shop Cosmetics</div>"+
      "<div class=\"shop-sub\">Ground Floor, Shop No-626B, Eswar Tower, Near Vani Sweets, Periyakulam Main Road, Theni-625531, TN</div>"+
      "<div class=\"shop-sub\">&#9990; +91 83006 33810 &nbsp;|&nbsp; @sri_vallis_cosmetics</div>"+
      "<div class=\"order-no\">ORDER #"+escHtml(order.order_number||"")+"</div>"+
      "<div style=\"font-size:.75rem;color:#888;margin-top:6px;\">"+date+"</div></div>"+
      "<div class=\"addr-grid\">"+
        "<div class=\"addr-box\"><div class=\"addr-label\">&#128230; From</div>"+
          "<div class=\"addr-name\">Srivalli's The Beauty Shop</div>"+
          "<div class=\"addr-text\">"+escHtml(order.from_address||"Ground Floor, Shop No-626B, Eswar Tower, Theni-625531, TN")+"</div></div>"+
        "<div class=\"addr-box\"><div class=\"addr-label\">&#127968; To (Customer)</div>"+
          "<div class=\"addr-name\">"+escHtml(order.customer_name||"")+"</div>"+
          "<div class=\"addr-text\">&#9990; "+escHtml(order.customer_phone||"")+"</div>"+
          "<div class=\"addr-text\" style=\"margin-top:3px;\">"+escHtml(order.to_address||"")+"</div></div>"+
      "</div>"+
      "<table><thead><tr><th>Product</th><th style=\"text-align:center;\">Qty</th><th style=\"text-align:right;\">Price</th><th style=\"text-align:right;\">Total</th></tr></thead>"+
      "<tbody>"+rows+"</tbody>"+
      "<tfoot><tr class=\"total-row\"><td colspan=\"3\">Grand Total</td><td style=\"text-align:right;\">"+shared.fmtPrice(order.total)+"</td></tr></tfoot></table>"+
      "<div class=\"footer\"><div>Payment: <b>"+(order.payment_method||"WhatsApp UPI").toUpperCase()+"</b></div>"+
      "<button class=\"no-print\" onclick=\"window.print()\" style=\"background:#C9A227;color:#fff;border:none;border-radius:6px;padding:8px 18px;cursor:pointer;font-weight:700;font-size:.85rem;\">&#128438; Print</button></div>"+
      "<div class=\"thank\">Thank you for shopping with Srivalli's The Beauty Shop! &#128140;</div>"+
      "</body></html>";
    win.document.write(html);
    win.document.close();
    setTimeout(function(){ win.focus(); },300);
  }


  /* --------------------------------------------------- CATEGORIES ---- */
  async function loadCategories() {
    var wrap = document.getElementById("categoriesWrap");
    if (!wrap) return;
    wrap.innerHTML = '<p style="color:var(--ink-soft);font-size:.84rem;">Loading…</p>';

    var cats = [];
    try {
      var r = await SB.from("categories").select("*").order("sort_order");
      if (r.error) throw r.error;
      cats = r.data || [];
    } catch(e) {
      wrap.innerHTML = '<div class="alert alert-error">Could not load: ' + shared.escapeHtml(e.message||"") + '</div>';
      return;
    }

    function row(cat) {
      var active = cat.active !== false;
      return '<tr id="cat-row-'+cat.id+'">' +
        '<td><span class="cat-name-text" id="cname-'+cat.id+'">'+shared.escapeHtml(cat.name)+'</span>' +
          (cat.is_custom ? ' <span style="font-size:.65rem;background:var(--berry);color:#fff;padding:1px 5px;border-radius:999px;">Custom</span>' : '') +
        '</td>' +
        '<td>' + (active
          ? '<span style="color:#22c55e;font-weight:700;">● Visible</span>'
          : '<span style="color:#ef4444;font-weight:700;">○ Hidden</span>') +
        '</td>' +
        '<td style="display:flex;gap:6px;flex-wrap:wrap;">' +
          '<button class="cat-edit-btn" data-id="'+cat.id+'" data-name="'+shared.escapeHtml(cat.name)+'" '+
            'style="background:var(--cream-deep);border:1px solid var(--rose-gold-l);border-radius:4px;cursor:pointer;padding:3px 10px;font-size:.72rem;font-weight:600;">' +
            '✏️ Edit</button>' +
          (active
            ? '<button class="cat-tog-btn" data-id="'+cat.id+'" data-val="false" style="background:#fef3c7;color:#92400e;border:1px solid #fcd34d;border-radius:4px;cursor:pointer;padding:3px 10px;font-size:.72rem;">Hide</button>'
            : '<button class="cat-tog-btn" data-id="'+cat.id+'" data-val="true" style="background:#d1fae5;color:#065f46;border:1px solid #6ee7b7;border-radius:4px;cursor:pointer;padding:3px 10px;font-size:.72rem;">Show</button>') +
          (cat.is_custom
            ? '<button class="cat-del-btn" data-id="'+cat.id+'" style="background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;border-radius:4px;cursor:pointer;padding:3px 10px;font-size:.72rem;">Delete</button>'
            : '') +
        '</td>' +
      '</tr>';
    }

    wrap.innerHTML =
      /* Add custom category */
      '<div style="background:var(--cream-deep);border-radius:var(--radius-sm);padding:14px;margin-bottom:16px;">' +
        '<h4 style="margin-bottom:10px;">➕ Add New Category</h4>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
          '<input id="newCatName" placeholder="e.g. Skincare, Nail Care…" style="flex:1;min-width:160px;font-size:15px;">' +
          '<button id="addCatBtn" class="btn btn-primary" style="height:44px;">➕ Add</button>' +
        '</div>' +
        '<div id="catAddMsg" style="font-size:.8rem;min-height:14px;margin-top:6px;"></div>' +
      '</div>' +
      /* Table */
      '<div style="overflow-x:auto;">' +
      '<table class="admin-table"><thead><tr><th>Category Name</th><th>Status</th><th>Actions</th></tr></thead>' +
      '<tbody>' + cats.map(row).join("") + '</tbody></table></div>';

    /* ── EDIT button → inline rename ── */
    wrap.querySelectorAll(".cat-edit-btn").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var id   = btn.dataset.id;
        var name = btn.dataset.name;
        var nameEl = document.getElementById("cname-"+id);
        if (!nameEl) return;

        // Replace text with inline input
        nameEl.innerHTML =
          '<input id="cedit-'+id+'" value="'+shared.escapeHtml(name)+'" ' +
            'style="font-size:.9rem;padding:3px 8px;border:1.5px solid var(--berry);border-radius:4px;min-width:140px;">' +
          ' <button id="csave-'+id+'" style="background:var(--berry);color:#fff;border:none;border-radius:4px;padding:3px 10px;cursor:pointer;font-size:.72rem;font-weight:700;">Save</button>' +
          ' <button id="ccancel-'+id+'" style="background:var(--cream-deep);border:1px solid var(--rose-gold-l);border-radius:4px;padding:3px 8px;cursor:pointer;font-size:.72rem;">Cancel</button>';

        document.getElementById("ccancel-"+id).addEventListener("click", function() {
          loadCategories();
        });

        document.getElementById("csave-"+id).addEventListener("click", async function() {
          var newName = (document.getElementById("cedit-"+id)||{}).value||"";
          newName = newName.trim();
          if (!newName) { shared.toast("Name cannot be empty."); return; }
          var saveBtn = document.getElementById("csave-"+id);
          if (saveBtn) { saveBtn.disabled=true; saveBtn.textContent="Saving…"; }
          try {
            var res = await SB.from("categories").update({ name: newName }).eq("id", id);
            if (res.error) throw res.error;
            shared.toast("✓ Category renamed to “"+newName+"” — live for all users!");
            loadCategories();
          } catch(e) {
            shared.toast("Error: "+(e.message||e));
            if (saveBtn) { saveBtn.disabled=false; saveBtn.textContent="Save"; }
          }
        });

        // Also save on Enter key
        var inp = document.getElementById("cedit-"+id);
        if (inp) { inp.focus(); inp.select(); }
        if (inp) inp.addEventListener("keydown", function(e) {
          if (e.key==="Enter") document.getElementById("csave-"+id)&&document.getElementById("csave-"+id).click();
          if (e.key==="Escape") loadCategories();
        });
      });
    });

    /* Toggle visibility */
    wrap.querySelectorAll(".cat-tog-btn").forEach(function(btn) {
      btn.addEventListener("click", async function() {
        btn.disabled=true; btn.textContent="Saving…";
        try {
          await SB.from("categories").update({ active: btn.dataset.val==="true" }).eq("id",btn.dataset.id);
          shared.toast("Category updated ✓");
          loadCategories();
        } catch(e) { shared.toast("Error: "+(e.message||e)); btn.disabled=false; }
      });
    });

    /* Delete custom */
    wrap.querySelectorAll(".cat-del-btn").forEach(function(btn) {
      btn.addEventListener("click", async function() {
        if (!confirm("Delete this custom category?")) return;
        btn.disabled=true;
        try {
          await SB.from("categories").delete().eq("id",btn.dataset.id).eq("is_custom",true);
          shared.toast("Deleted ✓"); loadCategories();
        } catch(e) { shared.toast("Error: "+(e.message||e)); btn.disabled=false; }
      });
    });

    /* Add new category */
    var addBtn = document.getElementById("addCatBtn");
    if (addBtn) addBtn.addEventListener("click", async function() {
      var inp=document.getElementById("newCatName"), msg=document.getElementById("catAddMsg");
      var name=(inp?inp.value.trim():"");
      if (!name) { if(msg) msg.innerHTML='<span style="color:var(--warn);">Please enter a name.</span>'; return; }
      addBtn.disabled=true; addBtn.textContent="Adding…";
      try {
        await SB.from("categories").insert({name:name,is_custom:true,active:true,sort_order:999});
        if(msg) msg.innerHTML='<span style="color:var(--success);">✓ "'+shared.escapeHtml(name)+'" added!</span>';
        if(inp) inp.value="";
        setTimeout(loadCategories, 500);
      } catch(e) {
        if(msg) msg.innerHTML='<span style="color:var(--warn);">'+shared.escapeHtml(e.message||String(e))+'</span>';
      } finally { addBtn.disabled=false; addBtn.textContent="➕ Add"; }
    });
  }


})();
