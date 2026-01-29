/* ========================================
   UI LOGIC
   ======================================== */

function toggleControls() {
  const controlsBox = document.getElementById('controls-box');
  controlsBox.style.display = controlsBox.style.display === 'block' ? 'none' : 'block';
}

/* ========================================
   CONFIGURATION & STATE
   ======================================== */

const config = {
  particleCount: 20000,
  particleSize: 0.4,
  morphSpeed: 0.1,
  colorBoost: 1.5,
  rotationSensitivity: 0.035,
  smoothingFactor: 0.2,
  pinchThreshold: 0.04
};

const state = {
  handDetected: false,
  smoothedHandPosition: { x: 0, y: 0 },
  smoothedPinchDistance: 1,
  isPinching: false,
  currentShapeIndex: 0
};

/* ========================================
   DYNAMIC COLOR PALETTES
   ======================================== */

const PALETTES = {
  cool_tones: { startHue: 0.6, range: 0.4, speed: 0.2, lightness: 0.5, accent: '#00ffff' },
  warm_fire: { startHue: 0.0, range: 0.2, speed: 0.3, lightness: 0.55, accent: '#ff5500' },
  nature_emerald: { startHue: 0.25, range: 0.25, speed: 0.2, lightness: 0.5, accent: '#00ffaa' },
  retro_vaporwave: { startHue: 0.75, range: 0.5, speed: 0.4, lightness: 0.6, accent: '#ff00ff' },
  forest_deep: { startHue: 0.3, range: 0.2, speed: 0.15, lightness: 0.4, accent: '#99ff00' },
  gold_solar: { startHue: 0.1, range: 0.1, speed: 0.35, lightness: 0.6, accent: '#ffcc00' },
  midnight_nebula: { startHue: 0.8, range: 0.3, speed: 0.25, lightness: 0.45, accent: '#9900ff' },
  bubblegum_pop: { startHue: 0.85, range: 0.15, speed: 0.4, lightness: 0.7, accent: '#ff88dd' }
};

let currentPalette = PALETTES.cool_tones;

/* ========================================
   UPDATE COLOR PALETTE FUNCTION
   ======================================== */

window.updateColorPalette = function() {
  const selector = document.getElementById('color-select');
  currentPalette = PALETTES[selector.value];
  const accent = currentPalette.accent;
  const dark = '#333333';

  // 1. Update Webcam Container
  const wc = document.getElementById('webcam-container');
  wc.style.borderColor = accent;
  wc.style.boxShadow = `0 0 20px ${accent}`;
  wc.style.borderRadius = '4px';

  // 2. Update Top Info Bar
  const ti = document.getElementById('top-info');
  ti.style.borderColor = accent;
  ti.style.textShadow = `6px 6px ${dark}, 0 0 15px ${accent}`;
  document.getElementById('shape-name').style.color = accent;

  // 3. Update Toggle Button
  const tb = document.getElementById('toggle-button');
  tb.style.borderColor = accent;
  tb.style.color = accent;
  tb.style.boxShadow = `0 0 10px ${accent}`;

  // 4. Update Control Box
  const cb = document.getElementById('controls-box');
  cb.style.borderColor = accent;
  cb.style.boxShadow = `0 0 20px ${accent}`;
  cb.querySelector('h3').style.color = accent;

  // 5. Update Color Control Box
  const cc = document.getElementById('color-control-fixed');
  cc.style.borderColor = accent;
  cc.style.boxShadow = `0 0 20px ${accent}`;
  document.getElementById('color-select').style.borderColor = accent;
  document.getElementById('color-select').style.color = accent;

  // 6. Update Loader
  document.getElementById('loader').style.color = accent;
};

// Initial setup
document.addEventListener('DOMContentLoaded', () => {
  updateColorPalette();
});

/* ========================================
   THREE.JS SETUP
   ======================================== */

const canvas = document.querySelector('#c');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.015);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 25;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputEncoding = THREE.sRGBEncoding;

/* ========================================
   PARTICLE INITIALIZATION
   ======================================== */

const geometry = new THREE.BufferGeometry();
const positions = [];
const targets = [];
const colors = [];
const colorObj = new THREE.Color();

// Placeholder for getSpherePoint, needed for initialization
function getSpherePoint() {
  const r = 10 + Math.random() * 2;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  return { x: r * Math.sin(phi) * Math.cos(theta), y: r * Math.sin(phi) * Math.sin(theta), z: r * Math.cos(phi) };
}

for (let i = 0; i < config.particleCount; i++) {
  const p = getSpherePoint(i);
  positions.push(p.x, p.y, p.z);
  targets.push(p.x, p.y, p.z);

  const initialHue = (i / config.particleCount * currentPalette.range) + currentPalette.startHue;
  colorObj.setHSL(initialHue % 1, 1.0, currentPalette.lightness);
  colors.push(colorObj.r * config.colorBoost, colorObj.g * config.colorBoost, colorObj.b * config.colorBoost);
}

geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
geometry.userData = { targetPositions: targets };

const sprite = new THREE.TextureLoader().load('https://threejs.org/examples/textures/sprites/spark1.png');

const material = new THREE.PointsMaterial({
  size: config.particleSize,
  map: sprite,
  vertexColors: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  transparent: true,
  opacity: 1.0,
  color: 0xFFFFFF
});

const particles = new THREE.Points(geometry, material);
scene.add(particles);

/* ========================================
   SHAPE GENERATORS
   ======================================== */

function getPyramidPoint() {
  const h = 15; const s = 10;
  const x = (Math.random() - 0.5) * s; const z = (Math.random() - 0.5) * s;
  const y = Math.random() * h;
  const reduction = 1 - (y / h);
  if (Math.abs(x) < s * reduction * 0.5 && Math.abs(z) < s * reduction * 0.5) {
    return { x: x * 2, y: y - 5, z: z * 2 };
  }
  return getPyramidPoint();
}

function getHeartPoint() {
  const t = Math.random() * Math.PI * 2 * 10; const scale = 0.8;
  const x = 16 * Math.pow(Math.sin(t), 3);
  const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
  return { x: x * scale, y: y * scale, z: (Math.random() - 0.5) * 5 };
}

function getSaturnPoint() {
  const isRing = Math.random() > 0.3;
  if (isRing) {
    const angle = Math.random() * Math.PI * 2;
    const r = 12 + Math.random() * 6;
    return { x: Math.cos(angle) * r, y: (Math.random() - 0.5), z: Math.sin(angle) * r };
  } else {
    const r = 6;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    return { x: r * Math.sin(phi) * Math.cos(theta), y: r * Math.sin(phi) * Math.sin(theta), z: r * Math.cos(phi) };
  }
}

function getTorusKnotPoint(i) {
  const u = Math.random() * Math.PI * 2; const v = Math.random() * Math.PI * 2;
  const p = 3; const q = 2; const R = 10;
  const r = 3 + Math.random() * 0.5; const scale = 0.8;
  const x = (R + r * Math.cos(q * u)) * Math.cos(p * u) * scale;
  const y = (R + r * Math.cos(q * u)) * Math.sin(p * u) * scale;
  const z = r * Math.sin(q * u) * scale;
  return { x, y, z };
}

function getKleinBottlePoint(i) {
  const v = Math.random() * Math.PI * 2; const u = Math.random() * Math.PI * 2;
  const R = 15; const scale = 0.6; let x, y, z;
  if (u < Math.PI) {
    x = R * (Math.cos(u) * (Math.cos(u / 2) * (Math.sqrt(2) + Math.cos(v)) + Math.sin(u / 2) * Math.sin(v) * Math.cos(v)));
    y = R * (Math.sin(u) * (Math.cos(u / 2) * (Math.sqrt(2) + Math.cos(v)) + Math.sin(u / 2) * Math.sin(v) * Math.cos(v)));
    z = R * (-Math.sin(u / 2) * (Math.sqrt(2) + Math.cos(v)) + Math.cos(u / 2) * Math.sin(v) * Math.cos(v));
  } else {
    x = R * (Math.cos(u) * Math.sqrt(2) + Math.sin(u) * Math.cos(v) * Math.cos(u / 2) - Math.sin(u / 2) * Math.sin(v) * Math.sin(u));
    y = R * (Math.sin(u) * Math.sqrt(2) - Math.cos(u) * Math.cos(v) * Math.cos(u / 2) - Math.sin(u / 2) * Math.sin(v) * Math.cos(u));
    z = R * (-Math.sin(u / 2) * Math.cos(v) * Math.cos(u / 2) - Math.cos(u / 2) * Math.sin(v) * Math.sin(u));
  }
  return { x: x * scale, y: y * scale, z: z * scale };
}

function getTorusPoint() {
  const u = Math.random() * Math.PI * 2; const v = Math.random() * Math.PI * 2;
  const R = 10; const r = 4; const scale = 1.0;
  const x = (R + r * Math.cos(v)) * Math.cos(u) * scale;
  const y = (R + r * Math.cos(v)) * Math.sin(u) * scale;
  const z = r * Math.sin(v) * scale;
  return { x, y, z };
}

function getMobiusStripPoint() {
  const u = Math.random() * Math.PI * 2; const v = (Math.random() - 0.5) * 5;
  const R = 10; const scale = 1.0;
  const x = R * (Math.cos(u) + v * Math.cos(u / 2) * Math.cos(u)) * scale;
  const y = R * (Math.sin(u) + v * Math.cos(u / 2) * Math.sin(u)) * scale;
  const z = R * v * Math.sin(u / 2) * scale;
  return { x, y, z };
}

