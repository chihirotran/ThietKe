import { resolveDesign } from './designs.js';

let savedChoice;
try { savedChoice = localStorage.getItem('nha-minh-design-choice-v1'); } catch { /* Storage is optional. */ }
const design = resolveDesign(new URL(location.href).searchParams.get('design') || savedChoice);

const entry = design === 'townhouse' ? import('./townhouse-app.js') : import('./main.js');
entry.catch(error => {
  document.querySelector('#loading')?.setAttribute('hidden', '');
  document.querySelector('#webgl-error')?.removeAttribute('hidden');
  console.error('Unable to load the design viewer', error);
});
