// Optional sound, off by default: a synthesised storm (surf that swells, plus rain),
// and short cues from the beacon. Everything is generated with Web Audio, so there are
// no audio files to download. The choice is remembered on this device.
(() => {
  const nav = document.querySelector('.nav');
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!nav || !AudioCtx) return;

  const KEY = 'lantern-sound';
  const remembered = () => { try { return localStorage.getItem(KEY) === 'on'; } catch (e) { return false; } };
  const remember = (on) => { try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) { /* private mode */ } };

  // the toggle sits in the nav, next to the menu button
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'sound-toggle';
  btn.setAttribute('aria-pressed', 'false');
  btn.setAttribute('aria-label', 'Turn sound on');
  btn.innerHTML = `<svg viewBox="0 0 256 256" aria-hidden="true">
    <path d="M155.51 24.81a8 8 0 0 0-8.42.88L77.25 80H32a16 16 0 0 0-16 16v64a16 16 0 0 0 16 16h45.25l69.84 54.31A8 8 0 0 0 160 224V32a8 8 0 0 0-4.49-7.19ZM32 96h40v64H32Zm112 111.64-56-43.55V91.91l56-43.55Z"/>
    <path class="sound-waves" d="M208 128a39.93 39.93 0 0 1-10 26.46 8 8 0 1 1-12-10.58 24 24 0 0 0 0-31.72 8 8 0 1 1 12-10.58A40 40 0 0 1 208 128Zm32 0a71.88 71.88 0 0 1-18.3 48 8 8 0 1 1-11.92-10.66 56 56 0 0 0 0-74.68 8 8 0 1 1 11.92-10.66A71.88 71.88 0 0 1 240 128Z"/>
    <path class="sound-off" d="M229.66 106.34 211.31 128l18.35 21.66a8 8 0 0 1-11.32 11.32L200 139.31l-18.34 21.67a8 8 0 0 1-11.32-11.32L188.69 128l-18.35-21.66a8 8 0 0 1 11.32-11.32L200 116.69l18.34-21.67a8 8 0 0 1 11.32 11.32Z"/>
  </svg>`;
  nav.insertBefore(btn, nav.querySelector('.menu-toggle'));

  let ctx = null, master = null, on = false;

  const noiseBuffer = (seconds, brown) => {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      if (brown) { last = (last + 0.02 * white) / 1.02; d[i] = last * 3.5; } else d[i] = white;
    }
    return buf;
  };

  const build = () => {
    ctx = new AudioCtx();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);

    // surf: brown noise through a low pass, swelling slowly like waves
    const surf = ctx.createBufferSource(); surf.buffer = noiseBuffer(4, true); surf.loop = true;
    const surfLP = ctx.createBiquadFilter(); surfLP.type = 'lowpass'; surfLP.frequency.value = 420;
    const surfGain = ctx.createGain(); surfGain.gain.value = 0.55;
    const swell = ctx.createOscillator(); swell.frequency.value = 0.11;
    const swellDepth = ctx.createGain(); swellDepth.gain.value = 0.3;
    swell.connect(swellDepth).connect(surfGain.gain);
    surf.connect(surfLP).connect(surfGain).connect(master);

    // rain: a soft high hiss
    const rain = ctx.createBufferSource(); rain.buffer = noiseBuffer(2, false); rain.loop = true;
    const rainBP = ctx.createBiquadFilter(); rainBP.type = 'bandpass'; rainBP.frequency.value = 5200; rainBP.Q.value = 0.6;
    const rainGain = ctx.createGain(); rainGain.gain.value = 0.05;
    rain.connect(rainBP).connect(rainGain).connect(master);

    surf.start(); rain.start(); swell.start();
  };

  const blip = (freq, at, dur, level) => {
    if (!on || !ctx) return;
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
    const g = ctx.createGain();
    const t = ctx.currentTime + at;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t); o.stop(t + dur + 0.02);
  };

  const setSound = (next) => {
    on = next;
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? 'Turn sound off' : 'Turn sound on');
    remember(on);
    if (on && !ctx) build();
    if (!ctx) return;
    if (on && ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(on ? 0.35 : 0, now + (on ? 1.5 : 0.4));
  };

  btn.addEventListener('click', () => setSound(!on));

  // Browsers only allow audio after a click or key press, so a remembered "on"
  // starts with the first interaction on the page.
  if (remembered()) {
    btn.setAttribute('aria-pressed', 'true');
    btn.setAttribute('aria-label', 'Turn sound off');
    const startOnGesture = () => {
      document.removeEventListener('pointerdown', startOnGesture);
      document.removeEventListener('keydown', startOnGesture);
      if (btn.getAttribute('aria-pressed') === 'true' && !on) setSound(true);
    };
    document.addEventListener('pointerdown', startOnGesture);
    document.addEventListener('keydown', startOnGesture);
  }

  // the beacon page announces its strobe flashes and the alert going out
  document.addEventListener('lantern:strobe', () => blip(1320, 0, 0.09, 0.06));
  document.addEventListener('lantern:alert', () => { blip(880, 0, 0.18, 0.08); blip(1320, 0.16, 0.26, 0.08); });

  // quiet while the tab is hidden
  document.addEventListener('visibilitychange', () => {
    if (!ctx || !on) return;
    document.hidden ? ctx.suspend() : ctx.resume();
  });
})();
