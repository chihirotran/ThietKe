import test from 'node:test';
import assert from 'node:assert/strict';
import { getTownhouseLayout } from '../src/townhouse-layout.js';
import { canWalkAt } from '../src/navigation.js';
import { Box3 } from 'three';
import { createTownhouseHouse } from '../src/townhouse-house.js';

const EPS = 1e-6;
const area = r => (r.maxX - r.minX) * (r.maxZ - r.minZ);
const overlap = (a, b) => Math.max(0, Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX))
  * Math.max(0, Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ));
const contains = (outer, inner) => inner.minX >= outer.minX - EPS && inner.maxX <= outer.maxX + EPS
  && inner.minZ >= outer.minZ - EPS && inner.maxZ <= outer.maxZ + EPS;
const supportedArea = (floor, bounds) => floor.floorRects.reduce((sum, slab) => sum + overlap(slab, bounds), 0);
const footprint = box => ({ minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z });
const rectangleCenter = r => ({ x: (r.minX + r.maxX) / 2, z: (r.minZ + r.maxZ) / 2 });

function clearApproachPoints(chair, room, world) {
  const points = [];
  const center = rectangleCenter(chair);
  for (let x = Math.max(chair.minX - 0.4, room.minX + 0.15); x <= Math.min(chair.maxX + 0.4, room.maxX - 0.15); x += 0.06) {
    for (let z = Math.max(chair.minZ - 0.4, room.minZ + 0.15); z <= Math.min(chair.maxZ + 0.4, room.maxZ - 0.15); z += 0.06) {
      if (Math.hypot(x - center.x, z - center.z) < 0.7 && canWalkAt({ x, z }, world)) points.push({ x, z });
    }
  }
  return points;
}

function walkingWorld(floor, floorData) {
  const obstacles = [];
  floor.group.traverse(object => {
    if (!object.isMesh || object.userData.walkThrough) return;
    for (let ancestor = object.parent; ancestor && ancestor !== floor.group; ancestor = ancestor.parent) {
      if (ancestor.userData.walkThrough || ancestor === floor.slab) return;
    }
    if (object === floor.slab || object.name.includes('ceiling') || object.name.includes('floor-slab')) return;
    const box = new Box3().setFromObject(object);
    if (box.max.y <= floorData.elevation + 0.15 || box.min.y >= floorData.elevation + 1.72) return;
    obstacles.push(footprint(box));
  });
  return { floors: floorData.floorRects, obstacles };
}

function reaches(world, start, target) {
  const targets = Array.isArray(target) ? target : [target];
  const step = 0.06;
  const queue = [[0, 0]], visited = new Set(['0,0']);
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const [ix, iz] = queue[cursor];
    const position = { x: start.x + ix * step, z: start.z + iz * step };
    if (targets.some(point => Math.hypot(position.x - point.x, position.z - point.z) < step)) return true;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = [ix + dx, iz + dz], key = next.join(',');
      if (visited.has(key)) continue;
      visited.add(key);
      if (canWalkAt({ x: start.x + next[0] * step, z: start.z + next[1] * step }, world)) queue.push(next);
    }
  }
  return false;
}

test('adds five complete storeys on the measured footprint with explicit estimated heights', () => {
  const layout = getTownhouseLayout();
  assert.equal(layout.variant, 'townhouse');
  assert.equal(layout.storeys, 5);
  assert.equal(layout.floors.length, 5);
  assert.equal(layout.depth, 11);
  assert.ok(Math.abs(layout.width * layout.depth - 43) < 0.02);
  assert.equal(layout.grossFloorArea, layout.width * layout.depth * 5);
  assert.ok(layout.assumptions.some(note => note.includes('ước lượng')));
  let elevation = 0;
  for (const [index, floor] of layout.floors.entries()) {
    assert.equal(floor.index, index);
    assert.equal(floor.elevation, elevation);
    assert.ok(floor.height > 2.5);
    assert.ok(floor.name && floor.summary && floor.rooms.length);
    elevation += floor.height;
  }
  assert.equal(layout.totalHeight, elevation);
  assert.ok(layout.floors.slice(0, 4).every(floor => floor.stairs));
  assert.equal(layout.floors[4].stairs, null);
});

