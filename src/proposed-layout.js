import { DEFAULT_DIMENSIONS } from './dimensions.js';
import { getSharedStructure, SHARED_DIMENSION_LIMITS } from './shared-structure.js';

export const PROPOSED_DIMENSION_LIMITS = SHARED_DIMENSION_LIMITS;

const rect = (minX, maxX, minZ, maxZ) => ({ minX, maxX, minZ, maxZ });
const center = r => [(r.minX + r.maxX) / 2, (r.minZ + r.maxZ) / 2];
const area = r => (r.maxX - r.minX) * (r.maxZ - r.minZ);
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export function getProposedLayout(options = {}) {
  const { width, depth, loftHeight, upperHeight } = { ...DEFAULT_DIMENSIONS, ...options };
  const left = -width / 2, right = width / 2, rear = -depth / 2, front = depth / 2;
  const depthFactor = clamp((depth - 7.5) / 3.5, 0, 1);
  const widthFactor = clamp((width - 3.2) / 0.71, 0, 1);
  const roomFront = rear + clamp(depth * 0.2, 1.8, 2.4);
  const dividerX = left + clamp(width * 0.45, 1.45, 1.85);
  const bathroomRoom = rect(left, dividerX, rear, roomFront);
  const laundryRoom = rect(dividerX, right, rear, roomFront);
  const doorHeight = Math.min(2.05, loftHeight - 0.2);
  const doors = {
    bathroom: { x: dividerX - 0.48, z: roomFront, width: 0.72, height: doorHeight, axis: 'x', dividerThickness: 0.1 },
    utility: { x: right - 0.52, z: roomFront, width: 0.82, height: doorHeight, axis: 'x', dividerThickness: 0.1 },
  };

  const { stairs: retainedStairs, loft: sharedLoft } = getSharedStructure(options);
  const stairBounds = retainedStairs.bounds;
  const stairSideWall = retainedStairs.sideWall;
  const openingRects = [retainedStairs.opening];
  const landing = retainedStairs.landing;

  const sofaFront = front - 0.2;
  const sofa = rect(left + 0.08, left + 0.85, sofaFront - 1.3 - 0.5 * depthFactor, sofaFront);
  const chaise = rect(sofa.minX, left + 1.25 + 0.25 * depthFactor, sofaFront - 0.64, sofaFront);
  const coffeeRadius = 0.21 + 0.09 * widthFactor;
  const coffeeX = sofa.maxX + coffeeRadius + 0.12;
  const coffeeZ = front - 1.1 - 0.15 * depthFactor;
  const coffee = rect(coffeeX - coffeeRadius, coffeeX + coffeeRadius, coffeeZ - coffeeRadius, coffeeZ + coffeeRadius);
  const tableWidth = 0.5 + 0.14 * widthFactor;
  const chairWidth = 0.34 + 0.08 * widthFactor;
  const tableFront = sofa.minZ - 0.18;
  const diningLeft = left + 0.08;
  const table = rect(diningLeft + chairWidth + 0.03, diningLeft + chairWidth + 0.03 + tableWidth, tableFront - 0.65 - 0.2 * depthFactor, tableFront);
  const tableZ = center(table)[1];
  const diningChairs = [
    { bounds: rect(diningLeft, diningLeft + chairWidth, tableZ - 0.21, tableZ + 0.21), rotationY: Math.PI / 2 },
    { bounds: rect(table.maxX + 0.03, table.maxX + 0.03 + chairWidth, tableZ - 0.21, tableZ + 0.21), rotationY: -Math.PI / 2 },
  ];
  const diningBounds = rect(diningLeft, diningChairs[1].bounds.maxX, table.minZ, table.maxZ);
  const deskFront = sofa.minZ - 0.15 + 0.57 * (1 - depthFactor);
  const deskLength = 1.15 + 0.45 * depthFactor;
  const deskDepth = 0.52 + 0.1 * widthFactor;
  const desk = rect(right - 0.06 - deskDepth, right - 0.06, deskFront - deskLength, deskFront);
  const deskChairWidth = 0.4 + 0.06 * widthFactor;
  const deskChair = rect(desk.minX - 0.08 - deskChairWidth, desk.minX - 0.08, center(desk)[1] - 0.25, center(desk)[1] + 0.25);

  const kitchenFront = table.minZ - 0.25;
  const kitchenRear = stairSideWall.bounds.maxZ + 0.001;
  const kitchenWallX = left + 0.016;
  const fridge = rect(left + 0.06, left + 0.69, kitchenFront - 0.62, kitchenFront);
  const wallCounter = rect(kitchenWallX, left + 0.65, kitchenRear, fridge.minZ - 0.06);
  const returnCounter = rect(kitchenWallX, Math.min(right - 1.94, stairSideWall.bounds.maxX - 0.006), kitchenRear, kitchenRear + 0.57);
  const sinkZ = (wallCounter.minZ + wallCounter.maxZ) / 2;
  const sink = rect(left + 0.13, left + 0.58, sinkZ - 0.19, sinkZ + 0.19);
  const hobX = Math.min(returnCounter.maxX - 0.33, left + 1.1);
  const hob = rect(hobX - 0.25, hobX + 0.25, kitchenRear + 0.075, kitchenRear + 0.495);
  const kitchenBounds = rect(left, Math.max(returnCounter.maxX, fridge.maxX), kitchenRear, kitchenFront);

  const loftFront = sharedLoft.front;
  const loftBounds = sharedLoft;
  const floorRects = sharedLoft.floorRects;
  const bedSpace = loftFront - landing.maxZ - 0.25;
  const bedWidth = bedSpace >= 1.3 ? 1.3 : bedSpace >= 1 ? 1 : 0.9;
  const bed = rect(left + 0.13, left + 2.13, landing.maxZ + 0.1, landing.maxZ + 0.1 + bedWidth);
  const wardrobe = rect(right - 0.63, right - 0.08, loftFront - 1.65, loftFront - 0.14);

  const showerWidth = Math.min(0.82, dividerX - left - 0.8);
  const shower = rect(left + 0.08, left + 0.08 + showerWidth, rear + 0.08, rear + 0.91);
  const toilet = rect(dividerX - 0.63, dividerX - 0.09, rear + 0.15, rear + 0.86);
  const vanity = rect(left + 0.07, left + 0.52, roomFront - 0.62, roomFront - 0.1);
  const washer = rect(dividerX + 0.39, dividerX + 0.99, rear + 0.1, rear + 0.72);
  const dryer = rect(dividerX + 1.03, dividerX + 1.63, rear + 0.1, rear + 0.72);
  const waterPurifier = rect(dividerX + 0.07, dividerX + 0.35, rear + 0.32, rear + 0.72);
  const laundryStorage = rect(dividerX + 0.08, dividerX + 0.62, roomFront - 0.66, roomFront - 0.1);
  const appliances = {
    washer: { bounds: washer, rotationY: 0, type: 'top-loading', height: 1.04, lidClearance: { bounds: washer, minY: 0.9, maxY: 1.48 } },
    dryer: { bounds: dryer, rotationY: 0, type: 'front-loading', height: 0.85 },
    waterPurifier: { bounds: waterPurifier, rotationY: 0, type: 'water-purifier', height: 1 },
  };
  const centerAisle = rect(diningBounds.maxX + 0.08, deskChair.minX - 0.08, stairBounds.maxZ + 0.9, desk.maxZ + 0.08);
  const rearPassage = rect(Math.max(stairBounds.maxX, returnCounter.maxX) + 0.08, right - 0.08, roomFront + 0.1, stairSideWall.bounds.maxZ + 0.04);
  const rearCrossing = rect(left + 0.08, right - 0.08, roomFront + 0.08, stairBounds.minZ - 0.08);
  const kitchenTurn = rect(Math.max(centerAisle.minX, returnCounter.maxX + 0.08), right - 0.08, stairSideWall.bounds.maxZ + 0.04, Math.min(desk.minZ - 0.08, Math.max(stairBounds.maxZ + 0.9, returnCounter.maxZ + 0.1)));
  centerAisle.minZ = kitchenTurn.maxZ;
  const frontCrossing = rect(centerAisle.minX, right - 0.08, desk.maxZ + 0.08, front - 1);
  const entryWidth = 0.9;
  const entryRight = right - 0.08;
  const vestibule = rect(entryRight - entryWidth, entryRight, front - 1, front);
  const zones = {
    living: rect(left, right, table.maxZ + 0.07, front), dining: diningBounds,
    kitchen: kitchenBounds, bathroom: bathroomRoom, utility: laundryRoom,
    stairs: stairBounds, loft: loftBounds,
  };
  return {
    variant: 'proposed', width, depth, loftHeight, upperHeight, occupants: 1, supportedDimensions: PROPOSED_DIMENSION_LIMITS,
    left, right, rear, front, roomFront, utilityFront: roomFront, dividerX, zones, doors,
    loft: sharedLoft,
    stairs: retainedStairs,
    bed: { bounds: bed, width: bedWidth, length: 2, axis: 'x', direction: '+x', head: [bed.minX, loftHeight, center(bed)[1]], foot: [bed.maxX, loftHeight, center(bed)[1]] },
    wardrobe: { bounds: wardrobe, height: upperHeight - 0.16 },
    desk: { bounds: desk, side: 'right', center: center(desk)[1], length: deskLength, monitors: 2, chair: { bounds: deskChair, rotationY: Math.PI / 2 } },
    lounge: { sofa: { bounds: sofa, chaise: { bounds: chaise }, side: 'left', orientation: 'right-facing', rotationY: Math.PI / 2 }, coffeeTable: { bounds: coffee, radius: coffeeRadius } },
    dining: { bounds: diningBounds, table: { bounds: table, height: 0.75 }, chairs: diningChairs },
    kitchen: { counters: [{ bounds: wallCounter, face: 'right' }, { bounds: returnCounter, face: 'front' }], sink: { bounds: sink }, hob: { bounds: hob }, fridge: { bounds: fridge, rotationY: Math.PI / 2 } },
    bathroom: { shower: { bounds: shower }, toilet: { bounds: toilet, rotationY: 0 }, vanity: { bounds: vanity, rotationY: Math.PI / 2 } },
    laundry: { ...appliances, storage: { bounds: laundryStorage, face: 'right', height: loftHeight - 0.2 } },
    mainStorage: { bounds: laundryStorage, height: loftHeight - 0.2, face: 'right', shelfWidth: 0 },
    fixtures: appliances,
    entry: { side: 'right', positionConfirmed: true, width: entryWidth, widthIsEstimate: true, door: { x: entryRight - entryWidth / 2, z: front, width: entryWidth, axis: 'x' }, vestibule },
    circulation: { main: centerAisle, entry: vestibule, rear: rearPassage, cross: rearCrossing, segments: [vestibule, frontCrossing, centerAisle, kitchenTurn, rearPassage, rearCrossing] },
    renovation: { grossLoftArea: area(loftBounds), usableLoftArea: floorRects.reduce((sum, r) => sum + area(r), 0) },
    cameras: {
      front: { position: [entryRight - 0.45, 1.65, front - 0.24], target: [-0.45, 1.9, sofa.minZ - 0.6] },
      living: { position: [right - 0.3, 1.6, front - 0.5], target: [center(sofa)[0], 0.9, center(sofa)[1]] },
      dining: { position: [center(centerAisle)[0], 1.6, table.maxZ + 0.55], target: [center(table)[0], 0.9, tableZ] },
      kitchen: { position: [center(centerAisle)[0], 1.6, kitchenFront + 0.18], target: [left + 0.65, 1.1, kitchenRear + 0.5] },
      utility: { position: [doors.utility.x, 1.55, roomFront - 0.25], target: [center(laundryRoom)[0], 1, rear + 0.4] },
      bathroom: { position: [doors.bathroom.x, 1.5, roomFront - 0.34], target: [left + 0.68, 0.9, rear + 0.45] },
      stairs: { position: [right - 0.5, 1.55, stairBounds.minZ - 0.35], target: [center(stairBounds)[0], 1.4, center(stairBounds)[1]] },
      loft: { position: [(bed.maxX + wardrobe.minX) / 2, loftHeight + 1.35, loftFront - 0.24], target: [center(bed)[0], loftHeight + 0.5, center(bed)[1]] },
    },
  };
}
