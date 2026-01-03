/* SAHNE */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

/* KAMERA */
const camera = new THREE.PerspectiveCamera(
  75,
  innerWidth / innerHeight,
  0.1,
  2000
);
camera.position.set(0, 6, 10);

/* RENDER */
const renderer = new THREE.WebGLRenderer({ antialias: true });
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(innerWidth, innerHeight);
  document.body.appendChild(renderer.domElement);

/* IŞIK */
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.position.set(20, 30, 10);
scene.add(sun);

/* YOL */
const roadPieces = [];
function createRoad(z) {
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 200),
    new THREE.MeshStandardMaterial({ color: 0x2f2f2f })
  );
  road.rotation.x = -Math.PI / 2;
  road.position.z = z;
  road.position.y = 0.01;
  scene.add(road);
  roadPieces.push(road);
}
createRoad(0);
createRoad(200);

/* ŞERİTLER */
const laneMarkers = [];
const laneMarkerGeo = new THREE.BoxGeometry(0.4, 0.02, 5);
const laneMarkerMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
function laneLines(z) {
  for (let i = -10; i <= 10; i += 5) {
    const line = new THREE.Mesh(laneMarkerGeo, laneMarkerMat);
    line.position.set(i, 0.02, z);
    scene.add(line);
    laneMarkers.push(line);
  }
}
for (let z = -50; z < 250; z += 15) laneLines(z);

/* ŞEHİR */
const buildings = [];
function spawnBuilding(x, z) {
  const h = 6 + Math.random() * 30;
  const group = new THREE.Group();

  const color = new THREE.Color(
    0.25 + Math.random() * 0.5,
    0.25 + Math.random() * 0.5,
    0.25 + Math.random() * 0.5
  );
  const mainMat = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.05,
    roughness: 0.7,
  });
  const main = new THREE.Mesh(new THREE.BoxGeometry(6, h, 6), mainMat);
  main.position.y = h / 2;
  group.add(main);

  // add simple window grid on both inner-facing sides
  const windowMatOn = new THREE.MeshStandardMaterial({
    color: 0xfff1a8,
    emissive: 0xfff1a8,
    emissiveIntensity: 0.9,
  });
  const windowMatOff = new THREE.MeshStandardMaterial({ color: 0x1b2430 });

  const rows = Math.max(2, Math.floor(h / 3));
  const cols = 2;
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const mat = Math.random() > 0.6 ? windowMatOn : windowMatOff;
        const win = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), mat);
        const wx = side * (2.2 - i * 2.0);
        const wz =
          -(rows * 0.7) / 2 + j * 0.7 + 0.3 + (Math.random() - 0.5) * 0.1;
        const wy = 0.8 + j * (h / rows);
        win.position.set(wx, wy, wz);
        win.rotation.y = side === -1 ? Math.PI / 2 : -Math.PI / 2;
        group.add(win);
      }
    }
  }

  group.position.set(
    x + (Math.random() - 0.5) * 2,
    0,
    z + (Math.random() - 0.5) * 8
  );
  scene.add(group);
  buildings.push(group);
}
for (let z = 0; z < 400; z += 40) {
  spawnBuilding(-20, z + Math.random() * 20);
  spawnBuilding(20, z + Math.random() * 20);
}

/* ARABA MODELİ OLUŞTUR */
function createCarModel(color = 0x333333) {
  const g = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.3,
    roughness: 0.4,
  });

  const cabinMat = new THREE.MeshStandardMaterial({
    color: 0xddddff,
    metalness: 0.1,
    roughness: 0.2,
    opacity: 0.95,
    transparent: true,
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.6, 4.2), bodyMat);
  body.position.y = 0.4;
  g.add(body);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.6, 2), cabinMat);
  cabin.position.set(0, 0.8, -0.2);
  g.add(cabin);

  const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.4, 12);
  const wheelMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    metalness: 0.8,
    roughness: 0.4,
  });

  const wheelPositions = [
    [-0.9, 0.2, -1.6],
    [0.9, 0.2, -1.6],
    [-0.9, 0.2, 1.6],
    [0.9, 0.2, 1.6],
  ];

  for (let p of wheelPositions) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(p[0], p[1], p[2]);
    g.add(w);
  }

  return g;
}

/* OYUNCU ARABA */
const player = createCarModel(0x111111);
player.position.y = 0.5;
scene.add(player);

/* TRAFİK */
const traffic = [];
const lanes = [-6, -2, 2, 6];
const MAX_TRAFFIC = 10; // maximum concurrent traffic to reduce load
const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.4, 8);
// Player state
let playerHP = 100;
let invulnerable = false;
let gameOver = false;
// update HUD initial
const hpElInit = document.getElementById("hp");
if (hpElInit) hpElInit.innerText = playerHP;

// collision boxes (reused)
const playerBox = new THREE.Box3();
const tmpBox = new THREE.Box3();

function createTraffic() {
  const color = Math.floor(Math.random() * 0xffffff);
  const car = createCarModel(color);
  car.position.x = lanes[Math.floor(Math.random() * lanes.length)];
  if (traffic.length >= MAX_TRAFFIC) return;

  car.position.x = lanes[Math.floor(Math.random() * lanes.length)];
  car.position.z = player.position.z + 350 + Math.random() * 150;
  car.position.y = 0.4;
  car.userData = {
    speed: 0.2 + Math.random() * 0.35,
    targetLane: car.position.x,
  };
  scene.add(car);
  traffic.push(car);
}
const trafficInterval = setInterval(createTraffic, 1400);

