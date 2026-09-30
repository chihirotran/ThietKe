import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createHouse } from './house.js';
import { createModernHouse } from './modern-house.js';
import { getHouseLayout } from './layout.js';
import { getModernLayout } from './modern-layout.js';
import { DEFAULT_DIMENSIONS, parseDimensions } from './dimensions.js';
import { DESIGN_NAMES, designStorageKey, loadDesignSettings, resolveDesign } from './designs.js';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const format = (value) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const designChoiceKey = 'nha-minh-design-choice-v1';
let savedChoice;
try { savedChoice = localStorage.getItem(designChoiceKey); } catch { savedChoice = null; }
let currentDesign = resolveDesign(new URL(location.href).searchParams.get('design') || savedChoice);
function readSettings(design) {
  let settings;
  try { settings = loadDesignSettings(localStorage.getItem(designStorageKey(design))); }
  catch { settings = loadDesignSettings(null); }
  if (design === 'modern') settings.occupants = 1;
  return settings;
}
const initialSettings = readSettings(currentDesign);
let dimensions = initialSettings.dimensions;
let occupants = initialSettings.occupants;
let palette = initialSettings.palette;
$('#warm-light').checked = initialSettings.warmLight;
let currentZone = 'overview';
let currentView = currentDesign === 'modern' ? 'perspective' : 'front';
let viewer;
let toastTimer;

const zoneInfo = {
  overview: ['Toàn bộ không gian', 'Gác ngang, tủ dưới gác và lối đi bên phải theo ảnh mẫu.'],
  living: ['Sinh hoạt & làm việc', 'Bàn cho một người, hai màn hình và hệ tủ gỗ dưới gác.'],
  loft: ['Gác ngủ ngang nhà', 'Giường nằm ngang, lan can trắng và tủ cao sát bên phải.'],
  stairs: ['Cầu thang lên gác', 'Rẽ trái ở khoảng giặt/rửa; hướng thang đi ngang được ước lượng từ video.'],
  utility: ['Khoảng giặt & lối đi', 'Nằm giữa phòng chính và bếp; nối tới cầu thang và cửa phòng tắm/WC.'],
  kitchen: ['Phòng bếp', 'Đi thẳng qua khoảng giặt/rửa, vào phòng bếp riêng ở phía sau.'],
  bathroom: ['Phòng tắm & WC', 'Bên trái bếp; cửa mở ra khoảng máy giặt/cầu thang theo bạn xác nhận.'],
};

const referenceZoneInfo = Object.fromEntries(Object.entries(zoneInfo).map(([key, value]) => [key, [...value]]));
const modernZoneInfo = {
  overview: ['Không gian hiện đại', 'Mở rộng gác, thang chữ L, khu làm việc và góc tiếp khách riêng.'],
  living: ['Sinh hoạt & làm việc', 'Sofa gọn, góc làm việc hai màn hình và tủ kín dưới gác.'],
  loft: ['Gác ngủ mở rộng', 'Giường thấp, tủ cao và lan can kính khung mảnh.'],
  stairs: ['Cầu thang chữ L', 'Hai vế thang và chiếu nghỉ; bố trí mới cho phương án cải tạo.'],
  utility: ['Giặt & lối đi', 'Khu giặt gọn, kết nối cầu thang, bếp và phòng tắm.'],
  kitchen: ['Phòng bếp', 'Tủ bếp gọn với bề mặt sáng, nối từ lối đi phía sau.'],
  bathroom: ['Phòng tắm & WC', 'Phòng riêng bên trái bếp, tiếp cận từ khu giặt và lối đi.'],
};

function activeLayout() {
  return (currentDesign === 'modern' ? getModernLayout : getHouseLayout)({ ...dimensions, occupants });
}

function saveSettings() {
  try {
    localStorage.setItem(designStorageKey(currentDesign), JSON.stringify({ dimensions, occupants, palette, warmLight: $('#warm-light').checked }));
    localStorage.setItem(designChoiceKey, currentDesign);
  } catch { /* Both designs remain usable without persistent storage. */ }
}

