import { DEFAULT_DIMENSIONS } from './dimensions.js';

const bounds = (minX, maxX, minZ, maxZ) => ({ minX, maxX, minZ, maxZ });
const center = rect => [(rect.minX + rect.maxX) / 2, (rect.minZ + rect.maxZ) / 2];

export function getHouseLayout(options = {}) {
  const { width, depth, loftHeight, upperHeight, occupants = 1 } = { ...DEFAULT_DIMENSIONS, ...options };
  const left = -width / 2;
  const right = width / 2;
  const rear = -depth / 2;
  const front = depth / 2;
  const rearDepth = Math.min(2.4, Math.max(1.8, depth * 0.2375));
  const roomFront = rear + rearDepth;
  const utilityFront = roomFront + 2.35;
  const dividerX = left + Math.min(1.45, width * 0.42);
  const kitchenDoorX = right - 0.52;
  const stairApproachX = Math.min(right - 0.53, dividerX + 1.18);
  const doorHeight = Math.min(2.05, loftHeight - 0.25);
  const stairWidth = 0.72;
  const stairZ = utilityFront - 0.54;
  const stairBottomX = stairApproachX - 0.41 - 0.14;
  const stairTopX = left + 0.16;
  const stairBounds = bounds(stairTopX, stairBottomX, stairZ - stairWidth / 2, stairZ + stairWidth / 2);
  const opening = bounds(stairBounds.minX - 0.06, stairBounds.maxX + 0.06, stairBounds.minZ - 0.06, stairBounds.maxZ + 0.06);
  const landing = bounds(opening.minX, opening.minX + 0.88, opening.maxZ, opening.maxZ + 0.85);
  const bedWidth = occupants === 1 ? 1.2 : 1.35;
  const requestedLoftDepth = (front - utilityFront) / 2;
  const loftBack = opening.minZ - 0.1;
  const loftFront = Math.max(loftBack + requestedLoftDepth, landing.maxZ + bedWidth + 0.18);
  const bedLength = Math.min(2.1, width - 1.2);
  const bed = bounds(left + 0.2, left + 0.2 + bedLength, loftFront - 0.12 - bedWidth, loftFront - 0.12);
  const wardrobe = bounds(right - 0.66, right - 0.08, loftFront - 1.55, loftFront - 0.12);
  const storageWidth = Math.min(2.62, kitchenDoorX - 0.41 - left - 0.2);
  const mainStorage = bounds(left + 0.1, left + 0.1 + storageWidth, utilityFront + 0.08, utilityFront + 0.65);
  const deskLength = Math.min(occupants === 1 ? 1.9 : 2.65, front - mainStorage.maxZ - 0.3);
  const deskCenter = Math.min(loftFront + 0.1, front - deskLength / 2 - 0.15);
  const desk = bounds(left + 0.06, left + 0.74, deskCenter - deskLength / 2, deskCenter + deskLength / 2);
  const mainCorridor = bounds(mainStorage.maxX + 0.1, right - 0.08, utilityFront, loftFront);
  const floorBounds = bounds(left + 0.03, right - 0.03, loftBack, loftFront);
  const floorRects = [
    bounds(floorBounds.minX, opening.minX, floorBounds.minZ, floorBounds.maxZ),
    bounds(opening.maxX, floorBounds.maxX, floorBounds.minZ, floorBounds.maxZ),
    bounds(opening.minX, opening.maxX, floorBounds.minZ, opening.minZ),
    bounds(opening.minX, opening.maxX, opening.maxZ, floorBounds.maxZ),
  ];
  const kitchen = bounds(dividerX, right, rear, roomFront);
  const bathroom = bounds(left, dividerX, rear, roomFront);
  const utility = bounds(left, right, roomFront, utilityFront);
  const bathroomDoorX = dividerX - 0.45;
  const washer = bounds(left + 0.07, left + 0.73, roomFront + 0.72, roomFront + 1.32);
  const washCounter = bounds(left + 0.03, left + 0.535, roomFront + 0.135, roomFront + 0.685);
  const zones = {
    living: bounds(left, right, utilityFront, front),
    loft: floorBounds, kitchen, bathroom, utility, stairs: stairBounds,
  };
  const kitchenCenter = center(kitchen);
  const bathroomCenter = center(bathroom);
  return {
    width, depth, loftHeight, upperHeight, occupants,
    left, right, rear, front, roomFront, utilityFront, dividerX,
    zones,
    loft: { ...floorBounds, front: loftFront, back: loftBack, floorRects, height: loftHeight, requestedDepth: requestedLoftDepth, actualDepth: loftFront - loftBack },
    stairs: {
      bounds: stairBounds, opening, landing, width: stairWidth, direction: '-x',
      bottom: [stairBottomX, 0, stairZ], top: [stairTopX, loftHeight, stairZ],
      steps: Math.max(12, Math.ceil(loftHeight / 0.2)),
    },
    bed: { bounds: bed, width: bedWidth, length: bedLength, axis: 'x', direction: '+x', head: [bed.minX, loftHeight, (bed.minZ + bed.maxZ) / 2], foot: [bed.maxX, loftHeight, (bed.minZ + bed.maxZ) / 2] },
    wardrobe: { bounds: wardrobe, height: upperHeight - 0.14 },
    mainStorage: { bounds: mainStorage, height: loftHeight - 0.21, shelfWidth: 0.42 },
    desk: { bounds: desk, length: deskLength, center: deskCenter, monitors: 2 },
    circulation: { main: mainCorridor },
    fixtures: { washer: { bounds: washer }, washCounter: { bounds: washCounter } },
    doors: {
      utility: { x: kitchenDoorX, z: utilityFront, width: 0.82, height: doorHeight, axis: 'x', dividerThickness: 0.1 },
      kitchen: { x: kitchenDoorX, z: roomFront, width: 0.82, height: doorHeight, axis: 'x', dividerThickness: 0.1 },
      bathroom: { x: bathroomDoorX, z: roomFront, width: 0.7, height: doorHeight, axis: 'x', dividerThickness: 0.1 },
    },
    cameras: {
      living: { position: [0, 1.65, front - 0.55], target: [0, loftHeight - 0.25, utilityFront + 0.9] },
      utility: { position: [kitchenDoorX, 1.6, utilityFront - 0.28], target: [kitchenDoorX - 0.1, 1.1, roomFront - 0.08] },
      loft: { position: [landing.minX + 0.44, loftHeight + 1.35, landing.maxZ - 0.15], target: [(bed.minX + bed.maxX) / 2, loftHeight + 0.45, (bed.minZ + bed.maxZ) / 2] },
      kitchen: { position: [kitchenDoorX, 1.58, roomFront + 0.35], target: [kitchenCenter[0], 1.1, rear + 0.4] },
      bathroom: { position: [bathroomCenter[0] + 0.23, 1.5, roomFront - 0.78], target: [bathroomCenter[0], 0.95, rear + 0.48] },
      stairs: { position: [stairBottomX + 0.5, 1.55, stairZ - 0.43], target: [stairTopX + 0.6, 1.65, stairZ] },
    },
  };
}
