import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createHouse } from './house.js';
import { createModernHouse } from './modern-house.js';
import { getHouseLayout } from './layout.js';
import { getModernLayout } from './modern-layout.js';
import { createProposedHouse } from './proposed-house.js';
import { getProposedLayout } from './proposed-layout.js';
import { SHARED_DIMENSION_LIMITS } from './shared-structure.js';
import { walk } from './navigation.js';
import { createWalkingWorld } from './walking-world.js';
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
  if (design !== 'reference') settings.occupants = 1;
  for (const [key, [min, max]] of Object.entries(SHARED_DIMENSION_LIMITS)) {
    settings.dimensions[key] = Math.max(min, Math.min(max, settings.dimensions[key]));
  }
  return settings;
}
const initialSettings = readSettings(currentDesign);
let dimensions = initialSettings.dimensions;
let occupants = initialSettings.occupants;
let palette = initialSettings.palette;
$('#warm-light').checked = initialSettings.warmLight;
let currentZone = 'overview';
let currentView = currentDesign === 'proposed' ? 'perspective' : 'front';
let viewer;
let toastTimer;

const zoneInfo = {
  overview: ['Toàn bộ không gian', 'Gác ngang, tủ dưới gác và lối đi bên phải theo ảnh mẫu.'],
  living: ['Sinh hoạt & làm việc', 'Bàn cho một người, hai màn hình và hệ tủ gỗ dưới gác.'],
  loft: ['Gác ngủ thu gọn', 'Gác rút ngắn 1/3, giường nằm ngang và lan can trắng theo ảnh mẫu.'],
  stairs: ['Cầu thang hiện trạng', 'Giữ thang sắt và tường bên trái khi đi lên, theo video bạn gửi.'],
  utility: ['Giặt, sấy & rửa bát', 'Dãy giặt, sấy sát cửa sổ giữa bếp và WC; bồn rửa bát và máy bơm ở góc cuối bên cạnh WC.'],
  kitchen: ['Phòng bếp', 'Khu nấu và tủ lạnh phía sau; bồn rửa bát nằm ở phòng giặt bên ngoài.'],
  bathroom: ['Phòng tắm & WC', 'Bên trái bếp; cửa mở ra khoảng máy giặt/cầu thang theo bạn xác nhận.'],
};

const referenceZoneInfo = Object.fromEntries(Object.entries(zoneInfo).map(([key, value]) => [key, [...value]]));
const modernZoneInfo = {
  overview: ['Không gian hiện đại', 'Mảng tủ phẳng, kính trong, ánh sáng gián tiếp và lối vào bên phải.'],
  living: ['Sinh hoạt & làm việc', 'Sofa bên trái, TV treo bên phải và bàn làm việc liền hệ tủ dưới gác.'],
  loft: ['Gác ngủ thu gọn', 'Gác rút ngắn 1/3; giường thấp, tủ cao và lan can kính khung mảnh.'],
  stairs: ['Cầu thang hiện trạng', 'Giữ thang sắt và tường bên trái khi đi lên, theo video bạn gửi.'],
  utility: ['Giặt, sấy & lọc nước', 'Máy giặt cửa trên và máy sấy cửa ngang đặt cạnh nhau, có máy lọc nước riêng.'],
  kitchen: ['Phòng bếp', 'Tủ bếp với chậu rửa, vòi nước và khu nấu trên bề mặt sáng.'],
  bathroom: ['Phòng tắm & WC', 'Phòng riêng bên trái bếp, tiếp cận từ khu giặt và lối đi.'],
};
const proposedZoneInfo = {
  overview: ['Khách – ăn – bếp liên thông', 'Gác rút ngắn 1/3, mở rộng khoảng thông tầng phía phòng khách.'],
  living: ['Phòng khách', 'Sofa chữ L gọn và bàn trà; lối vào bên phải nối tới khu sau.'],
  dining: ['Ăn uống & làm việc', 'Bàn ăn hai chỗ và góc làm việc hai màn hình riêng.'],
  loft: ['Gác ngủ thu gọn', 'Chiều sâu còn 2/3; giường xoay ngang, giữ thang và tường hiện trạng.'],
  stairs: ['Cầu thang hiện trạng', 'Giữ thang sắt và tường sát bên trái khi đi lên; kích thước và đoạn nối lên gác còn ước lượng.'],
  utility: ['Giặt, sấy & lọc nước', 'Máy giặt cửa trên, máy sấy cửa ngang, máy lọc nước và tủ gọn ở cuối nhà.'],
  kitchen: ['Bếp mở sát tường', 'Hai nhánh tủ bếp áp tường trái và vách cạnh thang, có chậu rửa, bếp nấu và hút mùi.'],
  bathroom: ['Phòng tắm & WC', 'Phòng kín ở cuối nhà, tách khỏi bếp và khu sinh hoạt.'],
};
const layoutFactories = { reference: getHouseLayout, modern: getModernLayout, proposed: getProposedLayout };
const houseFactories = { reference: createHouse, modern: createModernHouse, proposed: createProposedHouse };
const modernRenovationCopy = $('#renovation-panel .renovation-list').innerHTML;

