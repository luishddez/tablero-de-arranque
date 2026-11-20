'use strict';
// ---------- utilidades ----------
const $ = s => document.querySelector(s);
const pad = n => String(n).padStart(2, '0');
const toMin = hhmm => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const fmt = m => m === 1440 ? '24:00' : `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
const dur = m => { m = Math.round(m); return m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ' ' + (m % 60) + ' min' : ''}` : `${m} min`; };
const hoyKey = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const ahoraMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
const safe = { get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } } };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- frases (autor y obra verificados) ----------
const FRASES = [
  { t: 'Un viaje de mil millas empieza bajo tus pies.', a: 'Laozi, Dao De Jing, cap. 64' },
  { t: 'Caminante, no hay camino, se hace camino al andar.', a: 'Antonio Machado, Proverbios y cantares XXIX' },
  { t: 'Lo intentaste. Fallaste. No importa. Intenta otra vez. Falla mejor.', a: 'Samuel Beckett, Worstward Ho' },
  { t: 'No pierdas más tiempo discutiendo cómo debe ser un hombre bueno. Sé uno.', a: 'Marco Aurelio, Meditaciones 10.16' },
  { t: 'Sufrimos más en la imaginación que en la realidad.', a: 'Séneca, Cartas a Lucilio 13' },
  { t: 'El que lee mucho y anda mucho, ve mucho y sabe mucho.', a: 'Cervantes, Quijote II, 25' }
];
// ---------- íconos y facilitadores (Hábitos Atómicos: hacer fácil lo que quieres, poner fricción a lo que no) ----------
const EMO = { manana: '☕', salida: '🚶', comida: '🍽️', 'com-desayuno': '🥤', 'com-previa': '🥤', 'com-cena': '🍳', gym: '💪', cierre: '🌙', cal: '📅', tarea: '🎯', esencial: '⭐', pregunta: '💭', ropa: '🧺', libre: '🌿' };
const emoDe = i => i.tipo === 'cal' ? EMO.cal : (EMO[i.id] || (i.tipo === 'tarea' ? (i.esencial ? EMO.esencial : EMO.tarea) : '🔹'));
// Tipo de actividad → color (azul Calendar, dorado esencial, verde tarea, naranja comida, rosa gym, morado rutina, gris lo demás)
function cat(i) {
  if (i.tipo === 'cal') return 'cal';
  if (i.id === 'comida' || String(i.id).startsWith('com-')) return 'comida';
  if (i.id === 'gym') return 'gym';
  if (i.id === 'manana' || i.id === 'cierre') return 'rut';
  if (i.tipo === 'tarea') return i.esencial ? 'ess' : 'tar';
  return 'otro';
}
// Facilitador (💡 lo hace fácil, amarillo) o fricción (🚧 lo hace difícil, naranja): el ícono y el color dicen cuál es, sin repetirlo con palabras
function chipsFac(lista) {
  if (!lista || !lista.length) return '';
  return `<div class="chips">${lista.map(f => `<div class="chip ${f.tipo === 'friccion' ? 'r' : 'f'}" role="note" aria-label="${f.tipo === 'friccion' ? 'Fricción' : 'Facilitador'}"><span aria-hidden="true">${f.tipo === 'friccion' ? '🚧' : '💡'}</span><span>${esc(f.t)}</span></div>`).join('')}</div>`;
}
// De tu brief. Los de cada tarea se escriben en la columna "facilitador" del Sheet (varios separados por ;  y "fricción: ..." para poner fricción).
const FAC_BASE = {
  manana: [{ tipo: 'facil', t: 'Libro junto a la cafetera' }, { tipo: 'facil', t: 'Vaso de agua listo desde la noche anterior' }],
  cierre: [{ tipo: 'facil', t: 'Vaso de agua listo y libro a la vista, así la mañana arranca sola' }, { tipo: 'friccion', t: 'Celular cargando lejos de la cama' }]
};
function parseFac(txt) {
  if (!txt) return [];
  return String(txt).split(';').map(s => s.trim()).filter(Boolean).map(s => {
    const m = s.match(/^fricci[oó]n\s*:\s*(.+)$/i);
    return m ? { tipo: 'friccion', t: m[1] } : { tipo: 'facil', t: s.replace(/^facilitador\s*:\s*/i, '') };
  });
}
const facDe = i => FAC_BASE[i.id] || (i.tipo === 'tarea' ? parseFac(i.fac) : (i.planFac || []));
// Plan de alimentación (pestaña Plan del Sheet): qué lleva cada comida y su versión mínima para los días de hueva
const planDe = id => (datos.plan || []).find(p => p.id === id);
const planFacDe = p => p ? [{ tipo: 'facil', t: p.que_lleva }].concat(p.minimo ? [{ tipo: 'facil', t: 'Con hueva: ' + p.minimo }] : []).filter(f => f.t) : [];
function saludo() {
  const h = new Date().getHours();
  return h < 12 ? 'Buenos días, Luis' : h < 19 ? 'Buenas tardes, Luis' : 'Buenas noches, Luis';
}

// ---------- sol interactivo: sale, cruza el cielo y se pone según la hora y la fecha (Monterrey); de noche sale la luna ----------
let solN = 0;
const LAT = 25.67, LON = -100.31;   // Monterrey. Horas aproximadas (±5 min)
function solHoy(d) {
  const rad = Math.PI / 180;
  const n = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5);
  const decl = 23.44 * Math.sin(rad * 360 / 365 * (n - 81));
  const cosH = -Math.tan(LAT * rad) * Math.tan(decl * rad);
  const H = Math.acos(Math.max(-1, Math.min(1, cosH))) / rad;      // grados; 4 min por grado
  const B = rad * 360 / 364 * (n - 81);
  const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  const noon = 720 - 4 * LON - eot - d.getTimezoneOffset();        // mediodía solar, minutos locales
  return { sale: noon - 4 * H, pone: noon + 4 * H };
}
function solEscena(d, animar) {
  const m = d.getHours() * 60 + d.getMinutes(), s = solHoy(d);
  const dia = m >= s.sale && m <= s.pone;
  let top, bot, colina, fase;
  if (m < s.sale - 40 || m > s.pone + 40) { fase = 'noche'; top = '#0a1029'; bot = '#2b3a78'; colina = '#0c1a16'; }
  else if (m < s.sale + 40) { fase = 'amanecer'; top = '#6f8fe0'; bot = '#ffb48a'; colina = '#34503f'; }
  else if (m > s.pone - 40) { fase = 'atardecer'; top = '#5a5aa8'; bot = '#ff8a5c'; colina = '#2d3f3a'; }
  else { fase = 'dia'; top = '#4aa3ff'; bot = '#bfe4ff'; colina = '#2f7d52'; }
  let p;
  if (dia) p = (m - s.sale) / (s.pone - s.sale);
  else { const noche = 1440 - (s.pone - s.sale); p = (m >= s.pone ? m - s.pone : m + 1440 - s.pone) / noche; }
  p = Math.max(0, Math.min(1, p));
  const x = 10 + 44 * p, y = 46 - 34 * Math.sin(Math.PI * p);
  const bajo = p < 0.12 || p > 0.88;
  let cuerpo = '';
  if (dia) {
    const c = bajo ? '#ff9a3c' : '#ffd23f';
    const giro = animar ? `<animateTransform attributeName="transform" type="rotate" from="0 ${x} ${y}" to="360 ${x} ${y}" dur="36s" repeatCount="indefinite"/>` : '';
    let rayos = '';
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; rayos += `<line x1="${(x + 9 * Math.cos(a)).toFixed(1)}" y1="${(y + 9 * Math.sin(a)).toFixed(1)}" x2="${(x + 12.5 * Math.cos(a)).toFixed(1)}" y2="${(y + 12.5 * Math.sin(a)).toFixed(1)}"/>`; }
    cuerpo = `<circle cx="${x}" cy="${y}" r="13" fill="${c}" opacity=".28"/><g stroke="${c}" stroke-width="1.8" stroke-linecap="round">${giro}${rayos}</g><circle cx="${x}" cy="${y}" r="6.8" fill="${c}"/>`;
  } else {
    cuerpo = `<circle cx="${x}" cy="${y}" r="6.2" fill="#f4f1de"/><circle cx="${x + 2.8}" cy="${y - 1.4}" r="5.4" fill="${top}"/>`;
  }
  const estrellas = fase === 'noche' ? '<g fill="#fff"><circle cx="8" cy="10" r=".9"/><circle cx="22" cy="6" r=".7"/><circle cx="50" cy="12" r=".9"/><circle cx="58" cy="26" r=".7"/><circle cx="14" cy="26" r=".6"/><circle cx="40" cy="5" r=".6"/></g>' : '';
  const gid = 'gs' + (++solN);   // id único: si no, varios dibujos en la misma página se pisan el degradado
  const svg = `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bot}"/></linearGradient></defs><rect width="64" height="64" fill="url(#${gid})"/>${estrellas}${cuerpo}<path d="M0 53 Q16 45 32 51 T64 49 V64 H0Z" fill="${colina}"/></svg>`;
  return { svg, top, s, m, dia };
}
function pintaSol() {
  const d = new Date();
  const reducir = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const e = solEscena(d, !reducir);
  const el = $('#sol'); if (el) el.innerHTML = e.svg;
  // Ícono de la pestaña y color de la barra del navegador: también cambian con la hora
  const fav = solEscena(d, false);
  let link = document.querySelector('link[rel="icon"]');
  if (link) { link.type = 'image/svg+xml'; link.href = 'data:image/svg+xml,' + encodeURIComponent(fav.svg); }
  const tc = document.querySelector('meta[name="theme-color"]'); if (tc) tc.content = e.top;
}
function tocaSol() {
  const d = new Date(), e = solEscena(d, false), m = e.m, s = e.s;
  const txt = e.dia ? `Faltan ${dur(s.pone - m)} de luz.` : `Amanece en ${dur(m < s.sale ? s.sale - m : 1440 - m + s.sale)}.`;
  const t = $('#toast'); t.textContent = `Sale ${fmt(Math.round(s.sale))} · se pone ${fmt(Math.round(s.pone))}. ${txt}`;
  t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 3500);
  const b = $('#sol'); b.classList.remove('pulso'); void b.offsetWidth; b.classList.add('pulso');
}
// Pequeña celebración (se apaga si el sistema pide menos movimiento)
function celebrar(mensaje, grande) {
  const t = $('#toast'); t.textContent = mensaje; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), grande ? 3200 : 1800);
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const colores = ['#17603f', '#e0a100', '#1d4a9c', '#d1542b', '#7a3fb0'];
  const n = grande ? 46 : 18;
  for (let k = 0; k < n; k++) {
    const e = document.createElement('i'); e.className = 'conf';
    e.style.background = colores[k % colores.length];
    e.style.setProperty('--dx', (Math.random() * 360 - 180) + 'px'); e.style.setProperty('--dy', (Math.random() * 300 + 60) + 'px'); e.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
    e.style.animationDelay = (Math.random() * 0.15) + 's';
    document.body.appendChild(e); setTimeout(() => e.remove(), 1600);
  }
}
function fraseDelDia() {
  const d = new Date(); const dia = Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(d.getFullYear(), 0, 0)) / 864e5);
  return FRASES[dia % FRASES.length];
}

