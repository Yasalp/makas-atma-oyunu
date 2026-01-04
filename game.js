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
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "low-power",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

/* IŞIK */
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const sun = new THREE.DirectionalLight(0xffffff, 0.6);
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

/* ŞEHİR (basit: pencere detayları yok) */
const buildings = [];
function spawnBuilding(x, z) {
  const h = 6 + Math.random() * 30;
  const color = new THREE.Color(
    0.3 + Math.random() * 0.4,
    0.3 + Math.random() * 0.4,
    0.3 + Math.random() * 0.4
  );
  const mainMat = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.05,
    roughness: 0.7,
  });
  const main = new THREE.Mesh(new THREE.BoxGeometry(6, h, 6), mainMat);
  main.position.set(
    x + (Math.random() - 0.5) * 2,
    h / 2,
    z + (Math.random() - 0.5) * 8
  );
  scene.add(main);
  buildings.push(main);
}
for (let z = 0; z < 400; z += 40) {
  spawnBuilding(-20, z + Math.random() * 20);
  spawnBuilding(20, z + Math.random() * 20);
}

/* ARABA MODELİ - paylaşılan geometri/mat */
const carBodyGeo = new THREE.BoxGeometry(2, 0.6, 4.2);
const carCabinGeo = new THREE.BoxGeometry(1.4, 0.6, 2);
const carWheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.4, 6);
const wheelMatShared = new THREE.MeshStandardMaterial({
  color: 0x111111,
  metalness: 0.8,
  roughness: 0.4,
});
const cabinMatShared = new THREE.MeshStandardMaterial({
  color: 0xddddff,
  metalness: 0.1,
  roughness: 0.2,
  opacity: 0.9,
  transparent: true,
});
const bodyMats = [];
for (let i = 0; i < 6; i++)
  bodyMats.push(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(Math.random(), 0.5, 0.35),
      metalness: 0.2,
      roughness: 0.5,
    })
  );

function createCarModel(colorIndex = 0) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    carBodyGeo,
    bodyMats[colorIndex % bodyMats.length]
  );
  body.position.y = 0.4;
  g.add(body);
  const cabin = new THREE.Mesh(carCabinGeo, cabinMatShared);
  cabin.position.set(0, 0.8, -0.2);
  g.add(cabin);
  const wheelPositions = [
    [-0.9, 0.2, -1.6],
    [0.9, 0.2, -1.6],
    [-0.9, 0.2, 1.6],
    [0.9, 0.2, 1.6],
  ];
  for (let p of wheelPositions) {
    const w = new THREE.Mesh(carWheelGeo, wheelMatShared);
    w.rotation.z = Math.PI / 2;
    w.position.set(p[0], p[1], p[2]);
    g.add(w);
  }
  return g;
}

/* OYUNCU */
const player = createCarModel(0);
player.position.y = 0.5;
scene.add(player);

/* TRAFİK */
const traffic = [];
const lanes = [-6, -2, 2, 6];
const MAX_TRAFFIC = 10;
let spawningPaused = false;
let trafficInterval = null;

function createTraffic() {
  if (spawningPaused) return;
  const colorIndex = Math.floor(Math.random() * 6);
  const car = createCarModel(colorIndex);
  car.position.x = lanes[Math.floor(Math.random() * lanes.length)];
  car.position.z = player.position.z + 400 + Math.random() * 200;
  car.position.y = 0.4;
  car.userData = {
    speed: 0.2 + Math.random() * 0.35,
    targetLane: car.position.x,
  };
  scene.add(car);
  traffic.push(car);
  if (traffic.length >= MAX_TRAFFIC) spawningPaused = true;
}
trafficInterval = setInterval(createTraffic, 2000);

/* KONTROLLER */
let speed = 0,
  rot = 0;
const keys = {};
let km = 0;

onkeydown = (e) => (keys[e.key.toLowerCase()] = true);
onkeyup = (e) => (keys[e.key.toLowerCase()] = false);

// Mobile / touch controls binding
function bindMobileControls() {
  const map = [
    { id: "gas", key: "w" },
    { id: "brake", key: "s" },
    { id: "left", key: "a" },
    { id: "right", key: "d" },
  ];
  function setKey(k, v) {
    keys[k] = v;
  }
  map.forEach((m) => {
    const el = document.getElementById(m.id);
    if (!el) return;
    const down = (e) => {
      e.preventDefault();
      setKey(m.key, true);
    };
    const up = (e) => {
      if (e) e.preventDefault();
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
  const controls = document.getElementById("mobile-controls");
  if (controls)
    controls.addEventListener("touchstart", (e) => e.preventDefault(), {
      passive: false,
    });
}
if (document.readyState === "complete" || document.readyState === "interactive")
  bindMobileControls();
else document.addEventListener("DOMContentLoaded", bindMobileControls);

/* CAN ve ÇARPIŞMA */
let playerHP = 100;
let invulnerable = false;
let gameOver = false;
const hpElInit = document.getElementById("hp");
if (hpElInit) hpElInit.innerText = playerHP;
const playerBox = new THREE.Box3();
const tmpBox = new THREE.Box3();

function hit(a, b) {
  playerBox.setFromObject(a);
  tmpBox.setFromObject(b);
  return playerBox.intersectsBox(tmpBox);
}

function animate() {
  if (gameOver) return;
  requestAnimationFrame(animate);
  // player control
  if (keys.w) speed = Math.min(speed + 0.02, 1.2);
  if (keys.s) speed = Math.max(speed - 0.02, 0);
  speed *= 0.98;
  if (keys.a) rot += 0.04;
  if (keys.d) rot -= 0.04;
  player.rotation.y = rot;
  player.position.x += Math.sin(rot) * speed;
  player.position.z += Math.cos(rot) * speed;
  km += speed * 0.02;
  const kmEl = document.getElementById("km");
  if (kmEl) kmEl.innerText = km.toFixed(2);

  // camera
  const camDistance = 14,
    camHeight = 6;
  camera.position.x =
    player.position.x - Math.sin(player.rotation.y) * camDistance;
  camera.position.z =
    player.position.z - Math.cos(player.rotation.y) * camDistance;
  camera.position.y = camHeight;
  camera.lookAt(player.position.x, player.position.y + 1, player.position.z);

  // traffic
  for (let i = traffic.length - 1; i >= 0; i--) {
    const t = traffic[i];
    t.position.z -= t.userData.speed;
    if (Math.random() < 0.01)
      t.userData.targetLane = lanes[Math.floor(Math.random() * lanes.length)];
    t.position.x += (t.userData.targetLane - t.position.x) * 0.05;

    if (hit(player, t)) {
      if (!invulnerable) {
        const damage = 25;
        playerHP = Math.max(0, playerHP - damage);
        const hpEl = document.getElementById("hp");
        if (hpEl) hpEl.innerText = playerHP;
        invulnerable = true;
        speed = 0;
        const pushBack = 4;
        player.position.x -= Math.sin(player.rotation.y) * pushBack;
        player.position.z -= Math.cos(player.rotation.y) * pushBack;
        t.position.z -= 6; // separate
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

  // resume spawning only when all traffic cleared
  if (spawningPaused && traffic.length === 0) spawningPaused = false;

  // recycle road / markers / buildings
  for (let r of roadPieces)
    if (r.position.z < player.position.z - 100) r.position.z += 400;
  for (let m of laneMarkers)
    if (m.position.z < player.position.z - 100) m.position.z += 400;
  for (let i = buildings.length - 1; i >= 0; i--) {
    const b = buildings[i];
    if (b.position.z < player.position.z - 50) {
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
