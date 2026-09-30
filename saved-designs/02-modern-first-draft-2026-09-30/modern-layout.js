import { getHouseLayout } from './layout.js';

const rect = (minX, maxX, minZ, maxZ) => ({ minX, maxX, minZ, maxZ });
const area = r => (r.maxX - r.minX) * (r.maxZ - r.minZ);
const contains = (r, x, z) => x > r.minX && x < r.maxX && z > r.minZ && z < r.maxZ;

function floorAround(bounds, openings) {
  const xs = [...new Set([bounds.minX, bounds.maxX, ...openings.flatMap(r => [r.minX, r.maxX])])].sort((a, b) => a - b);
  const zs = [...new Set([bounds.minZ, bounds.maxZ, ...openings.flatMap(r => [r.minZ, r.maxZ])])].sort((a, b) => a - b);
  const result = [];
  for (let x = 0; x < xs.length - 1; x++) {
    for (let z = 0; z < zs.length - 1; z++) {
      const cx = (xs[x] + xs[x + 1]) / 2;
      const cz = (zs[z] + zs[z + 1]) / 2;
      if (contains(bounds, cx, cz) && !openings.some(r => contains(r, cx, cz))) result.push(rect(xs[x], xs[x + 1], zs[z], zs[z + 1]));
    }
  }
  return result;
}

export function getModernLayout(options = {}) {
  const original = getHouseLayout({ ...options, occupants: options.occupants ?? 1 });
  const { left, right, front, loftHeight, upperHeight } = original;
  const doorLeft = original.doors.utility.x - original.doors.utility.width / 2;
  const stairWidth = 0.8;
  const upperStartX = Math.min(left + 2.125, doorLeft - 0.08 - stairWidth);
  const upperEndX = left + 0.1;
  const lowerCenterX = upperStartX + stairWidth / 2;
  const midY = loftHeight * 6 / 14;
  const lowerBounds = rect(upperStartX, upperStartX + stairWidth, -0.3, 1.2);
  const upperBounds = rect(upperEndX, upperStartX, -1.1, -0.3);
  const middleLanding = rect(upperStartX, upperStartX + stairWidth, -1.1, -0.3);
  const upperOpening = rect(upperEndX - 0.045, middleLanding.maxX + 0.045, -1.145, -0.255);
  const lowerOpening = rect(lowerBounds.minX - 0.045, lowerBounds.maxX + 0.045, upperOpening.maxZ, lowerBounds.maxZ + 0.045);
  const openingRects = [upperOpening, lowerOpening];
  const opening = rect(upperOpening.minX, upperOpening.maxX, upperOpening.minZ, lowerOpening.maxZ);
  const landing = rect(upperEndX, upperEndX + stairWidth, upperOpening.maxZ, upperOpening.maxZ + 0.85);
  const loftFront = Math.min(3.05, front - 0.9);
  const loftBack = Math.min(original.loft.back, upperOpening.minZ - 0.18);
  const loftBounds = rect(left + 0.03, right - 0.03, loftBack, loftFront);
  const floorRects = floorAround(loftBounds, openingRects);
  const bedWidth = Math.min(1.35, lowerOpening.minX - 0.12 - (left + 0.13));
  const bed = rect(left + 0.13, left + 0.13 + bedWidth, landing.maxZ + 0.09, landing.maxZ + 2.09);
  const wardrobe = rect(right - 0.65, right - 0.08, 1.44, loftFront - 0.12);
  const deskLength = Math.min(1.8, Math.max(1.25, front - 3.1));
  const deskCenter = Math.min(1.8, front - 2.3);
  const desk = rect(left + 0.07, left + 0.77, deskCenter - deskLength / 2, deskCenter + deskLength / 2);
  const storage = rect(left + 0.08, left + 0.67, 0.05, 0.78);
  const sofa = rect(right - 0.85, right - 0.08, front - 2.15, front - 0.35);
  const tvCenter = Math.max(front - 1.25, desk.maxZ + 0.65);
  const tv = rect(left + 0.055, left + 0.42, tvCenter - 0.55, tvCenter + 0.55);
  const circulation = rect(doorLeft + 0.015, right - 0.08, original.roomFront, Math.min(sofa.minZ - 0.12, loftFront));
  const originalGross = area(original.loft);
  const originalUsable = original.loft.floorRects.reduce((sum, r) => sum + area(r), 0);
  const usable = floorRects.reduce((sum, r) => sum + area(r), 0);
  return {
    ...original,
    variant: 'modern',
    zones: { ...original.zones, loft: loftBounds, stairs: rect(upperBounds.minX, lowerBounds.maxX, upperBounds.minZ, lowerBounds.maxZ) },
    loft: { ...loftBounds, front: loftFront, back: loftBack, height: loftHeight, floorRects, actualDepth: loftFront - loftBack, requestedDepth: loftFront - loftBack },
    stairs: {
      bounds: rect(upperBounds.minX, lowerBounds.maxX, upperBounds.minZ, lowerBounds.maxZ),
      opening, openingRects, landing, landings: [{ ...middleLanding, height: midY }], width: stairWidth, steps: 14,
      direction: 'L', bottom: [lowerCenterX, 0, 1.2], top: [upperEndX, loftHeight, -0.7],
      flights: [
        { bottom: [lowerCenterX, 0, 1.2], top: [lowerCenterX, midY, -0.3], steps: 6, width: stairWidth, bounds: lowerBounds },
        { bottom: [upperStartX, midY, -0.7], top: [upperEndX, loftHeight, -0.7], steps: 8, width: stairWidth, bounds: upperBounds },
      ],
    },
    bed: { bounds: bed, width: bedWidth, length: 2, axis: 'z', direction: '+z', head: [(bed.minX + bed.maxX) / 2, loftHeight, bed.minZ], foot: [(bed.minX + bed.maxX) / 2, loftHeight, bed.maxZ] },
    wardrobe: { bounds: wardrobe, height: upperHeight - 0.16 },
    mainStorage: { bounds: storage, height: loftHeight - 0.27, shelfWidth: 0 },
    desk: { bounds: desk, center: deskCenter, length: deskLength, monitors: 2 },
    lounge: { sofa: { bounds: sofa }, television: { bounds: tv } },
    circulation: { main: circulation },
    renovation: {
      grossLoftArea: area(loftBounds), usableLoftArea: usable,
      originalGrossLoftArea: originalGross, originalUsableLoftArea: originalUsable,
      addedUsableArea: usable - originalUsable,
    },
    cameras: {
      ...original.cameras,
      front: { position: [0.1, 1.67, front - 0.24], target: [0.05, 2.2, 0.15] },
      living: { position: [-0.15, 1.58, front - 0.26], target: [0.35, 1.1, front - 2.35] },
      loft: { position: [Math.min(0.65, wardrobe.minX - 0.2), loftHeight + 1.4, loftFront - 0.18], target: [left + 0.85, loftHeight + 0.55, 1.2] },
      stairs: { position: [doorLeft + 0.38, 1.58, 1.55], target: [upperStartX - 0.6, 1.35, -0.6] },
    },
  };
}