test('supports four beds for the family and keeps sleeping footprints away from the hob', () => {
  const layout = getTownhouseLayout();
  assert.equal(layout.bedroomCount, 4);
  assert.equal(layout.bedrooms.length, 4);
  assert.ok(layout.occupants >= 5 && layout.occupants <= 6);
  assert.equal(layout.bedrooms.filter(bedroom => bedroom.floor === 0).length, 1);
  for (const bedroom of layout.bedrooms) {
    const floor = layout.floors[bedroom.floor];
    assert.ok(floor.rooms.some(room => room.id === bedroom.id));
    assert.ok(contains(layout.inner, bedroom.room), `${bedroom.id}: room leaves the building`);
    assert.ok(contains(bedroom.room, bedroom.bed), `${bedroom.id}: bed leaves its room`);
    assert.ok(Math.abs(supportedArea(floor, bedroom.bed) - area(bedroom.bed)) < EPS,
      `${bedroom.id}: bed overlaps a shaft or stair opening`);
    assert.ok(overlap(bedroom.bed, layout.kitchen.hob.bounds) < EPS,
      `${bedroom.id}: sleeping footprint vertically overlaps the hob`);
  }
  const siblings = layout.bedrooms.filter(bedroom => bedroom.floor === 3);
  assert.equal(siblings.length, 2);
  assert.ok(overlap(siblings[0].room, siblings[1].room) < EPS);
});

test('cuts real shafts through the floor plates without duplicate slabs or unintended gaps', () => {
  const layout = getTownhouseLayout();
  assert.equal(layout.lightwell.openToSky, true);
  assert.ok(area(layout.lightwell.bounds) > 0.5);
  for (const floor of layout.floors) {
    const openings = [layout.elevator.bounds,
      ...(floor.index > 0 ? [layout.stairs.opening, layout.lightwell.bounds] : [])];
    for (const [index, slab] of floor.floorRects.entries()) {
      assert.ok(area(slab) > EPS && contains(layout.inner, slab));
      for (const hole of openings) assert.ok(overlap(slab, hole) < EPS,
        `floor ${floor.index}: slab covers an opening`);
      for (const other of floor.floorRects.slice(index + 1)) assert.ok(overlap(slab, other) < EPS,
        `floor ${floor.index}: slab areas overlap`);
    }
    const expected = area(layout.inner) - openings.reduce((sum, hole) => sum + area(hole), 0);
    assert.ok(Math.abs(floor.floorRects.reduce((sum, slab) => sum + area(slab), 0) - expected) < EPS,
      `floor ${floor.index}: floor plate contains an unintended gap`);
    assert.deepEqual(floor.elevator.bounds, layout.elevator.bounds);
    assert.deepEqual(floor.bathroom.bounds, layout.bathroom.bounds);
  }
});

test('provides continuous floor support from the front entrance to the rear stair arrival', () => {
  const layout = getTownhouseLayout();
  assert.ok(layout.entry.x > 0);
  assert.equal(layout.entry.z, layout.front);
  assert.ok(layout.entry.x - layout.entry.width / 2 > layout.inner.minX);
  assert.ok(layout.entry.x + layout.entry.width / 2 < layout.inner.maxX);
  const route = { minX: layout.stairs.arrival.minX, maxX: layout.inner.maxX,
    minZ: layout.stairs.arrival.minZ, maxZ: layout.inner.maxZ };
  assert.ok(route.maxX - route.minX >= 0.84);
  for (const floor of layout.floors) {
    assert.ok(Math.abs(supportedArea(floor, route) - area(route)) < EPS,
      `floor ${floor.index}: the through passage lacks floor support`);
    assert.ok(canWalkAt({ x: floor.spawn[0], z: floor.spawn[1] }, { floors: floor.floorRects, obstacles: [] }),
      `floor ${floor.index}: indoor spawn is over a void`);
    for (const bedroom of floor.bedrooms) assert.ok(overlap(route, bedroom.bed) < EPS,
      `floor ${floor.index}: a bed occupies the through passage`);
    assert.ok(overlap(route, floor.elevator.bounds) < EPS && overlap(route, floor.bathroom.bounds) < EPS);
  }
});