// ---------- estado ----------
let datos = { levantarse: '08:30', calendario: [], tareas: [], pendientes: {}, objetivos_semana: [], avisos: [], totales: { poemas: 0, llegadas_9: 0 } };
let est = safe.get('tablero-estado', null);
if (!est || est.fecha !== hoyKey()) {
  const prev = est || {};
  est = { fecha: hoyKey(), hechos: {}, inicios: {}, pasoManana: 0, pasoCierre: 0, forzar: null, modo: null, inbox: prev.inbox || [], totales: prev.totales || { poemas: 0, llegadas_9: 0 }, sueno: prev.sueno || '00:00', desayuno: prev.desayuno || false, extra: prev.extra || [], dias: prev.dias || {}, cerradas: prev.cerradas || {} };
}
est.inicios = est.inicios || {}; est.pasoCierre = est.pasoCierre || 0; est.mov = est.mov || {}; est.oculto = est.oculto || {}; est.tocado = est.tocado || {}; est.extra = est.extra || []; est.dias = est.dias || {}; est.cerradas = est.cerradas || {};
let tema = safe.get('tablero-tema', 'claro');
const aplicaTema = () => { document.documentElement.dataset.tema = tema; };
const guardar = () => { safe.set('tablero-estado', est); pintaAlerta(); };   // cada vez que algo cambia, la alerta de comida se revisa
let estadoSync = '';

function modoActual() {
  if (est.modo) return est.modo;
  const d = new Date().getDay();
  return (d === 0 || d === 6) ? 'finde' : 'trabajo';
}
const MODOS = { trabajo: 'Trabajo', finde: 'Fin de semana', viaje: 'Viaje', ligero: 'Día ligero' };

// ---------- pasos guiados (mañana y cierre salen solos a su hora) ----------
function pasosManana() {
  const p = [{ t: 'Toma un vaso de agua', s: 'Que ya esté listo desde anoche.', e: '💧', fac: [{ tipo: 'facil', t: 'El vaso ya te espera desde la noche anterior' }] },
    { t: 'Lee un poema', s: 'Uno solo, el de hoy.', e: '📖', poema: true, fac: [{ tipo: 'facil', t: 'El libro está junto a la cafetera' }] }];
  const lic = planDe('desayuno');
  if (lic) p.push({ t: 'Prepara tu licuado', s: lic.que_lleva || 'Tu desayuno sin pensar.', e: '🥤', fac: [{ tipo: 'facil', t: 'Ingredientes listos desde el domingo' }, { tipo: 'facil', t: 'Antes del café' }] });
  else if (est.desayuno) p.push({ t: 'Desayuna', s: 'Lo que decidiste anoche.', e: '🥣', fac: [] });
  return p;
}
const PASOS_CIERRE = [
  { t: 'Deja listo el vaso de agua', s: 'Para mañana.', e: '💧', fac: [{ tipo: 'facil', t: 'Así mañana no tienes que decidir nada' }] },
  { t: 'Pon el libro a la vista', s: 'Junto a la cafetera.', e: '📖', fac: [{ tipo: 'facil', t: 'Lo que quieres hacer queda a un paso' }] },
  { t: 'Conecta el celular lejos de la cama', s: 'Que cargue allá.', e: '📵', fac: [{ tipo: 'friccion', t: 'Así no es lo primero que agarras al despertar' }] },
  { t: 'Decide el desayuno', s: 'Solo decidirlo, no prepararlo.', e: '🥣', fac: [] }
];

// ---------- construcción del día ----------
// Fechas (texto AAAA-MM-DD, hora local)
const fechaMas = (key, n) => { const [y, mo, d] = key.split('-').map(Number); const x = new Date(y, mo - 1, d + n); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; };
const fechaObj = key => { const [y, mo, d] = key.split('-').map(Number); return new Date(y, mo - 1, d); };
const diaSemana = key => fechaObj(key).getDay();
const DIAS_C = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const nombreDia = key => { const s = fechaObj(key).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }); return s.charAt(0).toUpperCase() + s.slice(1); };

// Cambios hechos a mano en un día que no es hoy (se conservan aunque pase el día)
const PS = f => { est.dias = est.dias || {}; return est.dias[f] = est.dias[f] || { mov: {}, oculto: {}, tocado: {}, congelado: false }; };

// fecha: el día que se arma (hoy por omisión). Para otros días no hay tareas hechas; extras = tareas que vienen arrastradas de hoy.
function construirDia(m, fecha, esHoy, extras) {
  fecha = fecha || hoyKey(); if (esHoy === undefined) esHoy = fecha === hoyKey();
  const E = esHoy ? est : Object.assign({ hechos: {} }, PS(fecha));
  const modo = esHoy ? modoActual() : ([0, 6].includes(diaSemana(fecha)) ? 'finde' : 'trabajo');
  const dow = diaSemana(fecha);
  const items = [], ocupados = [];
  const levantarse = toMin(datos.levantarse || '08:30');
  const ceil5 = x => Math.ceil(x / 5) * 5;

  const todoDia = [];   // eventos de Calendar sin hora (todo el día)
  (datos.calendario || []).filter(e => esHoy ? (!e.fecha || e.fecha === fecha) : e.fecha === fecha).forEach(e => {
    if (e.todoDia || !e.inicio || !e.fin) { if (!(datos.tareas || []).some(t => t.titulo === e.titulo && t.fecha === fecha)) todoDia.push(e.titulo); return; }   // si ya es una tarea de ese día, no se repite
    const a = toMin(e.inicio), b = toMin(e.fin);
    items.push({ ini: a, fin: b, titulo: e.titulo, tipo: 'cal', id: 'cal-' + e.titulo + a });
    ocupados.push([a, b]);
  });
  // Actividades que Luis agregó a mano a este día (horario fijo)
  const custom = (est.extra || []).filter(x => x.fecha === fecha);
  custom.forEach(x => items.push({ ini: x.ini, fin: x.ini + x.min, titulo: x.titulo, tipo: 'tarea', id: x.id, esencial: false, min: x.min, fac: '', fijo: true }));

  let ventana = [10 * 60, 20 * 60];
  if (modo === 'trabajo') {
    const iniManana = Math.max(levantarse, toMin('08:50') - (pasosManana().length * 10 + 10));
    items.push({ ini: iniManana, fin: toMin('08:50'), titulo: 'Mañana mínima', tipo: 'base', id: 'manana' });
    items.push({ ini: toMin('08:50'), fin: toMin('09:00'), titulo: 'Salida de casa · 10 min caminando', tipo: 'base', id: 'salida' });
    items.push({ ini: toMin('09:00'), fin: toMin('09:00'), titulo: 'Entrada a MegaGen', tipo: 'ctx', id: 'entrada' });
    let ci = toMin('14:00');
    if (!E.hechos.comida && m > ci && m <= toMin('18:00')) ci = m;   // comida flexible: se mueve sola hasta las 18:00 (después deja de estorbar), sin culpa
    items.push({ ini: ci, fin: ci + 60, titulo: 'Comida (flexible 13:00–15:00)', tipo: 'base', id: 'comida', planFac: planFacDe(planDe('comida')) });
    ocupados.push([ci, ci + 60]);
    items.push({ ini: toMin('18:00'), fin: toMin('18:00'), titulo: 'Salida del trabajo', tipo: 'ctx', id: 'salidaTrab' });
    if ([1, 2, 3].includes(dow)) items.push({ ini: toMin('18:30'), fin: toMin('20:00'), titulo: 'Gym (Temple) · ventana 18:00–21:00', tipo: 'base', id: 'gym' });
    else if ([4, 5].includes(dow)) items.push({ ini: toMin('18:30'), fin: toMin('20:00'), titulo: 'Gym opcional (Temple)', tipo: 'base', id: 'gym', opcional: true });
    ventana = [toMin('09:00'), toMin('18:00')];
  } else if (modo === 'finde') {
    const q = Math.max(levantarse, toMin('09:00'));
    items.push({ ini: q, fin: q + 20, titulo: '¿Qué quieres que tenga este día?', tipo: 'base', id: 'pregunta' });
    if (dow === 6) items.push({ ini: toMin('11:00'), fin: toMin('12:00'), titulo: 'Lavar ropa', tipo: 'base', id: 'ropa' });
    ocupados.push([toMin('14:00'), toMin('15:00')]);
    items.push({ ini: toMin('14:00'), fin: toMin('15:00'), titulo: 'Comida', tipo: 'base', id: 'comida', planFac: planFacDe(planDe('comida')) });
  } else if (modo === 'viaje') {
    items.push({ ini: toMin('18:30'), fin: toMin('20:00'), titulo: 'Gym del hotel', tipo: 'base', id: 'gym' });
  }
  // Plan de alimentación: el licuado del desayuno ya es un paso de la mañana mínima (entre semana); la previa al gym (solo días de gym) y la cena son actividades del día
  if (modo === 'trabajo' || modo === 'finde') {
    (datos.plan || []).forEach(p => {
      if (p.id === 'comida' || !p.hora) return;
      if (p.id === 'desayuno' && modo === 'trabajo') return;
      if (p.dias === 'gym' && !items.some(i => i.id === 'gym')) return;
      const ini = p.id === 'desayuno' ? Math.max(levantarse + 30, toMin(p.hora)) : toMin(p.hora);
      items.push({ ini, fin: ini + (p.minutos || 15), titulo: p.comida, tipo: 'base', id: 'com-' + p.id, planFac: planFacDe(p) });
    });
  }
  if (modo !== 'ligero') items.push({ ini: toMin('23:00'), fin: toMin('23:15'), titulo: 'Cierre del día', tipo: 'base', id: 'cierre' });

  // Cambios de Luis al replantear el día: bloques movidos o quitados de hoy
  for (let k = items.length - 1; k >= 0; k--) {
    const it = items[k];
    if (E.oculto[it.id]) { items.splice(k, 1); continue; }
    if (it.fin > it.ini && E.mov[it.id] != null) { const d = it.fin - it.ini; it.ini = E.mov[it.id]; it.fin = it.ini + d; }
  }
  ocupados.length = 0;
  items.filter(i => i.tipo === 'cal' || i.id === 'comida' || String(i.id).startsWith('com-') || i.fijo).forEach(i => ocupados.push([i.ini, i.fin]));

  // Tareas: solo las pendientes se acomodan, empezando desde ahora (los bloques se mueven sin que todo se caiga)
  // Hoy: las tareas sin fecha (o con fecha de hoy o vencida). Otro día: solo las que tienen esa fecha, más las arrastradas de hoy.
  let todas = (datos.tareas || []).filter(t => !(est.cerradas[t.id] && est.cerradas[t.id] < fecha))   // lo que ya cerraste en un día anterior no vuelve a salir
    .filter(t => esHoy ? (!t.fecha || t.fecha <= fecha) : t.fecha === fecha).concat(esHoy ? [] : (extras || []))
    .sort((a, b) => (b.esencial - a.esencial) || (a.prioridad - b.prioridad));
  // si ya existe como evento de Calendar ese día (mismo título), la tarea no se repite
  const normT = s => String(s).toLowerCase().replace(/\s+/g, ' ').trim();
  const titulosCal = new Set((datos.calendario || []).filter(e => e.inicio && e.fin && (esHoy ? (!e.fecha || e.fecha === fecha) : e.fecha === fecha)).map(e => normT(e.titulo)));   // solo eventos con hora: los de todo el día ya se resuelven arriba
  todas = todas.filter(t => !titulosCal.has(normT(t.titulo)));
  if (modo === 'ligero') todas = todas.filter(t => t.esencial).slice(0, 1);
  const marca = t => ({ titulo: t.titulo, tipo: 'tarea', id: t.id, esencial: t.esencial, min: t.min, fac: t.facilitador, deHoy: t.deHoy });
  todas.filter(t => E.hechos[t.id]).forEach(t => items.push({ ini: 0, fin: 0, ...marca(t) }));
  const pospuestas = todas.filter(t => !E.hechos[t.id] && E.oculto[t.id]);
  const pend = todas.filter(t => !E.hechos[t.id] && !E.oculto[t.id]);
  const PAUSA = 10, sinHora = [];
  const ocup = ocupados.slice();
  // las tareas que Luis fijó a mano se respetan; las demás se acomodan alrededor
  // y las que traen hora en la hoja (columna "hora", el día que les toca) quedan a esa hora, salvo que Luis las haya movido
  const horaFija = t => (t.hora && (t.fecha === fecha || (!t.fecha && esHoy))) ? toMin(t.hora) : null;
  const fijaDe = t => E.mov[t.id] != null ? E.mov[t.id] : horaFija(t);
  pend.filter(t => fijaDe(t) != null).forEach(t => {
    const ini = fijaDe(t);
    items.push({ ini, fin: Math.min(ini + t.min, 1440), ...marca(t), fijo: true });
    ocup.push([ini, ini + t.min]);
  });
  let cursor = Math.max(ventana[0], modo === 'trabajo' ? m : Math.max(levantarse + 90, m));
  pend.filter(t => fijaDe(t) == null).forEach(t => {
    let ini = cursor, ok = false;
    const topeFin = t.esencial ? Math.max(ventana[1], toMin('21:00')) : ventana[1];   // lo esencial puede pasarse del horario
    while (ini + t.min <= topeFin) {
      const choque = ocup.find(o => ini < o[1] + PAUSA && ini + t.min + PAUSA > o[0]);
      if (!choque) { items.push({ ini, fin: ini + t.min, ...marca(t) }); ocup.push([ini, ini + t.min]); cursor = ini + t.min + PAUSA; ok = true; break; }
      ini = choque[1] + PAUSA;
    }
    if (!ok) sinHora.push(t);
  });
  items.sort((a, b) => a.ini - b.ini || (a.tipo === 'ctx' ? -1 : 1));
  return { items, sinHora, modo, pendTotal: pend.concat(custom.filter(x => !E.hechos[x.id] && !E.oculto[x.id])), todas, pospuestas, fecha, todoDia };
}

