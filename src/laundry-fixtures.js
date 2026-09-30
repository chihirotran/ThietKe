import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function addLaundryAppliances(parent, specs) {
  const white = new THREE.MeshStandardMaterial({ color: '#efefeb', roughness: 0.42 });
  const dark = new THREE.MeshStandardMaterial({ color: '#35413f', roughness: 0.4 });
  const steel = new THREE.MeshStandardMaterial({ color: '#9ba5a1', metalness: 0.7, roughness: 0.3 });
  const glass = new THREE.MeshStandardMaterial({ color: '#657d80', metalness: 0.18, roughness: 0.2 });
  const blue = new THREE.MeshStandardMaterial({ color: '#79b3c9', emissive: '#448697', emissiveIntensity: 0.3 });
  function box(group, w, h, d, x, y, z, material, radius = 0.006, name = '') {
    const geometry = new RoundedBoxGeometry(w, h, d, 2, Math.min(radius, w / 3, h / 3, d / 3));
    const result = new THREE.Mesh(geometry, material);
    result.position.set(x, y, z); result.name = name;
    result.castShadow = result.receiveShadow = true; group.add(result); return result;
  }
  function disc(group, radius, height, x, y, z, material, front = false, name = '') {
    const result = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 36), material);
    result.position.set(x, y, z); result.name = name;
    if (front) result.rotation.x = Math.PI / 2;
    result.castShadow = result.receiveShadow = true; group.add(result); return result;
  }
  function place(name, spec) {
    const group = new THREE.Group(); group.name = name;
    group.userData.applianceType = spec.type;
    const r = spec.bounds;
    group.position.set((r.minX + r.maxX) / 2, 0, (r.minZ + r.maxZ) / 2);
    group.rotation.y = spec.rotationY ?? 0;
    parent.add(group);
    return { group, width: r.maxX - r.minX, depth: r.maxZ - r.minZ };
  }
  const washer = place('washer', specs.washer);
  const ww = washer.width - 0.02, wd = washer.depth - 0.05;
  box(washer.group, ww, 0.89, wd, 0, 0.485, 0, white, 0.023, 'washer-top-loading-body');
  box(washer.group, ww - 0.05, 0.055, wd - 0.035, 0, 0.954, 0, white, 0.018);
  box(washer.group, ww - 0.1, 0.009, wd - 0.12, 0, 0.987, 0.018, dark, 0.047, 'washer-top-opening');
  disc(washer.group, 0.17, 0.008, 0, 0.995, 0.025, steel);
  disc(washer.group, 0.143, 0.009, 0, 1.001, 0.025, dark);
  box(washer.group, ww - 0.04, 0.06, 0.09, 0, 0.99, -wd / 2 + 0.043, white, 0.016);
  box(washer.group, 0.11, 0.005, 0.034, 0.08, 1.023, -wd / 2 + 0.044, dark, 0.003);
  disc(washer.group, 0.022, 0.008, -0.11, 1.023, -wd / 2 + 0.044, steel);
  const lid = new THREE.Group(); lid.name = 'washer-lid'; lid.position.set(0, 1.007, -wd * 0.29); lid.rotation.x = -1.13; washer.group.add(lid);
  box(lid, ww - 0.09, 0.023, wd * 0.71, 0, 0, wd * 0.355, white, 0.014);
  box(lid, ww - 0.14, 0.01, wd * 0.59, 0, 0.017, wd * 0.355, glass, 0.013);
  box(washer.group, ww - 0.08, 0.034, wd - 0.055, 0, 0.03, 0, dark, 0.006);

  const dryer = place('dryer', specs.dryer);
  const dw = dryer.width - 0.02, dd = dryer.depth - 0.06;
  box(dryer.group, dw, 0.81, dd, 0, 0.44, 0, white, 0.024, 'dryer-front-loading-body');
  box(dryer.group, dw - 0.055, 0.095, 0.014, 0, 0.772, dd / 2 + 0.006, white, 0.007);
  disc(dryer.group, 0.2, 0.02, 0, 0.418, dd / 2 + 0.011, steel, true, 'dryer-door');
  disc(dryer.group, 0.164, 0.015, 0, 0.418, dd / 2 + 0.018, dark, true);
  disc(dryer.group, 0.132, 0.007, -0.013, 0.426, dd / 2 + 0.025, glass, true);
  disc(dryer.group, 0.025, 0.012, 0.15, 0.777, dd / 2 + 0.019, steel, true);
  box(dryer.group, 0.12, 0.031, 0.007, -0.08, 0.778, dd / 2 + 0.018, dark, 0.003);
  box(dryer.group, dw - 0.05, 0.035, dd - 0.03, 0, 0.031, 0, dark, 0.005);

  const purifier = place('water-purifier', specs.waterPurifier);
  const pw = purifier.width - 0.018, pd = purifier.depth - 0.025;
  box(purifier.group, pw, 0.96, pd, 0, 0.5, 0, white, 0.018, 'water-purifier-body');
  box(purifier.group, pw - 0.035, 0.52, 0.014, 0, 0.643, pd / 2, dark, 0.009);
  box(purifier.group, pw - 0.075, 0.18, 0.021, 0, 0.571, pd / 2 + 0.001, glass, 0.009, 'water-purifier-recess');
  box(purifier.group, pw - 0.075, 0.018, 0.06, 0, 0.47, pd / 2 - 0.02, steel, 0.004, 'water-purifier-drip-tray');
  for (const x of [-pw * 0.2, pw * 0.2]) {
    box(purifier.group, 0.037, 0.02, 0.024, x, 0.755, pd / 2 - 0.006, blue, 0.003);
    box(purifier.group, 0.021, 0.045, 0.025, x, 0.687, pd / 2 - 0.006, steel, 0.005);
  }
  box(purifier.group, pw - 0.04, 0.035, pd - 0.035, 0, 0.027, 0, dark, 0.005);
  return { washer: washer.group, dryer: dryer.group, waterPurifier: purifier.group };
}
