import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createHouse } from './house.js';
import { getModernLayout } from './modern-layout.js';

const center = r => [(r.minX + r.maxX) / 2, (r.minZ + r.maxZ) / 2];

export function createModernHouse(options = {}) {
  const layout = getModernLayout(options);
  const house = createHouse({ ...options, occupants: 1 });
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
  const retained = new Set(['washer', 'utility-wash-counter', 'kitchen-fixtures', 'bathroom-fixtures', 'utility-floor']);
  for (const child of [...furniture.children]) if (!retained.has(child.name)) furniture.remove(child);
  loft.clear();
  for (const child of [...partitions.children]) {
    if (child.name === 'rear-partition-wall' && Math.abs(child.position.z - layout.utilityFront) < 0.001 && child.position.x < layout.doors.utility.x) partitions.remove(child);
  }
  for (const child of [...group.children]) {
    if (child.name === 'partition-base' && Math.abs(child.position.z - layout.utilityFront) < 0.001 && child.position.x < layout.doors.utility.x) group.remove(child);
  }
  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...extra });
  const oak = materials.wood;
  const cream = mat('#ece9df');
  const graphite = mat('#343b37', { roughness: 0.45 });
  const linen = mat('#dbd7c9', { roughness: 1 });
  const moss = mat('#909b83', { roughness: 0.96 });
  const metal = mat('#757d70', { metalness: 0.65, roughness: 0.35 });
  const warm = mat('#fff4d9', { emissive: '#ffe4ab', emissiveIntensity: 0.8 });
  const clearGlass = new THREE.MeshPhysicalMaterial({ color: '#d8e7df', roughness: 0.12, metalness: 0, transparent: true, opacity: 0.24, depthWrite: false, side: THREE.DoubleSide });
  const shadowOak = mat('#aa8b62', { map: oak.map, roughness: 0.58 });
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
      bar(parent, [x, y + size * 0.26, z], [lx, ly, lz], 0.005, moss);
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(size * 0.13, 12, 8), moss);
      leaf.position.set(lx, ly, lz);
      leaf.scale.set(0.8, 1.5, 0.18);
      leaf.rotation.set(0.3, angle, Math.sin(angle) * 0.4);
      leaf.castShadow = true;
      parent.add(leaf);
    }
  }
  function rail(a, b, parent = loft) {
    const top = loftHeight + 0.95;
    bar(parent, [a[0], top, a[1]], [b[0], top, b[1]], 0.018);
    const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.15);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      bar(parent, [a[0] + (b[0] - a[0]) * t, loftHeight + 0.025, a[1] + (b[1] - a[1]) * t], [a[0] + (b[0] - a[0]) * t, top, a[1] + (b[1] - a[1]) * t], 0.0075);
    }
  }

  for (const r of layout.loft.floorRects) {
    const [x, z] = center(r);
    box(loft, r.maxX - r.minX, 0.14, r.maxZ - r.minZ, x, loftHeight - 0.07, z, oak, 0, 'loft-slab');
    box(loft, r.maxX - r.minX, 0.018, r.maxZ - r.minZ, x, loftHeight + 0.009, z, shadowOak, 0, 'loft-floor-finish');
  }
  box(loft, right - left - 0.03, 0.22, 0.09, 0, loftHeight - 0.07, layout.loft.front, cream, 0.01, 'modern-loft-fascia');
  box(loft, right - left - 0.18, 0.012, 0.018, 0, loftHeight - 0.17, layout.loft.front - 0.07, warm, 0.003);
  const frontGuard = localGroup('loft-glass-rail', loft);
  box(frontGuard, right - left - 0.18, 0.91, 0.014, 0, loftHeight + 0.51, layout.loft.front - 0.06, clearGlass, 0);
  bar(frontGuard, [left + 0.09, loftHeight + 0.98, layout.loft.front - 0.06], [right - 0.09, loftHeight + 0.98, layout.loft.front - 0.06], 0.019);
  for (const x of [left + 0.1, 0, right - 0.1]) bar(frontGuard, [x, loftHeight + 0.025, layout.loft.front - 0.06], [x, loftHeight + 0.98, layout.loft.front - 0.06], 0.016);
  const [upperHole, lowerHole] = layout.stairs.openingRects;
  rail([upperHole.minX, upperHole.minZ], [upperHole.maxX, upperHole.minZ]);
  rail([upperHole.maxX, upperHole.minZ], [upperHole.maxX, lowerHole.maxZ]);
  rail([lowerHole.minX, lowerHole.maxZ], [lowerHole.maxX, lowerHole.maxZ]);
  rail([lowerHole.minX, upperHole.maxZ], [lowerHole.minX, lowerHole.maxZ]);
  rail([layout.stairs.landing.maxX, upperHole.maxZ], [lowerHole.minX, upperHole.maxZ]);
  const land = layout.stairs.landing;
  box(loft, land.maxX - land.minX, 0.009, land.maxZ - land.minZ, ...[center(land)[0], loftHeight + 0.024, center(land)[1]], shadowOak, 0, 'stair-landing');

  const stairGroup = localGroup('modern-staircase');
  for (let index = 0; index < layout.stairs.flights.length; index++) {
    const f = layout.stairs.flights[index];
    const flight = localGroup(index === 0 ? 'modern-lower-stair' : 'modern-upper-stair', stairGroup);
    const alongZ = index === 0;
    const run = Math.abs(f.top[alongZ ? 2 : 0] - f.bottom[alongZ ? 2 : 0]);
    for (let i = 0; i < f.steps; i++) {
      const t = (i + 0.5) / f.steps;
      const x = THREE.MathUtils.lerp(f.bottom[0], f.top[0], t);
      const z = THREE.MathUtils.lerp(f.bottom[2], f.top[2], t);
      const y = THREE.MathUtils.lerp(f.bottom[1], f.top[1], (i + 1) / f.steps);
      const exit = index === 1 && i === f.steps - 1;
      box(flight, alongZ ? f.width : run / f.steps + 0.008, 0.045, alongZ ? run / f.steps + 0.008 : f.width + (exit ? 0.045 : 0), x, y - 0.0225, z + (exit ? 0.0225 : 0), oak, 0.007, 'stair-tread');
    }
    for (const side of [-1, 1]) {
      const a = [...f.bottom];
      const b = [...f.top];
      a[alongZ ? 0 : 2] += side * (f.width / 2 - 0.035);
      b[alongZ ? 0 : 2] += side * (f.width / 2 - 0.035);
      a[1] += 0.06;
      b[1] -= 0.07;
      bar(flight, a, b, 0.032, graphite).name = 'stair-stringer';
    }
    const outer = alongZ ? f.bounds.maxX - 0.025 : f.bounds.minZ + 0.025;
    const a = [alongZ ? outer : f.bottom[0], f.bottom[1] + 0.88, alongZ ? f.bottom[2] : outer];
    const b = [alongZ ? outer : f.top[0], f.top[1] + 0.88, alongZ ? f.top[2] : outer];
    bar(flight, a, b, 0.019, oak);
    for (let i = 0; i <= 4; i++) {
      const t = i / 4;
      const p = a.map((v, k) => THREE.MathUtils.lerp(v, b[k], t));
      bar(flight, [p[0], p[1] - 0.86, p[2]], p, 0.01);
    }
  }
  for (const r of layout.stairs.landings) box(stairGroup, r.maxX - r.minX, 0.08, r.maxZ - r.minZ, center(r)[0], r.height - 0.04, center(r)[1], oak, 0.008, 'stair-mid-landing');
  const middle = layout.stairs.landings[0];
  for (const x of [middle.minX + 0.04, middle.maxX - 0.04]) bar(stairGroup, [x, 0.04, middle.minZ + 0.04], [x, middle.height - 0.08, middle.minZ + 0.04], 0.027);

  const storage = localGroup('main-storage');
  const sr = layout.mainStorage.bounds;
  const sh = layout.mainStorage.height;
  box(storage, sr.maxX - sr.minX, sh, sr.maxZ - sr.minZ, center(sr)[0], sh / 2, center(sr)[1], cream, 0.016);
  for (let i = 0; i < 2; i++) {
    const z = sr.minZ + (i + 0.5) * (sr.maxZ - sr.minZ) / 2;
    box(storage, 0.022, sh - 0.07, (sr.maxZ - sr.minZ) / 2 - 0.012, sr.maxX + 0.012, sh / 2, z, oak, 0.004);
    box(storage, 0.015, 0.14, 0.012, sr.maxX + 0.03, 1.02, z, graphite, 0.003);
  }

  const desk = localGroup('desk');
  const dr = layout.desk.bounds;
  const [dx, dz] = center(dr);
  box(desk, dr.maxX - dr.minX, 0.05, dr.maxZ - dr.minZ, dx, 0.75, dz, oak, 0.014);
  for (const z of [dr.minZ + 0.12, dr.maxZ - 0.12]) {
    bar(desk, [dr.minX + 0.1, 0.035, z], [dr.minX + 0.1, 0.725, z], 0.023);
    bar(desk, [dr.maxX - 0.08, 0.035, z], [dr.maxX - 0.08, 0.725, z], 0.023);
  }
  const station = localGroup('workstation');
  station.position.set(left + 0.18, 0, dz);
  station.rotation.y = Math.PI / 2 - 0.17;
  for (const x of [-0.28, 0.28]) {
    const monitor = localGroup('workstation-monitor', station);
    monitor.position.x = x;
    box(monitor, 0.52, 0.315, 0.025, 0, 1.11, 0, graphite, 0.012);
    box(monitor, 0.478, 0.274, 0.004, 0, 1.11, 0.015, mat(x < 0 ? '#38574e' : '#aebdaf', { emissive: '#31443c', emissiveIntensity: 0.2 }), 0.004);
    for (let i = 0; i < 4; i++) box(monitor, 0.22 - i * 0.022, 0.009, 0.005, -0.065, 1.18 - i * 0.036, 0.019, cream, 0);
    bar(monitor, [0, 0.78, -0.005], [0, 0.97, -0.005], 0.015, metal);
    box(monitor, 0.16, 0.014, 0.105, 0, 0.785, 0.015, graphite, 0.006);
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
  box(chair, 0.48, 0.07, 0.46, 0, 0.47, 0, moss, 0.034);
  box(chair, 0.46, 0.4, 0.065, 0, 0.72, -0.2, moss, 0.033);
  cylinder(chair, 0.034, 0.39, 0, 0.23, 0, graphite);
  for (let i = 0; i < 5; i++) bar(chair, [0, 0.05, 0], [Math.cos(i * 1.257) * 0.26, 0.05, Math.sin(i * 1.257) * 0.26], 0.021);

  const sofa = localGroup('modern-sofa');
  const sb = layout.lounge.sofa.bounds;
  sofa.position.set(...[center(sb)[0], 0, center(sb)[1]]);
  sofa.rotation.y = -Math.PI / 2;
  const sofaLength = sb.maxZ - sb.minZ;
  box(sofa, sofaLength, 0.17, 0.72, 0, 0.24, 0, oak, 0.035);
  box(sofa, sofaLength - 0.03, 0.51, 0.15, 0, 0.56, -0.265, linen, 0.06);
  for (const x of [-sofaLength / 2 + 0.085, sofaLength / 2 - 0.085]) box(sofa, 0.17, 0.35, 0.73, x, 0.43, 0, linen, 0.055);
  for (const x of [-0.4, 0.4]) {
    box(sofa, 0.76, 0.17, 0.55, x, 0.385, 0.035, linen, 0.048);
    box(sofa, 0.72, 0.32, 0.15, x, 0.63, -0.16, cream, 0.04);
  }
  const cushion = box(sofa, 0.32, 0.32, 0.13, -0.51, 0.58, 0.025, moss, 0.055);
  cushion.rotation.z = 0.13;
  for (const x of [-0.72, 0.72]) for (const z of [-0.24, 0.24]) cylinder(sofa, 0.025, 0.15, x, 0.09, z, graphite);
  const tv = localGroup('modern-tv');
  const tr = layout.lounge.television.bounds;
  const [tx, tz] = center(tr);
  box(tv, tr.maxX - tr.minX, 0.32, tr.maxZ - tr.minZ, tx, 0.34, tz, oak, 0.016);
  box(tv, 0.016, 0.25, tr.maxZ - tr.minZ - 0.07, tr.maxX + 0.01, 0.34, tz, cream, 0.005);
  box(tv, 0.026, 0.61, 1.06, left + 0.074, 1.28, tz, graphite, 0.016);
  box(tv, 0.008, 0.565, 1.01, left + 0.092, 1.28, tz, mat('#48584c', { roughness: 0.22 }), 0.008);
  box(tv, 0.018, 0.018, 0.55, left + 0.11, 1.14, tz, moss, 0.006);
  plant(tv, tr.maxX - 0.1, 0.51, tr.maxZ - 0.15, 0.3);
  box(furniture, Math.max(0.75, layout.width - 2.25), 0.014, 1.75, 0.15, 0.02, center(sb)[1], mat('#d4cdbd', { roughness: 1 }), 0.007, 'modern-living-rug');

  const bedroom = localGroup('modern-bedroom', loft);
  const br = layout.bed.bounds;
  const [bx, bz] = center(br);
  box(bedroom, layout.bed.width + 0.06, 0.15, 2.04, bx, loftHeight + 0.115, bz, oak, 0.024);
  box(bedroom, layout.bed.width, 0.21, 2, bx, loftHeight + 0.28, bz, linen, 0.06, 'bed-mattress');
  box(bedroom, layout.bed.width + 0.04, 0.64, 0.065, bx, loftHeight + 0.38, br.minZ, cream, 0.034, 'bed-headboard');
  box(bedroom, layout.bed.width + 0.015, 0.09, 1.5, bx, loftHeight + 0.415, bz + 0.23, moss, 0.04);
  for (const x of [bx - layout.bed.width * 0.23, bx + layout.bed.width * 0.23]) box(bedroom, layout.bed.width * 0.43, 0.12, 0.35, x, loftHeight + 0.43, br.minZ + 0.27, cream, 0.05);
  box(bedroom, 0.1, 0.03, 0.46, left + 0.09, loftHeight + 0.86, br.minZ + 0.45, oak, 0.006);
  const wr = layout.wardrobe.bounds;
  const wh = layout.wardrobe.height;
  const wardrobe = localGroup('loft-wardrobe', loft);
  box(wardrobe, wr.maxX - wr.minX, wh, wr.maxZ - wr.minZ, center(wr)[0], loftHeight + wh / 2, center(wr)[1], cream, 0.013);
  for (let i = 0; i < 3; i++) {
    const z = wr.minZ + (i + 0.5) * (wr.maxZ - wr.minZ) / 3;
    box(wardrobe, 0.02, wh - 0.055, (wr.maxZ - wr.minZ) / 3 - 0.012, wr.minX - 0.013, loftHeight + wh / 2, z, i === 0 ? oak : cream, 0.004);
    box(wardrobe, 0.015, 0.2, 0.012, wr.minX - 0.032, loftHeight + 1.05, z + 0.1, graphite, 0.004);
  }
  for (const x of [left + 0.37, right - 0.38]) {
    box(loft, 0.016, 0.012, 1.4, x, loftHeight - 0.154, 1.75, warm, 0.002);
    const light = new THREE.PointLight('#ffe4bd', 5, 3, 2);
    light.position.set(x, loftHeight - 0.23, 1.75);
    loft.add(light);
  }

  const basePalette = house.setPalette;
  house.setPalette = name => {
    basePalette(name);
    moss.color.set(name === 'walnut' ? '#88988b' : '#909b83');
    shadowOak.color.set(name === 'walnut' ? '#957656' : '#aa8b62');
  };
  house.layout = layout;
  house.hotspots = [
    { id: 'living', position: new THREE.Vector3(0.15, 0.85, center(sb)[1]) },
    { id: 'loft', position: new THREE.Vector3(bx, loftHeight + 0.6, bz) },
    { id: 'stairs', position: new THREE.Vector3(lowerCenter(layout), 1.1, 0.45) },
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

function lowerCenter(layout) {
  return layout.stairs.flights[0].bottom[0];
}
