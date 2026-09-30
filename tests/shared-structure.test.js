import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_DIMENSIONS } from '../src/dimensions.js';
import { getHouseLayout } from '../src/layout.js';
import { getModernLayout } from '../src/modern-layout.js';
import { getProposedLayout } from '../src/proposed-layout.js';
import * as THREE from 'three';
import { createHouse } from '../src/house.js';
import { createModernHouse } from '../src/modern-house.js';
import { createProposedHouse } from '../src/proposed-house.js';
import { canWalkAt } from '../src/navigation.js';

const EPS = 1e-6;
const variants = { reference: getHouseLayout, modern: getModernLayout, proposed: getProposedLayout };
const configurations = [DEFAULT_DIMENSIONS,
  ...[3.2, 5.5].flatMap(width => [9.5, 12].map(depth => ({
    width, depth, loftHeight: width === 3.2 ? 2 : 3.5, upperHeight: width === 3.2 ? 1.8 : 3.5,
  }))),
].flatMap(dimensions => [1, 2].map(occupants => ({ ...dimensions, occupants })));
const area = r => (r.maxX - r.minX) * (r.maxZ - r.minZ);
const overlap = (a, b) => Math.max(0, Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX))
  * Math.max(0, Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ));
const contains = (a, b) => b.minX >= a.minX - EPS && b.maxX <= a.maxX + EPS
  && b.minZ >= a.minZ - EPS && b.maxZ <= a.maxZ + EPS;
function verify(check) {
  for (const dimensions of configurations) for (const [name, getLayout] of Object.entries(variants)) {
    check(getLayout(dimensions), `${name} ${dimensions.width} × ${dimensions.depth}, ${dimensions.occupants} occupants`);
  }
}

test('uses identical retained stairs, side wall and shortened loft in all three live designs', () => {
  for (const dimensions of configurations) {
    const reference = getHouseLayout(dimensions);
    for (const [name, getLayout] of Object.entries(variants)) {
      const layout = getLayout(dimensions);
      assert.deepEqual(layout.stairs, reference.stairs, `${name}: staircase geometry or retention metadata diverges`);
      assert.deepEqual(layout.loft, reference.loft, `${name}: loft geometry diverges`);
      assert.deepEqual(layout.zones.loft, reference.zones.loft, `${name}: loft zone diverges`);
      assert.deepEqual(layout.zones.stairs, reference.zones.stairs, `${name}: stair zone diverges`);
    }
  }
});

test('keeps the stair anchored while reducing loft depth by one third from its front edge', () => {
  verify((l, label) => {
    assert.equal(l.stairs.retained, true, `${label}: stair is not retained`);
    assert.equal(l.stairs.source, 'video');
    assert.equal(l.stairs.dimensionsEstimated, true);
    assert.equal(l.stairs.flights.length, 1, `${label}: stair was replaced by multiple flights`);
    assert.equal(l.stairs.landings.length, 0);
    assert.deepEqual(l.stairs.openingRects, [l.stairs.opening]);
    assert.ok(Math.abs(l.loft.back - (l.stairs.opening.minZ - 0.1)) < EPS, `${label}: loft back moved off its stair anchor`);
    assert.ok(l.loft.previousDepth > l.loft.actualDepth
      && Math.abs(l.loft.actualDepth - l.loft.previousDepth * 2 / 3) < EPS, `${label}: loft depth was not shortened by one third`);
    assert.ok(Math.abs(l.loft.front - l.loft.back - l.loft.actualDepth) < EPS);
    assert.ok(Math.abs(l.loft.maxX - l.loft.minX - (l.width - 0.06)) < EPS, `${label}: shortening changed the loft width`);
    assert.equal(l.loft.height, l.loftHeight, `${label}: shortening changed the loft height`);
  });
  const measured = getHouseLayout();
  assert.ok(Math.abs(measured.loft.back + 1.81) < EPS);
  assert.ok(Math.abs(measured.loft.front - 1.896666666666667) < EPS);
  assert.ok(Math.abs(measured.loft.floorRects.reduce((sum, slab) => sum + area(slab), 0) - 12.55706666666667) < 0.001);
});

test('fully supports the transverse bed, wardrobe and unobstructed stair exit', () => {
  verify((l, label) => {
    const floor = l.loft.floorRects;
    const hole = l.stairs.opening;
    for (const [i, slab] of floor.entries()) {
      assert.ok(area(slab) > 0 && contains(l.loft, slab), `${label}: invalid slab footprint`);
      assert.ok(overlap(slab, hole) < EPS, `${label}: slab covers the retained stair opening`);
      for (const other of floor.slice(i + 1)) assert.ok(overlap(slab, other) < EPS, `${label}: duplicated floor area`);
    }
    assert.ok(Math.abs(floor.reduce((sum, slab) => sum + area(slab), 0) - area(l.loft) + area(hole)) < EPS,
      `${label}: floor has a gap outside the stair opening`);
    assert.equal(l.bed.axis, 'x');
    assert.ok(l.bed.head[0] < l.bed.foot[0] && Math.abs(l.bed.head[2] - l.bed.foot[2]) < EPS,
      `${label}: bed head is not on the left`);
    for (const [name, r] of [['landing', l.stairs.landing], ['bed', l.bed.bounds], ['wardrobe', l.wardrobe.bounds]]) {
      assert.ok(area(r) > 0 && Math.abs(floor.reduce((sum, slab) => sum + overlap(slab, r), 0) - area(r)) < EPS,
        `${label}: ${name} lacks complete floor support`);
    }
    assert.ok(overlap(l.bed.bounds, l.stairs.landing) < EPS && overlap(l.wardrobe.bounds, l.stairs.landing) < EPS,
      `${label}: furniture blocks the stair exit`);
    assert.ok(overlap(l.bed.bounds, l.wardrobe.bounds) < EPS, `${label}: bed and wardrobe intersect`);
  });
});

