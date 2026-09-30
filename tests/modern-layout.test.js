import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_DIMENSIONS } from '../src/dimensions.js';
import { getModernLayout } from '../src/modern-layout.js';

const EPSILON = 1e-6;
const configurations = [
  DEFAULT_DIMENSIONS,
  { width: 3.2, depth: 9.5, loftHeight: 2, upperHeight: 1.8 },
  { width: 5.5, depth: 12, loftHeight: 3.5, upperHeight: 3.5 },
];
const area = r => (r.maxX - r.minX) * (r.maxZ - r.minZ);
const overlap = (a, b) => Math.max(0, Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX))
  * Math.max(0, Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ));
const contains = (a, b) => b.minX >= a.minX - EPSILON && b.maxX <= a.maxX + EPSILON
  && b.minZ >= a.minZ - EPSILON && b.maxZ <= a.maxZ + EPSILON;
const containsPoint = (r, p) => p[0] >= r.minX - EPSILON && p[0] <= r.maxX + EPSILON
  && p[2] >= r.minZ - EPSILON && p[2] <= r.maxZ + EPSILON;

function unionArea(rectangles) {
  const xs = [...new Set(rectangles.flatMap(r => [r.minX, r.maxX]))].sort((a, b) => a - b);
  let result = 0;
  for (let i = 1; i < xs.length; i++) {
    const intervals = rectangles.filter(r => r.minX < xs[i] && r.maxX > xs[i - 1])
      .map(r => [r.minZ, r.maxZ]).sort((a, b) => a[0] - b[0]);
    let end = -Infinity;
    let length = 0;
    for (const [start, nextEnd] of intervals) {
      length += Math.max(0, nextEnd - Math.max(start, end));
      end = Math.max(end, nextEnd);
    }
    result += (xs[i] - xs[i - 1]) * length;
  }
  return result;
}

function verify(check) {
  for (const dimensions of configurations) {
    check(getModernLayout(dimensions), `${dimensions.width} × ${dimensions.depth} m`);
  }
}

test('fits the modern rooms and furniture inside the existing measured shell', () => {
  verify((layout, label) => {
    const shell = { minX: layout.left, maxX: layout.right, minZ: layout.rear, maxZ: layout.front };
    assert.ok(Math.abs(layout.right - layout.left - layout.width) < EPSILON);
    assert.ok(Math.abs(layout.front - layout.rear - layout.depth) < EPSILON);
    for (const [name, r] of Object.entries({
      kitchen: layout.zones.kitchen, bathroom: layout.zones.bathroom,
      desk: layout.desk.bounds, storage: layout.mainStorage.bounds,
      sofa: layout.lounge.sofa.bounds, television: layout.lounge.television.bounds,
    })) {
      assert.ok(area(r) > 0 && contains(shell, r), `${label}: ${name} leaves the house`);
    }
    assert.ok(overlap(layout.zones.kitchen, layout.zones.bathroom) < EPSILON,
      `${label}: wet rooms overlap`);
    assert.ok(overlap(layout.desk.bounds, layout.mainStorage.bounds) < EPSILON,
      `${label}: desk overlaps storage`);
    assert.ok(overlap(layout.desk.bounds, layout.lounge.television.bounds) < EPSILON,
      `${label}: television storage overlaps the workstation`);
  });
});