// ---------- vistas ----------
const hecho = i => !!est.hechos[i.id];
const PRIO = { cal: 0, base: 1, tarea: 3 };

let fraseAbierta = false;
function vistaHoy() {
  const m = ahoraMin();
  const dia = construirDia(m);
  const real = dia.items.filter(i => i.tipo !== 'ctx');
  const ess = dia.todas.filter(t => t.esencial);
  const essHechas = ess.filter(t => est.hechos[t.id]).length;
  const esencialListo = ess.length > 0 && essHechas === ess.length;

  // ¿qué toca ahora?
  const activos = real.filter(i => !hecho(i) && i.ini <= m && m < i.fin && i.fin > i.ini);
  const prio = i => i.tipo === 'cal' ? 0 : (i.id === 'manana' || i.id === 'cierre') ? 1 : (i.id === 'comida' || String(i.id).startsWith('com-')) ? 2 : i.tipo === 'tarea' ? 3 : 4;
  activos.sort((a, b) => prio(a) - prio(b));
  const ahora = activos[0] || null;
  const futuros = real.filter(i => !hecho(i) && i.ini > m && i !== ahora);
  const pasados = real.filter(i => hecho(i) || (i.tipo !== 'tarea' && i.fin <= m && i.fin > i.ini));

  // arriba de todo: el día completo de un vistazo, con el resumen en una sola línea, y entrada a replantearlo
  const quedan = Math.max(0, toMin('23:00') - m);
  const carga = dia.pendTotal.reduce((s, t) => s + t.min, 0);
  const comidaPend = dia.items.some(i => i.id === 'comida') && !est.hechos.comida && m >= toMin('12:30') && m <= toMin('18:00');
  let h = tarjetaDia(dia, m, `quedan ${dur(quedan)} · ⭐ ${essHechas}/${ess.length} · 🎯 ${dia.pendTotal.length} · ⏱ ${dur(carga)}${comidaPend ? ' · <b class="falta">🍽️ falta comer</b>' : ''}`);

  // frase: dos líneas; al tocarla se abre con su autor
  const f = fraseDelDia();
  h += `<div class="frase${fraseAbierta ? ' open' : ''}" data-a="frase"><q>${esc(f.t)}</q><small>${esc(f.a)}</small></div>`;
  if (dia.todoDia.length) h += `<div class="nota" style="margin:0 0 8px">📅 Hoy, todo el día: ${dia.todoDia.map(esc).join(' · ')}</div>`;

  // notas que ya escribiste y que Claude todavía no acomoda (se ocultan a las 48 h o con "Limpiar")
  const camino = (est.inbox || []).filter(n => !/^(✅|↩️|Cambios al día)/.test(n.t) && Date.now() - new Date(n.ts).getTime() < 48 * 3600000);
  if (camino.length) h += `<div class="card" style="margin:0 0 8px"><b>📝 En camino</b>${camino.map(n => `<div class="it2">${n.enviada ? '✓' : '⏳'} ${esc(n.t)} <span class="nota">${n.enviada ? '· enviada, Claude la acomoda en su próxima sesión' : '· sin internet, se enviará sola'}</span></div>`).join('')}<div class="row" style="margin-top:6px"><button data-a="limpiaInbox">Limpiar</button></div></div>`;

  // avisos
  (datos.avisos || []).forEach(a => h += `<div class="aviso">${esc(a)}</div>`);
  // los domingos: la lista del súper de la semana, a la vista
  if (new Date().getDay() === 0 && (datos.compras || []).length) h += `<div class="card" style="margin:0 0 8px"><b>🛒 Súper de hoy</b>${listaCompras()}</div>`;

  // HERO: ahora
  const forzado = est.forzar;
  const flujoId = forzado || (ahora && (ahora.id === 'manana' || ahora.id === 'cierre') ? ahora.id : null);
  if (flujoId) h += heroFlujo(flujoId, !!forzado);
  else h += heroAhora(ahora, futuros, m, esencialListo);

  if (esencialListo) h += `<div class="libre-ok">✅ <b>Esencial hecho.</b> Lo demás es opcional, sin culpa.</div>`;

  // siguiente: solo una fila; todo lo demás, plegado en un único lugar
  if (futuros.length) h += `<h3>Siguiente</h3>` + fila(futuros[0], esencialListo);
  const mas = futuros.slice(1);
  const n = mas.length + dia.sinHora.length + pasados.length;
  if (n) {
    h += `<details><summary>Ver el resto del día · ${n}</summary>`;
    if (mas.length) h += `<div class="mini">Más tarde</div>` + mas.map(i => fila(i, esencialListo)).join('');
    if (dia.sinHora.length) h += `<div class="mini">No caben hoy · sin culpa</div>` + dia.sinHora.map(t => `<div class="it opc k-${t.esencial ? 'ess' : 'tar'}"><div class="t">${esc(t.titulo)} <span class="nota">· ${dur(t.min)}</span></div></div>`).join('');
    if (pasados.length) h += `<div class="mini">Hecho</div>` + pasados.map(i => `<div class="it opc k-${cat(i)}"><div class="t ${hecho(i) ? 'hecho' : ''}"><span class="h">${i.ini ? fmt(i.ini) : ''}</span>${esc(i.titulo)}</div></div>`).join('');
    h += `</details>`;
  }
  return h;
}

// Tarjeta de acceso a "Mi día": una tira con todo el día (un color por tipo de actividad), la hora actual y el resumen en una línea
function tarjetaDia(dia, m, resumen) {
  const its = dia.items.filter(i => i.tipo !== 'ctx' && i.fin > i.ini && i.ini > 0 && !est.hechos[i.id]);
  const seg = its.map(i => `<i class="sg k-${cat(i)}" style="left:${Math.max(0, (i.ini - T0) / (T1 - T0) * 100)}%;width:${Math.max(1.2, (i.fin - i.ini) / (T1 - T0) * 100)}%"></i>`).join('');
  const ahoraL = Math.max(0, Math.min(100, (m - T0) / (T1 - T0) * 100));
  return `<button class="dia-card" data-a="plan" aria-label="Ver y replantear mi día"><div class="dc-strip">${seg}${emoComida(its)}<b class="dc-now" style="left:${ahoraL}%"></b></div><div class="dc-r"><span>${resumen}</span><span class="dc-go">Replantear ›</span></div></button>`;
}

function fila(i, esencialListo) {
  const opcional = i.opcional || (esencialListo && i.tipo === 'tarea' && !i.esencial);
  // Sin etiquetas de texto: el color y el ícono dicen el tipo; "opcional" se atenúa; la hora y la duración van pequeñas arriba
  const sr = i.tipo === 'cal' ? 'Calendario. ' : i.esencial ? 'Esencial. ' : '';
  const dd = i.tipo === 'tarea' ? ` · ${dur(i.min)}${i.deHoy ? ' · ↪ de hoy' : ''}` : '';
  return `<div class="it k-${cat(i)}${opcional ? ' opc' : ''}"><div class="e" aria-hidden="true">${emoDe(i)}</div><div class="t"><span class="h">${fmt(i.ini)}–${fmt(i.fin)}${dd}</span><span class="sr">${sr}${opcional ? 'Opcional. ' : ''}</span>${esc(i.titulo)}${facDe(i).length ? ' <span class="fi" aria-label="Tiene facilitador">💡</span>' : ''}</div></div>`;
}

