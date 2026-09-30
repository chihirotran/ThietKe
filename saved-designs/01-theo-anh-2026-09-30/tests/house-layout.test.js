import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_DIMENSIONS } from '../src/dimensions.js';
import { getHouseLayout } from '../src/layout.js';

const EPSILON = 1e-7;
const configurations = [
  DEFAULT_DIMENSIONS,
  { width: 3.2, depth: 7.5, loftHeight: 2, upperHeight: 1.8 },
  { width: 5.5, depth: 12, loftHeight: 3.5, upperHeight: 3.5 },
].flatMap(dimensions => [1, 2].map(occupants => ({ ...dimensions, occupants })));

const area = rect => (rect.maxX - rect.minX) * (rect.maxZ - rect.minZ);
const overlap = (a, b) => Math.max(0, Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX))
  * Math.max(0, Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ));
const contains = (outer, inner) => inner.minX >= outer.minX - EPSILON
  && inner.maxX <= outer.maxX + EPSILON && inner.minZ >= outer.minZ - EPSILON
  && inner.maxZ <= outer.maxZ + EPSILON;

function verifyConfigurations(check) {
  for (const options of configurations) {
    const label = `${options.width} × ${options.depth} m, ${options.occupants} occupants`;
    check(getHouseLayout(options), label);
  }
}

test('extends the full-width loft over the main storage and part of the workstation', () => {
  verifyConfigurations((layout, label) => {
    assert.ok(layout.mainStorage && layout.desk, `${label}: target storage and workstation layout is missing`);
    const storage = layout.mainStorage.bounds;
    const desk = layout.desk.bounds;
    const floor = layout.loft.floorRects;
    const storageCover = floor.reduce((sum, rect) => sum + overlap(rect, storage), 0);
    assert.ok(Math.abs(storageCover - area(storage)) < EPSILON, `${label}: main storage is not fully under the loft`);
    assert.ok(floor.reduce((sum, rect) => sum + overlap(rect, desk), 0) > 0,
      `${label}: loft no longer covers part of the workstation`);
    const frontStrip = { ...layout.zones.loft, minZ: layout.loft.front - 0.08 };
    const frontCover = floor.reduce((sum, rect) => sum + overlap(rect, frontStrip), 0);
    assert.ok(Math.abs(frontCover - area(frontStrip)) < EPSILON,
      `${label}: front edge has a notch instead of a continuous full-width platform`);
    assert.ok(layout.stairs.opening.maxZ < storage.minZ, `${label}: stair opening has moved into the main storage area`);
  });
});

test('places the bed across the house with its head left and wardrobe clear on the right', () => {
  verifyConfigurations((layout, label) => {
    const bed = layout.bed.bounds;
    const wardrobe = layout.wardrobe.bounds;
    assert.ok(bed.maxX - bed.minX > bed.maxZ - bed.minZ, `${label}: bed still runs along the house`);
    assert.ok(layout.bed.head[0] < layout.bed.foot[0]
      && Math.abs(layout.bed.head[2] - layout.bed.foot[2]) < EPSILON, `${label}: bed head is not on the left`);
    assert.ok(wardrobe.minX > bed.maxX && overlap(bed, wardrobe) < EPSILON,
      `${label}: right wardrobe intersects the bed`);
  });
});

test('keeps a right-side route from the main room to both rear doorways', () => {
  verifyConfigurations((layout, label) => {
    assert.ok(layout.circulation?.main, `${label}: right-side main corridor is missing`);
    const route = layout.circulation.main;
    const storage = layout.mainStorage.bounds;
    const desk = layout.desk.bounds;
    assert.ok(area(route) > 0 && contains(layout.zones.living, route), `${label}: main route leaves the room`);
    for (const [name, rect] of [['storage', storage], ['desk', desk]]) {
      assert.ok(contains(layout.zones.living, rect), `${label}: ${name} extends outside the main room`);
      assert.ok(overlap(rect, route) < EPSILON, `${label}: ${name} blocks the right corridor`);
    }
    assert.ok(storage.maxX <= route.minX, `${label}: corridor is not to the right of storage`);
    assert.ok(overlap(storage, desk) < EPSILON, `${label}: desk and storage occupy the same floor area`);
    for (const door of [layout.doors.utility, layout.doors.kitchen]) {
      assert.ok(door.x - door.width / 2 >= route.minX - EPSILON && door.x + door.width / 2 <= route.maxX + EPSILON,
        `${label}: rear doorway is not aligned with the main corridor`);
    }
  });
});