function updateDesignUI() {
  const modern = currentDesign === 'modern';
  Object.assign(zoneInfo, Object.fromEntries(Object.entries(modern ? modernZoneInfo : referenceZoneInfo).map(([key, value]) => [key, [...value]])));
  $$('button[data-design]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.design === currentDesign)));
  $$('button[data-palette]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.palette === palette)));
  $('#project-badge-text').textContent = modern ? 'Phương án cải tạo mới' : 'Bản đã lưu ngày 30/09/2026';
  $('#project-title').textContent = modern ? 'Nhà hiện đại 43 m²' : 'Nhà gác lửng';
  $('#project-description').textContent = modern
    ? 'Không gian cho một người ở: thêm diện tích gác, góc làm việc và chỗ thư giãn riêng.'
    : 'Bản theo ảnh bạn chọn: gác ngang, bàn hai màn hình, tủ gỗ dưới gác và lối đi bên phải.';
  $('#design-pill-text').textContent = DESIGN_NAMES[currentDesign];
  $('#renovation-panel').hidden = !modern;
  $('#loft-assumption').textContent = modern
    ? 'Phần mở rộng gác và thang chữ L là đề xuất cải tạo. Kích thước từng khu cần được đo lại.'
    : 'Chiều sâu gác khoảng nửa chiều dài phòng khách theo mô tả của bạn; vị trí mép gác vẫn là ước lượng.';
  $('.space-button[data-zone="stairs"] strong').textContent = modern ? 'Cầu thang chữ L' : 'Cầu thang lên gác';
  $('.space-button[data-zone="stairs"] small').textContent = modern ? 'Thang mới có chiếu nghỉ' : 'Rẽ trái ở khoảng giặt/rửa';
  $('[data-occupants="1"]').textContent = modern ? 'Một người ở' : 'Một người · theo ảnh';
  $('[data-occupants="2"]').hidden = modern;
  $('#viewer').dataset.design = currentDesign;
  $('#floor-minimap-drawing').setAttribute('aria-label', modern
    ? 'Sơ đồ phương án hiện đại: phòng chính, thang chữ L, khoảng giặt, bếp phía sau và phòng tắm bên trái bếp'
    : 'Sơ đồ theo ảnh: phòng chính, khoảng giặt với thang đi ngang sang trái, bếp phía sau và phòng tắm bên trái bếp');
  document.title = `nhà mình — ${DESIGN_NAMES[currentDesign]}`;
}

function toast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3400);
}

function updateMetrics() {
  $('#footprint-value').textContent = `${format(dimensions.width)} × ${format(dimensions.depth)} m`;
  $('#ground-height-value').textContent = `${format(dimensions.loftHeight)} m`;
  $('#upper-height-value').textContent = `${format(dimensions.upperHeight)} m`;
  $('#floor-area-value').textContent = `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(dimensions.width * dimensions.depth)} m²`;
  const layout = activeLayout();
  zoneInfo.loft[1] = currentDesign === 'modern'
    ? `Cao ${format(dimensions.upperHeight)} m · gác mở rộng trong chiều cao nhà hiện có.`
    : `Cao ${format(dimensions.upperHeight)} m · sâu khoảng nửa chiều dài phòng khách theo bạn mô tả.`;
  const renovation = layout.renovation;
  $('#renovation-area').textContent = renovation
    ? `Gác dùng được ≈ ${format(renovation.usableLoftArea)} m² · thêm ≈ ${format(renovation.addedUsableArea)} m² so với bản 01`
    : 'Mở rộng không gian trên gác';
}

function updateOccupancy() {
  $$('button[data-occupants]').forEach((button) => button.setAttribute('aria-pressed', String(Number(button.dataset.occupants) === occupants)));
  zoneInfo.living[1] = currentDesign === 'modern'
    ? `Sofa và tủ gọn; ${occupants === 1 ? 'một chỗ ngồi với hai màn hình' : 'hai chỗ làm việc'} dưới gác.`
    : occupants === 1
    ? 'Một chỗ ngồi với hai màn hình, tủ gỗ dưới gác và lối đi bên phải.'
    : 'Thử thêm một chỗ làm việc trên cùng bố trí gác và hệ tủ.';
  $('#occupancy-description').textContent = currentDesign === 'modern'
    ? 'Dành cho một người ở, tách góc làm việc và thư giãn; giường ngủ và tủ quần áo trên gác.'
    : occupants === 1
    ? 'Theo ảnh mẫu: một chỗ ngồi, hai màn hình, giường ngang trên gác và hệ tủ gỗ.'
    : 'Phương án bổ sung chỗ làm việc thứ hai; giữ kết cấu gác và lối đi.';
}