function getDinisSurfacePoint() {
  const u = Math.random() * Math.PI * 4; const v = Math.random() * Math.PI * 2;
  const a = 1; const b = 0.2; const scale = 6;
  const x = a * Math.cos(u) * Math.sin(v) * scale;
  const y = a * Math.sin(u) * Math.sin(v) * scale;
  if (v < 0.01 || v > Math.PI - 0.01) return getSpherePoint();
  const z = a * (Math.cos(v) + Math.log(Math.tan(v / 2))) + b * u;
  return { x, y, z: (z - 2) * 1.5 };
}

function getEightFigurePoint() {
  const u = Math.random() * Math.PI * 2; const r = 10; const scale = 1.0;
  const x = r * Math.cos(u) * scale;
  const y = r * Math.sin(u) * Math.cos(u) * scale;
  const z = r * Math.sin(u) * Math.sin(u) * scale;
  const noise = (Math.random() - 0.5) * 2;
  return { x: x + noise, y: y + noise, z: z + noise };
}

function getCochleoidPoint() {
  const u = Math.random() * Math.PI * 10;
  const r = (Math.sin(u) / u) * 10; const v = (Math.random() - 0.5) * 4;
  const x = r * Math.cos(u); const y = r * Math.sin(u); const z = u * 0.5;
  return { x: x + v, y: y + v, z };
}

function getHennebergPoint() {
  const u = (Math.random() - 0.5) * 10; const v = (Math.random() - 0.5) * 10;
  const scale = 1.5;
  const x = 2 * Math.sinh(u) * Math.cosh(v) - 2 * u;
  const y = 2 * Math.sinh(u) * Math.sin(v);
  const z = 2 * Math.cosh(u) * Math.cos(v);
  return { x: x * scale, y: y * scale, z: z * scale };
}

function getEnneperPoint() {
  const u = (Math.random() - 0.5) * 15; const v = (Math.random() - 0.5) * 15;
  const scale = 0.5;
  const x = u - (u * u * u) / 3 + u * v * v;
  const y = v - (v * v * v) / 3 + v * u * u;
  const z = u * u - v * v;
  return { x: x * scale, y: y * scale, z: z * scale };
}

function getCatalanPoint() {
  const u = (Math.random() - 0.5) * 20; const v = (Math.random() - 0.5) * 20;
  const scale = 0.5;
  const x = u - Math.sin(u) * Math.cosh(v);
  const y = 1 - Math.cos(u) * Math.cosh(v);
  const z = 4 * Math.sin(v) * scale;
  return { x: x * scale, y: y * scale, z };
}

function getTrevilleyPoint() {
  const u = (Math.random() - 0.5) * 10; const v = (Math.random() - 0.5) * 10;
  const scale = 2.0;
  const t = Math.exp(u); const c = Math.cos(v); const s = Math.sin(v);
  const x = t * c; const y = t * s; const z = u;
  return { x: x * scale, y: y * scale, z: z * scale };
}

function getRomanSurfacePoint() {
  const u = Math.random() * Math.PI * 2; const v = Math.random() * Math.PI * 2;
  const r = 10; const scale = 1.0;
  const x = r * Math.sin(u) * Math.sin(u) * Math.sin(v) * Math.cos(v) * scale;
  const y = r * Math.sin(v) * Math.sin(v) * Math.sin(u) * Math.cos(u) * scale;
  const z = r * Math.cos(u) * Math.cos(v) * scale;
  const noise = (Math.random() - 0.5) * 1.5;
  return { x: x + noise, y: y + noise, z: z + noise };
}

const shapes = [
  { name: "FIREWORK (SPHERE)", func: getSpherePoint },
  { name: "PYRAMID", func: getPyramidPoint },
  { name: "HEART", func: getHeartPoint },
  { name: "SATURN", func: getSaturnPoint },
  { name: "TORUS KNOT (CRAZY)", func: getTorusKnotPoint },
  { name: "KLEIN BOTTLE (CRAZY)", func: getKleinBottlePoint },
  { name: "MOBIUS STRIP", func: getMobiusStripPoint },
  { name: "SIMPLE TORUS (DONUT)", func: getTorusPoint },
  { name: "DINI'S SURFACE (SPIRAL)", func: getDinisSurfacePoint },
  { name: "EIGHT FIGURE (SPHERICAL)", func: getEightFigurePoint },
  { name: "COCHLEOID (SHELL)", func: getCochleoidPoint },
  { name: "HENNEBERG SURFACE", func: getHennebergPoint },
  { name: "ENNEPER MINIMAL SURFACE", func: getEnneperPoint },
  { name: "CATALAN MINIMAL SURFACE", func: getCatalanPoint },
  { name: "TREVILLEY MINIMAL SURFACE", func: getTrevilleyPoint },
  { name: "ROMAN SURFACE", func: getRomanSurfacePoint }
];

