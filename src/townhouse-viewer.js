import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createTownhouseHouse } from './townhouse-house.js';
import { canWalkAt, walk } from './navigation.js';

const VIEWS = new Set(['exterior', 'cutaway', 'exploded', 'plan', 'inside']);
const MOVES = new Set(['forward', 'backward', 'left', 'right']);
const KEY_MOVES = { KeyW: 'forward', KeyS: 'backward', KeyA: 'left', KeyD: 'right', ArrowUp: 'forward', ArrowDown: 'backward', ArrowLeft: 'left', ArrowRight: 'right' };
const EYE_HEIGHT = 1.58;

function subtractOpening(source, opening) {
  if (!opening) return [source];
  const minX = Math.max(source.minX, opening.minX), maxX = Math.min(source.maxX, opening.maxX);
  const minZ = Math.max(source.minZ, opening.minZ), maxZ = Math.min(source.maxZ, opening.maxZ);
  if (minX >= maxX || minZ >= maxZ) return [source];
  return [
    { ...source, maxX: minX }, { ...source, minX: maxX },
    { minX, maxX, minZ: source.minZ, maxZ: minZ },
    { minX, maxX, minZ: maxZ, maxZ: source.maxZ },
  ].filter(bounds => bounds.maxX - bounds.minX > 0.001 && bounds.maxZ - bounds.minZ > 0.001);
}

function disposeObject(root) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  root?.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (!material) continue;
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
  for (const texture of textures) texture.dispose();
  for (const material of materials) material.dispose();
  for (const geometry of geometries) geometry.dispose();
}

