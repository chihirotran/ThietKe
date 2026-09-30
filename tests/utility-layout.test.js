import test from 'node:test';
import assert from 'node:assert/strict';
import { Box3, Vector3 } from 'three';
import { DEFAULT_DIMENSIONS } from '../src/dimensions.js';
import { getHouseLayout } from '../src/layout.js';
import { getModernLayout } from '../src/modern-layout.js';
import { getProposedLayout } from '../src/proposed-layout.js';
import { getSharedStructure } from '../src/shared-structure.js';
import { createHouse } from '../src/house.js';
import { createModernHouse } from '../src/modern-house.js';
import { createProposedHouse } from '../src/proposed-house.js';
import { createWalkingWorld } from '../src/walking-world.js';
import { canWalkAt } from '../src/navigation.js';

const configurations = [DEFAULT_DIMENSIONS,
  { width: 3.2, depth: 9.5, loftHeight: 2, upperHeight: 1.8 },
  { width: 5.5, depth: 12, loftHeight: 3.5, upperHeight: 3.5 },
];
const rect = (minX, maxX, minZ, maxZ) => ({ minX, maxX, minZ, maxZ });
const overlap = (a, b) => Math.max(0, Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX))
  * Math.max(0, Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ));
const contains = (a, b) => b.minX >= a.minX - 1e-6 && b.maxX <= a.maxX + 1e-6
  && b.minZ >= a.minZ - 1e-6 && b.maxZ <= a.maxZ + 1e-6;
const footprint = b => rect(b.min.x, b.max.x, b.min.z, b.max.z);

function withCanvas(check) {
  const previousDocument = globalThis.document;
  globalThis.document = { createElement: () => ({ width: 0, height: 0,
    getContext: () => new Proxy({}, { get: () => () => {} }),
  }) };
  try { check(); } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
}

test('places reference washer and dryer against the window wall between the rear doors', () => {
  const layout = getHouseLayout();
  const window = layout.utilityWindow;
  assert.ok(window, 'utility window metadata is missing');
  assert.ok(window.minX >= layout.doors.bathroom.x + layout.doors.bathroom.width / 2);
  assert.ok(window.maxX <= layout.doors.kitchen.x - layout.doors.kitchen.width / 2);
  assert.ok(window.headHeight > window.sillHeight && window.sillHeight > layout.fixtures.washer.height);
  for (const key of ['washer', 'dryer']) {
    const appliance = layout.fixtures[key];
    assert.equal(appliance.rotationY, 0, `${key}: appliance does not face the utility room`);
    assert.ok(appliance.bounds.minZ >= window.z && appliance.bounds.minZ - window.z <= 0.1,
      `${key}: back is detached from the window wall`);
  }
  const { washer, dryer } = layout.fixtures;
  const washerCenter = (washer.bounds.minX + washer.bounds.maxX) / 2;
  assert.ok(washerCenter >= window.minX && washerCenter <= window.maxX, 'washer is outside window span');
  assert.ok(dryer.bounds.minX >= washer.bounds.maxX && dryer.bounds.minX - washer.bounds.maxX < 0.15,
    'dryer is detached from the washer beside the window');
});

test('keeps the reference utility sink and laundry clear of rear doorways and retained stairs', () => {
  for (const options of configurations) {
    const layout = getHouseLayout(options), label = `${layout.width} × ${layout.depth}`;
    assert.ok(layout.utilitySink, `${label}: utility sink is missing`);
    assert.equal(layout.utilitySink.rotationY, Math.PI / 2);
    assert.equal(layout.utilitySink.height, 0.88);
    assert.ok(layout.utilitySink.bounds.maxX < layout.doors.bathroom.x - layout.doors.bathroom.width / 2,
      `${label}: sink is not beside the bathroom`);
    const fixtures = [...Object.entries(layout.fixtures), ['utilitySink', layout.utilitySink]];
    for (const [index, [name, spec]] of fixtures.entries()) {
      assert.ok(contains(layout.zones.utility, spec.bounds), `${label}: ${name} leaves utility room`);
      assert.ok(overlap(spec.bounds, layout.stairs.bounds) < 1e-7, `${label}: ${name} blocks retained stairs`);
      for (const door of [layout.doors.bathroom, layout.doors.kitchen]) {
        const approach = rect(door.x - door.width / 2, door.x + door.width / 2, door.z, door.z + 0.55);
        assert.ok(overlap(spec.bounds, approach) < 1e-7, `${label}: ${name} blocks rear doorway`);
      }
      for (const [otherName, other] of fixtures.slice(index + 1)) {
        assert.ok(overlap(spec.bounds, other.bounds) < 1e-7, `${label}: ${name} overlaps ${otherName}`);
      }
    }
  }
});