test('keeps the confirmed front-right entrance and its estimated vestibule clear', () => {
  verify((layout, label) => {
    const { entry } = layout;
    const shell = { minX: layout.left, maxX: layout.right, minZ: layout.rear, maxZ: layout.front };
    assert.equal(entry.side, 'right');
    assert.equal(entry.positionConfirmed, true);
    assert.equal(entry.widthIsEstimate, true);
    assert.ok(entry.door.x > 0 && Math.abs(entry.door.z - layout.front) < EPSILON,
      `${label}: entry is not on the front-right edge`);
    assert.ok(contains(shell, entry.vestibule)
      && containsPoint(entry.vestibule, [entry.door.x, 0, entry.door.z]), `${label}: entrance misses its vestibule`);
    assert.ok(Math.abs(entry.door.width - (entry.vestibule.maxX - entry.vestibule.minX)) < EPSILON,
      `${label}: clear vestibule is narrower than the estimated door`);
    assert.ok(entry.vestibule.maxZ - entry.vestibule.minZ >= 1 - EPSILON,
      `${label}: front entrance lacks the planned clear depth`);
    assert.ok(overlap(entry.vestibule, layout.circulation.main) > 0,
      `${label}: entrance is disconnected from the rear passage`);
    assert.equal(layout.doors.entry, undefined, `${label}: entrance was added as a rear doorway`);
    for (const [name, r] of [
      ['desk', layout.desk.bounds], ['storage', layout.mainStorage.bounds],
      ['sofa', layout.lounge.sofa.bounds], ['television', layout.lounge.television.bounds],
      ...layout.stairs.flights.map((flight, index) => [`flight ${index + 1}`, flight.bounds]),
    ]) {
      assert.ok(overlap(entry.vestibule, r) < EPSILON, `${label}: ${name} blocks the front entrance`);
    }
  });
});

test('places seating left of the entrance with a shallow right-wall television beyond the vestibule', () => {
  verify((layout, label) => {
    const { sofa, television } = layout.lounge;
    assert.equal(sofa.side, 'left');
    assert.equal(sofa.orientation, 'right-facing');
    assert.ok(sofa.bounds.maxX < 0, `${label}: sofa is still beside the right entrance`);
    assert.ok(layout.desk.bounds.maxZ + 0.12 <= sofa.bounds.minZ + EPSILON,
      `${label}: left workstation does not fit behind the sofa`);
    assert.equal(television.side, 'right');
    assert.equal(television.wallMounted, true);
    assert.equal(television.floorConsole, false);
    assert.ok(television.bounds.minX > 0 && television.bounds.maxX <= layout.right,
      `${label}: television is not on the right wall`);
    assert.ok(television.bounds.maxX - television.bounds.minX <= 0.12 + EPSILON,
      `${label}: television fixture protrudes too far into the route`);
    assert.ok(layout.front - television.bounds.maxZ >= 1.1 - EPSILON,
      `${label}: television fixture extends into the entrance vestibule`);
  });
});

test('retains one straight left-rising stair flight that reaches the loft', () => {
  verify((layout, label) => {
    const flights = layout.stairs.flights;
    assert.equal(flights.length, 1, `${label}: the retained staircase has been replaced by a turning flight`);
    assert.equal(layout.stairs.landings.length, 0, `${label}: a new middle landing was introduced`);
    assert.equal(layout.stairs.retained, true);
    assert.ok(Math.abs(flights[0].bottom[1]) < EPSILON, `${label}: stair does not start at ground level`);
    assert.ok(Math.abs(flights.at(-1).top[1] - layout.loftHeight) < EPSILON,
      `${label}: stair does not reach the loft floor`);
    for (const flight of flights) {
      assert.ok(flight.steps > 1 && flight.top[1] > flight.bottom[1], `${label}: flight does not rise`);
      assert.ok(containsPoint(flight.bounds, flight.bottom) && containsPoint(flight.bounds, flight.top),
        `${label}: flight endpoints miss the tread footprint`);
      assert.ok(flight.top[0] < flight.bottom[0] && Math.abs(flight.top[2] - flight.bottom[2]) < EPSILON,
        `${label}: stair no longer rises across the house toward the left`);
    }
  });
});

