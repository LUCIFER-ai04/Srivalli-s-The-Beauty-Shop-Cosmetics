/* product.js — dedicated product detail page (product.html?id=ITEM_CODE) */
(function () {

  var SC = window.SITE_CONFIG || {};

  function getParams() {
    var sp = new URLSearchParams(location.search);
    return { id: sp.get('id') };
  }

  function fmtName(str) {
    return String(str).toLowerCase().replace(/(^|\s|\/|-)([a-z\u00C0-\u024F])/g, function(m,s,c){ return s+c.toUpperCase(); });
  }

  function calcFinalPrice(price, discount) {
    if (!discount || discount <= 0) return price;
    return Math.round(price * (1 - discount/100) * 100) / 100;
  }

  function fmtPrice(n) {
    return '\u20b9' + Number(n).toLocaleString('en-IN', {maximumFractionDigits:2});
  }

  function starsHtml(avg, count) {
    avg = avg || 5;
    var s = '';
    for (var i=1; i<=5; i++) {
      if (i <= Math.round(avg)) s += '<span class="pd-star filled">&#9733;</span>';
      else s += '<span class="pd-star empty">&#9734;</span>';
    }
    return s + ' <span class="pd-rating-count">' + (count > 0 ? '(' + avg.toFixed(1) + ' &mdash; ' + count + ' review' + (count===1?'':'s') + ')' : '(0 reviews &mdash; be the first!)') + '</span>';
  }

  var currentProduct = null;
  var allReviewsData = [];

  function render(p) {
    currentProduct = p;
    var name = fmtName(p.name);
    var final = calcFinalPrice(p.price, p.discount || 0);
    document.title = name + ' | Srivalli\'s The Beauty Shop Cosmetics';

    // Photo
    var photoEl = document.getElementById('pd-photo');
    if (photoEl) {
      photoEl.innerHTML = p.image
        ? '<img src="'+p.image+'" alt="'+name+'" style="width:100%;height:100%;object-fit:cover;">'
        : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(160deg,var(--cream-deep),var(--rose-gold-l));font-size:5rem;">&#128700;</div>';

      // Load extra images from Supabase and build swipeable gallery
      if (window.db && db.getProductImages) {
        db.getProductImages(p.id).then(function(imgs) {
          var allImgs = [];
          if (p.image) allImgs.push(p.image);
          (imgs||[]).forEach(function(img){ if(img.image_url && allImgs.indexOf(img.image_url)<0) allImgs.push(img.image_url); });
          if (allImgs.length < 2) return;
          var curr = 0;
          function renderGallery() {
            photoEl.innerHTML =
              '<div id="gWrap" style="position:relative;width:100%;height:100%;overflow:hidden;touch-action:pan-y;">'+
                '<img id="gImg" src="'+allImgs[curr]+'" alt="'+name+' '+(curr+1)+' of '+allImgs.length+'" '+
                  'style="width:100%;height:100%;object-fit:cover;display:block;">'+
                (curr>0 ? '<button onclick="window.__gPrev()" style="position:absolute;left:8px;top:50%;transform:translateY(-50%);'+
                  'background:rgba(0,0,0,.45);color:#fff;border:none;border-radius:50%;width:38px;height:38px;'+
                  'font-size:1.3rem;cursor:pointer;z-index:2;line-height:1;">&#8249;</button>' : '')+
                (curr<allImgs.length-1 ? '<button onclick="window.__gNext()" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);'+
                  'background:rgba(0,0,0,.45);color:#fff;border:none;border-radius:50%;width:38px;height:38px;'+
                  'font-size:1.3rem;cursor:pointer;z-index:2;line-height:1;">&#8250;</button>' : '')+
                '<div style="position:absolute;bottom:10px;left:0;right:0;display:flex;justify-content:center;gap:6px;z-index:2;">'+
                  allImgs.map(function(_,i){ return '<span style="width:'+(i===curr?'18':'8')+'px;height:8px;border-radius:4px;'+
                    'background:'+(i===curr?'#fff':'rgba(255,255,255,.55)')+';transition:.25s;"></span>'; }).join('')+
                '</div>'+
              '</div>';
            var wrap = photoEl.querySelector('#gWrap'), tx=0;
            if(wrap) {
              wrap.addEventListener('touchstart',function(e){tx=e.touches[0].clientX;},{passive:true});
              wrap.addEventListener('touchend',function(e){
                var dx=tx-e.changedTouches[0].clientX;
                if(Math.abs(dx)>40){if(dx>0&&curr<allImgs.length-1){curr++;renderGallery();}else if(dx<0&&curr>0){curr--;renderGallery();}}
              },{passive:true});
            }
          }
          window.__gPrev=function(){if(curr>0){curr--;renderGallery();}};
          window.__gNext=function(){if(curr<allImgs.length-1){curr++;renderGallery();}};
          renderGallery();
        }).catch(function(){});
      }
    }

    // Share bar
    var shareEl = document.getElementById('pd-share');
    if (shareEl) {
      var shareUrl = window.location.href;
      var shareText = encodeURIComponent('Check out ' + name + ' on Srivalli\'s The Beauty Shop Cosmetics!');
      shareEl.innerHTML =
        '<button class="pm-share-btn" id="pdNativeShare"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/></svg> Share</button>' +
        '<a class="pm-share-btn pm-share-wa" href="https://wa.me/?text='+shareText+'%20'+encodeURIComponent(shareUrl)+'" target="_blank" rel="noopener"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.905 1.032A10.981 10.981 0 0 0 1 12.002c0 1.926.504 3.737 1.379 5.315L1 23l5.817-1.35A11.007 11.007 0 0 0 11.905 23C17.98 23 17.98 17.973 17.98 11.968 17.98 5.963 17.98 1 11.905 1z"/></svg> WhatsApp</a>' +
        '<button class="pm-share-btn pm-copy-link" id="pdCopyLink" data-url="'+shareUrl+'"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> Copy Link</button>';

      var nativeBtn = document.getElementById('pdNativeShare');
      if (nativeBtn && navigator.share) {
        nativeBtn.addEventListener('click', function(){ navigator.share({ title: name, url: shareUrl }); });
      }
      var copyBtn = document.getElementById('pdCopyLink');
      if (copyBtn) {
        copyBtn.addEventListener('click', function(){
          navigator.clipboard ? navigator.clipboard.writeText(copyBtn.dataset.url).then(function(){ if(window.shared) shared.toast('Link copied!'); }) : null;
        });
      }
    }

    // Info
    var infoEl = document.getElementById('pd-info');
    if (infoEl) {
      infoEl.innerHTML =
        '<span class="cat">' + p.category + '</span>' +
        '<h1 class="pd-name">' + name + '</h1>' +
        '<div id="pd-stars-wrap" class="pd-stars">' + starsHtml(5, 0) + '</div>';
    }

    // Pricing
    var priceEl = document.getElementById('pd-pricing');
    if (priceEl) {
      if (p.discount && p.discount > 0) {
        priceEl.innerHTML =
          '<div class="pm-price-row"><span class="pm-price-final">'+fmtPrice(final)+'</span>' +
          '<span class="pm-price-orig">'+fmtPrice(p.price)+'</span>' +
          '<span class="pm-discount-pill">'+Math.round(p.discount)+'% OFF</span></div>' +
          '<div class="pm-savings">You save '+fmtPrice(p.price-final)+'</div>';
      } else {
        priceEl.innerHTML = '<div class="pm-price-row"><span class="pm-price-final">'+fmtPrice(p.price)+'</span></div>';
      }
    }

    // Actions
    var actEl = document.getElementById('pd-actions');
    if (actEl) {
      actEl.innerHTML =
        '<button class="btn btn-primary" style="flex:1;" id="pdAddCart">Add to Cart</button>' +
        '<button class="btn btn-primary" style="flex:1;background:var(--berry);" id="pdBuyNow">\uD83D\uDED2 Proceed to Order</button>';
      var addBtn = document.getElementById('pdAddCart');
      var buyBtn = document.getElementById('pdBuyNow');
      if (addBtn && window.shared) {
        addBtn.addEventListener('click', function(){
          shared.addToCart({ id:p.id, name:p.name, category:p.category,
            price:p.price||final, discount:p.discount||0, image:p.image||null }, 1);
          addBtn.textContent = '\u2713 Added!';
          setTimeout(function(){ addBtn.textContent = 'Add to Cart'; }, 1500);
          if (window.track) track('add_to_cart', { item_name: p.name, price: final });
        });
      }
      if (buyBtn) {
        buyBtn.addEventListener('click', function(){
          if (window.shared) shared.addToCart({ id:p.id, name:p.name, category:p.category,
            price:p.price||final, discount:p.discount||0, image:p.image||null }, 1);
          if (window.cartDrawer) {
            // Open checkout directly on this page (drawer HTML now included in product.html)
            cartDrawer.open('checkout');
          } else {
            // Fallback: go to shop
            window.location.href = 'index.html';
          }
        });
      }
    }
  }

  function loadReviews(itemCode) {
    var el = document.getElementById('pd-reviews-list');
    var formEl = document.getElementById('pd-review-form-wrap');
    if (!el) return;

    if (!db || !db.isConnected()) {
      el.innerHTML = '<p style="font-size:.84rem;color:var(--ink-soft);">No reviews yet. Be the first!</p>';
      if (formEl) formEl.style.display = 'block';
      bindReviewForm(itemCode, null);
      return;
    }

    var sbClient = window.supabase && window.supabase.createClient(SC.SUPABASE_URL, SC.SUPABASE_ANON_KEY);
    if (!sbClient) { el.innerHTML = '<p style="font-size:.84rem;color:var(--ink-soft);">Reviews unavailable.</p>'; return; }

    sbClient.from('product_reviews').select('reviewer_name,rating,comment,created_at').eq('item_code', itemCode).order('created_at', {ascending:false}).limit(50)
      .then(function(res) {
        allReviewsData = res.data || [];
        renderReviewList(allReviewsData);
        if (formEl) formEl.style.display = 'block';
        bindReviewForm(itemCode, sbClient);
      }).catch(function() {
        el.innerHTML = '<p style="font-size:.84rem;color:var(--ink-soft);">Could not load reviews.</p>';
        if (formEl) formEl.style.display = 'block';
        bindReviewForm(itemCode, sbClient);
      });
  }

  function renderReviewList(reviews) {
    var el = document.getElementById('pd-reviews-list');
    if (!el) return;
    // Update stars
    if (reviews && reviews.length > 0) {
      var avg = reviews.reduce(function(s,r){ return s+r.rating; },0) / reviews.length;
      var wrap = document.getElementById('pd-stars-wrap');
      if (wrap) wrap.innerHTML = starsHtml(avg, reviews.length);
    }
    if (!reviews || !reviews.length) {
      el.innerHTML = '<p style="font-size:.84rem;color:var(--ink-soft);">No reviews yet. Be the first to leave a review below!</p>';
      return;
    }
    el.innerHTML = reviews.map(function(r) {
      var stars = '';
      for (var i=1;i<=5;i++) stars += '<span style="color:'+(i<=r.rating?'#C9A227':'#D4C5B4')+';">&#9733;</span>';
      return '<div class="review-card">'+
        '<div class="review-header"><strong>'+String(r.reviewer_name).replace(/</g,'&lt;')+'</strong>'+stars+'</div>'+
        (r.comment ? '<p class="review-comment">'+String(r.comment).replace(/</g,'&lt;')+'</p>' : '')+
        '<span class="review-date">'+new Date(r.created_at).toLocaleDateString('en-IN')+'</span>'+
      '</div>';
    }).join('');
  }

  function bindReviewForm(itemCode, sbClient) {
    var stars = document.getElementById('pd-rv-stars');
    if (!stars) return;
    stars.querySelectorAll('.star-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var v = Number(btn.dataset.v);
        var hi = document.getElementById('pd-rv-rating');
        if (hi) hi.value = v;
        stars.querySelectorAll('.star-btn').forEach(function(b,i){ b.style.color = i<v?'#C9A227':'#D4C5B4'; });
      });
    });
    var submitBtn = document.getElementById('pd-rv-submit');
    if (!submitBtn) return;
    submitBtn.addEventListener('click', function() {
      var name   = ((document.getElementById('pd-rv-name')||{}).value||'').trim();
      var rating = Number(((document.getElementById('pd-rv-rating')||{}).value)||0);
      var comment= ((document.getElementById('pd-rv-comment')||{}).value||'').trim();
      var statusEl = document.getElementById('pd-rv-status');
      if (!name || !rating) { if(statusEl) statusEl.innerHTML='<span style="color:var(--warn);">Please enter your name and select a rating.</span>'; return; }
      if (!sbClient) { if(statusEl) statusEl.innerHTML='<span style="color:var(--warn);">Reviews require an internet connection.</span>'; return; }
      submitBtn.disabled = true; submitBtn.textContent = 'Submitting\u2026';
      sbClient.from('product_reviews').insert({ item_code:itemCode, reviewer_name:name, rating:rating, comment:comment||null })
        .then(function(res) {
          if (res.error) {
            if (statusEl) statusEl.innerHTML='<span style="color:var(--warn);">Failed: '+res.error.message+'</span>';
            submitBtn.disabled = false; submitBtn.textContent = 'Submit Review';
            return;
          }
          if (statusEl) statusEl.innerHTML='<span style="color:var(--success);">\u2713 Thank you for your review!</span>';
          submitBtn.textContent = 'Submitted \u2713';
          // Add to top of list immediately so everyone sees it
          allReviewsData.unshift({ reviewer_name:name, rating:rating, comment:comment, created_at:new Date().toISOString() });
          renderReviewList(allReviewsData);
        }).catch(function(e) {
          if (statusEl) statusEl.innerHTML='<span style="color:var(--warn);">Error. Please try again.</span>';
          submitBtn.disabled = false; submitBtn.textContent = 'Submit Review';
        });
    });
  }

  function init() {
    var params = getParams();
    if (!params.id) { window.location.href = 'index.html#shop'; return; }

    // Load from local products immediately
    var local = (window.PRODUCTS_DATA || []);
    var found = null;
    for (var i=0; i<local.length; i++) { if (local[i].id === params.id) { found = local[i]; break; } }
    if (!found) { document.getElementById('pd-root') && (document.getElementById('pd-root').innerHTML = '<div class="container empty-state"><p>Product not found.</p><a href="index.html#shop" class="btn btn-primary">Back to Shop</a></div>'); return; }

    render({ id:found.id, name:found.name, category:found.category, price:found.price, discount:0, image:null });
    loadReviews(params.id);

    // Background Supabase overrides
    if (db && db.isConnected()) {
      db.getProductOverrides().then(function(overrides) {
        if (!overrides) return;
        var ov = overrides[params.id];
        if (!ov) return;
        render({
          id: found.id,
          name: ov.name || found.name,
          category: ov.category || found.category,
          price: Number(ov.price) || found.price,
          discount: Number(ov.discount) || 0,
          image: ov.image_url || null
        });
      }).catch(function(){});
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
