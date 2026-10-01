import './townhouse.css';
import { createTownhouseViewer } from './townhouse-viewer.js';
import { getTownhouseLayout } from './townhouse-layout.js';
import { designStorageKey, loadDesignSettings } from './designs.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const icon = name => `<svg class="icon" aria-hidden="true"><use href="#icon-${name}" /></svg>`;
const layout = getTownhouseLayout();
const floorNames = ['Tầng trệt', 'Lầu 1', 'Lầu 2', 'Lầu 3', 'Lầu 4'];
const floorTitles = ['Đón về nhà', 'Cả nhà quây quần', 'Khoảng riêng của bố mẹ', 'Hai phòng ngủ', 'Sân vườn trên cao'];
const floorIcons = ['house', 'sofa', 'bed', 'bed', 'washer'];
const views = { exterior: 'Mặt ngoài', cutaway: 'Cắt mở', exploded: 'Tách tầng', plan: 'Mặt bằng', inside: 'Bên trong' };
let settings;
try { settings = loadDesignSettings(localStorage.getItem(designStorageKey('townhouse'))); }
catch { settings = loadDesignSettings(null); }
let viewer;
let state = { floor: 0, view: 'exterior' };
let toastTimer;
const designSection = $('.designs-section').outerHTML;
const paletteSection = $('.palette-section').outerHTML;
document.body.dataset.design = 'townhouse';
document.title = 'nhà mình — 04 · Nhà 5 tầng cho gia đình';
$('.brand-tagline').textContent = 'Một nền nhà, năm tầng cuộc sống.';
$('.workspace').innerHTML = `
  <aside class="sidebar" aria-label="Phương án nhà năm tầng">
    <div class="project-intro"><span class="project-badge"><span></span><span id="project-badge-text">04 / Phương án xây mới</span></span>
      <h1>Nhà cho cả gia đình</h1><p>Trệt + 4 lầu trên nền 43 m².<br>Không gian riêng, nơi chung để trở về.</p>
      <div class="townhouse-facts"><span><strong>5–6</strong>người ở</span><span><strong>4</strong>phòng ngủ</span><span><strong>05</strong>tầng</span></div>
    </div>
    <section class="sidebar-section townhouse-floors" aria-labelledby="floor-list-title"><div class="section-heading"><h2 id="floor-list-title">Khám phá từng tầng</h2><span class="subtle-label">Chạm để mở</span></div>
      <nav class="floor-stack" aria-label="Chọn tầng">${layout.floors.slice().reverse().map(f => `<button type="button" data-floor="${f.index}" aria-pressed="${f.index === 0}"><span class="floor-index">${f.index === 0 ? 'T' : `L${f.index}`}</span><span><strong>${floorNames[f.index]}</strong><small>${floorTitles[f.index]}</small></span>${icon(floorIcons[f.index])}</button>`).join('')}</nav>
      <div class="floor-program"><span id="floor-program-title">Tầng trệt</span><p id="floor-summary"></p><ul id="room-list"></ul></div>
    </section>
    <section class="sidebar-section"><h2>Một trục kết nối cả nhà</h2><p class="townhouse-copy">Thang máy và thang bộ chữ U ở phía sau. Giếng trời xuyên tầng đưa ánh sáng vào khu giữa nhà; phòng khách và phòng ngủ chính hướng ra mặt trước.</p><p class="section-note">Giường nằm lệch khỏi hình chiếu của bếp nấu ở lầu 1.</p></section>
    <section class="sidebar-section"><h2>Nền nhà & chiều cao</h2><dl class="dimension-list"><div><dt>Ngang × dài, ước tính</dt><dd>3,91 × 11 m</dd></div><div><dt>Diện tích nền</dt><dd>43 m²</dd></div><div><dt>Cao mỗi tầng, đề xuất</dt><dd>3,2 m</dd></div><div><dt>5 mặt sàn cộng lại</dt><dd>≈ 215 m²</dd></div></dl><p class="section-note">215 m² là diện tích cộng theo bao ngoài; chưa trừ thang, giếng trời và sân. Chiều ngang suy ra từ 43 ÷ 11.</p></section>
    ${paletteSection}
    <section class="sidebar-section"><label class="toggle-row" for="townhouse-warm"><span>Ánh sáng ấm</span><input id="townhouse-warm" type="checkbox" role="switch" ${settings.warmLight ? 'checked' : ''}><span class="toggle-track" aria-hidden="true"></span></label></section>
    ${designSection}
    <p class="sidebar-footer">Phương án hình dung xây mới. Số đo phòng và thiết bị còn ước lượng; cần khảo sát, thiết kế kết cấu và kiểm tra quy hoạch trước khi xây 5 tầng.</p>
  </aside>
  <section id="viewer" class="viewer townhouse-viewer" aria-label="Mô hình nhà năm tầng tương tác" tabindex="-1" data-view="exterior">
    <div id="canvas-container" class="canvas-container"></div>
    <div class="view-heading"><div class="design-pill"><span></span><span id="design-pill-text">04 · Nhà 5 tầng</span></div><h2 id="view-title">Mặt ngoài ngôi nhà</h2><p id="view-description">Trệt + 4 lầu · 3,91 × 11 m</p></div>
    <div class="view-switcher" role="group" aria-label="Chọn góc nhìn">${Object.entries(views).map(([id, title]) => `<button type="button" data-view="${id}" aria-pressed="${id === 'exterior'}">${title}</button>`).join('')}</div>
    <div class="quick-floors" role="group" aria-label="Chuyển nhanh giữa các tầng"><span>Chọn tầng</span>${floorNames.map((name, i) => `<button type="button" data-floor="${i}" aria-label="Xem ${name.toLowerCase()}" aria-pressed="${i === 0}">${i === 0 ? 'Trệt' : `Lầu ${i}`}</button>`).join('')}</div>
    <div id="loading" class="viewer-loading" role="status"><span class="loading-ring"></span><strong>Đang dựng ngôi nhà 5 tầng</strong><p>Thêm một góc nhìn cho gia đình bạn.</p></div>
    <div id="webgl-error" class="webgl-error" hidden><h2>Chưa thể mở mô hình 3D</h2><p>Thử tải lại trang hoặc bật tăng tốc đồ họa trong trình duyệt.</p></div>
    <section id="movement-dialog" class="movement-dialog" role="dialog" aria-modal="false" aria-labelledby="movement-title"><h3 id="movement-title">Di chuyển</h3><div class="movement-pad">${[['forward','Tiến'],['left','Sang trái'],['backward','Lùi'],['right','Sang phải']].map(([action, name]) => `<button type="button" data-move="${action}" aria-label="${name}" aria-pressed="false">${icon('arrow')}</button>`).join('')}</div><p>Giữ nút để đi · Kéo hình để nhìn</p></section>
    <div class="viewer-bottom"><div class="viewer-utilities"><div class="viewer-controls">${[['zoom-in','plus','Phóng to'],['zoom-out','minus','Thu nhỏ'],['reset-view','reset','Đặt lại góc nhìn'],['fullscreen','fullscreen','Toàn màn hình']].map(([id, image, title]) => `<button id="${id}" type="button" class="icon-button" aria-label="${title}" title="${title}">${icon(image)}</button>`).join('')}</div><p class="interaction-hint">Kéo để xoay · Cuộn để phóng to</p><p class="inside-navigation-hint"><span class="navigation-hint-keyboard">W/A/S/D để đi · Kéo để nhìn</span><span class="navigation-hint-touch">Giữ nút để đi · Kéo để nhìn</span><br>Chọn tầng ở phía trên để lên / xuống.</p></div><div class="townhouse-caption"><strong id="scene-caption">Mặt tiền hiện đại</strong><span id="scene-detail">Ban công, cây xanh và khoảng lấy sáng</span></div></div>
    <p id="scene-status" class="sr-only" role="status" aria-live="polite"></p>
  </section>`;
