const header = document.querySelector('.site-header');
const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.main-nav');

window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 24);
}, { passive: true });

menuButton.addEventListener('click', () => {
  const open = !nav.classList.contains('open');
  nav.classList.toggle('open', open);
  document.body.classList.toggle('menu-open', open);
  menuButton.setAttribute('aria-expanded', String(open));
});

nav.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    nav.classList.remove('open');
    document.body.classList.remove('menu-open');
    menuButton.setAttribute('aria-expanded', 'false');
  });
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach((el, index) => {
  el.style.transitionDelay = `${Math.min((index % 3) * 90, 180)}ms`;
  observer.observe(el);
});

document.querySelector('#year').textContent = new Date().getFullYear();

document.querySelector('#whatsapp-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const message = [
    'Hola Mendialyx AI, quiero solicitar información.',
    '',
    `Nombre: ${data.get('name')}`,
    `Empresa: ${data.get('company') || 'No indicada'}`,
    `Servicio: ${data.get('service')}`,
    `Proyecto: ${data.get('message')}`
  ].join('\n');

  window.open(`https://wa.me/528334426440?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
});

// Lightweight interactive network background.
const canvas = document.querySelector('#network');
const ctx = canvas.getContext('2d');
let width = 0;
let height = 0;
let dpr = Math.min(window.devicePixelRatio || 1, 2);
let points = [];
const mouse = { x: -1000, y: -1000 };

function resizeCanvas() {
  width = window.innerWidth;
  height = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const count = Math.max(25, Math.min(62, Math.floor(width / 28)));
  points = Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.16,
    vy: (Math.random() - 0.5) * 0.16,
    r: Math.random() * 1.5 + 0.4
  }));
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('pointermove', (event) => {
  mouse.x = event.clientX;
  mouse.y = event.clientY;
}, { passive: true });
window.addEventListener('pointerleave', () => {
  mouse.x = -1000;
  mouse.y = -1000;
});
resizeCanvas();

function drawNetwork() {
  ctx.clearRect(0, 0, width, height);

  points.forEach((p) => {
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < -20) p.x = width + 20;
    if (p.x > width + 20) p.x = -20;
    if (p.y < -20) p.y = height + 20;
    if (p.y > height + 20) p.y = -20;

    const mdx = p.x - mouse.x;
    const mdy = p.y - mouse.y;
    const md = Math.hypot(mdx, mdy);
    if (md < 140 && md > 1) {
      p.x += (mdx / md) * 0.08;
      p.y += (mdy / md) * 0.08;
    }
  });

  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    for (let j = i + 1; j < points.length; j++) {
      const b = points[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < 150) {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(67, 181, 255, ${0.08 * (1 - d / 150)})`;
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }
    }
  }

  points.forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(96, 215, 255, .32)';
    ctx.fill();
  });

  requestAnimationFrame(drawNetwork);
}

if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  drawNetwork();
}
