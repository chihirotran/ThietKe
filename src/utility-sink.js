import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function addUtilitySink(parent, spec) {
  const group = new THREE.Group();
  group.name = 'utility-sink';
  const { minX, maxX, minZ, maxZ } = spec.bounds;
  const rotation = spec.rotationY ?? 0;
  const sideways = Math.abs(Math.sin(rotation)) > 0.5;
  const width = (sideways ? maxZ - minZ : maxX - minX) - 0.024;
  const depth = (sideways ? maxX - minX : maxZ - minZ) - 0.024;
  const height = spec.height ?? 0.88;
  group.position.set((minX + maxX) / 2, 0, (minZ + maxZ) / 2);
  group.rotation.y = rotation;
  parent.add(group);

  const steel = new THREE.MeshStandardMaterial({ color: '#b6c1c2', metalness: 0.78, roughness: 0.32 });
  const inner = new THREE.MeshStandardMaterial({ color: '#7f9499', metalness: 0.68, roughness: 0.4 });
  const dark = new THREE.MeshStandardMaterial({ color: '#354544', roughness: 0.6 });
  const blue = new THREE.MeshStandardMaterial({ color: '#2d7397', metalness: 0.28, roughness: 0.43 });
  const green = new THREE.MeshStandardMaterial({ color: '#579e87', metalness: 0.2, roughness: 0.43 });
  const pipeMaterial = new THREE.MeshStandardMaterial({ color: '#d6dcd7', roughness: 0.5 });

  function mesh(geometry, material, x, y, z, name = '', target = group) {
    const result = new THREE.Mesh(geometry, material);
    result.position.set(x, y, z);
    result.name = name;
    result.castShadow = result.receiveShadow = true;
    target.add(result);
    return result;
  }
  function box(w, h, d, x, y, z, material = steel, name = '', target = group) {
    const radius = Math.min(0.005, w / 3, h / 3, d / 3);
    return mesh(new RoundedBoxGeometry(w, h, d, 2, radius), material, x, y, z, name, target);
  }
  function pipe(points, radius = 0.009, material = steel, target = group) {
    const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)), false, 'centripetal');
    return mesh(new THREE.TubeGeometry(curve, 20, radius, 10, false), material, 0, 0, 0, '', target);
  }

  const basinWidth = width * 0.61;
  const basinDepth = depth * 0.68;
  const basinX = -width / 2 + 0.025 + basinWidth / 2;
  const basinZ = 0.018;
  const bowl = new THREE.Group();
  bowl.name = 'utility-sink-bowl';
  group.add(bowl);
  box(basinWidth, 0.012, basinDepth, basinX, height - 0.17, basinZ, inner, '', bowl);
  for (const side of [-1, 1]) {
    box(0.012, 0.16, basinDepth, basinX + side * (basinWidth - 0.012) / 2, height - 0.085, basinZ, inner, '', bowl);
    box(basinWidth, 0.16, 0.012, basinX, height - 0.085, basinZ + side * (basinDepth - 0.012) / 2, inner, '', bowl);
  }
  mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.003, 24), dark, basinX, height - 0.162, basinZ, 'utility-sink-drain', bowl);

  const frontDepth = depth / 2 - basinZ - basinDepth / 2;
  const backDepth = depth / 2 + basinZ - basinDepth / 2;
  box(width, 0.026, frontDepth, 0, height, depth / 2 - frontDepth / 2);
  box(width, 0.026, backDepth, 0, height, -depth / 2 + backDepth / 2);
  box(0.025, 0.026, basinDepth, -width / 2 + 0.0125, height, basinZ);
  const drainerWidth = width - basinWidth - 0.025;
  const drainerX = width / 2 - drainerWidth / 2;
  box(drainerWidth, 0.026, basinDepth, drainerX, height, basinZ, steel, 'utility-sink-drainer');
  for (let i = 0; i < 5; i += 1) {
    box(drainerWidth - 0.025, 0.002, 0.005, drainerX, height + 0.014, basinZ + (i - 2) * basinDepth / 6, inner);
  }
  box(width, 0.065, 0.012, 0, height + 0.03, -depth / 2 + 0.006);

  for (const x of [-width / 2 + 0.025, width / 2 - 0.025]) {
    for (const z of [-depth / 2 + 0.025, depth / 2 - 0.025]) {
      box(0.027, height - 0.03, 0.027, x, (height - 0.03) / 2, z);
      box(0.035, 0.018, 0.035, x, 0.013, z, dark);
    }
    box(0.024, 0.025, depth - 0.04, x, 0.19, 0);
  }
  box(width - 0.04, 0.025, 0.024, 0, 0.19, -depth / 2 + 0.025);

  const faucetZ = -depth / 2 + backDepth / 2;
  const faucetHeight = Math.min(height + 0.285, 1.185);
  const faucet = new THREE.Group();
  faucet.name = 'utility-sink-faucet';
  group.add(faucet);
  pipe([
    [basinX, height + 0.018, faucetZ],
    [basinX, faucetHeight - 0.05, faucetZ],
    [basinX, faucetHeight, faucetZ + 0.05],
    [basinX, faucetHeight - 0.005, faucetZ + 0.13],
    [basinX, faucetHeight - 0.055, faucetZ + 0.16],
  ], 0.011, steel, faucet);
  box(0.06, 0.009, 0.018, basinX + 0.018, height + 0.065, faucetZ, steel, '', faucet);

  const pump = new THREE.Group();
  pump.name = 'utility-water-pump';
  pump.position.set(width * 0.09, 0, depth * 0.12);
  group.add(pump);
  const pumpWidth = Math.min(width * 0.66, 0.35);
  box(pumpWidth, 0.028, 0.2, 0, 0.048, 0, dark, '', pump);
  const motor = mesh(new THREE.CylinderGeometry(0.068, 0.068, pumpWidth * 0.49, 24), blue, -pumpWidth * 0.2, 0.13, 0, 'utility-pump-motor', pump);
  motor.rotation.z = Math.PI / 2;
  for (let i = 0; i < 5; i += 1) {
    const fin = mesh(new THREE.CylinderGeometry(0.072, 0.072, 0.009, 24), blue, -pumpWidth * 0.4 + i * pumpWidth * 0.095, 0.13, 0, '', pump);
    fin.rotation.z = Math.PI / 2;
  }
  mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.14, 24), green, pumpWidth * 0.25, 0.145, 0, 'utility-pump-housing', pump);
  mesh(new THREE.CapsuleGeometry(0.052, 0.068, 6, 18), green, pumpWidth * 0.25, 0.295, 0, 'utility-pump-pressure-unit', pump);
  box(0.06, 0.04, 0.055, -pumpWidth * 0.18, 0.212, 0, dark, '', pump);
  pipe([[pumpWidth * 0.25, 0.19, 0.055], [pumpWidth * 0.25, 0.19, 0.105], [pumpWidth * 0.25, 0.39, 0.105]], 0.009, pipeMaterial, pump);
  pipe([[basinX, height - 0.18, basinZ], [basinX, 0.49, basinZ], [basinX, 0.4, basinZ - 0.06], [basinX, 0.42, -depth / 2 + 0.04]], 0.019, pipeMaterial);
  return group;
}