$('#dimensions-dialog').remove();

function toast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3200);
}

function saveSettings() {
  try {
    localStorage.setItem('nha-minh-design-choice-v1', 'townhouse');
    localStorage.setItem(designStorageKey('townhouse'), JSON.stringify(settings));
  } catch { /* Storage is optional. */ }
}

function sync(next) {
  const changed = state.floor !== next.floor || state.view !== next.view;
  state = next;
  const floor = layout.floors[next.floor];
  $('#viewer').dataset.view = next.view;
  $('#viewer').dataset.floor = String(next.floor);
  $$('[data-floor]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.floor) === next.floor)));
  $$('button[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === next.view)));
  $('#view-title').textContent = next.view === 'exterior' ? 'Mặt ngoài ngôi nhà' : next.view === 'exploded' ? 'Năm tầng, một tổ ấm' : `${floorNames[next.floor]} · ${views[next.view]}`;
  $('#view-description').textContent = ['exterior', 'exploded'].includes(next.view) ? 'Trệt + 4 lầu · 3,91 × 11 m' : floorTitles[next.floor];
  $('#floor-program-title').textContent = `${floorNames[next.floor]} / ${floorTitles[next.floor]}`;
  $('#floor-summary').textContent = floor.summary;
  $('#room-list').replaceChildren(...floor.rooms.map(room => { const li = document.createElement('li'); li.textContent = room.name; return li; }));
  $('#scene-caption').textContent = next.view === 'exterior' ? 'Mặt tiền hiện đại' : next.view === 'exploded' ? 'Xem mối liên hệ giữa các tầng' : floorNames[next.floor];
  $('#scene-detail').textContent = next.view === 'inside' ? 'Chọn tầng để đổi cao độ' : next.view === 'plan' ? 'Mặt bằng bố trí ước lượng' : 'Chọn tầng để xem nội thất';
  if (changed) $('#scene-status').textContent = `${views[next.view]} · ${floorNames[next.floor]}`;
}

$$('button[data-design]').forEach(button => {
  button.setAttribute('aria-pressed', String(button.dataset.design === 'townhouse'));
  button.addEventListener('click', () => {
    if (button.dataset.design === 'townhouse') return;
    const url = new URL(location.href);
    url.searchParams.set('design', button.dataset.design);
    try { localStorage.setItem('nha-minh-design-choice-v1', button.dataset.design); } catch { /* Storage is optional. */ }
    location.assign(url);
  });
});
$$('button[data-view]').forEach(button => button.addEventListener('click', () => viewer?.setView(button.dataset.view)));
$$('[data-floor]').forEach(button => button.addEventListener('click', () => {
  const target = Number(button.dataset.floor);
  if (state.view === 'exterior') viewer?.setView('cutaway');
  viewer?.setFloor(target);
}));
$$('[data-palette]').forEach(button => {
  button.setAttribute('aria-pressed', String(button.dataset.palette === settings.palette));
  button.addEventListener('click', () => {
    settings.palette = button.dataset.palette;
    $$('[data-palette]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    viewer?.setPalette(settings.palette);
    saveSettings();
  });
});
$('#townhouse-warm').addEventListener('change', event => { settings.warmLight = event.target.checked; viewer?.setWarmLight(settings.warmLight); saveSettings(); });
$('#zoom-in').addEventListener('click', () => viewer?.zoom(0.8));
$('#zoom-out').addEventListener('click', () => viewer?.zoom(1.25));
$('#reset-view').addEventListener('click', () => viewer?.reset());
$('#fullscreen').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if ($('#viewer').requestFullscreen) await $('#viewer').requestFullscreen();
    else toast('Trình duyệt này chưa hỗ trợ toàn màn hình.');
  } catch { toast('Chưa thể mở toàn màn hình trong cửa sổ này.'); }
});
document.addEventListener('fullscreenchange', () => {
  $('#fullscreen').setAttribute('aria-pressed', String(!!document.fullscreenElement));
  $('#fullscreen').setAttribute('aria-label', document.fullscreenElement ? 'Thoát toàn màn hình' : 'Toàn màn hình');
});
$('#capture-button').addEventListener('click', () => {
  if (!viewer) return;
  try {
    const link = document.createElement('a');
    link.href = viewer.capture();
    link.download = `nha-minh-5-tang-${state.floor}-${state.view}.png`;
    link.click();
    toast('Đã lưu ảnh góc nhìn hiện tại.');
  } catch { toast('Chưa thể lưu ảnh. Bạn thử tải lại mô hình nhé.'); }
});

