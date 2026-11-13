(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  /* ---------- Hero: video + entrance (home only) ---------- */
  const hero = document.querySelector('.hero');
  if (hero) {
  const video = document.querySelector('.hero-video');
  const toggle = document.querySelector('.video-toggle');
  let userPaused = false;

  const setToggle = (playing) => {
    toggle.classList.toggle('is-paused', !playing);
    toggle.setAttribute('aria-label', playing ? 'Pause background video' : 'Play background video');
    toggle.querySelector('.video-toggle-text').textContent = playing ? 'Pause video' : 'Play video';
  };

  if (reduceMotion) {
    toggle.hidden = true; // poster only; no moving background
  } else {
    video.preload = 'auto';
    video.addEventListener('playing', () => video.classList.add('is-playing'), { once: true });
    video.play().then(() => setToggle(true)).catch(() => setToggle(false));
    toggle.addEventListener('click', () => {
      if (video.paused) { userPaused = false; video.play(); setToggle(true); }
      else { userPaused = true; video.pause(); setToggle(false); }
    });
    new IntersectionObserver(([e]) => { // save battery while off screen
      if (userPaused) return;
      e.isIntersecting ? video.play().catch(() => {}) : video.pause();
    }).observe(hero);
  }
  const html = document.documentElement;
  if (html.classList.contains('intro')) {
    const overlay = document.querySelector('.intro-overlay');
    const finish = () => {
      if (html.classList.contains('intro-done')) return;
      html.classList.add('intro-done');
      try { sessionStorage.setItem('lantern-intro', '1'); } catch (e) { /* ignore */ }
      requestAnimationFrame(() => hero.classList.add('is-in'));
    };
    if (overlay) {
      overlay.addEventListener('animationend', (e) => { if (e.animationName === 'intro-out') finish(); });
      overlay.addEventListener('click', finish);
    }
    document.addEventListener('keydown', finish, { once: true });
    setTimeout(finish, 2200); // safety net if animations never fire
  } else {
    requestAnimationFrame(() => hero.classList.add('is-in'));
  }
  }

  // focus follows the jump for the skip link and the reserve buttons
  document.querySelectorAll('a[href="#main"]').forEach((a) => {
    a.addEventListener('click', () => {
      const main = document.getElementById('main');
      main.setAttribute('tabindex', '-1');
      setTimeout(() => main.focus({ preventScroll: true }), 0);
    });
  });

  /* ---------- The beam as a guide: scroll line and cursor light ---------- */
  if (document.querySelector('.nav-wrap')) {
    const guide = document.createElement('div');
    guide.className = 'beam-guide'; guide.setAttribute('aria-hidden', 'true');
    guide.innerHTML = '<span class="beam-guide-fill"></span><span class="beam-guide-tip"></span>';
    document.body.appendChild(guide);
    const gFill = guide.firstChild, gTip = guide.lastChild;
    let gTick = false;
    const updateGuide = () => {
      gTick = false;
      const max = document.documentElement.scrollHeight - innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
      gFill.style.transform = 'scaleY(' + p + ')';
      gTip.style.transform = 'translateY(' + (p * guide.clientHeight - 4) + 'px)';
    };
    const queueGuide = () => { if (!gTick) { gTick = true; requestAnimationFrame(updateGuide); } };
    addEventListener('scroll', queueGuide, { passive: true });
    addEventListener('resize', queueGuide);
    updateGuide();

    // a faint pool of light that follows the cursor (mouse and pen only, never touch)
    if (!reduceMotion && matchMedia('(hover: hover) and (pointer: fine)').matches) {
      const light = document.createElement('div');
      light.className = 'cursor-light'; light.setAttribute('aria-hidden', 'true');
      document.body.appendChild(light);
      let tx = innerWidth / 2, ty = innerHeight / 2, x = tx, y = ty, moving = false;
      const follow = () => {
        x += (tx - x) * 0.18; y += (ty - y) * 0.18;
        light.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
        if (Math.abs(tx - x) + Math.abs(ty - y) > 0.5) requestAnimationFrame(follow); else moving = false;
      };
      addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
        tx = e.clientX; ty = e.clientY; light.classList.add('is-on');
        if (!moving) { moving = true; requestAnimationFrame(follow); }
      }, { passive: true });
      document.documentElement.addEventListener('pointerleave', () => light.classList.remove('is-on'));
    }
  }

  /* ---------- Numbers that count up when they matter ---------- */
  const countUp = (el) => {
    if (el.dataset.counted) return;
    el.dataset.counted = '1';
    const target = Number(el.dataset.count);
    const fmt = (n) => n.toLocaleString('en-GB');
    if (reduceMotion) { el.textContent = fmt(target); return; }
    const t0 = performance.now(), dur = 1400;
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      el.textContent = fmt(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const counters = [...document.querySelectorAll('[data-count]')];
  const countIO = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting && !e.target.dataset.countOn) { countUp(e.target); countIO.unobserve(e.target); }
  }), { threshold: 1 });
  counters.forEach((el) => countIO.observe(el));
  // counters tied to a rescue moment start when that moment lights
  const litCounters = counters.filter((el) => el.dataset.countOn === 'lit');
  if (litCounters.length) {
    new MutationObserver(() => litCounters.forEach((el) => { if (el.closest('.moment').classList.contains('is-lit')) countUp(el); }))
      .observe(document.getElementById('rescue-scroller'), { subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  /* ---------- Rescue timeline: sideways scroll ---------- */
  const scroller = document.getElementById('rescue-scroller');
  const moments = scroller ? [...scroller.querySelectorAll('.moment')] : [];
  if (scroller) {
  const line = scroller.querySelector('.rescue-line');
  const fill = scroller.querySelector('.rescue-fill');
  const bar = document.querySelector('.rescue-progress span');
  const [prevBtn, nextBtn] = document.querySelectorAll('.round-btn');

  // the chart follows the timeline: each moment reveals its part of the night
  const chart = document.querySelector('.chart');
  const chartParts = chart ? [...chart.querySelectorAll('[data-from]')] : [];
  const route = chart && chart.querySelector('.route');
  const routeLeft = [1, 1, 1, 0.62, 0.1, 0]; // how much of the lifeboat's route is still to draw
  let chartStep = -1;
  const syncChart = (stepIndex) => {
    if (!chart || stepIndex === chartStep || scenario !== 'with') return;
    chartStep = stepIndex;
    chart.dataset.step = stepIndex;
    chartParts.forEach((el) => el.classList.toggle('on', Number(el.dataset.from) <= stepIndex));
    route.style.strokeDashoffset = routeLeft[stepIndex];
    const m = moments[stepIndex];
    chart.querySelector('.chart-time').textContent = m.querySelector('.moment-time').textContent;
    chart.querySelector('.chart-what').textContent = m.querySelector('h3').textContent;
  };

  const chartScroll = document.querySelector('.chart-scroll');
  if (chartScroll && matchMedia('(max-width: 720px)').matches) {
    requestAnimationFrame(() => { chartScroll.scrollLeft = chartScroll.scrollWidth * 0.18; });
  }

  // with and without Lantern
  const segs = [...document.querySelectorAll('.seg')];
  const WITHOUT_CAPTION = ['06:10', 'Saoirse is found drifting. The search starts 7 hours late.'];
  let scenario = 'with';
  const setScenario = (name) => {
    scenario = name;
    if (!chart) return;
    chart.dataset.scenario = name;
    const section = chart.closest('.rescue');
    if (section) section.dataset.scenario = name;
    segs.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.scenario === name)));
    if (name === 'without') {
      chart.querySelector('.chart-time').textContent = WITHOUT_CAPTION[0];
      chart.querySelector('.chart-what').textContent = WITHOUT_CAPTION[1];
    } else { chartStep = -1; updateRescue(); }
  };
  segs.forEach((b) => b.addEventListener('click', () => setScenario(b.dataset.scenario)));

  // play the night: step through the moments on its own
  const playBtn = document.querySelector('.play-night');
  let playTimer = 0, playStep = 0;
  const stopPlay = () => {
    clearInterval(playTimer); playTimer = 0;
    if (playBtn) { playBtn.classList.remove('is-playing'); playBtn.querySelector('span').textContent = 'Play the night'; }
    if (chart) chart.querySelector('.chart-caption').setAttribute('aria-live', 'polite');
  };
  if (playBtn) playBtn.addEventListener('click', () => {
    if (playTimer) return stopPlay();
    if (scenario !== 'with') setScenario('with');
    playBtn.classList.add('is-playing'); playBtn.querySelector('span').textContent = 'Pause';
    if (chart) chart.querySelector('.chart-caption').setAttribute('aria-live', 'off');
    scroller.scrollTo({ left: 0, behavior: 'auto' });
    let i = 0; playStep = 0; queueRescue();
    playTimer = setInterval(() => {
      i += 1;
      if (i >= moments.length) return stopPlay();
      playStep = i; queueRescue();
      scroller.scrollTo({ left: moments[i].offsetLeft - moments[0].offsetLeft, behavior: reduceMotion ? 'auto' : 'smooth' });
    }, 1700);
  });
  // any manual scroll of the timeline takes over from the replay
  ['wheel', 'pointerdown', 'keydown', 'touchstart'].forEach((ev) => scroller.addEventListener(ev, () => playTimer && stopPlay(), { passive: true }));

  let rTick = false;
  const updateRescue = () => {
    rTick = false;
    const max = scroller.scrollWidth - scroller.clientWidth;
    const progress = max > 0 ? scroller.scrollLeft / max : 1;
    const box = scroller.getBoundingClientRect();
    // the reading line moves right as you go, so the last moments light by the end
    const threshold = box.left + box.width * (0.55 + 0.45 * progress);
    let lastLit = null;
    moments.forEach((m) => {
      // during a replay the moments light by the replay count, not by scroll position
      const lit = playTimer ? moments.indexOf(m) <= playStep : m.getBoundingClientRect().left < threshold - 8;
      m.classList.toggle('is-lit', lit);
      if (lit) lastLit = m;
    });
    syncChart(lastLit ? moments.indexOf(lastLit) : 0);
    const lineBox = line.getBoundingClientRect();
    const dotX = lastLit ? lastLit.querySelector('.moment-dot').getBoundingClientRect().left + 8 : lineBox.left;
    fill.style.transform = `scaleX(${Math.min(1, Math.max(0, (dotX - lineBox.left) / lineBox.width))})`;
    bar.style.transform = `scaleX(${0.12 + 0.88 * progress})`;
    prevBtn.disabled = scroller.scrollLeft < 4;
    nextBtn.disabled = scroller.scrollLeft > max - 4;
  };
  const queueRescue = () => { if (!rTick) { rTick = true; requestAnimationFrame(updateRescue); } };
  scroller.addEventListener('scroll', queueRescue, { passive: true });
  window.addEventListener('resize', queueRescue);
  updateRescue();

  const step = () => moments[1].offsetLeft - moments[0].offsetLeft;
  [prevBtn, nextBtn].forEach((b) => b.addEventListener('click', () => {
    scroller.scrollBy({ left: Number(b.dataset.dir) * step(), behavior: reduceMotion ? 'auto' : 'smooth' });
  }));

  // drag with a mouse; touch and trackpads already scroll natively
  let drag = null;
  scroller.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag = { x: e.clientX, left: scroller.scrollLeft, moved: false };
  });
  window.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 4) { drag.moved = true; scroller.classList.add('is-dragging'); }
    if (drag.moved) scroller.scrollLeft = drag.left - dx;
  });
  window.addEventListener('pointerup', () => {
    if (!drag) return;
    const moved = drag.moved; drag = null;
    scroller.classList.remove('is-dragging');
    if (moved) { // settle on the nearest moment
      const nearest = moments.reduce((a, m) => Math.abs(m.offsetLeft - scroller.scrollLeft - moments[0].offsetLeft) < Math.abs(a.offsetLeft - scroller.scrollLeft - moments[0].offsetLeft) ? m : a);
      scroller.scrollTo({ left: nearest.offsetLeft - moments[0].offsetLeft, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  });

  }

  /* ---------- Scroll animations (GSAP) ---------- */
  if (hasGsap && !reduceMotion) {
    // hero: the camera drifts toward the boat and the beam brightens as you leave
    if (hero) gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6 } })
      .to('.hero-media', { scale: 1.22, yPercent: 6, ease: 'none' }, 0)
      // the beam brightens as the dark scrim lifts; fading an overlay is cheap for the
      // browser, unlike a CSS filter on a 4K video that repaints every frame
      .to('.hero-scrim', { opacity: 0, ease: 'none' }, 0)
      .to('.hero-inner', { yPercent: -18, opacity: 0, ease: 'none' }, 0)
      .to('.video-toggle', { opacity: 0, ease: 'none' }, 0);

    const once = (trigger, start = 'top 85%') => ({ trigger, start, once: true });

    // headings rise out of a mask
    gsap.utils.toArray('.reveal-heading').forEach((el) => {
      gsap.from(el, { clipPath: 'inset(0% 0% 100% 0%)', yPercent: 35, duration: 1.1, ease: 'expo.out', clearProps: 'clipPath,transform', scrollTrigger: once(el) });
    });

    // groups arrive one item after another
    gsap.utils.toArray('.reveal-stagger').forEach((group) => {
      gsap.from(group.children, { y: 24, opacity: 0, duration: 0.8, stagger: 0.09, ease: 'power3.out', clearProps: 'transform,opacity', scrollTrigger: once(group) });
    });

    // the offer card lifts in as one object
    gsap.utils.toArray('.reveal-rise').forEach((el) => {
      gsap.from(el, { y: 56, scale: 0.97, opacity: 0, duration: 1, ease: 'expo.out', clearProps: 'transform,opacity', scrollTrigger: once(el) });
    });

    // the timeline's moments slide in from the right when the section arrives
    if (scroller) gsap.from(moments, { x: 72, opacity: 0, duration: 1, stagger: 0.08, ease: 'expo.out', clearProps: 'transform,opacity', scrollTrigger: once(scroller, 'top 80%') });

    // the 3D stage comes up out of the dark
    // page headers: the painting drifts slower than the page
    gsap.utils.toArray('.page-header').forEach((ph) => {
      gsap.to(ph.querySelector('.page-header-media'), { yPercent: 18, ease: 'none', scrollTrigger: { trigger: ph, start: 'top top', end: 'bottom top', scrub: 0.4 } });
      gsap.from(ph.querySelector('.page-title'), { y: 28, duration: 1, delay: 0.1, ease: 'expo.out', clearProps: 'transform' });
      gsap.from(ph.querySelectorAll('.page-lede, .final-actions'), { y: 28, opacity: 0, duration: 1, stagger: 0.12, delay: 0.22, ease: 'expo.out', clearProps: 'transform,opacity' });
    });

    if (document.querySelector('.beacon-stage')) gsap.from('.beacon-stage', { opacity: 0, scale: 0.94, duration: 1.2, ease: 'expo.out', clearProps: 'transform,opacity', scrollTrigger: once('.beacon-stage') });

    // spec rows: each divider draws from the left, then its values settle
    const rows = gsap.utils.toArray('.spec-list > div');
    if (rows.length) {
    const specTl = gsap.timeline({ scrollTrigger: once('.spec-list', 'top 88%') });
    specTl.from(rows, { '--ls': 0, duration: 0.9, stagger: 0.06, ease: 'expo.out' }, 0)
      .from(rows.flatMap((r) => [...r.children]), { opacity: 0, y: 8, duration: 0.6, stagger: 0.03, ease: 'power2.out', clearProps: 'transform,opacity' }, 0.15);
    }

    document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
  }

  /* ---------- Mobile menu ---------- */
  const menuBtn = document.querySelector('.menu-toggle');
  const panel = document.getElementById('nav-links');
  const isOpen = () => menuBtn.getAttribute('aria-expanded') === 'true';
  const setMenu = (open, { restoreFocus = true } = {}) => {
    document.body.classList.toggle('nav-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (open) panel.querySelector('a').focus();
    else if (restoreFocus) menuBtn.focus();
  };
  menuBtn.addEventListener('click', () => setMenu(!isOpen()));
  panel.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => isOpen() && setMenu(false, { restoreFocus: false })));
  document.addEventListener('keydown', (e) => {
    if (!isOpen()) return;
    if (e.key === 'Escape') return setMenu(false);
    if (e.key === 'Tab') { // keep focus inside the open menu
      const items = [menuBtn, ...panel.querySelectorAll('a')];
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------- Tagline: words light up one by one ---------- */
  const tagline = document.querySelector('[data-words]');
  if (tagline) {
  const sentence = tagline.textContent.trim();
  tagline.innerHTML = `<span class="sr-only">${sentence}</span>` +
    sentence.split(/\s+/).map((w) => `<span class="w" aria-hidden="true">${w}</span>`).join(' ');
  const spans = [...tagline.querySelectorAll('.w')];

  if (reduceMotion) {
    spans.forEach((s) => s.classList.add('on'));
  } else {
    let ticking = false;
    const update = () => {
      ticking = false;
      const triggerLine = window.innerHeight * 0.62;
      const rect = tagline.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, (triggerLine - rect.top) / (rect.height + window.innerHeight * 0.2)));
      const lit = Math.round(progress * spans.length);
      spans.forEach((s, i) => s.classList.toggle('on', i < lit));
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }

  }

  /* ---------- Reserve form ---------- */
  const form = document.querySelector('.reserve-form');
  if (form) {
  const input = form.querySelector('#email');
  const msg = form.querySelector('.form-msg');
  const row = form.querySelector('.field-row');
  const btn = form.querySelector('button[type="submit"]');

  // how many beacons, with a live summary
  const qty = form.querySelector('#qty');
  const stepBtns = [...form.querySelectorAll('.stepper-btn')];
  const PRICE = 249;
  const count = () => Math.min(12, Math.max(1, parseInt(qty ? qty.value : '1', 10) || 1));
  const renderQty = () => {
    if (!qty) return;
    const n = count();
    qty.value = n;
    form.querySelectorAll('.sum-qty').forEach((el) => { el.textContent = n; });
    form.querySelectorAll('.sum-total').forEach((el) => { el.textContent = (n * PRICE).toLocaleString('en-GB'); });
    stepBtns[0].disabled = n <= 1;
    stepBtns[1].disabled = n >= 12;
  };
  stepBtns.forEach((b) => b.addEventListener('click', () => { qty.value = count() + Number(b.dataset.step); renderQty(); }));
  if (qty) {
    qty.addEventListener('input', () => {
      if (qty.value === '') return;
      const n = count();
      form.querySelectorAll('.sum-qty').forEach((el) => { el.textContent = n; });
      form.querySelectorAll('.sum-total').forEach((el) => { el.textContent = (n * PRICE).toLocaleString('en-GB'); });
    });
    qty.addEventListener('change', renderQty);
    renderQty();
  }

  const showError = (text) => {
    msg.textContent = text; msg.classList.add('is-error');
    row.classList.add('has-error'); input.setAttribute('aria-invalid', 'true'); input.focus();
  };
  input.addEventListener('input', () => {
    msg.textContent = ''; msg.classList.remove('is-error');
    row.classList.remove('has-error'); input.removeAttribute('aria-invalid');
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = input.value.trim();
    if (!value) return showError('Enter your email so we can hold your beacon.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) return showError('That email looks incomplete. Check it has an @ and a domain, like name@example.com.');
    btn.disabled = true; btn.textContent = 'Reserving…';
    setTimeout(() => { // design concept: no backend, so nothing is actually sent
      const n = count();
      btn.disabled = false; btn.textContent = 'Reserve your beacon';
      input.value = ''; renderQty(); // keep the quantity so the summary matches the confirmation
      msg.classList.remove('is-error');
      msg.textContent = `Reserved ${n === 1 ? 'one beacon' : n + ' beacons'} for ${value}. We will email you a week before they ship.`;
    }, 900);
  });
  }

  /* ---------- FAQ topics ---------- */
  const chips = [...document.querySelectorAll('.chip')];
  if (chips.length) {
    const questions = [...document.querySelectorAll('.faq-list details')];
    const status = document.querySelector('.faq-status');
    chips.forEach((chip) => chip.addEventListener('click', () => {
      const topic = chip.dataset.topic;
      chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
      let shown = 0;
      questions.forEach((q) => {
        const match = topic === 'all' || q.dataset.topic === topic;
        q.hidden = !match;
        if (match) shown++;
      });
      const label = topic === 'all' ? 'all' : chip.firstChild.textContent.trim().toLowerCase();
      status.textContent = topic === 'all' ? `Showing all ${shown} questions` : `Showing ${shown} questions about ${label}`;
      if (hasGsap && !reduceMotion) {
        gsap.fromTo(questions.filter((q) => !q.hidden), { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.05, ease: 'power3.out', clearProps: 'transform,opacity' });
      }
    }));
  }
})();
