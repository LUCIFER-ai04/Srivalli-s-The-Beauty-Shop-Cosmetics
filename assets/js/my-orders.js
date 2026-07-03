/* ============================================================================
   MY-ORDERS.JS — Customer account page: profile + lifetime order history
   ============================================================================ */
(function () {
  var STATUS_COLOR = { pending: "#E65100", confirmed: "#1A6B3C", delivered: "#0D5C4B", rejected: "#C62828" };

  function escHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function fmtPrice(n) {
    return (window.shared && shared.fmtPrice) ? shared.fmtPrice(n) : "\u20b9" + Number(n || 0).toFixed(0);
  }
  function cleanName(s) {
    return String(s || "").replace(/^[^a-zA-Z0-9]+/, "")
      .replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  async function loadProfile() {
    var card = document.getElementById("myProfileCard");
    if (!card || !window.db) return;
    try {
      var session = await db.getSession();
      if (!session || !session.user) {
        card.innerHTML = '<p style="color:var(--ink-soft);">Please sign in to view your account.</p>';
        return;
      }
      var u = session.user;
      var name  = (u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name)) || u.email.split("@")[0];
      var email = u.email || "";
      var avatar = (u.user_metadata && u.user_metadata.avatar_url) || "";

      card.innerHTML =
        '<div style="display:flex;align-items:center;gap:14px;">' +
          (avatar
            ? '<img src="' + escHtml(avatar) + '" alt="' + escHtml(name) + '" width="56" height="56" ' +
              'style="border-radius:50%;object-fit:cover;flex-shrink:0;">'
            : '<div style="width:56px;height:56px;border-radius:50%;background:var(--berry);color:#fff;' +
              'display:flex;align-items:center;justify-content:center;font-size:1.3rem;font-weight:700;flex-shrink:0;">' +
              escHtml(name.charAt(0).toUpperCase()) + '</div>') +
          '<div style="min-width:0;">' +
            '<div style="font-weight:700;font-size:1.05rem;">' + escHtml(name) + '</div>' +
            '<div style="color:var(--ink-soft);font-size:.82rem;word-break:break-all;">' + escHtml(email) + '</div>' +
          '</div>' +
        '</div>';
    } catch (e) {
      card.innerHTML = '<p style="color:var(--warn);">Could not load profile.</p>';
    }
  }

  async function loadOrders() {
    var wrap = document.getElementById("myOrdersWrap");
    if (!wrap || !window.db) return;

    try {
      var orders = await db.getMyOrders();
      if (!orders || !orders.length) {
        wrap.innerHTML =
          '<div class="empty-state" style="padding:30px;text-align:center;background:#fff;' +
          'border:1px solid var(--cream-deep);border-radius:var(--radius);">' +
          '<p style="color:var(--ink-soft);margin-bottom:12px;">You have not placed any orders yet.</p>' +
          '<a href="index.html#shop" class="btn btn-primary">Start Shopping</a>' +
          '</div>';
        return;
      }

      wrap.innerHTML = orders.map(function (o) {
        var status = o.status || "pending";
        var sc = STATUS_COLOR[status] || "#888";
        var items = (o.items || []).map(function (i) {
          return '<li style="font-size:.82rem;padding:1px 0;">' +
            escHtml(cleanName(i.name)) + ' &times;' + i.qty + '</li>';
        }).join("");
        var dateStr = new Date(o.created_at).toLocaleString("en-IN", {
          dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata"
        });

        return (
          '<div style="background:#fff;border:1px solid var(--cream-deep);border-radius:var(--radius);' +
            'padding:16px;margin-bottom:14px;box-shadow:0 1px 4px rgba(26,16,21,.06);">' +
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:8px;">' +
              '<div>' +
                '<div style="font-weight:700;font-size:.92rem;">Order #' + escHtml(o.order_number || "") + '</div>' +
                '<div style="color:var(--ink-soft);font-size:.75rem;">' + dateStr + '</div>' +
              '</div>' +
              '<span style="background:' + sc + ';color:#fff;font-size:.68rem;font-weight:700;' +
                'padding:3px 10px;border-radius:999px;text-transform:uppercase;letter-spacing:.04em;">' +
                status + '</span>' +
            '</div>' +
            (items ? '<ul style="margin:8px 0;padding-left:18px;">' + items + '</ul>' : '') +
            '<div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--cream-deep);' +
              'padding-top:8px;margin-top:8px;">' +
              '<span style="font-size:.78rem;color:var(--ink-soft);">Delivered to: ' + escHtml(o.to_address || "") + '</span>' +
              '<span style="font-weight:700;">' + fmtPrice(o.total) + '</span>' +
            '</div>' +
          '</div>'
        );
      }).join("");

    } catch (e) {
      wrap.innerHTML = '<div class="alert alert-error">Could not load your orders. Please refresh the page.</div>';
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    loadProfile();
    loadOrders();
  });
})();