function switchShape() {
  state.currentShapeIndex = (state.currentShapeIndex + 1) % shapes.length;
  const shape = shapes[state.currentShapeIndex];

  document.getElementById('shape-name').innerText = shape.name;

  const targets = geometry.userData.targetPositions;
  for (let i = 0; i < config.particleCount; i++) {
    const p = shape.func(i);
    targets[3 * i] = p.x;
    targets[3 * i + 1] = p.y;
    targets[3 * i + 2] = p.z;
  }
}

/* ========================================
   MEDIAPIPE HAND TRACKING
   ======================================== */

const videoElement = document.getElementById('input_video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');

function onResults(results) {
  document.getElementById('loader').style.display = 'none';

  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    state.handDetected = true;
    const landmarks = results.multiHandLandmarks[0];

    // Set webcam overlay color based on current color accent
    const overlayColor = currentPalette.accent;
    drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: overlayColor, lineWidth: 2 });
    drawLandmarks(canvasCtx, landmarks, { color: '#ffffff', lineWidth: 1 });

    const wrist = landmarks[0];
    const indexTip = landmarks[8];
    const thumbTip = landmarks[4];
    const middleTip = landmarks[12];

    const rawX = (indexTip.x - 0.5) * 2;
    const rawY = -(indexTip.y - 0.5) * 2;

    const alpha = config.smoothingFactor;
    state.smoothedHandPosition.x = alpha * rawX + (1 - alpha) * state.smoothedHandPosition.x;
    state.smoothedHandPosition.y = alpha * rawY + (1 - alpha) * state.smoothedHandPosition.y;

    const dx = thumbTip.x - indexTip.x;
    const dy = thumbTip.y - indexTip.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < config.pinchThreshold && !state.isPinching) {
      switchShape();
      state.isPinching = true;
    } else if (dist >= config.pinchThreshold + 0.04) {
      state.isPinching = false;
    }

    const dExpX = middleTip.x - wrist.x;
    const dExpY = middleTip.y - wrist.y;
    const rawExpansionDist = Math.sqrt(dExpX * dExpX + dExpY * dExpY);

    const normalizedRawExpansion = Math.max(0.5, Math.min(2.0, rawExpansionDist * 3));

    state.smoothedPinchDistance = alpha * normalizedRawExpansion + (1 - alpha) * state.smoothedPinchDistance;

  } else {
    state.handDetected = false;
  }
  canvasCtx.restore();
}

const hands = new Hands({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
  }
});
hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});
hands.onResults(onResults);

const cameraFeed = new Camera(videoElement, {
  onFrame: async () => {
    await hands.send({ image: videoElement });
  },
  width: 640,
  height: 480
});
cameraFeed.start();

/* ========================================
   ANIMATION LOOP
   ======================================== */

function animate() {
  requestAnimationFrame(animate);

  const positions = geometry.attributes.position.array;
  const targets = geometry.userData.targetPositions;
  const colors = geometry.attributes.color.array;

  const expansion = state.handDetected ? state.smoothedPinchDistance * 0.5 + 0.5 : 1.0;
  const time = Date.now() * 0.001;
  const colorObj = new THREE.Color();

  // Dynamic Palette variables
  const { startHue, range, speed, lightness } = currentPalette;

  for (let i = 0; i < config.particleCount; i++) {
    const ix = i * 3;

    // Morphing
    positions[ix] += (targets[ix] * expansion - positions[ix]) * config.morphSpeed;
    positions[ix + 1] += (targets[ix + 1] * expansion - positions[ix + 1]) * config.morphSpeed;
    positions[ix + 2] += (targets[ix + 2] * expansion - positions[ix + 2]) * config.morphSpeed;

    positions[ix] += Math.sin(time * 2 + i * 0.1) * 0.01;

    // Dynamic Color Calculation:
    const rawParticleHue = (i / config.particleCount + time * speed) % 1;
    const hue = (rawParticleHue * range) + startHue;

    // Apply the calculated color
    colorObj.setHSL(hue % 1, 1.0, lightness);

    colors[ix] = colorObj.r * config.colorBoost;
    colors[ix + 1] = colorObj.g * config.colorBoost;
    colors[ix + 2] = colorObj.b * config.colorBoost;
  }
  geometry.attributes.position.needsUpdate = true;
  geometry.attributes.color.needsUpdate = true;

  if (state.handDetected) {
    particles.rotation.y += state.smoothedHandPosition.x * config.rotationSensitivity * 2;
    particles.rotation.x += state.smoothedHandPosition.y * config.rotationSensitivity * 1.5;
  } else {
    particles.rotation.y += 0.003;
  }

  renderer.render(scene, camera);
}

animate();

/* ========================================
   HANDLE WINDOW RESIZE
   ======================================== */

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
