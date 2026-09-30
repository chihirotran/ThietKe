import * as THREE from 'three';

const supports = new Set(['stair-tread', 'stair-tread-lip', 'stair-tread-bracket', 'stair-stringer', 'stair-landing']);

export function createWalkingWorld(house, eyeHeight = 1.6) {
  const layout = house.layout;
  const obstacles = [];
  house.group.updateMatrixWorld(true);
  house.group.traverse(object => {
    if (!object.isMesh || supports.has(object.name)) return;
    const box = new THREE.Box3().setFromObject(object);
    obstacles.push({ minX: box.min.x, maxX: box.max.x, minY: box.min.y, maxY: box.max.y, minZ: box.min.z, maxZ: box.max.z });
  });
  const stairs = layout.stairs;
  const treadRun = (stairs.bottom[0] - stairs.top[0]) / stairs.steps;
  const portalX = Math.max(stairs.top[0] + treadRun / 2, stairs.opening.minX + 0.162);
  return {
    ground: { minX: layout.left, maxX: layout.right, minZ: layout.rear, maxZ: layout.front },
    loft: layout.loft,
    stairs: { ...stairs, portalX, treadRun },
    eyeHeight: Math.min(eyeHeight, layout.loftHeight - 0.55, layout.upperHeight - 0.2),
    obstacles,
  };
}