test('joins both stair flights through a half landing and leaves their upper arrival supported', () => {
  const layout = getTownhouseLayout();
  const stairs = layout.stairs;
  assert.equal(stairs.flights.length, 2);
  assert.equal(stairs.flights.reduce((count, flight) => count + flight.steps, 0), stairs.steps);
  assert.ok(Math.abs(stairs.steps * stairs.rise - layout.floorHeight) < EPS);
  assert.equal(stairs.flights[0].top[1], stairs.flights[1].bottom[1]);
  assert.equal(stairs.flights[1].top[1], layout.floorHeight);
  assert.equal(stairs.landing.maxX, stairs.flights[0].bounds.minX);
  assert.equal(stairs.landing.maxX, stairs.flights[1].bounds.minX);
  for (const flight of stairs.flights) assert.ok(contains(stairs.bounds, flight.bounds));
  for (const floor of layout.floors.slice(1)) assert.ok(Math.abs(supportedArea(floor, stairs.arrival) - area(stairs.arrival)) < EPS,
    `floor ${floor.index}: stair arrival falls into its opening`);
});

test('reduces the stair footprint while retaining two usable flights and full storey rise', () => {
  const layout = getTownhouseLayout();
  const stairs = layout.stairs;
  const previousArea = (layout.inner.maxX - layout.inner.minX) * 1.95;
  assert.ok(previousArea - area(stairs.bounds) >= 0.54, 'stair footprint does not free the proposed floor area');
  assert.ok(stairs.width >= 0.85, 'space savings narrow the stair flight');
  assert.equal(stairs.flights.length, 2);
  for (const flight of stairs.flights) {
    assert.equal(flight.steps, 9);
    assert.equal(flight.goings, 8);
    assert.ok((flight.bounds.maxX - flight.bounds.minX) / flight.goings >= 0.24,
      'treads are too shallow for the proposed compact arrangement');
    assert.ok(flight.bounds.maxZ - flight.bounds.minZ >= 0.85 - EPS);
  }
  assert.ok(Math.abs(stairs.rise * stairs.steps - layout.floorHeight) < EPS);
});

test('gives all four bedrooms a private desk with room for its chair', () => {
  const layout = getTownhouseLayout();
  const throughPassage = { minX: layout.stairs.arrival.minX, maxX: layout.inner.maxX,
    minZ: layout.stairs.arrival.minZ, maxZ: layout.inner.maxZ };
  for (const bedroom of layout.bedrooms) {
    const { desk } = bedroom;
    assert.ok(desk?.bounds && desk.clearance, `${bedroom.id}: no private workstation`);
    const sides = [desk.bounds.maxX - desk.bounds.minX, desk.bounds.maxZ - desk.bounds.minZ].sort((a, b) => a - b);
    assert.ok(sides[0] >= 0.5 - EPS && sides[1] >= 1 - EPS, `${bedroom.id}: desk is too small`);
    assert.ok(contains(bedroom.room, desk.bounds), `${bedroom.id}: desk is outside its private room`);
    assert.ok(contains(bedroom.room, desk.clearance), `${bedroom.id}: chair space is outside its private room`);
    for (const occupied of [desk.bounds, desk.clearance]) {
      assert.ok(overlap(occupied, bedroom.bed) < EPS, `${bedroom.id}: workstation conflicts with the bed`);
      assert.ok(overlap(occupied, bedroom.wardrobe.bounds) < EPS, `${bedroom.id}: workstation conflicts with storage`);
      if (bedroom.room.maxX < layout.inner.maxX) assert.ok(overlap(occupied, throughPassage) < EPS,
        `${bedroom.id}: workstation occupies the shared passage`);
      assert.ok(Math.abs(supportedArea(layout.floors[bedroom.floor], occupied) - area(occupied)) < EPS,
        `${bedroom.id}: workstation is over a floor opening`);
    }
  }
});

