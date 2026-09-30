import { DEFAULT_DIMENSIONS } from './dimensions.js';
import { getSharedStructure, SHARED_DIMENSION_LIMITS } from './shared-structure.js';

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
  const doorHeight = Math.min(2.05, loftHeight - 0.25);
  const { stairs, loft: sharedLoft } = getSharedStructure(options);
  const stairBounds = stairs.bounds;
  const opening = stairs.opening;
  const landing = stairs.landing;
  const stairBottomX = stairs.bottom[0], stairTopX = stairs.top[0], stairZ = stairs.top[2];
  const loftBack = sharedLoft.back, loftFront = sharedLoft.front;
  const availableBedWidth = loftFront - landing.maxZ - 0.25;
  const desiredBedWidth = occupants === 1 ? 1.2 : 1.35;
  const bedWidth = availableBedWidth >= desiredBedWidth ? desiredBedWidth : availableBedWidth >= 1 ? 1 : 0.9;
  const bedLength = Math.min(2.1, width - 1.2);
  const bed = bounds(left + 0.2, left + 0.2 + bedLength, landing.maxZ + 0.1, landing.maxZ + 0.1 + bedWidth);
  const wardrobe = bounds(right - 0.66, right - 0.08, loftFront - 1.55, loftFront - 0.12);
  const storageWidth = Math.min(2.62, kitchenDoorX - 0.41 - left - 0.2);
  const mainStorage = bounds(left + 0.1, left + 0.1 + storageWidth, utilityFront + 0.08, utilityFront + 0.65);
  const deskLength = Math.min(occupants === 1 ? 1.9 : 2.65, front - mainStorage.maxZ - 0.3);
  const deskCenter = Math.min(loftFront + 0.1, front - deskLength / 2 - 0.15);
  const desk = bounds(left + 0.06, left + 0.74, deskCenter - deskLength / 2, deskCenter + deskLength / 2);
  const mainCorridor = bounds(mainStorage.maxX + 0.1, right - 0.08, utilityFront, loftFront);
  const floorBounds = sharedLoft;
  const floorRects = sharedLoft.floorRects;
  const kitchen = bounds(dividerX, right, rear, roomFront);
  const bathroom = bounds(left, dividerX, rear, roomFront);
  const utility = bounds(left, right, roomFront, utilityFront);
  const bathroomDoorX = dividerX - 0.45;
  const existingUtility = options.utilityArrangement !== 'standard';
  const windowLeft = dividerX + 0.07;
  const windowRight = Math.min(windowLeft + 0.62, kitchenDoorX - 0.45);
  const utilityWindow = { minX: windowLeft, maxX: windowRight, z: roomFront, sillHeight: 1.28, headHeight: 1.92 };
  const rowMinX = bathroomDoorX + 0.35;
  const rowMaxX = kitchenDoorX - 0.41;
  const windowRow = existingUtility && rowMaxX - rowMinX >= 1.62;
  const rowLeft = rowMinX + Math.min(0.06, (rowMaxX - rowMinX - 1.56) / 2);
  const washerBounds = windowRow
    ? bounds(rowLeft + 0.32, rowLeft + 0.92, roomFront + 0.08, roomFront + 0.7)
    : bounds(left + 0.4, left + 1, roomFront + 0.73, roomFront + 1.35);
  const dryerBounds = windowRow
    ? bounds(rowLeft + 0.96, rowLeft + 1.56, roomFront + 0.08, roomFront + 0.7)
    : bounds(left + 1.04, left + 1.64, roomFront + 0.73, roomFront + 1.35);
  const purifierBounds = windowRow
    ? bounds(rowLeft, rowLeft + 0.28, roomFront + 0.08, roomFront + 0.48)
    : bounds(left + 0.08, left + 0.36, roomFront + (existingUtility ? 0.67 : 0.73), roomFront + (existingUtility ? 1.07 : 1.13));
  const applianceRotation = windowRow ? 0 : Math.PI;
  const appliances = {
    washer: { bounds: washerBounds, rotationY: applianceRotation, type: 'top-loading', height: 1.04, lidClearance: { bounds: washerBounds, minY: 0.9, maxY: 1.48 } },
    dryer: { bounds: dryerBounds, rotationY: applianceRotation, type: 'front-loading', height: 0.85 },
    waterPurifier: { bounds: purifierBounds, rotationY: existingUtility ? 0 : applianceRotation, type: 'water-purifier', height: 1 },
  };
  const utilitySink = existingUtility ? {
    bounds: bounds(left + 0.07, Math.min(left + 0.61, bathroomDoorX - 0.405), roomFront + 0.14, roomFront + (windowRow ? 0.84 : 0.65)),
    rotationY: Math.PI / 2, height: 0.88,
  } : null;
  const counterLength = Math.min(1.55, roomFront - rear - 0.65);
  const counterX = kitchen.minX + 0.35, counterZ = (rear + roomFront) / 2;
  const sinkZ = counterZ + counterLength * 0.28;
  const kitchenSink = bounds(counterX + 0.02 - 0.17, counterX + 0.02 + 0.17, sinkZ - 0.215, sinkZ + 0.215);
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
    loft: sharedLoft,
    stairs,
    supportedDimensions: SHARED_DIMENSION_LIMITS,
    bed: { bounds: bed, width: bedWidth, length: bedLength, axis: 'x', direction: '+x', head: [bed.minX, loftHeight, (bed.minZ + bed.maxZ) / 2], foot: [bed.maxX, loftHeight, (bed.minZ + bed.maxZ) / 2] },
    wardrobe: { bounds: wardrobe, height: upperHeight - 0.14 },
    mainStorage: { bounds: mainStorage, height: loftHeight - 0.21, shelfWidth: 0.42 },
    desk: { bounds: desk, length: deskLength, center: deskCenter, monitors: 2 },
    circulation: { main: mainCorridor },
    fixtures: appliances,
    laundry: appliances,
    utilitySink, utilityWindow,
    kitchen: { counters: [{ bounds: bounds(counterX - 0.3, counterX + 0.3, counterZ - counterLength / 2, counterZ + counterLength / 2), face: 'right' }], sink: existingUtility ? null : { bounds: kitchenSink, rotationY: Math.PI / 2 } },
    doors: {
      utility: { x: kitchenDoorX, z: utilityFront, width: 0.82, height: doorHeight, axis: 'x', dividerThickness: 0.1 },
      kitchen: { x: kitchenDoorX, z: roomFront, width: 0.82, height: doorHeight, axis: 'x', dividerThickness: 0.1 },
      bathroom: { x: bathroomDoorX, z: roomFront, width: 0.7, height: doorHeight, axis: 'x', dividerThickness: 0.1 },
    },
    cameras: {
      living: { position: [0, 1.65, front - 0.55], target: [0, loftHeight - 0.25, utilityFront + 0.9] },
      utility: existingUtility
        ? { position: [kitchenDoorX, 1.55, roomFront + 1.1], target: [(washerBounds.minX + washerBounds.maxX) / 2, 0.94, (washerBounds.minZ + washerBounds.maxZ) / 2] }
        : { position: [kitchenDoorX, 1.55, roomFront + 0.33], target: [left + 0.86, 1, roomFront + 1.04] },
      loft: { position: [landing.minX + 0.44, loftHeight + 1.35, landing.maxZ - 0.15], target: [(bed.minX + bed.maxX) / 2, loftHeight + 0.45, (bed.minZ + bed.maxZ) / 2] },
      kitchen: { position: [kitchenDoorX, 1.58, roomFront + 0.35], target: [kitchenCenter[0], 1.1, rear + 0.4] },
      bathroom: { position: [bathroomCenter[0] + 0.23, 1.5, roomFront - 0.78], target: [bathroomCenter[0], 0.95, rear + 0.48] },
      stairs: { position: [right - 0.5, 1.55, stairBounds.minZ - 0.35], target: [stairTopX + 0.6, 1.65, stairZ] },
    },
  };
}
