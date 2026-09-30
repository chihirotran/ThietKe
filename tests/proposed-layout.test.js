import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_DIMENSIONS } from '../src/dimensions.js';
import { getHouseLayout } from '../src/layout.js';
import { getProposedLayout, PROPOSED_DIMENSION_LIMITS } from '../src/proposed-layout.js';

const EPS = 1e-6;
const area = r => (r.maxX - r.minX) * (r.maxZ - r.minZ);
const overlap = (a, b) => Math.max(0, Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX))
  * Math.max(0, Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ));
const contains = (a, b) => b.minX >= a.minX - EPS && b.maxX <= a.maxX + EPS
  && b.minZ >= a.minZ - EPS && b.maxZ <= a.maxZ + EPS;
const point = (r, x, z) => x >= r.minX - EPS && x <= r.maxX + EPS && z >= r.minZ - EPS && z <= r.maxZ + EPS;
const connected = (a, b) => Math.min(a.maxX, b.maxX) >= Math.max(a.minX, b.minX) - EPS
  && Math.min(a.maxZ, b.maxZ) >= Math.max(a.minZ, b.minZ) - EPS;
const configurations = [DEFAULT_DIMENSIONS,
  ...[3.2, 5.5].flatMap(width => [9.5, 12].map(depth => ({ width, depth, loftHeight: width === 3.2 ? 2 : 3.5, upperHeight: width === 3.2 ? 1.8 : 3.5 }))),
];
function verify(check) {
  for (const dimensions of configurations) check(getProposedLayout(dimensions), `${dimensions.width} × ${dimensions.depth}`);
}
function floorFurniture(l) {
  return {
    sofa: l.lounge.sofa.bounds, chaise: l.lounge.sofa.chaise.bounds, coffee: l.lounge.coffeeTable.bounds,
    desk: l.desk.bounds, deskChair: l.desk.chair.bounds, table: l.dining.table.bounds,
    ...Object.fromEntries(l.dining.chairs.map((c, i) => [`diningChair${i}`, c.bounds])),
    ...Object.fromEntries(l.kitchen.counters.map((c, i) => [`counter${i}`, c.bounds])), fridge: l.kitchen.fridge.bounds,
    ...Object.fromEntries(Object.entries(l.bathroom).map(([name, f]) => [name, f.bounds])),
    ...Object.fromEntries(Object.entries(l.laundry).map(([name, f]) => [name, f.bounds])),
  };
}
function openingUnionArea(rectangles) {
  const xs = [...new Set(rectangles.flatMap(r => [r.minX, r.maxX]))].sort((a, b) => a - b);
  let result = 0;
  for (let i = 1; i < xs.length; i++) {
    const intervals = rectangles.filter(r => r.minX < xs[i] && r.maxX > xs[i - 1]).map(r => [r.minZ, r.maxZ]).sort((a, b) => a[0] - b[0]);
    let length = 0, end = -Infinity;
    for (const [start, next] of intervals) { length += Math.max(0, next - Math.max(start, end)); end = Math.max(end, next); }
    result += (xs[i] - xs[i - 1]) * length;
  }
  return result;
}

