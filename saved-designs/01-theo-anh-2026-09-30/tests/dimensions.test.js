import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_DIMENSIONS, parseDimensions, loadDimensions } from '../src/dimensions.js';

test('preserves the two user-provided heights independently', () => {
  assert.equal(DEFAULT_DIMENSIONS.loftHeight, 2.5);
  assert.equal(DEFAULT_DIMENSIONS.upperHeight, 2.3);
  assert.equal(DEFAULT_DIMENSIONS.loftHeight + DEFAULT_DIMENSIONS.upperHeight, 4.8);
});

test('uses the confirmed ground-floor area and length instead of the initial estimate', () => {
  assert.equal(DEFAULT_DIMENSIONS.depth, 11);
  assert.ok(Math.abs(DEFAULT_DIMENSIONS.width * DEFAULT_DIMENSIONS.depth - 43) < 0.02);
});

test('accepts metric values including Vietnamese decimal commas', () => {
  assert.deepEqual(parseDimensions({ width: '3,8', depth: '9.2', loftHeight: '2,5', upperHeight: '2.3' }),
    { width: 3.8, depth: 9.2, loftHeight: 2.5, upperHeight: 2.3 });
});

test('rejects impossible, missing and non-numeric dimensions without partial updates', () => {
  for (const value of ['', 'NaN', 'Infinity', null, undefined, -1, 100]) {
    assert.throws(() => parseDimensions({ ...DEFAULT_DIMENSIONS, width: value }));
  }
});

test('restores valid saved measurements and recovers from damaged storage', () => {
  const edited = { width: 4, depth: 10, loftHeight: 2.7, upperHeight: 2.4 };
  assert.deepEqual(loadDimensions(JSON.stringify(edited)), edited);
  for (const data of [null, '{broken', '{}', '{"width":-10}', 'null']) {
    assert.deepEqual(loadDimensions(data), DEFAULT_DIMENSIONS);
  }
});
