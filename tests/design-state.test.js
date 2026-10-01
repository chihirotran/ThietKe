import test from 'node:test';
import assert from 'node:assert/strict';
import { designStorageKey, loadDesignSettings, resolveDesign } from '../src/designs.js';

test('keeps saved-reference and modern settings in separate storage records', () => {
  const storage = new Map();
  const reference = loadDesignSettings(null);
  const modern = loadDesignSettings(null);
  modern.dimensions.width = 4.2;
  modern.palette = 'walnut';
  modern.occupants = 2;
  storage.set(designStorageKey('reference'), JSON.stringify(reference));
  storage.set(designStorageKey('modern'), JSON.stringify(modern));
  assert.equal(storage.size, 2);
  assert.deepEqual(loadDesignSettings(storage.get(designStorageKey('reference'))), reference);
  assert.equal(loadDesignSettings(storage.get(designStorageKey('modern'))).dimensions.width, 4.2);
  assert.equal(reference.dimensions.width, 3.91);
});

test('recovers invalid settings and rejects unknown design identifiers', () => {
  assert.equal(resolveDesign('reference'), 'reference');
  assert.equal(resolveDesign('missing'), 'proposed');
  const defaults = loadDesignSettings(null);
  assert.deepEqual(loadDesignSettings('{broken'), defaults);
  assert.deepEqual(loadDesignSettings(JSON.stringify({ dimensions: { width: -3 }, occupants: 8, palette: 'missing' })), defaults);
});

test('keeps the proposed floor plan independent from both previous designs', () => {
  const keys = ['reference', 'modern', 'proposed'].map(designStorageKey);
  assert.equal(new Set(keys).size, 3);
  assert.equal(resolveDesign('proposed'), 'proposed');
  const previous = loadDesignSettings(null);
  const proposed = loadDesignSettings(null);
  proposed.dimensions.depth = 10;
  assert.equal(previous.dimensions.depth, 11);
});

test('recognizes the five-storey design without overwriting the three saved alternatives', () => {
  assert.equal(resolveDesign('townhouse'), 'townhouse');
  const designs = ['reference', 'modern', 'proposed', 'townhouse'];
  assert.equal(new Set(designs.map(designStorageKey)).size, 4);
  const storage = new Map(designs.map(design => [designStorageKey(design), JSON.stringify(loadDesignSettings(null))]));
  const previous = designs.slice(0, 3).map(design => storage.get(designStorageKey(design)));
  const townhouse = loadDesignSettings(storage.get(designStorageKey('townhouse')));
  townhouse.palette = 'walnut';
  townhouse.warmLight = false;
  storage.set(designStorageKey('townhouse'), JSON.stringify(townhouse));
  assert.deepEqual(designs.slice(0, 3).map(design => storage.get(designStorageKey(design))), previous);
  assert.equal(loadDesignSettings(storage.get(designStorageKey('townhouse'))).palette, 'walnut');
  assert.equal(loadDesignSettings(storage.get(designStorageKey('townhouse'))).warmLight, false);
});