function heroAhora(a, futuros, m, esencialListo) {
  if (!a) {
    const sig = futuros[0];
    return `<section class="hero libre"><div class="cab"><div class="ico">${EMO.libre}</div><div><div class="etq">TIEMPO LIBRE</div><h2>Respira. Nada que hacer ahorita.</h2></div></div><div class="hora">${sig ? `Sigue a las ${fmt(sig.ini)}: ${esc(sig.titulo)}` : 'Nada más por hoy. Bien hecho.'}</div></section>`;
  }
  const opcional = a.opcional || (esencialListo && a.tipo === 'tarea' && !a.esencial);
  const cls = a.tipo === 'cal' ? 'cal' : opcional ? 'opt' : '';
  const etq = a.tipo === 'cal' ? 'CALENDARIO' : opcional ? 'OPCIONAL' : 'AHORA';
  let barra = '', tiempo = '';
  if (a.tipo === 'tarea') {
    if (!est.inicios[a.id]) est.inicios[a.id] = Date.now();
    const trans = (Date.now() - est.inicios[a.id]) / 60000;
    const resta = a.min - trans;
    barra = `<div class="bar" role="img" aria-label="Tiempo de la tarea"><i style="width:${Math.max(0, Math.min(100, trans / a.min * 100))}%"></i></div>`;
    tiempo = resta > 0 ? `⏱ ${dur(a.min)} · quedan ${dur(resta)}` : `⏱ ${dur(a.min)} · ya pasó ese tiempo, sin culpa`;
  } else {
    const resta = a.fin - m;
    barra = `<div class="bar" role="img" aria-label="Tiempo del bloque"><i style="width:${Math.max(0, Math.min(100, (m - a.ini) / (a.fin - a.ini) * 100))}%"></i></div>`;
    tiempo = `${fmt(a.ini)}–${fmt(a.fin)} · quedan ${dur(resta)}`;
  }
  const acc = a.tipo === 'cal' ? '' : `<div class="acc"><button class="pri" data-a="ok" data-v="${esc(a.id)}">✓ Listo</button></div>`;
  return `<section class="hero ${cls}"><div class="cab"><div class="ico k-${cat(a)}">${emoDe(a)}</div><div><div class="etq">${etq}</div><h2>${esc(a.titulo)}</h2></div></div><div class="hora">${tiempo}</div>${barra}${chipsFac(facDe(a))}${acc}</section>`;
}

function heroFlujo(id, forzado) {
  const pasos = id === 'manana' ? pasosManana() : PASOS_CIERRE;
  const key = id === 'manana' ? 'pasoManana' : 'pasoCierre';
  const i = est[key];
  const nombre = id === 'manana' ? 'MAÑANA' : 'CIERRE';
  const salir = forzado ? `<button data-a="cerrarFlujo">Cerrar</button>` : '';
  if (i >= pasos.length) return `<section class="hero"><div class="cab"><div class="ico">${id === 'manana' ? '🎉' : '😴'}</div><div><div class="etq">${nombre}</div><h2>${id === 'manana' ? 'Mañana lista. Sal a las 8:50.' : 'Cierre listo. Tu mañana ya está preparada.'}</h2></div></div><div class="acc"><button data-a="reinicia" data-v="${id}">Volver a empezar</button>${salir}</div></section>`;
  const p = pasos[i];
  return `<section class="hero"><div class="cab"><div class="ico k-rut">${p.e}</div><div><div class="etq">${nombre} · ${i + 1} DE ${pasos.length}</div><h2>${p.t}</h2></div></div><div class="hora">${p.s}</div><div class="bar"><i style="width:${i / pasos.length * 100}%"></i></div>${chipsFac(p.fac)}<div class="acc"><button class="pri" data-a="paso" data-v="${id}">✓ Listo</button>${salir}</div></section>`;
}

// ---------- otros días: mañana y la semana ----------
let vistaSel = 'hoy';   // 'hoy' | 'man' | 'sem' | 'd:AAAA-MM-DD'
function carryHoy() {   // lo que hoy no cupo (o se quitó) pasa a mañana
  const d = construirDia(ahoraMin());
  return d.sinHora.concat(d.pospuestas).map(t => ({ ...t, deHoy: true }));
}
function diaDe(fecha) {
  const hoy = hoyKey();
  if (fecha === hoy) return construirDia(ahoraMin(), fecha, true);
  return construirDia(0, fecha, false, fecha === fechaMas(hoy, 1) ? carryHoy() : []);
}
function tira(its, conAhora, conComida = true) {
  const seg = its.map(i => `<i class="sg k-${cat(i)}" style="left:${Math.max(0, (i.ini - T0) / (T1 - T0) * 100)}%;width:${Math.max(1.2, (i.fin - i.ini) / (T1 - T0) * 100)}%"></i>`).join('');
  const ahoraL = Math.max(0, Math.min(100, (ahoraMin() - T0) / (T1 - T0) * 100));
  return `<div class="dc-strip">${seg}${conComida ? emoComida(its) : ''}${conAhora ? `<b class="dc-now" style="left:${ahoraL}%"></b>` : ''}</div>`;
}
const bloquesDe = dia => dia.items.filter(i => i.tipo !== 'ctx' && i.fin > i.ini && i.ini > 0);
function vistaDia(fecha) {
  const dia = diaDe(fecha), its = bloquesDe(dia);
  const nTar = its.filter(i => i.tipo === 'tarea').length, nCal = its.filter(i => i.tipo === 'cal').length;
  const carga = its.filter(i => i.tipo === 'tarea').reduce((s, i) => s + i.min, 0);
  const sinFecha = (datos.tareas || []).filter(t => !t.fecha).length;
  let h = '';
  if (vistaSel.startsWith('d:')) h += `<button class="atras" data-a="vista" data-v="sem">‹ Semana</button>`;
  h += `<div class="dia-t"><b>${nombreDia(fecha)}</b><span class="nota">${dia.modo === 'finde' ? 'Fin de semana' : (MODOS[dia.modo] || '')}</span></div>`;
  h += `<div class="dia-card sola">${tira(its, fecha === hoyKey())}<div class="dc-r">${nCal ? `📅 ${nCal} en Calendar · ` : ''}🎯 ${nTar} tareas · ⏱ ${dur(carga)}</div><button class="ghost" data-a="planDia" data-v="${fecha}">🗓 Replantear o agregar</button></div>`;
  if (dia.todoDia.length) h += `<div class="nota" style="margin:0 2px 8px">📅 Todo el día: ${dia.todoDia.map(esc).join(' · ')}</div>`;
  if (!nCal && !dia.todoDia.length) h += `<div class="nota" style="margin:0 2px 8px">No hay nada agendado en Calendar para este día.</div>`;
  h += its.map(i => fila(i, false)).join('');
  if (dia.sinHora.length) h += `<div class="mini">No caben · sin culpa</div>` + dia.sinHora.map(t => `<div class="it opc k-${t.esencial ? 'ess' : 'tar'}"><div class="t">${esc(t.titulo)} <span class="nota">· ${dur(t.min)}</span></div></div>`).join('');
  if (fecha !== hoyKey() && sinFecha) h += `<div class="nota" style="margin:10px 2px">Hay ${sinFecha} pendiente(s) sin fecha: entran al día cuando les toca.</div>`;
  return h;
}
function vistaSemana() {
  const hoy = hoyKey(); let h = '';
  for (let k = 0; k < 7; k++) {
    const f = fechaMas(hoy, k), dia = diaDe(f), its = bloquesDe(dia).filter(i => !(k === 0 && hecho(i)));
    const nTar = its.filter(i => i.tipo === 'tarea').length, nCal = its.filter(i => i.tipo === 'cal').length + dia.todoDia.length, d = fechaObj(f);
    h += `<button class="sem-d${k === 0 ? ' hoy' : ''}" data-a="dia" data-v="${f}"><div class="sem-n"><b>${k === 0 ? 'Hoy' : DIAS_C[d.getDay()]}</b> <span class="nota">${d.getDate()}/${d.getMonth() + 1}</span></div>${tira(its, k === 0, false)}<div class="sem-m">${nCal ? `📅 ${nCal}` : ''} ${nTar ? `🎯 ${nTar}` : ''}${dia.modo === 'finde' ? ' · fin de semana' : ''}</div></button>`;
  }
  if ((datos.objetivos_semana || []).length) h += `<div class="mini">Objetivos de la semana</div><div class="card">${datos.objetivos_semana.map(o => `<div class="it2">${esc(o)}</div>`).join('')}</div>`;
  const sf = (datos.tareas || []).filter(t => !t.fecha);
  if (sf.length) h += `<div class="mini">Sin día asignado · ${sf.length}</div><div class="card">${sf.map(t => `<div class="it2">${esc(t.titulo)} <span class="nota">· ${dur(t.min)}</span></div>`).join('')}<div class="nota" style="margin-top:6px">Para darles día, escribe la fecha (AAAA-MM-DD) en la columna "fecha" de la hoja Tareas.</div></div>`;
  return h;
}

