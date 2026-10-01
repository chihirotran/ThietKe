import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { getTownhouseLayout } from './townhouse-layout.js';
import { addLaundryAppliances } from './laundry-fixtures.js';

const center = r => [(r.minX + r.maxX) / 2, (r.minZ + r.maxZ) / 2];

export function createTownhouseHouse(options = {}) {
  const layout = getTownhouseLayout(options);
  const group = new THREE.Group(); group.name = 'townhouse-five-storeys';
  const materials = {};
  const material = (name, color, extra = {}) => (materials[name] = new THREE.MeshStandardMaterial({ color, roughness: 0.72, ...extra }));
  const plaster = material('wall', '#eceae2');
  const stone = material('stone', '#d6d2c8');
  const oak = material('wood', '#b89167');
  const oakDark = material('woodDark', '#765a42');
  const cream = material('cream', '#f4f1e9');
  const graphite = material('graphite', '#353b38', { roughness: 0.44 });
  const sage = material('sage', '#899887');
  const textile = material('textile', '#cec5b6', { roughness: 1 });
  const white = material('white', '#f9f9f4');
  const steel = material('steel', '#aab0ac', { metalness: 0.7, roughness: 0.28 });
  const foliage = material('foliage', '#55715a');
  const water = material('water', '#537f88', { metalness: 0.14, roughness: 0.12 });
  const screen = material('screen', '#34565b', { emissive: '#294348', emissiveIntensity: 0.2 });
  const glow = material('glow', '#ffedcc', { emissive: '#ffd89a', emissiveIntensity: 0.55 });
  const glass = new THREE.MeshPhysicalMaterial({ color: '#d7e7df', roughness: 0.08, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
  materials.glass = glass;
  const { inner, left, right, front, rear } = layout;
  const decor = object => { object.userData.walkThrough = true; return object; };
  function addGroup(parent, name) { const result = new THREE.Group(); result.name = name; parent.add(result); return result; }
  function box(parent, w, h, d, x, y, z, mat = oak, name = '', radius = 0) {
    const geometry = radius ? new RoundedBoxGeometry(w, h, d, 2, Math.min(radius, w / 3, h / 3, d / 3)) : new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geometry, mat); mesh.position.set(x, y, z); mesh.name = name;
    mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function cylinder(parent, radius, h, x, y, z, mat = graphite, sides = 20) {
    const result = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, h, sides), mat);
    result.position.set(x, y, z); result.castShadow = result.receiveShadow = true; parent.add(result); return result;
  }
  function bar(parent, a, b, radius = 0.018, mat = graphite) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const mesh = cylinder(parent, radius, start.distanceTo(end), 0, 0, 0, mat, 10);
    mesh.position.copy(start.clone().add(end).multiplyScalar(0.5));
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize()); return mesh;
  }
  function slab(parent, r, y, thickness, mat, name = '') { return box(parent, r.maxX - r.minX, thickness, r.maxZ - r.minZ, ...[center(r)[0], y, center(r)[1]], mat, name); }
  function wall(parent, x1, z1, x2, z2, h = 2.98, mat = plaster, name = '') {
    const mesh = box(parent, Math.hypot(x2 - x1, z2 - z1), h, 0.1, (x1 + x2) / 2, h / 2, (z1 + z2) / 2, mat, name);
    mesh.rotation.y = -Math.atan2(z2 - z1, x2 - x1); return mesh;
  }
  function doorway(parent, a, b, fixed, doorCenter, width = 0.8, axis = 'x', mat = plaster, name = 'doorway') {
    const y = 2.15;
    if (axis === 'x') {
      if (doorCenter - width / 2 > a) wall(parent, a, fixed, doorCenter - width / 2, fixed, 2.98, mat, name);
      if (b > doorCenter + width / 2) wall(parent, doorCenter + width / 2, fixed, b, fixed, 2.98, mat, name);
      box(parent, width, 2.98 - y, 0.1, doorCenter, (2.98 + y) / 2, fixed, mat, name);
      for (const x of [doorCenter - width / 2, doorCenter + width / 2]) box(parent, 0.035, y, 0.13, x, y / 2, fixed, oak, 'door-jamb');
      box(parent, width + 0.08, 0.035, 0.13, doorCenter, y, fixed, oak, 'door-head');
    } else {
      if (doorCenter - width / 2 > a) wall(parent, fixed, a, fixed, doorCenter - width / 2, 2.98, mat, name);
      if (b > doorCenter + width / 2) wall(parent, fixed, doorCenter + width / 2, fixed, b, 2.98, mat, name);
      box(parent, 0.1, 2.98 - y, width, fixed, (2.98 + y) / 2, doorCenter, mat, name);
      for (const z of [doorCenter - width / 2, doorCenter + width / 2]) box(parent, 0.13, y, 0.035, fixed, y / 2, z, oak, 'door-jamb');
    }
  }
  function plant(parent, x, z, size = 0.45, y = 0) {
    const pot = addGroup(parent, 'plant'); decor(pot);
    cylinder(pot, size * 0.25, size * 0.5, x, y + size * 0.25, z, cream);
    for (let i = 0; i < 7; i++) {
      const angle = i * 2.399;
      const tip = [x + Math.sin(angle) * size * 0.35, y + size * (0.9 + i % 3 * 0.13), z + Math.cos(angle) * size * 0.3];
      decor(bar(pot, [x, y + size * 0.25, z], tip, 0.008, foliage));
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(size * 0.22, 10, 7), foliage);
      leaf.position.set(...tip); leaf.scale.set(0.45, 1, 0.8); leaf.rotation.z = Math.sin(angle) * 0.7; pot.add(leaf); decor(leaf);
    }
  }
  function rail(parent, a, b, base = 0, h = 1.05, mat = glass) {
    const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
    const panel = box(parent, length, h - 0.12, 0.023, (a[0] + b[0]) / 2, base + h / 2, (a[1] + b[1]) / 2, mat, 'guard-glass'); panel.rotation.y = -Math.atan2(dz, dx);
    bar(parent, [a[0], base + h, a[1]], [b[0], base + h, b[1]], 0.016, graphite);
    for (const p of [a, b]) bar(parent, [p[0], base + 0.03, p[1]], [p[0], base + h, p[1]], 0.016, graphite);
  }
  function chair(parent, x, z, rotation = 0, cushion = textile) {
    const item = addGroup(parent, 'chair'); item.position.set(x, 0, z); item.rotation.y = rotation;
    box(item, 0.46, 0.11, 0.44, 0, 0.46, 0, cushion, '', 0.045);
    box(item, 0.46, 0.38, 0.075, 0, 0.72, -0.2, cushion, '', 0.035);
    for (const dx of [-0.17, 0.17]) for (const dz of [-0.16, 0.16]) box(item, 0.035, 0.42, 0.035, dx, 0.22, dz, oak);
    return item;
  }
  function wardrobe(parent, r, h = 2.6, facing = '+z') {
    const item = addGroup(parent, 'wardrobe');
    slab(item, r, h / 2, h, oak, 'wardrobe-body');
    const c = center(r), width = r.maxX - r.minX;
    if (facing === '+z') {
      for (let i = 0; i < Math.max(2, Math.ceil(width / 0.5)); i++) {
        const count = Math.max(2, Math.ceil(width / 0.5)), x = r.minX + width * (i + 0.5) / count;
        box(item, width / count - 0.009, h - 0.09, 0.018, x, h / 2 + 0.02, r.maxZ + 0.01, i % 3 ? oak : cream, 'wardrobe-front');
        box(item, 0.012, 0.24, 0.024, x + width / count / 2 - 0.06, 1.2, r.maxZ + 0.03, graphite);
      }
    } else {
      const depth = r.maxZ - r.minZ;
      for (let i = 0; i < Math.ceil(depth / 0.48); i++) {
        const count = Math.ceil(depth / 0.48), z = r.minZ + depth * (i + 0.5) / count;
        box(item, 0.018, h - 0.09, depth / count - 0.009, facing === '-x' ? r.minX - 0.01 : r.maxX + 0.01, h / 2 + 0.02, z, i % 2 ? oak : cream, 'wardrobe-front');
      }
    }
    return item;
  }
  function bed(parent, spec, hue = sage) {
    const r = spec.bed, item = addGroup(parent, spec.id + '-bed');
    item.userData.bed = true; item.userData.bounds = r;
    slab(item, r, 0.17, 0.26, oakDark, 'bed-frame');
    slab(item, { minX: r.minX + 0.035, maxX: r.maxX - 0.035, minZ: r.minZ + 0.035, maxZ: r.maxZ - 0.035 }, 0.39, 0.22, cream, 'mattress');
    const c = center(r), w = r.maxX - r.minX, d = r.maxZ - r.minZ;
    if (spec.axis === 'x') {
      box(item, 0.09, 0.97, d + 0.07, r.minX - 0.04, 0.48, c[1], hue, 'headboard', 0.035);
      box(item, w * 0.61, 0.045, d - 0.025, r.maxX - w * 0.31, 0.525, c[1], hue, 'duvet', 0.025);
      for (const z of [c[1] - d * 0.23, c[1] + d * 0.23]) box(item, 0.45, 0.11, d * 0.41, r.minX + 0.32, 0.57, z, white, 'pillow', 0.055);
    } else {
      box(item, w + 0.08, 1.04, 0.1, c[0], 0.52, r.maxZ + 0.035, hue, 'headboard', 0.035);
      box(item, w - 0.025, 0.045, d * 0.61, c[0], 0.525, r.minZ + d * 0.31, hue, 'duvet', 0.025);
      for (const x of [c[0] - w * 0.23, c[0] + w * 0.23]) box(item, w * 0.41, 0.11, 0.45, x, 0.57, r.maxZ - 0.31, white, 'pillow', 0.055);
    }
    return item;
  }
  function desk(parent, x, z, length = 1.4) {
    const item = addGroup(parent, 'work-desk');
    box(item, 0.58, 0.055, length, x, 0.75, z, oak, 'desktop', 0.015);
    for (const dz of [-length / 2 + 0.08, length / 2 - 0.08]) box(item, 0.52, 0.72, 0.035, x, 0.36, z + dz, graphite);
    box(item, 0.035, 0.4, 0.63, x - 0.1, 1.06, z, graphite, 'monitor-frame', 0.01);
    decor(box(item, 0.006, 0.35, 0.58, x - 0.079, 1.06, z, screen, 'monitor'));
    box(item, 0.24, 0.012, 0.36, x + 0.15, 0.791, z, graphite, 'keyboard');
    chair(item, x + 0.55, z, -Math.PI / 2, sage);
  }
  function sink(parent, x, z, w = 0.6) {
    box(parent, w, 0.03, 0.44, x, 0.916, z, steel, 'sink-rim', 0.04);
    box(parent, w - 0.09, 0.032, 0.35, x, 0.926, z, graphite, 'sink-bowl', 0.04);
    decor(bar(parent, [x, 0.91, z - 0.22], [x, 1.2, z - 0.22], 0.017, graphite));
    decor(bar(parent, [x, 1.2, z - 0.22], [x, 1.2, z - 0.06], 0.017, graphite));
  }
  function bathroomFixture(parent) {
    const r = layout.bathroom.bounds, c = center(r), bath = addGroup(parent, 'bathroom-fixtures');
    slab(bath, r, 0.015, 0.025, stone, 'bathroom-tile');
    box(bath, 0.78, 0.045, 0.76, c[0], 0.04, r.minZ + 0.4, white, 'shower-tray', 0.015);
    box(bath, 0.68, 1.9, 0.014, r.minX + 0.39, 1.02, r.minZ + 0.8, glass, 'shower-screen');
    bar(bath, [r.minX + 0.12, 0.9, r.minZ + 0.1], [r.minX + 0.12, 2.05, r.minZ + 0.1], 0.016, steel);
    decor(cylinder(bath, 0.105, 0.024, r.minX + 0.25, 2.05, r.minZ + 0.16, steel));
    box(bath, 0.37, 0.4, 0.52, r.minX + 0.25, 0.25, r.maxZ - 0.49, white, 'toilet-base', 0.065);
    box(bath, 0.38, 0.05, 0.5, r.minX + 0.25, 0.47, r.maxZ - 0.49, white, 'toilet-seat', 0.08);
    box(bath, 0.39, 0.42, 0.13, r.minX + 0.25, 0.61, r.maxZ - 0.79, white, 'toilet-cistern', 0.03);
    box(bath, 0.25, 0.54, 0.29, r.maxX - 0.17, 0.53, r.maxZ - 0.24, oak, 'vanity');
    box(bath, 0.27, 0.075, 0.31, r.maxX - 0.17, 0.835, r.maxZ - 0.24, white, 'basin', 0.035);
    decor(box(bath, 0.013, 0.65, 0.39, r.maxX - 0.035, 1.43, r.maxZ - 0.35, steel, 'mirror'));
  }
  function stairAssembly(parent, floor) {
    const item = addGroup(parent, 'u-staircase');
    if (floor.index < 4) {
      layout.stairs.flights.forEach((flight, index) => {
        const run = (flight.bounds.maxX - flight.bounds.minX) / flight.steps;
        for (let i = 0; i < flight.steps; i++) {
          const x = index ? flight.bounds.minX + run * (i + 0.5) : flight.bounds.maxX - run * (i + 0.5);
          const y = (index * flight.steps + i + 1) * layout.stairs.rise;
          decor(box(item, run + 0.015, 0.08, 0.85, x, y - 0.04, center(flight.bounds)[1], oak, 'townhouse-stair-tread'));
          decor(box(item, 0.035, layout.stairs.rise, 0.84, index ? x - run / 2 : x + run / 2, y - layout.stairs.rise / 2, center(flight.bounds)[1], cream, 'townhouse-stair-riser'));
        }
        for (const z of [flight.bounds.minZ + 0.045, flight.bounds.maxZ - 0.045]) {
          decor(bar(item, [flight.bottom[0], flight.bottom[1] + 0.03, z], [flight.top[0], flight.top[1] - 0.05, z], 0.045, graphite));
          bar(item, [flight.bottom[0], flight.bottom[1] + 0.95, z], [flight.top[0], flight.top[1] + 0.95, z], 0.018, graphite);
          for (let i = 0; i < 5; i++) {
            const t = i / 4, x = THREE.MathUtils.lerp(flight.bottom[0], flight.top[0], t), y = THREE.MathUtils.lerp(flight.bottom[1], flight.top[1], t);
            bar(item, [x, y + 0.05, z], [x, y + 0.95, z], 0.014, graphite);
          }
        }
      });
      decor(slab(item, layout.stairs.landing, 1.55, 0.1, oak, 'stair-intermediate-landing'));
      rail(item, [inner.minX + 0.08, -5.28], [inner.minX + 0.08, -3.47], 1.6, 0.95);
    }
    if (floor.index > 0) rail(item, [inner.minX + 0.03, -3.38], [0.91, -3.38]);
    return item;
  }

  const floors = layout.floors.map(floor => {
    const root = addGroup(group, `floor-${floor.index}`); root.position.y = floor.elevation;
    const walls = addGroup(root, 'walls'), furniture = addGroup(root, 'furniture'), slabs = addGroup(root, 'floor-slabs'), ceiling = addGroup(root, 'ceiling');
    const wallFaces = {};
    for (const name of ['left', 'right', 'front', 'rear']) wallFaces[name] = addGroup(walls, `${name}-wall`);
    const partitions = addGroup(walls, 'partitions');
    for (const r of floor.floorRects) slab(slabs, r, -0.1, 0.2, floor.index === 4 ? stone : floor.index > 1 ? oak : cream, 'floor-slab');
    for (const r of floor.floorRects) {
      const endZ = floor.index === 4 ? Math.min(r.maxZ, 1.9) : r.maxZ;
      if (endZ > r.minZ) slab(ceiling, { ...r, maxZ: endZ }, 3.1, 0.16, cream, 'ceiling-panel');
    }
    const sideHeight = floor.index === 4 ? 1.1 : 3.1;
    box(wallFaces.left, 0.15, sideHeight, layout.depth, left + 0.075, sideHeight / 2, 0, plaster, 'left-party-wall');
    box(wallFaces.right, 0.15, sideHeight, layout.depth, right - 0.075, sideHeight / 2, 0, plaster, 'right-party-wall');
    if (floor.index === 4) {
      box(wallFaces.left, 0.15, 2.0, 7.4, left + 0.075, 2.1, -1.8, plaster);
      box(wallFaces.right, 0.15, 2.0, 7.4, right - 0.075, 2.1, -1.8, plaster);
    }
    box(wallFaces.rear, layout.width, 3.1, 0.15, 0, 1.55, rear + 0.075, plaster, 'rear-party-wall');
    if (floor.index === 0) {
      doorway(wallFaces.front, inner.minX, inner.maxX, front - 0.075, 1.22, 1.02, 'x', graphite, 'entry-facade');
      decor(box(wallFaces.front, 2.15, 2.12, 0.018, -0.53, 1.14, front - 0.015, oakDark, 'garage-timber-panel'));
      for (let i = 0; i < 18; i++) decor(box(wallFaces.front, 0.026, 2.11, 0.045, -1.55 + i * 0.12, 1.14, front + 0.018, oak, 'entry-slat'));
      decor(box(wallFaces.front, 0.42, 0.05, 0.28, 1.27, 2.55, front - 0.25, glow, 'entry-light'));
    } else if (floor.index < 4) {
      const balcony = addGroup(wallFaces.front, 'front-balcony');
      rail(balcony, [inner.minX + 0.06, front - 0.08], [inner.maxX - 0.06, front - 0.08]);
      for (const x of [inner.minX + 0.06, inner.maxX - 0.06]) box(balcony, 0.08, 3.1, 0.1, x, 1.55, 4.88, graphite, 'window-post');
      for (const y of [0.04, 2.45]) box(balcony, inner.maxX - inner.minX, 0.07, 0.1, 0, y, 4.88, graphite, 'window-frame');
      box(balcony, 1.35, 2.4, 0.02, inner.minX + 0.73, 1.25, 4.88, glass, 'front-glass');
      box(balcony, 0.06, 2.46, 0.08, -0.36, 1.23, 4.88, graphite, 'window-mullion');
      box(balcony, 0.78, 2.4, 0.02, inner.maxX - 0.42, 1.25, 4.88, glass, 'front-glass');
      box(balcony, inner.maxX - inner.minX, 0.63, 0.13, 0, 2.78, 4.88, plaster, 'front-lintel');
      box(balcony, floor.index === 2 ? 0.8 : 1.35, 0.32, 0.36, floor.index === 2 ? 1.23 : -1.06, 0.19, 5.12, stone, 'balcony-planter');
      for (let i = 0; i < 3; i++) plant(balcony, (floor.index === 2 ? 1 : -1.5) + i * 0.23, 5.12, 0.28, 0.3);
      if (floor.index === 2) for (let i = 0; i < 7; i++) box(balcony, 0.045, 2.5, 0.085, -1.71 + i * 0.115, 1.7, 5.31, oak, 'facade-screen');
    } else rail(wallFaces.front, [inner.minX + 0.06, front - 0.08], [inner.maxX - 0.06, front - 0.08], 0, 1.1, glass);

    const lift = addGroup(partitions, 'elevator-shaft');
    const er = layout.elevator.bounds;
    wall(lift, er.minX, er.minZ, er.maxX, er.minZ, 3.1, stone);
    wall(lift, er.maxX, er.minZ, er.maxX, er.maxZ, 3.1, stone);
    doorway(lift, er.minX, er.maxX, er.maxZ, layout.elevator.door.x, 0.82, 'x', stone, 'elevator-front');
    box(lift, 0.8, 2.05, 0.03, layout.elevator.door.x, 1.025, er.maxZ - 0.055, steel, 'elevator-doors');
    box(lift, 0.011, 2.05, 0.012, layout.elevator.door.x, 1.025, er.maxZ - 0.032, graphite, 'elevator-seam');
    decor(box(lift, 0.075, 0.19, 0.015, er.maxX - 0.12, 1.12, er.maxZ + 0.055, graphite, 'elevator-call-panel'));
    decor(box(lift, 0.23, 0.13, 0.014, layout.elevator.door.x, 2.27, er.maxZ + 0.054, glow, 'elevator-level-display'));
    const br = layout.bathroom.bounds;
    wall(partitions, br.minX, br.minZ, br.minX, br.maxZ, 2.98, plaster);
    wall(partitions, br.maxX, br.minZ, br.maxX, br.maxZ, 2.98, plaster);
    wall(partitions, br.minX, br.minZ, br.maxX, br.minZ, 2.98, plaster);
    doorway(partitions, br.minX, br.maxX, br.maxZ, 0.36, 0.72);
    bathroomFixture(furniture);
    const lr = layout.lightwell.bounds;
    const well = addGroup(partitions, 'lightwell-enclosure');
    wall(well, lr.minX, lr.minZ, lr.maxX, lr.minZ, 0.95, stone);
    wall(well, lr.maxX, lr.minZ, lr.maxX, lr.maxZ, 0.95, stone);
    wall(well, lr.minX, lr.maxZ, lr.maxX, lr.maxZ, 0.95, stone);
    box(well, 0.025, 1.86, 1, lr.maxX, 1.97, center(lr)[1], glass, 'lightwell-window');
    box(well, 0.85, 1.86, 0.025, center(lr)[0], 1.97, lr.maxZ, glass, 'lightwell-window');
    if (floor.index === 0) { slab(furniture, lr, 0.025, 0.05, stone, 'lightwell-garden'); plant(furniture, -1.43, -0.3, 0.65); }
    for (const x of [lr.minX + 0.04, lr.maxX]) decor(box(well, 0.035, 3, 0.035, x, 1.5, lr.maxZ, graphite));

    const stairs = stairAssembly(root, floor);
    for (const bedroom of floor.bedrooms) bed(furniture, bedroom, floor.index === 3 ? textile : sage);
    if (floor.index === 0) {
      doorway(partitions, inner.minX, 0.8, 2.55, 0.34, 0.82);
      wall(partitions, 0.8, 0.4, 0.8, 2.55);
      wall(partitions, inner.minX, 0.4, 0.8, 0.4);
      wardrobe(furniture, { minX: -1.7, maxX: -0.4, minZ: 0.44, maxZ: 0.85 }, 2.35);
      box(furniture, 0.39, 0.5, 1.6, inner.minX + 0.24, 0.25, 3.95, oak, 'entry-bench', 0.025);
      for (let i = 0; i < 6; i++) decor(box(furniture, 0.05, 1.9, 0.045, inner.minX + 0.05, 1.4, 3.3 + i * 0.23, oak, 'entry-panel'));
      for (const z of [3.25, 4.4]) {
        const bike = addGroup(furniture, 'parked-scooter'); bike.position.set(-0.65, 0, z); bike.rotation.y = Math.PI / 2;
        for (const wheelZ of [-0.54, 0.54]) { const wheel = cylinder(bike, 0.235, 0.12, 0, 0.24, wheelZ, graphite); wheel.rotation.z = Math.PI / 2; }
        box(bike, 0.39, 0.32, 0.9, 0, 0.45, -0.02, sage, 'scooter-body', 0.09);
        box(bike, 0.33, 0.09, 0.55, 0, 0.65, -0.15, graphite, 'scooter-seat', 0.035);
        bar(bike, [0, 0.32, 0.5], [0, 0.98, 0.43], 0.025, graphite);
        bar(bike, [-0.22, 0.98, 0.43], [0.22, 0.98, 0.43], 0.02, graphite);
      }
      plant(furniture, 1.5, 2.85, 0.48);
    }
    if (floor.index === 1) {
      const sofa = addGroup(furniture, 'living-sofa');
      box(sofa, 0.83, 0.27, 2.16, -1.24, 0.27, 3.54, textile, 'sofa-base', 0.06);
      box(sofa, 0.13, 0.67, 2.16, -1.62, 0.52, 3.54, textile, 'sofa-back', 0.04);
      for (const z of [2.81, 3.54, 4.27]) box(sofa, 0.7, 0.14, 0.67, -1.2, 0.48, z, cream, 'sofa-cushion', 0.06);
      for (const z of [2.47, 4.61]) box(sofa, 0.83, 0.22, 0.12, -1.24, 0.55, z, textile, 'sofa-arm', 0.035);
      decor(box(furniture, 1.6, 0.018, 2.25, -0.24, 0.018, 3.51, cream, 'living-rug', 0.06));
      cylinder(furniture, 0.39, 0.065, -0.07, 0.4, 3.43, oak);
      cylinder(furniture, 0.19, 0.36, -0.07, 0.19, 3.43, oakDark);
      box(furniture, 0.33, 0.32, 1.75, 1.59, 0.24, 3.48, oak, 'tv-console', 0.025);
      box(furniture, 0.04, 0.8, 1.42, 1.76, 1.18, 3.48, graphite, 'television', 0.012);
      decor(box(furniture, 0.01, 0.73, 1.33, 1.732, 1.18, 3.48, screen, 'television-screen'));
      plant(furniture, 1.5, 4.62, 0.55);
      box(furniture, 1.22, 0.055, 0.74, -0.5, 0.76, 1.44, oak, 'dining-table', 0.035);
      for (const x of [-0.96, -0.04]) for (const z of [1.18, 1.7]) box(furniture, 0.05, 0.74, 0.05, x, 0.37, z, oak);
      for (const x of [-0.9, -0.15]) { chair(furniture, x, 0.89, Math.PI, sage); chair(furniture, x, 1.99, 0, sage); }
      chair(furniture, -1.34, 1.44, Math.PI / 2, sage);
      chair(furniture, 0.34, 1.44, -Math.PI / 2, sage);
      const kitchen = addGroup(furniture, 'kitchen');
      box(kitchen, 1.61, 0.81, 0.58, -0.08, 0.445, -0.35, oak, 'kitchen-base');
      box(kitchen, 1.67, 0.045, 0.62, -0.08, 0.874, -0.35, stone, 'kitchen-counter', 0.008);
      wall(partitions, -0.93, -0.7, 0.75, -0.7, 1.44, stone, 'kitchen-backsplash');
      box(kitchen, 0.53, 0.027, 0.52, -0.515, 0.91, -0.34, graphite, 'kitchen-hob');
      for (const x of [-0.65, -0.38]) for (const z of [-0.49, -0.22]) decor(cylinder(kitchen, 0.078, 0.006, x, 0.926, z, steel));
      sink(kitchen, 0.32, -0.34, 0.51);
      box(kitchen, 0.65, 0.09, 0.44, -0.51, 1.78, -0.41, graphite, 'extractor-hood');
      box(kitchen, 0.23, 1.1, 0.22, -0.51, 2.34, -0.55, steel, 'hood-duct');
      box(kitchen, 0.66, 1.9, 0.67, -1.43, 0.97, 0.73, steel, 'fridge', 0.025);
      box(kitchen, 0.68, 0.013, 0.013, -1.43, 1.24, 1.07, graphite, 'fridge-door-seam');
      for (const z of [1.22, 1.67]) { decor(bar(furniture, [-0.5, 2.95, z], [-0.5, 2.03, z], 0.01, graphite)); decor(cylinder(furniture, 0.16, 0.1, -0.5, 1.98, z, glow)); }
    }
    if (floor.index === 2) {
      doorway(partitions, inner.minX, inner.maxX, 1.5, 1.28, 0.9);
      wardrobe(furniture, { minX: -1.72, maxX: -1.12, minZ: 0.4, maxZ: 1.4 }, 2.65, '+x');
      wardrobe(furniture, { minX: -0.78, maxX: 0.69, minZ: -0.7, maxZ: -0.12 }, 2.65);
      desk(furniture, -0.58, 0.76, 1.14);
      for (const x of [-1.57, 0.59]) {
        cylinder(furniture, 0.21, 0.43, x, 0.23, 3.96, oak);
        decor(cylinder(furniture, 0.11, 0.2, x, 0.59, 3.96, glow));
      }
      wardrobe(furniture, { minX: 1.21, maxX: 1.74, minZ: 2.7, maxZ: 4.5 }, 2.65, '-x');
      decor(box(furniture, 2.2, 0.017, 2.5, -0.36, 0.021, 3.16, textile, 'bedroom-rug'));
    }
    if (floor.index === 3) {
      doorway(partitions, inner.minX, inner.maxX, 2.45, 1.28, 0.9);
      doorway(partitions, -0.7, 2.4, 0.8, -0.1, 0.85, 'z');
      wall(partitions, -0.94, -0.7, 0.8, -0.7);
      wardrobe(furniture, { minX: -0.8, maxX: 0.64, minZ: -0.67, maxZ: -0.16 }, 2.5);
      box(furniture, 1.05, 0.035, 0.23, -0.86, 1.55, 2.52, oak, 'bedroom-book-shelf');
      wardrobe(furniture, { minX: 1.27, maxX: 1.73, minZ: 3.15, maxZ: 4.52 }, 2.5, '-x');
      decor(box(furniture, 0.015, 0.6, 0.65, -1.749, 1.6, 3.15, oakDark, 'bedroom-art'));
    }
    if (floor.index === 4) {
      doorway(partitions, inner.minX, inner.maxX, 1.95, 0.9, 0.94);
      box(furniture, 0.52, 0.78, 1.35, -1.5, 0.39, 1.09, oak, 'quiet-room-console');
      decor(box(furniture, 0.026, 0.67, 0.75, -1.75, 1.56, 1.09, oakDark, 'quiet-room-art'));
      plant(furniture, -1.5, 0.46, 0.35, 0.8);
      addLaundryAppliances(furniture, {
        washer: { bounds: { minX: 0.03, maxX: 0.63, minZ: -0.58, maxZ: 0.04 }, type: 'top-loading', rotationY: 0 },
        dryer: { bounds: { minX: 0.67, maxX: 1.27, minZ: -0.58, maxZ: 0.04 }, type: 'front-loading', rotationY: 0 },
        waterPurifier: { bounds: { minX: 1.34, maxX: 1.67, minZ: -0.46, maxZ: 0.04 }, type: 'water-purifier', rotationY: 0 },
      });
      box(furniture, 0.63, 0.81, 0.55, 1.42, 0.445, 1.13, oak, 'laundry-sink-cabinet'); sink(furniture, 1.42, 1.13, 0.55);
      box(furniture, 0.63, 0.045, 0.58, 1.42, 0.883, 1.13, stone, 'laundry-counter');
      const garden = addGroup(furniture, 'roof-garden');
      for (const x of [-1.55, 1.55]) {
        box(garden, 0.42, 0.46, 2.48, x, 0.24, 3.83, stone, 'terrace-planter');
        for (let i = 0; i < 5; i++) plant(garden, x, 2.85 + i * 0.46, 0.43, 0.48);
      }
      box(garden, 1.27, 0.055, 0.74, -0.03, 0.72, 3.76, oak, 'terrace-table', 0.025);
      for (const x of [-0.48, 0.42]) for (const z of [3.53, 3.99]) box(garden, 0.035, 0.7, 0.035, x, 0.35, z, graphite);
      chair(garden, -0.82, 3.76, Math.PI / 2, cream); chair(garden, 0.78, 3.76, -Math.PI / 2, cream);
      for (const x of [-1.15, 1.15]) for (const z of [2.48, 4.74]) box(garden, 0.065, 2.63, 0.065, x, 1.315, z, graphite, 'pergola-post');
      for (let i = 0; i < 9; i++) box(garden, 2.5, 0.085, 0.06, 0, 2.63, 2.42 + i * 0.3, oak, 'pergola-batten');
      for (const x of [-1.15, 1.15]) box(garden, 0.07, 0.085, 2.62, x, 2.57, 3.63, graphite, 'pergola-beam');
    }
    for (const z of [-1.02, 1.1, 3.1]) {
      if (floor.index === 4 && z > 1.8) continue;
      decor(cylinder(furniture, 0.06, 0.022, 1.25, 2.98, z, glow));
    }
    return { index: floor.index, elevation: floor.elevation, height: floor.height, group: root, walls, wallFaces, partitions, furniture, slab: slabs, slabs, ceiling, stairs };
  });
  const roof = addGroup(group, 'roof');
  const roofRects = layout.floors[4].floorRects.filter(r => r.minZ < 1.9).map(r => ({ ...r, maxZ: Math.min(r.maxZ, 1.9) }));
  for (const r of roofRects) slab(roof, r, layout.totalHeight, 0.16, stone, 'roof-slab');
  slab(roof, layout.elevator.bounds, layout.totalHeight, 0.16, stone, 'elevator-roof');
  const stairSky = box(roof, 2.76, 0.04, 1.95, -0.425, layout.totalHeight + 0.02, -4.375, glass, 'stairwell-skylight'); decor(stairSky);
  for (const x of [-1.78, -0.42, 0.94]) box(roof, 0.035, 0.08, 1.95, x, layout.totalHeight + 0.045, -4.375, graphite, 'skylight-frame');
  const apron = addGroup(group, 'entry-threshold');
  box(apron, layout.width, 0.12, 0.46, 0, -0.12, front + 0.2, stone, 'entry-step');
  function setPalette(palette = 'oak') { oak.color.set(palette === 'walnut' ? '#83654f' : '#b89167'); }
  function setWarmLight(value) { glow.emissiveIntensity = value ? 0.55 : 0.12; }
  function dispose() {
    const geometries = new Set(), mats = new Set();
    group.traverse(object => { if (object.geometry) geometries.add(object.geometry); if (object.material) for (const mat of Array.isArray(object.material) ? object.material : [object.material]) mats.add(mat); });
    for (const geometry of geometries) geometry.dispose();
    for (const mat of mats) mat.dispose();
  }
  setPalette(options.palette); setWarmLight(options.warmLight !== false);
  return { group, layout, floors, roof, materials, setPalette, setWarmLight, dispose };
}
