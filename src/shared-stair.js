import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
const center = r => [(r.minX + r.maxX) / 2, (r.minZ + r.maxZ) / 2];

export function addRetainedStair({ group, loft, furniture, layout, wallMaterial, baseMaterial = wallMaterial, landingMaterial = wallMaterial, staircaseName = 'retained-staircase' }) {
  const { loftHeight } = layout;
  function box(parent, w, h, d, x, y, z, material, radius = 0, name = '') {
    const geometry = radius ? new RoundedBoxGeometry(w, h, d, 2, Math.min(radius, w / 3, h / 3, d / 3)) : new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z); mesh.name = name;
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh); return mesh;
  }
  function bar(parent, a, b, radius, material) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, start.distanceTo(end), 16), material);
    mesh.position.copy(start.clone().add(end).multiplyScalar(0.5));
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize());
    mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function beam(parent, a, b, width, depth, material) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const mesh = box(parent, width, start.distanceTo(end), depth, 0, 0, 0, material, 0.002);
    mesh.position.copy(start.clone().add(end).multiplyScalar(0.5));
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize());
    return mesh;
  }
  function localGroup(name, parent = furniture) {
    const result = new THREE.Group(); result.name = name; parent.add(result); return result;
  }
  const stairSteel = new THREE.MeshStandardMaterial({ color: '#7c8582', roughness: 0.68, metalness: 0.28 });
  const hole = layout.stairs.openingRects[0];
  const land = layout.stairs.landing;
  const openingGuard = localGroup('retained-stair-opening-guard', loft);
  function steelGuard(a, b) {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length < 0.035) return;
    bar(openingGuard, [a[0], loftHeight + 0.87, a[1]], [b[0], loftHeight + 0.87, b[1]], 0.018, stairSteel).name = 'stair-opening-handrail';
    const divisions = Math.max(1, Math.ceil(length / 0.3));
    for (let i = 0; i <= divisions; i++) {
      const t = i / divisions;
      const x = THREE.MathUtils.lerp(a[0], b[0], t);
      const z = THREE.MathUtils.lerp(a[1], b[1], t);
      bar(openingGuard, [x, loftHeight + 0.018, z], [x, loftHeight + 0.87, z], 0.009, stairSteel).name = 'stair-opening-baluster';
    }
  }
  steelGuard([hole.minX, hole.minZ], [hole.maxX, hole.minZ]);
  steelGuard([hole.maxX, hole.minZ], [hole.maxX, hole.maxZ]);
  steelGuard([hole.minX, hole.minZ], [hole.minX, hole.maxZ]);
  steelGuard([land.maxX, hole.maxZ], [hole.maxX, hole.maxZ]);
  box(loft, land.maxX - land.minX, 0.009, land.maxZ - land.minZ, center(land)[0], loftHeight + 0.024, center(land)[1], landingMaterial, 0, 'stair-landing');

  const stairGroup = localGroup(staircaseName);
  stairGroup.userData = { retained: true, dimensionsEstimated: true, source: 'video' };
  const stairWall = layout.stairs.sideWall;
  const sr = stairWall.bounds;
  const [sx, sz] = center(sr);
  const stairWallMesh = box(group, sr.maxX - sr.minX, stairWall.height, sr.maxZ - sr.minZ, sx, stairWall.height / 2, sz, wallMaterial, 0, 'retained-stair-partition-wall');
  box(group, sr.maxX - sr.minX, 0.13, sr.maxZ - sr.minZ, sx, 0.065, sz, baseMaterial, 0, 'partition-base').userData.retainedStairWall = true;
  const f = layout.stairs.flights[0];
  const flight = localGroup('retained-stair-flight', stairGroup);
  const run = f.bottom[0] - f.top[0];
  const rise = (f.top[1] - f.bottom[1]) / f.steps;
  for (let i = 0; i < f.steps; i++) {
    const t = (i + 0.5) / f.steps;
    const x = THREE.MathUtils.lerp(f.bottom[0], f.top[0], t);
    const y = f.bottom[1] + (i + 1) * rise;
    const last = i === f.steps - 1;
    const exitExtension = last ? Math.max(0, hole.maxZ - f.bounds.maxZ) : 0;
    box(flight, run / f.steps + 0.009, 0.027, f.width + exitExtension, x, y - 0.0135, f.top[2] + exitExtension / 2, stairSteel, 0.003, 'stair-tread');
    box(flight, 0.013, 0.034, f.width - 0.025, x + run / f.steps / 2 - 0.007, y - 0.025, f.top[2], stairSteel, 0.002, 'stair-tread-lip');
    for (const z of [f.bounds.minZ + 0.025, f.bounds.maxZ - 0.025]) {
      box(flight, 0.044, Math.max(0.025, rise * 0.58), 0.024, x, y - 0.027 - rise * 0.29, z, stairSteel, 0.002, 'stair-tread-bracket');
    }
  }
  for (const z of [f.bounds.minZ + 0.025, f.bounds.maxZ - 0.025]) {
    beam(flight, [f.bottom[0], 0.06, z], [f.top[0], loftHeight - 0.055, z], 0.085, 0.032, stairSteel).name = 'stair-stringer';
  }
  const handrailZ = f.bounds.minZ + 0.025;
  bar(flight, [f.bottom[0], 0.78, handrailZ], [f.top[0], loftHeight + 0.8, handrailZ], 0.019, stairSteel).name = 'stair-handrail';
  const balusters = Math.max(5, Math.ceil(run / 0.28));
  for (let i = 0; i <= balusters; i++) {
    const t = i / balusters;
    const x = THREE.MathUtils.lerp(f.bottom[0], f.top[0], t);
    bar(flight, [x, Math.max(0.09, t * loftHeight), handrailZ], [x, 0.78 + t * (loftHeight + 0.02), handrailZ], 0.009, stairSteel).name = 'stair-baluster';
  }

  return { stairWall: stairWallMesh, staircase: stairGroup, openingGuard };
}