function updateActiveState() {
  $$('button[data-zone]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.zone === currentZone)));
  $$('button[data-view]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.view === currentView)));
  $$('[data-mini-zone]').forEach((element) => element.classList.toggle('is-selected', element.dataset.miniZone === currentZone));
  $('#view-title').textContent = currentView === 'front' ? 'Nhìn từ cửa vào' : currentView === 'plan' ? 'Mặt bằng tầng trệt' : zoneInfo[currentZone][0];
  $('#view-description').textContent = currentView === 'plan'
    ? 'Ẩn sàn gác và tường để nhìn rõ bố trí bên dưới.' : currentView === 'front'
      ? `${currentDesign === 'modern' ? 'Nội thất hiện đại và gác mở rộng' : 'Gác và nội thất theo ảnh bạn chọn'} · ${occupants === 1 ? 'một người ở' : 'hai chỗ làm việc'}.` : zoneInfo[currentZone][1];
  $('#interaction-hint').textContent = currentView === 'inside'
    ? 'Kéo để nhìn quanh · Chọn khu vực để di chuyển'
    : currentView === 'plan'
      ? 'Cuộn để phóng to · Kéo chuột phải để dịch chuyển'
      : 'Kéo để xoay · Cuộn để phóng to · Chuột phải để dịch chuyển';
  $('#viewer').dataset.view = currentView;
  $('#viewer').dataset.zone = currentZone;
  $('#show-loft').disabled = currentView === 'plan';
  $('#cutaway').disabled = currentView !== 'perspective';
}

function openReference(index = 'design') {
  const video = $('#reference-video');
  const image = $('#reference-image');
  const isVideo = index === '2' || index === 'rear';
  video.hidden = !isVideo;
  image.hidden = isVideo;
  if (!isVideo) {
    video.pause();
    image.src = index === 'design' ? '/references/design-target.png' : index === '1' ? '/references/nha1.jpeg' : '/references/nha2.jpeg';
    image.alt = index === 'design' ? 'Ảnh thiết kế do người dùng cung cấp: gác ngang, bàn hai màn hình, tủ dưới gác và lối đi bên phải' : index === '1' ? 'Lối đi bên phải dưới gác trong nhà hiện tại' : 'Toàn cảnh phòng chính và gác lửng hiện tại';
  }
  if (index === 'rear') {
    const seekRear = () => { video.currentTime = 10; };
    if (video.readyState >= 1) seekRear();
    else video.addEventListener('loadedmetadata', seekRear, { once: true });
  }
  $('#reference-caption').textContent = isVideo
    ? index === 'rear'
      ? 'Từ 0:10: lối đi → thang bên trái → máy giặt → bếp. Cửa WC ra khoảng giặt/cầu thang theo bạn xác nhận.'
      : 'Video bạn cung cấp · phòng chính, hành lang, cầu thang và bếp sau.'
    : index === 'design' ? 'Ảnh do bạn tạo bằng AI và chọn làm mẫu thiết kế. Dùng để đối chiếu dáng gác, vật liệu và nội thất; chiều sâu gác ước lượng theo mô tả của bạn.'
      : index === '1' ? 'Ảnh gốc 02 · lối đi về phía sau nhà.' : 'Ảnh gốc 01 · phòng chính và gác lửng.';
  $$('#reference-dialog [data-reference]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.reference === index)));
  if (!$('#reference-dialog').open) $('#reference-dialog').showModal();
}

$$('[data-reference]').forEach((button) => button.addEventListener('click', () => openReference(button.dataset.reference)));
$('#references-button').addEventListener('click', () => openReference());
$$('[data-close-dialog]').forEach((button) => button.addEventListener('click', () => button.closest('dialog').close()));
$$('dialog').forEach((dialog) => dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); }));
$('#reference-dialog').addEventListener('close', () => $('#reference-video').pause());
$('#reference-video').addEventListener('error', () => {
  $('#reference-caption').textContent = 'Trình duyệt chưa phát được video này. Hai ảnh gốc vẫn có thể xem ở các thẻ bên cạnh.';
});

function fillDimensionForm(values) {
  for (const [name, value] of Object.entries(values)) $('#dimensions-form').elements.namedItem(name).value = value;
}
$('#dimensions-button').addEventListener('click', () => {
  fillDimensionForm(dimensions);
  $('#dimensions-dialog').showModal();
});
$('#reset-dimensions').addEventListener('click', () => fillDimensionForm(DEFAULT_DIMENSIONS));
$('#dimensions-form').addEventListener('submit', (event) => {
  event.preventDefault();
  try {
    const next = parseDimensions(Object.fromEntries(new FormData(event.target)));
    viewer?.rebuild(next);
    dimensions = next;
    updateMetrics();
    updateActiveState();
    saveSettings();
    $('#dimensions-dialog').close();
    toast('Đã cập nhật tỷ lệ mô hình theo kích thước mới.');
  } catch {
    toast('Kiểm tra lại kích thước trong khoảng cho phép.');
  }
});

function selectZone(zone) {
  currentZone = zone;
  if (currentView === 'front' && zone !== 'overview') currentView = 'perspective';
  if (zone === 'overview' && currentView === 'inside') currentView = 'perspective';
  if (zone === 'loft' && currentView === 'plan') currentView = 'perspective';
  updateActiveState();
  viewer?.goTo(currentView, currentZone);
}
$$('[data-zone]').forEach((button) => button.addEventListener('click', () => selectZone(button.dataset.zone)));
$$('[data-view]').forEach((button) => button.addEventListener('click', () => {
  currentView = button.dataset.view;
  if (currentView === 'inside' && currentZone === 'overview') currentZone = 'living';
  if (currentView === 'plan') currentZone = 'overview';
  if (currentView === 'front') currentZone = 'overview';
  updateActiveState();
  viewer?.goTo(currentView, currentZone);
}));
$$('[data-palette]').forEach((button) => button.addEventListener('click', () => {
  palette = button.dataset.palette;
  $$('[data-palette]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
  viewer?.setPalette(palette);
  saveSettings();
}));
$$('button[data-occupants]').forEach((button) => button.addEventListener('click', () => {
  occupants = Number(button.dataset.occupants);
  viewer?.rebuild(dimensions);
  updateOccupancy();
  updateActiveState();
  saveSettings();
  toast(occupants === 1 ? 'Đang xem phương án một người ở.' : 'Đang thử phương án hai chỗ làm việc.');
}));
['cutaway', 'show-loft', 'show-labels', 'warm-light'].forEach((id) => $(`#${id}`).addEventListener('change', () => { viewer?.refresh(); saveSettings(); }));
$$('button[data-design]').forEach(button => button.addEventListener('click', () => {
  if (currentDesign === button.dataset.design) return;
  saveSettings();
  currentDesign = resolveDesign(button.dataset.design);
  const settings = readSettings(currentDesign);
  dimensions = settings.dimensions;
  occupants = settings.occupants;
  palette = settings.palette;
  $('#warm-light').checked = settings.warmLight;
  $('#show-loft').checked = true;
  currentZone = 'overview';
  currentView = currentDesign === 'modern' ? 'perspective' : 'front';
  updateDesignUI();
  updateMetrics();
  updateOccupancy();
  updateActiveState();
  viewer?.rebuild(dimensions);
  saveSettings();
  const url = new URL(location.href);
  url.searchParams.set('design', currentDesign);
  history.replaceState(null, '', url);
  toast(`Đang xem ${DESIGN_NAMES[currentDesign].toLowerCase()}.`);
}));
$('#zoom-in').addEventListener('click', () => viewer?.zoom(0.8));
$('#zoom-out').addEventListener('click', () => viewer?.zoom(1.25));
$('#reset-view').addEventListener('click', () => {
  currentView = currentDesign === 'modern' ? 'perspective' : 'front';
  currentZone = 'overview';
  $('#show-loft').checked = true;
  updateActiveState();
  viewer?.goTo(currentView, currentZone);
});
$('#fullscreen').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if ($('#viewer').requestFullscreen) await $('#viewer').requestFullscreen();
    else toast('Trình duyệt này chưa hỗ trợ xem toàn màn hình.');
  } catch { toast('Không thể mở toàn màn hình trong cửa sổ này.'); }
});
document.addEventListener('fullscreenchange', () => {
  $('#fullscreen').setAttribute('aria-label', document.fullscreenElement ? 'Thoát toàn màn hình' : 'Toàn màn hình');
  $('#fullscreen').setAttribute('aria-pressed', String(!!document.fullscreenElement));
});
$('#capture-button').addEventListener('click', () => viewer?.capture());

