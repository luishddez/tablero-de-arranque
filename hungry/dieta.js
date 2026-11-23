/* Hungry · Arma tu dieta: cuestionario, objetivos, gustos estilo Tinder, suplementos y régimen armado. */
(function () {
  const { $, esc, A, AM, r0, r1, nut, hoyK, abrir, cerrar, toast, perfil, gustos, alergias, bloqueado } = window.HG;
  const HG = window.HG;
  const ALERG = { gluten: 'Gluten', lacteos: 'Lácteos / lactosa', huevo: 'Huevo', mariscos: 'Mariscos', pescado: 'Pescado', frutos_secos: 'Frutos secos', cacahuate: 'Cacahuate', soya: 'Soya' };
  const SUPLES = [['proteina', 'Proteína en polvo', '🥤'], ['creatina', 'Creatina monohidrato', '💪'], ['vitd', 'Vitamina D', '☀️'], ['omega3', 'Omega-3', '🐟'], ['multi', 'Multivitamínico', '💊'], ['magnesio', 'Magnesio', '🌙'], ['cafeina', 'Cafeína / pre-entreno', '☕'], ['electrolitos', 'Electrolitos', '🧂']];
  const FACT = { sedentaria: 1.2, ligera: 1.375, moderada: 1.55, alta: 1.725 };
  const getP = () => ({ sexo: 'h', edad: '', estatura: '', peso: '', actividad: 'moderada', dias_gym: 4, hora_gym: '19:00', objetivo: 'musculo', ritmo: 'normal', alergias: [], condiciones: '', medicamentos: '', comidas: 4, cocina: 'si', presupuesto: 'medio', despertar: '08:30', ...perfil() });
  const guardaP = p => HDB.set('comida/perfil/datos', { ...p, id: 'datos', ts: Date.now() });
  const sec = () => HG.sub.dsec;
  const go = s => { HG.sub.dsec = s; HG.render(); window.scrollTo(0, 0); };
  HG.acc.dsec = b => go(b.dataset.s || null);

  // ---- cálculo de metas ----
  function metas(p) {
    const w = +p.peso, h = +p.estatura, a = +p.edad; if (!w || !h || !a) return null;
    const bmr = 10 * w + 6.25 * h - 5 * a + (p.sexo === 'h' ? 5 : -161), tdee = bmr * (FACT[p.actividad] || 1.55);
    const aj = { musculo: { suave: .05, normal: .08, rapido: .12 }, grasa: { suave: -.10, normal: -.15, rapido: -.20 }, mantener: { x: 0 }, salud: { x: 0 } }[p.objetivo] || {};
    const f = aj[p.ritmo] != null ? aj[p.ritmo] : (aj.x || 0);
    let k = Math.max(tdee * (1 + f), bmr * 1.0, p.sexo === 'h' ? 1500 : 1200);
    const pg = { musculo: 2.0, grasa: 2.2, mantener: 1.6, salud: 1.4 }[p.objetivo] || 1.6, prot = pg * w, gr = k * 0.25 / 9, carb = (k - prot * 4 - gr * 9) / 4;
    return { bmr: r0(bmr), tdee: r0(tdee), kcal: r0(k), prot: r0(prot), grasa: r0(gr), carb: r0(carb) };
  }
  HG.metas = metas;

  // ---- hub ----
  HG.vistas.dieta = function () {
    const s = sec(); if (s && HG.dsecs[s]) return HG.dsecs[s]();
    const p = getP(), m = metas(p), g = gustos(), nsi = Object.values(g).filter(v => v === 'si').length, nno = Object.values(g).filter(v => v === 'no').length;
    const sup = HDB.hijos('comida/suplementos').filter(x => x && x.toma).length, prop = HDB.hijos('comida/plan_propuesto').length, tarj = (t, d, ok, sx) => `<div class="card" data-a="dsec" data-s="${sx}"><div class="row"><b class="sp">${ok ? '✅ ' : ''}${t}</b><span class="mut">›</span></div><div class="nota">${d}</div></div>`;
    let h = `<div class="row"><h1 class="sp">Arma tu dieta</h1>${HG.pill()}</div><div class="nota">Cinco pasos. Puedes volver a cualquiera cuando quieras.</div>`;
    if (m) h += `<div class="card" style="background:var(--ac2)"><b>Tu meta: ${m.kcal} kcal al día</b><div class="macros"><span>Proteína <b>${m.prot}</b> g</span><span>Carbs <b>${m.carb}</b> g</span><span>Grasa <b>${m.grasa}</b> g</span></div></div>`;
    h += tarj('1 · Datos y objetivo', 'Cuerpo, actividad y qué quieres lograr', !!m, 'datos');
    h += tarj('2 · Salud y hábitos', 'Alergias, medicamentos, horarios y cómo comes', !!p.completo_salud, 'salud');
    h += tarj('3 · Mis gustos', nsi + nno ? `${nsi} sí · ${nno} no` : 'Desliza: izquierda no, derecha sí', nsi + nno > 20, 'gustos');
    h += tarj('4 · Suplementos', sup ? sup + ' que tomas' : 'Qué tomas hoy', sup > 0, 'suples');
    h += tarj('5 · Mi régimen', prop ? 'Hay un régimen armado para revisar' : 'Se arma con lo anterior', !!prop, 'regimen');
    h += `<div class="card" style="margin-top:14px"><div class="row"><b class="sp">Avisos con la app cerrada</b></div><div class="nota">Te aviso si se te pasa una comida o se acaba algo. En iPhone: Compartir → «Agregar a inicio» y abre Hungry desde ahí.</div><div style="margin-top:6px"><button data-a="push">${(() => { try { return localStorage.getItem('hungry.push') ? 'Avisos activados (tocar para reactivar)' : 'Activar avisos'; } catch (e) { return 'Activar avisos'; } })()}</button></div></div>`;
    h += `<div class="card"><div class="row"><b class="sp">Cuenta</b><span class="mut">${esc(HDB.email())}</span></div><div class="row" style="margin-top:6px"><a class="btn" href="../index.html">← Mi día</a><button class="ghost" data-a="salir">Salir</button></div></div>`;
    return h;
  };
  HG.acc.salir = () => { if (confirm('¿Salir de tu cuenta en este teléfono? (Mi día también se cierra)')) { HDB.salir(); HG.render(); } };
  HG.dsecs = {};
  const volver = `<button class="ghost" data-a="dsec" data-s="">‹ Volver</button>`;

  // ---- 1 datos y objetivo ----
  HG.dsecs.datos = function () {
    const p = getP(), o = (v, t, cur) => `<option value="${v}" ${cur === v ? 'selected' : ''}>${t}</option>`;
    return `${volver}<h1>Datos y objetivo</h1>
    <div class="row"><div class="sp"><label>Sexo</label><select id="d-sexo">${o('h', 'Hombre', p.sexo)}${o('m', 'Mujer', p.sexo)}</select></div><div class="sp"><label>Edad</label><input id="d-edad" type="number" inputmode="numeric" value="${esc(p.edad)}"></div></div>
    <div class="row"><div class="sp"><label>Estatura (cm)</label><input id="d-est" type="number" inputmode="decimal" value="${esc(p.estatura)}"></div><div class="sp"><label>Peso (kg)</label><input id="d-peso" type="number" inputmode="decimal" value="${esc(p.peso)}"></div></div>
    <label>¿Qué tan activo eres en tu día (sin contar el gym)?</label><select id="d-act">${o('sedentaria', 'Sedentario (escritorio, casi no camino)', p.actividad)}${o('ligera', 'Ligero (camino un poco)', p.actividad)}${o('moderada', 'Moderado (camino y entreno 3-5 días)', p.actividad)}${o('alta', 'Alto (trabajo físico o entreno diario)', p.actividad)}</select>
    <div class="row"><div class="sp"><label>Días de gym por semana</label><input id="d-dias" type="number" min="0" max="7" value="${esc(p.dias_gym)}"></div><div class="sp"><label>Hora a la que entrenas</label><input id="d-hg" type="time" value="${esc(p.hora_gym)}"></div></div>
    <label>¿Qué quieres lograr?</label><select id="d-obj">${o('musculo', 'Ganar músculo limpio', p.objetivo)}${o('grasa', 'Bajar grasa', p.objetivo)}${o('mantener', 'Mantener mi peso', p.objetivo)}${o('salud', 'Comer mejor, sin meta de peso', p.objetivo)}</select>
    <label>¿Con qué ritmo?</label><select id="d-rit">${o('suave', 'Suave y sostenible', p.ritmo)}${o('normal', 'Normal', p.ritmo)}${o('rapido', 'Rápido (más estricto)', p.ritmo)}</select>
    <div id="d-res" class="card" style="margin-top:12px"></div><div class="row"><button class="pri sp" data-a="dguardar">Guardar</button></div>`;
  };
  function leeDatos() { return { ...getP(), sexo: $('#d-sexo').value, edad: +$('#d-edad').value, estatura: +$('#d-est').value, peso: +$('#d-peso').value, actividad: $('#d-act').value, dias_gym: +$('#d-dias').value, hora_gym: $('#d-hg').value || '19:00', objetivo: $('#d-obj').value, ritmo: $('#d-rit').value }; }
  HG.acc.dguardar = () => { const p = leeDatos(), m = metas(p); if (!m) { toast('Faltan edad, estatura y peso'); return; } p.meta_kcal = m.kcal; p.meta_prot = m.prot; guardaP(p); toast('Guardado'); go(null); };
  document.addEventListener('input', e => { if (e.target.id && e.target.id.startsWith('d-') && $('#d-res')) { const m = metas(leeDatos()); $('#d-res').innerHTML = m ? `<b>${m.kcal} kcal al día</b><div class="macros"><span>Proteína <b>${m.prot}</b> g</span><span>Carbs <b>${m.carb}</b> g</span><span>Grasa <b>${m.grasa}</b> g</span></div><div class="nota">Gasto en reposo ${m.bmr} kcal · mantenimiento ${m.tdee} kcal. Es una estimación: ajústala con tu peso real cada semana.</div>` : '<span class="mut">Llena edad, estatura y peso para calcular.</span>'; } });
  const refrescaRes = () => { const e = $('#d-peso'); if (e) e.dispatchEvent(new Event('input', { bubbles: true })); };

  // ---- 2 salud y hábitos ----
  HG.dsecs.salud = function () {
    const p = getP(), o = (v, t, cur) => `<option value="${v}" ${String(cur) === String(v) ? 'selected' : ''}>${t}</option>`;
    return `${volver}<h1>Salud y hábitos</h1>
    <label>Alergias o intolerancias (nunca te propongo estos alimentos)</label><div>${Object.entries(ALERG).map(([k, t]) => `<label class="row" style="color:var(--tx);font-size:15px;margin:2px 0"><input type="checkbox" class="d-al" value="${k}" ${p.alergias.includes(k) ? 'checked' : ''}> ${t}</label>`).join('')}</div>
    <label>Condiciones de salud (diabetes, hipertensión, tiroides…)</label><textarea id="s-con" rows="2">${esc(p.condiciones)}</textarea>
    <label>Medicamentos que tomas</label><textarea id="s-med" rows="2">${esc(p.medicamentos)}</textarea>
    <div class="nota">Si tienes una condición o tomas medicamentos, valida tu régimen con tu médico o nutriólogo. Hungry no sustituye una consulta.</div>
    <div class="row"><div class="sp"><label>Comidas al día</label><select id="s-n">${o(3, '3', p.comidas)}${o(4, '4', p.comidas)}${o(5, '5', p.comidas)}</select></div><div class="sp"><label>Hora de levantarte</label><input id="s-des" type="time" value="${esc(p.despertar)}"></div></div>
    <label>¿Cocinas tú?</label><select id="s-coc">${o('si', 'Sí, casi siempre', p.cocina)}${o('aveces', 'A veces', p.cocina)}${o('no', 'Casi nunca (compro hecho)', p.cocina)}</select>
    <label>Presupuesto de comida</label><select id="s-pre">${o('bajo', 'Ajustado', p.presupuesto)}${o('medio', 'Medio', p.presupuesto)}${o('alto', 'Sin problema', p.presupuesto)}</select>
    <div class="row" style="margin-top:12px"><button class="pri sp" data-a="sguardar">Guardar</button></div>`;
  };
  HG.acc.sguardar = () => { const p = getP(); p.alergias = [...document.querySelectorAll('.d-al:checked')].map(x => x.value); p.condiciones = $('#s-con').value.trim(); p.medicamentos = $('#s-med').value.trim(); p.comidas = +$('#s-n').value; p.despertar = $('#s-des').value || '08:30'; p.cocina = $('#s-coc').value; p.presupuesto = $('#s-pre').value; p.completo_salud = true; guardaP(p); toast('Guardado'); go(null); };

  // ---- 3 gustos estilo Tinder ----
  let tdx = 0, drag = null, pila = null;
  const barajar = (arr, seed) => { const a = arr.slice(); let s = seed; for (let i = a.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; const j = Math.floor(s / 233280 * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  HG.dsecs.gustos = function () {
    const g = gustos(), cola = barajar(A.filter(a => !g[a.id] && !(a.al || []).some(x => alergias().includes(x))), 7), tot = A.length, hechos = Object.keys(g).length, a = cola[0];
    let h = `${volver}<h1>Mis gustos</h1><div class="nota">Izquierda ✕ = no me gusta · derecha ✓ = sí. Lo que descartes nunca aparece en tu régimen.</div><div class="bar" style="margin:8px 0"><i style="width:${Math.min(100, hechos / tot * 100)}%"></i></div><div class="mut" style="text-align:center">${hechos} de ${tot}</div>`;
    if (!a) h += `<div class="card" style="text-align:center">🎉 Ya viste todo el catálogo.<div class="nota">Tus «no» quedan abajo por si quieres rescatar alguno.</div></div>`;
    else {
      const pk = a.k * a.por / 100;
      h += `<div class="tinder"><div class="tcard" id="tc" data-id="${a.id}"><span class="sello si">SÍ</span><span class="sello no">NO</span><div class="big">${a.e}</div><h3>${esc(a.n)}</h3><div class="mut">${esc(a.pl)}</div><div class="macros" style="margin-top:10px"><span><b>${r0(pk)}</b> kcal</span><span>P <b>${r1(a.pr * a.por / 100)}</b></span><span>C <b>${r1(a.c * a.por / 100)}</b></span><span>G <b>${r1(a.gr * a.por / 100)}</b></span></div><div class="nota" style="margin-top:8px">Por 100 g: ${a.k} kcal · ${a.pr} g prot · ${a.c} g carbs · ${a.gr} g grasa</div></div></div><div class="tbtn"><button data-a="voto" data-v="no">✕</button><button data-a="deshvoto" style="width:52px;height:52px;align-self:center;font-size:20px">↩</button><button data-a="voto" data-v="si">✓</button></div>`;
    }
    const nos = A.filter(x => g[x.id] === 'no');
    if (nos.length) h += `<h3>Descartados (${nos.length})</h3><div class="card">${nos.map(x => `<span class="chip b" data-a="rescata" data-id="${x.id}">${x.e} ${esc(x.n.split(' (')[0])} ↺</span>`).join('')}</div>`;
    setTimeout(montaTinder, 0);
    return h;
  };
  function montaTinder() {
    const c = $('#tc'); if (!c || c.dataset.m) return; c.dataset.m = 1;
    c.addEventListener('pointerdown', e => { drag = { x: e.clientX }; c.setPointerCapture(e.pointerId); c.style.transition = 'none'; });
    c.addEventListener('pointermove', e => { if (!drag) return; tdx = e.clientX - drag.x; c.style.transform = `translateX(${tdx}px) rotate(${tdx / 18}deg)`; c.querySelector('.sello.si').style.opacity = Math.max(0, Math.min(1, tdx / 90)); c.querySelector('.sello.no').style.opacity = Math.max(0, Math.min(1, -tdx / 90)); });
    const fin = () => { if (!drag) return; drag = null; c.style.transition = 'transform .25s'; if (Math.abs(tdx) > 90) votar(c.dataset.id, tdx > 0 ? 'si' : 'no', tdx > 0 ? 1 : -1); else { c.style.transform = ''; c.querySelectorAll('.sello').forEach(s => s.style.opacity = 0); } tdx = 0; };
    c.addEventListener('pointerup', fin); c.addEventListener('pointercancel', fin);
  }
  let ultimoVoto = null;
  function votar(id, v, dir) {
    const c = $('#tc'); if (c) { c.style.transition = 'transform .25s,opacity .25s'; c.style.transform = `translateX(${dir * 420}px) rotate(${dir * 24}deg)`; c.style.opacity = 0; }
    ultimoVoto = id; setTimeout(() => { HDB.set('comida/gustos/' + id, { id, voto: v, ts: Date.now() }); HG.render(); }, 220);
  }
  HG.acc.voto = b => { const c = $('#tc'); if (c) votar(c.dataset.id, b.dataset.v, b.dataset.v === 'si' ? 1 : -1); };
  HG.acc.deshvoto = () => { if (ultimoVoto) { HDB.del('comida/gustos/' + ultimoVoto); ultimoVoto = null; HG.render(); } else toast('Nada que deshacer'); };
  HG.acc.rescata = b => { HDB.del('comida/gustos/' + b.dataset.id); toast('Vuelve a aparecer en las tarjetas'); HG.render(); };
  document.addEventListener('keydown', e => { if (sec() === 'gustos' && HG.tab === 'dieta' && $('#tc')) { if (e.key === 'ArrowLeft') HG.acc.voto({ dataset: { v: 'no' } }); if (e.key === 'ArrowRight') HG.acc.voto({ dataset: { v: 'si' } }); } });

  // ---- 4 suplementos ----
  HG.dsecs.suples = function () {
    const L = Object.fromEntries(HDB.hijos('comida/suplementos').filter(x => x && x.id).map(x => [x.id, x]));
    return `${volver}<h1>Suplementos</h1><div class="nota">Anota lo que ya tomas, con la dosis y el horario que te indicó tu médico o nutriólogo. <b>Hungry todavía no sugiere dosis</b>: primero hay que verificar las fuentes, y las dosis dependen de cada persona y de sus medicamentos.</div>${SUPLES.map(([id, n, e]) => { const x = L[id] || {}; return `<div class="card"><label class="row" style="color:var(--tx);font-size:16px;margin:0"><input type="checkbox" data-a="supt" data-id="${id}" ${x.toma ? 'checked' : ''}> ${e} <b>${n}</b></label>${x.toma ? `<div class="row" style="margin-top:6px"><input class="sp" placeholder="Dosis (la que te indicaron)" value="${esc(x.dosis || '')}" data-sup="dosis" data-id="${id}"><input class="sp" placeholder="Horario" value="${esc(x.horario || '')}" data-sup="horario" data-id="${id}"></div>` : ''}${id === 'creatina' ? '<div class="nota" style="margin-top:4px">Es de los suplementos más estudiados para entrenamiento de fuerza.</div>' : ''}</div>`; }).join('')}`;
  };
  HG.acc.supt = b => { const id = b.dataset.id, n = SUPLES.find(s => s[0] === id)[1], x = HDB.get('comida/suplementos/' + id) || { id, nombre: n }; HDB.set('comida/suplementos/' + id, { ...x, toma: b.checked }); HG.render(); };
  document.addEventListener('change', e => { const t = e.target; if (t.dataset && t.dataset.sup) { const id = t.dataset.id, x = HDB.get('comida/suplementos/' + id) || { id }; HDB.set('comida/suplementos/' + id, { ...x, [t.dataset.sup]: t.value }); toast('Guardado'); } });

  // ---- 5 régimen armado ----
  const redondea = (id, g) => { const paso = { huevo: 50, 'tortilla-maiz': 30, 'tortilla-harina': 45, 'pan-integral': 28 }[id]; return paso ? Math.max(paso, Math.round(g / paso) * paso) : Math.max(5, Math.round(g / 5) * 5); };
  function escala(pl, kObj) {
    const base = pl.i.reduce((s, [id, g]) => s + nut(id, g).k, 0), f = Math.max(0.6, Math.min(1.7, kObj / base));
    const it = pl.i.map(([id, g]) => [id, redondea(id, g * f)]), m = it.reduce((s, [id, g]) => { const n = nut(id, g); return { k: s.k + n.k, pr: s.pr + n.pr }; }, { k: 0, pr: 0 });
    return { it, k: r0(m.k), pr: r0(m.pr) };
  }
  const txt = (pl, e) => pl.n + ': ' + e.it.map(([id, g]) => { const a = AM[id], pz = { huevo: 50, 'tortilla-maiz': 30, 'tortilla-harina': 45, 'pan-integral': 28 }[id]; return pz ? `${g / pz} ${id === 'huevo' ? 'huevo' + (g / pz > 1 ? 's' : '') : id === 'pan-integral' ? 'rebanada' + (g / pz > 1 ? 's' : '') : 'tortilla' + (g / pz > 1 ? 's' : '')}` : `${g} g de ${a.n.split(' (')[0].toLowerCase()}`; }).join(' + ') + ` (${e.k} kcal)`;
  function armar() {
    const p = getP(), m = metas(p); if (!m) return null;
    const n = p.comidas, gym = +p.dias_gym > 0, hm = s => { const [h, mi] = String(s).split(':').map(Number); return h * 60 + mi; }, fh = x => { x = ((x % 1440) + 1440) % 1440; return Math.floor(x / 60) + ':' + String(x % 60).padStart(2, '0'); };
    const S = gym ? { 3: [['desayuno', 'd', .28], ['comida', 'c', .40], ['cena', 'n', .32]], 4: [['desayuno', 'd', .23], ['comida', 'c', .33], ['previa', 'p', .17], ['cena', 'n', .27]], 5: [['desayuno', 'd', .20], ['colacion', 's', .10], ['comida', 'c', .30], ['previa', 'p', .15], ['cena', 'n', .25]] }[n]
      : { 3: [['desayuno', 'd', .28], ['comida', 'c', .40], ['cena', 'n', .32]], 4: [['desayuno', 'd', .25], ['comida', 'c', .35], ['colacion', 's', .12], ['cena', 'n', .28]], 5: [['desayuno', 'd', .22], ['colacion', 's', .10], ['comida', 'c', .30], ['colacion2', 's', .10], ['cena', 'n', .28]] }[n];
    const des = hm(p.despertar) + 10, gymT = hm(p.hora_gym), H = { desayuno: des, colacion: 11 * 60 + 30, colacion2: 17 * 60, comida: 14 * 60, previa: gymT - 75, cena: gym ? gymT + 100 : 20 * 60 + 30 };
    const NOM = { desayuno: 'Desayuno', colacion: 'Colación', colacion2: 'Colación de la tarde', comida: 'Comida', previa: 'Previa al gym', cena: 'Cena' };
    const usados = new Set(), out = [];
    S.forEach(([id, tipo, pct], i) => {
      const kObj = r0(m.kcal * pct), cand = HG.sugerencias(tipo, kObj).filter(s => !usados.has(s.p.id)), nOp = id === 'comida' ? 3 : id === 'previa' || id.startsWith('colacion') ? 1 : 2, sel = cand.slice(0, nOp);
      sel.forEach(s => usados.add(s.p.id));
      const es = sel.map(s => ({ s, e: escala(s.p, kObj) })), pr = es.length ? r0(es.reduce((q, x) => q + x.e.pr, 0) / es.length) : 0;
      out.push({ id, orden: i + 1, comida: NOM[id], hora: fh(H[id]), dias: id === 'previa' ? 'gym' : 'todos', kcal: kObj, proteina_g: pr, minutos: id === 'comida' ? 40 : 10, que_lleva: es.map((x, j) => (es.length > 1 ? ['A', 'B', 'C'][j] + '. ' : '') + txt(x.s.p, x.e)).join(' · ') || 'Sin opciones que cuadren con tus gustos: marca más alimentos con ✓.', minimo: es[0] ? es[0].s.p.n + ' (versión chica, a mano)' : '', origen: 'hungry', id_str: id });
    });
    return out;
  }
  HG.dsecs.regimen = function () {
    const p = getP(), m = metas(p), prop = HDB.hijos('comida/plan_propuesto').filter(x => x && x.id).sort((a, b) => a.orden - b.orden);
    let h = `${volver}<h1>Mi régimen</h1>`;
    if (!m) return h + `<div class="card">Primero llena <b>Datos y objetivo</b> para calcular tu meta.</div>`;
    h += `<div class="card" style="background:var(--ac2)"><b>${m.kcal} kcal · ${m.prot} g de proteína</b><div class="nota">Armado con tu objetivo, tus alergias y tus gustos (✓ sí / ✕ no). Prefiere lo que ya tienes en la alacena.</div></div><div class="row"><button class="pri" data-a="armar">${prop.length ? 'Volver a armarlo' : 'Armar mi régimen'}</button></div>`;
    prop.forEach(x => { h += `<div class="card"><div class="row"><b class="sp">${esc(x.comida)}</b><span class="mut">${esc(x.hora)} · ${x.kcal} kcal${x.dias === 'gym' ? ' · días de gym' : ''}</span></div><div class="nota" style="margin-top:4px">${esc(x.que_lleva)}</div></div>`; });
    if (prop.length) h += `<div class="card" style="border-color:var(--warn)"><b>¿Usar este régimen?</b><div class="nota">Reemplaza tu plan actual en Hungry y en Mi día. Guardo antes una copia del plan que tienes hoy, por si quieres regresar.</div><div class="row" style="margin-top:8px"><button class="pri" data-a="usarreg">Usar este régimen</button>${HDB.hijos('comida/plan_respaldo').length ? '<button data-a="volverreg">Regresar al anterior</button>' : ''}</div></div>`;
    return h;
  };
  HG.acc.armar = () => {
    const l = armar(); if (!l) { toast('Faltan tus datos'); return; }
    HDB.hijos('comida/plan_propuesto').forEach(x => x && x.id && HDB.del('comida/plan_propuesto/' + x.id));
    l.forEach(x => { delete x.id_str; HDB.set('comida/plan_propuesto/' + x.id, x); }); HG.render();
  };
  HG.acc.usarreg = () => {
    if (!confirm('Esto reemplaza tu plan actual (guardo una copia). ¿Continuar?')) return;
    const act = HDB.hijos('comida/plan').filter(x => x && x.id), nuevo = HDB.hijos('comida/plan_propuesto').filter(x => x && x.id);
    HDB.hijos('comida/plan_respaldo').forEach(x => x && x.id && HDB.del('comida/plan_respaldo/' + x.id));
    act.forEach(x => HDB.set('comida/plan_respaldo/' + x.id, x));
    act.forEach(x => HDB.del('comida/plan/' + x.id));
    nuevo.forEach(x => HDB.set('comida/plan/' + x.id, { ...x, origen: 'Hungry ' + hoyK() }));
    toast('Régimen activo. Mi día lo verá en menos de 1 minuto.'); HG.render();
  };
  HG.acc.volverreg = () => {
    if (!confirm('¿Regresar al plan anterior?')) return;
    HDB.hijos('comida/plan').forEach(x => x && x.id && HDB.del('comida/plan/' + x.id));
    HDB.hijos('comida/plan_respaldo').forEach(x => x && x.id && HDB.set('comida/plan/' + x.id, x)); toast('Plan anterior restaurado'); HG.render();
  };
  HG.iniciar();
  setTimeout(refrescaRes, 0);
})();