$$('[data-move]').forEach(button => {
  button.addEventListener('pointerdown', event => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    button.setAttribute('aria-pressed', 'true');
    viewer?.setMove(button.dataset.move, true, event.pointerId);
  });
  const release = event => { button.setAttribute('aria-pressed', 'false'); viewer?.setMove(button.dataset.move, false, event.pointerId); };
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(name => button.addEventListener(name, release));
  button.addEventListener('contextmenu', event => event.preventDefault());
});
window.addEventListener('blur', () => { viewer?.clearMovement(); $$('[data-move]').forEach(button => button.setAttribute('aria-pressed', 'false')); });

const referenceFiles = { proposed: 'proposed-plan.png', design: 'design-target.png', 0: 'nha2.jpeg', 1: 'nha1.jpeg' };
function showReference(id) {
  const video = ['2', 'rear', 'existing-stairs'].includes(id);
  $('#reference-video').pause();
  $('#reference-image').hidden = video;
  $('#reference-video').hidden = !video;
  if (video) $('#reference-video').currentTime = id === 'rear' ? 10 : id === 'existing-stairs' ? 12 : 0;
  else $('#reference-image').src = `${import.meta.env.BASE_URL}references/${referenceFiles[id] || referenceFiles[0]}`;
  $$('#reference-dialog [data-reference]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.reference === id)));
}
$('#references-button').addEventListener('click', () => { viewer?.clearMovement(); showReference('0'); $('#reference-dialog').showModal(); });
$$('#reference-dialog [data-reference]').forEach(button => button.addEventListener('click', () => showReference(button.dataset.reference)));
$('#reference-dialog [data-close-dialog]').addEventListener('click', () => $('#reference-dialog').close());
$('#reference-dialog').addEventListener('close', () => $('#reference-video').pause());
$('#reference-caption').textContent = 'Tư liệu của nhà hiện tại. Mẫu 04 là ý tưởng xây mới 5 tầng trên cùng diện tích nền.';

sync(state);
saveSettings();
try {
  viewer = createTownhouseViewer($('#canvas-container'), { palette: settings.palette, warmLight: settings.warmLight, onChange: next => {
    if (next.floor !== state.floor || next.view !== state.view) sync(next);
  }, onError: () => { $('#loading').hidden = true; $('#webgl-error').hidden = false; } });
  $('#loading').hidden = true;
  $('#viewer').dataset.ready = 'true';
} catch (error) {
  $('#loading').hidden = true;
  $('#webgl-error').hidden = false;
  console.error('Unable to create townhouse viewer', error);
}
window.addEventListener('pagehide', event => {
  viewer?.clearMovement();
  if (!event.persisted) viewer?.dispose();
});
window.addEventListener('pageshow', event => { if (event.persisted) viewer?.resize(); });
