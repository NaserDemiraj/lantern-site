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
      // the cap lifts as the section comes in, showing the button
      capPivot.rotation.x = -Math.min(1, Math.max(0, (p - 0.25) / 0.3)) * 0.95;
      // strobe: a double flash every 2 seconds (well under 3 flashes per second)
      const c = t % 2;
      const on = (c < 0.07) || (c > 0.22 && c < 0.29);
      domeMat.emissiveIntensity = on ? 2.4 : 0.05;
      strobe.intensity = on ? 6 : 0;
    } else {
      beacon.rotation.y = -0.35 + userYaw;
      capPivot.rotation.x = -0.95;
      domeMat.emissiveIntensity = 0.6; // a steady glow, no flashing
      strobe.intensity = 1.2;
    }

    renderer.render(scene, camera);
    needsRender = false;
    if (visible && (!reduceMotion || dragging || needsRender)) rafId = requestAnimationFrame(frame);
  };

  const kick = () => { if (!rafId) rafId = requestAnimationFrame(frame); };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); }, { rootMargin: '100px' }).observe(stage);

  if (reduceMotion) { // render on demand only
    canvas.addEventListener('pointermove', () => dragging && kick());
    canvas.addEventListener('keydown', kick);
  }
  resize();
  kick();
})();
