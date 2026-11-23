/* Hungry · entrevista larga y robusta.
   Cada pregunta tiene respuesta cerrada Y siempre una opción para contestar con tus propias palabras.
   La entrevista se manda a Claude por tu cuenta (comida/solicitudes/*). Claude la procesa cuando abres una sesión con él y deja su
   respuesta en comida/respuestas/*: o una propuesta de dieta, o una nueva ronda de preguntas si le falta información o tiene dudas. */
(function () {
  const HG = window.HG, { $, esc, r0, hoyK, toast } = HG;
  const OTRA = 'Otra / prefiero explicarlo';
  const SI_NO = ['Sí', 'No'];
  const SEC = [
    { id: 'tu', t: 'Tú', e: '🧍', q: [
      { id: 'sexo', t: 'Sexo', tipo: 'unica', op: ['Hombre', 'Mujer'], req: 1 },
      { id: 'edad', t: 'Edad', tipo: 'numero', u: 'años', req: 1 },
      { id: 'estatura', t: 'Estatura', tipo: 'numero', u: 'cm', req: 1 },
      { id: 'peso', t: 'Peso actual', tipo: 'numero', u: 'kg', req: 1, ayuda: 'Ideal: en ayunas, sin ropa.' },
      { id: 'peso_hist', t: 'En los últimos 6 meses tu peso…', tipo: 'unica', op: ['Subió', 'Se mantuvo', 'Bajó', 'Ha variado mucho'] },
      { id: 'peso_meta', t: '¿Tienes un peso o medida que quieras alcanzar?', tipo: 'texto' },
      { id: 'grasa', t: 'Si conoces tu % de grasa o tu composición corporal, anótalo', tipo: 'texto' }
    ] },
    { id: 'obj', t: 'Objetivo', e: '🎯', q: [
      { id: 'objetivo', t: '¿Qué quieres lograr principalmente?', tipo: 'unica', op: ['Ganar músculo limpio', 'Bajar grasa', 'Mantener mi peso', 'Comer mejor', 'Rendimiento deportivo'], req: 1 },
      { id: 'plazo', t: '¿En cuánto tiempo?', tipo: 'unica', op: ['4 semanas', '3 meses', '6 meses', '1 año', 'Sin fecha'] },
      { id: 'ritmo', t: '¿Con qué ritmo?', tipo: 'unica', op: ['Suave y sostenible', 'Normal', 'Rápido (más estricto)'], req: 1 },
      { id: 'por_que', t: '¿Por qué ahora? ¿Qué te motiva?', tipo: 'texto' },
      { id: 'intentos', t: '¿Qué has intentado antes y qué resultado tuviste?', tipo: 'texto' },
      { id: 'costo', t: '¿Qué es lo que más te ha costado?', tipo: 'multi', op: ['Hambre', 'Falta de tiempo', 'Antojos', 'Eventos sociales', 'Aburrimiento', 'Constancia', 'No saber qué comer', 'Comer fuera'] }
    ] },
    { id: 'salud', t: 'Salud', e: '🩺', q: [
      { id: 'alergias', t: 'Alergias o intolerancias (nunca te propongo estos alimentos)', tipo: 'multi', op: ['Ninguna', 'Gluten', 'Lácteos / lactosa', 'Huevo', 'Mariscos', 'Pescado', 'Frutos secos', 'Cacahuate', 'Soya'], req: 1 },
      { id: 'condiciones', t: '¿Tienes alguna condición de salud?', tipo: 'unica', op: ['No', 'Sí (la explico)'] },
      { id: 'medicamentos', t: '¿Tomas medicamentos?', tipo: 'unica', op: ['No', 'Sí (los explico)'] },
      { id: 'estudios', t: 'Estudios recientes que quieras compartir (glucosa, colesterol, tiroides, vitamina D, etc.)', tipo: 'texto' },
      { id: 'digestion', t: 'Digestión', tipo: 'multi', op: ['Todo bien', 'Reflujo / gastritis', 'Estreñimiento', 'Diarrea', 'Hinchazón', 'Gases'] },
      { id: 'sueno', t: '¿Cuántas horas duermes en promedio?', tipo: 'numero', u: 'horas' },
      { id: 'estres', t: 'Tu nivel de estrés', tipo: 'unica', op: ['Bajo', 'Medio', 'Alto', 'Muy alto'] },
      { id: 'energia', t: '¿Cómo es tu energía durante el día?', tipo: 'unica', op: ['Estable', 'Baja en la mañana', 'Baja después de comer', 'Baja en la tarde', 'Muy variable'] }
    ] },
    { id: 'rutina', t: 'Tu rutina', e: '⏰', q: [
      { id: 'despertar', t: 'Hora a la que te levantas', tipo: 'hora', req: 1 },
      { id: 'dormir', t: 'Hora a la que te duermes', tipo: 'hora' },
      { id: 'trabajo', t: 'Tu trabajo es principalmente…', tipo: 'unica', op: ['De escritorio', 'De pie', 'Físico', 'Mixto'], req: 1 },
      { id: 'actividad', t: 'Fuera del gym, qué tan activo eres', tipo: 'unica', op: ['Sedentario (casi no camino)', 'Ligero (camino un poco)', 'Moderado (camino bastante)', 'Alto (muy activo todo el día)'], req: 1 },
      { id: 'viajes', t: '¿Viajas?', tipo: 'unica', op: ['Casi nunca', 'A veces', 'Seguido'] },
      { id: 'horario_actual', t: 'Describe tus horarios de comida de hoy en día', tipo: 'texto' }
    ] },
    { id: 'entreno', t: 'Entrenamiento', e: '💪', q: [
      { id: 'dias_ent', t: 'Días de entrenamiento por semana', tipo: 'numero', u: 'días', req: 1 },
      { id: 'hora_ent', t: '¿A qué hora entrenas?', tipo: 'hora' },
      { id: 'tipo_ent', t: 'Tipo de entrenamiento', tipo: 'multi', op: ['Pesas', 'Cardio', 'Deporte', 'Funcional / HIIT', 'Caminata', 'Yoga / movilidad'] },
      { id: 'dur_ent', t: 'Duración de cada sesión', tipo: 'numero', u: 'min' },
      { id: 'exp_ent', t: 'Tu experiencia entrenando', tipo: 'unica', op: ['Principiante', 'Intermedio', 'Avanzado'] },
      { id: 'meta_ent', t: 'Metas de rendimiento (fuerza, resistencia, marcas…)', tipo: 'texto' }
    ] },
    { id: 'come', t: 'Cómo comes hoy', e: '🍽️', q: [
      { id: 'comidas', t: 'Comidas que prefieres hacer al día', tipo: 'unica', op: ['3', '4', '5'], req: 1 },
      { id: 'desayuno_t', t: 'Un día típico: ¿qué desayunas?', tipo: 'texto' },
      { id: 'comida_t', t: '¿Qué comes?', tipo: 'texto' },
      { id: 'cena_t', t: '¿Qué cenas?', tipo: 'texto' },
      { id: 'colacion_t', t: '¿Qué colaciones o snacks comes?', tipo: 'texto' },
      { id: 'fuera', t: 'Veces por semana que comes fuera de casa', tipo: 'numero', u: 'veces' },
      { id: 'azucar', t: 'Bebidas azucaradas (refresco, jugos)', tipo: 'unica', op: ['Nunca', 'A veces', 'Diario'] },
      { id: 'alcohol', t: 'Alcohol', tipo: 'unica', op: ['Nunca', 'Ocasional', 'Fines de semana', 'Varias veces por semana'] },
      { id: 'agua', t: 'Agua que tomas al día', tipo: 'numero', u: 'litros' },
      { id: 'cafe', t: 'Tazas de café al día', tipo: 'numero', u: 'tazas' },
      { id: 'antojos', t: 'Antojos', tipo: 'multi', op: ['Ninguno', 'Dulce', 'Salado', 'Por la noche', 'Por estrés o ansiedad'] },
      { id: 'hambre', t: '¿Cuándo sientes más hambre?', tipo: 'unica', op: ['Mañana', 'Tarde', 'Noche', 'Todo el día'] }
    ] },
    { id: 'logistica', t: 'Cocina y logística', e: '🛒', q: [
      { id: 'cocina', t: '¿Cocinas tú?', tipo: 'unica', op: ['Sí, casi siempre', 'A veces', 'Casi nunca (compro hecho)'], req: 1 },
      { id: 'tiempo_coc', t: 'Tiempo máximo que quieres dedicar a cocinar al día', tipo: 'unica', op: ['10 min', '20 min', '40 min', '1 hora o más'] },
      { id: 'equipo', t: '¿Con qué cuentas en casa?', tipo: 'multi', op: ['Estufa', 'Horno', 'Microondas', 'Licuadora', 'Freidora de aire', 'Olla de presión', 'Refrigerador amplio'] },
      { id: 'presupuesto', t: 'Presupuesto semanal para comida', tipo: 'unica', op: ['Menos de $800', '$800 a $1,500', '$1,500 a $2,500', 'Más de $2,500'], req: 1 },
      { id: 'compras_donde', t: '¿Dónde compras?', tipo: 'multi', op: ['Supermercado', 'Mercado', 'Tienda de la esquina', 'En línea', 'Club de precios'] },
      { id: 'prep', t: '¿Te acomoda preparar comida para varios días?', tipo: 'unica', op: ['Sí', 'A veces', 'No'] },
      { id: 'con_quien', t: '¿Comes solo o con más personas?', tipo: 'unica', op: ['Solo', 'Con pareja o familia', 'Varía'] }
    ] },
    { id: 'pref', t: 'Preferencias', e: '❤️', q: [
      { id: 'estilo', t: 'Estilo de comida que te acomoda', tipo: 'multi', op: ['Tradicional mexicano', 'Mediterráneo', 'Bajo en carbohidrato', 'Vegetariano', 'Sin restricciones'] },
      { id: 'proteinas', t: 'Proteínas que más disfrutas', tipo: 'multi', op: ['Pollo', 'Res', 'Cerdo', 'Pescado', 'Mariscos', 'Huevo', 'Lácteos', 'Leguminosas', 'Tofu'] },
      { id: 'si_o_si', t: 'Alimentos que NO pueden faltar en tu dieta', tipo: 'texto' },
      { id: 'nunca', t: 'Alimentos que NO comes por nada (aparte de las alergias)', tipo: 'texto' },
      { id: 'cultural', t: 'Restricciones por religión, cultura o convicción', tipo: 'texto' },
      { id: 'otro', t: 'Algo más que Claude deba saber para armar tu dieta', tipo: 'texto' }
    ] }
  ];
  HG.ENT = SEC;
  const todas = SEC.flatMap(s => s.q.map(q => ({ ...q, sec: s.id })));

  // ---- respuestas (copia de trabajo; se guarda sola) ----
  let memo = null, sucio = false, timer = null;
  const nube = () => { const o = {}; HDB.hijos('comida/entrevista').filter(x => x && x.id).forEach(x => { o[x.id] = x.r || {}; }); return o; };
  const R = () => { if (!memo || !sucio) memo = JSON.parse(JSON.stringify(nube())); return memo; };
  const lleno = x => x && ((Array.isArray(x.v) ? x.v.length : x.v !== undefined && x.v !== '' && x.v !== null) || (x.a && x.a.trim()));
  const resp = (sec, id) => (R()[sec] || {})[id];
  const avance = s => { const l = SEC.find(z => z.id === s).q; return { hechas: l.filter(q => lleno(resp(s, q.id))).length, total: l.length, req: l.filter(q => q.req && !lleno(resp(s, q.id))).length }; };
  const globalAv = () => SEC.reduce((n, s) => { const a = avance(s.id); return { h: n.h + a.hechas, t: n.t + a.total, req: n.req + a.req }; }, { h: 0, t: 0, req: 0 });
  HG.entAvance = globalAv;

  const txt = (s, q) => { const x = resp(s, q.id); if (!lleno(x)) return ''; const v = Array.isArray(x.v) ? x.v.join(', ') : (x.v === undefined || x.v === '' ? '' : x.v + (q.u ? ' ' + q.u : '')); return v + (x.a && x.a.trim() ? (v ? ' · ' : '') + 'con mis palabras: ' + x.a.trim() : ''); };
  function guardar(sec) {
    HDB.set('comida/entrevista/' + sec, { id: sec, r: memo[sec] || {}, ts: Date.now() });
    sucio = false; derivar();
  }
  const MAP = { alergias: { 'Gluten': 'gluten', 'Lácteos / lactosa': 'lacteos', 'Huevo': 'huevo', 'Mariscos': 'mariscos', 'Pescado': 'pescado', 'Frutos secos': 'frutos_secos', 'Cacahuate': 'cacahuate', 'Soya': 'soya' } };
  function derivar() {   // lo que la calculadora de Hungry necesita, tomado de la entrevista
    const g = (s, id) => { const x = resp(s, id); return x ? x.v : undefined; }, p = { ...HG.perfil() };
    const sx = g('tu', 'sexo'); if (sx) p.sexo = sx === 'Hombre' ? 'h' : 'm';
    ['edad', 'estatura', 'peso'].forEach(k => { const n = Number(g('tu', k)); if (n) p[k] = n; });
    const ob = g('obj', 'objetivo'); if (ob) p.objetivo = { 'Ganar músculo limpio': 'musculo', 'Bajar grasa': 'grasa', 'Mantener mi peso': 'mantener' }[ob] || 'salud';
    const rt = g('obj', 'ritmo'); if (rt) p.ritmo = { 'Suave y sostenible': 'suave', 'Normal': 'normal', 'Rápido (más estricto)': 'rapido' }[rt] || 'normal';
    const ac = g('rutina', 'actividad'); if (ac) p.actividad = ac.startsWith('Sed') ? 'sedentaria' : ac.startsWith('Lig') ? 'ligera' : ac.startsWith('Mod') ? 'moderada' : 'alta';
    const di = g('entreno', 'dias_ent'); if (di !== undefined && di !== '') p.dias_gym = Number(di);
    const he = g('entreno', 'hora_ent'); if (he) p.hora_gym = he;
    const al = g('salud', 'alergias'); if (Array.isArray(al)) p.alergias = al.map(x => MAP.alergias[x]).filter(Boolean);
    const cm = g('come', 'comidas'); if (cm) p.comidas = Number(cm);
    const de = g('rutina', 'despertar'); if (de) p.despertar = de;
    const co = g('logistica', 'cocina'); if (co) p.cocina = co.startsWith('Sí') ? 'si' : co.startsWith('A v') ? 'aveces' : 'no';
    const pr = g('logistica', 'presupuesto'); if (pr) p.presupuesto = pr.startsWith('Menos') ? 'bajo' : pr.startsWith('Más') || pr.startsWith('$1,500') ? 'alto' : 'medio';
    p.completo_salud = avance('salud').req === 0 && lleno(resp('salud', 'alergias'));
    const m = HG.metas(p); if (m) { p.meta_kcal = m.kcal; p.meta_prot = m.prot; }
    HDB.set('comida/perfil/datos', { ...p, id: 'datos', ts: Date.now() });
  }

  // ---- dibujar una pregunta ----
  function pregunta(q, sec, x, ref) {
    const v = x && x.v, a = (x && x.a) || '', nm = 'q-' + sec + '-' + q.id, at = `data-q="${q.id}" data-s="${sec}"`;
    let inp = '';
    if (q.tipo === 'unica') inp = '<div class="opts">' + q.op.concat([OTRA]).map(o => `<label class="opt"><input type="radio" name="${nm}" ${at} value="${esc(o)}" ${v === o ? 'checked' : ''}><span>${esc(o)}</span></label>`).join('') + '</div>';
    else if (q.tipo === 'multi') inp = '<div class="opts">' + q.op.concat([OTRA]).map(o => `<label class="opt"><input type="checkbox" ${at} value="${esc(o)}" ${Array.isArray(v) && v.includes(o) ? 'checked' : ''}><span>${esc(o)}</span></label>`).join('') + '</div>';
    else if (q.tipo === 'numero') inp = `<div class="row"><input type="number" inputmode="decimal" step="any" ${at} value="${v === undefined ? '' : esc(v)}" style="max-width:150px"><span class="mut">${esc(q.u || '')}</span></div>`;
    else if (q.tipo === 'hora') inp = `<input type="time" ${at} value="${esc(v || '')}" style="max-width:170px">`;
    else inp = `<textarea rows="3" data-qa="${q.id}" data-s="${sec}" placeholder="Escríbelo con tus palabras">${esc(a)}</textarea>`;
    const abierta = q.tipo === 'texto' ? '' : `<details class="abierta" ${a ? 'open' : ''}><summary>✍️ Responder con mis palabras</summary><textarea rows="3" data-qa="${q.id}" data-s="${sec}" placeholder="Si ninguna opción te queda, o quieres dar detalles…">${esc(a)}</textarea></details>`;
    return `<div class="preg ${lleno(x) ? 'ok' : ''}"><label>${esc(q.t)}${q.req ? ' <span class="chip w">importante</span>' : ''}</label>${q.ayuda ? `<div class="nota">${esc(q.ayuda)}</div>` : ''}${inp}${abierta}</div>`;
  }
  HG.pregunta = pregunta;

  // ---- vistas ----
  const volver = '<button class="ghost" data-a="dsec" data-s="">‹ Volver</button>';
  HG.dsecs.entrevista = function () {
    const G = globalAv(), n = SEC.map(s => avance(s.id));
    let h = `${volver}<h1>Entrevista</h1><div class="nota">Mientras más completa, mejor la dieta que Claude te arma. Todo se guarda solo, puedes dejarla a la mitad y volver. Si una pregunta no tiene tu respuesta, contéstala con tus palabras.</div><div class="bar" style="margin:10px 0 4px"><i style="width:${G.t ? G.h / G.t * 100 : 0}%"></i></div><div class="mut" style="margin-bottom:8px">${G.h} de ${G.t} respondidas${G.req ? ` · faltan ${G.req} importantes` : ''}</div>`;
    SEC.forEach((s, i) => { const a = n[i], ok = a.hechas === a.total; h += `<div class="card paso ${ok ? 'ok' : ''}" data-a="esec" data-s="${s.id}"><span class="pn">${ok ? '✓' : s.e}</span><div class="sp"><b>${esc(s.t)}</b><div class="nota">${a.hechas} de ${a.total}${a.req ? ` · ${a.req} importantes` : ''}</div></div><span class="mut" style="font-size:20px">›</span></div>`; });
    h += `<div class="row" style="margin-top:14px"><button class="pri sp" data-a="dsec" data-s="regimen">Seguir: gustos y régimen ›</button></div>`;
    return h;
  };
  HG.acc.esec = b => { HG.sub.esec = b.dataset.s; HG.sub.dsec = 'ent'; HG.render(); window.scrollTo(0, 0); };
  HG.dsecs.ent = function () {
    const s = SEC.find(z => z.id === HG.sub.esec) || SEC[0], i = SEC.indexOf(s), sig = SEC[i + 1], a = avance(s.id);
    let h = `<button class="ghost" data-a="dsec" data-s="entrevista">‹ Entrevista</button><div class="mut" style="margin-top:6px">Sección ${i + 1} de ${SEC.length} · ${a.hechas}/${a.total}</div><h1>${s.e} ${esc(s.t)}</h1><div class="bar" style="margin:8px 0 12px"><i style="width:${a.hechas / a.total * 100}%"></i></div>`;
    s.q.forEach(q => { h += pregunta(q, s.id, resp(s.id, q.id)); });
    h += `<div class="row" style="margin:16px 0"><button class="pri sp" data-a="${sig ? 'esec' : 'dsec'}" data-s="${sig ? sig.id : 'entrevista'}">${sig ? 'Siguiente: ' + esc(sig.t) + ' ›' : 'Terminar'}</button></div>`;
    return h;
  };
  // guardar al contestar (sin volver a dibujar la página mientras escribes)
  function cambia(e) {
    const t = e.target, sec = t.dataset && t.dataset.s; if (!sec || (!t.dataset.q && !t.dataset.qa)) return;
    if (sec === 'ac') return acCambia(t);
    if (!memo || !sucio) memo = JSON.parse(JSON.stringify(nube())); const hecho = memo; sucio = true;
    const id = t.dataset.q || t.dataset.qa, q = todas.find(z => z.id === id && z.sec === sec); if (!q) return;
    const s = (hecho[sec] = hecho[sec] || {}), x = (s[id] = s[id] || {});
    if (t.dataset.qa) x.a = t.value;
    else if (q.tipo === 'multi') x.v = [...document.querySelectorAll(`[data-q="${id}"][data-s="${sec}"]:checked`)].map(c => c.value);
    else if (q.tipo === 'numero') x.v = t.value === '' ? '' : Number(t.value);
    else x.v = t.value;
    clearTimeout(timer); timer = setTimeout(() => guardar(sec), 700);
    const card = t.closest('.preg'); if (card) card.classList.toggle('ok', !!lleno(x));
  }
  document.addEventListener('change', cambia); document.addEventListener('input', e => { const t = e.target; if (t.tagName === 'TEXTAREA' || t.type === 'number' || t.type === 'time') cambia(e); });
  window.addEventListener('pagehide', () => { if (sucio && memo) Object.keys(memo).forEach(guardar); });

  // ---- enviar a Claude ----
  const sols = () => HDB.hijos('comida/solicitudes').filter(x => x && x.id).sort((a, b) => a.ronda - b.ronda);
  const resps = () => Object.fromEntries(HDB.hijos('comida/respuestas').filter(x => x && x.id).map(x => [x.id, x]));
  let ac = {};   // respuestas a las preguntas de Claude
  function acCambia(t) {
    const id = t.dataset.q || t.dataset.qa, q = (ac._q || []).find(z => z.id === id); if (!q) return;
    const x = (ac[id] = ac[id] || {});
    if (t.dataset.qa) x.a = t.value; else if (q.tipo === 'multi') x.v = [...document.querySelectorAll(`[data-q="${id}"][data-s="ac"]:checked`)].map(c => c.value); else if (q.tipo === 'numero') x.v = t.value === '' ? '' : Number(t.value); else x.v = t.value;
    const card = t.closest('.preg'); if (card) card.classList.toggle('ok', !!lleno(x));
  }
  function foto() {
    const g = HG.gustos(), nom = id => (HG.AM[id] || {}).n || id;
    return {
      entrevista: SEC.map(s => ({ seccion: s.t, preguntas: s.q.map(q => ({ id: q.id, pregunta: q.t, respuesta: txt(s.id, q) || null })) })),
      gustos: { si: Object.keys(g).filter(k => g[k] === 'si').map(nom), no: Object.keys(g).filter(k => g[k] === 'no').map(nom) },
      suplementos: HDB.hijos('comida/suplementos').filter(x => x && x.toma).map(x => ({ nombre: x.nombre, dosis: x.dosis || '', horario: x.horario || '' })),
      calculo_basico: HG.metas(HG.perfil()) || null
    };
  }
  HG.acc.enviar = () => {
    const G = globalAv(); if (G.req) { toast('Faltan ' + G.req + ' preguntas importantes'); return; }
    const L = sols(), u = L[L.length - 1], rs = resps();
    const ronda = u ? u.ronda + 1 : 1, base = { id: 'r' + ronda, ronda, estado: 'pendiente', ts: Date.now(), fecha: hoyK(), ...foto() };
    if (u && rs[u.id] && rs[u.id].estado === 'preguntas') {
      base.respuestas_a_claude = (rs[u.id].preguntas || []).map(q => { const x = ac[q.id]; return { id: q.id, pregunta: q.t, respuesta: x && lleno(x) ? (Array.isArray(x.v) ? x.v.join(', ') : (x.v === undefined ? '' : x.v)) + (x.a && x.a.trim() ? (x.v ? ' · ' : '') + 'con mis palabras: ' + x.a.trim() : '') : null }; });
      if (base.respuestas_a_claude.every(r => !r.respuesta)) { toast('Contesta al menos una pregunta'); return; }
      HDB.set('comida/respuestas/' + u.id, { ...rs[u.id], estado: 'contestada' });
    }
    HDB.set('comida/solicitudes/' + base.id, base); ac = {}; toast('Enviada. Claude la revisa en tu próxima sesión'); HG.render();
  };
  HG.acc.retirar = () => { const u = sols().pop(); if (u && u.estado === 'pendiente') { HDB.del('comida/solicitudes/' + u.id); HG.render(); } };

  HG.dsecs.regimen = function () {
    const p = HG.perfil(), m = HG.metas(p), L = sols(), u = L[L.length - 1], rs = resps(), r = u && rs[u.id], G = globalAv();
    const prop = HDB.hijos('comida/plan_propuesto').filter(x => x && x.id).sort((a, b) => a.orden - b.orden), fh = ts => new Date(ts).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    let h = `${volver}<h1>Mi régimen</h1>`;
    if (HG.plan().length) h += `<div class="card" style="background:var(--ac2)"><b>✅ Régimen activo · ${HG.plan().length} comidas</b><div class="nota">Mi día ya lo muestra. Puedo crear tu alacena con los ingredientes y tú marcas lo que sí tienes.</div><div class="row" style="margin-top:8px"><button class="sm" data-a="alregimen">Crear mi alacena desde el régimen</button></div></div>`;
    // 1) estado de la conversación con Claude
    if (!u) h += `<div class="card"><b>1 · Manda tu entrevista a Claude</b><div class="nota" style="margin:4px 0 8px">Claude lee todas tus respuestas, detecta tus necesidades y te propone la dieta. Si le falta información o tiene dudas, te devuelve preguntas en la siguiente vuelta.</div><div class="mut">${G.h} de ${G.t} respondidas${G.req ? ` · faltan ${G.req} importantes` : ''}</div><div class="row" style="margin-top:8px"><button class="pri" data-a="${G.req ? 'dsec' : 'enviar'}" data-s="entrevista" ${G.h < 8 ? 'disabled' : ''}>${G.req ? 'Completar entrevista' : 'Enviar a Claude'}</button></div></div>`;
    else if (u.estado === 'pendiente' && !(r && r.estado)) h += `<div class="card" style="border-color:var(--ac)"><b>📨 Enviada · ronda ${u.ronda}</b><div class="nota" style="margin:4px 0">${fh(u.ts)}. Claude la procesa cuando abras una sesión con él. Cuando lo haga, aquí aparece su propuesta o sus preguntas.</div><button class="sm ghost" data-a="retirar">Retirar y seguir editando</button></div>`;
    if (r && r.estado === 'preguntas') {
      ac._q = r.preguntas || [];
      h += `<div class="card" style="border-color:var(--warn)"><b>❓ Claude tiene ${(r.preguntas || []).length} preguntas</b><div class="nota">${esc(r.resumen || 'Para afinar tu dieta le falta información o tiene dudas.')}</div></div>${(r.preguntas || []).map(q => pregunta(q, 'ac', ac[q.id])).join('')}<div class="row" style="margin:14px 0"><button class="pri sp" data-a="enviar">Enviar mis respuestas (ronda ${u.ronda + 1})</button></div>`;
    }
    if (r && (r.estado === 'propuesta' || r.estado === 'contestada') && r.necesidades) {
      h += `<div class="card" style="background:var(--ac2)"><b>🧭 Lo que Claude entendió de ti</b>${r.resumen ? `<p style="margin:6px 0">${esc(r.resumen)}</p>` : ''}<ul style="margin:6px 0 0 18px;padding:0">${(r.necesidades || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
      if (r.razon) h += `<div class="card"><b>💡 Por qué esta propuesta</b><p style="margin:6px 0 0;white-space:pre-line">${esc(r.razon)}</p></div>`;
    }
    if (m) h += `<div class="card"><b>${m.kcal} kcal · ${m.prot} g de proteína</b><div class="nota">Cálculo base de Hungry con tus datos (Claude puede ajustarlo).</div></div>`;
    prop.forEach(x => { h += `<div class="card"><div class="row"><b class="sp">${esc(x.comida)}</b><span class="mut">${esc(x.hora)} · ${x.kcal} kcal${x.dias === 'gym' ? ' · días de gym' : ''}</span></div><div class="nota" style="margin-top:4px;white-space:pre-line">${esc(x.que_lleva)}</div>${x.nota ? `<div class="nota" style="margin-top:4px">📝 ${esc(x.nota)}</div>` : ''}</div>`; });
    if (prop.length) h += `<div class="card" style="border-color:var(--warn)"><b>¿Usar este régimen?</b><div class="nota">Será tu régimen activo y Mi día lo mostrará. Si ya tenías uno, guardo antes una copia por si quieres regresar.</div><div class="row" style="margin-top:8px"><button class="pri" data-a="usarreg">Usar este régimen</button>${HDB.hijos('comida/regimen_respaldo').length ? '<button data-a="volverreg">Regresar al anterior</button>' : ''}</div></div>`;
    h += `<details style="margin-top:14px"><summary class="mut">Sin esperar a Claude: armar con el cálculo básico</summary><div class="card"><div class="nota">Arma un régimen rápido con tus datos, alergias y gustos. Es más simple que el de Claude.</div><div class="row" style="margin-top:8px"><button class="sm" data-a="armar" ${m ? '' : 'disabled'}>Armar rápido</button></div></div></details>`;
    return h;
  };
})();