test('renders four desks and chairs inside their bedrooms with a clear route from the landing', () => {
  const house = createTownhouseHouse();
  try {
    house.group.updateMatrixWorld(true);
    for (const bedroom of house.layout.bedrooms) {
      const floor = house.floors[bedroom.floor], data = house.layout.floors[bedroom.floor];
      const workspace = floor.furniture.getObjectByName(`${bedroom.id}-desk`);
      assert.ok(workspace, `${bedroom.id}: private desk is absent from the model`);
      const desktop = workspace.getObjectByName('desk-surface');
      const chair = floor.furniture.getObjectByName(`${bedroom.id}-desk-chair`);
      assert.ok(desktop && chair, `${bedroom.id}: workstation lacks a desktop or chair`);
      const deskBox = new Box3().setFromObject(desktop), chairBox = new Box3().setFromObject(chair);
      const deskFootprint = footprint(deskBox), chairFootprint = footprint(chairBox);
      assert.ok(contains(bedroom.room, deskFootprint), `${bedroom.id}: rendered desk leaves the room`);
      assert.ok(contains(bedroom.room, chairFootprint), `${bedroom.id}: rendered chair leaves the room`);
      assert.ok(contains(bedroom.desk.clearance, chairFootprint), `${bedroom.id}: chair exceeds its allocated working space`);
      assert.ok(contains(bedroom.desk.bounds, deskFootprint), `${bedroom.id}: rendered desktop leaves its allocated space`);
      assert.ok(Math.abs(area(deskFootprint) - area(bedroom.desk.bounds)) < 1e-5,
        `${bedroom.id}: actual desktop does not match its planned size`);
      assert.ok(deskBox.min.y - data.elevation > 0.68 && deskBox.max.y - data.elevation < 0.82,
        `${bedroom.id}: tabletop is not at working height`);
      const bed = footprint(new Box3().setFromObject(floor.furniture.getObjectByName(`${bedroom.id}-bed`)));
      for (const part of [deskFootprint, chairFootprint]) {
        assert.ok(overlap(part, bed) < EPS, `${bedroom.id}: real chair or desk intersects the bed`);
        floor.furniture.traverse(object => {
          if (object.name !== 'wardrobe') return;
          assert.ok(overlap(part, footprint(new Box3().setFromObject(object))) < EPS,
            `${bedroom.id}: real chair or desk intersects a wardrobe`);
        });
      }
      const world = walkingWorld(floor, data);
      const approaches = clearApproachPoints(chairFootprint, bedroom.room, world);
      assert.ok(approaches.length, `${bedroom.id}: no standing space remains beside the desk chair`);
      assert.ok(reaches(world, { x: data.spawn[0], z: data.spawn[1] }, approaches),
        `${bedroom.id}: no collision-free route from the landing to the workstation`);
    }
  } finally { house.dispose(); }
});

