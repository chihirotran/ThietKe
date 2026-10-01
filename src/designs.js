import { DEFAULT_DIMENSIONS, loadDimensions } from './dimensions.js';

export const DESIGN_IDS = ['reference', 'modern', 'proposed', 'townhouse'];
export const DESIGN_NAMES = { reference: '01 · Theo ảnh mẫu', modern: '02 · Hiện đại', proposed: '03 · Theo mặt bằng mới', townhouse: '04 · Nhà 5 tầng' };

export function resolveDesign(value) {
  return DESIGN_IDS.includes(value) ? value : 'proposed';
}

export function designStorageKey(design) {
  return `nha-minh-design-${resolveDesign(design)}-v1`;
}

export function loadDesignSettings(serialized) {
  let data;
  try { data = JSON.parse(serialized); } catch { data = null; }
  return {
    dimensions: data?.dimensions ? loadDimensions(JSON.stringify(data.dimensions)) : { ...DEFAULT_DIMENSIONS },
    occupants: data?.occupants === 2 ? 2 : 1,
    palette: data?.palette === 'walnut' ? 'walnut' : 'oak',
    warmLight: data?.warmLight !== false,
  };
}
