// A storm sea drawn in code for the page headers: rows of swell lines that catch a
// column of golden light, with rain that glows where it crosses the beam.
// Drawn at the screen's pixel density (capped at 1.5x), so it stays sharp at any size.
//
// Performance: everything is batched into a handful of paths per frame (about 13
// strokes in total), there are no per-line gradients, and it redraws at 30 fps,
// only while the header is on screen and the tab is visible.
(() => {
  const canvases = document.querySelectorAll('canvas.sea');
  if (!canvases.length) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const FRAME_MS = 1000 / 30;
  const BANDS = 3; // depth bands: far, middle, near

  canvases.forEach((canvas) => {
    const ctx = canvas.getContext('2d');
    const opt = {
      beam: parseFloat(canvas.dataset.beam ?? '0.72'),
      sweep: parseFloat(canvas.dataset.sweep ?? '0'),
      swell: parseFloat(canvas.dataset.swell ?? '1'),
      rain: parseFloat(canvas.dataset.rain ?? '0.6'),
      horizon: parseFloat(canvas.dataset.horizon ?? '0.42')
    };

    let w = 0, h = 0, dpr = 1, drops = [], rows = 30;
    let inView = true, tabVisible = !document.hidden, raf = 0, lastDraw = -Infinity;
    const start = performance.now();

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = Math.max(1, Math.round(r.width * dpr));
      h = Math.max(1, Math.round(r.height * dpr));
      canvas.width = w; canvas.height = h;
      rows = Math.round(26 + 10 * Math.min(1, h / (700 * dpr)));
      const count = Math.round((w * h) / (12000 * dpr * dpr) * opt.rain);
      drops = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        len: (10 + Math.random() * 18) * dpr,
        speed: (0.9 + Math.random() * 0.8) * dpr
      }));
      draw(performance.now() - start);
    };

    const draw = (t) => {
      ctx.clearRect(0, 0, w, h);
      const beamX = (opt.beam + Math.sin(t * 0.00012) * opt.sweep) * w;
      const horizonY = h * opt.horizon;
      const step = 8 * dpr;

      // light shaft above the water: two batched groups of thin strands
      const shaftW = w * 0.08;
      ctx.lineCap = 'round';
      for (const [from, to, alpha, width] of [[-6, 6, 0.035, 1.5], [-2, 2, 0.05, 3]]) {
        ctx.beginPath();
        for (let i = from; i <= to; i++) {
          const k = i / 6;
          const x = beamX + k * shaftW + Math.sin(t * 0.0004 + i) * 2 * dpr;
          ctx.moveTo(x, 0); ctx.lineTo(x + k * shaftW * 0.4, horizonY);
        }
        ctx.strokeStyle = `rgba(242,184,102,${alpha})`;
        ctx.lineWidth = width * dpr;
        ctx.stroke();
      }

      // swell lines, packed at the horizon and opening toward the viewer
      const base = Array.from({ length: BANDS }, () => new Path2D());
      const glowWide = Array.from({ length: BANDS }, () => new Path2D());
      const glowCore = Array.from({ length: BANDS }, () => new Path2D());
      for (let r = 0; r < rows; r++) {
        const d = r / (rows - 1);
        const band = Math.min(BANDS - 1, Math.floor(d * BANDS));
        const y0 = horizonY + (h - horizonY) * Math.pow(d, 1.7) * 1.04;
        const amp = opt.swell * (1.2 + 20 * Math.pow(d, 1.6)) * dpr;
        const f1 = 0.0035 / (0.25 + d) / dpr, f2 = 0.009 / (0.3 + d) / dpr;
        const p1 = t * 0.00055 * (1 + d) + r * 0.9, p2 = -t * 0.0009 + r * 1.7;
        const yAt = (x) => y0 + amp * 0.62 * Math.sin(x * f1 + p1) + amp * 0.38 * Math.sin(x * f2 + p2);
        const sigma = (0.035 + 0.11 * d) * w; // the pool of light widens toward the viewer

        const trace = (path, x0, x1) => {
          path.moveTo(x0, yAt(x0));
          for (let x = x0 + step; x < x1; x += step) path.lineTo(x, yAt(x));
          path.lineTo(x1, yAt(x1));
        };
        trace(base[band], -step, w + step);
        trace(glowWide[band], Math.max(0, beamX - 2.2 * sigma), Math.min(w, beamX + 2.2 * sigma));
        trace(glowCore[band], Math.max(0, beamX - 0.9 * sigma), Math.min(w, beamX + 0.9 * sigma));
      }
      for (let b = 0; b < BANDS; b++) {
        const d = (b + 0.5) / BANDS;
        const width = (0.6 + 1.1 * d) * dpr;
        ctx.lineWidth = width;
        ctx.strokeStyle = `rgba(246,235,217,${(0.03 + 0.1 * d).toFixed(3)})`; ctx.stroke(base[b]);
        ctx.strokeStyle = `rgba(242,184,102,${(0.28 - 0.08 * d).toFixed(3)})`; ctx.stroke(glowWide[b]);
        ctx.lineWidth = width * 1.15;
        ctx.strokeStyle = `rgba(246,200,135,${(0.5 - 0.15 * d).toFixed(3)})`; ctx.stroke(glowCore[b]);
      }

      // rain: one path for the dark, one for drops lit by the beam
      if (drops.length) {
        const slant = 0.28, litHalf = w * 0.06;
        const dim = new Path2D(), lit = new Path2D();
        for (const p of drops) {
          if (!reduceMotion) {
            p.y += p.speed * 18; p.x -= p.speed * 18 * slant; // 30 fps, so twice the per-frame distance
            if (p.y > h) { p.y = -p.len; p.x = Math.random() * (w + h * slant); }
            if (p.x < -20) p.x += w + 40;
          }
          const path = Math.abs(p.x - beamX) < litHalf ? lit : dim;
          path.moveTo(p.x, p.y); path.lineTo(p.x + p.len * slant, p.y - p.len);
        }
        ctx.lineWidth = 1 * dpr;
        ctx.strokeStyle = 'rgba(246,235,217,0.08)'; ctx.stroke(dim);
        ctx.strokeStyle = 'rgba(242,184,102,0.45)'; ctx.stroke(lit);
      }
    };

    const loop = (now) => {
      raf = 0;
      if (now - lastDraw >= FRAME_MS - 2) { lastDraw = now; draw(now - start); }
      if (inView && tabVisible) raf = requestAnimationFrame(loop);
    };

    new ResizeObserver(resize).observe(canvas);
    if (reduceMotion) return; // a still frame, redrawn on resize
    // animate only while the header is on screen and the tab is showing
    const wake = () => { if (inView && tabVisible && !raf) raf = requestAnimationFrame(loop); };
    new IntersectionObserver(([e]) => { inView = e.isIntersecting; wake(); }).observe(canvas);
    document.addEventListener('visibilitychange', () => { tabVisible = !document.hidden; wake(); });
  });
})();