test('cuts the complete stair opening from the loft without accidental floor gaps', () => {
  verify((layout, label) => {
    const floor = layout.loft.floorRects;
    const openings = layout.stairs.openingRects;
    for (const opening of openings) {
      assert.ok(area(opening) > 0 && contains(layout.zones.loft, opening), `${label}: opening leaves the loft`);
    }
    for (const [index, r] of floor.entries()) {
      assert.ok(area(r) > 0 && contains(layout.zones.loft, r), `${label}: invalid floor segment`);
      for (const opening of openings) assert.ok(overlap(r, opening) < EPSILON, `${label}: floor blocks a flight`);
      for (const other of floor.slice(index + 1)) assert.ok(overlap(r, other) < EPSILON, `${label}: slabs overlap`);
    }
    assert.ok(Math.abs(floor.reduce((sum, r) => sum + area(r), 0)
      - (area(layout.zones.loft) - unionArea(openings))) < EPSILON, `${label}: unexplained floor gap`);
  });
});

test('supports the upper landing and furniture without obstructing the stair exit', () => {
  verify((layout, label) => {
    const landing = layout.stairs.landing;
    const floor = layout.loft.floorRects;
    const upperFlight = layout.stairs.flights.at(-1);
    assert.ok(landing.minZ >= upperFlight.bounds.maxZ
      && landing.minZ - upperFlight.bounds.maxZ < 0.1, `${label}: upper landing is disconnected`);
    assert.ok(layout.stairs.top[0] >= landing.minX - EPSILON
      && layout.stairs.top[0] <= landing.maxX + EPSILON, `${label}: top step misses the exit`);
    for (const [name, r] of [['landing', landing], ['bed', layout.bed.bounds], ['wardrobe', layout.wardrobe.bounds]]) {
      assert.ok(Math.abs(floor.reduce((sum, slab) => sum + overlap(slab, r), 0) - area(r)) < EPSILON,
        `${label}: ${name} lacks floor support`);
    }
    assert.ok(overlap(layout.bed.bounds, landing) < EPSILON
      && overlap(layout.wardrobe.bounds, landing) < EPSILON, `${label}: furniture blocks the stair exit`);
    assert.ok(overlap(layout.bed.bounds, layout.wardrobe.bounds) < EPSILON, `${label}: bed overlaps wardrobe`);
  });
});

test('keeps the main passage clear of stair flights and ground-floor furniture', () => {
  verify((layout, label) => {
    const route = layout.circulation.main;
    assert.ok(area(route) > 0, `${label}: circulation route is missing`);
    for (const [name, r] of [
      ['desk', layout.desk.bounds], ['storage', layout.mainStorage.bounds],
      ['sofa', layout.lounge.sofa.bounds], ['television', layout.lounge.television.bounds],
      ...layout.stairs.flights.map((flight, index) => [`flight ${index + 1}`, flight.bounds]),
    ]) {
      assert.ok(overlap(route, r) < EPSILON, `${label}: ${name} blocks the main passage`);
    }
    for (const name of ['kitchen', 'bathroom']) {
      const door = layout.doors[name];
      const room = layout.zones[name];
      assert.ok(door.width > 0 && door.height > 0 && containsPoint(room, [door.x, 0, door.z]),
        `${label}: ${name} entrance misses its room`);
    }
  });
});

test('keeps inside camera eyes within the shell and outside tall furniture', () => {
  verify((layout, label) => {
    const shell = { minX: layout.left, maxX: layout.right, minZ: layout.rear, maxZ: layout.front };
    for (const [name, { position }] of Object.entries(layout.cameras)) {
      assert.ok(containsPoint(shell, position) && position[1] > 0
        && position[1] < layout.loftHeight + layout.upperHeight, `${label}: ${name} camera leaves the interior`);
      for (const [furniture, bounds, bottom, top] of [
        ['wardrobe', layout.wardrobe.bounds, layout.loftHeight, layout.loftHeight + layout.wardrobe.height],
        ['storage', layout.mainStorage.bounds, 0, layout.mainStorage.height],
      ]) {
        assert.ok(!(containsPoint(bounds, position) && position[1] > bottom && position[1] < top),
          `${label}: ${name} camera is inside the ${furniture}`);
      }
    }
  });
});
