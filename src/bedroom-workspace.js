import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function addBedroomWorkspace(parent, bedroom, materials) {
  const { bounds, clearance, facing = '+z' } = bedroom.desk;
  const wood = materials.wood ?? materials.oak;
  const dark = materials.graphite;
  const cream = materials.cream;
  const steel = materials.steel ?? dark;
  const textile = materials.textile ?? cream;
  const accent = materials.sage ?? textile;
  const glow = materials.glow ?? cream;
  const screen = materials.screen ?? dark;
  const rotated = facing === '-x';
  const width = rotated ? bounds.maxZ - bounds.minZ : bounds.maxX - bounds.minX;
  const depth = rotated ? bounds.maxX - bounds.minX : bounds.maxZ - bounds.minZ;
  const group = new THREE.Group();
  group.name = 'bedroom-workspace';
  group.userData = { bedroomId: bedroom.id, workspaceId: bedroom.id, desk: { bounds: { ...bounds }, clearance: { ...clearance }, facing } };
  group.position.set((bounds.minX + bounds.maxX) / 2, 0, (bounds.minZ + bounds.maxZ) / 2);
  group.rotation.y = rotated ? -Math.PI / 2 : 0;
  parent.add(group);
  const desk = new THREE.Group();
  desk.name = `${bedroom.id}-desk`;
  desk.userData = { workspaceId: bedroom.id, bounds: { ...bounds } };
  group.add(desk);

  function box(target, name, w, h, d, x, y, z, material, radius = 0) {
    const geometry = radius
      ? new RoundedBoxGeometry(w, h, d, 2, Math.min(radius, w / 3, h / 3, d / 3))
      : new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    target.add(mesh);
    return mesh;
  }
  function disc(target, name, radius, h, x, y, z, material) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, h, 20), material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    target.add(mesh);
    return mesh;
  }
  function detail(target, name) {
    const item = new THREE.Group();
    item.name = name;
    item.userData.walkThrough = true;
    target.add(item);
    return item;
  }

  box(desk, 'desk-surface', width, 0.045, depth, 0, 0.75, 0, wood, 0.018);
  for (const x of [-width / 2 + 0.055, width / 2 - 0.055]) {
    for (const z of [-depth / 2 + 0.05, depth / 2 - 0.05]) {
      box(desk, 'desk-leg', 0.03, 0.7275, 0.03, x, 0.36375, z, dark, 0.004);
    }
    box(desk, 'desk-side-brace', 0.028, 0.035, depth - 0.085, x, 0.67, 0, dark);
  }
  box(desk, 'desk-rear-brace', width - 0.085, 0.07, 0.027, 0, 0.66, -depth / 2 + 0.04, dark);

  const chair = new THREE.Group();
  chair.name = `${bedroom.id}-desk-chair`;
  chair.userData = { bedroomId: bedroom.id, workspaceId: bedroom.id, role: 'workspace-chair', clearance: { ...clearance } };
  const dx = (clearance.minX + clearance.maxX) / 2 - group.position.x;
  const dz = (clearance.minZ + clearance.maxZ) / 2 - group.position.z;
  chair.position.set(rotated ? dz : dx, 0, rotated ? -dx : dz);
  group.add(chair);
  const chairWidth = Math.min(0.46, (rotated ? clearance.maxZ - clearance.minZ : clearance.maxX - clearance.minX) - 0.08);
  const chairDepth = Math.min(0.44, (rotated ? clearance.maxX - clearance.minX : clearance.maxZ - clearance.minZ) - 0.1);
  const master = bedroom.id === 'master';
  const guest = bedroom.id === 'guest';
  const upholstery = master ? cream : guest ? textile : accent;
  box(chair, 'workspace-chair-seat', chairWidth, 0.08, chairDepth, 0, 0.46, 0, upholstery, 0.04);
  box(chair, 'workspace-chair-back', chairWidth, master ? 0.37 : 0.28, 0.055, 0, master ? 0.715 : 0.67, chairDepth / 2 - 0.025, upholstery, 0.035);
  for (const x of [-chairWidth / 2 + 0.055, chairWidth / 2 - 0.055]) {
    for (const z of [-chairDepth / 2 + 0.05, chairDepth / 2 - 0.05]) {
      box(chair, 'workspace-chair-leg', 0.028, 0.42, 0.028, x, 0.21, z, master ? steel : wood, 0.004);
    }
    box(chair, 'workspace-chair-back-support', 0.025, 0.29, 0.025, x, 0.555, chairDepth / 2 - 0.028, master ? steel : wood);
  }

  const lamp = detail(desk, 'workspace-reading-lamp');
  const lampX = -width / 2 + 0.13;
  const lampZ = -depth / 2 + 0.105;
  disc(lamp, 'lamp-foot', 0.065, 0.018, lampX, 0.783, lampZ, dark);
  disc(lamp, 'lamp-stem', 0.009, 0.31, lampX, 0.94, lampZ, steel);
  box(lamp, 'lamp-arm', 0.018, 0.018, 0.105, lampX, 1.09, lampZ + 0.045, steel, 0.005);
  disc(lamp, 'lamp-shade', 0.054, 0.032, lampX, 1.086, lampZ + 0.09, dark);
  disc(lamp, 'lamp-light', 0.042, 0.006, lampX, 1.066, lampZ + 0.09, glow);

  const accessories = detail(desk, 'workspace-study-accessories');
  if (master || bedroom.id === 'bedroom-rear') {
    const laptopX = master ? -0.16 : 0;
    box(accessories, 'workspace-laptop-keyboard', 0.35, 0.014, 0.22, laptopX, 0.784, 0.025, steel, 0.008);
    box(accessories, 'workspace-laptop-keys', 0.29, 0.004, 0.13, laptopX, 0.793, 0.006, dark, 0.004);
    box(accessories, 'workspace-laptop-screen-frame', 0.35, 0.225, 0.014, laptopX, 0.902, -0.085, dark, 0.008);
    box(accessories, 'workspace-laptop-screen', 0.31, 0.189, 0.005, laptopX, 0.907, -0.075, screen, 0.004);
  } else {
    box(accessories, 'workspace-open-notebook', 0.37, 0.017, 0.245, 0, 0.782, 0.045, cream, 0.007);
    box(accessories, 'workspace-notebook-spine', 0.008, 0.003, 0.23, 0, 0.792, 0.045, textile);
    for (const x of [-0.095, 0.095]) {
      for (let line = 0; line < 4; line++) box(accessories, 'workspace-notebook-rule', 0.13, 0.001, 0.0015, x, 0.792, -0.01 + line * 0.027, textile);
    }
    box(accessories, 'workspace-pen', 0.009, 0.009, 0.13, 0.235, 0.782, 0.07, dark, 0.003);
  }
  if (master) {
    const mirrorX = width / 2 - 0.2;
    box(accessories, 'workspace-vanity-mirror-base', 0.2, 0.022, 0.11, mirrorX, 0.784, -0.125, wood, 0.009);
    box(accessories, 'workspace-vanity-mirror-stem', 0.018, 0.18, 0.018, mirrorX, 0.877, -0.145, steel);
    box(accessories, 'workspace-vanity-mirror-frame', 0.245, 0.31, 0.028, mirrorX, 1.083, -0.145, wood, 0.06);
    box(accessories, 'workspace-vanity-mirror', 0.215, 0.28, 0.004, mirrorX, 1.083, -0.128, steel, 0.055);
  } else {
    const bookX = width / 2 - 0.135;
    box(accessories, 'workspace-book-cover', 0.18, 0.031, 0.16, bookX, 0.79, -0.13, accent, 0.006);
    box(accessories, 'workspace-book-pages', 0.172, 0.018, 0.154, bookX, 0.79, -0.126, cream);
  }
  return group;
}
