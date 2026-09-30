import { getHouseLayout } from './layout.js';
import { getSharedStructure } from './shared-structure.js';

const rect = (minX, maxX, minZ, maxZ) => ({ minX, maxX, minZ, maxZ });
const area = r => (r.maxX - r.minX) * (r.maxZ - r.minZ);
export function getModernLayout(options = {}) {
  const original = getHouseLayout({ ...options, occupants: options.occupants ?? 1 });
  const { left, right, front, loftHeight, upperHeight } = original;
  const doorLeft = original.doors.utility.x - original.doors.utility.width / 2;
  const { stairs, loft: sharedLoft } = getSharedStructure(options);
  const landing = stairs.landing;
  const loftFront = sharedLoft.front;
  const loftBounds = sharedLoft;
  const floorRects = sharedLoft.floorRects;
  const bedSpace = loftFront - landing.maxZ - 0.25;
  const bedWidth = bedSpace >= 1.3 ? 1.3 : bedSpace >= 1 ? 1 : 0.9;
  const bed = rect(left + 0.13, left + 2.13, landing.maxZ + 0.1, landing.maxZ + 0.1 + bedWidth);
  const wardrobe = rect(right - 0.65, right - 0.08, loftFront - 1.65, loftFront - 0.12);
  const storage = rect(left + 0.08, left + 0.67, 0.05, 0.78);
  const deskRear = storage.maxZ + 0.12;
  const sofaFront = front - 0.2;
  const sofaLength = Math.min(1.8, sofaFront - deskRear - 1.25 - 0.15);
  const sofa = rect(left + 0.08, left + 0.85, sofaFront - sofaLength, sofaFront);
  const deskLength = Math.min(1.8, sofa.minZ - 0.15 - deskRear);
  const deskCenter = Math.max(deskRear + deskLength / 2,
    Math.min(1.8, sofa.minZ - 0.15 - deskLength / 2));
  const desk = rect(left + 0.07, left + 0.77, deskCenter - deskLength / 2, deskCenter + deskLength / 2);
  const tv = rect(right - 0.14, right - 0.02, front - 2.2, front - 1.1);
  const entryWidth = 0.9;
  const entryRight = right - 0.08;
  const vestibule = rect(entryRight - entryWidth, entryRight, front - 1, front);
  const circulation = rect(doorLeft + 0.015, right - 0.19, original.roomFront, front);
  const originalGross = area(original.loft);
  const originalUsable = original.loft.floorRects.reduce((sum, r) => sum + area(r), 0);
  const usable = floorRects.reduce((sum, r) => sum + area(r), 0);
  return {
    ...original,
    variant: 'modern',
    zones: { ...original.zones, loft: loftBounds, stairs: stairs.bounds },
    loft: sharedLoft,
    stairs,
    bed: { bounds: bed, width: bedWidth, length: 2, axis: 'x', direction: '+x', head: [bed.minX, loftHeight, (bed.minZ + bed.maxZ) / 2], foot: [bed.maxX, loftHeight, (bed.minZ + bed.maxZ) / 2] },
    wardrobe: { bounds: wardrobe, height: upperHeight - 0.16 },
    mainStorage: { bounds: storage, height: loftHeight - 0.27, shelfWidth: 0 },
    desk: { bounds: desk, center: deskCenter, length: deskLength, monitors: 2 },
    lounge: {
      sofa: { bounds: sofa, side: 'left', orientation: 'right-facing', rotationY: Math.PI / 2 },
      television: { bounds: tv, side: 'right', wallMounted: true, floorConsole: false },
    },
    entry: {
      side: 'right', positionConfirmed: true, width: entryWidth, widthIsEstimate: true,
      door: { x: entryRight - entryWidth / 2, z: front, width: entryWidth, axis: 'x' },
      vestibule,
    },
    circulation: { main: circulation, entry: vestibule },
    renovation: {
      grossLoftArea: area(loftBounds), usableLoftArea: usable,
      originalGrossLoftArea: originalGross, originalUsableLoftArea: originalUsable,
      addedUsableArea: usable - originalUsable,
    },
    cameras: {
      ...original.cameras,
      front: { position: [0.1, 1.67, front - 0.24], target: [0.05, 2.2, 0.15] },
      living: { position: [-0.15, 1.58, front - 0.26], target: [0.35, 1.1, front - 2.35] },
      loft: { position: [(bed.maxX + wardrobe.minX) / 2, loftHeight + 1.4, loftFront - 0.3], target: [(bed.minX + bed.maxX) / 2, loftHeight + 0.55, (bed.minZ + bed.maxZ) / 2] },
      stairs: { position: [right - 0.5, 1.55, stairs.bounds.minZ - 0.35], target: [(stairs.top[0] + stairs.bottom[0]) / 2, 1.4, stairs.top[2]] },
    },
  };
}