test('renders one accessible utility dishwashing sink with its pump below in reference only', () => withCanvas(() => {
  for (const options of configurations) {
    const house = createHouse(options);
    try {
      house.group.updateMatrixWorld(true);
      const spec = house.layout.utilitySink;
      const sink = house.group.getObjectByName('utility-sink');
      assert.ok(sink && spec, 'reference utility sink is missing');
      assert.equal(house.group.getObjectByName('kitchen-sink'), undefined, 'reference retains duplicate kitchen sink');
      const bowl = sink.getObjectByName('utility-sink-bowl');
      const pump = sink.getObjectByName('utility-water-pump');
      assert.ok(bowl && pump, 'dishwashing basin or water pump is missing');
      const sinkBox = new Box3().setFromObject(sink);
      const bowlBox = new Box3().setFromObject(bowl);
      const pumpBox = new Box3().setFromObject(pump);
      assert.ok(contains(spec.bounds, footprint(sinkBox)), 'sink geometry leaves reserved footprint');
      assert.ok(contains(spec.bounds, footprint(pumpBox)), 'pump geometry leaves reserved footprint');
      assert.ok(sinkBox.max.y <= 1.21 && sinkBox.max.y > spec.height + 0.15, 'faucet height is incorrect');
      assert.ok(pumpBox.max.y < bowlBox.min.y, 'pump is not below the basin');
      const localDepth = spec.bounds.maxX - spec.bounds.minX;
      const operatingPoint = sink.localToWorld(new Vector3(0, 0, localDepth / 2 + 0.23));
      const world = createWalkingWorld(house);
      assert.ok(canWalkAt({ x: operatingPoint.x, y: world.eyeHeight, z: operatingPoint.z }, world),
        'sink front operating position is obstructed');
      for (const [key, name] of Object.entries({ washer: 'washer', dryer: 'dryer', waterPurifier: 'water-purifier' })) {
        const appliance = house.group.getObjectByName(name);
        const fixture = house.layout.fixtures[key];
        assert.ok(appliance, `${name}: model is missing`);
        assert.ok(contains(fixture.bounds, footprint(new Box3().setFromObject(appliance))), `${name}: geometry leaves footprint`);
        const point = appliance.localToWorld(new Vector3(0, 0, (fixture.bounds.maxZ - fixture.bounds.minZ) / 2 + 0.23));
        assert.ok(canWalkAt({ x: point.x, y: world.eyeHeight, z: point.z }, world), `${name}: front operating position is blocked`);
      }
    } finally { house.dispose(); }
  }
  for (const create of [createModernHouse, createProposedHouse]) {
    const house = create();
    try {
      assert.equal(house.group.getObjectByName('utility-sink'), undefined, 'utility sink leaked into another design');
      assert.ok(house.group.getObjectByName('kitchen-sink'), 'another design lost its kitchen sink');
    } finally { house.dispose(); }
  }
}));

test('preserves modern and proposed laundry positions and shared loft structure', () => {
  for (const options of configurations) {
    const modern = getModernLayout(options);
    const proposed = getProposedLayout(options);
    const { left, roomFront } = modern;
    assert.deepEqual(modern.fixtures.washer.bounds, rect(left + 0.4, left + 1, roomFront + 0.73, roomFront + 1.35));
    assert.deepEqual(modern.fixtures.dryer.bounds, rect(left + 1.04, left + 1.64, roomFront + 0.73, roomFront + 1.35));
    assert.deepEqual(modern.fixtures.waterPurifier.bounds, rect(left + 0.08, left + 0.36, roomFront + 0.73, roomFront + 1.13));
    for (const spec of Object.values(modern.fixtures)) assert.equal(spec.rotationY, Math.PI);
    const { dividerX, rear } = proposed;
    assert.deepEqual(proposed.fixtures.washer.bounds, rect(dividerX + 0.39, dividerX + 0.99, rear + 0.1, rear + 0.72));
    assert.deepEqual(proposed.fixtures.dryer.bounds, rect(dividerX + 1.03, dividerX + 1.63, rear + 0.1, rear + 0.72));
    assert.deepEqual(proposed.fixtures.waterPurifier.bounds, rect(dividerX + 0.07, dividerX + 0.35, rear + 0.32, rear + 0.72));
    for (const spec of Object.values(proposed.fixtures)) assert.equal(spec.rotationY, 0);
    const structure = getSharedStructure(options);
    for (const layout of [getHouseLayout(options), modern, proposed]) {
      assert.deepEqual(layout.stairs, structure.stairs);
      assert.deepEqual(layout.loft, structure.loft);
    }
  }
});
