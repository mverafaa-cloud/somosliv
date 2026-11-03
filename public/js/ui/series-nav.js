// ============================================================
//  Navegación jerárquica de series (Programación / Posiciones)
//  Junior y Senior, cada uno con Fase Regular, Playoffs (Oro/Plata)
//  y, en Junior, Descenso. Se dibuja según qué series existen en los partidos.
// ============================================================
export const SERIES_GROUPS = [
  { key: 'libre',  label: 'Junior', regular: 'libre',  oro: 'libre-oro',  plata: 'libre-plata',  descenso: 'libre-descenso' },
  { key: 'senior', label: 'Senior', regular: 'senior', oro: 'senior-oro', plata: 'senior-plata', descenso: 'senior-descenso' },
];

export function groupOf(serie) {
  return SERIES_GROUPS.find(g => [g.regular, g.oro, g.plata, g.descenso].includes(serie)) || null;
}
export function isPlayoffSerie(serie) {
  return SERIES_GROUPS.some(g => serie === g.oro || serie === g.plata);
}
export function isDescensoSerie(serie) {
  return SERIES_GROUPS.some(g => serie === g.descenso);
}
function defaultLeaf(g, has) {
  if (has(g.regular)) return g.regular;
  if (has(g.oro)) return g.oro;
  if (has(g.plata)) return g.plata;
  if (has(g.descenso)) return g.descenso;
  return null;
}
export function defaultSerie(has) {
  for (const g of SERIES_GROUPS) { const l = defaultLeaf(g, has); if (l) return l; }
  return null;
}
// Devuelve el HTML de las filas de pestañas anidadas. `has(id)` => bool. `active` = hoja activa.
export function seriesNavHTML(active, has, esc) {
  const e = esc || (s => s);
  const groups = SERIES_GROUPS.filter(g => [g.regular, g.oro, g.plata, g.descenso].some(has));
  const actG = groupOf(active) || groups[0];
  const btn = (label, on, key) => `<button class="chip ${on ? 'active' : ''}" data-nav="${key}">${e(label)}</button>`;
  const rows = [];
  const top = groups.map(g => btn(g.label, g === actG, 'grp:' + g.key));
  if (top.length) rows.push(`<div class="chips snav-row">${top.join('')}</div>`);
  if (actG) {
    const hasPO = has(actG.oro) || has(actG.plata);
    const sub = [];
    if (has(actG.regular)) sub.push(btn('Fase Regular', active === actG.regular, 'reg:' + actG.key));
    if (hasPO) sub.push(btn('Playoffs', active === actG.oro || active === actG.plata, 'po:' + actG.key));
    if (has(actG.descenso)) sub.push(btn('Descenso', active === actG.descenso, 'desc:' + actG.key));
    if (sub.length > 1) rows.push(`<div class="chips snav-row snav-sub">${sub.join('')}</div>`);
    if (active === actG.oro || active === actG.plata) {
      const pl = [];
      if (has(actG.oro)) pl.push(btn('Oro', active === actG.oro, 'leaf:' + actG.oro));
      if (has(actG.plata)) pl.push(btn('Plata', active === actG.plata, 'leaf:' + actG.plata));
      if (pl.length) rows.push(`<div class="chips snav-row snav-sub">${pl.join('')}</div>`);
    }
  }
  return rows.join('');
}
// Resuelve la key de un botón [data-nav] a la serie hoja que se debe activar.
export function resolveNav(key, has) {
  const i = key.indexOf(':');
  const kind = key.slice(0, i), arg = key.slice(i + 1);
  if (kind === 'leaf') return arg;
  const g = SERIES_GROUPS.find(x => x.key === arg);
  if (!g) return arg;
  if (kind === 'reg') return g.regular;
  if (kind === 'po') return has(g.oro) ? g.oro : g.plata;
  if (kind === 'desc') return g.descenso;
  return defaultLeaf(g, has); // 'grp'
}
export const SNAV_CSS = '.snav-row{margin-bottom:6px}.snav-sub{padding-left:4px}.snav-sub .chip{font-size:.82rem;padding:5px 12px}';