const listaCompras = () => (datos.compras || []).map(c => `<div class="it2">${esc(c.articulo)} · <b>${esc(c.cantidad)}</b>${c.regla ? ` <span class="nota">· ${esc(c.regla)}</span>` : ''}</div>`).join('');
function vistaMenu() {
  const hs = horasSueno();
  let h = `<div class="top"><h1>Menú</h1><button data-a="cerrarMenu">Cerrar</button></div>`;
  h += `<div class="card"><div class="row"><button class="pri" data-a="actualizar">Actualizar</button><button data-a="tema">Fondo: ${tema === 'claro' ? 'claro' : 'oscuro'} (cambiar)</button><button data-a="sonido">Alerta de comida: ${sonidoComida ? 'con sonido' : 'sin sonido'}</button></div><div class="nota" style="margin-top:8px">${esc(estadoSync) || 'Se actualiza solo al abrir y al volver el internet.'}</div></div>`;
  h += `<h3>Notas por acomodar (${est.inbox.length})</h3><div class="card">${est.inbox.map(n => `<div class="it2">${n.enviada ? '✓' : '⏳'} ${esc(n.t)} <span class="nota">${n.enviada ? '· enviada' : '· en cola'}</span></div>`).join('') || '<div class="nota">Nada pendiente.</div>'}${est.inbox.length ? '<div class="row" style="margin-top:8px"><button data-a="reenviar">Enviar ahora</button><button data-a="limpiaInbox">Limpiar lista</button></div><div class="nota" style="margin-top:6px">Las notas se mandan solas. Claude las organiza cuando abres una conversación con él.</div>' : ''}</div>`;
  if ((datos.plan || []).length) h += `<h3>Plan de alimentación</h3><div class="card">${datos.plan.map(p => `<div class="it2"><b>${esc(fmt(toMin(p.hora || '00:00')))} · ${esc(p.comida)}</b> <span class="nota">· ${esc(p.kcal)} kcal · ${esc(p.proteina)} g de proteína${p.dias === 'gym' ? ' · días de gym' : ''}</span><div class="nota">${esc(p.que_lleva)}</div></div>`).join('')}</div>`;
  if ((datos.compras || []).length) h += `<h3>Compras de la semana</h3><div class="card">${listaCompras()}</div>`;
  h += `<h3>Pendientes</h3>`;
  if ((datos.objetivos_semana || []).length) h += `<div class="card"><b>Objetivos de la semana</b>${datos.objetivos_semana.map(o => `<div class="it2">${esc(o)}</div>`).join('')}</div>`;
  Object.entries(datos.pendientes || {}).forEach(([k, v]) => { h += `<div class="card"><b>${esc(k)}</b>${v.map(x => `<div class="it2">${esc(x)}</div>`).join('') || '<div class="nota">Vacío</div>'}</div>`; });
  h += `<h3>Modo del día</h3><div class="card row">${Object.entries(MODOS).map(([k, v]) => `<button class="${modoActual() === k ? 'pri' : ''}" data-a="modo" data-v="${k}">${v}</button>`).join('')}</div>`;
  h += `<h3>Mañana y cierre</h3><div class="card row"><button data-a="abrirFlujo" data-v="manana">Abrir mañana mínima</button><button data-a="abrirFlujo" data-v="cierre">Abrir cierre</button></div><div class="card"><label><input type="checkbox" data-a="desayuno" ${est.desayuno ? 'checked' : ''}> Sumar el desayuno a la mañana mínima</label></div>`;
  h += `<h3>Sueño</h3><div class="card"><div class="nota" style="margin-bottom:6px">Si te duermes a las:</div><input type="time" data-a="sueno" value="${est.sueno}"><p style="margin:10px 0 0"><b>${hs}</b> <span class="nota">hasta las ${datos.levantarse || '08:30'}. Tú decides.</span></p></div>`;
  h += `<h3>Totales (nunca rachas)</h3><div class="card"><div>Poemas leídos: <b>${est.totales.poemas}</b></div><div>Veces que llegué a las 9: <b>${est.totales.llegadas_9}</b></div><div class="row" style="margin-top:8px"><button data-a="llegue">Hoy llegué a las 9:00</button></div></div>`;
  h += `<h3>Facilitadores</h3><div class="card nota"><div class="it2">Libro junto a la cafetera</div><div class="it2">Vaso de agua listo desde la noche anterior</div><div class="it2">Celular cargando lejos de la cama</div></div>`;
  return h;
}
function horasSueno() {
  const [h, m] = est.sueno.split(':').map(Number);
  let dormir = h * 60 + m; if (dormir < 12 * 60) dormir += 24 * 60;
  return dur(Math.max(0, toMin(datos.levantarse || '08:30') + 24 * 60 - dormir));
}

// ---------- planear el día (cualquier día): tocar un bloque y tocar a dónde moverlo, o arrastrarlo ----------
const PPM = 1.6, T0 = 6 * 60, T1 = 24 * 60, SNAP = 15;   // 1.6 px por minuto; de 6:00 a 24:00; ajusta de 15 en 15 min
let planAbierto = false, sel = null, drag = null, planIts = [], planDur = {}, planFecha = hoyKey(), agregando = false;
const S = () => planFecha === hoyKey() ? est : PS(planFecha);   // los cambios hechos a mano del día que se está viendo
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), 1800); }
// Al mover un bloque, los demás se quedan donde están (lo que Luis ve es lo que queda). "Volver todo a automático" los suelta.
function congelar() {
  const s = S(); if (s.congelado) return;
  const esHoyP = planFecha === hoyKey();
  planIts.forEach(i => { if (!(esHoyP && hecho(i)) && i.ini > 0 && s.mov[i.id] == null) s.mov[i.id] = i.ini; });
  s.congelado = true;
}
function fijar(id, min) {
  congelar(); const s = S();
  const d = planDur[id] || 30;
  const ini = Math.max(T0, Math.min(T1 - d, Math.round(min / SNAP) * SNAP));   // el bloque siempre cabe entre 6:00 y 24:00
  s.mov[id] = ini; s.tocado[id] = true;
  sel = id; toast('Movido a las ' + fmt(ini)); render();
}
function vistaPlan() {
  const hoy = hoyKey(), esHoyP = planFecha === hoy, m = ahoraMin(), s = S();
  const dia = diaDe(planFecha);
  const its = dia.items.filter(i => i.tipo !== 'ctx' && i.fin > i.ini && i.ini >= T0 - 60).sort((a, b) => a.ini - b.ini || a.fin - b.fin);
  planIts = its; planDur = {}; its.forEach(i => planDur[i.id] = i.fin - i.ini);
  const hh = i => esHoyP && hecho(i);
  // columnas para los bloques que se empalman
  const fv = i => Math.max(i.fin, i.ini + 25);   // fin "visual": un bloque corto se dibuja con una altura mínima (40 px ≈ 25 min), así que cuenta con ella para no taparse con el siguiente
  its.forEach(i => { i._emp = its.some(j => j !== i && j.ini < i.fin && j.fin > i.ini); });   // empalme real, por horario
  let grupo = [], finGrupo = 0; const grupos = [];
  its.forEach(i => { if (grupo.length && i.ini >= finGrupo) { grupos.push(grupo); grupo = []; finGrupo = 0; } grupo.push(i); finGrupo = Math.max(finGrupo, fv(i)); });
  if (grupo.length) grupos.push(grupo);
  grupos.forEach(g => { const cols = []; g.forEach(i => { let c = cols.findIndex(e => e <= i.ini); if (c < 0) { c = cols.length; cols.push(0); } cols[c] = fv(i); i._c = c; }); g.forEach(i => i._n = cols.length); });

  const dObj = fechaObj(planFecha);
  const titulo = esHoyP ? 'Hoy' : (planFecha === fechaMas(hoy, 1) ? 'Mañana' : DIAS_C[dObj.getDay()] + ' ' + dObj.getDate());
  let h = `<div class="top"><div class="pnav"><button data-a="planNav" data-v="-1" aria-label="Día anterior">‹</button><h1>${titulo}</h1><button data-a="planNav" data-v="1" aria-label="Día siguiente">›</button></div><div class="pacc"><button class="padd" data-a="abrirAgregar">＋ Agregar</button><button class="pcls" data-a="cerrarPlan" aria-label="Cerrar">✕</button></div></div>`;
  h += `<div class="nota" style="margin-bottom:6px"><b>${nombreDia(planFecha)}</b><br>${sel ? 'Toca la hora donde quieres que empiece.' : 'Toca un bloque y luego la hora destino, o arrástralo desde ⠿.'}</div>`;
  if (agregando) {
    const def = esHoyP ? fmt(Math.min(T1 - 30, Math.ceil((m + 15) / 15) * 15)) : '10:00';
    h += `<div class="card"><input type="text" id="agrT" class="agr-t" placeholder="¿Qué quieres agregar?" autocomplete="off"><div class="row" style="margin-top:8px;align-items:center"><input type="time" id="agrH" value="${def}" aria-label="Hora de inicio"><select id="agrD" aria-label="Duración"><option value="15">15 min</option><option value="30" selected>30 min</option><option value="45">45 min</option><option value="60">1 h</option><option value="90">1 h 30</option><option value="120">2 h</option></select><button class="pri" data-a="agrOk">Agregar</button><button data-a="agrNo">Cancelar</button></div></div>`;
  }
  let tl = '';
  for (let hr = T0 / 60; hr < T1 / 60; hr++) tl += `<div class="hl" style="top:${(hr * 60 - T0) * PPM}px"><span>${pad(hr)}:00</span></div>`;
  if (esHoyP && m >= T0 && m <= T1) tl += `<div class="nowl" style="top:${(m - T0) * PPM}px"></div>`;
  its.forEach(i => {
    const top = (Math.max(i.ini, T0) - T0) * PPM, alto = Math.max(40, (i.fin - i.ini) * PPM - 2);
    const clase = ['blk', 'k-' + cat(i), alto < 54 ? 'peq' : '', i._emp ? 'emp' : '', i.id === sel ? 'sel' : '', hh(i) ? 'hecho' : '', s.tocado[i.id] ? 'mov' : ''].join(' ');
    tl += `<div class="${clase}" data-a="blk" data-v="${esc(i.id)}" data-id="${esc(i.id)}" style="top:${top}px;height:${alto}px;left:calc(52px + (100% - 58px) * ${i._c} / ${i._n});width:calc((100% - 58px) / ${i._n} - 4px)"><span class="grip" aria-label="Arrastrar">⠿</span><div class="bt">${emoDe(i)} ${esc(i.titulo)}</div><div class="bh">${fmt(i.ini)}–${fmt(i.fin)}${i._emp ? ' · ⚠ se empalma' : ''}${s.tocado[i.id] ? ' · movido' : ''}</div></div>`;
  });
  h += `<div class="tl" data-a="slot" style="height:${(T1 - T0) * PPM}px">${tl}</div>`;
  const pos = Object.entries(s.oculto);
  if (pos.length) h += `<h3>Quitadas de este día</h3><div class="card">${pos.map(([id, t]) => `<div class="it2 row" style="justify-content:space-between;align-items:center"><span>${esc(t)}</span><button data-a="traer" data-v="${esc(id)}">Traer de vuelta</button></div>`).join('')}</div>`;
  const hayCambios = Object.keys(s.tocado).length || pos.length;
  h += `<div class="card" style="margin-top:12px"><div class="nota">Los cambios se guardan en este tablero. Para que lleguen a tu Google Calendar y a tu Sheet, mándalos a Claude: llegan a tu buzón de notas y yo los paso.${hayCambios ? '' : ' (El botón aparece cuando muevas algo.)'}</div>${hayCambios ? '<div class="row" style="margin-top:8px"><button class="pri" data-a="enviaCambios">Enviar cambios a Claude</button><button data-a="reiniciaPlan">Volver todo a automático</button></div>' : ''}</div>`;
  if (sel) {
    const it = its.find(i => i.id === sel);
    if (it) h += `<div class="selbar"><div class="in"><div><b>${emoDe(it)} ${esc(it.titulo)}</b> · a las ${fmt(it.ini)}</div><div class="row" style="margin-top:8px;align-items:center"><input type="time" data-a="horaExacta" value="${fmt(it.ini)}" aria-label="Hora exacta"><button data-a="cancelSel" class="pri">Listo</button>${s.tocado[it.id] ? `<button data-a="auto" data-v="${esc(it.id)}">Horario automático</button>` : ''}<button data-a="quitar" data-v="${esc(it.id)}">${String(it.id).startsWith('x') ? 'Eliminar' : 'Quitar de este día'}</button></div></div></div>`;
  }
  return h;
}
function irAHora() {   // el planificador se abre en la hora actual (hoy) o a las 8:00 (otro día)
  const objetivo = planFecha === hoyKey() ? ahoraMin() - 100 : 8 * 60 - 60;
  setTimeout(() => { $('#plan').scrollTop = Math.max(0, (objetivo - T0) * PPM); }, 30);
}
function textoCambios() {
  const dia = diaDe(planFecha), s = S(), l = [];
  Object.keys(s.tocado).forEach(id => { const it = dia.items.find(i => i.id === id); if (it) l.push(`- ${it.titulo}: ahora a las ${fmt(it.ini)}–${fmt(it.fin)}${it.tipo === 'cal' ? ' (evento de Calendar)' : ''}`); });
  Object.entries(s.oculto).forEach(([id, t]) => l.push(`- ${t}: quitada de este día`));
  return `Cambios al día ${planFecha}:\n` + (l.join('\n') || '- (sin cambios)');
}// Arrastrar: el bloque sigue al dedo, la pantalla se desplaza sola cerca de los bordes, y nunca sale de 6:00 a 24:00
function posicionaDrag() {
  const tl = $('.tl'); if (!tl || !drag) return;
  const r = tl.getBoundingClientRect();
  const alto = parseFloat(drag.el.style.height) || 40;
  const max = (T1 - T0) * PPM - alto;
  const top = Math.max(0, Math.min(max, drag.y - r.top - drag.off));
  drag.el.style.top = top + 'px';
  drag.min = Math.round((T0 + top / PPM) / SNAP) * SNAP;
  const bh = drag.el.querySelector('.bh'); if (bh) bh.textContent = `${fmt(drag.min)}–${fmt(drag.min + (planDur[drag.id] || 30))} · suelta aquí`;
}
function bucleDrag() {
  if (!drag) return;
  const p = $('#plan'), arriba = 120, abajo = window.innerHeight - 190;   // debajo de la barra de arriba y arriba de la de abajo
  if (drag.y < arriba) p.scrollTop -= Math.min(22, (arriba - drag.y) / 4 + 4);
  else if (drag.y > abajo) p.scrollTop += Math.min(22, (drag.y - abajo) / 4 + 4);
  posicionaDrag(); requestAnimationFrame(bucleDrag);
}
document.addEventListener('pointerdown', e => {
  const g = e.target.closest && e.target.closest('.grip'); if (!g) return;
  const b = g.closest('.blk'), r = b.getBoundingClientRect();
  drag = { id: b.dataset.id, el: b, off: e.clientY - r.top, y: e.clientY, min: null };
  try { g.setPointerCapture(e.pointerId); } catch (x) { }
  b.classList.add('drag'); e.preventDefault(); bucleDrag();
});
document.addEventListener('pointermove', e => { if (drag) { drag.y = e.clientY; posicionaDrag(); } });
document.addEventListener('pointerup', () => {
  if (!drag) return;
  const d = drag; drag = null;
  if (d.min != null) fijar(d.id, d.min); else render();
});
document.addEventListener('pointercancel', () => { if (drag) { drag = null; render(); } });