test('places the open kitchen ahead of separate rear bathroom and laundry rooms', () => {
  verify((l, label) => {
    assert.equal(l.variant, 'proposed');
    assert.ok(l.zones.bathroom.maxX <= l.zones.utility.minX + EPS, `${label}: service rooms overlap`);
    assert.ok(l.zones.kitchen.minZ > l.zones.bathroom.maxZ, `${label}: kitchen remains in a rear room`);
    assert.ok(l.zones.dining.minZ > l.zones.kitchen.maxZ, `${label}: dining overlaps kitchen`);
    assert.ok(l.zones.living.minZ > l.zones.dining.maxZ, `${label}: living overlaps dining`);
    assert.equal(l.doors.kitchen, undefined, `${label}: open kitchen has an enclosing doorway`);
    for (const [name, room] of [['bathroom', l.zones.bathroom], ['utility', l.zones.utility]]) {
      const door = l.doors[name];
      assert.ok(point(room, door.x - door.width / 2, door.z) && point(room, door.x + door.width / 2, door.z));
      assert.ok(Math.abs(door.z - room.maxZ) < EPS, `${label}: ${name} does not open into the rear hall`);
    }
    for (const [name, fixture] of Object.entries(l.bathroom)) assert.ok(contains(l.zones.bathroom, fixture.bounds), `${label}: ${name} leaves bathroom`);
    for (const [name, fixture] of Object.entries(l.laundry)) assert.ok(contains(l.zones.utility, fixture.bounds), `${label}: ${name} leaves laundry`);
  });
});

test('fits real ground-floor furniture and keeps separate activities from intersecting', () => {
  verify((l, label) => {
    const shell = { minX: l.left, maxX: l.right, minZ: l.rear, maxZ: l.front };
    const fixtures = Object.entries(floorFurniture(l));
    for (const [name, r] of fixtures) assert.ok(area(r) > 0 && contains(shell, r), `${label}: invalid ${name} footprint`);
    for (let i = 0; i < fixtures.length; i++) for (let j = i + 1; j < fixtures.length; j++) {
      const [a, ra] = fixtures[i], [b, rb] = fixtures[j];
      if ((a === 'sofa' && b === 'chaise') || (a.startsWith('counter') && b.startsWith('counter'))) continue;
      assert.ok(overlap(ra, rb) < EPS, `${label}: ${a} overlaps ${b}`);
    }
    assert.equal(l.desk.monitors, 2);
    assert.equal(l.dining.chairs.length, 2);
    assert.ok(l.desk.length >= 1.2, `${label}: workstation is too short for the two-screen arrangement`);
    assert.ok(l.lounge.sofa.bounds.maxX < 0 && l.lounge.sofa.chaise.bounds.maxX < 0,
      `${label}: L seating crowds the confirmed right entrance`);
    assert.ok(contains(l.kitchen.counters[0].bounds, l.kitchen.sink.bounds));
    assert.ok(contains(l.kitchen.counters[1].bounds, l.kitchen.hob.bounds));
  });
});

test('connects the front-right entry to both service-room doors around furniture and stairs', () => {
  verify((l, label) => {
    assert.equal(l.entry.side, 'right');
    assert.equal(l.entry.widthIsEstimate, true);
    assert.ok(l.entry.door.x > 0 && Math.abs(l.entry.door.z - l.front) < EPS);
    const route = l.circulation.segments;
    const obstacles = [...Object.entries(floorFurniture(l)), ...l.stairs.flights.map((f, i) => [`flight${i}`, f.bounds]), ...l.stairs.landings.map((r, i) => [`landing${i}`, r])];
    let wallStart = l.left;
    for (const door of Object.values(l.doors).sort((a, b) => a.x - b.x)) {
      obstacles.push(['rear partition', { minX: wallStart, maxX: door.x - door.width / 2,
        minZ: door.z - door.dividerThickness / 2, maxZ: door.z + door.dividerThickness / 2 }]);
      wallStart = door.x + door.width / 2;
    }
    obstacles.push(['rear partition', { minX: wallStart, maxX: l.right,
      minZ: l.roomFront - l.doors.utility.dividerThickness / 2, maxZ: l.roomFront + l.doors.utility.dividerThickness / 2 }]);
    for (const [index, segment] of route.entries()) {
      assert.ok(area(segment) > 0, `${label}: route segment ${index} collapsed`);
      for (const [name, footprint] of obstacles) assert.ok(overlap(segment, footprint) < EPS, `${label}: route ${index} crosses ${name}`);
      if (index) assert.ok(connected(route[index - 1], segment), `${label}: route is disconnected at ${index}`);
    }
    assert.ok(point(route[0], l.entry.door.x, l.entry.door.z));
    assert.ok(l.circulation.cross.maxZ <= l.stairs.bounds.minZ,
      `${label}: the rear cross hall passes through the stairs`);
    for (const door of Object.values(l.doors)) {
      assert.ok(door.x >= l.circulation.cross.minX && door.x <= l.circulation.cross.maxX);
      const approach = { minX: door.x - door.width / 2, maxX: door.x + door.width / 2, minZ: door.z - 0.45, maxZ: door.z + 0.24 };
      for (const [name, fixture] of Object.entries(floorFurniture(l))) assert.ok(overlap(approach, fixture) < EPS, `${label}: ${name} blocks a rear door`);
    }
  });
});