test('places the side wall beside the stair while leaving walking space and the upper exit clear', () => {
  verify((l, label) => {
    const wall = l.stairs.sideWall;
    assert.ok(wall && area(wall.bounds) > 0, `${label}: stair side wall is missing`);
    assert.ok(wall.bounds.minZ >= l.stairs.bounds.maxZ
      && wall.bounds.minZ - l.stairs.bounds.maxZ < 0.08, `${label}: wall is on the wrong stair side`);
    assert.ok(wall.bounds.minX <= l.stairs.bounds.minX && wall.bounds.maxX >= l.stairs.bounds.maxX,
      `${label}: wall does not span the stair run`);
    assert.ok(wall.height <= l.loftHeight && wall.height >= l.loftHeight - 0.15,
      `${label}: wall obstructs the upper walking exit or stops too low`);
    assert.ok(overlap(wall.bounds, l.stairs.bounds) < EPS, `${label}: wall intrudes into the flight`);
    const routes = l.circulation.segments ?? Object.values(l.circulation);
    for (const route of routes) if (route?.minX !== undefined) {
      assert.ok(overlap(wall.bounds, route) < EPS, `${label}: side wall crosses a circulation route`);
    }
    const eye = l.cameras.loft.position;
    assert.ok(eye[0] >= l.loft.minX && eye[0] <= l.loft.maxX && eye[2] >= l.loft.minZ && eye[2] <= l.loft.maxZ,
      `${label}: loft camera remains over the removed floor`);
    assert.ok(!(eye[0] > l.wardrobe.bounds.minX && eye[0] < l.wardrobe.bounds.maxX
      && eye[2] > l.wardrobe.bounds.minZ && eye[2] < l.wardrobe.bounds.maxZ), `${label}: loft camera is inside the wardrobe`);
  });
});

test('renders the same structural meshes and starts every interior view in walkable space', () => {
  const previousDocument = globalThis.document;
  // Texture drawing is irrelevant to the geometry and navigation checks.
  globalThis.document = { createElement: () => ({ width: 0, height: 0,
    getContext: () => new Proxy({}, { get: () => () => {} }),
  }) };
  let expectedStructure;
  try {
    for (const [variant, create] of Object.entries({ reference: createHouse, modern: createModernHouse, proposed: createProposedHouse })) {
      const house = create(DEFAULT_DIMENSIONS);
      try {
        const l = house.layout;
        house.group.updateMatrixWorld(true);
        const meshes = [];
        house.group.traverse(object => {
          if (object.isMesh) meshes.push({ name: object.name || object.parent.name,
            bounds: new THREE.Box3().setFromObject(object) });
        });
        const structuralNames = new Set(['stair-tread', 'stair-landing', 'retained-stair-partition-wall', 'loft-slab']);
        const signature = meshes.filter(mesh => structuralNames.has(mesh.name)).map(({ name, bounds }) => ({ name,
          coordinates: [...bounds.min.toArray(), ...bounds.max.toArray()].map(value => Number(value.toFixed(5))),
        })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
        assert.equal(signature.filter(mesh => mesh.name === 'stair-tread').length, l.stairs.steps);
        assert.equal(signature.filter(mesh => mesh.name === 'retained-stair-partition-wall').length, 1);
        if (expectedStructure) assert.deepEqual(signature, expectedStructure, `${variant}: rendered structure differs`);
        else expectedStructure = signature;
        for (const [zone, { position }] of Object.entries(l.cameras)) {
          const [x, y, z] = position;
          const floorHeight = zone === 'loft' ? l.loftHeight : 0;
          const floors = zone === 'loft' ? l.loft.floorRects
            : [{ minX: l.left, maxX: l.right, minZ: l.rear, maxZ: l.front }];
          const obstacles = meshes.filter(({ bounds }) => bounds.max.y > floorHeight + 0.12 && bounds.min.y < y + 0.12)
            .map(({ bounds }) => ({ minX: bounds.min.x, maxX: bounds.max.x, minZ: bounds.min.z, maxZ: bounds.max.z }));
          assert.ok(canWalkAt({ x, z }, { floors, obstacles }), `${variant}: ${zone} view starts inside an obstacle or outside the walkable floor`);
        }
      } finally {
        house.dispose();
      }
    }
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});
