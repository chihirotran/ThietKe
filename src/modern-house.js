import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createHouse } from './house.js';
import { getModernLayout } from './modern-layout.js';
import { addRetainedStair } from './shared-stair.js';

const center = r => [(r.minX + r.maxX) / 2, (r.minZ + r.maxZ) / 2];

export function createModernHouse(options = {}) {
  const layout = getModernLayout(options);
  const house = createHouse({ ...options, occupants: 1, utilityArrangement: 'standard' });
  const { group, walls, loft, furniture, partitions, materials } = house;
  const { left, right, front, loftHeight, upperHeight } = layout;
  const originalResources = new Set();
  function remember(root) {
    root.traverse(object => {
      if (object.geometry) originalResources.add(object.geometry);
      for (const material of object.material ? (Array.isArray(object.material) ? object.material : [object.material]) : []) {
        originalResources.add(material);
        for (const value of Object.values(material)) if (value?.isTexture) originalResources.add(value);
      }
    });
  }
  remember(group);
  group.remove(house.stairWall);
  const retained = new Set(['washer', 'dryer', 'water-purifier', 'kitchen-fixtures', 'bathroom-fixtures', 'utility-floor']);
  for (const child of [...furniture.children]) if (!retained.has(child.name)) furniture.remove(child);
  loft.clear();
  for (const child of [...partitions.children]) {
    if (child.name === 'rear-partition-wall' && Math.abs(child.position.z - layout.utilityFront) < 0.001 && child.position.x < layout.doors.utility.x) partitions.remove(child);
  }
  for (const child of [...group.children]) {
    if (child.userData.retainedStairWall) group.remove(child);
    if (child.name === 'partition-base' && Math.abs(child.position.z - layout.utilityFront) < 0.001 && child.position.x < layout.doors.utility.x) group.remove(child);
  }
  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...extra });
  const oak = mat('#c2b5a0', { map: materials.wood.map, roughness: 0.56 });
  const cream = mat('#efefeb', { roughness: 0.82 });
  const graphite = mat('#303634', { roughness: 0.44 });
  const linen = mat('#d7d5ce', { roughness: 1 });
  const moss = mat('#a7a399', { roughness: 0.96 });
  const foliage = mat('#667866', { roughness: 0.95 });
  const upholsteryDark = mat('#535a57', { roughness: 0.94 });
  const metal = mat('#707774', { metalness: 0.65, roughness: 0.31 });
  const warm = mat('#faf7f0', { emissive: '#fff2d9', emissiveIntensity: 0.28 });
  const clearGlass = new THREE.MeshPhysicalMaterial({ color: '#edf5f1', roughness: 0.07, metalness: 0, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.05 });
  const shadowOak = mat('#c7beae', { map: materials.wood.map, roughness: 0.62 });
  function texture(width, height, draw) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    draw(canvas.getContext('2d'), width, height);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }
  const floorMap = texture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#e2e3df';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 10000; i++) {
      ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.12)' : 'rgba(64,72,67,0.035)';
      ctx.fillRect((i * 137.57) % w, (i * 71.13) % h, 1.5, 1.5);
    }
  });
  floorMap.wrapS = floorMap.wrapT = THREE.RepeatWrapping;
  floorMap.repeat.set(layout.width / 2, layout.depth / 2);
  const floorFinish = mat('#ffffff', { map: floorMap, roughness: 0.69 });
  const groundFloor = group.children.find(child => child.isMesh && Math.abs(child.position.y + 0.035) < 0.001 && Math.abs((child.geometry.parameters?.width ?? 0) - layout.width) < 0.001);
  if (groundFloor) groundFloor.material = floorFinish;
  materials.wall.color.set('#f0f0eb');
  materials.wood.color.set('#c5b9a3');
  materials.accent.color.set('#acb0a8');
  function box(parent, w, h, d, x, y, z, material = oak, radius = 0.008, name = '') {
    const geo = radius ? new RoundedBoxGeometry(w, h, d, 2, Math.min(radius, w / 3, h / 3, d / 3)) : new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.name = name;
    parent.add(mesh);
    return mesh;
  }
  function cylinder(parent, radius, height, x, y, z, material = graphite) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 16), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function bar(parent, a, b, radius = 0.013, material = graphite) {
    const start = new THREE.Vector3(...a);
    const end = new THREE.Vector3(...b);
    const mesh = cylinder(parent, radius, start.distanceTo(end), 0, 0, 0, material);
    mesh.position.copy(start.clone().add(end).multiplyScalar(0.5));
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize());
    return mesh;
  }
  function localGroup(name, parent = furniture) {
    const result = new THREE.Group();
    result.name = name;
    parent.add(result);
    return result;
  }
  function plant(parent, x, y, z, size = 0.3) {
    cylinder(parent, size * 0.18, size * 0.28, x, y + size * 0.14, z, cream);
    for (let i = 0; i < 5; i++) {
      const angle = i * 2.4;
      const lx = x + Math.sin(angle) * size * 0.17;
      const lz = z + Math.cos(angle) * size * 0.17;
      const ly = y + size * (0.62 + (i % 2) * 0.14);
      bar(parent, [x, y + size * 0.26, z], [lx, ly, lz], 0.005, foliage);
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(size * 0.13, 12, 8), foliage);
      leaf.position.set(lx, ly, lz);
      leaf.scale.set(0.8, 1.5, 0.18);
      leaf.rotation.set(0.3, angle, Math.sin(angle) * 0.4);
      leaf.castShadow = true;
      parent.add(leaf);
    }
  }
  function beam(parent, a, b, width = 0.025, depth = 0.025, material = graphite) {
    const start = new THREE.Vector3(...a);
    const end = new THREE.Vector3(...b);
    const mesh = box(parent, width, start.distanceTo(end), depth, 0, 0, 0, material, 0.002);
    mesh.position.copy(start.clone().add(end).multiplyScalar(0.5));
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize());
    return mesh;
  }
  function glassPanel(parent, bottomA, bottomB, topA, topB) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([...bottomA, ...bottomB, ...topB, ...bottomA, ...topB, ...topA], 3));
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, clearGlass);
    mesh.name = 'modern-glass-guard';
    mesh.castShadow = false;
    parent.add(mesh);
    return mesh;
  }
  function rail(a, b, parent = loft) {
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.05) return;
    const bottom = loftHeight + 0.075;
    const top = loftHeight + 0.98;
    glassPanel(parent, [a[0], bottom, a[1]], [b[0], bottom, b[1]], [a[0], top, a[1]], [b[0], top, b[1]]);
    beam(parent, [a[0], top, a[1]], [b[0], top, b[1]], 0.022, 0.022);
    beam(parent, [a[0], bottom, a[1]], [b[0], bottom, b[1]], 0.028, 0.035);
  }

  for (const r of layout.loft.floorRects) {
    const [x, z] = center(r);
    box(loft, r.maxX - r.minX, 0.14, r.maxZ - r.minZ, x, loftHeight - 0.07, z, cream, 0, 'loft-slab');
    box(loft, r.maxX - r.minX, 0.018, r.maxZ - r.minZ, x, loftHeight + 0.009, z, shadowOak, 0, 'loft-floor-finish');
  }
  box(loft, right - left - 0.03, 0.16, 0.052, 0, loftHeight - 0.055, layout.loft.front + 0.007, cream, 0.005, 'modern-loft-fascia');
  box(loft, right - left - 0.08, 0.017, 0.009, 0, loftHeight - 0.148, layout.loft.front + 0.027, graphite, 0.001, 'soffit-shadow-gap');
  box(loft, right - left - 0.36, 0.009, 0.012, 0, loftHeight - 0.145, layout.loft.front - 0.13, warm, 0.002);
  const frontGuard = localGroup('loft-glass-rail', loft);
  rail([left + 0.09, layout.loft.front - 0.06], [right - 0.09, layout.loft.front - 0.06], frontGuard);
  house.stairWall = addRetainedStair({ group, loft, furniture, layout, wallMaterial: cream, landingMaterial: shadowOak, staircaseName: 'modern-staircase' }).stairWall;

  const storage = localGroup('main-storage');
  const sr = layout.mainStorage.bounds;
  const sh = layout.mainStorage.height;
  box(storage, sr.maxX - sr.minX, sh, sr.maxZ - sr.minZ, center(sr)[0], sh / 2, center(sr)[1], cream, 0.016);
  for (let i = 0; i < 2; i++) {
    const z = sr.minZ + (i + 0.5) * (sr.maxZ - sr.minZ) / 2;
    box(storage, 0.022, sh - 0.07, (sr.maxZ - sr.minZ) / 2 - 0.012, sr.maxX + 0.012, sh / 2, z, cream, 0.004);
  }

  box(storage, sr.maxX - sr.minX - 0.08, 0.045, sr.maxZ - sr.minZ - 0.08, center(sr)[0], 0.034, center(sr)[1], graphite, 0.003);

  const desk = localGroup('desk');
  const dr = layout.desk.bounds;
  const [dx, dz] = center(dr);
  box(walls.getObjectByName('left-wall'), 0.026, 1.32, layout.desk.length + 0.025, left + 0.051, 1.18, dz, cream, 0.004, 'workstation-wall-panel');
  box(desk, dr.maxX - dr.minX, 0.038, dr.maxZ - dr.minZ, dx, 0.75, dz, oak, 0.009);
  box(desk, dr.maxX - dr.minX - 0.09, 0.065, dr.maxZ - dr.minZ - 0.035, dx - 0.015, 0.695, dz, cream, 0.006);
  box(desk, dr.maxX - dr.minX - 0.04, 0.65, 0.31, dx, 0.345, dr.maxZ - 0.17, cream, 0.012);
  box(desk, 0.023, 0.58, 0.276, dr.maxX - 0.012, 0.36, dr.maxZ - 0.17, cream, 0.004);
  box(desk, dr.maxX - dr.minX - 0.06, 0.66, 0.04, dx, 0.345, dr.minZ + 0.06, cream, 0.004);
  const monitorMaps = [0, 1].map(mode => texture(640, 360, (ctx, w, h) => {
    ctx.fillStyle = mode ? '#e9eeeb' : '#233033';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = mode ? '#d0d9d4' : '#304347';
    ctx.fillRect(0, 0, w, 39);
    ctx.font = '15px sans-serif';
    ctx.fillStyle = mode ? '#40584a' : '#d3e1d7';
    ctx.fillText(mode ? 'STUDIO / PROJECT 03' : 'WORKSPACE / DESIGN', 22, 26);
    if (mode) {
      ctx.strokeStyle = '#7a8c7f';
      ctx.lineWidth = 3;
      ctx.strokeRect(48, 73, 323, 229);
      ctx.strokeRect(67, 93, 118, 81);
      ctx.strokeRect(67, 196, 118, 87);
      ctx.strokeRect(225, 93, 126, 134);
      ctx.fillStyle = '#a0b5a3';
      ctx.fillRect(244, 109, 90, 75);
      for (let i = 0; i < 7; i++) ctx.fillRect(412, 88 + i * 28, 156 - (i % 3) * 21, 5);
    } else {
      ctx.fillStyle = '#1d292c';
      ctx.fillRect(0, 39, 127, h - 39);
      for (let i = 0; i < 9; i++) {
        ctx.fillStyle = i % 3 === 0 ? '#aabca4' : '#63848a';
        ctx.fillRect(21, 63 + i * 25, 73 - (i % 2) * 14, 4);
      }
      for (let i = 0; i < 12; i++) {
        ctx.fillStyle = i % 4 === 0 ? '#d4c6a3' : '#86a59a';
        ctx.fillRect(156 + (i % 3) * 15, 67 + i * 22, 170 + (i % 5) * 32, 5);
      }
    }
  }));
  const station = localGroup('workstation');
  station.position.set(left + 0.18, 0, dz);
  station.rotation.y = Math.PI / 2 - 0.17;
  for (const [index, x] of [-0.28, 0.28].entries()) {
    const monitor = localGroup('workstation-monitor', station);
    monitor.position.x = x;
    monitor.rotation.y = -Math.sign(x) * 0.055;
    box(monitor, 0.52, 0.315, 0.022, 0, 1.12, 0, graphite, 0.011);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.486, 0.279), new THREE.MeshBasicMaterial({ map: monitorMaps[index] }));
    screen.position.set(0, 1.12, 0.012);
    monitor.add(screen);
    beam(monitor, [0, 0.786, -0.025], [0, 1.005, -0.025], 0.026, 0.023, metal);
    box(monitor, 0.15, 0.012, 0.105, 0, 0.779, 0.01, graphite, 0.005);
  }
  box(station, 0.39, 0.016, 0.14, 0, 0.787, 0.32, graphite, 0.008);
  for (let row = 0; row < 4; row++) for (let k = 0; k < 11; k++) box(station, 0.026, 0.003, 0.019, -0.162 + k * 0.032, 0.797, 0.274 + row * 0.028, cream, 0.002);
  box(station, 0.052, 0.025, 0.08, 0.28, 0.792, 0.31, cream, 0.013);
  plant(desk, left + 0.18, 0.78, dr.minZ + 0.1, 0.24);
  box(desk, 0.19, 0.028, Math.min(1.3, layout.desk.length), left + 0.15, 1.6, dz, oak, 0.008);
  box(desk, 0.012, 0.016, Math.min(1.2, layout.desk.length - 0.1), left + 0.23, 1.58, dz, warm, 0.003);
  const chair = localGroup('workstation-chair');
  chair.position.set(left + 1.04, 0, dz);
  chair.rotation.y = -Math.PI / 2;
  box(chair, 0.48, 0.07, 0.46, 0, 0.47, 0, upholsteryDark, 0.034);
  box(chair, 0.46, 0.4, 0.065, 0, 0.72, -0.2, upholsteryDark, 0.033);
  cylinder(chair, 0.034, 0.39, 0, 0.23, 0, graphite);
  for (let i = 0; i < 5; i++) bar(chair, [0, 0.05, 0], [Math.cos(i * 1.257) * 0.26, 0.05, Math.sin(i * 1.257) * 0.26], 0.021);

  const sofa = localGroup('modern-sofa');
  const sb = layout.lounge.sofa.bounds;
  sofa.position.set(center(sb)[0], 0, center(sb)[1]);
  sofa.rotation.y = layout.lounge.sofa.orientation === 'right-facing' ? Math.PI / 2 : -Math.PI / 2;
  const sofaLength = sb.maxZ - sb.minZ;
  const innerWidth = sofaLength - 0.30;
  const seatWidth = (innerWidth - 0.022) / 2;
  box(sofa, sofaLength - 0.27, 0.065, 0.54, 0, 0.083, 0, graphite, 0.017);
  box(sofa, sofaLength, 0.24, 0.745, 0, 0.25, 0, linen, 0.075);
  box(sofa, sofaLength - 0.03, 0.45, 0.20, 0, 0.6, -0.257, linen, 0.068);
  for (const x of [-sofaLength / 2 + 0.075, sofaLength / 2 - 0.075]) box(sofa, 0.15, 0.39, 0.745, x, 0.445, 0, linen, 0.055);
  for (const x of [-innerWidth / 4 - 0.0055, innerWidth / 4 + 0.0055]) {
    box(sofa, seatWidth, 0.155, 0.57, x, 0.407, 0.042, linen, 0.047);
    box(sofa, seatWidth - 0.04, 0.005, 0.009, x, 0.395, 0.326, moss, 0.002);
    const backCushion = box(sofa, seatWidth - 0.015, 0.33, 0.17, x, 0.657, -0.177, cream, 0.043);
    backCushion.rotation.x = -0.11;
  }
  const cushion = box(sofa, Math.min(0.32, seatWidth - 0.02), 0.32, 0.13, -innerWidth * 0.29, 0.6, 0.019, moss, 0.048);
  cushion.rotation.set(-0.12, 0.08, 0.15);
  const artwork = localGroup('modern-sofa-art', walls.getObjectByName('left-wall'));
  const artMap = texture(600, 380, (ctx, w, h) => {
    ctx.fillStyle = '#e6e2d8';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#aea698';
    ctx.beginPath();
    ctx.arc(237, 161, 111, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#626864';
    ctx.fillRect(290, 104, 125, 193);
    ctx.fillStyle = '#d6d1c5';
    ctx.fillRect(79, 266, 410, 27);
    ctx.strokeStyle = '#85877e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(75, 315);
    ctx.lineTo(508, 315);
    ctx.stroke();
  });
  box(artwork, 0.025, 0.72, 1.07, left + 0.047, 1.68, center(sb)[1], graphite, 0.004);
  const artPrint = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.65), mat('#ffffff', { map: artMap, roughness: 0.9 }));
  artPrint.rotation.y = Math.PI / 2;
  artPrint.position.set(left + 0.063, 1.68, center(sb)[1]);
  artwork.add(artPrint);
  const tv = localGroup('modern-tv');
  const tr = layout.lounge.television.bounds;
  const [tx, tz] = center(tr);
  const tvDepth = tr.maxX - tr.minX;
  const tvLength = tr.maxZ - tr.minZ;
  const rightMounted = layout.lounge.television.side === 'right';
  const nearFace = rightMounted ? tr.minX : tr.maxX;
  const towardWall = rightMounted ? 1 : -1;
  const backdrop = localGroup('modern-tv-backdrop', walls.getObjectByName(rightMounted ? 'right-wall' : 'left-wall'));
  box(backdrop, 0.029, 1.64, tvLength, nearFace + towardWall * (tvDepth - 0.020), 1.28, tz, mat('#555b59', { roughness: 0.81 }), 0.008, 'tv-feature-panel');
  box(backdrop, 0.023, 1.59, 0.052, nearFace + towardWall * (tvDepth - 0.037), 1.28, tr.minZ + 0.04, oak, 0.003);
  box(backdrop, 0.007, 1.42, 0.008, nearFace + towardWall * (tvDepth - 0.055), 1.26, tr.minZ + 0.075, warm, 0.001);
  box(tv, 0.025, 0.61, Math.min(1.06, tvLength - 0.05), nearFace + towardWall * 0.035, 1.35, tz, graphite, 0.012);
  box(tv, 0.005, 0.565, Math.min(1.01, tvLength - 0.09), nearFace + towardWall * 0.018, 1.35, tz, mat('#293033', { roughness: 0.19, metalness: 0.05 }), 0.005);
  box(tv, 0.005, 0.16, Math.min(0.61, tvLength - 0.2), nearFace + towardWall * 0.014, 1.33, tz - 0.04, mat('#596164'), 0.015);
  box(tv, tvDepth - 0.014, 0.031, tvLength - 0.035, tx, 0.89, tz, cream, 0.005, 'tv-floating-shelf');
  box(tv, 0.042, 0.038, Math.min(0.58, tvLength - 0.2), nearFace + towardWall * 0.06, 0.926, tz, graphite, 0.008);
  box(furniture, Math.max(0.75, layout.width - 2.32), 0.014, Math.min(1.75, sofaLength), -0.1, 0.02, center(sb)[1], mat('#d8d6cd', { roughness: 1 }), 0.007, 'modern-living-rug');

  const bedroom = localGroup('modern-bedroom', loft);
  const br = layout.bed.bounds;
  const [bx, bz] = center(br);
  const bedWidth = layout.bed.width;
  const bedLength = layout.bed.length;
  bedroom.position.set(bx, loftHeight, bz);
  bedroom.rotation.y = layout.bed.axis === 'x' ? Math.PI / 2 : 0;
  box(bedroom, bedWidth - 0.1, 0.09, bedLength - 0.12, 0, 0.065, 0, graphite, 0.014);
  box(bedroom, bedWidth + 0.06, 0.19, bedLength + 0.04, 0, 0.185, 0, linen, 0.045);
  box(bedroom, bedWidth, 0.2, bedLength, 0, 0.33, 0, cream, 0.055, 'bed-mattress');
  box(bedroom, bedWidth + 0.04, 0.89, 0.085, 0, 0.485, -bedLength / 2, linen, 0.033, 'bed-headboard');
  box(bedroom, 0.007, 0.8, 0.006, 0, 0.485, -bedLength / 2 + 0.046, moss, 0.002);
  box(bedroom, bedWidth + 0.015, 0.085, bedLength * 0.75, 0, 0.465, bedLength * 0.115, linen, 0.036, 'bed-duvet');
  box(bedroom, bedWidth + 0.023, 0.035, 0.38, 0, 0.526, bedLength / 2 - 0.36, moss, 0.012, 'bed-throw');
  for (const x of [-bedWidth * 0.23, bedWidth * 0.23]) box(bedroom, bedWidth * 0.43, 0.13, 0.35, x, 0.49, -bedLength / 2 + 0.27, cream, 0.048, 'bed-pillow');
  const bedsideLightZ = layout.bed.axis === 'x' ? bz + bedWidth * 0.2 : br.minZ + 0.4;
  box(loft, 0.043, 0.18, 0.043, left + 0.07, loftHeight + 0.98, bedsideLightZ, graphite, 0.007, 'bedside-light');
  box(loft, 0.013, 0.073, 0.025, left + 0.098, loftHeight + 0.96, bedsideLightZ, warm, 0.003);
  const wr = layout.wardrobe.bounds;
  const wh = layout.wardrobe.height;
  const wardrobe = localGroup('loft-wardrobe', loft);
  box(wardrobe, wr.maxX - wr.minX, wh, wr.maxZ - wr.minZ, center(wr)[0], loftHeight + wh / 2, center(wr)[1], cream, 0.013);
  for (let i = 0; i < 3; i++) {
    const z = wr.minZ + (i + 0.5) * (wr.maxZ - wr.minZ) / 3;
    box(wardrobe, 0.02, wh - 0.055, (wr.maxZ - wr.minZ) / 3 - 0.012, wr.minX - 0.013, loftHeight + wh / 2, z, cream, 0.004);
  }
  box(wardrobe, wr.maxX - wr.minX - 0.04, 0.044, wr.maxZ - wr.minZ - 0.05, center(wr)[0], loftHeight + 0.027, center(wr)[1], graphite, 0.003);
  const stripStart = Math.max(layout.loft.front - 1.65, layout.stairs.opening.maxZ + 0.08);
  const stripEnd = layout.loft.front - 0.25;
  if (stripEnd > stripStart) for (const x of [left + 0.37, right - 0.38]) box(loft, 0.011, 0.008, stripEnd - stripStart, x, loftHeight - 0.144, (stripStart + stripEnd) / 2, warm, 0.002, 'soffit-light-strip');
  house.setWarmLight = enabled => {
    warm.emissiveIntensity = enabled ? 0.32 : 0;
    warm.color.set(enabled ? '#faf7f0' : '#eceeea');
  };

  const basePalette = house.setPalette;
  house.setPalette = name => {
    basePalette(name);
    materials.wall.color.set('#f0f0eb');
    materials.accent.color.set('#acb0a8');
    materials.wood.color.set(name === 'walnut' ? '#a79c8a' : '#c5b9a3');
    oak.color.set(name === 'walnut' ? '#a99c87' : '#c2b5a0');
    moss.color.set(name === 'walnut' ? '#a19d96' : '#a7a399');
    shadowOak.color.set(name === 'walnut' ? '#b3aa9b' : '#c7beae');
  };
  house.layout = layout;
  house.hotspots = [
    { id: 'living', position: new THREE.Vector3(0.15, 0.85, center(sb)[1]) },
    { id: 'loft', position: new THREE.Vector3(bx, loftHeight + 0.6, bz) },
    { id: 'stairs', position: new THREE.Vector3((layout.stairs.bottom[0] + layout.stairs.top[0]) / 2, 1.1, layout.stairs.top[2]) },
    { id: 'utility', position: new THREE.Vector3(layout.doors.utility.x, 1.05, (layout.roomFront + layout.utilityFront) / 2) },
    ...house.hotspots.filter(h => h.id === 'kitchen' || h.id === 'bathroom'),
  ];
  house.dispose = () => {
    remember(group);
    for (const resource of originalResources) resource.dispose();
    originalResources.clear();
    group.removeFromParent();
  };
  return house;
}
