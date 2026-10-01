const rect = (minX, maxX, minZ, maxZ) => ({ minX, maxX, minZ, maxZ });
const area = r => (r.maxX - r.minX) * (r.maxZ - r.minZ);

function subtract(source, cut) {
  const x0 = Math.max(source.minX, cut.minX), x1 = Math.min(source.maxX, cut.maxX);
  const z0 = Math.max(source.minZ, cut.minZ), z1 = Math.min(source.maxZ, cut.maxZ);
  if (x0 >= x1 || z0 >= z1) return [source];
  return [rect(source.minX, x0, source.minZ, source.maxZ), rect(x1, source.maxX, source.minZ, source.maxZ), rect(x0, x1, source.minZ, z0), rect(x0, x1, z1, source.maxZ)].filter(r => r.maxX - r.minX > 0.001 && r.maxZ - r.minZ > 0.001);
}

export function getTownhouseLayout() {
  const width = 3.91, depth = 11, height = 3.2;
  const left = -width / 2, right = width / 2, rear = -depth / 2, front = depth / 2;
  const inner = rect(left + 0.15, right - 0.15, rear + 0.15, front - 0.15);
  const stairBounds = rect(inner.minX, inner.maxX, inner.minZ, -3.55);
  const stairOpening = rect(inner.minX, 0.955, inner.minZ, -3.55);
  const elevator = { bounds: rect(inner.minX, -0.355, -3.45, -2), door: { axis: 'x', x: -1.08, z: -2, width: 0.82 }, shaftEstimated: true };
  const lightwell = { bounds: rect(inner.minX, -0.955, -0.75, 0.25), openToSky: true };
  const bathroom = { bounds: rect(-0.305, 0.895, -3.45, -1.5), door: { axis: 'x', x: 0.36, z: -1.5, width: 0.72 } };
  const stairs = {
    bounds: stairBounds, opening: stairOpening,
    area: area(stairBounds), previousArea: area(rect(inner.minX, inner.maxX, inner.minZ, -3.4)),
    width: 0.85, rise: height / 18, steps: 18, height,
    bottom: [1.3, 0, -3.975], top: [1.3, height, -4.925],
    flights: [
      { bounds: rect(-1.005, 0.955, -4.4, -3.55), bottom: [0.955, 0, -3.975], top: [-1.005, height / 2, -3.975], steps: 9, goings: 8, direction: '-x' },
      { bounds: rect(-1.005, 0.955, -5.35, -4.5), bottom: [-1.005, height / 2, -4.925], top: [0.955, height, -4.925], steps: 9, goings: 8, direction: '+x' },
    ],
    landing: rect(inner.minX, -1.005, -5.35, -3.55),
    arrival: rect(0.955, inner.maxX, -5.35, -3.55),
  };
  const hob = rect(-0.78, -0.25, -0.6, -0.08);
  const bedroomSpecs = [
    {
      floor: 0, id: 'guest', name: 'Phòng ngủ linh hoạt', room: rect(inner.minX, 0.9, 0.35, 3.05), bed: rect(-1.7, 0.3, 1.75, 2.95), axis: 'x',
      desk: { bounds: rect(-1.7, -0.6, 0.43, 0.93), clearance: rect(-1.45, -0.85, 0.93, 1.58), facing: '+z' },
      wardrobe: { bounds: rect(0.23, 0.83, 0.43, 0.98), facing: '+z' },
      door: { axis: 'z', x: 0.9, z: 1.37, width: 0.82 },
      camera: { position: [0.58, 1.6, 1.37], target: [-0.8, 0.9, 1.95] },
    },
    {
      floor: 2, id: 'master', name: 'Phòng ngủ chính', room: rect(inner.minX, inner.maxX, 1.5, 4.8), bed: rect(-1.7, -0.1, 2.7, 4.7), axis: 'z',
      desk: { bounds: rect(1.22, 1.72, 2.78, 3.98), clearance: rect(0.57, 1.22, 3.03, 3.73), facing: '-x' },
      wardrobe: { bounds: rect(-1.7, -0.35, 1.58, 2.1), facing: '+z' },
      camera: { position: [0.72, 1.6, 2.38], target: [0.3, 1, 3.4] },
    },
    {
      floor: 3, id: 'bedroom-front', name: 'Phòng ngủ phía trước', room: rect(inner.minX, inner.maxX, 1.95, 4.8), bed: rect(-1.7, 0.3, 3.3, 4.7), axis: 'x',
      desk: { bounds: rect(-1.7, -0.5, 2.03, 2.53), clearance: rect(-1.4, -0.8, 2.53, 3.18), facing: '+z' },
      wardrobe: { bounds: rect(1.22, 1.73, 3.15, 4.52), facing: '-x' },
      camera: { position: [0.66, 1.6, 2.7], target: [-0.8, 0.9, 3.5] },
    },
    {
      floor: 3, id: 'bedroom-rear', name: 'Phòng ngủ bên giếng trời', room: rect(inner.minX, 0.9, -0.7, 1.9), bed: rect(-1.7, 0.3, 0.65, 1.85), axis: 'x',
      desk: { bounds: rect(-0.86, 0.19, -0.62, -0.12), clearance: rect(-0.64, -0.04, -0.12, 0.53), facing: '+z' },
      wardrobe: { bounds: rect(0.27, 0.84, -0.62, -0.07), facing: '+z' },
      door: { axis: 'z', x: 0.9, z: 0.36, width: 0.82 },
      camera: { position: [0.15, 1.6, 0.42], target: [-0.7, 0.9, 0.8] },
    },
  ];
  const names = ['Tầng trệt · Đón về nhà', 'Lầu 1 · Sinh hoạt chung', 'Lầu 2 · Phòng ngủ chính', 'Lầu 3 · Hai phòng ngủ', 'Lầu 4 · Sân vườn & giặt phơi'];
  const summaries = ['Để xe máy, sảnh vào, phòng ngủ có bàn riêng và WC.', 'Phòng khách phía trước, bàn ăn gia đình và bếp phía sau.', 'Phòng ngủ chính có bàn làm việc / trang điểm, tủ áo và phòng tắm.', 'Hai phòng ngủ, mỗi phòng có bàn học và tủ riêng.', 'Không gian đa năng, giặt sấy và sân vườn phía trước.'];
  const floors = names.map((name, index) => {
    let floorRects = [inner];
    for (const opening of [elevator.bounds, ...(index ? [stairOpening, lightwell.bounds] : [])]) floorRects = floorRects.flatMap(r => subtract(r, opening));
    const rooms = [
      { id: 'landing', name: 'Sảnh thang máy', bounds: rect(-0.85, inner.maxX, -1.43, -0.95), camera: { position: [1.32, 1.6, -1.1], target: [-0.9, 1.3, -2.3] } },
      { id: 'bathroom', name: 'Phòng tắm / WC', bounds: bathroom.bounds, camera: { position: [0.36, 1.6, -1.25], target: [0.36, 1.1, -2.95] } },
    ];
    for (const bedroom of bedroomSpecs.filter(item => item.floor === index)) rooms.push({ id: bedroom.id, name: bedroom.name, bounds: bedroom.room, camera: bedroom.camera });
    if (index === 0) rooms.push({ id: 'entry', name: 'Sảnh vào & để xe máy', bounds: rect(inner.minX, inner.maxX, 3.15, inner.maxZ), camera: { position: [1.3, 1.6, 4.75], target: [-0.5, 1, 3.6] } });
    if (index === 1) rooms.push(
      { id: 'living', name: 'Phòng khách', bounds: rect(inner.minX, inner.maxX, 2.2, 4.8), camera: { position: [1.18, 1.6, 4.3], target: [-0.8, 0.9, 3.1] } },
      { id: 'dining', name: 'Bàn ăn gia đình', bounds: rect(-1.6, 0.75, 0.5, 2.1), camera: { position: [1.35, 1.6, 1.4], target: [-0.55, 0.9, 1.25] } },
      { id: 'kitchen', name: 'Bếp cạnh giếng trời', bounds: rect(-0.9, 0.7, -0.75, 0.35), camera: { position: [1.2, 1.6, 0.25], target: [-0.7, 1, -0.35] } },
    );
    if (index === 2) rooms.push({ id: 'work', name: 'Tủ áo & lưu trữ chung', bounds: rect(-0.8, 0.65, -0.65, 1.3), camera: { position: [1.3, 1.6, 0.65], target: [-0.6, 1, 0.7] } });
    if (index === 4) rooms.push(
      { id: 'terrace', name: 'Sân vườn & bàn ngoài trời', bounds: rect(inner.minX, inner.maxX, 2, inner.maxZ), camera: { position: [0.65, 1.6, 2.65], target: [-0.65, 0.9, 4.4] } },
      { id: 'laundry', name: 'Giặt sấy & lọc nước', bounds: rect(0.05, 1.7, -0.55, 1.5), camera: { position: [0.75, 1.6, 1.55], target: [0.5, 1, 0.1] } },
      { id: 'flex', name: 'Góc yên tĩnh / đa năng', bounds: rect(-1.7, 0, 0.4, 1.8), camera: { position: [0.35, 1.6, 1.35], target: [-1.1, 1, 1.0] } },
    );
    return { index, name, title: name, summary: summaries[index], elevation: index * height, baseY: index * height, height, floorRects, spawn: [1.3, -0.95], insideYaw: Math.PI, rooms, stairs: index < 4 ? stairs : null, elevator, bathroom, bedrooms: bedroomSpecs.filter(b => b.floor === index), outdoor: index === 4 ? rect(inner.minX, inner.maxX, 2, inner.maxZ) : null };
  });
  return { variant: 'townhouse', width, depth, left, right, front, rear, inner, storeys: 5, floorHeight: height, totalHeight: height * 5, floors, stairs, elevator, lightwell, bathroom, bedrooms: bedroomSpecs, kitchen: { floor: 1, hob: { bounds: hob } }, occupants: 6, bedroomCount: 4, grossFloorArea: width * depth * 5, entry: { x: 1.22, z: front, width: 1.02 }, assumptions: ['Chiều cao mỗi tầng 3,2 m là ước lượng.', '4 phòng ngủ cho gia đình 5–6 người; bố trí có thể chỉnh lại.', 'Kích thước thang máy và cầu thang cần đơn vị chuyên môn kiểm tra.'] };
}