// ---------- render y eventos ----------
let menuAbierto = false;
function render() {
  aplicaTema();
  if (planAbierto) { $('#planIn').innerHTML = vistaPlan(); $('#plan').classList.remove('hide'); } else $('#plan').classList.add('hide');
  const f = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  $('#fecha').textContent = f.charAt(0).toUpperCase() + f.slice(1);
  $('#saludo').textContent = saludo();
  pintaSol();
  $('#btnMenu').textContent = est.inbox.length ? `Menú · ${est.inbox.length}` : 'Menú';
  if (menuAbierto) { $('#menuIn').innerHTML = vistaMenu(); $('#menu').classList.remove('hide'); }
  else $('#menu').classList.add('hide');
  const vs = vistaSel, man = fechaMas(hoyKey(), 1);
  $('#vista').innerHTML = vs === 'hoy' ? vistaHoy() : vs === 'sem' ? vistaSemana() : vistaDia(vs === 'man' ? man : vs.slice(2));
  document.querySelectorAll('#seg button').forEach(b => b.classList.toggle('on', (b.dataset.v === 'hoy' && vs === 'hoy') || (b.dataset.v === 'man' && (vs === 'man' || vs === 'd:' + man)) || (b.dataset.v === 'sem' && vs === 'sem')));
  guardar();
}

