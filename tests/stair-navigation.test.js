import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_DIMENSIONS } from '../src/dimensions.js';
import { createHouse } from '../src/house.js';
import { createModernHouse } from '../src/modern-house.js';
import { createProposedHouse } from '../src/proposed-house.js';
import { createWalkingWorld } from '../src/walking-world.js';
import { canWalkAt, walk } from '../src/navigation.js';

const configurations = [
  DEFAULT_DIMENSIONS,
  { width: 3.2, depth: 9.5, loftHeight: 2, upperHeight: 1.8 },
  { width: 5.5, depth: 12, loftHeight: 3.5, upperHeight: 3.5 },
  { width: 3.2, depth: 9.5, loftHeight: 3.5, upperHeight: 1.8 },
];
const builders = { reference: createHouse, modern: createModernHouse, proposed: createProposedHouse };
const close = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 0.012,
  `${message}: expected ${expected}, received ${actual}`);

function moveTo(start, target, world, label) {
  let position = { ...start };
  for (let i = 0; i < 600; i++) {
    const dx = target.x - position.x, dz = target.z - position.z;
    const distance = Math.hypot(dx, dz);
    if (distance < 0.004) return position;
    const next = walk(position, ['forward'], Math.atan2(dx, -dz), Math.min(0.025, distance / 1.25), world);
    assert.ok(Number.isFinite(next.y), `${label}: walking height became invalid`);
    assert.ok(Math.abs(next.y - position.y) <= 0.25, `${label}: an abrupt height change skipped the stairs`);
    assert.ok(Math.hypot(next.x - position.x, next.z - position.z) > 1e-8,
      `${label}: blocked at ${JSON.stringify(position)} toward ${JSON.stringify(target)}`);
    position = next;
  }
  assert.fail(`${label}: never reached ${JSON.stringify(target)}`);
}

for (const [variant, create] of Object.entries(builders)) for (const dimensions of configurations) {
  const label = `${variant} ${dimensions.width} × ${dimensions.depth} m, loft ${dimensions.loftHeight} m`;
  test(`walks up the retained stair and back down without wall cuts or falls: ${label}`, () => {
    const previousDocument = globalThis.document;
    // Canvas drawing does not affect the real Three.js collision geometry.
    globalThis.document = { createElement: () => ({ width: 0, height: 0,
      getContext: () => new Proxy({}, { get: () => () => {} }),
    }) };
    let house;
    try {
      house = create(dimensions);
      const world = createWalkingWorld(house, 1.6);
      const l = house.layout, stair = l.stairs, flight = stair.flights[0];
      const eye = world.eyeHeight;
      assert.ok(Number.isFinite(eye) && eye > 0);
      const treadRun = (flight.bottom[0] - flight.top[0]) / flight.steps;
      const portalX = Math.max(flight.top[0] + treadRun / 2, stair.opening.minX + 0.162);
      const start = { x: flight.bottom[0] + 0.28, y: eye, z: flight.bottom[2] };
      assert.ok(canWalkAt(start, world), `${label}: ground approach is blocked`);
      const middle = moveTo(start, { x: (flight.bottom[0] + flight.top[0]) / 2, z: start.z }, world, `${label} ascent`);
      assert.ok(middle.y > eye + l.loftHeight * 0.2 && middle.y < eye + l.loftHeight * 0.8,
        `${label}: ascent did not gain height along the actual run`);
      assert.equal(canWalkAt({ ...middle, y: eye }, world), false,
        `${label}: a ground-level side entry jumps onto the high part of the flight`);
      assert.equal(canWalkAt({ ...middle, z: (stair.sideWall.bounds.minZ + stair.sideWall.bounds.maxZ) / 2 }, world), false,
        `${label}: body can pass through the stair side wall mid-flight`);
      let againstWall = { ...middle };
      for (let i = 0; i < 40; i++) againstWall = walk(againstWall, ['forward'], Math.PI, 0.025, world);
      assert.ok(againstWall.z <= stair.sideWall.bounds.minZ - 0.13,
        `${label}: walking crossed the side wall before reaching the loft`);
      assert.ok(againstWall.y < eye + l.loftHeight - 0.2, `${label}: side stepping jumped onto the loft`);

      let crest = { ...middle };
      const heldFrames = Math.ceil((middle.x - portalX + 0.4) / (1.25 * 0.04));
      for (let i = 0; i < heldFrames; i++) crest = walk(crest, ['forward'], -Math.PI / 2, 0.04, world);
      close(crest.x, portalX, `${label}: held movement misses the clear turning portal`);
      close(crest.y, eye + l.loftHeight, `${label}: crest height`);
      assert.ok(canWalkAt(crest, world), `${label}: held movement stops inside the upper guard`);
      const landingEntry = { x: portalX, z: stair.opening.maxZ + 0.24 };
      const onLanding = moveTo(crest, landingEntry, world, `${label} upper turn`);
      close(onLanding.y, eye + l.loftHeight, `${label}: upper turn height`);
      const landingCenter = { x: (stair.landing.minX + stair.landing.maxX) / 2, z: stair.landing.maxZ - 0.16 };
      const onLoft = moveTo(onLanding, landingCenter, world, `${label} loft arrival`);
      close(onLoft.y, eye + l.loftHeight, `${label}: loft height`);
      assert.equal(canWalkAt({ x: l.right - 0.85, y: eye + l.loftHeight, z: l.loft.front + 0.3 }, world), false,
        `${label}: a point beyond the loft edge falls back to ground support`);
      const holeCenter = { x: (stair.opening.minX + stair.opening.maxX) / 2,
        y: eye + l.loftHeight, z: (stair.opening.minZ + stair.opening.maxZ) / 2 };
      assert.equal(canWalkAt(holeCenter, world), false, `${label}: walker can step into the high part of the stair void`);

      const returnLanding = moveTo(onLoft, landingEntry, world, `${label} return to opening`);
      const returnCrest = moveTo(returnLanding, { x: portalX, z: start.z }, world, `${label} reverse upper turn`);
      close(returnCrest.y, eye + l.loftHeight, `${label}: descending crest height`);
      const returned = moveTo(returnCrest, { x: start.x, z: start.z }, world, `${label} descent`);
      close(returned.y, eye, `${label}: ground return height`);
      close(returned.x, start.x, `${label}: ground return position`);
    } finally {
      house?.dispose();
      if (previousDocument === undefined) delete globalThis.document;
      else globalThis.document = previousDocument;
    }
  });
}