test('preserves the utility area between two sequential doorways on the kitchen sightline', () => {
  verifyConfigurations((layout, label) => {
    const { living, utility, kitchen, bathroom } = layout.zones;
    const entrance = layout.doors.utility;
    const kitchenDoor = layout.doors.kitchen;
    assert.ok(utility && area(utility) > 0 && entrance, `${label}: intermediate utility area is missing`);
    assert.ok(entrance.z > kitchenDoor.z, `${label}: the two doorways collapse into one plane`);
    assert.ok(Math.abs(entrance.z - utility.maxZ) < EPSILON
      && Math.abs(kitchenDoor.z - utility.minZ) < EPSILON, `${label}: utility area is not between the two doorways`);
    assert.ok(overlap(utility, living) < EPSILON && overlap(utility, kitchen) < EPSILON
      && overlap(utility, bathroom) < EPSILON, `${label}: utility area overlaps a separate room`);
    const sharedWidth = Math.min(entrance.x + entrance.width / 2, kitchenDoor.x + kitchenDoor.width / 2)
      - Math.max(entrance.x - entrance.width / 2, kitchenDoor.x - kitchenDoor.width / 2);
    assert.ok(sharedWidth > Math.min(entrance.width, kitchenDoor.width) * 0.6,
      `${label}: sequential doors do not preserve the kitchen sightline`);
  });
});

test('keeps the staircase left of the kitchen approach and rising across the house toward the left', () => {
  verifyConfigurations((layout, label) => {
    const { bounds, bottom, top } = layout.stairs;
    const door = layout.doors.kitchen;
    assert.ok(bounds.maxX < door.x - door.width / 2, `${label}: stair crosses the doorway width`);
    assert.ok(bounds.minZ > door.z + door.dividerThickness / 2, `${label}: stair extends behind the rear doorway`);
    assert.ok(top[1] > bottom[1] && top[0] < bottom[0], `${label}: stair does not rise toward the left wall`);
    assert.ok(Math.abs(top[2] - bottom[2]) < EPSILON, `${label}: stair runs along the house instead of across it`);
    assert.ok(Math.abs(top[1] - layout.loft.height) < EPSILON, `${label}: stair misses the loft level`);
  });
});

test('leaves an uninterrupted stair opening without overlapping or missing loft floor segments', () => {
  verifyConfigurations((layout, label) => {
    const { opening, bounds } = layout.stairs;
    const { floorRects } = layout.loft;
    assert.ok(contains(layout.zones.loft, opening), `${label}: stair opening leaves the loft footprint`);
    assert.ok(contains(opening, bounds), `${label}: slab covers part of the stair run`);
    for (const [index, rect] of floorRects.entries()) {
      assert.ok(area(rect) > 0 && contains(layout.zones.loft, rect), `${label}: invalid floor segment`);
      assert.ok(overlap(rect, opening) < EPSILON, `${label}: slab blocks the stair opening`);
      for (const other of floorRects.slice(index + 1)) {
        assert.ok(overlap(rect, other) < EPSILON, `${label}: floor segments overlap`);
      }
    }
    const expected = area(layout.zones.loft) - area(opening);
    assert.ok(Math.abs(floorRects.reduce((sum, rect) => sum + area(rect), 0) - expected) < EPSILON,
      `${label}: loft has an unintended floor gap`);
  });
});

test('provides a supported landing toward the living room and keeps furniture clear of the route', () => {
  verifyConfigurations((layout, label) => {
    const { landing, bounds, opening, top } = layout.stairs;
    const support = layout.loft.floorRects.reduce((sum, rect) => sum + overlap(rect, landing), 0);
    assert.ok(Math.abs(support - area(landing)) < EPSILON, `${label}: landing lacks floor support`);
    assert.ok(landing.minZ >= bounds.maxZ && landing.minZ - bounds.maxZ <= 0.1,
      `${label}: landing is disconnected from the stair side`);
    assert.ok(top[0] > landing.minX && top[0] < landing.maxX, `${label}: top step misses the landing`);
    for (const [name, rect] of [['bed', layout.bed.bounds], ['wardrobe', layout.wardrobe.bounds]]) {
      assert.ok(contains(layout.zones.loft, rect) && area(rect) > 0, `${label}: ${name} is outside the loft`);
      assert.ok(overlap(rect, opening) < EPSILON, `${label}: ${name} blocks the stair opening`);
      assert.ok(overlap(rect, landing) < EPSILON, `${label}: ${name} blocks the landing`);
    }
  });
});