function accion(a, v, el, ev) {
  switch (a) {
    case 'frase': fraseAbierta = !fraseAbierta; break;
    case 'comi': est.hechos.comida = true; celebrar('🍽️ Buen provecho. Anotado.', false); break;
    case 'sonido': sonidoComida = !sonidoComida; safe.set('tablero-sonido', sonidoComida); if (sonidoComida) pitido(); break;
    case 'vista': vistaSel = v; render(); $('#vista').scrollTop = 0; return;
    case 'dia': vistaSel = 'd:' + v; render(); $('#vista').scrollTop = 0; return;
    case 'plan': planFecha = hoyKey(); planAbierto = true; sel = null; agregando = false; render(); irAHora(); return;
    case 'planDia': planFecha = v; planAbierto = true; sel = null; agregando = false; render(); irAHora(); return;
    case 'planNav': planFecha = fechaMas(planFecha, Number(v)); sel = null; agregando = false; render(); irAHora(); return;
    case 'abrirAgregar': agregando = true; break;
    case 'agrNo': agregando = false; break;
    case 'agrOk': {
      const t = $('#agrT').value.trim(); if (!t) { toast('Escribe qué quieres agregar'); return; }
      const hr = $('#agrH').value || '10:00', mins = Number($('#agrD').value) || 30, id = 'x' + Date.now().toString(36);
      est.extra.push({ id, fecha: planFecha, titulo: t, ini: toMin(hr), min: mins });
      est.inbox.push({ t: `➕ Agregar a mi Calendar y mi Sheet: "${t}" el ${planFecha} a las ${hr} (${mins} min)`, ts: new Date().toISOString(), enviada: false });
      agregando = false; sel = id; toast('Agregado. Ya se lo mandé a Claude.'); enviarPendientes(); break;
    }
    case 'enviaCambios': est.inbox.push({ t: textoCambios(), ts: new Date().toISOString(), enviada: false }); toast('Cambios enviados a Claude ✓'); enviarPendientes(); break;
    case 'cerrarPlan': planAbierto = false; sel = null; break;
    case 'blk': sel = (sel === v) ? null : v; break;
    case 'slot': {
      if (!sel) { toast('Primero toca el bloque que quieres mover'); return; }
      const r = el.getBoundingClientRect();
      return fijar(sel, T0 + (ev.clientY - r.top) / PPM);
    }
    case 'cancelSel': sel = null; break;
    case 'auto': { const s = S(); delete s.mov[v]; delete s.tocado[v]; toast('Vuelve al horario automático'); break; }
    case 'quitar': {
      const dia = diaDe(planFecha); const it = dia.items.find(i => i.id === v) || (datos.tareas || []).find(t => t.id === v);
      congelar(); const s = S();
      if (String(v).startsWith('x')) { est.extra = est.extra.filter(x => x.id !== v); delete s.mov[v]; delete s.tocado[v]; sel = null; toast('Eliminada'); break; }   // lo agregado a mano se elimina
      s.oculto[v] = it ? it.titulo : v; delete s.mov[v]; delete s.tocado[v]; sel = null; toast('Quitada de este día'); break;
    }
    case 'traer': delete S().oculto[v]; toast('De vuelta en tu día'); break;
    case 'reiniciaPlan': { const s = S(); s.mov = {}; s.oculto = {}; s.tocado = {}; s.congelado = false; sel = null; toast('Todo en automático'); break; }
    case 'ok': {
      est.hechos[v] = !est.hechos[v];
      // Una tarea del Sheet que se marca como hecha NO debe reaparecer mañana: se recuerda aquí y se avisa a Claude para que la cierre en el Sheet
      const tareaSheet = (datos.tareas || []).find(t => t.id === v);
      if (tareaSheet) {
        if (est.hechos[v]) { est.cerradas[v] = hoyKey(); est.inbox.push({ t: `✅ Completé: "${tareaSheet.titulo}" (${v}) el ${hoyKey()}`, ts: new Date().toISOString(), enviada: false }); }
        else { delete est.cerradas[v]; est.inbox.push({ t: `↩️ Reabrí: "${tareaSheet.titulo}" (${v}) el ${hoyKey()}`, ts: new Date().toISOString(), enviada: false }); }
        enviarPendientes();
      }
      if (est.hechos[v]) {
        const ess = (datos.tareas || []).filter(t => t.esencial);
        const cierraEsencial = ess.some(t => t.id === v) && ess.every(t => est.hechos[t.id]);
        if (cierraEsencial) celebrar('⭐ Lo esencial de hoy, hecho. El resto es tiempo tuyo.', true);
        else celebrar(['¡Listo! Eso ya cuenta.', 'Una menos.', 'Bien. Respira un momento.'][Math.floor(Math.random() * 3)], false);
      }
      break;
    }
    case 'paso': {
      const key = v === 'manana' ? 'pasoManana' : 'pasoCierre';
      const pasos = v === 'manana' ? pasosManana() : PASOS_CIERRE;
      if (pasos[est[key]] && pasos[est[key]].poema) { est.totales.poemas++; celebrar(`📖 Poema leído. Van ${est.totales.poemas} en total.`, false); }
      else celebrar('¡Listo!', false);
      est[key]++;
      if (est[key] >= pasos.length) { est.hechos[v] = true; est.forzar = null; celebrar(v === 'manana' ? '🎉 Mañana lista.' : '😴 Cierre listo. Tu mañana ya está preparada.', true); }
      break;
    }
    case 'reinicia': est[v === 'manana' ? 'pasoManana' : 'pasoCierre'] = 0; est.hechos[v] = false; break;
    case 'abrirFlujo': est.forzar = v; menuAbierto = false; break;
    case 'cerrarFlujo': est.forzar = null; break;
    case 'modo': est.modo = v; break;
    case 'llegue': est.totales.llegadas_9++; break;
    case 'tema': tema = tema === 'claro' ? 'oscuro' : 'claro'; safe.set('tablero-tema', tema); break;
    case 'limpiaInbox': est.inbox = []; break;
    case 'copiaInbox': copiarNotas(); return;
    case 'reenviar': enviarPendientes(); return;
    case 'sol': tocaSol(); return;
    case 'actualizar': return actualizar(true);
    case 'cerrarMenu': menuAbierto = false; break;
    default: return;
  }
  render();
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-a]'); if (b && b.type !== 'checkbox' && b.tagName !== 'INPUT') return accion(b.dataset.a, b.dataset.v, b, e);
  if (e.target.id === 'btnMenu') { menuAbierto = true; render(); }
  else if (e.target.closest('#capBtn')) capClick();
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.a === 'horaExacta' && sel && t.value) fijar(sel, toMin(t.value));
  if (t.dataset.a === 'sueno') { est.sueno = t.value || '00:00'; render(); }
  if (t.dataset.a === 'desayuno') { est.desayuno = t.checked; render(); }
});
$('#capIn').addEventListener('keydown', e => { if (e.key === 'Enter') anotar(); });
function anotar() {
  const v = $('#capIn').value.trim(); if (!v) return;
  est.inbox.push({ t: v, ts: new Date().toISOString(), enviada: false });
  $('#capIn').value = ''; $('#compH').textContent = ''; actualizaBoton(); estadoSync = 'Anotado. Enviando…'; render();
  enviarPendientes();
}
// ---------- anotar: un botón redondo. 🎤 dicta a texto · ➤ guarda cuando ya hay texto · ⏹ detiene ----------
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null, escuchando = false, baseTxt = '', huboTexto = false, quiere = false, tInact = null, tMax = null;
let INACTIVIDAD_MS = 30000, MAX_MS = 5 * 60 * 1000;   // el micrófono sigue encendido hasta que Luis lo apaga; se cierra solo tras 30 s sin hablar, o a los 5 min como tope
// En iPhone, una app instalada en la pantalla de inicio no puede usar el dictado del navegador: ahí se usa el micrófono del teclado
let srFalla = safe.get('tablero-sr-falla', false);   // si el navegador negó el dictado, las próximas veces se va directo al teclado; "Reintentar" lo vuelve a probar
const sinDictadoApp = () => !SR || window.navigator.standalone === true || srFalla;
function pista(txt) { $('#compH').textContent = txt || ''; if (!txt) $('#capRe').classList.add('hide'); actualizaBoton(); }
function actualizaBoton() {
  const b = $('#capBtn'), inp = $('#capIn'), hayTexto = inp.value.trim().length > 0, activo = escuchando || quiere;
  b.classList.toggle('rec', activo);
  b.textContent = activo ? '⏹' : (hayTexto ? '➤' : '🎤');
  b.setAttribute('aria-label', activo ? 'Detener el dictado' : (hayTexto ? 'Guardar la nota' : 'Dictar una nota'));
  const abierta = hayTexto || activo || document.activeElement === inp || $('#compH').textContent !== '';
  $('#cap').classList.toggle('on', abierta);
}
function mensajeError(c) {
  if (c === 'not-allowed') return 'El navegador tiene bloqueado el micrófono para este sitio. Actívalo en los permisos del sitio (el candado junto a la dirección) y toca "Reintentar". Mientras, dicta con el micrófono 🎙️ de tu teclado. (código: not-allowed)';
  if (c === 'service-not-allowed') return 'El dictado por voz está apagado en tu celular. iPhone: Ajustes › General › Teclado › Activar dictado. Android: activa el dictado por voz de Google. Mientras, dicta con el micrófono 🎙️ de tu teclado. (código: service-not-allowed)';
  if (c === 'no-speech') return 'No te escuché. Toca 🎤 e intenta otra vez.';
  if (c === 'network') return 'Sin internet para dictar. Escribe, o usa el micrófono 🎙️ del teclado. (código: network)';
  if (c === 'audio-capture') return 'No encuentro un micrófono. (código: audio-capture)';
  return `No pude dictar. Escribe, o usa el micrófono 🎙️ del teclado. (código: ${c})`;
}
function detenerDictado(msg) {
  quiere = false; clearTimeout(tInact); clearTimeout(tMax);
  try { if (rec) rec.stop(); } catch (e) { }
  escuchando = false;
  pista(msg || '');
}
function reiniciaInactividad() {
  clearTimeout(tInact);
  tInact = setTimeout(() => detenerDictado($('#capIn').value.trim() ? '⏸️ Dictado cerrado: pasó mucho tiempo sin hablar.' : 'No escuché nada. Revisa el permiso del micrófono, o usa el 🎙️ de tu teclado.'), INACTIVIDAD_MS);
}
const AVISO_ESCUCHANDO = '🎙️ Escuchando… toca ⏹ cuando termines';
function iniciarRec() {
  rec = new SR(); rec.lang = 'es-MX'; rec.interimResults = true; rec.continuous = true;
  baseTxt = $('#capIn').value.trim() ? $('#capIn').value.trim() + ' ' : '';   // lo ya dictado se conserva si el navegador reanuda
  rec.onstart = () => { escuchando = true; pista(AVISO_ESCUCHANDO); };
  rec.onspeechstart = reiniciaInactividad;
  rec.onresult = e => {
    let x = ''; for (let i = 0; i < e.results.length; i++) x += e.results[i][0].transcript;
    if (x) { huboTexto = true; $('#capIn').value = baseTxt + x; reiniciaInactividad(); pista(AVISO_ESCUCHANDO); }
  };
  rec.onerror = e => {
    if (e.error === 'no-speech' || e.error === 'aborted') return;   // el temporizador de inactividad decide cuándo cerrar
    huboTexto = true; detenerDictado(mensajeError(e.error));
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {   // sin permiso: se abre la caja para dictar con el teclado
      srFalla = true; safe.set('tablero-sr-falla', true); $('#capRe').classList.remove('hide'); $('#capIn').focus();
    }
  };
  rec.onend = () => {
    if (quiere) {   // el navegador lo cortó solo (pausa, límite propio): se reanuda hasta que Luis lo apague
      setTimeout(() => { if (quiere) { try { iniciarRec(); } catch (e) { detenerDictado(mensajeError('start')); } } }, 250);
      return;
    }
    escuchando = false; actualizaBoton();
  };
  rec.start();
}
function dictar() {
  if (escuchando || quiere) { detenerDictado(''); return; }          // apagar a mano
  if (sinDictadoApp()) {   // salida segura: el teclado del celular ya dicta en cualquier campo
    $('#cap').classList.add('on'); $('#capIn').focus();
    pista(srFalla ? 'El dictado del navegador está bloqueado. Dicta con el micrófono 🎙️ de tu teclado. Si ya diste el permiso, toca "Reintentar".' : 'Aquí dicta tu teclado: toca el micrófono 🎙️ del teclado y habla. El texto aparece en esta caja.');
    if (SR && window.navigator.standalone !== true) $('#capRe').classList.remove('hide');
    return;
  }
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();   // sin teclado abierto, el micrófono queda libre
  huboTexto = false; quiere = true;
  clearTimeout(tMax); tMax = setTimeout(() => detenerDictado('⏸️ Dictado cerrado: llegó al tope de 5 minutos.'), MAX_MS);
  try { iniciarRec(); escuchando = true; reiniciaInactividad(); pista(AVISO_ESCUCHANDO); } catch (e) { detenerDictado(mensajeError('start')); }
}function capClick() {
  if (escuchando || quiere) return dictar();             // detener
  if ($('#capIn').value.trim()) return anotar();         // hay texto: guardar
  dictar();                                              // vacío: dictar
}
function abreCaja() { $('#cap').classList.add('on'); $('#capIn').focus(); }
$('#capIn').addEventListener('input', () => { if ($('#compH').textContent) $('#compH').textContent = ''; actualizaBoton(); });
$('#capIn').addEventListener('focus', actualizaBoton);
$('#capIn').addEventListener('blur', () => setTimeout(actualizaBoton, 150));
$('#capX').addEventListener('click', () => { $('#capIn').value = ''; $('#compH').textContent = ''; detenerDictado(''); actualizaBoton(); });
$('#capTxt').addEventListener('click', abreCaja);
$('#capRe').addEventListener('click', () => { srFalla = false; safe.set('tablero-sr-falla', false); $('#capRe').classList.add('hide'); dictar(); });
actualizaBoton();
// 🍽️ sobre la tira: se ve dónde cae la comida
function emoComida(its) {
  return its.filter(i => i.id === 'comida').map(i => `<span class="sg-e" style="left:${Math.max(2, Math.min(98, ((i.ini + (i.fin - i.ini) / 2) - T0) / (T1 - T0) * 100))}%">🍽️</span>`).join('');
}// Buzón: cada nota se manda sola al formulario "Notas del tablero" (solo escritura). Sin internet, queda en cola y se manda al volver.
let enviando = false;
async function enviarPendientes() {
  const F = window.TABLERO && window.TABLERO.form;
  if (!F || !F.url || enviando) return;
  const cola = est.inbox.filter(n => !n.enviada);
  if (!cola.length) return;
  enviando = true;
  let ok = 0;
  for (const n of cola) {
    try {
      const body = new URLSearchParams(); body.append(F.entry, n.t);
      await fetch(F.url, { method: 'POST', mode: 'no-cors', body });
      n.enviada = true; ok++;
    } catch (e) { break; }   // sin internet: se queda en cola
  }
  enviando = false;
  estadoSync = ok ? `${ok} nota(s) enviada(s) a Claude ✓` : 'Sin internet: la nota queda en cola y se enviará sola.';
  render();
}
async function copiarNotas() {
  const txt = 'Notas para acomodar:\n' + est.inbox.map(n => '- ' + n.t).join('\n');
  try { await navigator.clipboard.writeText(txt); estadoSync = 'Notas copiadas. Pégalas en Claude.'; } catch (e) { estadoSync = 'No pude copiar. Selecciona y copia las notas a mano.'; }
  render();
}