function activeLayout() {
  return layoutFactories[currentDesign]({ ...dimensions, occupants });
}

function saveSettings() {
  try {
    localStorage.setItem(designStorageKey(currentDesign), JSON.stringify({ dimensions, occupants, palette, warmLight: $('#warm-light').checked }));
    localStorage.setItem(designChoiceKey, currentDesign);
  } catch { /* All designs remain usable without persistent storage. */ }
}

function updateDesignUI() {
  const modern = currentDesign !== 'reference';
  const proposed = currentDesign === 'proposed';
  Object.assign(zoneInfo, Object.fromEntries(Object.entries(proposed ? proposedZoneInfo : modern ? modernZoneInfo : referenceZoneInfo).map(([key, value]) => [key, [...value]])));
  $$('button[data-design]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.design === currentDesign)));
  $$('button[data-palette]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.palette === palette)));
  $('#project-badge-text').textContent = proposed ? 'Theo mặt bằng bạn gửi' : modern ? 'Phương án cải tạo mới' : 'Phong cách theo ảnh mẫu';
  $('#project-title').textContent = proposed ? 'Không gian liên thông' : modern ? 'Nhà hiện đại 43 m²' : 'Nhà gác lửng';
  $('#project-description').textContent = proposed
    ? 'Khách – ăn – bếp mở, giữ cầu thang hiện có. Gác rút ngắn 1/3 để khoảng phía trước thoáng hơn.' : modern
    ? 'Nội thất liền mảng, kính và ánh sáng dịu. Sofa bên trái, lối từ cửa vào thông thoáng bên phải.'
    : 'Bản theo ảnh bạn chọn: gác ngang, bàn hai màn hình, tủ gỗ dưới gác và lối đi bên phải.';
  $('#design-pill-text').textContent = DESIGN_NAMES[currentDesign];
  $('#renovation-panel').hidden = !modern;
  $('#renovation-panel .renovation-list').innerHTML = proposed
    ? '<li><strong>Mặt bằng mới</strong><span>Sofa chữ L phía trước, bàn ăn gọn và bếp mở ở giữa; WC và khu giặt ở cuối nhà.</span></li><li><strong>Gác ngắn hơn 1/3</strong><span>Lùi mép gác phía phòng khách, xoay giường ngang. Giữ nguyên thang sắt và tường cạnh thang.</span></li><li><strong>Dành cho một người</strong><span>Thêm góc làm việc hai màn hình, bàn ăn hai chỗ và lưu trữ kín.</span></li>' : modernRenovationCopy;
  $('#loft-assumption').textContent = 'Cả ba mẫu dùng thang hiện trạng, tường cạnh thang và gác đã rút ngắn 1/3. Bề rộng, số bậc và đoạn nối lên gác chưa có số đo; mô hình vẫn là ước lượng.';
  $('.space-button[data-zone="stairs"] strong').textContent = 'Cầu thang hiện trạng';
  $('.space-button[data-zone="stairs"] small').textContent = 'Giữ thang và tường theo video';
  $('.space-button[data-zone="kitchen"] strong').textContent = proposed ? 'Bếp mở' : 'Phòng bếp';
  $('.space-button[data-zone="kitchen"] small').textContent = proposed ? 'Liên thông với khu ăn' : 'Phòng đối diện cửa';
  $('.space-button[data-zone="utility"] strong').textContent = modern ? 'Giặt, sấy & lọc nước' : 'Giặt, sấy & rửa bát';
  $('.space-button[data-zone="utility"] small').textContent = proposed ? 'Khu sau nhà' : modern ? 'Giữa phòng chính và bếp' : 'Cửa sổ giữa bếp và WC';
  $('.space-button[data-zone="dining"]').hidden = !proposed;
  $('.space-button[data-zone="living"] strong').textContent = proposed ? 'Phòng khách' : 'Không gian sinh hoạt';
  $('.space-button[data-zone="living"] small').textContent = proposed ? 'Sofa chữ L và bàn trà' : 'Thư giãn & làm việc';
  $('[data-occupants="1"]').textContent = modern ? 'Một người ở' : 'Một người · theo ảnh';
  $('[data-occupants="2"]').hidden = modern;
  $('#dimensions-form').elements.namedItem('depth').min = SHARED_DIMENSION_LIMITS.depth[0];
  $('#viewer').dataset.design = currentDesign;
  document.body.dataset.design = currentDesign;
  $('#floor-minimap-drawing').setAttribute('aria-label', proposed
    ? 'Mặt bằng mới: cửa trước lệch phải, khách ăn bếp liên thông, thang cạnh bếp, WC và giặt ở cuối nhà' : modern
    ? 'Sơ đồ phương án hiện đại: cửa trước lệch phải, sofa trái, thang hiện trạng, bếp phía sau và phòng tắm bên trái bếp'
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
  zoneInfo.loft[1] = `Sâu ≈ ${format(layout.loft.actualDepth)} m · còn 2/3 chiều sâu trước đó, giữ nguyên cao độ.`;
  const usableLoftArea = layout.loft.floorRects.reduce((sum, r) => sum + (r.maxX - r.minX) * (r.maxZ - r.minZ), 0);
  $('#renovation-area').textContent = `Gác sâu ≈ ${format(layout.loft.actualDepth)} m · dùng được ≈ ${format(usableLoftArea)} m²`;
}

function updateOccupancy() {
  $$('button[data-occupants]').forEach((button) => button.setAttribute('aria-pressed', String(Number(button.dataset.occupants) === occupants)));
  zoneInfo.living[1] = currentDesign === 'proposed'
    ? 'Sofa chữ L gọn và bàn trà; cửa trước lệch phải có lối đi tới bếp và khu sau.' : currentDesign === 'modern'
    ? 'Sofa bọc nệm bên trái, TV treo bên phải; bàn hai màn hình liền hệ tủ dưới gác.'
    : occupants === 1
    ? 'Một chỗ ngồi với hai màn hình, tủ gỗ dưới gác và lối đi bên phải.'
    : 'Thử thêm một chỗ làm việc trên cùng bố trí gác và hệ tủ.';
  $('#occupancy-description').textContent = currentDesign === 'proposed'
    ? 'Một người ở: bàn ăn hai chỗ, góc làm việc hai màn hình và phòng ngủ trên gác.' : currentDesign === 'modern'
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
      ? `${currentDesign === 'proposed' ? 'Khách – ăn – bếp theo mặt bằng mới' : currentDesign === 'modern' ? 'Nội thất hiện đại và gác thu gọn' : 'Nội thất theo ảnh, gác đã thu gọn'} · ${occupants === 1 ? 'một người ở' : 'hai chỗ làm việc'}.` : zoneInfo[currentZone][1];
  $('#interaction-hint').textContent = currentView === 'inside'
    ? 'W/A/S/D để di chuyển · Kéo để nhìn quanh'
    : currentView === 'plan'
      ? 'Cuộn để phóng to · Kéo chuột phải để dịch chuyển'
      : 'Kéo để xoay · Cuộn để phóng to · Chuột phải để dịch chuyển';
  $('#viewer').dataset.view = currentView;
  $('#viewer').dataset.zone = currentZone;
  $('#show-loft').disabled = currentView === 'plan';
  $('#cutaway').disabled = currentView !== 'perspective';
}

function openReference(index = currentDesign === 'proposed' ? 'proposed' : 'design') {
  const video = $('#reference-video');
  const image = $('#reference-image');
  const isVideo = ['2', 'rear', 'existing-stairs'].includes(index);
  video.hidden = !isVideo;
  image.hidden = isVideo;
  if (!isVideo) {
    video.pause();
    const filename = index === 'proposed' ? 'proposed-plan.png' : index === 'design' ? 'design-target.png' : index === '1' ? 'nha1.jpeg' : 'nha2.jpeg';
    image.src = `${import.meta.env.BASE_URL}references/${filename}`;
    image.alt = index === 'proposed' ? 'Mặt bằng người dùng cung cấp: khách ăn bếp liên thông, thang cạnh bếp, WC và khu giặt ở cuối nhà' : index === 'design' ? 'Ảnh thiết kế do người dùng cung cấp: gác ngang, bàn hai màn hình, tủ dưới gác và lối đi bên phải' : index === '1' ? 'Lối đi bên phải dưới gác trong nhà hiện tại' : 'Toàn cảnh phòng chính và gác lửng hiện tại';
  }
  if (index === 'rear' || index === 'existing-stairs') {
    const seekRear = () => { video.currentTime = index === 'existing-stairs' ? 12.8 : 10; };
    if (video.readyState >= 1) seekRear();
    else video.addEventListener('loadedmetadata', seekRear, { once: true });
  }
  $('#reference-caption').textContent = isVideo
    ? index === 'existing-stairs'
      ? 'Thang hiện có được giữ lại ở cả ba mẫu: khung và bậc kim loại, tay vịn đơn giản, tường bên trái khi đi lên. Đoạn nối lên gác bị khuất; hình học trong mô hình chưa phải số đo thực tế.'
      : index === 'rear'
      ? 'Từ 0:10: lối đi → thang bên trái → máy giặt → bếp. Cửa WC ra khoảng giặt/cầu thang theo bạn xác nhận.'
      : 'Video bạn cung cấp · phòng chính, hành lang, cầu thang và bếp sau.'
    : index === 'proposed' ? 'Mặt bằng bạn gửi. Bản 03 chuyển thành 3D trong kích thước nhà đã biết; gác đã rút ngắn 1/3 theo yêu cầu mới, có bàn làm việc riêng. Phần thang giữ theo video hiện trạng thay cho nét thang trong sơ đồ; kích thước chi tiết cần đo lại.'
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
    if (Object.entries(SHARED_DIMENSION_LIMITS).some(([key, [min, max]]) => next[key] < min || next[key] > max)) throw new RangeError('Unsupported house dimensions');
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
  if (button.dataset.design === 'townhouse') {
    const url = new URL(location.href);
    url.searchParams.set('design', 'townhouse');
    try { localStorage.setItem(designChoiceKey, 'townhouse'); } catch { /* Storage is optional. */ }
    location.assign(url);
    return;
  }
  currentDesign = resolveDesign(button.dataset.design);
  const settings = readSettings(currentDesign);
  dimensions = settings.dimensions;
  occupants = settings.occupants;
  palette = settings.palette;
  $('#warm-light').checked = settings.warmLight;
  $('#show-loft').checked = true;
  currentZone = 'overview';
  currentView = currentDesign === 'proposed' ? 'perspective' : 'front';
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
  currentView = currentDesign === 'proposed' ? 'perspective' : 'front';
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
  renderer.domElement.setAttribute('aria-label', 'Mô hình 3D ngôi nhà. Kéo để xoay, cuộn để phóng to. Trong chế độ Bên trong, dùng W A S D để di chuyển và đi lên xuống cầu thang, kéo để nhìn quanh.');
  renderer.domElement.tabIndex = 0;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  let modernEnvironment;
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

  const buildHouse = next => houseFactories[currentDesign]({ ...next, occupants });
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
  let previousTime;
  let walkWorld;
  const heldKeys = new Map();
  const heldPointers = new Map();
  const moveButtons = $$('[data-move]');
  const keyActions = { KeyW: 'forward', KeyS: 'backward', KeyA: 'left', KeyD: 'right' };

  function showMovementState() {
    const actions = new Set([...heldKeys.values(), ...heldPointers.values()]);
    moveButtons.forEach(button => {
      button.classList.toggle('is-pressed', actions.has(button.dataset.move));
      button.setAttribute('aria-pressed', String(actions.has(button.dataset.move)));
    });
    return actions;
  }

  function stopWalking() {
    heldKeys.clear();
    heldPointers.clear();
    drag = null;
    previousTime = undefined;
    showMovementState();
  }

  function prepareWalking(zone) {
    const layout = house.layout;
    const floorHeight = zone === 'loft' ? layout.loftHeight : 0;
    walkWorld = createWalkingWorld(house, camera.position.y - floorHeight);
    camera.position.y = floorHeight + walkWorld.eyeHeight;
  }

  function placeWalkingMarker() {
    let marker = $('#minimap-position');
    if (!marker) {
      marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      marker.id = 'minimap-position';
      marker.setAttribute('r', '3.3');
      marker.setAttribute('fill', '#bc642e');
      marker.setAttribute('stroke', '#fff');
      marker.setAttribute('stroke-width', '1.4');
      marker.setAttribute('aria-label', 'Vị trí đang xem');
      marker.style.pointerEvents = 'none';
      $('#floor-minimap-drawing').append(marker);
    }
    marker.style.display = currentView === 'inside' ? '' : 'none';
    const { front, left, width, depth } = house.layout;
    marker.setAttribute('cx', String(8 + (front - camera.position.z) / depth * 154));
    marker.setAttribute('cy', String(8 + (camera.position.x - left) / width * 84));
    if (currentView === 'inside' && walkWorld) {
      const height = camera.position.y - walkWorld.eyeHeight;
      const stair = house.layout.stairs;
      const atCrest = camera.position.x <= stair.opening.maxX && camera.position.z <= stair.opening.maxZ + 0.12;
      const level = height >= house.layout.loftHeight - 0.02
        ? atCrest ? 'Đầu thang · Sang trái để vào gác' : 'Gác lửng'
        : height > 0.02 ? 'Cầu thang · Lên hết thang rồi rẽ trái' : 'Tầng trệt';
      if ($('#walking-level').textContent !== level) $('#walking-level').textContent = level;
    }
  }

  function mountMinimap() {
    if (!house.layout) return;
    const { width, depth, front, left, zones, stairs, doors, entry } = house.layout;
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
    const entryMark = entry ? `<g aria-label="Cửa trước bên phải, chiều rộng ước lượng"><path d="M8,${y(entry.door.x - entry.door.width / 2)}v${entry.door.width / width * 84}" stroke="#fff" stroke-width="4"/><path d="M1,${y(entry.door.x)}H18m-4,-3 4,3 -4,3" fill="none" stroke="#2b6156" stroke-width="1.5"/></g>` : '';
    if (currentDesign === 'proposed') {
      const rearDoors = Object.values(doors).map(door => `<path d="M${x(door.z)},${y(door.x - door.width / 2)}v${door.width / width * 84}" stroke="#fff" stroke-width="3"/>`).join('');
      $('#floor-minimap-drawing').innerHTML = `${rect(zones.living, 'living', 'Khách')}${rect(zones.dining, 'dining', 'Ăn')}${rect(zones.utility, 'utility', 'Giặt')}${rect(zones.kitchen, 'kitchen', 'Bếp')}${rect(zones.bathroom, 'bathroom', 'WC')}${stairMarks}${landingMarks}${rearDoors}${entryMark}`;
      return;
    }
    $('#floor-minimap-drawing').innerHTML = `${rect(zones.living, 'living', '')}${utility}${rect(zones.kitchen, 'kitchen', 'Bếp')}${rect(zones.bathroom, 'bathroom', 'Tắm/WC')}${stairMarks}${landingMarks}${doorMarks}${entryMark}<text x="${x(front * 0.48)}" y="57">Sinh hoạt</text><text x="${x((stairs.bounds.minZ + stairs.bounds.maxZ) / 2)}" y="${y(stairs.bounds.maxX) + 9}">Thang</text>`;
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
      label.textContent = { living: 'Sinh hoạt', dining: 'Ăn & làm việc', loft: 'Gác ngủ', stairs: 'Thang lên gác', utility: 'Giặt & sấy', kitchen: currentDesign === 'proposed' ? 'Bếp mở' : 'Phòng bếp', bathroom: 'Tắm & WC' }[hotspot.id];
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
    if (house.stairWall) house.stairWall.visible = !plan;
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
    const modern = currentDesign !== 'reference';
    if (modern && !modernEnvironment) {
      const environment = new RoomEnvironment();
      const generator = new THREE.PMREMGenerator(renderer);
      modernEnvironment = generator.fromScene(environment, 0.04);
      environment.dispose();
      generator.dispose();
    }
    scene.environment = modern ? modernEnvironment.texture : null;
    scene.environmentIntensity = modern ? 0.4 : 1;
    scene.background.set(modern ? '#e6e7e6' : '#edf2f4');
    ground.material.color.set(modern ? '#e6e7e6' : '#e4eaeb');
    grid.visible = !modern;
    ceiling.material.color.set(modern ? '#efefec' : '#f3f0e8');
    hemi.intensity = modern ? 0.45 : warmEnabled ? 1.25 : 2.05;
    sun.intensity = modern ? 2 : warmEnabled ? 1.15 : 3.2;
    sun.color.set(modern ? '#fff9ef' : warmEnabled ? '#ffd3a0' : '#fff4de');
    fill.intensity = modern ? 0.4 : 1.1;
    warm.position.set(modern ? 0.4 : 0, modern ? 1.7 : 2.2, modern ? 1.6 : 1.2);
    warm.color.set(modern ? '#ffeacd' : '#ffd39b');
    warm.intensity = warmEnabled ? modern ? 3 : 24 : 0;
    house.setWarmLight?.(warmEnabled);
    renderer.toneMappingExposure = modern ? 1 : warmEnabled ? 1.02 : 1.16;
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
      const labelView = currentView === 'perspective' || (plan && ['kitchen', 'bathroom', 'stairs', 'utility', 'dining'].includes(id));
      let visible = $('#show-labels').checked && labelView && (id !== 'loft' || house.loft.visible)
        && point.z > -1 && point.z < 1 && Math.abs(point.x) < 0.88 && Math.abs(point.y) < 0.8;
      button.classList.toggle('plan-label', plan);
      button.querySelector('.hotspot-label').textContent = plan
        ? { kitchen: 'Bếp', bathroom: 'Tắm/WC', stairs: 'Thang', utility: 'Giặt', dining: 'Ăn & làm việc' }[id] || ''
        : { living: 'Sinh hoạt', dining: 'Ăn & làm việc', loft: 'Gác ngủ', stairs: 'Thang lên gác', utility: 'Giặt & sấy', kitchen: currentDesign === 'proposed' ? 'Bếp mở' : 'Phòng bếp', bathroom: 'Tắm & WC' }[id];
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
    placeWalkingMarker();
    dirty = true;
  }

  function goTo(view, zone, immediate = false) {
    stopWalking();
    transition = null;
    if (zone === 'loft' || view === 'front' || view === 'inside') $('#show-loft').checked = true;
    if (zone === 'utility' || zone === 'stairs') $('#show-loft').checked = view === 'inside';
    if (currentDesign === 'proposed' && ['living', 'dining', 'kitchen', 'bathroom'].includes(zone)) $('#show-loft').checked = view === 'inside';
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
      const focus = ['kitchen', 'bathroom', 'stairs', 'utility', 'dining'].includes(zone) && zoneBounds;
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
      if (zone === 'stairs') {
        camera.position.set(house.layout.stairs.bottom[0] + 0.6, 1.55, house.layout.stairs.bottom[2]);
        yaw = -Math.PI / 2;
        pitch = 0.32;
      }
      prepareWalking(zone);
      insideLook();
    } else {
      camera.fov = view === 'front' ? frontFieldOfView() : 39;
      camera.updateProjectionMatrix();
      if (view === 'front') {
        const frontAnchor = house.layout.cameras.front;
        if (currentDesign === 'modern' && house.layout.entry) {
          position.set(house.layout.entry.door.x, 1.67, depth / 2 - 0.12);
          target.set(-0.45, 1.98, depth / 2 - 3.1);
        } else if (frontAnchor) {
          target.fromArray(frontAnchor.target);
          position.fromArray(frontAnchor.position);
        } else {
          target.set(0, loftHeight * 0.82, house.layout.loft.front - 0.6);
          position.set(width * 0.025, Math.min(1.75, loftHeight - 0.3), depth / 2 - 0.2);
        }
      } else if (zone === 'living') {
        target.set(-0.1, 0.7, depth * 0.26);
        position.set(width * 1.3, 4.1, depth * 0.7);
      } else if (zone === 'dining') {
        target.set(centerX, 0.9, centerZ);
        position.set(width * 1.2, 4.4, centerZ + 3.5);
      } else if (zone === 'loft') {
        target.set(0, loftHeight + 0.35, (house.layout.loft.front + house.layout.loft.back) / 2);
        position.set(-width * 1.25, loftHeight + 3.8, house.layout.loft.front + 4.1);
        $('#show-loft').checked = true;
      } else if (zone === 'stairs') {
        target.set(centerX, loftHeight * 0.5, centerZ);
        position.set(width * 1.2, loftHeight + 3.1, centerZ - 2.8);
      } else if (zone === 'utility') {
        target.set(centerX, 0.9, centerZ);
        position.set(width * 1.3, loftHeight + 4, centerZ + (currentDesign === 'modern' ? -2.7 : 2.7));
      } else if (zone === 'kitchen' || zone === 'bathroom') {
        target.set(centerX, 0.8, centerZ);
        position.set(centerX + (zone === 'bathroom' ? -3.8 : 3.8), 4.9, centerZ + (zone === 'kitchen' && currentDesign === 'proposed' ? 4.2 : -4.2));
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
    placeWalkingMarker();
    applyLayers();
    dirty = true;
  }

  function frontFieldOfView() {
    const halfAngle = currentDesign !== 'reference' ? 37 : 31;
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
    const elapsed = previousTime === undefined ? 0 : (now - previousTime) / 1000;
    previousTime = now;
    if (document.hidden) return;
    if (currentView === 'inside' && walkWorld && (heldKeys.size || heldPointers.size)) {
      if ($('dialog[open]')) stopWalking();
      else {
        const next = walk(camera.position, [...heldKeys.values(), ...heldPointers.values()], yaw, elapsed, walkWorld);
        if (next.x !== camera.position.x || next.y !== camera.position.y || next.z !== camera.position.z) {
          camera.position.set(next.x, next.y, next.z);
          insideLook();
        }
      }
    }
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
  const editing = target => target instanceof Element && !!target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), dialog[open]');
  window.addEventListener('keydown', event => {
    const action = keyActions[event.code];
    if (!action || currentView !== 'inside' || event.altKey || event.ctrlKey || event.metaKey || editing(event.target) || $('dialog[open]')) return;
    event.preventDefault();
    heldKeys.set(event.code, action);
    showMovementState();
  });
  window.addEventListener('keyup', event => {
    if (heldKeys.delete(event.code)) {
      event.preventDefault();
      showMovementState();
    }
  });
  window.addEventListener('blur', stopWalking);
  window.addEventListener('pagehide', stopWalking);
  document.addEventListener('visibilitychange', stopWalking);
  document.addEventListener('focusin', event => { if (editing(event.target)) stopWalking(); });
  moveButtons.forEach(button => {
    button.addEventListener('pointerdown', event => {
      if (currentView !== 'inside' || (event.pointerType === 'mouse' && event.button !== 0)) return;
      event.preventDefault();
      heldPointers.set(event.pointerId, button.dataset.move);
      button.setPointerCapture(event.pointerId);
      showMovementState();
    });
    const release = event => {
      heldPointers.delete(event.pointerId);
      showMovementState();
    };
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, release);
    button.addEventListener('contextmenu', event => event.preventDefault());
    button.addEventListener('keydown', event => {
      if (![' ', 'Enter'].includes(event.key) || currentView !== 'inside') return;
      event.preventDefault();
      heldKeys.set(`button:${event.code}`, button.dataset.move);
      showMovementState();
    });
    button.addEventListener('keyup', event => {
      if (heldKeys.delete(`button:${event.code}`)) { event.preventDefault(); showMovementState(); }
    });
    button.addEventListener('blur', stopWalking);
  });
  renderer.domElement.addEventListener('pointerdown', (event) => {
    if (currentView !== 'inside' || drag || (event.pointerType === 'mouse' && event.button !== 0)) return;
    drag = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    renderer.domElement.setPointerCapture(event.pointerId);
  });
  renderer.domElement.addEventListener('pointermove', (event) => {
    if (!drag || drag.pointerId !== event.pointerId || currentView !== 'inside') return;
    yaw -= (event.clientX - drag.x) * 0.004;
    pitch = THREE.MathUtils.clamp(pitch + (event.clientY - drag.y) * 0.004, -1.2, 1.2);
    drag = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    insideLook();
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) renderer.domElement.addEventListener(type, event => {
    if (drag?.pointerId === event.pointerId) drag = null;
  });
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
    stopWalking();
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
