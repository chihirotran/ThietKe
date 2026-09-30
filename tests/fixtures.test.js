import test from 'node:test';
import assert from 'node:assert/strict';
import { Box3, Vector3 } from 'three';
import { DEFAULT_DIMENSIONS } from '../src/dimensions.js';
import { getHouseLayout } from '../src/layout.js';
import { getModernLayout } from '../src/modern-layout.js';
import { getProposedLayout } from '../src/proposed-layout.js';
import { createHouse } from '../src/house.js';
import { createModernHouse } from '../src/modern-house.js';
import { createProposedHouse } from '../src/proposed-house.js';
import { createWalkingWorld } from '../src/walking-world.js';
import { canWalkAt } from '../src/navigation.js';

const configurations = [DEFAULT_DIMENSIONS,
  { width: 3.2, depth: 9.5, loftHeight: 2, upperHeight: 1.8 },
  { width: 5.5, depth: 12, loftHeight: 3.5, upperHeight: 3.5 },
];
const variants = {
  reference: { layout: getHouseLayout, create: createHouse },
  modern: { layout: getModernLayout, create: createModernHouse },
  proposed: { layout: getProposedLayout, create: createProposedHouse },
};
const names = { washer: 'washer', dryer: 'dryer', waterPurifier: 'water-purifier' };
const overlap = (a, b) => Math.max(0, Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX))
  * Math.max(0, Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ));
const contains = (a, b, epsilon = 1e-6) => b.minX >= a.minX - epsilon && b.maxX <= a.maxX + epsilon
  && b.minZ >= a.minZ - epsilon && b.maxZ <= a.maxZ + epsilon;
const footprint = box => ({ minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z });
const positiveIntersection = (a, b) => ['x', 'y', 'z'].every(axis => Math.min(a.max[axis], b.max[axis]) - Math.max(a.min[axis], b.min[axis]) > 1e-5);

test('provides adjacent laundry appliances outside the retained stair and rear door approaches', () => {
  for (const options of configurations) for (const [variant, { layout: getLayout }] of Object.entries(variants)) {
    const l = getLayout(options), label = `${variant} ${l.width} × ${l.depth}`;
    assert.equal(l.fixtures.washer.type, 'top-loading', `${label}: washer type`);
    assert.equal(l.fixtures.dryer.type, 'front-loading', `${label}: dryer type`);
    assert.equal(l.fixtures.waterPurifier.type, 'water-purifier', `${label}: purifier type`);
    const appliances = Object.values(l.fixtures);
    for (const [i, spec] of appliances.entries()) {
      assert.ok(contains(l.zones.utility, spec.bounds), `${label}: appliance leaves utility room`);
      assert.ok(overlap(spec.bounds, l.stairs.bounds) < 1e-7 && overlap(spec.bounds, l.stairs.sideWall.bounds) < 1e-7,
        `${label}: appliance occupies retained stair or side wall`);
      for (const other of appliances.slice(i + 1)) assert.ok(overlap(spec.bounds, other.bounds) < 1e-7,
        `${label}: appliances intersect`);
      for (const door of Object.values(l.doors)) {
        const approach = { minX: door.x - door.width / 2, maxX: door.x + door.width / 2,
          minZ: door.z - 0.55, maxZ: door.z + 0.55 };
        assert.ok(overlap(spec.bounds, approach) < 1e-7, `${label}: appliance blocks a rear doorway approach`);
      }
    }
    const { washer, dryer, waterPurifier } = l.fixtures;
    assert.ok(washer.bounds.minX - waterPurifier.bounds.maxX >= 0
      && washer.bounds.minX - waterPurifier.bounds.maxX < 0.2, `${label}: purifier is not beside washer`);
    assert.ok(dryer.bounds.minX - washer.bounds.maxX >= 0
      && dryer.bounds.minX - washer.bounds.maxX < 0.2, `${label}: dryer is not beside washer`);
    assert.ok(washer.lidClearance.maxY > washer.height + 0.3, `${label}: no space reserved for opening washer lid`);
  }
});

