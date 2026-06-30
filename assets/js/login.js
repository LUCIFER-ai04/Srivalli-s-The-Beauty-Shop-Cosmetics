/* ============================================================================
   LOGIN.JS — Google OAuth + email/password
   
   ADMIN LOGIN FIX:
   - After ANY login (Google or email), checks if user is admin
   - If admin email → auto-redirect to admin.html
   - If regular user → redirect to returnTo or index.html
   ============================================================================ */
(function () {
  var SC = window.SITE_CONFIG || {};
  var ADMIN_EMAILS = ['saravanakumarbuvana@gmail.com','thebeautyshopcbe@gmail.com'];
  var _client = null;

  function sbClient() {
    if (!_client && window.supabase && SC.SUPABASE_URL && SC.SUPABASE_ANON_KEY) {
      _client = window.supabase.createClient(SC.SUPABASE_URL, SC.SUPABASE_ANON_KEY);
    }
    return _client;
  }

  function showAlert(msg, type) {
    var a = document.getElementById('loginAlert');
    if (a) a.innerHTML = '<div class="alert alert-' + (type||'error') + '" role="alert">' + msg + '</div>';
  }

  function setBtn(id, disabled, text) {
    var b = document.getElementById(id);
    if (!b) return;
    b.disabled = !!disabled;
    if (text) { b.querySelector('span') ? b.querySelector('span').textContent = text : (b.textContent = text); }
  }

  /* After login, decide where to redirect */
  function afterLoginRedirect(email) {
    // ADMIN FIX: Always send admin email to admin panel
    if (ADMIN_EMAILS.indexOf(email) > -1) {
      showAlert('\u2713 Admin login successful! Opening admin panel\u2026', 'success');
      setTimeout(function() { window.location.replace('admin.html'); }, 500);
      return;
    }
    // Regular users go back to where they came from
    var returnTo = 'index.html';
    try {
      var r = sessionStorage.getItem('returnTo');
      if (r && r.indexOf('login.html') < 0 && r.indexOf('admin.html') < 0) returnTo = r;
    } catch(e){}
    showAlert('\u2713 Signed in! Redirecting\u2026', 'success');
    setTimeout(function() { window.location.replace(returnTo); }, 400);
  }

  /* Check if returning from Google OAuth callback */
  async function checkOAuthCallback() {
    var client = sbClient();
    if (!client) return false;

    // OAuth callback: Supabase puts session info in URL hash
    if (window.location.hash && window.location.hash.indexOf('access_token') > -1) {
      showAlert('Completing Google sign-in\u2026', 'info');
      try {
        await new Promise(function(r){ setTimeout(r, 300); }); // let Supabase parse hash
        var res = await client.auth.getSession();
        if (res.data && res.data.session) {
          afterLoginRedirect(res.data.session.user.email || '');
          return true;
        }
      } catch(e) { console.error('OAuth callback error:', e); }
    }

    // Check if already logged in (returning user, refreshed page)
    try {
      var sess = await client.auth.getSession();
      if (sess.data && sess.data.session) {
        afterLoginRedirect(sess.data.session.user.email || '');
        return true;
      }
    } catch(e) {}

    return false;
  }

  /* Google sign-in */
  function handleGoogleLogin() {
    var client = sbClient();
    if (!client) {
      showAlert('Authentication service unavailable. Please refresh the page and try again.');
      return;
    }
    var btn = document.getElementById('googleLoginBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = btn.innerHTML.replace('Continue with Google', 'Opening Google\u2026'); }
    showAlert('Redirecting to Google\u2026', 'info');

    var redirectTo = window.location.origin +
      window.location.pathname.replace(/[^\/]*$/, '') + 'login.html';

    client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectTo }
    }).then(function(res) {
      if (res.error) {
        var m = res.error.message || '';
        if (m.toLowerCase().indexOf('provider') > -1 || m.toLowerCase().indexOf('enabled') > -1) {
          showAlert(
            '<b>Google login is not activated yet.</b><br>' +
            'Go to <a href="https://supabase.com/dashboard/project/edwlwrpjilipvdlpjtxr/auth/providers" ' +
            'target="_blank" rel="noopener" style="color:var(--berry);">Supabase &rarr; Auth &rarr; Providers &rarr; Google</a> ' +
            'and enable it with your Client ID and Secret, then try again.'
          );
          // Auto-show admin email form as fallback
          var adminSection = document.getElementById('adminEmailSection');
          if (adminSection) adminSection.style.display = 'block';
        } else {
          showAlert(m || 'Google sign-in failed. Please try the email login below.');
        }
        if (btn) { btn.disabled = false; btn.innerHTML = btn.innerHTML.replace('Opening Google\u2026', 'Continue with Google'); }
      }
    }).catch(function(e) {
      showAlert('Google sign-in error: ' + (e.message || 'Please try again.'));
      if (btn) btn.disabled = false;
    });
  }

  /* Email/password login */
  function handleEmailLogin(e) {
    e.preventDefault();
    var emailEl    = document.getElementById('loginEmail');
    var passwordEl = document.getElementById('loginPassword');
    var email      = emailEl ? emailEl.value.trim() : '';
    var password   = passwordEl ? passwordEl.value : '';

    if (!email)    { showAlert('Please enter your email address.'); emailEl && emailEl.focus(); return; }
    if (!password) { showAlert('Please enter your password.'); passwordEl && passwordEl.focus(); return; }

    var client = sbClient();
    if (!client) { showAlert('Authentication service unavailable. Please refresh.'); return; }

    var btn = document.getElementById('emailLoginBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Signing in\u2026'; }
    showAlert('Signing in\u2026', 'info');

    client.auth.signInWithPassword({ email: email, password: password })
      .then(function(res) {
        if (res.error) {
          var msg = res.error.message || 'Login failed.';
          if (/invalid|credentials|wrong|incorrect/i.test(msg)) msg = 'Incorrect email or password. Please try again.';
          if (/email.*confirm/i.test(msg)) msg = 'Please confirm your email address first.';
          showAlert(msg);
          if (btn) { btn.disabled = false; btn.textContent = 'Log In'; }
          return;
        }
        if (res.data && res.data.session) {
          afterLoginRedirect(res.data.session.user.email || '');
        }
      })
      .catch(function(e) {
        showAlert('Login error: ' + (e.message || 'Please try again.'));
        if (btn) { btn.disabled = false; btn.textContent = 'Log In'; }
      });
  }

  /* Init */
  document.addEventListener('DOMContentLoaded', function() {
    checkOAuthCallback().then(function(handled) {
      if (handled) return;

      // Wire up Google button
      var gBtn = document.getElementById('googleLoginBtn');
      if (gBtn) gBtn.addEventListener('click', handleGoogleLogin);

      // Wire up email form
      var form = document.getElementById('loginForm');
      if (form) form.addEventListener('submit', handleEmailLogin);

      // Toggle admin email section
      var toggle = document.getElementById('showAdminLogin');
      var adminSection = document.getElementById('adminEmailSection');
      if (toggle && adminSection) {
        toggle.addEventListener('click', function(e) {
          e.preventDefault();
          var shown = adminSection.style.display !== 'none';
          adminSection.style.display = shown ? 'none' : 'block';
          toggle.textContent = shown ? 'Admin email login \u25bc' : 'Hide \u25b2';
          if (!shown) {
            var emailInput = adminSection.querySelector('input[type="email"]');
            if (emailInput) setTimeout(function(){ emailInput.focus(); }, 100);
          }
        });
      }
    });
  });
})();
