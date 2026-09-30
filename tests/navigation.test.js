import test from 'node:test';
import assert from 'node:assert/strict';
import { walk, canWalkAt } from '../src/navigation.js';

const room = { minX: -2, maxX: 2, minZ: -5, maxZ: 5 };
const world = { floors: [room], obstacles: [] };
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8);

test('walks relative to heading without changing eye height', () => {
  const start = { x: 0, y: 1.6, z: 0 };
  const north = walk(start, ['forward'], 0, 0.05, world);
  assert.ok(north.z < 0);
  near(north.x, 0);
  near(north.y, 1.6);
  const east = walk(start, ['forward'], Math.PI / 2, 0.05, world);
  near(east.x, -north.z);
  near(east.z, 0);
  const right = walk(start, ['right'], Math.PI / 2, 0.05, world);
  near(right.z, -north.z);
});

test('diagonal movement has the same speed and opposite keys cancel', () => {
  const start = { x: 0, y: 1.6, z: 0 };
  const straight = walk(start, ['forward'], 0, 0.05, world);
  const diagonal = walk(start, ['forward', 'right'], 0, 0.05, world);
  near(Math.hypot(diagonal.x, diagonal.z), -straight.z);
  assert.deepEqual(walk(start, ['forward', 'backward'], 0, 0.05, world), start);
});

test('stops at the house boundary and slides along obstacles', () => {
  const bounded = { ...world, obstacles: [{ minX: -0.2, maxX: 0.2, minZ: -3, maxZ: 3 }] };
  const start = { x: 0.35, y: 1.6, z: 0 };
  const next = walk(start, ['forward', 'left'], 0, 0.05, bounded);
  near(next.x, start.x);
  assert.ok(next.z < start.z);
  const edge = walk({ x: 1.85, y: 1.6, z: 0 }, ['right'], 0, 0.08, world);
  assert.ok(edge.x <= 1.86);
});

test('cannot step off the loft or into its stair opening', () => {
  const loft = { floors: [
    { minX: -2, maxX: 2, minZ: 0, maxZ: 2 },
    { minX: 0.2, maxX: 2, minZ: -2, maxZ: 0 },
  ], obstacles: [] };
  assert.equal(canWalkAt({ x: -1, z: -0.2 }, loft), false);
  assert.equal(canWalkAt({ x: 1, z: 0 }, loft), true);
  const edge = { x: -1, y: 3.85, z: 0.15 };
  assert.deepEqual(walk(edge, ['forward'], 0, 0.05, loft), edge);
});

test('caps a delayed frame and remains frame-rate independent', () => {
  const start = { x: 0, y: 1.6, z: 0 };
  const once = walk(start, ['forward'], 0, 0.08, world);
  let twice = walk(start, ['forward'], 0, 0.04, world);
  twice = walk(twice, ['forward'], 0, 0.04, world);
  near(once.z, twice.z);
  assert.deepEqual(walk(start, ['forward'], 0, 10, world), once);
  assert.deepEqual(walk(start, [], 0, 0.08, world), start);
});
