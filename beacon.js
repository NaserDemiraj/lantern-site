// Lantern beacon: a real-time three.js model, lit from above by the same golden beam as the hero.
// Loaded as a classic script; three.js comes in through the page's import map.
(async () => {
  const stage = document.querySelector('.beacon-stage');
  const canvas = stage && stage.querySelector('.beacon-canvas');
  if (!canvas) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let THREE, RoundedBoxGeometry, RoomEnvironment;
  try {
    THREE = await import('three');
    ({ RoundedBoxGeometry } = await import('three/addons/geometries/RoundedBoxGeometry.js'));
    ({ RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js'));
  } catch (err) {
    stage.classList.add('no-webgl');
    return;
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch (err) {
    stage.classList.add('no-webgl');
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  camera.position.set(0, 0.4, 3.35);
  camera.lookAt(0, 0.1, 0);

  // ---------- Light: the beam ----------
  const beam = new THREE.SpotLight(0xF2B866, 70, 12, 0.36, 0.6, 1.6);
  beam.position.set(0.35, 4.2, 1.6);
  beam.target.position.set(0, 0, 0);
  scene.add(beam, beam.target);
  scene.add(new THREE.HemisphereLight(0x3a3a46, 0x131209, 0.6));
  const rim = new THREE.DirectionalLight(0x8fa4c4, 0.9); // cold storm light from behind
  rim.position.set(-2.5, 1.5, -3);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xfff6ea, 1.1); // near neutral key so the graphite reads as graphite
  fill.position.set(1.5, 0.6, 3);
  scene.add(fill);

  // ---------- Materials ----------
  const graphite = new THREE.MeshPhysicalMaterial({ color: 0x33322f, roughness: 0.55, metalness: 0.05, clearcoat: 0.35, clearcoatRoughness: 0.5 });
  const panelMat = new THREE.MeshStandardMaterial({ color: 0x3b382f, roughness: 0.75 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xF2B866, roughness: 0.35, metalness: 0.2, emissive: 0x7a4a10, emissiveIntensity: 0.25 });
  const darkRubber = new THREE.MeshStandardMaterial({ color: 0x15140f, roughness: 0.9 });
  const tape = new THREE.MeshStandardMaterial({ color: 0xc9ccd1, roughness: 0.25, metalness: 0.8 });
  const capMat = new THREE.MeshStandardMaterial({ color: 0xF2B866, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.72 });
  const domeMat = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.1, metalness: 0, transparent: true, opacity: 0.88, emissive: 0xfff4e0, emissiveIntensity: 0 });

  // ---------- Model (units: 1 = 100 mm; real size 92 × 48 × 31 mm) ----------
  const beacon = new THREE.Group();
  const W = 0.48, H = 0.92, D = 0.31;

  const body = new THREE.Mesh(new RoundedBoxGeometry(W, H, D, 6, 0.09), graphite);
  beacon.add(body);

  // printed label: wordmark, two-step instructions, frequency and the self test mark
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 512; labelCanvas.height = 626;
  const lc = labelCanvas.getContext('2d');
  try { await document.fonts.load('600 40px Manrope'); await document.fonts.load('500 28px Manrope'); } catch (e) { /* system font fallback */ }
  lc.fillStyle = '#36332b'; lc.fillRect(0, 0, 512, 626);
  lc.fillStyle = '#F6EBD9'; lc.textAlign = 'center';
  lc.font = '600 44px Manrope, sans-serif';
  if ('letterSpacing' in lc) lc.letterSpacing = '10px';
  lc.fillText('LANTERN', 261, 58);
  if ('letterSpacing' in lc) lc.letterSpacing = '0px';
  lc.font = '500 30px Manrope, sans-serif';
  lc.textAlign = 'left';
  lc.fillStyle = '#F2B866'; lc.fillText('1', 120, 392); lc.fillText('2', 120, 436);
  lc.fillStyle = '#F6EBD9'; lc.fillText('Lift cap', 160, 392); lc.fillText('Press 1 s', 160, 436);
  lc.fillStyle = 'rgba(246,235,217,0.25)'; lc.fillRect(56, 476, 400, 2);
  lc.fillStyle = 'rgba(246,235,217,0.7)'; lc.font = '500 24px Manrope, sans-serif';
  lc.fillText('406 MHz PLB', 56, 528);
  lc.textAlign = 'right'; lc.fillText('TEST', 418, 528);
  lc.fillStyle = '#7fbf86'; lc.beginPath(); lc.arc(440, 520, 9, 0, Math.PI * 2); lc.fill();
  const labelTex = new THREE.CanvasTexture(labelCanvas);
  labelTex.colorSpace = THREE.SRGBColorSpace;
  labelTex.anisotropy = 4;
  panelMat.map = labelTex; panelMat.color.set(0xffffff); panelMat.needsUpdate = true;

  const panel = new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.44, 0.02, 4, 0.008), panelMat);
  panel.position.set(0, -0.05, D / 2 + 0.002);
  beacon.add(panel);

  // the gold button with a dark ring, under a hinged flip cap
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.012, 16, 48), darkRubber);
  ring.position.set(0, 0.03, D / 2 + 0.014);
  beacon.add(ring);
  const button = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.075, 0.03, 48), gold);
  button.rotation.x = Math.PI / 2;
  button.position.set(0, 0.03, D / 2 + 0.018);
  beacon.add(button);

  const capPivot = new THREE.Group(); // hinge along the top edge of the cap
  capPivot.position.set(0, 0.155, D / 2 + 0.03);
  const cap = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.25, 0.022, 4, 0.01), capMat);
  cap.position.set(0, -0.125, 0);
  capPivot.add(cap);
  beacon.add(capPivot);

  // reflective tape band near the base
  const band = new THREE.Mesh(new RoundedBoxGeometry(W + 0.004, 0.04, D + 0.004, 4, 0.02), tape);
  band.position.y = -0.34;
  beacon.add(band);

  // strobe dome on top
  const domeBase = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.04, 48), darkRubber);
  domeBase.position.y = H / 2 + 0.01;
  beacon.add(domeBase);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
  dome.position.y = H / 2 + 0.03;
  beacon.add(dome);
  const strobe = new THREE.PointLight(0xfff1d6, 0, 3, 2);
  strobe.position.set(0, H / 2 + 0.08, 0);
  beacon.add(strobe);

  // stub antenna, offset to one side
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.02, 0.34, 16), darkRubber);
  antenna.position.set(0.15, H / 2 + 0.17, -0.04);
  beacon.add(antenna);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 12), darkRubber);
  tip.position.set(0.15, H / 2 + 0.34, -0.04);
  beacon.add(tip);

  // lanyard loop at the base
  const loop = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.016, 12, 32), darkRubber);
  loop.position.set(0, -H / 2 - 0.035, 0);
  beacon.add(loop);

  beacon.rotation.set(0.12, -0.35, 0);
  // status LED by the label: amber while it finds a fix
  const ledMat = new THREE.MeshStandardMaterial({ color: 0x3a2a12, emissive: 0xffa632, emissiveIntensity: 0 });
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.014, 16, 12), ledMat);
  led.position.set(0.14, 0.17, D / 2 + 0.01);
  beacon.add(led);

  // signal rings that rise from the antenna once the alert is sent
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xF2B866, transparent: true, opacity: 0, depthWrite: false });
  const rings = [0, 1, 2].map(() => {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.004, 8, 48), ringMat.clone());
    r.position.set(0.15, H / 2 + 0.34, -0.04);
    beacon.add(r);
    return r;
  });

  // where the hotspots sit, in the beacon's own space
  const anchors = {
    strobe: new THREE.Vector3(0, H / 2 + 0.13, 0),
    antenna: new THREE.Vector3(0.15, H / 2 + 0.3, -0.04),
    button: new THREE.Vector3(0, 0.03, D / 2 + 0.04),
    test: new THREE.Vector3(0.14, -0.21, D / 2 + 0.02)
  };
  const frontFacing = { button: true, test: true };

  scene.add(beacon);

  // a soft pool of light on the "water" under the beacon
  const blobCanvas = document.createElement('canvas');
  blobCanvas.width = blobCanvas.height = 128;
  const bc = blobCanvas.getContext('2d');
  const blobGrad = bc.createRadialGradient(64, 64, 4, 64, 64, 62);
  blobGrad.addColorStop(0, 'rgba(0,0,0,0.55)'); blobGrad.addColorStop(1, 'rgba(0,0,0,0)');
  bc.fillStyle = blobGrad; bc.fillRect(0, 0, 128, 128);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 0.7),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(blobCanvas), transparent: true, depthWrite: false })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.62;
  scene.add(floor);

  // ---------- Sizing ----------
  const resize = () => {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    needsRender = true;
  };
  new ResizeObserver(resize).observe(canvas);

  // ---------- Interaction: drag to turn (vertical swipes still scroll the page) ----------
  let dragging = false, lastX = 0, dragVel = 0, userYaw = 0;
  canvas.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX; lastX = e.clientX;
    dragVel = dx * 0.012; userYaw += dragVel; needsRender = true;
  });
  const endDrag = () => { dragging = false; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  // keyboard: arrow keys turn it too
  canvas.tabIndex = 0;
  canvas.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { userYaw -= 0.25; needsRender = true; e.preventDefault(); }
    if (e.key === 'ArrowRight') { userYaw += 0.25; needsRender = true; e.preventDefault(); }
  });

  // ---------- Try it: lift the cap, press, watch it call for help ----------
  // mode: 'closed' | 'open' (cap lifted) | 'fixing' (amber, finding GPS) | 'active' (alert sent)
  let mode = 'closed', modeAt = 0, capTarget = 0, capAngle = 0, pressDepth = 0;
  const controls = stage.parentElement.querySelector('.beacon-controls');
  const statusEl = controls && controls.querySelector('.beacon-status');
  const capBtn = controls && controls.querySelector('[data-act="cap"]');
  const pressBtn = controls && controls.querySelector('[data-act="press"]');
  const resetBtn = controls && controls.querySelector('[data-act="reset"]');
  const STATUS = {
    closed: 'Cap closed. Lift it to reach the gold button.',
    open: 'Cap open. Press the gold button for one second.',
    fixing: 'Light amber. Finding a GPS fix\u2026',
    active: 'Alert sent. Strobe and homing signal are on, and a fresh position goes out every five minutes.'
  };
  const setMode = (m) => {
    mode = m; modeAt = clock.getElapsedTime();
    capTarget = m === 'closed' ? 0 : 1;
    stage.classList.toggle('is-active', m === 'fixing' || m === 'active');
    if (statusEl) statusEl.textContent = STATUS[m];
    if (capBtn) { capBtn.textContent = m === 'closed' ? 'Lift the cap' : 'Close the cap'; capBtn.disabled = m === 'fixing' || m === 'active'; }
    if (pressBtn) pressBtn.disabled = m !== 'open';
    if (resetBtn) resetBtn.hidden = !(m === 'fixing' || m === 'active');
    kick();
  };
  if (capBtn) capBtn.addEventListener('click', () => setMode(mode === 'closed' ? 'open' : 'closed'));
  if (pressBtn) pressBtn.addEventListener('click', () => { if (mode === 'open') setMode('fixing'); });
  if (resetBtn) resetBtn.addEventListener('click', () => setMode('closed'));

  // a click (not a drag) on the cap or the button does the same as the controls
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let downAt = null;
  canvas.addEventListener('pointerdown', (e) => { downAt = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointerup', (e) => {
    if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6) return;
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects([cap, button], false)[0];
    if (!hit) return;
    if (hit.object === cap && (mode === 'closed' || mode === 'open')) setMode(mode === 'closed' ? 'open' : 'closed');
    else if (hit.object === button && mode === 'open') setMode('fixing');
  });

  // hotspots: HTML buttons pinned to points on the model
  const spots = [...stage.querySelectorAll('.hotspot')];
  spots.forEach((spot) => spot.addEventListener('click', () => {
    const open = spot.getAttribute('aria-expanded') !== 'true';
    spots.forEach((o) => o.setAttribute('aria-expanded', 'false'));
    spot.setAttribute('aria-expanded', String(open));
  }));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') spots.forEach((o) => o.setAttribute('aria-expanded', 'false')); });
  const tmp = new THREE.Vector3(), camDir = new THREE.Vector3(), fwd = new THREE.Vector3();
  const placeSpots = () => {
    const r = canvas.getBoundingClientRect();
    camera.getWorldDirection(camDir);
    fwd.set(0, 0, 1).applyQuaternion(beacon.quaternion);
    const facing = fwd.dot(camDir) < -0.25; // the front of the beacon faces the camera
    spots.forEach((spot) => {
      const key = spot.dataset.anchor;
      tmp.copy(anchors[key]).applyMatrix4(beacon.matrixWorld).project(camera);
      spot.style.transform = 'translate(' + ((tmp.x + 1) / 2 * r.width) + 'px,' + ((1 - tmp.y) / 2 * r.height) + 'px)';
      spot.classList.toggle('is-hidden', !!frontFacing[key] && !facing);
    });
  };

  // ---------- Loop: only while visible ----------
  let visible = false, needsRender = true, rafId = 0;
  const clock = new THREE.Clock();

  const scrollProgress = () => {
    const r = stage.getBoundingClientRect();
    const vh = window.innerHeight;
    return Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
  };

  const frame = () => {
    rafId = 0;
    const t = clock.getElapsedTime();

    if (!reduceMotion) {
      if (!dragging) { dragVel *= 0.92; userYaw += dragVel; }
      const p = scrollProgress();
      // stays mostly front-on: a gentle sway, plus a quarter turn tied to scroll through the section
      beacon.rotation.y = -0.35 + userYaw + Math.sin(t * 0.45) * 0.35 + (p - 0.5) * 0.9;
      beacon.position.y = Math.sin(t * 1.1) * 0.025; // bobbing on the swell
      beacon.rotation.z = Math.sin(t * 0.8) * 0.03;
      capAngle += (capTarget - capAngle) * 0.12;
    } else {
      beacon.rotation.y = -0.35 + userYaw;
      capAngle = capTarget;
    }
    capPivot.rotation.x = -capAngle * 0.95;

    const since = t - modeAt;
    if (mode === 'fixing' && since > 1.6) setMode('active');
    // the button sinks while pressed, then springs back
    pressDepth += ((mode === 'fixing' && since < 0.9 ? 1 : 0) - pressDepth) * 0.3;
    button.position.z = D / 2 + 0.018 - pressDepth * 0.012;
    // amber LED blinks while finding a fix, then stays on
    ledMat.emissiveIntensity = mode === 'fixing' ? (reduceMotion || Math.floor(since * 4) % 2 ? 2.2 : 0.2) : mode === 'active' ? 2.2 : 0;
    // strobe: a double flash every 2 seconds once active (well under 3 flashes per second)
    if (mode === 'active') {
      const c = since % 2;
      const on = c < 0.07 || (c > 0.22 && c < 0.29);
      domeMat.emissiveIntensity = reduceMotion ? 1.2 : on ? 3 : 0.05;
      strobe.intensity = reduceMotion ? 2 : on ? 9 : 0;
    } else { domeMat.emissiveIntensity = 0.05; strobe.intensity = 0; }
    // signal rings rise and fade from the antenna
    rings.forEach((ring, i) => {
      if (mode !== 'active' || reduceMotion) { ring.material.opacity = 0; return; }
      const k = ((since + i * 0.6) % 1.8) / 1.8;
      ring.scale.setScalar(1 + k * 3.2); // waves spreading out from the antenna tip, facing you
      ring.material.opacity = 0.7 * (1 - k);
    });
    // night mode while it calls for help: the beam dims so the strobe carries the scene
    const night = mode === 'fixing' || mode === 'active';
    const ease = reduceMotion ? 1 : 0.08;
    beam.intensity += ((night ? 18 : 70) - beam.intensity) * ease;
    fill.intensity += ((night ? 0.25 : 1.1) - fill.intensity) * ease;
    beacon.updateMatrixWorld();
    placeSpots();

    renderer.render(scene, camera);
    needsRender = false;
    const settling = Math.abs(capTarget - capAngle) > 0.01 || pressDepth > 0.01 || mode === 'fixing';
    if (visible && (!reduceMotion || dragging || needsRender || settling)) rafId = requestAnimationFrame(frame);
  };

  const kick = () => { if (!rafId) rafId = requestAnimationFrame(frame); };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); }, { rootMargin: '100px' }).observe(stage);

  if (reduceMotion) { // render on demand only
    canvas.addEventListener('pointermove', () => dragging && kick());
    canvas.addEventListener('keydown', kick);
  }
  resize();
  setMode('closed');
  kick();
})();