/* KONTROLLER */
let speed = 0,
  rot = 0;
const keys = {};
let km = 0;
const MAX_TRAFFIC = 6; // maximum concurrent traffic to reduce load
const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.4, 6);
onkeyup = (e) => (keys[e.key.toLowerCase()] = false);

// Mobile / touch controls binding
function bindMobileControls() {
  const map = [
    { id: "gas", key: "w" },
    { id: "brake", key: "s" },
    { id: "left", key: "a" },
    { id: "right", key: "d" },
  const colorIndex = Math.floor(Math.random() * 6);
  const car = createCarModel(colorIndex);
  function setKey(k, v) {
    keys[k] = v;
  }

  car.position.z = player.position.z + 400 + Math.random() * 200;
    const el = document.getElementById(m.id);
    if (!el) return;

    const down = (e) => {
      e.preventDefault();
      setKey(m.key, true);
    };
    const up = (e) => {
const trafficInterval = setInterval(createTraffic, 2000);
      setKey(m.key, false);
    };

    el.addEventListener("touchstart", down, { passive: false });
    el.addEventListener("touchend", up);
    el.addEventListener("touchcancel", up);
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("mousedown", down);
    el.addEventListener("mouseup", up);
  });

  // prevent gestures scrolling on the whole controls area
  const controls = document.getElementById("mobile-controls");
  if (controls) {
    controls.addEventListener("touchstart", (e) => e.preventDefault(), {
      passive: false,
    });
  }
}

// bind when DOM ready
if (document.readyState === "complete" || document.readyState === "interactive")
  bindMobileControls();
else document.addEventListener("DOMContentLoaded", bindMobileControls);

/* ÇARPIŞMA */
function hit(a, b) {
  return (
    Math.abs(a.position.x - b.position.x) < 1.5 &&
    Math.abs(a.position.z - b.position.z) < 3.5
  );
}

function animate() {
  if (gameOver) return;
  requestAnimationFrame(animate);

  /* OYUNCU */
  if (keys.w) speed = Math.min(speed + 0.02, 1.2);
  if (keys.s) speed = Math.max(speed - 0.02, 0);
  speed *= 0.98;
  if (keys.a) rot += 0.04;
  if (keys.d) rot -= 0.04;

  player.rotation.y = rot;
  player.position.x += Math.sin(rot) * speed;
  player.position.z += Math.cos(rot) * speed;

  km += speed * 0.02;
  document.getElementById("km").innerText = km.toFixed(2);

  /* KAMERA */
  const camDistance = 14;
  const camHeight = 6;

  camera.position.x =
    player.position.x - Math.sin(player.rotation.y) * camDistance;
  camera.position.z =
    player.position.z - Math.cos(player.rotation.y) * camDistance;
  camera.position.y = camHeight;

  camera.lookAt(player.position.x, player.position.y + 1, player.position.z);

  /* TRAFİK AI */
  for (let i = traffic.length - 1; i >= 0; i--) {
    const t = traffic[i];
    // move traffic toward player
    t.position.z -= t.userData.speed;

    if (Math.random() < 0.01) {
      t.userData.targetLane = lanes[Math.floor(Math.random() * lanes.length)];
    }
    t.position.x += (t.userData.targetLane - t.position.x) * 0.05;

    // collision using bounding boxes for accuracy
    playerBox.setFromObject(player);
    tmpBox.setFromObject(t);
    if (playerBox.intersectsBox(tmpBox)) {
      if (!invulnerable) {
        const damage = 25;
        playerHP = Math.max(0, playerHP - damage);
        const hpEl = document.getElementById("hp");
        if (hpEl) hpEl.innerText = playerHP;

        invulnerable = true;
        // stun: stop movement briefly and push player and the traffic apart
        speed = 0;
        const pushBack = 4;
        player.position.x -= Math.sin(player.rotation.y) * pushBack;
        player.position.z -= Math.cos(player.rotation.y) * pushBack;
        t.position.z -= 6; // move traffic back to avoid overlap

        setTimeout(() => {
          invulnerable = false;
        }, 1000);

        if (playerHP <= 0) {
          gameOver = true;
          clearInterval(trafficInterval);
          alert("Oyun bitti! KM: " + km.toFixed(2));
        }
      }
    }

    if (t.position.z < player.position.z - 50) {
      scene.remove(t);
      traffic.splice(i, 1);
    }
  }

  /* SONSUZ AKIŞ - YOL, ŞERİT VE BİNALARI GERİ DÖNÜŞÜM */
  // Road pieces: when a piece is far behind player, move it forward
  for (let r of roadPieces) {
    if (r.position.z < player.position.z - 100) {
      r.position.z += 400; // two pieces of length 200 each -> loop length 400
    }
  }

  // Lane markers: recycle similarly
  for (let m of laneMarkers) {
    if (m.position.z < player.position.z - 100) {
      m.position.z += 400;
    }
  }

  // Buildings: when building goes behind, move it forward and randomize height
  for (let i = buildings.length - 1; i >= 0; i--) {
    const b = buildings[i];
    if (b.position.z < player.position.z - 50) {
      // remove old and spawn a new one further ahead for variety
      const bx = b.position.x;
      const newZ = b.position.z + 400;
      scene.remove(b);
      buildings.splice(i, 1);
      spawnBuilding(bx < 0 ? -20 : 20, newZ + Math.random() * 10);
    }
  }

  renderer.render(scene, camera);
}
animate();

onresize = () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
};
