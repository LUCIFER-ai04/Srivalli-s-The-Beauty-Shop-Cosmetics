/* ============================================================================
   DRAWER-CART.JS — 3-Step WhatsApp Order + Payment Flow
   
   FLOW:
   Step 1 → Customer fills form → "Place Order via WhatsApp" 
            → WhatsApp opens to shop with order details
   
   Step 2 → DONE screen shows payment instructions:
            → UPI ID to pay, GPay/PhonePe/UPI deeplinks
            → NO QR code shown
   
   Step 3 → "Confirm Payment on WhatsApp" button
            → WhatsApp opens to shop: "I paid for Order #XYZ, here is my proof"
   
   Admin side: order appears in admin panel → admin marks payment received
            → admin clicks "Send Confirmation to Customer"
   ============================================================================ */
(function () {
  var settings  = null;
  var step      = "cart";
  var lastOrder = null;
  var CFG       = window.SITE_CONFIG || {};

  function el(id)    { return document.getElementById(id); }
  function titleEl() { return el("drawerTitle"); }
  function bodyEl()  { return el("drawerBody"); }
  function footEl()  { return el("drawerFoot"); }

  function fmtName(s) {
    return String(s).toLowerCase().replace(/(^|\s|\/|-)([a-z\u00C0-\u024F])/g,
      function(m,sp,c){ return sp+c.toUpperCase(); });
  }

  /* ── Rate limiting ─────────────────────────────────────────────────── */
  function checkRateLimit() {
    try {
      var KEY="rl_orders", MAX=5, WIN=3600000, now=Date.now();
      var r=JSON.parse(localStorage.getItem(KEY)||'{"count":0,"reset":0}');
      if(now>r.reset) r={count:0,reset:now+WIN};
      if(r.count>=MAX) return false;
      r.count++; localStorage.setItem(KEY,JSON.stringify(r)); return true;
    } catch(e){ return true; }
  }

  /* ── Settings with fallbacks ──────────────────────────────────────── */
  function getWaNumber()  { return (settings&&settings.wa_number)        ||CFG.WA_NUMBER_FALLBACK  ||"918300633810"; }
  function getBizName()   { return (settings&&settings.business_name)    ||CFG.BUSINESS_NAME       ||"Srivalli's The Beauty Shop Cosmetics"; }
  function getBizAddr()   { return (settings&&settings.business_address) ||CFG.BUSINESS_ADDRESS    ||"Ground Floor, Shop No-626B, Eswar Tower, Near Vani Sweets, Periyakulam Main Road, Theni-625531, Tamil Nadu"; }
  function getUpiId()     { return (settings&&settings.upi_id)           ||CFG.UPI_ID_FALLBACK     ||"visu9474-1@oksbi"; }
  function getUpiPhone()  { return (settings&&settings.upi_phone)        ||CFG.UPI_PHONE_FALLBACK  ||"9003276226"; }

  async function prefetchSettings() {
    if(settings && settings.wa_number) return;
    try { settings = await db.getSettings(); } catch(e){}
    if(!settings) settings={};
    if(!settings.wa_number)        settings.wa_number        = CFG.WA_NUMBER_FALLBACK  ||"918300633810";
    if(!settings.business_name)    settings.business_name    = CFG.BUSINESS_NAME       ||"Srivalli's The Beauty Shop Cosmetics";
    if(!settings.business_address) settings.business_address = CFG.BUSINESS_ADDRESS    ||"Ground Floor, Shop No-626B, Eswar Tower, Near Vani Sweets, Periyakulam Main Road, Theni-625531, Tamil Nadu";
    if(!settings.upi_id)           settings.upi_id           = CFG.UPI_ID_FALLBACK     ||"visu9474-1@oksbi";
    if(!settings.upi_phone)        settings.upi_phone        = CFG.UPI_PHONE_FALLBACK  ||"9003276226";
  }

  /* ── Name cleaner — strips leading special chars (backtick etc.) ─── */
  function cleanProductName(s) {
    // Strip leading non-alphanumeric characters (backtick, asterisk, etc.)
    return fmtName(String(s).replace(/^[^a-zA-Z0-9\u00C0-\u024F]+/, '').trim());
  }

  /* ── UPI Deep Links ───────────────────────────────────────────────── */
  function buildUpiParams(amount, orderNum, upiId) {
    return "pa=" + encodeURIComponent(upiId) +
           "&pn=" + encodeURIComponent("Srivallis Cosmetics") +
           "&am=" + amount.toFixed(2) +
           "&tn=" + encodeURIComponent("Order " + orderNum) +
           "&cu=INR";
  }

  /* ── Open / close ─────────────────────────────────────────────────── */
  function open(initialStep) {
    step = initialStep||"cart";
    var bd=el("drawerBackdrop"), dw=el("cartDrawer");
    if(bd) bd.classList.add("show");
    if(dw) dw.classList.add("show");
    prefetchSettings().catch(function(){});
    render();
  }
  function close() {
    var bd=el("drawerBackdrop"), dw=el("cartDrawer");
    if(bd) bd.classList.remove("show");
    if(dw) dw.classList.remove("show");
  }
  function render() {
    if(step==="cart")      renderCartStep();
    else if(step==="checkout") renderCheckoutStep();
    else if(step==="done")     renderDoneStep();
  }

  /* ══════════════════════════════════════════════════════════════════
     CART STEP
  ══════════════════════════════════════════════════════════════════ */
  function renderCartStep() {
    if(!titleEl()) return;
    titleEl().textContent = "Your Cart";
    var cart = shared.getCart();
    if(!cart.length){
      bodyEl().innerHTML='<div class="empty-state"><p>Your cart is empty.</p></div>';
      footEl().innerHTML='<button class="btn btn-outline btn-block" id="drawerShopBtn">Browse Products</button>';
      el("drawerShopBtn").addEventListener("click",function(){
        close(); var s=document.getElementById("shop"); if(s) s.scrollIntoView({behavior:"smooth"});
      });
      return;
    }
    bodyEl().innerHTML=cart.map(function(i){
      var url="product.html?id="+encodeURIComponent(i.id);
      var disc=i.discount?Math.round(i.price*(1-i.discount/100)*100)/100:i.price;
      var priceStr=i.discount
        ?'<s style="color:var(--ink-soft);font-size:.78rem;">'+shared.fmtPrice(i.price)+'</s> <b>'+shared.fmtPrice(disc)+'</b>'
        :shared.fmtPrice(i.price);
      var imgEl = i.image
        ? '<img src="'+i.image+'" alt="'+shared.escapeHtml(cleanProductName(i.name))+'" loading="lazy" '+
            'style="width:52px;height:52px;object-fit:cover;border-radius:6px;display:block;flex-shrink:0;">'
        : shared.productIconSVG(i.category);
      return '<div class="drawer-item">'+
        '<a href="'+url+'" class="ic" style="flex-shrink:0;">'+imgEl+'</a>'+
        '<div class="info">'+
          '<a href="'+url+'" class="nm">'+shared.escapeHtml(cleanProductName(i.name))+'</a>'+
          '<div class="pr">'+priceStr+' &times; <input type="number" min="1" class="qty-input" value="'+i.qty+'" data-id="'+shared.escapeHtml(i.id)+'"></div>'+
        '</div>'+
        '<a href="#" class="remove-link" data-remove="'+shared.escapeHtml(i.id)+'">Remove</a>'+
      '</div>';
    }).join("");
    bodyEl().querySelectorAll(".qty-input").forEach(function(inp){
      inp.addEventListener("change",function(){ shared.setQty(inp.dataset.id,Number(inp.value)||1); render(); });
    });
    bodyEl().querySelectorAll("[data-remove]").forEach(function(a){
      a.addEventListener("click",function(e){ e.preventDefault(); shared.removeFromCart(a.dataset.remove); render(); });
    });
    var total=shared.cartTotal();
    footEl().innerHTML=
      '<div class="summary-row total"><span>Total</span><span>'+shared.fmtPrice(total)+'</span></div>'+
      '<button class="btn btn-primary btn-block mt-30" id="goCheckoutBtn">Proceed to Order &rarr;</button>';
    el("goCheckoutBtn").addEventListener("click",function(){
      step="checkout";
      if(window.track) window.track("begin_checkout",{value:total,currency:"INR"});
      render();
    });
  }

  /* ══════════════════════════════════════════════════════════════════
     CHECKOUT STEP
  ══════════════════════════════════════════════════════════════════ */
  function renderCheckoutStep(){
    if(!titleEl()) return;
    titleEl().textContent="Place Order";
    var cart=shared.getCart(), total=shared.cartTotal();
    var summaryHtml=cart.map(function(i){
      var disc=i.discount?Math.round(i.price*(1-i.discount/100)*100)/100:i.price;
      return '<div style="display:flex;justify-content:space-between;font-size:.82rem;padding:3px 0;">'+
        '<span>'+shared.escapeHtml(cleanProductName(i.name))+' &times;'+i.qty+'</span>'+
        '<span>'+shared.fmtPrice(disc*i.qty)+'</span></div>';
    }).join("");
    bodyEl().innerHTML=
      '<div id="coAlert"></div>'+
      '<div style="background:var(--cream-deep);border-radius:var(--radius-sm);padding:12px 14px;margin-bottom:14px;">'+
        summaryHtml+
        '<div style="border-top:1px solid var(--rose-gold-l);margin-top:8px;padding-top:8px;font-weight:700;display:flex;justify-content:space-between;">'+
          '<span>Total</span><span>'+shared.fmtPrice(total)+'</span>'+
        '</div>'+
      '</div>'+
      '<form id="coForm" novalidate>'+
        '<div class="field"><label for="coName">Full Name *</label>'+
          '<input id="coName" required placeholder="Your full name" autocomplete="name" style="font-size:16px;" aria-required="true"></div>'+
        '<div class="field"><label for="coPhone">Phone Number *</label>'+
          '<input id="coPhone" type="tel" required placeholder="10-digit mobile number" autocomplete="tel" style="font-size:16px;" aria-required="true" pattern="[0-9]{10}"></div>'+
        '<div class="field"><label for="coAddr">Delivery Address *</label>'+
          '<textarea id="coAddr" required placeholder="House no, street, area, city, pincode" style="min-height:75px;font-size:16px;" aria-required="true"></textarea></div>'+
        '<div class="terms-row">'+
          '<input type="checkbox" id="coTerms" aria-required="true">'+
          '<label for="coTerms">I agree to the <a href="#" id="openTermsCo">Terms &amp; Conditions</a> *</label>'+
        '</div>'+
        '<button type="submit" class="btn btn-block" id="coWaBtn" '+
          'style="background:#25D366;color:#fff;font-size:1rem;padding:14px;border:none;border-radius:var(--radius);'+
          'font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;min-height:50px;">'+
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">'+
            '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>'+
            '<path d="M11.905 1.032A10.981 10.981 0 0 0 1 12.002c0 1.926.504 3.737 1.379 5.315L1 23l5.817-1.35A11.007 11.007 0 0 0 11.905 23C17.98 23 17.98 17.973 17.98 11.968 17.98 5.963 17.98 1 11.905 1z"/>'+
          '</svg>'+
          'Step 1: Send Order on WhatsApp'+
        '</button>'+
        '<p style="font-size:.74rem;color:var(--ink-soft);text-align:center;margin-top:8px;">Payment will be done in the next step after ordering</p>'+
        '<button type="button" class="btn btn-outline btn-block" id="coBackBtn" style="margin-top:10px;">&larr; Back to Cart</button>'+
      '</form>';
    footEl().innerHTML="";
    el("coBackBtn").addEventListener("click",function(){ step="cart"; render(); });
    el("openTermsCo").addEventListener("click",function(e){
      e.preventDefault();
      var tb=el("termsBackdrop"); if(tb) tb.classList.add("show");
    });
    el("coForm").addEventListener("submit", handleSubmit);
  }

  function showAlert(msg, type) {
    var a=el("coAlert");
    if(a) a.innerHTML='<div class="alert alert-'+(type||"error")+'" role="alert">'+msg+'</div>';
  }

  /* ══════════════════════════════════════════════════════════════════
     SUBMIT — SYNCHRONOUS (no await before window.open)
  ══════════════════════════════════════════════════════════════════ */
  function handleSubmit(e) {
    e.preventDefault();
    var cart=shared.getCart();
    if(!cart.length){ showAlert("Your cart is empty."); return; }
    if(!checkRateLimit()){ showAlert("Too many orders placed recently. Please wait an hour or contact us on WhatsApp directly."); return; }

    var name  = el("coName")  ? el("coName").value.trim()  : "";
    var phone = el("coPhone") ? el("coPhone").value.trim() : "";
    var addr  = el("coAddr")  ? el("coAddr").value.trim()  : "";
    var terms = el("coTerms") ? el("coTerms").checked      : false;

    if(!name)                       { showAlert("Please enter your full name.");               return; }
    if(!phone)                      { showAlert("Please enter your phone number.");            return; }
    if(!/^[0-9]{10}$/.test(phone)) { showAlert("Please enter a valid 10-digit phone number."); return; }
    if(!addr)                       { showAlert("Please enter your delivery address.");        return; }
    if(!terms)                      { showAlert("Please agree to the Terms &amp; Conditions."); return; }

    var total    = shared.cartTotal();
    var orderNum = "WA-" + Date.now();
    var waNumber = getWaNumber();
    var bizName  = getBizName();
    var bizAddr  = getBizAddr();
    var upiId    = getUpiId();

    var items = cart.map(function(i){
      var disc = i.discount ? Math.round(i.price*(1-i.discount/100)*100)/100 : i.price;
      return { item_code:i.id, name:i.name, qty:i.qty, price:i.price, final_price:disc };
    });

    var orderData = {
      order_number:    orderNum,
      is_guest:        true,
      customer_name:   name,
      customer_phone:  phone,
      from_address:    bizAddr,
      to_address:      addr,
      items:           items,
      subtotal:        total,
      delivery_charge: 0,
      total:           total,
      payment_method:  "whatsapp_upi",
      payment_status:  "pending_payment",
      terms_accepted:  true,
      status:          "pending"
    };

    /* Build order WhatsApp URL with payment details (SYNC) */
    var waUrl = buildOrderWaUrl(orderData, waNumber, bizName, upiId);

    /* ── Open WhatsApp IMMEDIATELY (sync — must be direct response to click) ── */
    window.open(waUrl, "_blank");

    /* Save to Supabase in background */
    lastOrder = Object.assign({}, orderData, { _cart: cart, _upiId: upiId });
    shared.clearCart();
    step = "done";
    if(window.track) window.track("purchase",{value:total,currency:"INR",payment_method:"whatsapp_upi",transaction_id:orderNum});
    render();

    db.createOrder(orderData).then(function(saved){
      if(saved && saved.order_number && lastOrder) {
        lastOrder.order_number = saved.order_number;
        var onEl = el("doneOrderNum"); if(onEl) onEl.textContent = saved.order_number;
      }
    }).catch(function(err){
      console.warn("[Order save]:", err && err.message || err);
      // Show visible note in done screen — WhatsApp message already sent so order is not lost
      try {
        var note = document.createElement('p');
        note.style.cssText = 'font-size:.74rem;color:#ef4444;margin-top:10px;text-align:center;';
        note.innerHTML = '\u26a0 Order not recorded in database (check internet). Your WhatsApp message was sent — the shop has your order.';
        if(bodyEl()) bodyEl().appendChild(note);
      } catch(e2) {}
    });
  }

  /* ── Clipboard fallback (works on HTTP / older browsers) ─────────── */
  function fallbackCopy(text, btn) {
    try {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0;";
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      var ok = document.execCommand("copy");
      document.body.removeChild(ta);
      if (ok && btn) {
        btn.textContent = "Copied \u2713";
        btn.style.background = "#22c55e";
        setTimeout(function(){ btn.textContent = "Copy"; btn.style.background = "#f97316"; }, 2000);
      }
    } catch(e) {}
  }

  /* ── WhatsApp: Step 1 — Order details only (payment shown in auto-reply step) ── */
  function buildOrderWaUrl(order, waNum, bizName, upiId) {
    var lines = [
      "\uD83C\uDF38 *New Order \u2014 " + bizName + "*",
      "Order: *" + order.order_number + "*",
      "",
      "\uD83D\uDC64 *Customer:* " + order.customer_name,
      "\uD83D\uDCDE *Phone:* " + order.customer_phone,
      "",
      "\uD83C\uDFE0 *Deliver To:*",
      order.to_address,
      "",
      "\uD83D\uDED2 *Products Ordered:*"
    ];
    (order.items||[]).forEach(function(i){
      var p = i.final_price || i.price;
      lines.push("  \u2022 " + cleanProductName(i.name) + " \xd7" + i.qty + " \u2014 " + shared.fmtPrice(p * i.qty));
    });
    lines.push("");
    lines.push("\uD83D\uDCB0 *Total Amount: " + shared.fmtPrice(order.total) + "*");
    lines.push("");
    lines.push("_I will send my payment screenshot shortly. Thank you!_ \uD83C\uDF38");
    return "https://wa.me/" + waNum + "?text=" + encodeURIComponent(lines.join("\n"));
  }

  /* ── WhatsApp: Step 3 — Payment proof from customer to shop ── */
  function buildPaymentProofWaUrl(order) {
    var lines = [
      "\uD83D\uDCB3 *Payment Done!*",
      "",
      "Order: *" + order.order_number + "*",
      "Customer: " + order.customer_name,
      "Amount Paid: *" + shared.fmtPrice(order.total) + "*",
      "",
      "I have completed the UPI payment. Please confirm my order.",
      "",
      "_(UTR/Reference number will be sent separately if required)_"
    ];
    return "https://wa.me/" + getWaNumber() + "?text=" + encodeURIComponent(lines.join("\n"));
  }

  /* ══════════════════════════════════════════════════════════════════
     DONE STEP
     Card 1 (orange) — order-sent confirmation + shop's QR/UPI payment
                        details combined in one card
     Card 2 (blue)   — one tap to send the payment screenshot back on
                        WhatsApp; after the shop confirms, the order moves
                        to Confirmed/Delivered in the admin panel
  ══════════════════════════════════════════════════════════════════ */
  function renderDoneStep() {
    if(!titleEl()) return;
    titleEl().textContent = "Order Sent! \u2713";

    var o         = lastOrder || {};
    var total     = o.total    || 0;
    var orderNum  = o.order_number || "";
    var upiId     = o._upiId   || getUpiId();
    var upiPhone  = getUpiPhone();
    var bizName   = getBizName();
    var items     = (o.items||[]).map(function(i){
      return "<li style='font-size:.82rem;padding:1px 0;'>" +
        shared.escapeHtml(cleanProductName(i.name)) + " <b>\xd7" + i.qty + "</b></li>";
    }).join("");

    /* UPI QR code — encodes a standard UPI payment URI for the exact amount */
    var upiUri = "upi://pay?pa=" + encodeURIComponent(upiId) +
                 "&pn=" + encodeURIComponent("Srivallis Cosmetics") +
                 "&am=" + total.toFixed(2) +
                 "&tn=" + encodeURIComponent("Order " + orderNum) +
                 "&cu=INR";
    var qrImgUrl = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" + encodeURIComponent(upiUri);

    /* Payment screenshot message — sent by customer after paying */
    var proofMsg = [
      "\uD83D\uDCB3 *Payment Screenshot*",
      "",
      "Order: *" + orderNum + "*",
      "Customer: " + o.customer_name,
      "Amount Paid: *" + shared.fmtPrice(total) + "*",
      "",
      "\u2705 I have completed the payment. Attaching my screenshot below.",
      "Please confirm my order. Thank you! \uD83D\uDE0A"
    ].join("\n");
    var proofWaUrl = "https://wa.me/" + getWaNumber() + "?text=" + encodeURIComponent(proofMsg);

    bodyEl().innerHTML =

    /* ── Card 1: Order confirmation + Pay via QR/UPI (combined) ── */
    '<div style="background:#FFF7ED;border:2px solid #f97316;border-radius:var(--radius-sm);padding:14px;margin-bottom:10px;">' +

      /* Order sent confirmation */
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">' +
        '<span style="background:#22c55e;color:#fff;border-radius:50%;width:24px;height:24px;font-size:.82rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">\u2713</span>' +
        '<b style="color:#15803d;">Order Sent to Shop!</b>' +
      '</div>' +
      '<div style="background:#dcfce7;border-radius:6px;padding:8px 10px;margin-bottom:12px;">' +
        '<div style="font-size:.75rem;color:#166534;font-weight:600;margin-bottom:4px;">Order <b id="doneOrderNum">' + shared.escapeHtml(orderNum) + '</b></div>' +
        (items ? '<ul style="margin:0;padding-left:16px;color:#166534;">' + items + '</ul>' : '') +
        '<div style="font-size:.82rem;font-weight:700;color:#15803d;margin-top:6px;">Total: ' + shared.fmtPrice(total) + '</div>' +
      '</div>' +

      /* Pay via QR / UPI */
      '<div style="border-top:1.5px dashed #fed7aa;padding-top:12px;">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">' +
          '<span style="background:#f97316;color:#fff;border-radius:50%;width:24px;height:24px;font-size:.82rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">\u20b9</span>' +
          '<b style="color:#c2410c;">' + shared.escapeHtml(bizName) + ' says:</b>' +
        '</div>' +
        '<p style="font-size:.82rem;color:#9a3412;margin:0 0 10px;font-style:italic;">' +
          '\u201cThank you for your order! \uD83C\uDF38 Please pay <b>' + shared.fmtPrice(total) + '</b> using the QR code or UPI details below.\u201d' +
        '</p>' +
        '<div style="text-align:center;margin-bottom:10px;">' +
          '<img src="' + qrImgUrl + '" alt="UPI payment QR code for ' + shared.fmtPrice(total) + '" ' +
            'width="180" height="180" style="border-radius:8px;border:1px solid #fed7aa;background:#fff;padding:6px;" loading="lazy">' +
        '</div>' +
        '<div style="background:#fff;border:1.5px solid #fed7aa;border-radius:6px;padding:10px 12px;margin-bottom:8px;">' +
          '<div style="font-size:.68rem;color:#9a3412;font-weight:700;text-transform:uppercase;letter-spacing:.06em;">UPI ID</div>' +
          '<div style="font-size:.92rem;font-weight:700;font-family:monospace;color:#1A1015;word-break:break-all;">' + shared.escapeHtml(upiId) + '</div>' +
        '</div>' +
        '<div style="background:#fff;border:1.5px solid #fed7aa;border-radius:6px;padding:10px 12px;">' +
          '<div style="font-size:.68rem;color:#9a3412;font-weight:700;text-transform:uppercase;letter-spacing:.06em;">UPI Number / Phone Pay</div>' +
          '<div style="font-size:.92rem;font-weight:700;font-family:monospace;color:#1A1015;">' + shared.escapeHtml(upiPhone) + '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    /* ── Card 2: Send payment screenshot ── */
    '<div style="background:#EFF6FF;border:1.5px solid #3b82f6;border-radius:var(--radius-sm);padding:14px;">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">' +
        '<span style="background:#3b82f6;color:#fff;border-radius:50%;width:24px;height:24px;font-size:.82rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">2</span>' +
        '<b style="color:#1d4ed8;">After Paying, Send Screenshot</b>' +
      '</div>' +
      '<p style="font-size:.8rem;color:#1e40af;margin:0 0 10px;">Tap below to open WhatsApp, then attach your payment screenshot. The shop will confirm your order right after.</p>' +
      '<a href="' + proofWaUrl + '" target="_blank" rel="noopener" ' +
         'style="background:#25D366;color:#fff;display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;border-radius:8px;font-weight:700;font-size:.9rem;text-decoration:none;min-height:46px;">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.905 1.032A10.981 10.981 0 0 0 1 12.002c0 1.926.504 3.737 1.379 5.315L1 23l5.817-1.35A11.007 11.007 0 0 0 11.905 23C17.98 23 17.98 17.973 17.98 11.968 17.98 5.963 17.98 1 11.905 1z"/></svg>' +
        'Send Payment Screenshot on WhatsApp' +
      '</a>' +
    '</div>';

    footEl().innerHTML =
      '<button class="btn btn-outline btn-block" id="doneClose" style="margin-top:12px;">Done</button>';

    var closeBtn = el("doneClose");
    if (closeBtn) closeBtn.addEventListener("click", close);
  }

  /* ── Init ─────────────────────────────────────────────────────── */
  document.addEventListener("DOMContentLoaded",function(){
    var cb=el("drawerClose"), bd=el("drawerBackdrop");
    if(cb) cb.addEventListener("click",close);
    if(bd) bd.addEventListener("click",close);
  });

  window.cartDrawer={open:open,close:close};
})();
