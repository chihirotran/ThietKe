export const DEFAULT_DIMENSIONS = Object.freeze({ width: 3.91, depth: 11, loftHeight: 2.5, upperHeight: 2.3 });

const limits = {
  width: [3.2, 5.5], depth: [7.5, 12], loftHeight: [2, 3.5], upperHeight: [1.8, 3.5],
};

export function parseDimensions(input) {
  const dimensions = {};
  for (const [key, [min, max]] of Object.entries(limits)) {
    const raw = input?.[key];
    const value = typeof raw === 'string' ? Number(raw.trim().replace(',', '.')) : raw;
    if (raw === '' || typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
      throw new RangeError(`Invalid dimension: ${key}`);
    }
    dimensions[key] = Math.round(value * 100) / 100;
  }
  return dimensions;
}

export function loadDimensions(serialized) {
  try {
    return parseDimensions(JSON.parse(serialized));
  } catch {
    return { ...DEFAULT_DIMENSIONS };
  }
}
