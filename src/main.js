/* ─────────────────────────────────────────
   BSH-320IPSN-28-G — Scroll-driven cinema
───────────────────────────────────────── */

const TOTAL_FRAMES = 224;
const FRAME_PATH = (n) => `/ezgif-frame-${String(n).padStart(3, '0')}.jpg`;

// Scroll progress windows for each overlay phase
// [fadeInStart, peakStart, peakEnd, fadeOutEnd]
const PHASES = {
  hero:        [0.00, 0.03, 0.10, 0.18],
  engineering: [0.13, 0.18, 0.36, 0.44],
  ai:          [0.39, 0.44, 0.61, 0.68],
  internals:   [0.63, 0.68, 0.81, 0.88],
  final:       [0.83, 0.88, 0.97, 1.00],
};

// ─── State ───────────────────────────────
const frames = new Array(TOTAL_FRAMES).fill(null);
let currentFrameIndex = -1;
let scrollTicking = false;

const canvas = document.getElementById('product-canvas');
const ctx = canvas.getContext('2d', { alpha: false });
const progressBar = document.getElementById('scroll-progress-bar');
const navbar = document.getElementById('navbar');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileMenu = document.getElementById('mobileMenu');
const ambientGlow = document.getElementById('ambient-glow');
const scrollContainer = document.getElementById('scroll-container');

const overlayIds = ['hero', 'engineering', 'ai', 'internals', 'final'];
const overlayEls = {};
overlayIds.forEach(id => {
  overlayEls[id] = document.getElementById(`overlay-${id}`);
});

// ─── Loader ──────────────────────────────
const loaderEl = document.createElement('div');
loaderEl.id = 'loader';
loaderEl.innerHTML = `
  <span class="loader-label">Initializing</span>
  <div class="loader-bar-track">
    <div class="loader-bar-fill" id="loaderFill"></div>
  </div>`;
document.body.appendChild(loaderEl);
const loaderFill = document.getElementById('loaderFill');

// ─── Canvas sizing ───────────────────────
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const idx = currentFrameIndex >= 0 ? currentFrameIndex : 0;
  if (frames[idx]) drawFrame(idx);
}

// ─── Draw frame ──────────────────────────
function drawFrame(index) {
  const img = frames[index];
  if (!img || !img.complete || img.naturalWidth === 0) return;

  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const cw = canvas.width;
  const ch = canvas.height;

  ctx.fillStyle = '#141820';
  ctx.fillRect(0, 0, cw, ch);

  // Cover-fill: fill entire canvas preserving aspect ratio
  const scale = Math.max(cw / iw, ch / ih);
  const sw = iw * scale;
  const sh = ih * scale;
  const sx = (cw - sw) / 2;
  const sy = (ch - sh) / 2;

  ctx.drawImage(img, sx, sy, sw, sh);
  currentFrameIndex = index;
}

// ─── Preload ─────────────────────────────
function preloadFrames() {
  return new Promise((resolve) => {
    let settled = 0;

    const onSettled = () => {
      settled++;
      if (loaderFill) {
        loaderFill.style.width = `${Math.round((settled / TOTAL_FRAMES) * 100)}%`;
      }
      if (settled === TOTAL_FRAMES) resolve();
    };

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      const capturedIndex = i;
      img.onload = () => {
        frames[capturedIndex] = img;
        if (capturedIndex === 0) {
          resizeCanvas();
          drawFrame(0);
          overlayEls.hero.style.opacity = '1';
          overlayEls.hero.classList.add('visible');
        }
        onSettled();
      };
      img.onerror = onSettled;
      img.src = FRAME_PATH(i + 1);
    }
  });
}

// ─── Opacity from phase ──────────────────
function phaseOpacity(progress, phase) {
  const [fi, pi, po, fo] = phase;
  if (progress <= fi || progress >= fo) return 0;
  if (progress >= pi && progress <= po) return 1;
  if (progress < pi) return (progress - fi) / (pi - fi);
  return 1 - (progress - po) / (fo - po);
}

// ─── Scroll update ───────────────────────
function onScroll() {
  if (scrollTicking) return;
  scrollTicking = true;
  requestAnimationFrame(update);
}

function update() {
  scrollTicking = false;

  const maxScroll = scrollContainer.offsetHeight - window.innerHeight;
  const raw = window.scrollY;
  const progress = maxScroll > 0 ? Math.min(1, Math.max(0, raw / maxScroll)) : 0;

  // Progress bar
  progressBar.style.width = `${progress * 100}%`;

  // Canvas frame
  const frameIndex = Math.min(
    TOTAL_FRAMES - 1,
    Math.round(progress * (TOTAL_FRAMES - 1))
  );
  if (frameIndex !== currentFrameIndex) {
    drawFrame(frameIndex);
  }

  // Navbar glass
  navbar.classList.toggle('scrolled', raw > 50);

  // Ambient glow intensity
  const inAI = progress > 0.38 && progress < 0.68;
  ambientGlow.style.opacity = inAI ? '1.5' : '1';

  // Overlays
  overlayIds.forEach(id => {
    const el = overlayEls[id];
    if (!el) return;
    const opacity = phaseOpacity(progress, PHASES[id]);
    el.style.opacity = opacity;
    el.style.pointerEvents = opacity > 0.1 ? 'auto' : 'none';
  });
}

// ─── Mobile nav ──────────────────────────
mobileMenuBtn?.addEventListener('click', () => {
  mobileMenu?.classList.toggle('open');
});

mobileMenu?.querySelectorAll('a').forEach(a =>
  a.addEventListener('click', () => mobileMenu?.classList.remove('open'))
);

// ─── Smooth-scroll anchors ────────────────
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// ─── Spec-card reveal on scroll ───────────
function initIntersection() {
  const observer = new IntersectionObserver(
    entries => entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.opacity = '1';
        e.target.style.transform = 'translateY(0)';
        observer.unobserve(e.target);
      }
    }),
    { threshold: 0.12 }
  );

  document.querySelectorAll('.spec-group, .trust-item').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
  });
}

// ─── Init ────────────────────────────────
async function init() {
  resizeCanvas();

  await preloadFrames();

  loaderEl.classList.add('hidden');
  setTimeout(() => loaderEl.remove(), 900);

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', resizeCanvas);

  initIntersection();
  update();
}

init();
