/* ============================================================================
   SUPABASE CLIENT
   ============================================================================
   PRODUCT STRATEGY — LOCAL-FIRST, NO HANGING:
   1. getProducts() returns all 5111 local products INSTANTLY (synchronous).
      No network wait. Shop always shows all products immediately.
   2. After first render, the app can call applyProductOverrides() in background
      to pick up any admin-edited prices/photos from Supabase (3-sec timeout).
   3. Admin panel reads/writes directly to Supabase for full management.
   ============================================================================ */
(function () {
  var cfg = window.SITE_CONFIG || {};
  var client = null;
  var connected = false;

  try {
    if (
      window.supabase &&
      cfg.SUPABASE_URL &&
      cfg.SUPABASE_ANON_KEY &&
      !cfg.SUPABASE_URL.includes('YOUR-PROJECT-REF')
    ) {
      client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
      connected = true;
    }
  } catch (e) {
    console.warn('Supabase init error:', e);
  }

  /* -------- SETTINGS ---------------------------------------------------- */
  var settingsCache = null;
  var _settingsFetchTime = 0;
  var _SETTINGS_TTL = 60 * 60 * 1000; // 1-hour TTL — fresh on new session

  async function getSettings() {
    var now = Date.now();
    // Return cache if it exists and is still fresh
    if (settingsCache && settingsCache.upi_id && (now - _settingsFetchTime < _SETTINGS_TTL)) return settingsCache;
    if (settingsCache && !connected) return settingsCache;

    var fb = {
      upi_id:           cfg.UPI_ID_FALLBACK       || 'visu9474-1@oksbi',
      upi_phone:        cfg.UPI_PHONE_FALLBACK    || '9003276226',
      wa_number:        cfg.WA_NUMBER_FALLBACK     || '918300633810',
      business_name:    cfg.BUSINESS_NAME          || "Srivalli's The Beauty Shop Cosmetics",
      business_address: cfg.BUSINESS_ADDRESS       || 'Ground Floor, Shop No-626B, Eswar Tower, Near Vani Sweets, Periyakulam Main Road, Theni-625531, Tamil Nadu',
      site_url:         cfg.SITE_URL               || '',
      instagram_url:    cfg.INSTAGRAM_URL_FALLBACK || '',
      youtube_url:      cfg.YOUTUBE_URL_FALLBACK   || '',
      razorpay_key_id:  ''
    };
    if (!connected) return (settingsCache = fb);

    try {
      var r = await Promise.race([
        client.from('settings').select('key,value'),
        new Promise(function(res){ setTimeout(function(){ res({data:null, error:'timeout'}); }, 5000); })
      ]);
      if (!r.error && r.data && r.data.length) {
        r.data.forEach(function(row) { if (row.value) fb[row.key] = row.value; });
      }
    } catch(e) {
      // Network error — use fallback values
    }
    // Always cache the result (keyed on upi_id being present)
    if (fb.upi_id) { settingsCache = fb; _settingsFetchTime = Date.now(); }
    return fb;
  }

  function clearSettingsCache() { settingsCache = null; _settingsFetchTime = 0; }

  /* -------- PRODUCTS — returns ALL 5111 INSTANTLY from local data -------- */
  function getProducts() {
    // SYNCHRONOUS — no awaiting, no network, returns all 5111 right away
    return Promise.resolve(
      (window.PRODUCTS_DATA || []).map(function(p) {
        return {
          id:       p.id,
          name:     p.name,
          category: p.category,
          price:    Number(p.price) || 0,
          image:    null
        };
      })
    );
  }

  // Called AFTER shop first renders. Uses get_modified_products() RPC which returns
  // ALL admin-edited products (where updated_at > created_at), including
  // price, discount, image, active — so every admin change reflects on website.
  async function getProductOverrides() {
    if (!connected) return {};
    try {
      var r = await Promise.race([
        client.rpc('get_modified_products'),
        new Promise(function(res){ setTimeout(function(){ res({data:null,error:'timeout'}); }, 5000); })
      ]);
      if (!r.error && r.data && r.data.length) {
        var map = {};
        r.data.forEach(function(p){ if (p.item_code) map[p.item_code] = p; });
        return map;
      }
    } catch(e) {
      console.warn('Product overrides fetch failed:', e.message || e);
    }
    return {};
  }

  /* -------- SERVICES / COURSES ------------------------------------------ */
  var D_SERVICES = ['Facial','Steam Bath','Hair Style','Bridal Makeup','Hair Extensions','Saree Draping','Nail Art'].map(function(n){return{name:n,description:''};});
  var D_COURSES = {
    basic: ['Threading','Facial','Hair Cuts','Normal Makeup'].map(function(n){return{name:n,description:''};} ),
    advanced: ['Hair Extensions','Hydra Facial','HD Makeup','Airbrush Makeup','Party Makeup','Hair Styling','Nail Art'].map(function(n){return{name:n,description:''};})
  };

  async function getServices() {
    if (!connected) return D_SERVICES;
    try {
      var r = await Promise.race([client.from('services').select('id,name,description,image_url').eq('active',true).order('sort_order',{ascending:true}), new Promise(function(res){setTimeout(function(){res({data:null,error:'timeout'});},4000);})]);
      if (!r.error && r.data && r.data.length) return r.data;
    } catch(e){}
    return D_SERVICES;
  }
  async function getCourses() {
    if (!connected) return D_COURSES;
    try {
      var r = await Promise.race([client.from('courses').select('id,name,level,description,image_url').eq('active',true).order('sort_order',{ascending:true}), new Promise(function(res){setTimeout(function(){res({data:null,error:'timeout'});},4000);})]);
      if (!r.error && r.data && r.data.length) {
        return {basic:r.data.filter(function(c){return c.level==='basic';}),advanced:r.data.filter(function(c){return c.level==='advanced';})};
      }
    } catch(e){}
    return D_COURSES;
  }

  /* -------- ORDERS ------------------------------------------------------- */
  async function createOrder(order) {
    if (!connected) {
      console.warn('Supabase not connected: order not saved to DB.');
      return { id:'LOCAL-'+Date.now(), order_number:'PENDING-SETUP', saved:false };
    }
    var r = await client.from('orders').insert(order).select().single();
    if (r.error) throw r.error;
    return Object.assign({}, r.data, { saved:true });
  }

  /* ─── CATEGORY MANAGEMENT ──────────────────────────────────────────── */
  async function getCategories() {
    if (!connected) return null;
    try {
      var r = await Promise.race([
        client.from('categories').select('id,name,sort_order,active,is_custom').order('sort_order'),
        new Promise(function(res){ setTimeout(function(){ res({data:null,error:'timeout'}); }, 4000); })
      ]);
      if (!r.error && r.data && r.data.length) return r.data;
    } catch(e) {}
    return null;
  }
  async function adminGetCategories() {
    if (!connected) return [];
    try {
      var r = await client.from('categories').select('*').order('sort_order');
      if (!r.error && r.data) return r.data;
    } catch(e) {}
    return [];
  }
  async function adminAddCategory(name, sortOrder) {
    if (!connected) throw new Error('Not connected.');
    var r = await client.from('categories')
      .insert({ name: name.trim(), sort_order: sortOrder||999, active: true, is_custom: true })
      .select().single();
    if (r.error) throw r.error;
    return r.data;
  }
  async function adminToggleCategory(id, active) {
    if (!connected) throw new Error('Not connected.');
    var r = await client.from('categories').update({ active: !!active }).eq('id', id);
    if (r.error) throw r.error;
    return true;
  }
  async function adminUpdateCategory(id, fields) {
    if (!connected) throw new Error('Not connected.');
    var r = await client.from('categories').update(fields).eq('id', id);
    if (r.error) throw r.error;
  }
  async function adminDeleteCategory(id) {
    if (!connected) throw new Error('Not connected.');
    var r = await client.from('categories').delete().eq('id', id).eq('is_custom', true);
    if (r.error) throw r.error;
  }
  async function uploadPaymentScreenshot(file, orderNumber) {
    if (!connected || !file) return null;
    var path = orderNumber+'-'+Date.now()+'-'+file.name;
    var r = await client.storage.from('payment-screenshots').upload(path, file);
    if (r.error) { console.warn('Screenshot upload failed:', r.error); return null; }
    return path;
  }

  /* -------- AUTH --------------------------------------------------------- */
  async function signIn(email, password) {
    if (!connected) throw new Error('Supabase not connected.');
    var r = await client.auth.signInWithPassword({ email:email, password:password });
    if (r.error) throw r.error;
    return r.data;
  }
  async function signOut() { if (connected) await client.auth.signOut(); }
  async function getSession() {
    if (!connected) return null;
    var r = await client.auth.getSession();
    return r.data.session;
  }
  async function isCurrentUserAdmin() {
    if (!connected) return false;
    var s = await getSession();
    if (!s) return false;
    try {
      var r = await client.from('user_roles').select('role').eq('user_id', s.user.id).single();
      return (!r.error && r.data && r.data.role === 'admin');
    } catch(e){ return false; }
  }

  /* My Orders — customer-facing order history (RLS: auth.uid() = user_id) */
  async function getMyOrders() {
    if (!connected) return [];
    try {
      var s = await getSession();
      if (!s) return [];
      var r = await client.from('orders').select('*')
        .eq('user_id', s.user.id)
        .order('created_at', { ascending:false });
      if (r.error) { console.error('getMyOrders error:', r.error); return []; }
      return r.data || [];
    } catch(e) {
      console.error('getMyOrders exception:', e);
      return [];
    }
  }

  /* -------- ADMIN WRITE ------------------------------------------------- */
  async function adminUpsertProduct(p) { if(!connected) throw new Error('Not connected.'); var r=await client.from('products').upsert(p).select(); if(r.error) throw r.error; return r.data; }
  async function adminDeleteProduct(id) { if(!connected) throw new Error('Not connected.'); var r=await client.from('products').delete().eq('id',id); if(r.error) throw r.error; }
  async function adminUpsertService(row) { if(!connected) throw new Error('Not connected.'); var r=await client.from('services').upsert(row).select(); if(r.error) throw r.error; return r.data; }
  async function adminUpsertCourse(row) { if(!connected) throw new Error('Not connected.'); var r=await client.from('courses').upsert(row).select(); if(r.error) throw r.error; return r.data; }
  async function adminUpdateSetting(key, value) { if(!connected) throw new Error('Not connected.'); var r=await client.from('settings').upsert({key:key,value:value}); if(r.error) throw r.error; }
  async function adminListOrders() {
    if (!connected) return [];
    try {
      // Use SECURITY DEFINER RPC — works even if RLS session not fully restored
      var r = await client.rpc('get_admin_orders');
      if (r.error) {
        // Fallback: try direct table query
        console.warn('RPC failed, trying direct:', r.error.message);
        var r2 = await client.from('orders').select('*').order('created_at', {ascending:false});
        if (r2.error) { console.error('adminListOrders error:', r2.error); return []; }
        return r2.data || [];
      }
      return r.data || [];
    } catch(e) {
      console.error('adminListOrders exception:', e);
      return [];
    }
  }
  async function adminUpdateOrder(id, fields) { if(!connected) throw new Error('Not connected.'); var r=await client.from('orders').update(fields).eq('id',id); if(r.error) throw r.error; }
  async function adminUploadImage(file, folder) {
    if (!connected || !file) return null;
    var path = folder+'/'+Date.now()+'-'+file.name;
    var r = await client.storage.from('site-images').upload(path, file, {upsert:true});
    if (r.error) throw r.error;
    return client.storage.from('site-images').getPublicUrl(path).data.publicUrl;
  }
  async function adminGetScreenshotUrl(path) {
    if (!connected || !path) return null;
    var r = await client.storage.from('payment-screenshots').createSignedUrl(path, 3600);
    return r.error ? null : r.data.signedUrl;
  }

  window.db = {
    isConnected: function(){ return connected; },
    getSettings: getSettings,
    clearSettingsCache: clearSettingsCache,
    getProducts: getProducts,
    getCategories: getCategories,
    adminGetCategories: adminGetCategories,
    adminAddCategory: adminAddCategory,
    adminUpdateCategory: adminUpdateCategory,
    adminDeleteCategory: adminDeleteCategory,
    getProductOverrides: getProductOverrides,
    getServices: getServices,
    getCourses: getCourses,
    createOrder: createOrder,
    uploadPaymentScreenshot: uploadPaymentScreenshot,
    signIn: signIn, signOut: signOut,
    getSession: getSession,
    isCurrentUserAdmin: isCurrentUserAdmin,
    getMyOrders: getMyOrders,
    adminUpsertProduct: adminUpsertProduct,
    adminDeleteProduct: adminDeleteProduct,
    adminUpsertService: adminUpsertService,
    adminUpsertCourse: adminUpsertCourse,
    adminUpdateSetting: adminUpdateSetting,
    adminListOrders: adminListOrders,
    adminUpdateOrder: adminUpdateOrder,
    adminUploadImage: adminUploadImage,
    adminGetScreenshotUrl: adminGetScreenshotUrl
  };
})();
