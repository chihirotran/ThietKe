import test from 'node:test';
import assert from 'node:assert/strict';
import { Box3 } from 'three';
import { getTownhouseLayout } from '../src/townhouse-layout.js';
import { createTownhouseHouse } from '../src/townhouse-house.js';
import { canWalkAt, walk } from '../src/navigation.js';

const EPS = 1e-5;
const area = r => (r.maxX - r.minX) * (r.maxZ - r.minZ);
const overlap = (a, b) => Math.max(0, Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX))
  * Math.max(0, Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ));
const contains = (a, b) => b.minX >= a.minX - EPS && b.maxX <= a.maxX + EPS
  && b.minZ >= a.minZ - EPS && b.maxZ <= a.maxZ + EPS;
const footprint = box => ({ minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z });

function obstaclesFor(root, elevation, slab) {
  const obstacles = [];
  root.traverse(object => {
    if (!object.isMesh || object.userData.walkThrough) return;
    for (let ancestor = object.parent; ancestor && ancestor !== root; ancestor = ancestor.parent) {
      if (ancestor.userData.walkThrough || ancestor === slab) return;
    }
    if (object.name.includes('ceiling') || object.name.includes('floor-slab')) return;
    const box = new Box3().setFromObject(object);
    if (box.max.y > elevation + 0.15 && box.min.y < elevation + 1.72) obstacles.push(footprint(box));
  });
  return obstacles;
}

function reaches(world, start, target) {
  const step = 0.06, queue = [[0, 0]], visited = new Set(['0,0']);
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const [ix, iz] = queue[cursor];
    if (Math.hypot(start.x + ix * step - target.x, start.z + iz * step - target.z) < step) return true;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = [ix + dx, iz + dz], key = next.join(',');
      if (visited.has(key)) continue;
      visited.add(key);
      if (canWalkAt({ x: start.x + next[0] * step, z: start.z + next[1] * step }, world)) queue.push(next);
    }
  }
  return false;
}

test('adds three usable inset balconies within the measured footprint and outside bedroom furniture', () => {
  const layout = getTownhouseLayout();
  assert.deepEqual(layout.floors.filter(floor => floor.balcony).map(floor => floor.index), [1, 2, 3]);
  for (const floor of layout.floors.filter(item => item.balcony)) {
    const { bounds, door } = floor.balcony;
    assert.ok(bounds.maxX - bounds.minX >= 1.2 && bounds.maxZ - bounds.minZ >= 1.1,
      `floor ${floor.index}: the balcony is only a decorative ledge`);
    assert.ok(contains(layout.inner, bounds));
    assert.ok(door.width >= 0.85 && door.x - door.width / 2 >= bounds.minX
      && door.x + door.width / 2 <= bounds.maxX, `floor ${floor.index}: balcony door does not fit`);
    assert.ok(Math.abs(door.z - bounds.minZ) < EPS);
    assert.ok(floor.outdoorRects.length >= 1);
    for (const [index, outdoor] of floor.outdoorRects.entries()) {
      assert.ok(contains(layout.inner, outdoor));
      const supported = floor.floorRects.reduce((sum, slab) => sum + overlap(slab, outdoor), 0);
      assert.ok(Math.abs(supported - area(outdoor)) < EPS, `floor ${floor.index}: balcony lacks floor support`);
      for (const other of floor.outdoorRects.slice(index + 1)) assert.ok(overlap(outdoor, other) < EPS);
      for (const bedroom of floor.bedrooms) {
        for (const indoor of bedroom.roomRects) assert.ok(overlap(outdoor, indoor) < EPS,
          `${bedroom.id}: room area still counts the inset balcony as indoor space`);
        for (const occupied of [bedroom.bed, bedroom.desk.bounds, bedroom.desk.clearance, bedroom.wardrobe.bounds]) {
          assert.ok(overlap(outdoor, occupied) < EPS, `${bedroom.id}: balcony displaces bedroom furniture`);
        }
      }
    }
  }
});

