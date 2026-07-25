/* ============================================================================
   CINEMA.JS — 4K Cinematic Home Page Animation
   Premium luxury cosmetics feel: bokeh glows, sparkle gem particles,
   falling rose petals, aurora shimmer, parallax on hero visual.
   Pure canvas + CSS — no external libraries, no images needed.
   ========================================================================= */
(function () {
  var hero, canvas, ctx, W, H;
  var raf = null;

  var COLORS = [
    { r: 201, g: 160, b: 124 },  // rose gold
    { r: 242, g: 182, b: 168 },  // peach
    { r: 201, g: 162, b: 39  },  // gold
    { r: 255, g: 230, b: 200 },  // warm white
    { r: 232, g: 146, b: 124 },  // deep peach
    { r: 220, g: 180, b: 220 },  // lavender blush
  ];

  /* ---------- Particles (sparkle gems) ---------------------------------- */
  var particles = [];
  var NUM_P = 180;
  function initParticles() {
    particles = [];
    for (var i = 0; i < NUM_P; i++) {
      var c = COLORS[Math.floor(Math.random() * COLORS.length)];
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.6 + Math.random() * 2.8,
        dx: (Math.random() - 0.5) * 0.08,
        dy: -0.03 - Math.random() * 0.12,
        alpha: Math.random(),
        aDir: (Math.random() > 0.5 ? 1 : -1) * (0.002 + Math.random() * 0.004),
        color: c,
        phase: Math.random() * Math.PI * 2,
        isStar: Math.random() > 0.55
      });
    }
  }

  /* ---------- Bokeh blobs (large soft glow circles) ---------------------- */
  var bokeh = [];
  var NUM_B = 9;
  function initBokeh() {
    bokeh = [];
    var positions = [
      [0.7, 0.25], [0.85, 0.6], [0.5, 0.15],
      [0.3, 0.7], [0.9, 0.1], [0.15, 0.3],
      [0.6, 0.8], [0.1, 0.9], [0.4, 0.45]
    ];
    for (var i = 0; i < NUM_B; i++) {
      var c = COLORS[i % COLORS.length];
      bokeh.push({
        x: positions[i][0] * W,
        y: positions[i][1] * H,
        r: 80 + Math.random() * 180,
        baseAlpha: 0.025 + Math.random() * 0.045,
        phase: Math.random() * Math.PI * 2,
        speed: 0.001 + Math.random() * 0.002,
        color: c
      });
    }
  }

  /* ---------- Aurora shimmer overlay ------------------------------------ */
  var auroraPhase = 0;
  function drawAurora() {
    auroraPhase += 0.003;
    var grad = ctx.createLinearGradient(0, 0, W, H);
    var s1 = Math.sin(auroraPhase);
    var s2 = Math.sin(auroraPhase * 1.3 + 1.2);
    var a1 = 0.03 + 0.02 * s1;
    var a2 = 0.02 + 0.015 * s2;
    grad.addColorStop(0,    'rgba(201,160,124,' + a1 + ')');
    grad.addColorStop(0.35, 'rgba(201,162,39,' + a2 + ')');
    grad.addColorStop(0.65, 'rgba(242,182,168,' + a1 + ')');
    grad.addColorStop(1,    'rgba(201,160,124,' + a2 + ')');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  /* ---------- Lens flash (occasional golden streak) ---------------------- */
  var flashTimer = 0;
  var flashDur = 0;
  var flashX = 0;
  var flashY = 0;
  var flashInterval = 220;
  function drawFlash(frame) {
    if (frame - flashTimer > flashInterval) {
      flashTimer = frame;
      flashInterval = 180 + Math.floor(Math.random() * 200);
      flashX = W * (0.5 + Math.random() * 0.4);
      flashY = H * (0.1 + Math.random() * 0.4);
      flashDur = 28;
    }
    if (flashDur > 0) {
      var progress = 1 - (flashDur / 28);
      var alpha = Math.sin(progress * Math.PI) * 0.55;
      var len = 90 + Math.random() * 60;
      var grad = ctx.createLinearGradient(flashX - len, flashY, flashX + len, flashY);
      grad.addColorStop(0,   'rgba(255,220,120,0)');
      grad.addColorStop(0.5, 'rgba(255,240,180,' + alpha + ')');
      grad.addColorStop(1,   'rgba(255,220,120,0)');
      ctx.save();
      ctx.translate(flashX, flashY);
      ctx.rotate(Math.PI / 5);
      ctx.beginPath();
      ctx.rect(-len, -2, len * 2, 4);
      ctx.fillStyle = grad;
      ctx.fill();
      // cross streak
      ctx.rotate(-Math.PI / 2.5);
      var grad2 = ctx.createLinearGradient(-len * 0.6, 0, len * 0.6, 0);
      grad2.addColorStop(0,   'rgba(255,220,120,0)');
      grad2.addColorStop(0.5, 'rgba(255,240,180,' + (alpha * 0.6) + ')');
      grad2.addColorStop(1,   'rgba(255,220,120,0)');
      ctx.beginPath();
      ctx.rect(-len * 0.6, -1.5, len * 1.2, 3);
      ctx.fillStyle = grad2;
      ctx.fill();
      ctx.restore();
      flashDur--;
    }
  }

  /* ---------- Draw star / gem particle ---------------------------------- */
  function drawStar(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.phase);
    ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
    ctx.fillStyle = 'rgb(' + p.color.r + ',' + p.color.g + ',' + p.color.b + ')';

    if (p.isStar && p.r > 1.2) {
      var sr = p.r;
      var inner = sr * 0.32;
      var pts = 4;
      ctx.beginPath();
      for (var k = 0; k < pts * 2; k++) {
        var angle = (k / (pts * 2)) * Math.PI * 2 - Math.PI / 2;
        var radius = k % 2 === 0 ? sr : inner;
        var px = Math.cos(angle) * radius;
        var py = Math.sin(angle) * radius;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      // glow halo
      ctx.globalAlpha = p.alpha * 0.25;
      ctx.beginPath();
      ctx.arc(0, 0, sr * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgb(' + p.color.r + ',' + p.color.g + ',' + p.color.b + ')';
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /* ---------- Main render loop ------------------------------------------ */
  var frame = 0;
  var _lastTs = 0;   // must live OUTSIDE render() so it persists across frames
  function render(timestamp) {
    // Cap to 60fps — prevents overload on low-end Android AND prevents
    // 90Hz/120Hz Android screens from running the animation 1.5x-2x too fast
    var elapsed = timestamp - _lastTs;
    if (elapsed < 14) { raf = requestAnimationFrame(render); return; }
    _lastTs = timestamp;
    raf = requestAnimationFrame(render);
    ctx.clearRect(0, 0, W, H);

    // aurora shimmer
    drawAurora();

    // bokeh
    for (var i = 0; i < bokeh.length; i++) {
      var b = bokeh[i];
      b.phase += b.speed;
      var a = b.baseAlpha * (0.6 + 0.4 * Math.sin(b.phase));
      var g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      g.addColorStop(0, 'rgba(' + b.color.r + ',' + b.color.g + ',' + b.color.b + ',' + a + ')');
      g.addColorStop(1, 'rgba(' + b.color.r + ',' + b.color.g + ',' + b.color.b + ',0)');
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
    }

    // particles
    for (var j = 0; j < particles.length; j++) {
      var p = particles[j];
      p.phase += 0.025;
      p.alpha += p.aDir;
      if (p.alpha >= 1 || p.alpha <= 0) p.aDir = -p.aDir;
      p.x += p.dx + Math.sin(p.phase) * 0.06;
      p.y += p.dy;
      if (p.y < -12) {
        p.y = H + 12;
        p.x = Math.random() * W;
        p.alpha = 0;
      }
      if (p.x < -10) p.x = W + 10;
      if (p.x > W + 10) p.x = -10;
      drawStar(p);
    }

    // lens flash
    drawFlash(frame);

    frame++;
  }

  /* ---------- Pulsing glow ring behind hero visual ----------------------- */
  function injectGlowRing(heroEl) {
    var ring = document.createElement('div');
    ring.className = 'cinema-glow-ring';
    ring.setAttribute('aria-hidden', 'true');
    heroEl.appendChild(ring);
  }

  /* ---------- Falling rose petals --------------------------------------- */
  function injectPetals(heroEl) {
    var petalColors = ['#F2B6A8','#E8927C','#C9A07C','#E9C9B4','#C9486B','#DDAA88'];
    var N = 22;
    for (var i = 0; i < N; i++) {
      var wrap = document.createElement('div');
      wrap.className = 'cinema-petal';
      wrap.setAttribute('aria-hidden', 'true');
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 28 38');
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      // alternating petal shapes
      if (i % 3 === 0) {
        path.setAttribute('d', 'M14 2 Q26 9 20 23 Q14 36 8 23 Q2 9 14 2Z');
      } else if (i % 3 === 1) {
        path.setAttribute('d', 'M14 4 C22 4 26 14 22 24 C18 34 10 34 6 24 C2 14 6 4 14 4Z');
      } else {
        path.setAttribute('d', 'M14 1 Q22 8 18 20 Q14 36 10 20 Q6 8 14 1Z');
      }
      path.setAttribute('fill', petalColors[i % petalColors.length]);
      path.setAttribute('opacity', (0.55 + Math.random() * 0.35).toFixed(2));
      svg.appendChild(path);
      wrap.appendChild(svg);

      var size   = 14 + Math.random() * 18;
      var left   = Math.random() * 105;
      var dur    = 7 + Math.random() * 9;
      var delay  = -Math.random() * 14;
      var sway   = 50 + Math.random() * 80;
      var rot    = 180 + Math.random() * 540;
      wrap.style.cssText = [
        'position:absolute',
        'top:-70px',
        'left:' + left + '%',
        'width:' + size + 'px',
        'height:' + (size * 1.35) + 'px',
        'pointer-events:none',
        'z-index:1',
        '--sway:' + sway + 'px',
        '--rot:' + rot + 'deg',
        'animation:petalFall ' + dur.toFixed(1) + 's linear ' + delay.toFixed(1) + 's infinite'
      ].join(';');
      heroEl.appendChild(wrap);
    }
  }

  /* ---------- Parallax -------------------------------------------------- */
  function initParallax(heroEl) {
    var visual = heroEl.querySelector('.hero-visual');
    if (!visual) return;
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var sc = window.pageYOffset;
        var hH = heroEl.offsetHeight;
        if (sc < hH) {
          visual.style.transform = 'translateY(' + (sc * 0.22) + 'px)';
        }
        ticking = false;
      });
    }, { passive: true });
  }

  /* ---------- Resize ----------------------------------------------------- */
  function resize() {
    W = hero.offsetWidth  || window.innerWidth;
    H = hero.offsetHeight || window.innerHeight;
    canvas.width  = W;
    canvas.height = H;
    initBokeh();
  }

  /* ---------- Init ------------------------------------------------------- */
  function init() {
    hero = document.getElementById('home');
    if (!hero) return;

    // canvas
    canvas = document.createElement('canvas');
    canvas.className = 'cinema-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    // GPU acceleration for smooth animation on all Android/iOS devices
    canvas.style.willChange   = 'transform';
    canvas.style.transform    = 'translate3d(0,0,0)';
    canvas.style.webkitTransform = 'translate3d(0,0,0)';
    canvas.style.backfaceVisibility = 'hidden';
    canvas.style.webkitBackfaceVisibility = 'hidden';
    hero.insertBefore(canvas, hero.firstChild);
    ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });

    resize();
    initParticles();

    var ro = window.ResizeObserver
      ? new window.ResizeObserver(resize)
      : null;
    if (ro) ro.observe(hero);
    else window.addEventListener('resize', resize, { passive: true });

    injectGlowRing(hero);
    injectPetals(hero);
    initParallax(hero);
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
