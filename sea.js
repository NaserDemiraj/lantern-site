// A storm sea drawn in code for the page headers: rows of swell lines that catch a
// column of golden light, with rain that glows where it crosses the beam.
// Drawn at the screen's real pixel density, so it stays sharp at any size.
(() => {
  const canvases = document.querySelectorAll('canvas.sea');
  if (!canvases.length) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const GOLD = [242, 184, 102];
  const FOAM = [246, 235, 217];

  canvases.forEach((canvas) => {
    const ctx = canvas.getContext('2d');
    const opt = {
      beam: parseFloat(canvas.dataset.beam ?? '0.72'),    // beam position across the width, 0 to 1
      sweep: parseFloat(canvas.dataset.sweep ?? '0'),     // how far the beam swings, 0 = still
      swell: parseFloat(canvas.dataset.swell ?? '1'),     // wave height
      rain: parseFloat(canvas.dataset.rain ?? '0.6'),     // rain density, 0 to 1
      horizon: parseFloat(canvas.dataset.horizon ?? '0.42')
    };

    let w = 0, h = 0, dpr = 1, drops = [], inView = true, tabVisible = !document.hidden, raf = 0;
    const start = performance.now();

    const seedRain = () => {
      const count = Math.round((w * h) / (9000 * dpr * dpr) * opt.rain);
      drops = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        len: (10 + Math.random() * 18) * dpr,
        speed: (0.9 + Math.random() * 0.8) * dpr
      }));
    };

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, Math.round(r.width * dpr));
      h = Math.max(1, Math.round(r.height * dpr));
      canvas.width = w; canvas.height = h;
      seedRain();
      if (reduceMotion) draw(0);
    };

    const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`;

    const draw = (t) => {
      ctx.clearRect(0, 0, w, h);
      const beamX = opt.beam + Math.sin(t * 0.00012) * opt.sweep;
      const horizonY = h * opt.horizon;
      const rows = Math.round(34 + 14 * Math.min(1, h / (700 * dpr)));
      const step = 5 * dpr;

      // the shaft of light above the water: thin vertical strands, brightest at the centre
      const shaftW = w * 0.09;
      for (let i = -10; i <= 10; i++) {
        const k = i / 10;
        const x = beamX * w + k * shaftW + Math.sin(t * 0.0004 + i) * 2 * dpr;
        const a = 0.04 * Math.exp(-k * k * 3) * (0.8 + 0.2 * Math.sin(t * 0.001 + i * 1.7));
        ctx.strokeStyle = rgba(GOLD, a);
        ctx.lineWidth = (1 + (1 - Math.abs(k)) * 2) * dpr;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + k * shaftW * 0.4, horizonY); ctx.stroke();
      }

      // swell lines, packed tight at the horizon and opening up toward the viewer
      for (let r = 0; r < rows; r++) {
        const d = r / (rows - 1);                  // 0 at the horizon, 1 nearest the viewer
        const y0 = horizonY + (h - horizonY) * Math.pow(d, 1.7) * 1.04;
        const amp = opt.swell * (1.2 + 20 * Math.pow(d, 1.6)) * dpr;
        const f1 = 0.0035 / (0.25 + d) / dpr, f2 = 0.009 / (0.3 + d) / dpr;
        const sigma = 0.035 + 0.11 * d;             // the pool of light widens toward the viewer

        const grad = ctx.createLinearGradient(0, 0, w, 0);
        const base = 0.03 + 0.1 * d;
        for (let s = 0; s <= 10; s++) {
          const fx = s / 10;
          const g = Math.exp(-((fx - beamX) ** 2) / (2 * sigma * sigma));
          const c = FOAM.map((v, i) => Math.round(v + (GOLD[i] - v) * Math.min(1, g * 1.2)));
          grad.addColorStop(fx, rgba(c, Math.min(0.95, base + g * (0.75 - 0.25 * d))));
        }
        ctx.strokeStyle = grad;
        ctx.lineWidth = (0.6 + 1.1 * d) * dpr;
        ctx.beginPath();
        for (let x = -step; x <= w + step; x += step) {
          const y = y0
            + amp * 0.62 * Math.sin(x * f1 + t * 0.00055 * (1 + d) + r * 0.9)
            + amp * 0.38 * Math.sin(x * f2 - t * 0.0009 + r * 1.7);
          x <= -step ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // rain, slanting with the wind; drops light up inside the beam
      if (drops.length) {
        ctx.lineWidth = 1 * dpr;
        const slant = 0.28;
        for (const p of drops) {
          if (!reduceMotion) {
            p.y += p.speed * 9; p.x -= p.speed * 9 * slant;
            if (p.y > h) { p.y = -p.len; p.x = Math.random() * (w + h * slant); }
            if (p.x < -20) p.x += w + 40;
          }
          const g = Math.exp(-((p.x / w - beamX) ** 2) / (2 * 0.05 * 0.05));
          ctx.strokeStyle = g > 0.08 ? rgba(GOLD, 0.12 + g * 0.5) : rgba(FOAM, 0.08);
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.len * slant, p.y - p.len); ctx.stroke();
        }
      }
    };

    const loop = (now) => {
      raf = 0;
      draw(now - start);
      if (inView && tabVisible) raf = requestAnimationFrame(loop);
    };

    new ResizeObserver(resize).observe(canvas);
    resize();
    if (reduceMotion) return; // one still frame, redrawn on resize
    // animate only while the header is on screen and the tab is showing
    const wake = () => { if (inView && tabVisible && !raf) raf = requestAnimationFrame(loop); };
    new IntersectionObserver(([e]) => { inView = e.isIntersecting; wake(); }).observe(canvas);
    document.addEventListener('visibilitychange', () => { tabVisible = !document.hidden; wake(); });
  });
})();
