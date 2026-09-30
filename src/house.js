import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { getHouseLayout } from './layout.js';
import { addRetainedStair } from './shared-stair.js';
import { addLaundryAppliances } from './laundry-fixtures.js';

const PALETTES = {
  oak: { wood: '#cfad7d', fabric: '#e5dfd2', accent: '#85957f', wall: '#f3f0e8' },
  walnut: { wood: '#89664e', fabric: '#ddd5c6', accent: '#718d88', wall: '#ede9e0' },
};

function canvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

function seededRandom(seed = 53) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

export function createHouse(options = {}) {
  const layout = getHouseLayout(options);
  const { width, depth, loftHeight, upperHeight, occupants } = layout;
  const group = new THREE.Group();
  group.name = 'home';
  const walls = new THREE.Group();
  walls.name = 'outer-walls';
  const loft = new THREE.Group();
  loft.name = 'mezzanine';
  const furniture = new THREE.Group();
  furniture.name = 'ground-floor-furniture';
  const partitions = new THREE.Group();
  partitions.name = 'interior-partitions';
  group.add(walls, loft, furniture, partitions);

  const left = -width / 2;
  const right = width / 2;
  const front = depth / 2;
  const rear = -depth / 2;
  const height = loftHeight + upperHeight;
  const loftFront = layout.loft.front;
  const loftBack = layout.loft.back;
  const loftDepth = loftFront - loftBack;
  const woodTexture = canvasTexture(512, 512, (ctx, w, h) => {
    const rand = seededRandom();
    ctx.fillStyle = '#ede5d8';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 720; i++) {
      const x = rand() * w;
      ctx.strokeStyle = `rgba(80,55,28,${0.015 + rand() * 0.06})`;
      ctx.lineWidth = 0.3 + rand() * 1.3;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + rand() * 14, h * 0.3, x - rand() * 14, h * 0.7, x, h);
      ctx.stroke();
    }
  });
  woodTexture.repeat.set(1.2, 1.2);
  const floorTexture = canvasTexture(1024, 1024, (ctx, w, h) => {
    const rand = seededRandom(87);
    ctx.fillStyle = '#c6bfae';
    ctx.fillRect(0, 0, w, h);
    for (let row = 0; row < 4; row++) {
      for (let column = 0; column < 4; column++) {
        const tint = Math.floor(rand() * 4);
        ctx.fillStyle = `rgb(${232 + tint},${225 + tint},${208 + tint})`;
        ctx.fillRect(column * w / 4 + 1.5, row * h / 4 + 1.5, w / 4 - 3, h / 4 - 3);
      }
    }
  });
  floorTexture.repeat.set(width / 2, depth / 2);
  const rugTexture = canvasTexture(512, 512, (ctx, w, h) => {
    const rand = seededRandom(112);
    ctx.fillStyle = '#e7e1d4';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 14000; i++) {
      ctx.fillStyle = rand() > 0.5 ? 'rgba(102,95,74,0.10)' : 'rgba(255,255,255,0.45)';
      ctx.fillRect(rand() * w, rand() * h, 1, 4);
    }
    ctx.strokeStyle = '#b0b09d';
    ctx.lineWidth = 3;
    ctx.strokeRect(25, 25, w - 50, h - 50);
    ctx.lineWidth = 1;
    ctx.strokeRect(32, 32, w - 64, h - 64);
  });
  const screenTexture = canvasTexture(512, 300, (ctx, w, h) => {
    ctx.fillStyle = '#223c39';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#304c46';
    ctx.fillRect(15, 15, 95, h - 30);
    ctx.fillStyle = '#edf1e3';
    ctx.font = '22px sans-serif';
    ctx.fillText('A little room to focus.', 137, 58);
    ctx.fillStyle = '#8ba69a';
    ctx.fillRect(138, 83, 324, 3);
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i === 2 ? '#c2d1b5' : '#738c80';
      ctx.fillRect(30, 40 + i * 33, 54 - i * 3, 5);
    }
    ctx.fillStyle = '#48665d';
    ctx.fillRect(137, 115, 152, 147);
    ctx.fillStyle = '#bfcbb1';
    ctx.beginPath();
    ctx.arc(213, 188, 45, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8faa95';
    for (let i = 0; i < 6; i++) ctx.fillRect(313, 121 + i * 25, 130 - (i % 3) * 20, 5);
  });
  const makeMaterial = (color, options = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.72, ...options });
  const materials = {
    wood: makeMaterial(PALETTES.oak.wood, { map: woodTexture, roughness: 0.55 }),
    fabric: makeMaterial(PALETTES.oak.fabric, { roughness: 0.96 }),
    accent: makeMaterial(PALETTES.oak.accent, { roughness: 0.86 }),
    wall: makeMaterial(PALETTES.oak.wall, { roughness: 0.94 }),
  };
  const floorMat = makeMaterial('#ffffff', { map: floorTexture, roughness: 0.43 });
  const darkWood = makeMaterial('#654833', { map: woodTexture, roughness: 0.58 });
  const bedding = makeMaterial('#b2d2e8', { roughness: 0.96 });
  const basketMat = makeMaterial('#bcaf93', { map: rugTexture, roughness: 1 });
  const paleWood = makeMaterial('#dfc8a3', { map: woodTexture });
  const stone = makeMaterial('#e2ddd1', { roughness: 0.8 });
  const white = makeMaterial('#f8f7f2', { roughness: 0.5 });
  const ceramic = makeMaterial('#d0bea4', { roughness: 0.65 });
  const charcoal = makeMaterial('#39413b', { roughness: 0.62 });
  const metal = makeMaterial('#686e65', { metalness: 0.72, roughness: 0.3 });
  const black = makeMaterial('#172522', { roughness: 0.35 });
  const glass = makeMaterial('#819b99', { metalness: 0.2, roughness: 0.16, transparent: true, opacity: 0.6 });
  const linen = makeMaterial('#f1eee4', { roughness: 1 });
  const leafMat = makeMaterial('#567554', { roughness: 0.9 });
  const soil = makeMaterial('#574330');
  const warmLight = makeMaterial('#fff0ca', { emissive: '#ffdc9b', emissiveIntensity: 1.5 });
  const rugMat = makeMaterial('#ffffff', { map: rugTexture, roughness: 1 });

  function mesh(geometry, material, parent, x = 0, y = 0, z = 0) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x, y, z);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  function box(parent, w, h, d, x, y, z, material = materials.wood, radius = 0) {
    const geo = radius > 0 ? new RoundedBoxGeometry(w, h, d, 2, Math.min(radius, w / 3, h / 3, d / 3)) : new THREE.BoxGeometry(w, h, d);
    return mesh(geo, material, parent, x, y, z);
  }
  function cylinder(parent, rt, rb, h, x, y, z, material, segments = 24) {
    return mesh(new THREE.CylinderGeometry(rt, rb, h, segments), material, parent, x, y, z);
  }
  function sphere(parent, r, x, y, z, material, scale = [1, 1, 1]) {
    const object = mesh(new THREE.SphereGeometry(r, 16, 12), material, parent, x, y, z);
    object.scale.set(...scale);
    return object;
  }
  function bar(parent, start, end, radius, material) {
    const a = new THREE.Vector3(...start);
    const b = new THREE.Vector3(...end);
    const object = cylinder(parent, radius, radius, a.distanceTo(b), 0, 0, 0, material, 8);
    object.position.copy(a.add(b).multiplyScalar(0.5));
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...end).sub(new THREE.Vector3(...start)).normalize());
    return object;
  }
  function plant(parent, x, y, z, size = 0.5) {
    const potHeight = size * 0.34;
    cylinder(parent, size * 0.2, size * 0.155, potHeight, x, y + potHeight / 2, z, ceramic);
    cylinder(parent, size * 0.178, size * 0.178, 0.014, x, y + potHeight, z, soil);
    for (let i = 0; i < 7; i++) {
      const angle = i * 2.399;
      const length = size * (0.5 + (i % 3) * 0.15);
      const px = x + Math.sin(angle) * size * 0.21;
      const pz = z + Math.cos(angle) * size * 0.21;
      bar(parent, [x, y + potHeight, z], [px, y + length + potHeight, pz], size * 0.011, leafMat);
      const leaf = sphere(parent, size * 0.16, px, y + length + potHeight, pz, leafMat, [0.64, 1.65, 0.2]);
      leaf.rotation.set(Math.cos(angle) * 0.45, angle, Math.sin(angle) * 0.55);
    }
  }
  function books(parent, x, y, z, count = 4, scale = 1) {
    const colors = ['#8c9a82', '#b78f72', '#e3decc', '#aeb8ac', '#d0b18b'];
    for (let i = 0; i < count; i++) {
      const bookHeight = (0.19 + (i % 3) * 0.028) * scale;
      box(parent, 0.035 * scale, bookHeight, 0.15 * scale, x + i * 0.043 * scale, y + bookHeight / 2, z, makeMaterial(colors[i % colors.length]), 0.003);
    }
  }

  // The open front and removable side walls preserve a readable architectural cutaway.
  box(group, width + 0.24, 0.22, depth + 0.24, 0, -0.16, 0, paleWood, 0.035);
  box(group, width, 0.07, depth, 0, -0.035, 0, floorMat);
  for (const x of [left, right]) box(group, 0.13, 0.16, depth, x, 0.08, 0, materials.wall);
  box(group, width, 0.16, 0.13, 0, 0.08, rear, materials.wall);
  for (const [name, x] of [['left-wall', left - 0.045], ['right-wall', right + 0.045]]) {
    const wallGroup = new THREE.Group();
    wallGroup.name = name;
    box(wallGroup, 0.12, height, depth + 0.12, x, height / 2, 0, materials.wall);
    box(wallGroup, 0.02, 0.09, depth, x > 0 ? x - 0.07 : x + 0.07, 0.045, 0, paleWood);
    walls.add(wallGroup);
  }
  const backWall = new THREE.Group();
  backWall.name = 'back-wall';
  box(backWall, width + 0.12, height, 0.12, 0, height / 2, rear - 0.045, materials.wall);
  walls.add(backWall);
  box(furniture, width - 0.15, 0.02, layout.roomFront - rear, 0, 0.017, (rear + layout.roomFront) / 2, stone);

  const deskLength = layout.desk.length;
  const deskCenter = layout.desk.center;
  const deskX = left + 0.4;
  const deskGroup = new THREE.Group();
  deskGroup.name = 'desk';
  furniture.add(deskGroup);
  box(deskGroup, 0.68, 0.055, deskLength, deskX, 0.755, deskCenter, materials.wood, 0.016);
  for (const z of [deskCenter - deskLength / 2 + 0.22, deskCenter + deskLength / 2 - 0.22]) {
    box(deskGroup, 0.49, 0.66, 0.37, deskX - 0.035, 0.345, z, paleWood, 0.015);
    for (const y of [0.26, 0.47]) {
      box(deskGroup, 0.012, 0.004, 0.31, deskX + 0.217, y, z, stone);
      box(deskGroup, 0.022, 0.02, 0.1, deskX + 0.227, y + 0.065, z, darkWood, 0.006);
    }
  }
  function workstation(z, monitorCount = 1) {
    const station = new THREE.Group();
    station.name = 'workstation';
    station.position.set(left + 0.16, 0, z);
    station.rotation.y = Math.PI / 2 - 0.25;
    furniture.add(station);
    const monitorXs = monitorCount === 2 ? [-0.275, 0.275] : [0];
    for (const monitorX of monitorXs) {
      const monitor = new THREE.Group();
      monitor.name = 'workstation-monitor';
      monitor.position.x = monitorX;
      monitor.rotation.y = monitorCount === 2 ? -Math.sign(monitorX) * 0.09 : 0;
      station.add(monitor);
      box(monitor, 0.52, 0.315, 0.025, 0, 1.13, 0.016, charcoal, 0.012);
      const screen = mesh(new THREE.PlaneGeometry(0.486, 0.28), new THREE.MeshBasicMaterial({ map: screenTexture }), monitor, 0, 1.13, 0.031);
      screen.castShadow = false;
      box(monitor, 0.035, 0.18, 0.025, 0, 0.92, 0.013, metal, 0.004);
      box(monitor, 0.18, 0.014, 0.105, 0, 0.793, 0.06, metal, 0.006);
    }
    box(station, 0.39, 0.015, 0.14, 0, 0.794, 0.32, charcoal, 0.006);
    for (let row = 0; row < 4; row++) {
      for (let key = 0; key < 11; key++) box(station, 0.027, 0.003, 0.021, -0.163 + key * 0.0325, 0.803, 0.274 + row * 0.029, stone, 0.002);
    }
    sphere(station, 0.034, 0.27, 0.802, 0.32, charcoal, [0.7, 0.35, 1.1]);
    for (const x of monitorCount === 2 ? [-0.68, 0.68] : [-0.42, 0.42]) {
      box(station, 0.11, 0.17, 0.09, x, 0.87, 0.10, darkWood, 0.014);
      const speaker = cylinder(station, 0.037, 0.037, 0.009, x, 0.875, 0.15, charcoal, 20);
      speaker.rotation.x = Math.PI / 2;
    }
    const chair = new THREE.Group();
    chair.name = 'workstation-chair';
    chair.position.set(left + 1.035, 0, z);
    chair.rotation.y = -Math.PI / 2;
    furniture.add(chair);
    box(chair, 0.46, 0.045, 0.43, 0, 0.46, 0, darkWood, 0.018);
    box(chair, 0.46, 0.33, 0.052, 0, 0.79, -0.18, darkWood, 0.018);
    for (const x of [-0.18, 0.18]) {
      for (const zz of [-0.15, 0.15]) bar(chair, [x * 1.1, 0.035, zz * 1.15], [x, 0.44, zz], 0.019, darkWood);
      bar(chair, [x, 0.45, -0.17], [x, 0.95, -0.2], 0.018, darkWood);
    }
  }
  if (occupants === 1) workstation(deskCenter, 2);
  else {
    workstation(deskCenter - deskLength * 0.25);
    workstation(deskCenter + deskLength * 0.25);
  }
  const lampZ = deskCenter - deskLength / 2 + 0.16;
  cylinder(deskGroup, 0.067, 0.075, 0.014, left + 0.32, 0.792, lampZ, white);
  bar(deskGroup, [left + 0.32, 0.8, lampZ], [left + 0.32, 1.14, lampZ], 0.013, white);
  bar(deskGroup, [left + 0.32, 1.14, lampZ], [left + 0.53, 1.2, lampZ], 0.013, white);
  cylinder(deskGroup, 0.035, 0.095, 0.075, left + 0.53, 1.185, lampZ, white);
  cylinder(deskGroup, 0.08, 0.08, 0.006, left + 0.53, 1.145, lampZ, warmLight);
  box(furniture, 0.19, 0.03, 0.78, left + 0.11, 1.57, deskCenter - 0.42, materials.wood, 0.008);
  books(furniture, left + 0.045, 1.59, deskCenter - 0.31, 4, 0.8);
  plant(furniture, left + 0.1, 1.59, deskCenter - 0.65, 0.22);

  const woodSeats = new THREE.Group();
  woodSeats.name = 'living-wood-seats';
  furniture.add(woodSeats);
  const seatStartZ = Math.min(loftFront + 0.78, front - 1.1);
  for (const z of [seatStartZ, seatStartZ + 0.66]) {
    const chair = new THREE.Group();
    chair.position.set(right - 0.34, 0, z);
    chair.rotation.y = -Math.PI / 2;
    woodSeats.add(chair);
    box(chair, 0.51, 0.043, 0.47, 0, 0.44, 0, darkWood, 0.017);
    box(chair, 0.5, 0.13, 0.05, 0, 0.91, -0.2, darkWood, 0.013);
    box(chair, 0.48, 0.07, 0.04, 0, 0.68, -0.2, darkWood, 0.009);
    for (const x of [-0.205, 0.205]) {
      for (const zz of [-0.18, 0.18]) bar(chair, [x, 0.025, zz], [x, 0.44, zz], 0.021, darkWood);
      bar(chair, [x, 0.44, -0.19], [x, 0.97, -0.22], 0.022, darkWood);
    }
  }

  const mainStorage = new THREE.Group();
  mainStorage.name = 'main-storage';
  furniture.add(mainStorage);
  const cabinetBounds = layout.mainStorage.bounds;
  const cabinetHeight = layout.mainStorage.height;
  const towerWidth = layout.mainStorage.shelfWidth;
  const cupboardWidth = cabinetBounds.maxX - cabinetBounds.minX - towerWidth;
  const cupboardX = cabinetBounds.minX + cupboardWidth / 2;
  const cabinetZ = (cabinetBounds.minZ + cabinetBounds.maxZ) / 2;
  box(mainStorage, cupboardWidth, cabinetHeight - 0.06, 0.525, cupboardX, cabinetHeight / 2 + 0.03, cabinetZ - 0.017, materials.wood, 0.011);
  box(mainStorage, cupboardWidth - 0.04, 0.055, 0.49, cupboardX, 0.028, cabinetZ - 0.02, darkWood);
  const cupboardDoors = cupboardWidth > 1.8 ? 4 : 3;
  for (let i = 0; i < cupboardDoors; i++) {
    const doorWidth = cupboardWidth / cupboardDoors;
    const x = cabinetBounds.minX + (i + 0.5) * doorWidth;
    box(mainStorage, doorWidth - 0.009, cabinetHeight - 0.1, 0.024, x, cabinetHeight / 2 + 0.01, cabinetBounds.maxZ - 0.03, paleWood, 0.004);
    box(mainStorage, 0.013, 0.15, 0.015, x + (i % 2 === 0 ? 1 : -1) * doorWidth * 0.31, 1.07, cabinetBounds.maxZ - 0.009, metal, 0.004);
  }
  const towerX = cabinetBounds.maxX - towerWidth / 2;
  box(mainStorage, towerWidth, cabinetHeight, 0.023, towerX, cabinetHeight / 2, cabinetBounds.minZ + 0.014, materials.wood);
  for (const x of [cabinetBounds.maxX - towerWidth + 0.014, cabinetBounds.maxX - 0.014]) box(mainStorage, 0.028, cabinetHeight, 0.55, x, cabinetHeight / 2, cabinetZ, materials.wood);
  for (let i = 0; i <= 5; i++) {
    const y = 0.055 + i * (cabinetHeight - 0.075) / 5;
    box(mainStorage, towerWidth, 0.027, 0.55, towerX, y, cabinetZ, materials.wood);
    if (i < 4) {
      const basketY = y + 0.16;
      box(mainStorage, towerWidth - 0.085, 0.27, 0.43, towerX, basketY, cabinetZ + 0.025, basketMat, 0.024);
      box(mainStorage, 0.11, 0.022, 0.008, towerX, basketY + 0.075, cabinetZ + 0.244, darkWood, 0.008);
    }
  }
  box(mainStorage, towerWidth - 0.09, 0.065, 0.29, towerX, cabinetHeight - 0.34, cabinetZ + 0.06, charcoal, 0.022);

  const stair = layout.stairs;
  const stairX = (stair.bottom[0] + stair.top[0]) / 2;
  const storageX = stair.top[0] + 0.31;
  const storageWidth = 0.53;
  const storageZ = stair.top[2];
  const storageHeight = Math.min(1.35, loftHeight * 0.5);
  box(furniture, storageWidth, storageHeight, 0.48, storageX, storageHeight / 2 + 0.04, storageZ, materials.wood, 0.015);
  for (let i = 0; i < 12; i++) {
    box(furniture, 0.027, storageHeight - 0.06, 0.027, storageX - storageWidth / 2 + 0.036 + i * (storageWidth - 0.075) / 11, storageHeight / 2 + 0.04, storageZ + 0.253, paleWood, 0.004);
  }
  box(furniture, 0.02, 0.18, 0.035, storageX + 0.07, 0.72, storageZ + 0.282, charcoal, 0.006);

  // Separate slab rectangles leave the stair opening physically empty.
  for (const rect of layout.loft.floorRects) {
    const x = (rect.minX + rect.maxX) / 2;
    const z = (rect.minZ + rect.maxZ) / 2;
    box(loft, rect.maxX - rect.minX, 0.14, rect.maxZ - rect.minZ, x, loftHeight - 0.07, z, materials.wood).name = 'loft-slab';
    box(loft, rect.maxX - rect.minX, 0.018, rect.maxZ - rect.minZ, x, loftHeight + 0.009, z, paleWood).name = 'loft-floor-finish';
  }
  box(loft, width - 0.03, 0.18, 0.085, 0, loftHeight - 0.084, loftFront, materials.wall, 0.007);
  box(loft, width - 0.25, 0.014, 0.015, 0, loftHeight - 0.16, loftFront - 0.05, warmLight);
  const railHeight = Math.min(0.95, upperHeight * 0.43);
  const frontRail = new THREE.Group();
  frontRail.name = 'front-loft-rail';
  loft.add(frontRail);
  const railZ = loftFront - 0.055;
  for (const level of [0.08, 0.28, 0.49, 0.70, railHeight]) bar(frontRail, [left + 0.1, loftHeight + level, railZ], [right - 0.1, loftHeight + level, railZ], level === railHeight ? 0.023 : 0.016, white);
  for (let i = 0; i <= 3; i++) {
    const x = left + 0.1 + i * (width - 0.2) / 3;
    bar(frontRail, [x, loftHeight + 0.025, railZ], [x, loftHeight + railHeight, railZ], 0.021, white);
  }
  const bedBounds = layout.bed.bounds;
  const bedWidth = layout.bed.width;
  const bedLength = layout.bed.length;
  const bedX = (bedBounds.minX + bedBounds.maxX) / 2;
  const bedZ = (bedBounds.minZ + bedBounds.maxZ) / 2;
  const bed = new THREE.Group();
  bed.name = 'loft-bed';
  bed.position.set(bedX, loftHeight, bedZ);
  bed.rotation.y = Math.PI / 2;
  loft.add(bed);
  box(bed, bedWidth + 0.06, 0.12, bedLength + 0.04, 0, 0.11, 0, paleWood, 0.022);
  box(bed, bedWidth, 0.2, bedLength, 0, 0.27, 0, bedding, 0.065).name = 'bed-mattress';
  box(bed, bedWidth + 0.025, 0.46, 0.065, 0, 0.34, -bedLength / 2, paleWood, 0.024).name = 'bed-headboard';
  box(bed, bedWidth + 0.018, 0.095, bedLength * 0.82, 0, 0.395, bedLength * 0.09, bedding, 0.04);
  box(bed, bedWidth + 0.025, 0.035, 0.19, 0, 0.452, -bedLength * 0.25, bedding, 0.014);
  const pillowXs = occupants === 1 ? [0] : [-bedWidth * 0.23, bedWidth * 0.23];
  for (const x of pillowXs) {
    const pillow = box(bed, occupants === 1 ? 0.64 : bedWidth * 0.44, 0.13, 0.36, x, 0.41, -bedLength / 2 + 0.27, linen, 0.05);
    pillow.rotation.x = -0.07;
  }
  const wardrobeBounds = layout.wardrobe.bounds;
  const wardrobeX = (wardrobeBounds.minX + wardrobeBounds.maxX) / 2;
  const wardrobeZ = (wardrobeBounds.minZ + wardrobeBounds.maxZ) / 2;
  const wardrobeDepth = wardrobeBounds.maxZ - wardrobeBounds.minZ;
  const wardrobeHeight = layout.wardrobe.height;
  const upperWardrobe = new THREE.Group();
  upperWardrobe.name = 'loft-wardrobe';
  loft.add(upperWardrobe);
  box(upperWardrobe, wardrobeBounds.maxX - wardrobeBounds.minX, wardrobeHeight, wardrobeDepth, wardrobeX, loftHeight + wardrobeHeight / 2, wardrobeZ, darkWood, 0.012);
  for (let i = 0; i < 2; i++) {
    const z = wardrobeBounds.minZ + (i + 0.5) * wardrobeDepth / 2;
    box(upperWardrobe, 0.022, wardrobeHeight - 0.07, wardrobeDepth / 2 - 0.009, wardrobeBounds.minX - 0.012, loftHeight + wardrobeHeight / 2, z, darkWood, 0.004);
    box(upperWardrobe, 0.022, 0.15, 0.012, wardrobeBounds.minX - 0.034, loftHeight + 1.05, z + (i === 0 ? 1 : -1) * wardrobeDepth * 0.15, metal, 0.003);
  }

  const { stairWall } = addRetainedStair({ group, loft, furniture, layout, wallMaterial: materials.wall, baseMaterial: stone, landingMaterial: paleWood, staircaseName: 'staircase' });

  addLaundryAppliances(furniture, layout.fixtures);

  const kitchenDoor = layout.doors.kitchen;
  const bathroomDoor = layout.doors.bathroom;
  const utilityDoor = layout.doors.utility;
  const dividerHeight = loftHeight;
  const cutEdge = makeMaterial('#9bad9f');
  box(furniture, width - 0.12, 0.018, layout.utilityFront - layout.roomFront, 0, 0.019, (layout.utilityFront + layout.roomFront) / 2, makeMaterial('#ddd7c9')).name = 'utility-floor';
  function partitionAcross(x1, x2, z, hatch = false) {
    if (x2 <= x1) return;
    if (hatch) {
      const hx1 = layout.dividerX + 0.07;
      const hx2 = Math.min(hx1 + 0.62, x2 - 0.04);
      box(partitions, hx1 - x1, dividerHeight, 0.1, (x1 + hx1) / 2, dividerHeight / 2, z, materials.wall).name = 'rear-partition-wall';
      box(partitions, x2 - hx2, dividerHeight, 0.1, (hx2 + x2) / 2, dividerHeight / 2, z, materials.wall).name = 'rear-partition-wall';
      box(partitions, hx2 - hx1, 1.28, 0.1, (hx1 + hx2) / 2, 0.64, z, materials.wall).name = 'rear-partition-wall';
      box(partitions, hx2 - hx1, dividerHeight - 1.92, 0.1, (hx1 + hx2) / 2, (dividerHeight + 1.92) / 2, z, materials.wall).name = 'rear-partition-wall';
      for (const y of [1.28, 1.92]) box(partitions, hx2 - hx1 + 0.05, 0.035, 0.15, (hx1 + hx2) / 2, y, z, paleWood, 0.005);
      for (let i = 0; i <= 4; i++) bar(partitions, [hx1 + (hx2 - hx1) * i / 4, 1.29, z], [hx1 + (hx2 - hx1) * i / 4, 1.91, z], 0.007, charcoal).name = 'utility-hatch-bar';
    } else {
      box(partitions, x2 - x1, dividerHeight, 0.1, (x1 + x2) / 2, dividerHeight / 2, z, materials.wall).name = 'rear-partition-wall';
    }
    box(group, x2 - x1, 0.13, 0.1, (x1 + x2) / 2, 0.065, z, cutEdge).name = 'partition-base';
  }
  partitionAcross(left, utilityDoor.x - utilityDoor.width / 2, utilityDoor.z);
  partitionAcross(utilityDoor.x + utilityDoor.width / 2, right, utilityDoor.z);
  partitionAcross(left, bathroomDoor.x - bathroomDoor.width / 2, layout.roomFront);
  partitionAcross(bathroomDoor.x + bathroomDoor.width / 2, kitchenDoor.x - kitchenDoor.width / 2, layout.roomFront, true);
  partitionAcross(kitchenDoor.x + kitchenDoor.width / 2, right, layout.roomFront);
  box(partitions, 0.1, dividerHeight, layout.roomFront - rear, layout.dividerX, dividerHeight / 2, (rear + layout.roomFront) / 2, materials.wall).name = 'bathroom-partition-wall';
  box(group, 0.1, 0.13, layout.roomFront - rear, layout.dividerX, 0.065, (rear + layout.roomFront) / 2, cutEdge).name = 'partition-base';
  function doorway(door, kind) {
    const frame = new THREE.Group();
    frame.name = `${kind}-doorway`;
    frame.position.set(door.x, 0, door.z);
    partitions.add(frame);
    for (const x of [-door.width / 2, door.width / 2]) box(frame, 0.045, door.height, 0.135, x, door.height / 2, 0, paleWood, 0.006);
    box(frame, door.width + 0.045, 0.045, 0.135, 0, door.height, 0, paleWood, 0.006);
    if (kind === 'kitchen') {
      const ventBottom = door.height + 0.12;
      const ventHeight = Math.max(0.07, dividerHeight - ventBottom - 0.1);
      box(frame, door.width, 0.12, 0.1, 0, door.height + 0.06, 0, materials.wall);
      box(frame, door.width, 0.1, 0.1, 0, dividerHeight - 0.05, 0, materials.wall);
      for (const x of [-door.width * 0.25, door.width * 0.25]) {
        box(frame, door.width * 0.38, ventHeight, 0.022, x, ventBottom + ventHeight / 2, 0, glass).name = 'kitchen-transom';
        for (const dx of [-door.width * 0.21, door.width * 0.21]) box(frame, 0.03, ventHeight, 0.1, x + dx, ventBottom + ventHeight / 2, 0, materials.wall);
      }
      box(frame, 0.055, ventHeight, 0.1, 0, ventBottom + ventHeight / 2, 0, materials.wall);
    } else {
      box(frame, door.width, dividerHeight - door.height, 0.1, 0, (dividerHeight + door.height) / 2, 0, materials.wall);
      if (kind === 'bathroom' && layout.zones.bathroom.maxX - layout.zones.bathroom.minX >= 1.4) {
        box(frame, door.width * 1.95, 0.035, 0.045, -door.width * 0.46, door.height + 0.05, 0.075, metal, 0.006);
        box(frame, door.width - 0.04, door.height - 0.08, 0.035, -door.width + 0.04, door.height / 2, 0.081, materials.wood, 0.007);
        box(frame, 0.018, 0.15, 0.022, -door.width * 0.6, 1.0, 0.107, charcoal, 0.006);
      }
    }
  }
  doorway(utilityDoor, 'utility');
  doorway(kitchenDoor, 'kitchen');
  doorway(bathroomDoor, 'bathroom');

  const kitchen = layout.zones.kitchen;
  const kitchenRoom = new THREE.Group();
  kitchenRoom.name = 'kitchen-fixtures';
  furniture.add(kitchenRoom);
  const kitchenCounter = new THREE.Group();
  kitchenCounter.name = 'kitchen-left-counter';
  const counterWidth = Math.min(1.55, layout.roomFront - rear - 0.65);
  const counterX = kitchen.minX + 0.35;
  const counterZ = (rear + layout.roomFront) / 2;
  kitchenCounter.position.set(counterX, 0, counterZ);
  kitchenCounter.rotation.y = Math.PI / 2;
  kitchenRoom.add(kitchenCounter);
  box(kitchenCounter, counterWidth, 0.82, 0.56, 0, 0.44, 0, materials.accent, 0.014);
  box(kitchenCounter, counterWidth + 0.03, 0.04, 0.6, 0, 0.87, 0, stone, 0.012);
  const kitchenDoors = Math.max(2, Math.round(counterWidth / 0.48));
  for (let i = 0; i < kitchenDoors; i++) {
    const x = -counterWidth / 2 + (i + 0.5) * counterWidth / kitchenDoors;
    box(kitchenCounter, counterWidth / kitchenDoors - 0.015, 0.72, 0.022, x, 0.46, 0.29, materials.accent, 0.004);
    box(kitchenCounter, 0.12, 0.012, 0.021, x, 0.756, 0.31, paleWood, 0.004);
  }
  const hobX = counterWidth * 0.2;
  box(kitchenCounter, 0.49, 0.023, 0.4, hobX, 0.904, 0, black, 0.014).name = 'kitchen-hob';
  for (const x of [hobX - 0.11, hobX + 0.11]) {
    const ring = mesh(new THREE.TorusGeometry(0.075, 0.0025, 6, 28), metal, kitchenCounter, x, 0.918, 0);
    ring.rotation.x = -Math.PI / 2;
  }
  const kitchenSink = new THREE.Group();
  kitchenSink.name = 'kitchen-sink';
  kitchenSink.position.set(-counterWidth * 0.28, 0, 0.02);
  kitchenCounter.add(kitchenSink);
  box(kitchenSink, 0.43, 0.025, 0.34, 0, 0.906, 0, metal, 0.025).name = 'kitchen-sink-rim';
  box(kitchenSink, 0.38, 0.009, 0.29, 0, 0.923, 0, charcoal, 0.029).name = 'kitchen-sink-bowl';
  box(kitchenSink, 0.31, 0.008, 0.22, 0, 0.929, 0.015, glass, 0.027);
  const kitchenFaucet = new THREE.Group();
  kitchenFaucet.name = 'kitchen-faucet';
  kitchenSink.add(kitchenFaucet);
  bar(kitchenFaucet, [0, 0.91, -0.2], [0, 1.19, -0.2], 0.011, metal);
  bar(kitchenFaucet, [0, 1.19, -0.2], [0, 1.19, -0.01], 0.011, metal);
  bar(kitchenFaucet, [0, 1.19, -0.01], [0, 1.135, -0.01], 0.011, metal);
  box(kitchenCounter, counterWidth, 0.43, 0.028, 0, 1.17, -0.26, white);
  box(kitchenCounter, counterWidth, 0.035, 0.23, 0, 1.55, -0.18, materials.wood, 0.008);
  plant(kitchenCounter, -counterWidth * 0.32, 1.57, -0.18, 0.25);
  for (let i = 0; i < 3; i++) cylinder(kitchenCounter, 0.045, 0.043, 0.1 + i * 0.025, 0.08 + i * 0.11, 1.63 + i * 0.012, -0.18, ceramic);
  const fridge = new THREE.Group();
  fridge.name = 'kitchen-refrigerator';
  fridge.position.set(right - 0.42, 0, rear + 0.37);
  kitchenRoom.add(fridge);
  box(fridge, 0.56, 1.51, 0.55, 0, 0.775, 0, white, 0.025);
  box(fridge, 0.53, 0.014, 0.018, 0, 1.03, 0.285, metal);
  for (const y of [0.79, 1.26]) box(fridge, 0.022, 0.15, 0.035, 0.19, y, 0.298, metal, 0.007);
  const kitchenWindowX = (kitchen.minX + kitchen.maxX) / 2 - 0.2;
  box(backWall, 0.88, 1.05, 0.035, kitchenWindowX, 1.85, rear + 0.032, paleWood, 0.012);
  box(backWall, 0.8, 0.97, 0.02, kitchenWindowX, 1.85, rear + 0.057, makeMaterial('#dce8df', { emissive: '#c7ddce', emissiveIntensity: 0.18, roughness: 0.25 }));
  box(backWall, 0.028, 0.97, 0.03, kitchenWindowX, 1.85, rear + 0.074, white);

  const bath = layout.zones.bathroom;
  const bathroom = new THREE.Group();
  bathroom.name = 'bathroom-fixtures';
  furniture.add(bathroom);
  const bathTile = makeMaterial('#d7dfd8', { roughness: 0.7 });
  box(bathroom, bath.maxX - bath.minX - 0.11, 0.024, bath.maxZ - bath.minZ - 0.08, (bath.minX + bath.maxX) / 2, 0.034, (bath.minZ + bath.maxZ) / 2, bathTile);
  const showerX = left + 0.45;
  const showerZ = rear + 0.47;
  box(bathroom, 0.76, 0.055, 0.8, showerX, 0.079, showerZ, white, 0.025).name = 'shower-tray';
  box(bathroom, 0.67, 0.015, 0.7, showerX, 0.112, showerZ, stone, 0.025);
  box(bathroom, 0.085, 0.01, 0.085, showerX, 0.124, showerZ, metal, 0.01);
  box(bathroom, 0.014, 1.87, 0.76, showerX + 0.39, 1.02, showerZ, glass).name = 'shower-screen';
  bar(bathroom, [showerX + 0.39, 0.12, showerZ - 0.37], [showerX + 0.39, 1.98, showerZ - 0.37], 0.01, metal);
  bar(bathroom, [showerX, 1.05, rear + 0.11], [showerX, 2.04, rear + 0.11], 0.014, metal);
  bar(bathroom, [showerX, 2.04, rear + 0.11], [showerX, 2.04, rear + 0.36], 0.014, metal);
  cylinder(bathroom, 0.09, 0.09, 0.018, showerX, 2.025, rear + 0.36, metal);
  box(bathroom, 0.19, 0.055, 0.04, showerX, 1.05, rear + 0.12, metal, 0.016);
  const toiletX = bath.maxX - 0.32;
  const toiletZ = rear + 0.51;
  box(bathroom, 0.32, 0.58, 0.18, toiletX, 0.39, toiletZ - 0.25, white, 0.045).name = 'toilet-cistern';
  sphere(bathroom, 0.2, toiletX, 0.24, toiletZ + 0.025, white, [0.7, 1.1, 1.1]);
  sphere(bathroom, 0.21, toiletX, 0.39, toiletZ + 0.045, white, [0.87, 0.37, 1.22]).name = 'toilet-bowl';
  const seat = mesh(new THREE.TorusGeometry(0.145, 0.035, 10, 32), white, bathroom, toiletX, 0.451, toiletZ + 0.063);
  seat.rotation.x = Math.PI / 2;
  seat.scale.y = 1.27;
  cylinder(bathroom, 0.027, 0.027, 0.009, toiletX, 0.688, toiletZ - 0.25, metal);
  const basin = new THREE.Group();
  basin.position.set(left + 0.255, 0, layout.roomFront - 0.44);
  basin.rotation.y = Math.PI / 2;
  bathroom.add(basin);
  box(basin, 0.43, 0.46, 0.34, 0, 0.52, 0, materials.wood, 0.014);
  box(basin, 0.46, 0.08, 0.37, 0, 0.79, 0, white, 0.035).name = 'bathroom-basin';
  box(basin, 0.32, 0.014, 0.22, 0, 0.835, 0.025, stone, 0.055);
  bar(basin, [0, 0.83, -0.1], [0, 0.99, -0.1], 0.011, metal);
  bar(basin, [0, 0.99, -0.1], [0, 0.99, 0], 0.011, metal);
  const mirror = cylinder(basin, 0.23, 0.23, 0.012, 0, 1.36, -0.18, metal, 40);
  mirror.rotation.x = Math.PI / 2;
  const mirrorGlass = cylinder(basin, 0.215, 0.215, 0.014, 0, 1.36, -0.171, glass, 40);
  mirrorGlass.rotation.x = Math.PI / 2;
  bar(bathroom, [left + 0.08, 1.14, layout.roomFront - 0.92], [left + 0.29, 1.14, layout.roomFront - 0.92], 0.01, metal);
  box(bathroom, 0.025, 0.33, 0.17, left + 0.19, 0.99, layout.roomFront - 0.92, linen, 0.006);

  for (const x of [0.04, width * 0.27]) {
    cylinder(loft, 0.055, 0.055, 0.012, x, loftHeight - 0.137, loftFront - 0.25, warmLight, 20);
    const light = new THREE.PointLight('#ffe8bb', 7, 3.2, 2);
    light.position.set(x, loftHeight - 0.22, loftFront - 0.25);
    loft.add(light);
  }

  return {
    group, walls, loft, furniture, partitions, materials, layout, stairWall,
    hotspots: [
      { id: 'living', position: new THREE.Vector3(0.07, 0.65, front * 0.53) },
      { id: 'loft', position: new THREE.Vector3(bedX, loftHeight + 0.55, bedZ) },
      { id: 'kitchen', position: new THREE.Vector3((kitchen.minX + kitchen.maxX) / 2, 1.1, counterZ) },
      { id: 'utility', position: new THREE.Vector3(kitchenDoor.x, 1.05, (layout.roomFront + layout.utilityFront) / 2) },
      { id: 'bathroom', position: new THREE.Vector3((bath.minX + bath.maxX) / 2, 1.05, (bath.minZ + bath.maxZ) / 2) },
      { id: 'stairs', position: new THREE.Vector3(stairX, 1.35, (stair.bottom[2] + stair.top[2]) / 2) },
    ],
    setPalette(name) {
      const palette = PALETTES[name] || PALETTES.oak;
      for (const [key, color] of Object.entries(palette)) materials[key].color.set(color);
      paleWood.color.set(name === 'walnut' ? '#ab8766' : '#dfc8a3');
      floorMat.color.set('#ffffff');
      bedding.color.set(name === 'walnut' ? '#b7cfdc' : '#b2d2e8');
    },
    dispose() {
      const geometries = new Set();
      const allMaterials = new Set();
      const textures = new Set();
      group.traverse(object => {
        if (object.geometry) geometries.add(object.geometry);
        if (object.material) for (const material of Array.isArray(object.material) ? object.material : [object.material]) allMaterials.add(material);
      });
      for (const geometry of geometries) geometry.dispose();
      for (const material of allMaterials) {
        for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
        material.dispose();
      }
      for (const texture of textures) texture.dispose();
      group.removeFromParent();
    },
  };
}
