import test from 'node:test';
import assert from 'node:assert/strict';
import { Box3 } from 'three';
import { getProposedLayout } from '../src/proposed-layout.js';
import { createProposedHouse } from '../src/proposed-house.js';

const configurations = [{}, { width: 3.2, depth: 9.5, loftHeight: 2, upperHeight: 1.8 }, { width: 5.5, depth: 12, loftHeight: 3.5, upperHeight: 3.5 }];
const overlap = (a, b) => Math.max(0, Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX))
  * Math.max(0, Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ));

test('backs both kitchen legs against existing walls without obstructing the approach', () => {
  for (const options of configurations) {
    const layout = getProposedLayout(options);
    const [side, rear] = layout.kitchen.counters.map(counter => counter.bounds);
    const wall = layout.stairs.sideWall.bounds;
    assert.ok(Math.abs(side.minX - (layout.left + 0.015)) < 0.004, 'left counter is detached from the wall');
    assert.ok(Math.abs(rear.minZ - wall.maxZ) < 0.004, 'hob counter is detached from the stair wall');
    assert.ok(rear.minX >= wall.minX && rear.maxX <= wall.maxX, 'hob counter extends beyond its backing wall');
    for (const route of layout.circulation.segments) for (const counter of [side, rear]) assert.ok(overlap(route, counter) < 1e-7, 'wall-backed kitchen obstructs the walking route');
  }
});

test('renders connected worktops and backsplashes at the actual wall surfaces', () => {
  const previousDocument = globalThis.document;
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: () => () => {} }) }) };
  try {
    for (const options of configurations) {
      const house = createProposedHouse(options);
      try {
        house.group.updateMatrixWorld(true);
        const wall = new Box3().setFromObject(house.walls.getObjectByName('left-wall').children[0]);
        const stairWall = new Box3().setFromObject(house.stairWall);
        const counter0 = house.group.getObjectByName('kitchen-counter-0');
        const counter1 = house.group.getObjectByName('kitchen-counter-1');
        const leftTop = new Box3().setFromObject(counter0.getObjectByName('kitchen-worktop'));
        const returnTop = new Box3().setFromObject(counter1.getObjectByName('kitchen-worktop'));
        assert.ok(Math.abs(leftTop.min.x - wall.max.x) < 0.004);
        assert.ok(Math.abs(returnTop.min.z - stairWall.max.z) < 0.004);
        assert.ok(Math.abs(returnTop.min.x - leftTop.max.x) < 1e-6, 'L worktops have a gap at their joint');
        assert.ok(house.group.getObjectByName('kitchen-left-backsplash'));
        assert.ok(house.group.getObjectByName('kitchen-rear-backsplash'));
      } finally { house.dispose(); }
    }
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});