export function createTownhouseViewer(container, options = {}) {
  const { onChange = () => {}, onError = () => {} } = options;
  let palette = options.palette || 'oak';
  let warmLight = options.warmLight !== false;
  let view = 'exterior';
  let selectedFloor = 0;
  let workspaceId = null;
  let balconyFloor = null;
  let disposed = false;
  let contextLost = false;
  let animationFrame = 0;
  let lastTime = 0;
  let lastNotification = 0;
  let yaw = 0;
  let pitch = 0;
  let lookPointer = null;
  let walkingWorld = { floors: [], obstacles: [] };
  const movementSources = new Map();
  const listeners = [];
  const originals = new Map();
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#eceee9');
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.style.touchAction = 'none';
  canvas.style.display = 'block';
  canvas.setAttribute('aria-label', 'Mô hình nhà 5 tầng. Kéo để xoay, cuộn để phóng to. Bên trong: dùng W A S D để đi và kéo để nhìn; chọn nút tầng để chuyển tầng.');
  container.appendChild(canvas);

  const camera = new THREE.PerspectiveCamera(39, 1, 0.035, 250);
  const planCamera = new THREE.OrthographicCamera(-8, 8, 8, -8, 0.05, 250);
  planCamera.up.set(0, 0, -1);
  let activeCamera = camera;
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.09;
  controls.minDistance = 3;
  controls.maxDistance = 100;
  controls.maxPolarAngle = Math.PI / 2 - 0.025;
  const planControls = new OrbitControls(planCamera, canvas);
  planControls.enableRotate = false;
  planControls.enableDamping = true;
  planControls.enabled = false;
  planControls.minZoom = 0.6;
  planControls.maxZoom = 5;
  planControls.mouseButtons.LEFT = THREE.MOUSE.PAN;
  planControls.touches.ONE = THREE.TOUCH.PAN;

  const ambient = new THREE.HemisphereLight('#ffffff', '#beb4a1', 1.3);
  const sun = new THREE.DirectionalLight('#fff4e4', 2.6);
  sun.position.set(12, 28, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 22, bottom: -18, near: 0.1, far: 75 });
  sun.shadow.bias = -0.0002;
  sun.shadow.normalBias = 0.025;
  const fill = new THREE.DirectionalLight('#e2edf5', 0.8);
  fill.position.set(-8, 15, -10);
  const interiorLight = new THREE.PointLight('#ffe8cb', 16, 13, 2);
  scene.add(ambient, sun, sun.target, fill, interiorLight);
  const environmentScene = new RoomEnvironment();
  const environmentGenerator = new THREE.PMREMGenerator(renderer);
  const environment = environmentGenerator.fromScene(environmentScene, 0.04);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.32;
  environmentScene.dispose();
  environmentGenerator.dispose();

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(150, 150), new THREE.MeshStandardMaterial({ color: '#e1e5de', roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.24;
  ground.receiveShadow = true;
  scene.add(ground);
  const ceiling = new THREE.Group();
  ceiling.visible = false;
  scene.add(ceiling);
  const planWalls = new THREE.Group();
  planWalls.name = 'plan-wall-sections';
  planWalls.visible = false;
  scene.add(planWalls);

  let house;
  let layout;
  let floors;
  const floorLabels = new THREE.Group();
  floorLabels.name = 'floor-labels';
  scene.add(floorLabels);

  function listen(target, event, callback, config) {
    target.addEventListener(event, callback, config);
    listeners.push(() => target.removeEventListener(event, callback, config));
  }

  function getFloorData(index = selectedFloor) {
    return layout.floors?.[index] || floors[index];
  }

  function elevation(index = selectedFloor) {
    return floors[index]?.elevation ?? getFloorData(index)?.elevation ?? index * 3.3;
  }

  function floorHeight(index = selectedFloor) {
    return floors[index]?.height ?? getFloorData(index)?.height ?? 3.3;
  }

  function state() {
    return { view, floor: selectedFloor, workspaceId, balconyFloor, floorName: getFloorData()?.name, position: { x: camera.position.x, y: camera.position.y, z: camera.position.z } };
  }

  function notify() { onChange(state()); }

  function labelTexture(text) {
    const surface = document.createElement('canvas');
    surface.width = 512;
    surface.height = 96;
    const ctx = surface.getContext('2d');
    ctx.fillStyle = '#253a35';
    ctx.beginPath();
    ctx.roundRect(2, 3, 504, 86, 18);
    ctx.fill();
    ctx.fillStyle = '#f6f5ee';
    ctx.font = '500 35px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 254, 46, 470);
    const texture = new THREE.CanvasTexture(surface);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  function buildHouse() {
    if (house) { scene.remove(house.group); disposeObject(house.group); }
    disposeObject(floorLabels);
    floorLabels.clear();
    originals.clear();
    house = createTownhouseHouse({ ...options.dimensions, palette, warmLight });
    layout = house.layout;
    floors = house.floors;
    if (!house.group || !layout || !Array.isArray(floors) || floors.length !== 5) throw new Error('Townhouse model must contain five floors');
    selectedFloor = Math.min(selectedFloor, floors.length - 1);
    scene.add(house.group);
    house.group.traverse(object => originals.set(object, { visible: object.visible, position: object.position.clone(), scale: object.scale.clone() }));
    for (let index = 0; index < floors.length; index++) {
      const material = new THREE.SpriteMaterial({ map: labelTexture(index ? `LẦU ${index}` : 'TẦNG TRỆT'), depthTest: false, transparent: true });
      const label = new THREE.Sprite(material);
      label.scale.set(2.35, 0.44, 1);
      label.position.set(-layout.width / 2 - 1.5, elevation(index) + 0.8, layout.depth / 2 + 0.2);
      label.userData.index = index;
      floorLabels.add(label);
    }
    applyLighting();
  }

  function clearMovement() {
    movementSources.clear();
    if (lookPointer !== null && canvas.hasPointerCapture(lookPointer)) canvas.releasePointerCapture(lookPointer);
    lookPointer = null;
  }

  function restoreModel() {
    for (const [object, original] of originals) {
      object.visible = original.visible;
      object.position.copy(original.position);
      object.scale.copy(original.scale);
    }
  }

  function setFaceVisibility(floor, mode) {
    const faces = floor.wallFaces || floor.facades || {};
    const hide = mode === 'plan' ? ['front', 'right', 'left', 'rear', 'back'] : ['front', 'right'];
    for (const face of hide) if (faces[face]) faces[face].visible = false;
    floor.group.traverse(object => {
      const role = object.userData?.wallFace || object.userData?.face;
      if (hide.includes(role) || hide.some(face => object.name === `${face}-wall` || object.name === `${face}-facade`)) object.visible = false;
      if (mode === 'plan' && object.userData?.hideInPlan) object.visible = false;
      if (mode === 'cutaway' && object.userData?.hideInCutaway) object.visible = false;
    });
    if (mode === 'plan' && floor.walls && !Object.keys(faces).length) floor.walls.visible = false;
  }

  function applyVisibility() {
    restoreModel();
    const isolated = view === 'plan' || view === 'inside';
    for (let index = 0; index < floors.length; index++) {
      const floor = floors[index];
      floor.group.visible = !isolated || index === selectedFloor;
      if (view === 'exploded') floor.group.position.y += index * 2.7;
      if (view === 'cutaway' || view === 'exploded') setFaceVisibility(floor, 'cutaway');
      if (view === 'plan') {
        setFaceVisibility(floor, 'plan');
        if (floor.walls) floor.walls.visible = false;
        if (floor.partitions) floor.partitions.visible = false;
      }
      if (floor.ceiling) floor.ceiling.visible = view === 'inside';
      if (floor.roof) floor.roof.visible = view === 'exterior';
    }
    if (house.roof) house.roof.visible = view === 'exterior';
    const threshold = house.group.getObjectByName('entry-threshold');
    if (threshold) threshold.visible = !isolated || selectedFloor === 0;
    floorLabels.visible = view === 'exploded';
    for (const label of floorLabels.children) label.position.y = elevation(label.userData.index) + label.userData.index * 2.7 + 0.8;
    ground.visible = view !== 'inside' && view !== 'plan';
    ceiling.visible = view === 'inside' && !floors[selectedFloor].ceiling;
    if (ceiling.visible) {
      disposeObject(ceiling);
      ceiling.clear();
      const material = new THREE.MeshStandardMaterial({ color: '#f4f2ea', side: THREE.DoubleSide, roughness: 1 });
      const data = getFloorData();
      const panels = (data.floorRects || [{ minX: -layout.width / 2, maxX: layout.width / 2, minZ: -layout.depth / 2, maxZ: layout.depth / 2 }]).flatMap(bounds => subtractOpening(bounds, data.outdoor));
      for (const bounds of panels) {
        const panel = new THREE.Mesh(new THREE.PlaneGeometry(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ), material);
        panel.rotation.x = Math.PI / 2;
        panel.position.set((bounds.minX + bounds.maxX) / 2, elevation() + floorHeight() - 0.13, (bounds.minZ + bounds.maxZ) / 2);
        ceiling.add(panel);
      }
    }
    scene.background.set(view === 'inside' ? '#eeeae1' : '#eceee9');
    house.group.updateMatrixWorld(true);
    planWalls.visible = view === 'plan';
    if (planWalls.visible) buildPlanWalls();
    sun.shadow.needsUpdate = true;
  }

  function buildPlanWalls() {
    disposeObject(planWalls);
    planWalls.clear();
    const material = new THREE.MeshBasicMaterial({ color: '#5d6c64' });
    const glassMaterial = new THREE.MeshBasicMaterial({ color: '#bacdc1' });
    const box = new THREE.Box3();
    const visited = new Set();
    const baseY = elevation();
    for (const root of [floors[selectedFloor].walls, floors[selectedFloor].partitions]) root?.traverse(object => {
      if (!object.isMesh || visited.has(object)) return;
      visited.add(object);
      box.setFromObject(object);
      if (box.min.y > baseY + 0.7 || box.max.y < baseY + 0.7) return;
      const width = box.max.x - box.min.x, depth = box.max.z - box.min.z;
      if (width < 0.001 || depth < 0.001) return;
      const section = new THREE.Mesh(new THREE.BoxGeometry(width, 0.08, depth), object.material?.transparent ? glassMaterial : material);
      section.position.set((box.min.x + box.max.x) / 2, baseY + 0.055, (box.min.z + box.max.z) / 2);
      planWalls.add(section);
    });
  }

  function applyLighting() {
    ambient.intensity = warmLight ? 1.15 : 1.4;
    sun.color.set(warmLight ? '#fff0db' : '#ffffff');
    sun.intensity = warmLight ? 2.4 : 2.7;
    interiorLight.intensity = view === 'inside' && warmLight ? 18 : 0;
    interiorLight.position.set(0, elevation() + floorHeight() - 0.45, 1.7);
    house.setWarmLight?.(warmLight);
  }

  function createWalkingWorld(workspace = null) {
    const floor = floors[selectedFloor];
    const data = getFloorData();
    const baseY = elevation();
    const floorsRects = data.floorRects || floor.floorRects || [{ minX: -layout.width / 2 + 0.12, maxX: layout.width / 2 - 0.12, minZ: -layout.depth / 2 + 0.12, maxZ: layout.depth / 2 - 0.12 }];
    const obstacles = [];
    const box = new THREE.Box3();
    floor.group.updateMatrixWorld(true);
    floor.group.traverse(object => {
      if (!object.isMesh || object.userData?.walkThrough) return;
      let ancestor = object.parent;
      while (ancestor && ancestor !== floor.group) {
        if (ancestor.userData?.walkThrough || ancestor === floor.slab) return;
        ancestor = ancestor.parent;
      }
      if (object === floor.slab || object.name.includes('ceiling') || object.name.includes('floor-slab')) return;
      box.setFromObject(object);
      if (box.max.y <= baseY + 0.15 || box.min.y >= baseY + EYE_HEIGHT + 0.12) return;
      if (!Number.isFinite(box.min.x)) return;
      obstacles.push({ minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z });
    });
    for (const blocked of data.blockedRects || []) obstacles.push(blocked);
    walkingWorld = { floors: floorsRects, obstacles };
    const roomId = ['entry', 'living', 'master', 'bedroom-front', 'terrace'][selectedFloor];
    const cameraHint = workspace?.camera || data.rooms?.find(room => room.id === roomId)?.camera || data.insideCamera || data.camera;
    const supplied = cameraHint?.position || data.spawn;
    const desired = Array.isArray(supplied) ? { x: supplied[0], z: supplied.length === 2 ? supplied[1] : supplied[2] } : { x: layout.width * 0.25, z: layout.depth / 2 - 1.25 };
    const candidates = [desired];
    if (workspace?.room) {
      const roomCandidates = [];
      for (let z = workspace.room.minZ + 0.18; z < workspace.room.maxZ - 0.18; z += 0.2) {
        for (let x = workspace.room.minX + 0.18; x < workspace.room.maxX - 0.18; x += 0.2) roomCandidates.push({ x, z });
      }
      roomCandidates.sort((a, b) => Math.hypot(a.x - desired.x, a.z - desired.z) - Math.hypot(b.x - desired.x, b.z - desired.z));
      candidates.push(...roomCandidates);
    }
    if (Array.isArray(data.spawn)) candidates.push({ x: data.spawn[0], z: data.spawn[1] });
    for (let z = layout.depth / 2 - 0.65; z > -layout.depth / 2 + 0.5; z -= 0.3) {
      for (let x = layout.width / 2 - 0.4; x > -layout.width / 2 + 0.35; x -= 0.3) candidates.push({ x, z });
    }
    const spawn = candidates.find(point => canWalkAt(point, walkingWorld));
    if (!spawn) throw new Error(`No walkable starting position on floor ${selectedFloor + 1}`);
    camera.position.set(spawn.x, baseY + EYE_HEIGHT, spawn.z);
    const desk = workspace?.desk?.bounds;
    const target = desk ? [(desk.minX + desk.maxX) / 2, 1, (desk.minZ + desk.maxZ) / 2] : spawn === desired ? cameraHint?.target : null;
    yaw = target ? Math.atan2(target[0] - spawn.x, spawn.z - target[2]) : data.insideYaw ?? (spawn.z < 0 ? Math.PI : 0);
    pitch = target ? THREE.MathUtils.clamp(Math.atan2(target[1] - EYE_HEIGHT, Math.hypot(target[0] - spawn.x, target[2] - spawn.z)), workspace ? -1.2 : -0.25, 0.25) : 0;
    updateLook();
  }

  function updateLook() {
    camera.lookAt(camera.position.x + Math.sin(yaw) * Math.cos(pitch), camera.position.y + Math.sin(pitch), camera.position.z - Math.cos(yaw) * Math.cos(pitch));
  }

  function framingArea() {
    const width = Math.max(1, container.clientWidth), height = Math.max(1, container.clientHeight);
    const compact = window.innerWidth <= 720;
    const top = compact ? 230 : 30, bottom = compact ? 90 : 70;
    const offsetX = compact ? 0 : window.innerWidth > 1000 ? -90 : -Math.min(55, width * 0.1);
    return { width, height, usableWidth: Math.max(180, width - Math.abs(offsetX) * 2), usableHeight: Math.max(180, height - top - bottom), offsetX, offsetY: compact ? -(top - bottom) / 2 : 0 };
  }

  function applyProjectionOffset(targetCamera) {
    const area = framingArea();
    if (view === 'inside') targetCamera.clearViewOffset();
    else targetCamera.setViewOffset(area.width, area.height, area.offsetX, area.offsetY, area.width, area.height);
  }

  function fitPerspective(focusFloor = false) {
    const exploded = view === 'exploded';
    const totalHeight = layout.totalHeight || elevation(4) + floorHeight(4);
    const top = totalHeight + (exploded ? 10.8 : 0);
    const center = new THREE.Vector3(0, focusFloor ? elevation() + floorHeight() / 2 : top * 0.48, 0);
    const width = layout.width + (exploded ? 4.5 : 0.8);
    const height = focusFloor ? floorHeight() + 0.8 : top + 1.2;
    const diagonal = Math.hypot(width, layout.depth * 0.72);
    const verticalFov = THREE.MathUtils.degToRad(camera.fov);
    const area = framingArea();
    const distance = Math.max(height / (2 * Math.tan(verticalFov / 2)) * area.height / area.usableHeight, diagonal / (2 * Math.tan(verticalFov / 2) * camera.aspect) * area.width / area.usableWidth) * 1.25;
    const direction = view === 'exterior' ? new THREE.Vector3(0.28, 0.19, 1) : new THREE.Vector3(0.88, 0.66, 1);
    camera.position.copy(center).addScaledVector(direction.normalize(), distance);
    controls.target.copy(center);
    camera.lookAt(center);
    applyProjectionOffset(camera);
    controls.update();
  }

  function fitPlan() {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    const aspect = width / height;
    const area = framingArea();
    const halfHeight = Math.max((layout.depth + 1.1) / 2 * area.height / area.usableHeight, (layout.width + 1.8) / (2 * aspect) * area.width / area.usableWidth);
    planCamera.left = -halfHeight * aspect;
    planCamera.right = halfHeight * aspect;
    planCamera.top = halfHeight;
    planCamera.bottom = -halfHeight;
    planCamera.zoom = 1;
    planCamera.position.set(0, elevation() + 28, 0);
    planControls.target.set(0, elevation(), 0);
    planCamera.lookAt(planControls.target);
    applyProjectionOffset(planCamera);
    planCamera.updateProjectionMatrix();
    planControls.update();
  }

  function frameView(focusFloor = false, workspace = null) {
    controls.enabled = view !== 'plan' && view !== 'inside';
    planControls.enabled = view === 'plan';
    activeCamera = view === 'plan' ? planCamera : camera;
    camera.fov = view === 'inside' ? 70 : 39;
    applyProjectionOffset(activeCamera);
    camera.updateProjectionMatrix();
    applyVisibility();
    if (view === 'inside') createWalkingWorld(workspace);
    else if (view === 'plan') fitPlan();
    else fitPerspective(focusFloor);
    applyLighting();
    notify();
  }

  function setView(nextView) {
    if (!VIEWS.has(nextView) || disposed) return;
    clearMovement();
    workspaceId = null;
    balconyFloor = null;
    view = nextView;
    frameView();
  }

  function setFloor(index) {
    if (!Number.isInteger(index) || index < 0 || index >= floors.length || disposed) return;
    clearMovement();
    workspaceId = null;
    balconyFloor = null;
    selectedFloor = index;
    frameView(view === 'cutaway');
  }

  function setWorkspace(bedroomId) {
    if (disposed) return false;
    const bedroom = layout.bedrooms?.find(item => item.id === bedroomId);
    if (!bedroom?.desk?.bounds || !bedroom.camera?.position || !floors[bedroom.floor]) return false;
    clearMovement();
    workspaceId = bedroom.id;
    balconyFloor = null;
    selectedFloor = bedroom.floor;
    view = 'inside';
    frameView(false, bedroom);
    return true;
  }

  function setBalcony(index = selectedFloor) {
    if (disposed || !Number.isInteger(index)) return false;
    const balcony = layout.floors[index]?.balcony;
    if (!balcony?.bounds || !balcony.camera?.position || !floors[index]) return false;
    clearMovement();
    workspaceId = null;
    balconyFloor = index;
    selectedFloor = index;
    view = 'inside';
    frameView(false, { camera: balcony.camera, room: balcony.bounds });
    return true;
  }

  function setMove(action, held, pointerId = 'touch') {
    if (!MOVES.has(action)) return;
    const source = `${pointerId}:${action}`;
    if (held && view === 'inside' && !disposed) movementSources.set(source, action);
    else movementSources.delete(source);
  }

  function resize() {
    if (disposed) return;
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (house && view === 'plan') fitPlan();
    else if (house && view !== 'inside') fitPerspective();
  }

  function zoom(factor = 0.8) {
    if (view === 'inside') return;
    if (!Number.isFinite(factor) || factor <= 0) return;
    if (view === 'plan') {
      planCamera.zoom = THREE.MathUtils.clamp(planCamera.zoom / factor, 0.6, 5);
      planCamera.updateProjectionMatrix();
    } else camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target);
  }

  listen(canvas, 'pointerdown', event => {
    if (view !== 'inside' || event.button !== 0 || lookPointer !== null) return;
    lookPointer = event.pointerId;
    canvas.setPointerCapture(event.pointerId);
    canvas.focus({ preventScroll: true });
    canvas.dataset.lookX = event.clientX;
    canvas.dataset.lookY = event.clientY;
    event.preventDefault();
  });
  listen(canvas, 'pointermove', event => {
    if (event.pointerId !== lookPointer || view !== 'inside') return;
    const dx = event.clientX - Number(canvas.dataset.lookX);
    const dy = event.clientY - Number(canvas.dataset.lookY);
    canvas.dataset.lookX = event.clientX;
    canvas.dataset.lookY = event.clientY;
    yaw += dx * 0.004;
    pitch = THREE.MathUtils.clamp(pitch - dy * 0.0035, -1.2, 1.2);
    updateLook();
  });
  const endLook = event => { if (lookPointer === event.pointerId) lookPointer = null; };
  listen(canvas, 'pointerup', endLook);
  listen(canvas, 'pointercancel', endLook);
  listen(canvas, 'lostpointercapture', endLook);
  listen(window, 'keydown', event => {
    if (view !== 'inside' || document.querySelector('dialog[open]') || event.ctrlKey || event.metaKey || event.altKey || event.target.closest?.('input,textarea,select,[contenteditable="true"]')) return;
    const action = KEY_MOVES[event.code];
    if (!action) return;
    event.preventDefault();
    setMove(action, true, `key:${event.code}`);
  });
  listen(window, 'keyup', event => {
    const action = KEY_MOVES[event.code];
    if (action) setMove(action, false, `key:${event.code}`);
  });
  listen(window, 'blur', clearMovement);
  listen(window, 'pagehide', clearMovement);
  listen(document, 'visibilitychange', () => { if (document.hidden) clearMovement(); });
  listen(canvas, 'webglcontextlost', event => {
    event.preventDefault();
    contextLost = true;
    clearMovement();
    onError(new Error('Mô hình 3D tạm dừng do mất kết nối đồ họa. Bạn tải lại trang để tiếp tục.'));
  });
  listen(canvas, 'webglcontextrestored', () => { contextLost = false; });
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);

  function animate(time) {
    if (disposed) return;
    animationFrame = requestAnimationFrame(animate);
    const elapsed = lastTime ? (time - lastTime) / 1000 : 0;
    lastTime = time;
    if (contextLost || document.hidden) return;
    if (view === 'inside' && movementSources.size) {
      const next = walk(camera.position, movementSources.values(), yaw, elapsed, walkingWorld);
      camera.position.set(next.x, next.y, next.z);
      updateLook();
      if (time - lastNotification > 120) { notify(); lastNotification = time; }
    }
    if (controls.enabled) controls.update();
    if (planControls.enabled) planControls.update();
    renderer.render(scene, activeCamera);
  }

  try {
    buildHouse();
    resize();
    frameView();
    animationFrame = requestAnimationFrame(animate);
  } catch (error) {
    dispose();
    throw error;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(animationFrame);
    clearMovement();
    resizeObserver.disconnect();
    for (const remove of listeners) remove();
    controls.dispose();
    planControls.dispose();
    disposeObject(house?.group);
    disposeObject(floorLabels);
    disposeObject(ground);
    disposeObject(ceiling);
    disposeObject(planWalls);
    environment.dispose();
    renderer.dispose();
    canvas.remove();
  }

  return {
    setView, setFloor, setWorkspace, setBalcony, setMove, clearMovement, resize, zoom, dispose,
    reset() { clearMovement(); workspaceId = null; balconyFloor = null; frameView(); },
    setPalette(nextPalette) {
      if (!['oak', 'walnut'].includes(nextPalette) || nextPalette === palette || disposed) return;
      palette = nextPalette;
      clearMovement();
      buildHouse();
      const balcony = balconyFloor === null ? null : layout.floors[balconyFloor]?.balcony;
      frameView(false, balcony ? { camera: balcony.camera, room: balcony.bounds } : layout.bedrooms?.find(item => item.id === workspaceId));
    },
    setWarmLight(enabled) { warmLight = Boolean(enabled); applyLighting(); },
    capture() { renderer.render(scene, activeCamera); return canvas.toDataURL('image/png'); },
    getState: state,
    getLayout() { return layout; },
  };
}