test('retains the video stair geometry as one left-rising flight without a new turning landing', () => {
  verify((l, label) => {
    const reference = getHouseLayout(l).stairs;
    assert.equal(l.stairs.retained, true);
    assert.equal(l.stairs.source, 'video');
    assert.equal(l.stairs.dimensionsEstimated, true);
    assert.equal(l.stairs.flights.length, 1, `${label}: a second flight rebuilds the retained staircase`);
    assert.equal(l.stairs.landings.length, 0, `${label}: a new turning landing was introduced`);
    for (const key of ['bounds', 'opening', 'landing', 'bottom', 'top', 'width', 'steps', 'direction']) {
      assert.deepEqual(l.stairs[key], reference[key], `${label}: retained stair ${key} changed`);
    }
    assert.deepEqual(l.stairs.openingRects, [reference.opening]);
    const flight = l.stairs.flights[0];
    assert.deepEqual(flight.bounds, reference.bounds);
    assert.deepEqual(flight.bottom, reference.bottom);
    assert.deepEqual(flight.top, reference.top);
    assert.equal(flight.steps, reference.steps);
    assert.equal(flight.width, reference.width);
    assert.ok(flight.bottom[1] === 0 && Math.abs(flight.top[1] - l.loftHeight) < EPS);
    assert.ok(flight.top[0] < flight.bottom[0] && Math.abs(flight.top[2] - flight.bottom[2]) < EPS,
      `${label}: stair no longer rises transversely toward the left wall`);
    assert.ok(flight.bounds.maxX < l.doors.utility.x - l.doors.utility.width / 2,
      `${label}: retained stair crosses the rear doorway approach`);
  });
});

test('supports the retained stair exit and keeps the bedroom clear of it', () => {
  verify((l, label) => {
    const flight = l.stairs.flights[0];
    assert.ok(l.stairs.landing.minZ >= flight.bounds.maxZ && l.stairs.landing.minZ - flight.bounds.maxZ < 0.1);
    assert.ok(flight.top[0] >= l.stairs.landing.minX && flight.top[0] <= l.stairs.landing.maxX,
      `${label}: top tread misses the supported exit`);
    assert.ok(overlap(l.stairs.landing, l.bed.bounds) < EPS && overlap(l.stairs.landing, l.wardrobe.bounds) < EPS);
    assert.ok(overlap(l.bed.bounds, l.wardrobe.bounds) < EPS);
    for (const [name, r] of [['landing', l.stairs.landing], ['bed', l.bed.bounds], ['wardrobe', l.wardrobe.bounds]]) {
      assert.ok(area(r) > 0 && Math.abs(l.loft.floorRects.reduce((sum, slab) => sum + overlap(slab, r), 0) - area(r)) < EPS,
        `${label}: ${name} is unsupported`);
    }
  });
});