test('renders correct appliance doors, clear operating space and unobstructed washer lid in every design', () => {
  const previousDocument = globalThis.document;
  // Texture drawing is irrelevant to appliance dimensions and collisions.
  globalThis.document = { createElement: () => ({ width: 0, height: 0,
    getContext: () => new Proxy({}, { get: () => () => {} }),
  }) };
  try {
    for (const options of configurations) for (const [variant, { create }] of Object.entries(variants)) {
      const house = create(options);
      try {
        const l = house.layout, label = `${variant} ${l.width} × ${l.depth}`;
        house.group.updateMatrixWorld(true);
        const world = createWalkingWorld(house);
        const applianceGroups = {};
        for (const [key, name] of Object.entries(names)) {
          const matches = [];
          house.group.traverse(object => { if (object.name === name) matches.push(object); });
          assert.equal(matches.length, 1, `${label}: expected one ${name}`);
          const group = matches[0], spec = l.fixtures[key];
          applianceGroups[key] = group;
          const actual = new Box3().setFromObject(group);
          assert.equal(group.userData.applianceType, spec.type, `${label}: wrong rendered ${name} type`);
          assert.ok(contains(spec.bounds, footprint(actual), 0.005), `${label}: ${name} extends beyond reserved footprint`);
          const operatingPoint = new Vector3(0, 0, (spec.bounds.maxZ - spec.bounds.minZ) / 2 + 0.23);
          group.localToWorld(operatingPoint);
          assert.ok(canWalkAt({ x: operatingPoint.x, y: world.eyeHeight, z: operatingPoint.z }, world),
            `${label}: ${name} front operating position is blocked`);
        }
        const washer = applianceGroups.washer;
        assert.ok(washer.getObjectByName('washer-top-opening') && washer.getObjectByName('washer-lid'),
          `${label}: washer lacks top opening and lid`);
        assert.equal(washer.getObjectByName('washer-door'), undefined, `${label}: washer retains a front-loading door`);
        assert.ok(applianceGroups.dryer.getObjectByName('dryer-door'), `${label}: dryer has no front door`);
        const lid = l.fixtures.washer.lidClearance, b = lid.bounds;
        const volume = new Box3(new Vector3(b.minX, lid.minY, b.minZ), new Vector3(b.maxX, lid.maxY, b.maxZ));
        const renderedLid = new Box3().setFromObject(washer.getObjectByName('washer-lid'));
        assert.ok(volume.containsBox(renderedLid) && renderedLid.max.y > l.fixtures.washer.height + 0.2,
          `${label}: lid cannot open within its reserved clearance`);
        const washerParts = new Set();
        washer.traverse(object => washerParts.add(object));
        house.group.traverse(object => {
          if (object.isMesh && !washerParts.has(object)) assert.ok(!positiveIntersection(volume, new Box3().setFromObject(object)),
            `${label}: ${object.name || object.parent.name} blocks the washer lid`);
        });
      } finally { house.dispose(); }
    }
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test('keeps the reference dishwashing sink in the utility room and other sinks beside their kitchens', () => {
  const previousDocument = globalThis.document;
  globalThis.document = { createElement: () => ({ width: 0, height: 0,
    getContext: () => new Proxy({}, { get: () => () => {} }),
  }) };
  try {
    for (const options of configurations) for (const [variant, { create }] of Object.entries(variants)) {
      const house = create(options);
      try {
        const label = `${variant} ${house.layout.width} × ${house.layout.depth}`;
        house.group.updateMatrixWorld(true);
        const kitchen = house.group.getObjectByName('kitchen-fixtures');
        if (variant === 'reference') {
          assert.equal(kitchen?.getObjectByName('kitchen-sink'), undefined, `${label}: duplicate kitchen sink`);
          assert.ok(house.group.getObjectByName('utility-sink-bowl'), `${label}: utility basin is missing`);
          assert.ok(house.group.getObjectByName('utility-water-pump'), `${label}: water pump is missing`);
          continue;
        }
        const sink = kitchen?.getObjectByName('kitchen-sink');
        assert.ok(sink, `${label}: kitchen sink is missing`);
        const bowl = sink.getObjectByName('kitchen-sink-bowl') ?? sink.getObjectByName('sink-bowl');
        assert.ok(bowl?.isMesh, `${label}: sink has no basin`);
        const bowlBox = new Box3().setFromObject(bowl);
        assert.ok(bowlBox.max.y > 0.8 && bowlBox.max.y < 1.1, `${label}: sink is not at worktop level`);
        assert.ok(contains(house.layout.zones.kitchen, footprint(bowlBox)), `${label}: basin is outside kitchen`);
        const hob = kitchen.getObjectByName('kitchen-hob');
        assert.ok(hob && overlap(footprint(bowlBox), footprint(new Box3().setFromObject(hob))) < 1e-7,
          `${label}: kitchen sink intersects hob`);
        const faucetBox = new Box3().setFromObject(sink);
        assert.ok(faucetBox.max.y > bowlBox.max.y + 0.15, `${label}: sink has no raised faucet`);
      } finally { house.dispose(); }
    }
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});