test('keeps the bathroom left of the kitchen with both rooms opening into the utility area', () => {
  verifyConfigurations((layout, label) => {
    const { kitchen, bathroom } = layout.zones;
    const kitchenDoor = layout.doors.kitchen;
    const bathroomDoor = layout.doors.bathroom;
    assert.ok(area(kitchen) > 0 && area(bathroom) > 0, `${label}: a rear room is missing`);
    assert.ok(bathroom.maxX <= kitchen.minX && overlap(kitchen, bathroom) < EPSILON,
      `${label}: bathroom is not separately to the left of the kitchen`);
    assert.ok(Math.abs(kitchenDoor.z - kitchen.maxZ) < EPSILON,
      `${label}: rear entrance does not enter the kitchen`);
    assert.ok(kitchenDoor.x - kitchenDoor.width / 2 > kitchen.minX
      && kitchenDoor.x + kitchenDoor.width / 2 < kitchen.maxX, `${label}: kitchen doorway clips a side wall`);
    assert.equal(bathroomDoor.axis, 'x', `${label}: bathroom still opens through the kitchen divider`);
    assert.ok(Math.abs(bathroomDoor.z - bathroom.maxZ) < EPSILON
      && Math.abs(bathroomDoor.z - layout.zones.utility.minZ) < EPSILON,
    `${label}: bathroom does not open directly into the utility area`);
    assert.ok(bathroomDoor.x - bathroomDoor.width / 2 > bathroom.minX
      && bathroomDoor.x + bathroomDoor.width / 2 < bathroom.maxX, `${label}: bathroom doorway clips a side wall`);
  });
});

test('keeps the washer and wash counter in the left utility area clear of stairs and kitchen passage', () => {
  verifyConfigurations((layout, label) => {
    const washer = layout.fixtures.washer.bounds;
    const counter = layout.fixtures.washCounter.bounds;
    const kitchenDoor = layout.doors.kitchen;
    for (const [name, rect] of [['washer', washer], ['wash counter', counter]]) {
      assert.ok(area(rect) > 0 && contains(layout.zones.utility, rect), `${label}: ${name} leaves the utility area`);
      assert.ok(rect.maxX < kitchenDoor.x - kitchenDoor.width / 2, `${label}: ${name} blocks the kitchen approach`);
      assert.ok(overlap(rect, layout.stairs.bounds) < EPSILON, `${label}: ${name} intersects the stair footprint`);
      assert.ok(overlap(rect, layout.zones.kitchen) < EPSILON, `${label}: ${name} has moved inside the kitchen`);
    }
    assert.ok(overlap(washer, counter) < EPSILON, `${label}: washer and counter occupy the same space`);
  });
});

test('places rear camera presets inside their room or aims them through an access opening', () => {
  verifyConfigurations((layout, label) => {
    for (const zone of ['utility', 'kitchen', 'bathroom']) {
      assert.ok(layout.cameras[zone], `${label}: ${zone} camera preset is missing`);
      const { position, target } = layout.cameras[zone];
      const door = layout.doors[zone];
      const room = layout.zones[zone];
      const inRoom = point => point[0] > room.minX && point[0] < room.maxX
        && point[2] > room.minZ && point[2] < room.maxZ;
      if (inRoom(position)) continue;
      assert.ok(inRoom(target), `${label}: ${zone} camera neither enters nor targets its room`);
      const normalAxis = door.axis === 'x' ? 2 : 0;
      const openingAxis = door.axis === 'x' ? 0 : 2;
      const plane = door.axis === 'x' ? door.z : door.x;
      const center = door.axis === 'x' ? door.x : door.z;
      const fraction = (plane - position[normalAxis]) / (target[normalAxis] - position[normalAxis]);
      assert.ok(fraction > 0 && fraction < 1, `${label}: ${zone} camera does not look through the doorway`);
      const crossing = position[openingAxis] + fraction * (target[openingAxis] - position[openingAxis]);
      const eyeHeight = position[1] + fraction * (target[1] - position[1]);
      assert.ok(Math.abs(crossing - center) < door.width / 2 - 0.03,
        `${label}: ${zone} camera aims at the partition instead of the opening`);
      assert.ok(eyeHeight > 0 && eyeHeight < door.height, `${label}: ${zone} camera aims above the doorway`);
    }
  });
});