test('renders balcony decks, guards and furnishings inside the building outline', () => {
  const house = createTownhouseHouse();
  try {
    house.group.updateMatrixWorld(true);
    const shell = { minX: house.layout.left, maxX: house.layout.right, minZ: house.layout.rear, maxZ: house.layout.front };
    for (const data of house.layout.floors.filter(item => item.balcony)) {
      const floor = house.floors[data.index], balcony = floor.furniture.getObjectByName('front-balcony');
      assert.ok(balcony, `floor ${data.index}: balcony disappears with the removable facade`);
      const decks = [];
      balcony.traverse(object => { if (object.name === 'balcony-deck') decks.push(footprint(new Box3().setFromObject(object))); });
      assert.ok(decks.length);
      const renderedArea = decks.reduce((sum, deck) => sum + area(deck), 0);
      assert.ok(Math.abs(renderedArea - data.outdoorRects.reduce((sum, rect) => sum + area(rect), 0)) < EPS,
        `floor ${data.index}: visible outdoor floor does not match its allocated area`);
      for (const deck of decks) assert.ok(contains(house.layout.inner, deck));
      assert.ok(contains(shell, footprint(new Box3().setFromObject(balcony))),
        `floor ${data.index}: balcony details extend beyond the measured plot`);
      for (const bedroom of data.bedrooms) {
        for (const suffix of ['bed', 'desk', 'desk-chair', 'wardrobe']) {
          const object = floor.furniture.getObjectByName(`${bedroom.id}-${suffix}`);
          assert.ok(object);
          const occupied = footprint(new Box3().setFromObject(object));
          for (const outdoor of data.outdoorRects) assert.ok(overlap(outdoor, occupied) < EPS,
            `${bedroom.id}: rendered ${suffix} projects into the balcony`);
        }
      }
      const guard = balcony.getObjectByName('balcony-guard');
      assert.ok(guard, `floor ${data.index}: balcony front has no guard`);
      const box = new Box3().setFromObject(guard);
      assert.ok(box.max.y - data.elevation >= 1 && box.min.z > data.balcony.bounds.minZ);
    }
  } finally { house.dispose(); }
});

test('provides a collision-free route through each balcony door from the stair landing', () => {
  const house = createTownhouseHouse();
  try {
    house.group.updateMatrixWorld(true);
    for (const data of house.layout.floors.filter(item => item.balcony)) {
      const floor = house.floors[data.index];
      const world = { floors: data.floorRects, obstacles: obstaclesFor(floor.group, data.elevation, floor.slab) };
      const [x, , z] = data.balcony.camera.position, target = { x, z };
      assert.ok(canWalkAt(target, world), `floor ${data.index}: balcony view starts in a planter, seat or glass panel`);
      assert.ok(reaches(world, { x: data.spawn[0], z: data.spawn[1] }, target),
        `floor ${data.index}: furniture or glazing blocks the balcony doorway`);
      const insideWorld = { ...world, floors: data.floorRects.map(rect => ({ ...rect, maxZ: Math.min(rect.maxZ, data.balcony.bounds.minZ - 0.02) })) };
      assert.equal(canWalkAt(target, insideWorld), false, `floor ${data.index}: balcony camera remains indoors`);
    }
  } finally { house.dispose(); }
});

test('prevents walking through balcony guards or off the exterior floor edge', () => {
  const house = createTownhouseHouse();
  try {
    house.group.updateMatrixWorld(true);
    for (const data of house.layout.floors.filter(item => item.balcony)) {
      const floor = house.floors[data.index], guard = floor.furniture.getObjectByName('balcony-guard');
      assert.ok(guard);
      const guardBox = new Box3().setFromObject(guard);
      const guardZ = (guardBox.min.z + guardBox.max.z) / 2;
      const extendedFloor = [{ ...house.layout.inner, maxZ: house.layout.front + 1 }];
      const guardWorld = { floors: extendedFloor, obstacles: obstaclesFor(guard, data.elevation) };
      assert.equal(canWalkAt({ x: data.balcony.door.x, z: guardZ }, guardWorld), false,
        `floor ${data.index}: guard has no collision barrier`);
      const world = { floors: data.floorRects, obstacles: obstaclesFor(floor.group, data.elevation, floor.slab) };
      const [x, y, z] = data.balcony.camera.position;
      let position = { x, y: y + data.elevation, z };
      for (let i = 0; i < 100; i++) position = walk(position, ['forward'], Math.PI, 0.08, world);
      assert.ok(canWalkAt(position, world));
      assert.ok(position.z <= house.layout.inner.maxZ - 0.14 + EPS,
        `floor ${data.index}: indoor movement escapes the balcony slab`);
    }
  } finally { house.dispose(); }
});