test('keeps a solid wall on the left of the ascending stair without blocking circulation', () => {
  verify((l, label) => {
    const wall = l.stairs.sideWall;
    const stairs = l.stairs.bounds;
    assert.ok(wall.bounds.minZ >= stairs.maxZ && wall.bounds.minZ - stairs.maxZ < 0.08);
    assert.ok(wall.bounds.minX <= stairs.minX && wall.bounds.maxX >= stairs.maxX);
    assert.ok(wall.height <= l.loftHeight && wall.height >= l.loftHeight - 0.15,
      `${label}: wall blocks the upper exit or leaves the stair unenclosed`);
    for (const obstacle of [...l.circulation.segments, ...Object.values(floorFurniture(l)), stairs]) {
      assert.ok(overlap(wall.bounds, obstacle) < EPS, `${label}: stair wall blocks a route or furnishing`);
    }
  });
});

test('shortens the loft by one third from the front while retaining the stair opening', () => {
  verify((l, label) => {
    for (const r of l.stairs.openingRects) assert.ok(contains(l.loft, r));
    for (const [index, slab] of l.loft.floorRects.entries()) {
      assert.ok(area(slab) > 0 && contains(l.loft, slab));
      for (const hole of l.stairs.openingRects) assert.ok(overlap(slab, hole) < EPS, `${label}: slab obstructs stairs`);
      for (const other of l.loft.floorRects.slice(index + 1)) assert.ok(overlap(slab, other) < EPS, `${label}: duplicate slab`);
    }
    assert.ok(Math.abs(l.loft.floorRects.reduce((sum, slab) => sum + area(slab), 0)
      - area(l.loft) + openingUnionArea(l.stairs.openingRects)) < EPS);
    assert.ok(Math.abs(l.loft.actualDepth - l.loft.previousDepth * 2 / 3) < EPS);
    assert.equal(l.loft.back, getHouseLayout(l).stairs.opening.minZ - 0.1);
    assert.equal(overlap(l.loft, l.zones.living), 0, `${label}: front living room should be open above`);
    assert.ok(l.front - l.loft.front >= 0.95, `${label}: entrance loses its double-height opening`);
    assert.ok(l.loft.minZ > l.zones.bathroom.maxZ, `${label}: loft was placed above only the rear wet rooms`);
  });
  const measured = getProposedLayout();
  assert.ok(Math.abs(measured.loft.actualDepth - 5.56 * 2 / 3) < EPS);
  assert.equal(measured.bed.axis, 'x');
  assert.equal(measured.bed.length, 2);
  assert.equal(measured.bed.width, 1.3);
  assert.ok(measured.bed.bounds.maxX - measured.bed.bounds.minX > measured.bed.bounds.maxZ - measured.bed.bounds.minZ);
});

test('keeps camera eyes inside rooms and outside tall furnishings', () => {
  verify((l, label) => {
    const shell = { minX: l.left, maxX: l.right, minZ: l.rear, maxZ: l.front };
    for (const [name, camera] of Object.entries(l.cameras)) {
      const [x, y, z] = camera.position;
      assert.ok(point(shell, x, z) && y > 0 && y < l.loftHeight + l.upperHeight, `${label}: ${name} camera leaves the interior`);
      for (const [fixture, bounds, minY, maxY] of [
        ['fridge', l.kitchen.fridge.bounds, 0, 1.85],
        ['laundry storage', l.laundry.storage.bounds, 0, l.laundry.storage.height],
        ['wardrobe', l.wardrobe.bounds, l.loftHeight, l.loftHeight + l.wardrobe.height],
      ]) assert.ok(!(point(bounds, x, z) && y > minY && y < maxY), `${label}: ${name} camera intersects ${fixture}`);
    }
  });
});

test('advertises a supported depth containing the measured house and rejects cramped programme assumptions', () => {
  const layout = getProposedLayout();
  assert.ok(DEFAULT_DIMENSIONS.depth >= PROPOSED_DIMENSION_LIMITS.depth[0]);
  assert.ok(PROPOSED_DIMENSION_LIMITS.depth[0] > 7.5);
  assert.deepEqual(layout.supportedDimensions, PROPOSED_DIMENSION_LIMITS);
});
