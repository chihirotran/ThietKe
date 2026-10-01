const rect = (minX, maxX, minZ, maxZ) => ({ minX, maxX, minZ, maxZ });
const center = r => [(r.minX + r.maxX) / 2, (r.minZ + r.maxZ) / 2];

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
  const stairOpening = rect(inner.minX, 0.955, inner.minZ, -3.4);
  const elevator = { bounds: rect(inner.minX, -0.355, -3.3, -1.85), door: { axis: 'x', x: -1.08, z: -1.85, width: 0.82 }, shaftEstimated: true };
  const lightwell = { bounds: rect(inner.minX, -0.955, -0.75, 0.25), openToSky: true };
  const bathroom = { bounds: rect(-0.305, 0.895, -3.3, -1.35), door: { axis: 'x', x: 0.36, z: -1.35, width: 0.72 } };
  const stairs = {
    bounds: rect(inner.minX, inner.maxX, inner.minZ, -3.4), opening: stairOpening,
    width: 0.85, rise: height / 18, steps: 18, height,
    bottom: [1.3, 0, -3.825], top: [1.3, height, -4.925],
    flights: [
      { bounds: rect(-1.005, 0.955, -4.25, -3.4), bottom: [0.955, 0, -3.825], top: [-1.005, height / 2, -3.825], steps: 9, direction: '-x' },
      { bounds: rect(-1.005, 0.955, -5.35, -4.5), bottom: [-1.005, height / 2, -4.925], top: [0.955, height, -4.925], steps: 9, direction: '+x' },
    ],
    landing: rect(inner.minX, -1.005, -5.35, -3.4),
    arrival: rect(0.955, inner.maxX, -5.35, -3.4),
  };
  const hob = rect(-0.78, -0.25, -0.6, -0.08);
  const bedroomSpecs = [
    { floor: 0, id: 'guest', name: 'Phòng ngủ linh hoạt', room: rect(inner.minX, 0.8, 0.4, 2.55), bed: rect(-1.55, 0.35, 0.95, 2.15), axis: 'x' },
    { floor: 2, id: 'master', name: 'Phòng ngủ chính', room: rect(inner.minX, inner.maxX, 1.4, 4.8), bed: rect(-1.3, 0.3, 2.25, 4.25), axis: 'z' },
    { floor: 3, id: 'bedroom-front', name: 'Phòng ngủ phía trước', room: rect(inner.minX, inner.maxX, 2.5, 4.8), bed: rect(-1.4, 0.6, 3.0, 4.4), axis: 'x' },
    { floor: 3, id: 'bedroom-rear', name: 'Phòng ngủ bên giếng trời', room: rect(inner.minX, 0.8, -0.7, 2.35), bed: rect(-1.55, 0.45, 0.65, 2.05), axis: 'x' },
  ];
  const names = ['Tầng trệt · Đón về nhà', 'Lầu 1 · Sinh hoạt chung', 'Lầu 2 · Phòng ngủ chính', 'Lầu 3 · Hai phòng ngủ', 'Lầu 4 · Sân vườn & giặt phơi'];
  const summaries = ['Để xe máy, sảnh vào, phòng ngủ linh hoạt và WC.', 'Phòng khách phía trước, bàn ăn gia đình và bếp phía sau.', 'Phòng ngủ chính, góc làm việc, tủ áo và phòng tắm.', 'Hai phòng ngủ có cửa sổ hướng mặt trước và giếng trời.', 'Không gian đa năng, giặt sấy và sân vườn phía trước.'];
  const floors = names.map((name, index) => {
    let floorRects = [inner];
    for (const opening of [elevator.bounds, ...(index ? [stairOpening, lightwell.bounds] : [])]) floorRects = floorRects.flatMap(r => subtract(r, opening));
    const rooms = [
      { id: 'landing', name: 'Sảnh thang máy', bounds: rect(-0.85, inner.maxX, -1.28, -0.8), camera: { position: [1.32, 1.6, -0.95], target: [-0.9, 1.3, -2.15] } },
      { id: 'bathroom', name: 'Phòng tắm / WC', bounds: bathroom.bounds, camera: { position: [0.36, 1.6, -1.1], target: [0.36, 1.1, -2.8] } },
    ];
    for (const bedroom of bedroomSpecs.filter(item => item.floor === index)) rooms.push({ id: bedroom.id, name: bedroom.name, bounds: bedroom.room, camera: { position: index === 2 ? [1.15, 1.6, 2.3] : [0.65, 1.6, bedroom.bed.minZ - 0.35], target: [...center(bedroom.bed).slice(0, 1), 0.8, center(bedroom.bed)[1]] } });
    if (index === 0) rooms.push({ id: 'entry', name: 'Sảnh vào & để xe máy', bounds: rect(inner.minX, inner.maxX, 2.7, inner.maxZ), camera: { position: [1.3, 1.6, 4.75], target: [-0.5, 1, 3.2] } });
    if (index === 1) rooms.push(
      { id: 'living', name: 'Phòng khách', bounds: rect(inner.minX, inner.maxX, 2.2, 4.8), camera: { position: [1.18, 1.6, 4.3], target: [-0.8, 0.9, 3.1] } },
      { id: 'dining', name: 'Bàn ăn gia đình', bounds: rect(-1.6, 0.75, 0.5, 2.1), camera: { position: [1.35, 1.6, 1.4], target: [-0.55, 0.9, 1.25] } },
      { id: 'kitchen', name: 'Bếp cạnh giếng trời', bounds: rect(-0.9, 0.7, -0.75, 0.35), camera: { position: [1.2, 1.6, 0.25], target: [-0.7, 1, -0.35] } },
    );
    if (index === 2) rooms.push({ id: 'work', name: 'Làm việc & tủ áo', bounds: rect(-0.8, 0.65, -0.65, 1.3), camera: { position: [1.3, 1.6, 0.65], target: [-0.6, 1, 0.7] } });
    if (index === 4) rooms.push(
      { id: 'terrace', name: 'Sân vườn & bàn ngoài trời', bounds: rect(inner.minX, inner.maxX, 2, inner.maxZ), camera: { position: [0.65, 1.6, 2.65], target: [-0.65, 0.9, 4.4] } },
      { id: 'laundry', name: 'Giặt sấy & lọc nước', bounds: rect(0.05, 1.7, -0.55, 1.5), camera: { position: [0.75, 1.6, 1.55], target: [0.5, 1, 0.1] } },
      { id: 'flex', name: 'Góc yên tĩnh / đa năng', bounds: rect(-1.7, 0, 0.4, 1.8), camera: { position: [0.35, 1.6, 1.35], target: [-1.1, 1, 1.0] } },
    );
    return { index, name, title: name, summary: summaries[index], elevation: index * height, baseY: index * height, height, floorRects, spawn: [1.3, -0.95], insideYaw: Math.PI, rooms, stairs: index < 4 ? stairs : null, elevator, bathroom, bedrooms: bedroomSpecs.filter(b => b.floor === index), outdoor: index === 4 ? rect(inner.minX, inner.maxX, 2, inner.maxZ) : null };
  });
  return { variant: 'townhouse', width, depth, left, right, front, rear, inner, storeys: 5, floorHeight: height, totalHeight: height * 5, floors, stairs, elevator, lightwell, bathroom, bedrooms: bedroomSpecs, kitchen: { floor: 1, hob: { bounds: hob } }, occupants: 6, bedroomCount: 4, grossFloorArea: width * depth * 5, entry: { x: 1.22, z: front, width: 1.02 }, assumptions: ['Chiều cao mỗi tầng 3,2 m là ước lượng.', '4 phòng ngủ cho gia đình 5–6 người; bố trí có thể chỉnh lại.', 'Kích thước thang máy và cầu thang cần đơn vị chuyên môn kiểm tra.'] };
}