test('renders the planned shafts, beds and four stair connections in actual model geometry', () => {
  const house = createTownhouseHouse();
  try {
    house.group.updateMatrixWorld(true);
    const renderedHob = footprint(new Box3().setFromObject(house.group.getObjectByName('kitchen-hob')));
    assert.ok(area(renderedHob) > 0);
    let bedCount = 0;
    for (const [index, floor] of house.floors.entries()) {
      const expected = house.layout.floors[index];
      assert.equal(floor.group.position.y, expected.elevation);
      const slabs = floor.slab.children.map(mesh => footprint(new Box3().setFromObject(mesh)));
      assert.equal(slabs.length, expected.floorRects.length);
      assert.ok(Math.abs(slabs.reduce((sum, slab) => sum + area(slab), 0)
        - expected.floorRects.reduce((sum, slab) => sum + area(slab), 0)) < 1e-5);
      const openings = [house.layout.elevator.bounds,
        ...(index ? [house.layout.stairs.opening, house.layout.lightwell.bounds] : [])];
      for (const slab of slabs) for (const hole of openings) assert.ok(overlap(slab, hole) < 1e-5,
        `floor ${index}: rendered slab covers a shaft`);
      assert.ok(floor.group.getObjectByName('lightwell-enclosure'));
      assert.ok(floor.group.getObjectByName('elevator-shaft'));
      let treads = 0;
      const risers = [];
      floor.stairs.traverse(mesh => {
        if (mesh.name === 'townhouse-stair-tread') treads++;
        if (mesh.name === 'townhouse-stair-riser') risers.push(new Box3().setFromObject(mesh));
      });
      assert.equal(treads, index < 4 ? house.layout.stairs.flights.reduce((sum, flight) => sum + flight.goings, 0) : 0);
      assert.equal(risers.length, index < 4 ? house.layout.stairs.steps : 0);
      if (risers.length) {
        assert.ok(Math.abs(Math.min(...risers.map(box => box.min.y)) - expected.elevation) < 1e-5);
        assert.ok(Math.abs(Math.max(...risers.map(box => box.max.y)) - expected.elevation - expected.height) < 1e-5,
          `floor ${index}: the final stair riser does not reach the next storey`);
      }
      floor.furniture.traverse(object => {
        if (!object.userData.bed) return;
        bedCount++;
        const bed = footprint(new Box3().setFromObject(object));
        assert.ok(overlap(bed, renderedHob) < EPS, 'rendered bed is vertically above the hob');
        assert.ok(Math.abs(supportedArea(expected, bed) - area(bed)) < 1e-5, 'rendered bed overhangs a floor opening');
      });
    }
    assert.equal(bedCount, 4);
  } finally { house.dispose(); }
});

test('keeps every indoor starting point and the core passage clear of rendered walls and furniture', () => {
  const house = createTownhouseHouse();
  try {
    house.group.updateMatrixWorld(true);
    for (const [index, floor] of house.floors.entries()) {
      const data = house.layout.floors[index];
      const world = walkingWorld(floor, data);
      assert.ok(canWalkAt({ x: data.spawn[0], z: data.spawn[1] }, world), `floor ${index}: indoor spawn collides`);
      for (let z = -5.1; z <= -0.95; z += 0.1) assert.ok(canWalkAt({ x: 1.3, z }, world),
        `floor ${index}: core passage blocked near z=${z.toFixed(2)}`);
      for (const hole of [house.layout.elevator.bounds, ...(index ? [house.layout.lightwell.bounds] : [])]) {
        assert.equal(canWalkAt({ x: (hole.minX + hole.maxX) / 2, z: (hole.minZ + hole.maxZ) / 2 }, world), false);
      }
    }
  } finally { house.dispose(); }
});

test('allows a person to reach the shower through the bathroom doorway and fixtures', () => {
  const house = createTownhouseHouse();
  try {
    house.group.updateMatrixWorld(true);
    for (const [index, floor] of house.floors.entries()) {
      const data = house.layout.floors[index];
      const world = walkingWorld(floor, data);
      assert.ok(reaches(world, { x: data.spawn[0], z: data.spawn[1] }, { x: 0.5, z: -2.94 }),
        `floor ${index}: fixtures prevent access to the shower`);
    }
  } finally { house.dispose(); }
});

test('starts the featured room views outside furniture and walls', () => {
  const house = createTownhouseHouse();
  try {
    house.group.updateMatrixWorld(true);
    const roomIds = ['entry', 'living', 'master', 'bedroom-front', 'terrace'];
    for (const [index, floor] of house.floors.entries()) {
      const data = house.layout.floors[index];
      const room = data.rooms.find(item => item.id === roomIds[index]);
      const [x, , z] = room.camera.position;
      assert.ok(canWalkAt({ x, z }, walkingWorld(floor, data)), `${room.id}: featured view begins inside an obstacle`);
    }
  } finally { house.dispose(); }
});