// ---------- datos: Sheet publicado (o data.json) ----------
function parseCSV(t) {
  const rows = []; let r = [], c = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) { if (ch === '"') { if (t[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { r.push(c); c = ''; }
    else if (ch === '\n') { r.push(c); rows.push(r); r = []; c = ''; }
    else if (ch !== '\r') c += ch;
  }
  if (c !== '' || r.length) { r.push(c); rows.push(r); }
  const [h, ...b] = rows;
  return b.filter(x => x.some(v => v !== '')).map(x => Object.fromEntries(h.map((k, i) => [k.trim(), (x[i] || '').trim()])));
}
async function csv(gid) {
  const r = await fetch(`${window.TABLERO.pub}?gid=${gid}&single=true&output=csv&t=${Date.now()}`, { cache: 'no-store' });
  if (!r.ok) throw new Error('csv ' + gid);
  return parseCSV(await r.text());
}
// Acepta AAAA-MM-DD (lo recomendado) o D/M/AAAA (como lo muestra Sheets en México)
function normFecha(s) {
  s = String(s || '').trim(); if (!s) return '';
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); if (m) return `${m[3]}-${pad(+m[2])}-${pad(+m[1])}`;
  return '';
}
// Hora de una tarea: acepta 9:30, 09:30 o 19:10; si no se entiende, queda sin hora
function normHora(s) {
  const m = String(s || '').trim().match(/^(\d{1,2}):(\d{2})/);
  return m && +m[1] < 24 && +m[2] < 60 ? `${pad(+m[1])}:${m[2]}` : '';
}
async function desdeSheet() {
  const g = window.TABLERO.gids;
  const opc = gid => gid == null ? Promise.resolve([]) : csv(gid).catch(() => []);   // Plan y Compras son opcionales: si fallan, la app sigue igual
  const [tar, cal, plan, compras] = await Promise.all([csv(g.tareas), csv(g.calendario), opc(g.plan), opc(g.compras)]);
  return armar(tar, cal, plan, compras);
}
// Tareas, plan, compras y calendario de tu cuenta en Supabase. El calendario lo manda tu Apps Script cada pocos minutos y deja un "latido".
// Si el calendario de la cuenta está vacío o lleva más de 3 horas sin latido, se intenta el Sheet publicado; si tampoco hay, se usa lo último guardado.
async function desdeSupabase() {
  const g = window.TABLERO.gids;
  const [tarD, planD, comD, diaD] = await Promise.all([SB.coleccion('tareas'), SB.coleccion('comida/plan'), SB.coleccion('comida/compras'), SB.coleccion('dia').catch(() => [])]);
  const ord = (a, b) => (a.orden || 0) - (b.orden || 0);
  const tar = tarD.sort(ord).map(t => ({ ...t, minutos: String(t.minutos ?? ''), prioridad: String(t.prioridad ?? ''), esencial: t.esencial ? 'sí' : 'no' }));
  const plan = planD.sort(ord).map(p => ({ ...p, kcal: String(p.kcal ?? ''), proteina_g: String(p.proteina_g ?? ''), minutos: String(p.minutos ?? '') }));
  const compras = comD.sort(ord);
  let calC = [];
  try { calC = await SB.coleccion('dia/calendario'); } catch (e) { if (e && e.code === 'nosesion') throw e; }
  const latido = (diaD.find(x => x && x.id === 'calendario_estado') || {}).ultima;
  const fresco = !!latido && (Date.now() - Date.parse(latido)) < 3 * 3600 * 1000;
  let cal = null;
  if (calC.length && fresco) cal = calC;
  else { try { cal = await csv(g.calendario); } catch (e) { cal = calC.length ? calC : null; } }
  if (cal && cal === calC) { const k = e => normFecha(e.fecha) + ' ' + (e.inicio || ''); cal = calC.slice().sort((a, b) => k(a).localeCompare(k(b))); }
  return armar(tar, cal || [], plan, compras, cal ? null : (datos.calendario || []));
}
// Arma los datos del día a partir de filas con las mismas columnas del Sheet (vengan del CSV o de Supabase)
function armar(tar, cal, plan, compras, calListo) {
  const hoy = hoyKey();
  // Una sola lista: la pestaña Tareas. Estados: pendiente (entra al día), bloqueada y luego (solo se ven en el Menú, agrupadas por "bloque"), objetivo (objetivos de la semana), hecho/prueba (no se ven)
  const pendientes = {}, objetivos = [];
  tar.forEach(t => {
    const e = (t.estado || 'pendiente').toLowerCase();
    if (e === 'objetivo') objetivos.push(t.titulo);
    else if (['pendiente', 'bloqueada', 'luego'].includes(e) && t.titulo) (pendientes[t.bloque || 'Sin grupo'] = pendientes[t.bloque || 'Sin grupo'] || []).push(t.titulo);
  });
  return {
    generado: new Date().toISOString(), levantarse: '08:30',
    calendario: calListo || cal.filter(e => normFecha(e.fecha) && e.titulo).map(e => ({ fecha: normFecha(e.fecha), inicio: e.inicio || '', fin: e.fin || '', titulo: e.titulo, todoDia: !(e.inicio && e.fin) })),
    tareas: tar.filter(t => (t.estado || 'pendiente') === 'pendiente').map(t => ({ id: t.id, titulo: t.titulo, min: Number(t.minutos) || 30, prioridad: Number(t.prioridad) || 3, esencial: /^(s[ií]|true|1)$/i.test(t.esencial), bloque: t.bloque, facilitador: t.facilitador || '', fecha: normFecha(t.fecha), hora: normHora(t.hora) })),
    plan: plan.filter(p => p.id && p.comida).map(p => ({ id: p.id, comida: p.comida, hora: normHora(p.hora), dias: (p.dias || 'todos').toLowerCase(), que_lleva: p.que_lleva || '', minimo: p.minimo || '', kcal: p.kcal || '', proteina: p.proteina_g || '', minutos: Number(p.minutos) || 15 })),
    compras: compras.filter(c => c.articulo).map(c => ({ articulo: c.articulo, cantidad: c.cantidad_semana || '', para: c.para || '', regla: c.regla || '' })),
    pendientes, objetivos_semana: objetivos, avisos: [], totales: datos.totales
  };
}
async function actualizar(manual) {
  estadoSync = 'Actualizando…'; if (menuAbierto) render();
  try {
    if (window.SB && SB.activo()) {
      if (!SB.conSesion()) { SB.pedirLogin(); const e = new Error('sin sesión'); e.code = 'nosesion'; throw e; }
      datos = await desdeSupabase(); safe.set('tablero-datos', datos);
      estadoSync = 'Actualizado de tu cuenta a las ' + new Date().toTimeString().slice(0, 5) + '.';
    } else if (window.TABLERO && window.TABLERO.pub) {
      datos = await desdeSheet(); safe.set('tablero-datos', datos);
      estadoSync = 'Actualizado del Sheet a las ' + new Date().toTimeString().slice(0, 5) + '.';
    } else {
      const r = await fetch('data.json?t=' + Date.now(), { cache: 'no-store' });
      datos = await r.json(); safe.set('tablero-datos', datos);
      estadoSync = 'Datos de ' + (datos.generado || '').replace('T', ' ').slice(0, 16) + '.';
    }
  } catch (e) {
    datos = safe.get('tablero-datos', datos);
    if (e && e.code === 'nosesion') { estadoSync = 'Entra a tu cuenta para ver tus datos al día. Mientras tanto, lo último guardado.'; if (window.SB && SB.activo()) SB.pedirLogin(); }
    else estadoSync = 'Sin internet: usando lo último guardado.';
  }
  render();
}

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { });
window.addEventListener('online', () => { enviarPendientes(); actualizar(false); });
// ---------- alerta de comida: clara e insistente (comer es importante) ----------
let alertaNivel = 0, ultimoPulso = 0, sonidoComida = safe.get('tablero-sonido', true);
function nivelComida() {
  if (est.hechos.comida || !['trabajo', 'finde'].includes(modoActual())) return 0;
  const m = ahoraMin();
  if (m >= toMin('13:00') && m < toMin('14:00')) return 1;   // ya es hora
  if (m >= toMin('14:00') && m < toMin('15:00')) return 2;   // urgente: se acaba la ventana
  if (m >= toMin('15:00') && m < toMin('21:00')) return 3;   // pasó la ventana: rojo y pulsando
  return 0;
}
function pitido() {
  try {
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const a = new C();
    [0, 0.35].forEach(t => { const o = a.createOscillator(), g = a.createGain(); o.frequency.value = 880; g.gain.value = 0.08; o.connect(g); g.connect(a.destination); o.start(a.currentTime + t); o.stop(a.currentTime + t + 0.22); });
    setTimeout(() => a.close(), 900);
  } catch (e) { }
}
function pulsoComida() {
  ultimoPulso = Date.now();
  try { if (navigator.vibrate) navigator.vibrate([250, 120, 250, 120, 250]); } catch (e) { }
  if (sonidoComida) pitido();
}
// Comidas del plan (licuado de la previa, cena, etc.): aviso suave a su hora, sin insistir como la comida principal
function comidaPlanPendiente() {
  if (!(datos.plan || []).length || !['trabajo', 'finde'].includes(modoActual())) return null;
  const m = ahoraMin();
  const a = construirDia(m).items.find(i => String(i.id).startsWith('com-') && !est.hechos[i.id] && m >= i.ini && m < i.ini + 120);
  return a ? { it: a, nivel: m < a.ini + 60 ? 1 : 2 } : null;
}
function pintaAlerta() {
  const el = $('#alerta'); if (!el) return;
  const n = nivelComida(), m = ahoraMin();
  const pl = n ? null : comidaPlanPendiente();
  if (pl) {
    el.className = 'n' + pl.nivel;
    const ayuda = (pl.it.planFac && pl.it.planFac[0]) ? pl.it.planFac[0].t : '';
    el.innerHTML = `<div class="at">${pl.nivel === 1 ? '🍽️ Ya es hora' : '🍽️ Sigue pendiente'}: ${esc(pl.it.titulo)}<span class="as">${esc(ayuda)}</span></div><button data-a="ok" data-v="${esc(pl.it.id)}">✓ Ya comí</button>`;
    document.title = '🍽️ ' + pl.it.titulo + ' · Mi día';
    if (!document.hidden && pl.nivel > alertaNivel) pulsoComida();
    alertaNivel = pl.nivel; return;
  }
  if (!n) { el.className = 'hide'; el.innerHTML = ''; document.title = 'Mi día'; alertaNivel = 0; return; }
  const [t, s] = n === 1 ? ['🍽️ Ya es hora de comer', 'Tu ventana es de 13:00 a 15:00.']
    : n === 2 ? ['🍽️ Come ahora', `Te quedan ${dur(toMin('15:00') - m)} de tu ventana.`]
    : m < toMin('18:00') ? ['🍽️ Ya pasaron las 15:00 y no has comido', 'Come algo ahorita. Es importante.']
    : ['🍽️ Hoy todavía no marcas la comida', 'Si ya comiste, tócalo para quitar este aviso.'];
  el.className = 'n' + n;
  el.innerHTML = `<div class="at">${t}<span class="as">${s}</span></div><button data-a="comi">✓ Ya comí</button>`;
  document.title = n >= 2 ? '🍽️ ¡Come! · Mi día' : 'Mi día';
  // insistencia: un pulso (vibración y sonido) al subir de nivel y luego cada 10 min (urgente) o cada 5 min (rojo), solo si la app está a la vista
  const cada = n === 3 ? 5 * 60000 : n === 2 ? 10 * 60000 : 0;
  if (!document.hidden && (n > alertaNivel || (cada && Date.now() - ultimoPulso >= cada))) pulsoComida();
  alertaNivel = n;
}
setInterval(pintaAlerta, 30000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) pintaAlerta(); });

// Si la app se quedó abierta y cambió el día, se carga el día nuevo (todo lo del día anterior se reinicia solo)
function revisaDia() { if (est.fecha !== hoyKey()) { guardar(); location.reload(); return true; } return false; }
document.addEventListener('visibilitychange', () => { if (!document.hidden && !revisaDia()) { enviarPendientes(); actualizar(false); } });
enviarPendientes();
setInterval(() => { if (revisaDia()) return; if (!menuAbierto && !planAbierto && !document.querySelector('details[open]')) render(); }, 60000);
setInterval(pintaSol, 60000);   // el sol se mueve aunque haya algo abierto
datos = safe.get('tablero-datos', datos);
render();
actualizar(false);