function createViewer() {
  const container = $('#canvas-container');
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.16;
  renderer.domElement.setAttribute('aria-label', 'Mô hình 3D ngôi nhà. Kéo để xoay, cuộn để phóng to. Dùng các nút góc nhìn và khu vực để khám phá.');
  renderer.domElement.tabIndex = 0;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#edf2f4');
  const camera = new THREE.PerspectiveCamera(39, 1, 0.03, 150);
  const planCamera = new THREE.OrthographicCamera(-8, 8, 8, -8, 0.1, 100);
  planCamera.up.set(0, 0, -1);
  let activeCamera = camera;
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.09;
  controls.minDistance = 2;
  controls.maxDistance = 40;
  controls.maxPolarAngle = Math.PI / 2 - 0.015;
  controls.target.set(0, 1, 0);
  const planControls = new OrbitControls(planCamera, renderer.domElement);
  planControls.enableRotate = false;
  planControls.enableDamping = true;
  planControls.enabled = false;
  planControls.minZoom = 0.5;
  planControls.maxZoom = 5;
  planControls.mouseButtons.LEFT = THREE.MOUSE.PAN;
  planControls.touches.ONE = THREE.TOUCH.PAN;

  const hemi = new THREE.HemisphereLight('#ffffff', '#c5b6a0', 2.05);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff4de', 3.2);
  sun.position.set(3, 10, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 0.1, far: 35 });
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.025;
  scene.add(sun);
  const fill = new THREE.DirectionalLight('#d7e8f1', 1.1);
  fill.position.set(-4, 6, -5);
  scene.add(fill);
  const warm = new THREE.PointLight('#ffd39b', 0, 9, 1.5);
  warm.position.set(0, 2.2, 1.2);
  scene.add(warm);
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#f3f0e8', roughness: 1, side: THREE.DoubleSide }));
  ceiling.rotation.x = Math.PI / 2;
  scene.add(ceiling);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: '#e4eaeb', roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.19;
  ground.receiveShadow = true;
  scene.add(ground);
  const grid = new THREE.GridHelper(60, 60, '#c9d5d7', '#d4dfe1');
  grid.position.y = -0.185;
  grid.material.transparent = true;
  grid.material.opacity = 0.46;
  scene.add(grid);

  const buildHouse = next => (currentDesign === 'modern' ? createModernHouse : createHouse)({ ...next, occupants });
  let house = buildHouse(dimensions);
  house.setPalette(palette);
  scene.add(house.group);
  let dirty = true;
  let transition;
  let yaw = 0;
  let pitch = 0;
  let drag;
  let hotspotElements = [];
  const occlusionRay = new THREE.Raycaster();
  const rayDirection = new THREE.Vector3();
  let frame;
  let previousAspect;

  function mountMinimap() {
    if (!house.layout) return;
    const { width, depth, front, left, zones, stairs, doors } = house.layout;
    const x = (z) => 8 + (front - z) / depth * 154;
    const y = (worldX) => 8 + (worldX - left) / width * 84;
    const rect = (bounds, name, label, className = 'minimap-room') => {
      const rx = x(bounds.maxZ), ry = y(bounds.minX);
      const rw = x(bounds.minZ) - rx, rh = y(bounds.maxX) - ry;
      return `<g data-mini-zone="${name}"><rect class="${className}" x="${rx}" y="${ry}" width="${rw}" height="${rh}"/>${label ? `<text x="${rx + rw / 2}" y="${ry + rh / 2 + 3}">${label}</text>` : ''}</g>`;
    };
    const drawFlight = flight => {
      const runX = flight.top[0] - flight.bottom[0];
      const runZ = flight.top[2] - flight.bottom[2];
      const run = Math.hypot(runX, runZ);
      const halfX = -runZ / run * flight.width / 2;
      const halfZ = runX / run * flight.width / 2;
      return rect(flight.bounds, 'stairs', '', 'minimap-furniture') + Array.from({ length: flight.steps }, (_, index) => {
        const stepX = flight.bottom[0] + runX * (index + 0.5) / flight.steps;
        const stepZ = flight.bottom[2] + runZ * (index + 0.5) / flight.steps;
        return `<path class="minimap-stairs" d="M${x(stepZ - halfZ)},${y(stepX - halfX)}L${x(stepZ + halfZ)},${y(stepX + halfX)}"/>`;
      }).join('');
    };
    const stairMarks = (stairs.flights || [stairs]).map(drawFlight).join('');
    const landingMarks = (stairs.landings || []).map(bounds => rect(bounds, 'stairs', '', 'minimap-furniture')).join('');
    const doorMarks = Object.values(doors).map(door => door.axis === 'x'
      ? `<path d="M${x(door.z)},${y(door.x - door.width / 2)}v${door.width / width * 84}" stroke="#fff" stroke-width="3"/>`
      : `<path d="M${x(door.z + door.width / 2)},${y(door.x)}h${door.width / depth * 154}" stroke="#fff" stroke-width="3"/>`).join('');
    const utility = zones.utility ? rect(zones.utility, 'utility', '') : '';
    $('#floor-minimap-drawing').innerHTML = `${rect(zones.living, 'living', '')}${utility}${rect(zones.kitchen, 'kitchen', 'Bếp')}${rect(zones.bathroom, 'bathroom', 'Tắm/WC')}${stairMarks}${landingMarks}${doorMarks}<text x="${x(front * 0.48)}" y="57">Sinh hoạt</text><text x="${x((stairs.bounds.minZ + stairs.bounds.maxZ) / 2)}" y="${y(stairs.bounds.maxX) + 9}">Thang</text>`;
  }

  function mountHotspots() {
    mountMinimap();
    $('#hotspots').replaceChildren();
    hotspotElements = house.hotspots.map((hotspot) => {
      const button = document.createElement('button');
      button.className = 'hotspot';
      button.type = 'button';
      button.setAttribute('aria-label', `Xem ${zoneInfo[hotspot.id][0].toLowerCase()}`);
      const dot = document.createElement('span');
      dot.className = 'hotspot-dot';
      const label = document.createElement('span');
      label.className = 'hotspot-label';
      label.textContent = { living: 'Sinh hoạt', loft: 'Gác ngủ', stairs: 'Thang lên gác', utility: 'Giặt & lối đi', kitchen: 'Phòng bếp', bathroom: 'Tắm & WC' }[hotspot.id];
      button.append(dot, label);
      button.addEventListener('click', () => selectZone(hotspot.id));
      $('#hotspots').append(button);
      return { button, ...hotspot };
    });
  }

  function applyLayers() {
    const plan = currentView === 'plan';
    const cutaway = $('#cutaway').checked && currentView === 'perspective';
    house.loft.visible = $('#show-loft').checked && !plan;
    house.walls.visible = !plan;
    if (house.partitions) house.partitions.visible = !plan && !cutaway;
    ceiling.visible = currentView === 'inside' || currentView === 'front';
    ceiling.scale.set(dimensions.width, dimensions.depth, 1);
    ceiling.position.y = dimensions.loftHeight + dimensions.upperHeight;
    house.walls.children.forEach((wall) => {
      let visible = true;
      if (cutaway) {
        if (wall.name === 'right-wall') visible = camera.position.x < 0;
        if (wall.name === 'left-wall') visible = camera.position.x >= 0;
        if (wall.name === 'back-wall') visible = camera.position.z >= 0;
        if (wall.name === 'front-wall') visible = camera.position.z < 0;
      }
      wall.visible = visible;
    });
    const warmEnabled = $('#warm-light').checked;
    hemi.intensity = warmEnabled ? 1.25 : 2.05;
    sun.intensity = warmEnabled ? 1.15 : 3.2;
    sun.color.set(warmEnabled ? '#ffd3a0' : '#fff4de');
    warm.intensity = warmEnabled ? 24 : 0;
    renderer.toneMappingExposure = warmEnabled ? 1.02 : 1.16;
  }

  function placeHotspots() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    const occupied = [];
    const ordered = [...hotspotElements].sort((a, b) => Number(b.id === currentZone) - Number(a.id === currentZone));
    ordered.forEach(({ button, position, id }) => {
      const pointPosition = position.clone();
      const plan = currentView === 'plan';
      const room = house.layout?.zones[id];
      if (plan && room) pointPosition.set((room.minX + room.maxX) / 2, 0.1, (room.minZ + room.maxZ) / 2);
      const point = pointPosition.project(activeCamera);
      const labelView = currentView === 'perspective' || (plan && ['kitchen', 'bathroom', 'stairs', 'utility'].includes(id));
      let visible = $('#show-labels').checked && labelView && (id !== 'loft' || house.loft.visible)
        && point.z > -1 && point.z < 1 && Math.abs(point.x) < 0.88 && Math.abs(point.y) < 0.8;
      button.classList.toggle('plan-label', plan);
      button.querySelector('.hotspot-label').textContent = plan
        ? { kitchen: 'Bếp', bathroom: 'Tắm/WC', stairs: 'Thang', utility: 'Giặt & lối đi' }[id] || ''
        : { living: 'Sinh hoạt', loft: 'Gác ngủ', stairs: 'Thang lên gác', utility: 'Giặt & lối đi', kitchen: 'Phòng bếp', bathroom: 'Tắm & WC' }[id];
      if (visible && !plan) {
        rayDirection.copy(position).sub(activeCamera.position);
        occlusionRay.set(activeCamera.position, rayDirection.clone().normalize());
        occlusionRay.far = rayDirection.length() - 0.12;
        visible = !occlusionRay.intersectObject(house.group, true).some((hit) => {
          for (let object = hit.object; object; object = object.parent) if (!object.visible) return false;
          return true;
        });
      }
      button.hidden = !visible;
      if (visible) {
        const x = (point.x * 0.5 + 0.5) * width;
        const y = (-point.y * 0.5 + 0.5) * height;
        button.style.left = `${x}px`;
        button.style.top = `${y}px`;
        const halfWidth = button.offsetWidth / 2 + 3;
        const halfHeight = button.offsetHeight / 2 + 3;
        const box = { left: x - halfWidth, right: x + halfWidth, top: y - halfHeight, bottom: y + halfHeight };
        button.hidden = occupied.some(other => box.left < other.right && box.right > other.left
          && box.top < other.bottom && box.bottom > other.top);
        if (!button.hidden) occupied.push(box);
      }
    });
  }

  function insideLook() {
    camera.lookAt(camera.position.x + Math.sin(yaw) * Math.cos(pitch), camera.position.y + Math.sin(pitch), camera.position.z - Math.cos(yaw) * Math.cos(pitch));
    dirty = true;
  }

  function goTo(view, zone, immediate = false) {
    transition = null;
    if (zone === 'loft' || view === 'front') $('#show-loft').checked = true;
    if (zone === 'utility' || zone === 'stairs') $('#show-loft').checked = view === 'inside';
    controls.enabled = view === 'perspective' || view === 'front';
    controls.maxPolarAngle = view === 'front' ? Math.PI * 0.64 : Math.PI / 2 - 0.015;
    planControls.enabled = view === 'plan';
    activeCamera = view === 'plan' ? planCamera : camera;
    const { width, depth, loftHeight, upperHeight } = dimensions;
    const target = new THREE.Vector3(0, (loftHeight + upperHeight) * 0.25, 0);
    const position = new THREE.Vector3();
    const zoneBounds = house.layout?.zones[zone];
    const centerX = zoneBounds ? (zoneBounds.minX + zoneBounds.maxX) / 2 : 0;
    const centerZ = zoneBounds ? (zoneBounds.minZ + zoneBounds.maxZ) / 2 : 0;
    if (view === 'plan') {
      const focus = ['kitchen', 'bathroom', 'stairs', 'utility'].includes(zone) && zoneBounds;
      planCamera.position.set(focus ? centerX : 0, 20, focus ? centerZ : 0);
      planControls.target.set(focus ? centerX : 0, 0, focus ? centerZ : 0);
      planCamera.zoom = focus ? Math.min(2.6, depth / (zoneBounds.maxZ - zoneBounds.minZ + 1.7)) : 1;
      planCamera.updateProjectionMatrix();
      planCamera.lookAt(planControls.target);
      planControls.update();
    } else if (view === 'inside') {
      camera.fov = 65;
      camera.updateProjectionMatrix();
      const anchor = house.layout?.cameras[zone];
      if (anchor) {
        camera.position.fromArray(anchor.position);
        const direction = new THREE.Vector3().fromArray(anchor.target).sub(camera.position).normalize();
        yaw = Math.atan2(direction.x, -direction.z);
        pitch = Math.asin(direction.y);
      } else if (zone === 'loft') {
        camera.position.set(width * 0.34, loftHeight + Math.min(1.45, upperHeight - 0.3), -depth * 0.27);
        const direction = new THREE.Vector3(-width * 0.2, loftHeight + 0.35, -depth * 0.11).sub(camera.position).normalize();
        yaw = Math.atan2(direction.x, -direction.z);
        pitch = Math.asin(direction.y);
      } else if (zone === 'kitchen') {
        camera.position.set(0.12, 1.6, -depth * 0.285);
        yaw = -0.1; pitch = -0.06;
      } else {
        camera.position.set(0.15, 1.6, depth * 0.43);
        yaw = 0; pitch = 0.08;
      }
      insideLook();
    } else {
      camera.fov = view === 'front' ? frontFieldOfView() : 39;
      camera.updateProjectionMatrix();
      if (view === 'front') {
        const frontAnchor = house.layout.cameras.front;
        if (frontAnchor) {
          target.fromArray(frontAnchor.target);
          position.fromArray(frontAnchor.position);
        } else {
          target.set(0, loftHeight * 0.82, house.layout.loft.front - 0.6);
          position.set(width * 0.025, Math.min(1.75, loftHeight - 0.3), depth / 2 - 0.2);
        }
      } else if (zone === 'living') {
        target.set(-0.1, 0.7, depth * 0.26);
        position.set(width * 1.3, 4.1, depth * 0.7);
      } else if (zone === 'loft') {
        target.set(0, loftHeight + 0.35, (house.layout.loft.front + house.layout.loft.back) / 2);
        position.set(-width * 1.25, loftHeight + 3.8, house.layout.loft.front + 4.1);
        $('#show-loft').checked = true;
      } else if (zone === 'stairs') {
        target.set(centerX, loftHeight * 0.5, centerZ);
        position.set(width * 1.2, loftHeight + 3.1, centerZ + 2.8);
      } else if (zone === 'utility') {
        target.set(centerX, 0.9, centerZ);
        position.set(width * 1.3, loftHeight + 4, centerZ - 2.7);
      } else if (zone === 'kitchen' || zone === 'bathroom') {
        target.set(centerX, 0.8, centerZ);
        position.set(centerX + (zone === 'bathroom' ? -3.8 : 3.8), 4.9, centerZ - 4.2);
      } else {
        const aspect = Math.max(0.5, container.clientWidth / container.clientHeight);
        const radius = Math.sqrt(width ** 2 + depth ** 2 + (loftHeight + upperHeight) ** 2) / 2;
        const distance = radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.max(0.94, 0.94 / aspect);
        position.copy(new THREE.Vector3(0.95, 0.86, 1.23).normalize().multiplyScalar(distance).add(target));
      }
      if (immediate || reducedMotion.matches) {
        camera.position.copy(position);
        controls.target.copy(target);
        controls.update();
      } else {
        transition = { start: performance.now(), from: camera.position.clone(), to: position, fromTarget: controls.target.clone(), toTarget: target };
      }
    }
    applyLayers();
    dirty = true;
  }

  function frontFieldOfView() {
    const halfAngle = currentDesign === 'modern' ? 37 : 31;
    return Math.min(85, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(halfAngle)) * Math.max(1, 1 / camera.aspect))));
  }

  function resize() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    if (currentView === 'front') camera.fov = frontFieldOfView();
    if (previousAspect && currentView === 'perspective' && currentZone === 'overview') {
      const factor = Math.max(1, 1 / camera.aspect) / Math.max(1, 1 / previousAspect);
      if (Math.abs(factor - 1) > 0.01) {
        transition = null;
        camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target);
        controls.update();
      }
    }
    previousAspect = camera.aspect;
    camera.updateProjectionMatrix();
    const halfHeight = Math.max(dimensions.depth * 0.62, dimensions.width * 0.68 / camera.aspect);
    planCamera.left = -halfHeight * camera.aspect;
    planCamera.right = halfHeight * camera.aspect;
    planCamera.top = halfHeight;
    planCamera.bottom = -halfHeight;
    planCamera.updateProjectionMatrix();
    dirty = true;
  }

  function animate(now) {
    frame = requestAnimationFrame(animate);
    if (document.hidden) return;
    if (transition) {
      const progress = Math.min(1, (now - transition.start) / 750);
      const ease = 1 - (1 - progress) ** 3;
      camera.position.lerpVectors(transition.from, transition.to, ease);
      controls.target.lerpVectors(transition.fromTarget, transition.toTarget, ease);
      if (progress === 1) transition = null;
      dirty = true;
    }
    if (controls.enabled) controls.update();
    if (planControls.enabled) planControls.update();
    if (dirty) {
      applyLayers();
      renderer.render(scene, activeCamera);
      placeHotspots();
      dirty = false;
    }
  }

  controls.addEventListener('change', () => { dirty = true; });
  planControls.addEventListener('change', () => { dirty = true; });
  controls.addEventListener('start', () => { transition = null; });
  renderer.domElement.addEventListener('pointerdown', (event) => {
    if (currentView !== 'inside') return;
    drag = { x: event.clientX, y: event.clientY };
    renderer.domElement.setPointerCapture(event.pointerId);
  });
  renderer.domElement.addEventListener('pointermove', (event) => {
    if (!drag || currentView !== 'inside') return;
    yaw -= (event.clientX - drag.x) * 0.004;
    pitch = THREE.MathUtils.clamp(pitch + (event.clientY - drag.y) * 0.004, -1.2, 1.2);
    drag = { x: event.clientX, y: event.clientY };
    insideLook();
  });
  renderer.domElement.addEventListener('pointerup', () => { drag = null; });
  renderer.domElement.addEventListener('pointercancel', () => { drag = null; });
  renderer.domElement.addEventListener('wheel', (event) => {
    if (currentView !== 'inside') return;
    event.preventDefault();
    camera.fov = THREE.MathUtils.clamp(camera.fov + Math.sign(event.deltaY) * 3, 35, 85);
    camera.updateProjectionMatrix();
    dirty = true;
  }, { passive: false });
  renderer.domElement.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '-', '='].includes(event.key)) return;
    event.preventDefault();
    if (['+', '-', '='].includes(event.key)) { viewer?.zoom(event.key === '-' ? 1.15 : 0.87); return; }
    const horizontal = event.key === 'ArrowLeft' ? 0.1 : event.key === 'ArrowRight' ? -0.1 : 0;
    const vertical = event.key === 'ArrowUp' ? 0.08 : event.key === 'ArrowDown' ? -0.08 : 0;
    if (currentView === 'inside') {
      yaw += horizontal;
      pitch = THREE.MathUtils.clamp(pitch + vertical, -1.2, 1.2);
      insideLook();
    } else if (currentView === 'perspective' || currentView === 'front') {
      transition = null;
      const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
      spherical.theta += horizontal;
      spherical.phi = THREE.MathUtils.clamp(spherical.phi - vertical, 0.1, controls.maxPolarAngle);
      camera.position.copy(new THREE.Vector3().setFromSpherical(spherical).add(controls.target));
      controls.update();
    } else {
      const offset = new THREE.Vector3(-horizontal * 4, 0, -vertical * 4);
      planCamera.position.add(offset);
      planControls.target.add(offset);
      planControls.update();
    }
  });

  renderer.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    cancelAnimationFrame(frame);
    $('#webgl-error').hidden = false;
    $('#scene-status').textContent = 'Mô hình tạm dừng. Tải lại trang để tiếp tục.';
  });
  renderer.domElement.addEventListener('webglcontextrestored', () => location.reload());
  new ResizeObserver(resize).observe(container);
  mountHotspots();
  resize();
  goTo(currentView, currentZone, true);
  renderer.render(scene, activeCamera);
  placeHotspots();
  frame = requestAnimationFrame(animate);
  $('#loading').hidden = true;
  $('#viewer').dataset.ready = 'true';
  $('#scene-status').textContent = 'Mô hình sẵn sàng';

  return {
    goTo,
    refresh() { applyLayers(); dirty = true; },
    setPalette(name) { house.setPalette(name); dirty = true; },
    zoom(factor) {
      transition = null;
      if (currentView === 'plan') {
        planCamera.zoom = THREE.MathUtils.clamp(planCamera.zoom / factor, 0.5, 5);
        planCamera.updateProjectionMatrix();
      } else if (currentView === 'inside') {
        camera.fov = THREE.MathUtils.clamp(camera.fov * factor, 35, 85);
        camera.updateProjectionMatrix();
      } else {
        const offset = camera.position.clone().sub(controls.target);
        const distance = THREE.MathUtils.clamp(offset.length() * factor, 2, 40);
        camera.position.copy(offset.setLength(distance).add(controls.target));
        controls.update();
      }
      dirty = true;
    },
    rebuild(next) {
      const newHouse = buildHouse(next);
      newHouse.setPalette(palette);
      scene.remove(house.group);
      house.dispose();
      house = newHouse;
      dimensions = next;
      scene.add(house.group);
      mountHotspots();
      resize();
      goTo(currentView, currentZone, true);
    },
    capture() {
      applyLayers();
      renderer.render(scene, activeCamera);
      const source = renderer.domElement;
      const output = document.createElement('canvas');
      output.width = source.width;
      output.height = source.height + (source.width < 650 ? 112 : 82);
      const context = output.getContext('2d');
      context.drawImage(source, 0, 0);
      context.fillStyle = '#ffffff';
      context.fillRect(0, source.height, output.width, output.height - source.height);
      context.fillStyle = '#243841';
      context.font = '600 21px sans-serif';
      context.fillText(`nhà mình / ${DESIGN_NAMES[currentDesign]}`, 24, source.height + 32);
      context.fillStyle = '#607078';
      context.font = '14px sans-serif';
      const caption = `Ngang ≈ ${format(dimensions.width)} m × dài ${format(dimensions.depth)} m · Cao gác ${format(dimensions.loftHeight)} m + ${format(dimensions.upperHeight)} m · ${occupants === 1 ? 'Một người ở' : 'Hai chỗ làm việc'}`;
      let line = '';
      let baseline = source.height + 60;
      for (const word of caption.split(' ')) {
        if (line && context.measureText(`${line} ${word}`).width > output.width - 48) {
          context.fillText(line, 24, baseline);
          baseline += 20;
          line = word;
        } else line += `${line ? ' ' : ''}${word}`;
      }
      context.fillText(line, 24, baseline);
      output.toBlob((blob) => {
        if (!blob) { toast('Chưa lưu được ảnh. Vui lòng thử lại.'); return; }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `nha-minh-${currentDesign}-${currentView}.png`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        toast('Đã lưu ảnh góc nhìn hiện tại.');
      }, 'image/png');
    },
  };
}

updateDesignUI();
updateMetrics();
updateOccupancy();
updateActiveState();
try {
  viewer = createViewer();
} catch (error) {
  console.error('Unable to initialize the 3D viewer.', error);
  $('#loading').hidden = true;
  $('#webgl-error').hidden = false;
  $('#scene-status').textContent = 'Chưa tải được mô hình 3D';
  $('#capture-button').disabled = true;
}
