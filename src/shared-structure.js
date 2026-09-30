import { DEFAULT_DIMENSIONS } from './dimensions.js';

export const SHARED_DIMENSION_LIMITS = Object.freeze({ width: [3.2, 5.5], depth: [9.5, 12], loftHeight: [2, 3.5], upperHeight: [1.8, 3.5] });
const rect = (minX, maxX, minZ, maxZ) => ({ minX, maxX, minZ, maxZ });
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function getSharedStructure(options = {}) {
  const { width, depth, loftHeight } = { ...DEFAULT_DIMENSIONS, ...options };
  const left = -width / 2, right = width / 2, front = depth / 2;
  const roomFront = -depth / 2 + clamp(depth * 0.2375, 1.8, 2.4);
  const utilityFront = roomFront + 2.35;
  const dividerX = left + Math.min(1.45, width * 0.42);
  const stairZ = utilityFront - 0.54;
  const stairBottomX = Math.min(right - 0.53, dividerX + 1.18) - 0.55;
  const stairTopX = left + 0.16;
  const stairWidth = 0.72;
  const bounds = rect(stairTopX, stairBottomX, stairZ - stairWidth / 2, stairZ + stairWidth / 2);
  const opening = rect(bounds.minX - 0.06, bounds.maxX + 0.06, bounds.minZ - 0.06, bounds.maxZ + 0.06);
  const landing = rect(opening.minX, opening.minX + 0.88, opening.maxZ, opening.maxZ + 0.85);
  const bottom = [stairBottomX, 0, stairZ], top = [stairTopX, loftHeight, stairZ];
  const steps = Math.max(12, Math.ceil(loftHeight / 0.2));
  const sideWall = { bounds: rect(left, bounds.maxX + 0.02, bounds.maxZ + 0.01, bounds.maxZ + 0.11), height: loftHeight, thicknessIsEstimate: true };
  const depthFactor = clamp((depth - 7.5) / 3.5, 0, 1);
  const livingSeatRear = front - 0.2 - 1.3 - 0.5 * depthFactor;
  const workFront = livingSeatRear - 0.15 + 0.57 * (1 - depthFactor);
  const previousFront = Math.max(livingSeatRear + 0.25, workFront + 0.08, landing.maxZ + 2.22);
  const back = opening.minZ - 0.1;
  const previousDepth = previousFront - back;
  const loftFront = back + previousDepth * 2 / 3;
  const loftBounds = rect(left + 0.03, right - 0.03, back, loftFront);
  const floorRects = [
    rect(loftBounds.minX, opening.minX, back, loftFront),
    rect(opening.maxX, loftBounds.maxX, back, loftFront),
    rect(opening.minX, opening.maxX, back, opening.minZ),
    rect(opening.minX, opening.maxX, opening.maxZ, loftFront),
  ];
  return {
    stairs: {
      bounds, opening, openingRects: [opening], landing, landings: [], width: stairWidth,
      direction: '-x', bottom, top, steps, retained: true, source: 'video', dimensionsEstimated: true, sideWall,
      flights: [{ bottom, top, steps, width: stairWidth, bounds }],
    },
    loft: { ...loftBounds, front: loftFront, back, height: loftHeight, floorRects, actualDepth: loftFront - back, requestedDepth: loftFront - back, previousDepth, depthScale: 2 / 3 },
  };
}
