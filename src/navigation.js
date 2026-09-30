const BODY_RADIUS = 0.14;
const WALK_SPEED = 1.25;
const contains = (rect, x, z) => x >= rect.minX && x <= rect.maxX && z >= rect.minZ && z <= rect.maxZ;

function surfaceAt(x, z, previousFloor, world) {
  const { stairs, loft, ground } = world;
  const height = loft.height;
  const onFlight = z >= stairs.bounds.minZ && z <= stairs.bounds.maxZ
    && x >= stairs.top[0] && x <= stairs.bottom[0] + 0.1;
  const onExit = x >= stairs.top[0] - 0.0045 && x <= stairs.top[0] + stairs.treadRun + 0.0045
    && z >= stairs.bounds.maxZ && z <= stairs.opening.maxZ;
  if (onExit) return { height, kind: 'stairs' };
  if (onFlight) {
    const crestX = Math.min(stairs.portalX + 0.015, stairs.top[0] + stairs.treadRun + 0.0045);
    const progress = (stairs.bottom[0] + 0.1 - x) / (stairs.bottom[0] + 0.1 - crestX);
    return { height: height * Math.max(0, Math.min(1, progress)), kind: 'stairs' };
  }
  if (previousFloor >= height - 0.25 && loft.floorRects.some(rect => contains(rect, x, z))) return { height, kind: 'loft' };
  if (previousFloor <= 0.25 && contains(ground, x, z)) return { height: 0, kind: 'ground' };
  return null;
}

function spatialStep(position, x, z, world, snap = true) {
  const previousFloor = position.y - world.eyeHeight;
  const { stairs, loft, ground } = world;
  // The last tread is narrow; align the camera with its clear turning point.
  if (snap && previousFloor >= loft.height - 0.3 && x < stairs.portalX
    && position.x <= stairs.portalX + 0.2 && z >= stairs.bounds.minZ && z <= stairs.opening.maxZ) x = stairs.portalX;
  const surface = surfaceAt(x, z, previousFloor, world);
  if (!surface || Math.abs(surface.height - previousFloor) > 0.25) return null;
  if (x - BODY_RADIUS < ground.minX || x + BODY_RADIUS > ground.maxX
    || z - BODY_RADIUS < ground.minZ || z + BODY_RADIUS > ground.maxZ) return null;
  const atUpperTurn = x >= stairs.portalX - 0.01 && x <= stairs.portalX + 0.04
    && z >= stairs.bounds.maxZ && z <= stairs.opening.maxZ + 0.04;
  if (surface.kind !== 'stairs' && !atUpperTurn) {
    for (const dx of [-0.025, 0.025]) for (const dz of [-0.025, 0.025]) {
      const support = surfaceAt(x + dx, z + dz, surface.height, world);
      if (!support || Math.abs(support.height - surface.height) > 0.25) return null;
    }
  }
  const y = surface.height + world.eyeHeight;
  if (world.obstacles.some(rect => rect.maxY > surface.height + 0.12 && rect.minY < y + 0.12
    && x + BODY_RADIUS > rect.minX && x - BODY_RADIUS < rect.maxX
    && z + BODY_RADIUS > rect.minZ && z - BODY_RADIUS < rect.maxZ)) return null;
  return { x, y, z };
}

export function canWalkAt(position, world, radius = BODY_RADIUS) {
  if (world.ground) return !!spatialStep(position, position.x, position.z, world, false);
  const { x, z } = position;
  const { floors, obstacles } = world;
  for (const dx of [-radius, 0, radius]) for (const dz of [-radius, 0, radius]) {
    if (!floors.some(rect => contains(rect, x + dx, z + dz))) return false;
  }
  return !obstacles.some(rect => x + radius > rect.minX && x - radius < rect.maxX
    && z + radius > rect.minZ && z - radius < rect.maxZ);
}

export function walk(position, actions, yaw, elapsed, world) {
  const active = new Set(actions);
  const forward = Number(active.has('forward')) - Number(active.has('backward'));
  const side = Number(active.has('right')) - Number(active.has('left'));
  const length = Math.hypot(forward, side);
  const next = { x: position.x, y: position.y, z: position.z };
  if (!length) return next;
  const distance = WALK_SPEED * Math.min(0.08, Math.max(0, elapsed)) / length;
  const dx = (Math.sin(yaw) * forward + Math.cos(yaw) * side) * distance;
  const dz = (-Math.cos(yaw) * forward + Math.sin(yaw) * side) * distance;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.035));
  for (let step = 0; step < steps; step++) {
    const x = next.x + dx / steps;
    const z = next.z + dz / steps;
    if (world.ground) {
      const moved = spatialStep(next, x, z, world);
      if (moved) Object.assign(next, moved);
      else {
        const across = spatialStep(next, x, next.z, world);
        if (across) Object.assign(next, across);
        const along = spatialStep(next, next.x, z, world);
        if (along) Object.assign(next, along);
      }
      continue;
    }
    if (canWalkAt({ x, z }, world)) { next.x = x; next.z = z; }
    else {
      if (canWalkAt({ x, z: next.z }, world)) next.x = x;
      if (canWalkAt({ x: next.x, z }, world)) next.z = z;
    }
  }
  return next;
}
