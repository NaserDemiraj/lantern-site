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
  requestAnimationFrame(() => hero.classList.add('is-in'));
  }

  // focus follows the jump for the skip link and the reserve buttons
  document.querySelectorAll('a[href="#main"]').forEach((a) => {
    a.addEventListener('click', () => {
      const main = document.getElementById('main');
      main.setAttribute('tabindex', '-1');
      setTimeout(() => main.focus({ preventScroll: true }), 0);
    });
  });

  /* ---------- Rescue timeline: sideways scroll ---------- */
  const scroller = document.getElementById('rescue-scroller');
  const moments = scroller ? [...scroller.querySelectorAll('.moment')] : [];
  if (scroller) {
  const line = scroller.querySelector('.rescue-line');
  const fill = scroller.querySelector('.rescue-fill');
  const bar = document.querySelector('.rescue-progress span');
  const [prevBtn, nextBtn] = document.querySelectorAll('.round-btn');

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
      const lit = m.getBoundingClientRect().left < threshold - 8;
      m.classList.toggle('is-lit', lit);
      if (lit) lastLit = m;
    });
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
      .to('.hero-video, .hero-poster', { filter: 'brightness(1.35) saturate(1.1)', ease: 'none' }, 0)
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
      gsap.from(ph.querySelectorAll('.page-title, .page-lede, .final-actions'), { y: 28, opacity: 0, duration: 1, stagger: 0.12, delay: 0.1, ease: 'expo.out', clearProps: 'transform,opacity' });
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
  const btn = form.querySelector('button');
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
      btn.disabled = false; btn.textContent = 'Reserve your beacon';
      form.reset();
      msg.classList.remove('is-error');
      msg.textContent = `Reserved for ${value}. We will email you a week before it ships.`;
    }, 900);
  });
  }
})();
