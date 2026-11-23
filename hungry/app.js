/* Hungry · alimentación del ecosistema (Mi día es el centro, Temple es el ejercicio).
   Pantallas: Hoy · Alacena · Compras · Registro · Dieta. Todo se guarda en tu cuenta (HDB) y funciona sin internet. */
(function () {
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const A = window.HG_ALIM, AM = Object.fromEntries(A.map(a => [a.id, a]));
  const r1 = n => Math.round((Number(n) || 0) * 10) / 10, r0 = n => Math.round(Number(n) || 0);
  const pad = n => String(n).padStart(2, '0');
  const fechaK = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const hoyK = () => fechaK(new Date());
  const toMin = h => { const m = String(h || '').match(/(\d{1,2}):(\d{2})/); return m ? +m[1] * 60 + +m[2] : 0; };
  const slug = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'x';
  const nut = (id, g) => { const a = AM[id]; if (!a) return { k: 0, pr: 0, c: 0, gr: 0 }; const f = g / 100; return { k: a.k * f, pr: a.pr * f, c: a.c * f, gr: a.gr * f }; };
  const HG = window.HG = { $, esc, A, AM, r0, r1, nut, hoyK, fechaK, toMin, slug, acc: {}, vistas: {}, tab: 'hoy', sub: {} };

  // ---------- acceso a datos ----------
  const plan = () => HDB.hijos('comida/plan').filter(p => p && p.id).sort((a, b) => (a.orden || 0) - (b.orden || 0));
  const alacena = () => HDB.hijos('comida/alacena').filter(x => x && x.id);
  const faltantes = () => HDB.hijos('comida/faltantes').filter(x => x && x.id);
  const registro = () => HDB.hijos('comida/registro').filter(x => x && x.id);
  const gustos = () => Object.fromEntries(HDB.hijos('comida/gustos').filter(x => x && x.id).map(x => [x.id, x.voto]));
  const categorias = () => HDB.hijos('comida/categorias').filter(x => x && x.id).sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
  const perfil = () => HDB.get('comida/perfil/datos') || {};
  const dia = () => { const d = HDB.get('comida/estado/dia'); return d && d.fecha === hoyK() ? d : { id: 'dia', fecha: hoyK(), gym: false }; };
  const alergias = () => perfil().alergias || [];
  const bloqueado = a => a && (gustos()[a.id] === 'no' || (a.al || []).some(x => alergias().includes(x)));
  Object.assign(HG, { plan, alacena, faltantes, registro, gustos, categorias, perfil, dia, alergias, bloqueado });
  const PASILLOS = ['Frutas y verduras', 'Carnes y pescados', 'Lácteos y huevo', 'Refrigerados', 'Panadería y tortillas', 'Abarrotes', 'Otros'];
  const UNIDADES = { pza: 1, g: 100, kg: 0.5, l: 0.5, ml: 100, latas: 1, paquete: 1 };
  HG.PASILLOS = PASILLOS; HG.UNIDADES = UNIDADES;

  // ---------- avisos y ventanas ----------
  let toastT = null;
  function toast(t) { let el = $('#toast'); if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; document.body.appendChild(el); } el.textContent = t; el.classList.remove('hide'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.add('hide'), 2600); }
  function abrir(html, montar) { cerrar(); const m = document.createElement('div'); m.className = 'modal'; m.id = 'modal'; m.innerHTML = '<div>' + html + '</div>'; m.addEventListener('click', e => { if (e.target === m) cerrar(); }); document.body.appendChild(m); if (montar) montar(m); }
  function cerrar() { const m = $('#modal'); if (m) m.remove(); }
  Object.assign(HG, { toast, abrir, cerrar });

  // ---------- alacena ↔ compras ----------
  const baja = x => x.modo === 'aprox' ? (x.nivel === 'poco' || x.nivel === 'no') : (Number(x.cantidad) || 0) <= (Number(x.minimo) || 0);
  const disponible = x => x.modo === 'aprox' ? x.nivel !== 'no' : (Number(x.cantidad) || 0) > 0;
  const textoCant = x => x.modo === 'aprox' ? ({ tengo: 'Tengo', poco: 'Poco', no: 'No tengo' }[x.nivel || 'tengo']) : (r1(x.cantidad) + ' ' + (x.unidad || ''));
  const repo = x => { const m = Number(x.minimo) || 0, c = Number(x.cantidad) || 0; return r1(Math.max(m * 2 - c, m, (UNIDADES[x.unidad] || 1))); };
  Object.assign(HG, { baja, disponible, textoCant });
  function sincronizarFaltantes() {
    const ex = Object.fromEntries(faltantes().map(f => [f.id, f]));
    alacena().forEach(x => {
      const f = ex[x.id];
      if (baja(x)) {
        if (f && f.estado === 'comprado') return;
        const n = { id: x.id, alacena_id: x.id, articulo: x.nombre, emoji: x.emoji || '', estado: 'falta', pasillo: x.pasillo || 'Otros', categoria: x.categoria || '', donde: x.donde || '', ts: Date.now() };
        if (x.modo === 'exacto') { n.reponer = repo(x); n.unidad = x.unidad || ''; n.cantidad_texto = n.reponer + ' ' + n.unidad; } else n.cantidad_texto = 'comprar';
        if (!f || ['pasillo', 'categoria', 'donde', 'cantidad_texto', 'articulo'].some(k => f[k] !== n[k])) HDB.set('comida/faltantes/' + x.id, n);
      } else if (f && f.alacena_id && f.estado === 'falta') HDB.del('comida/faltantes/' + x.id);
    });
  }
  function aplicarComprados() {   // lo que Mi día marcó como comprado y aún no se aplicó
    faltantes().filter(f => f.estado === 'comprado').forEach(f => comprado(f, true));
  }
  function comprado(f, silencio) {
    const x = f.alacena_id && HDB.get('comida/alacena/' + f.alacena_id);
    if (x) { const n = { ...x, ts: Date.now() }; if (x.modo === 'exacto') n.cantidad = r1((Number(x.cantidad) || 0) + (Number(f.reponer) || repo(x))); else n.nivel = 'tengo'; HDB.set('comida/alacena/' + x.id, n); }
    HDB.del('comida/faltantes/' + f.id);
    if (!silencio) toast('✓ Comprado: ' + f.articulo);
  }
  HG.sincronizarFaltantes = sincronizarFaltantes;

  // ---------- registro ----------
  const regHoy = () => registro().filter(r => r.fecha === hoyK()).sort((a, b) => (a.ts || 0) - (b.ts || 0));
  const suma = l => l.reduce((s, r) => ({ k: s.k + (r.kcal || 0), pr: s.pr + (r.prot || 0), c: s.c + (r.carb || 0), gr: s.gr + (r.grasa || 0) }), { k: 0, pr: 0, c: 0, gr: 0 });
  function guardarRegistro(o) {
    const d = new Date(), id = hoyK() + '-' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds()) + '-' + Math.floor(Math.random() * 90 + 10);
    const r = { id, fecha: hoyK(), hora: pad(d.getHours()) + ':' + pad(d.getMinutes()), ts: Date.now(), momento: 'extra', aprox: false, origen: 'busqueda', items: [], ...o };
    HDB.set('comida/registro/' + id, r); return r;
  }
  HG.guardarRegistro = guardarRegistro; HG.regHoy = regHoy; HG.suma = suma;
  const aplica = p => p.dias !== 'gym' || dia().gym;
  const planHoy = () => plan().filter(aplica);
  const metaKcal = () => { const s = planHoy().reduce((n, p) => n + (Number(p.kcal) || 0), 0); return s || perfil().meta_kcal || 0; };
  const metaProt = () => { const s = planHoy().reduce((n, p) => n + (Number(p.proteina_g) || 0), 0); return s || perfil().meta_prot || 0; };
  Object.assign(HG, { planHoy, metaKcal, metaProt });
  const tipoDe = p => ({ desayuno: 'd', comida: 'c', previa: 'p', cena: 'n' }[p.id] || 'c');
  const proxima = () => planHoy().find(p => !regHoy().some(r => r.momento === p.id));

  // sugerencia de ajuste para la siguiente comida (si te pasaste o te quedaste corto)
  function equivalente(k, exceso) {
    const gr = exceso ? ['Cereales', 'Grasas'] : ['Cereales', 'Grasas', 'Frutas', 'Lácteos'];
    const enAl = new Set(alacena().filter(disponible).map(x => x.alimento_id));
    let mejor = null;
    A.filter(a => gr.includes(a.g) && !bloqueado(a) && a.por >= 10).forEach(a => {
      const pk = a.k * a.por / 100; if (pk < 40) return;
      for (let n = 1; n <= 3; n++) { const err = Math.abs(n * pk - k) + (enAl.has(a.id) ? 0 : 30) + (a.g === 'Grasas' ? 20 : 0); if (!mejor || err < mejor.err) mejor = { a, n, kc: n * pk, err }; }
    });
    return mejor ? `por ejemplo ${mejor.n > 1 ? mejor.n + ' × ' : ''}${mejor.a.pl.replace(/^1 /, '')} de ${mejor.a.n.split(' (')[0].toLowerCase()} (≈ ${r0(mejor.kc)} kcal)` : '';
  }
  function ajuste() {
    const hechas = planHoy().filter(p => regHoy().some(r => r.momento === p.id));
    const extras = regHoy().filter(r => r.momento === 'extra');
    if (!hechas.length && !extras.length) return null;
    const real = suma(regHoy()).k, esperado = hechas.reduce((n, p) => n + (Number(p.kcal) || 0), 0), D = r0(real - esperado);
    if (Math.abs(D) < 80) return { ok: true, t: '👌 Vas al ritmo de tu plan.' };
    const sig = proxima();
    if (!sig) return { ok: false, t: D > 0 ? `Cerraste el día con +${D} kcal sobre tu plan. No hace falta compensar: mañana sigue tu plan normal.` : `Cerraste el día con ${D} kcal por debajo de tu plan. Mañana sigue tu plan; no lo compenses de golpe.` };
    const tope = Math.min(Math.abs(D), Math.round((Number(sig.kcal) || 600) * 0.5)), eq = equivalente(tope, D > 0);
    return { ok: false, t: D > 0 ? `Llevas +${D} kcal sobre tu plan. En «${sig.comida}» quita ≈ ${tope} kcal${eq ? ': ' + eq : ''}.` : `Llevas ${D} kcal bajo tu plan. En «${sig.comida}» agrega ≈ ${tope} kcal${eq ? ': ' + eq : ''}.` };
  }

  // ---------- platillos con lo que hay en la alacena ----------
  function sugerencias(tipo, kcalObj) {
    const disp = new Set(alacena().filter(disponible).map(x => x.alimento_id).filter(Boolean));
    return window.HG_PLATILLOS.filter(p => p.t.includes(tipo) && !p.i.some(([id]) => bloqueado(AM[id]))).map(p => {
      const m = p.i.reduce((s, [id, g]) => { const n = nut(id, g); return { k: s.k + n.k, pr: s.pr + n.pr, c: s.c + n.c, gr: s.gr + n.gr }; }, { k: 0, pr: 0, c: 0, gr: 0 });
      const falta = p.i.filter(([id]) => !disp.has(id)).map(([id]) => AM[id].n);
      const g = gustos(), gusta = p.i.filter(([id]) => g[id] === 'si').length;
      return { p, m, falta, gusta, d: Math.abs(m.k - (kcalObj || m.k)) };
    }).sort((a, b) => (a.falta.length - b.falta.length) || (b.gusta - a.gusta) || (a.d - b.d));
  }
  HG.sugerencias = sugerencias; HG.tipoDe = tipoDe;

  // ---------- vistas ----------
  function pill() {
    const e = HDB.estado(), n = HDB.pendientes();
    const m = { listo: ['', 'Sincronizado'], pendiente: ['w', n + ' por sincronizar'], enviando: ['w', 'Enviando…'], sininternet: ['w', 'Sin internet · se guarda en el teléfono'], error: ['b', 'Sin conexión con tu cuenta'], sinsesion: ['b', 'Falta entrar'] }[e] || ['', ''];
    return `<span class="estado ${m[0]}">${m[1]}</span>`;
  }
  HG.pill = pill;
  HG.vistas.hoy = function () {
    const P = planHoy(), R = regHoy(), S = suma(R), meta = metaKcal(), mp = metaProt(), aj = ajuste(), sig = proxima();
    const pct = meta ? Math.min(100, S.k / meta * 100) : 0, fal = faltantes().filter(f => f.estado === 'falta');
    let h = `<div class="row"><h1 class="sp">Hoy</h1>${pill()}</div><div class="mut">${new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</div>`;
    if (!plan().length) h += `<div class="card">Aún no tienes régimen. Ve a <b>Dieta</b> para armarlo (o carga el que ya tienes en Mi día).</div>`;
    h += `<div class="card"><div class="row"><b class="sp">${r0(S.k)} <span class="mut">/ ${r0(meta)} kcal</span></b><label class="row" style="margin:0;color:var(--tx)"><input type="checkbox" data-i="gym" ${dia().gym ? 'checked' : ''}> Hoy entreno</label></div><div class="bar ${S.k > meta * 1.05 ? 'over' : ''}" style="margin:8px 0"><i style="width:${pct}%"></i></div><div class="macros"><span>Proteína <b>${r0(S.pr)}</b>${mp ? '/' + r0(mp) : ''} g</span><span>Carbs <b>${r0(S.c)}</b> g</span><span>Grasa <b>${r0(S.gr)}</b> g</span></div></div>`;
    if (aj) h += `<div class="card" style="background:${aj.ok ? 'var(--ac2)' : 'var(--warn2)'}">${esc(aj.t)}</div>`;
    h += '<h2>Tu régimen de hoy</h2>';
    P.forEach(p => {
      const reg = R.filter(r => r.momento === p.id), hecho = reg.length, kr = suma(reg).k;
      h += `<div class="card"><div class="row"><b class="sp">${hecho ? '✅ ' : ''}${esc(p.comida)}</b><span class="mut">${esc(p.hora || '')} · ${esc(p.kcal)} kcal${p.dias === 'gym' ? ' · gym' : ''}</span></div><div class="nota" style="margin:4px 0 8px">${esc(p.que_lleva)}</div>`;
      if (hecho) h += `<div class="row"><span class="chip">${r0(kr)} kcal registradas${reg.some(r => r.aprox) ? ' · aprox.' : ''}</span><span class="sp"></span><button class="sm ghost" data-a="deshacer" data-id="${esc(p.id)}">Deshacer</button></div>`;
      else h += `<div class="row"><button class="pri sm" data-a="comi" data-id="${esc(p.id)}">✓ Ya comí esto</button><button class="sm" data-a="foto" data-m="${esc(p.id)}">📷 Foto</button><button class="sm" data-a="otro" data-m="${esc(p.id)}">Comí otra cosa</button></div>`;
      h += '</div>';
    });
    h += `<h2>🛒 Por comprar <span class="mut" style="font-weight:400">· ${fal.length}</span></h2>`;
    h += fal.length ? `<div class="card">${fal.slice(0, 6).map(f => `<div>${esc(f.emoji || '•')} ${esc(f.articulo)} <span class="mut">· ${esc(f.cantidad_texto || '')}</span></div>`).join('')}${fal.length > 6 ? `<div class="mut">y ${fal.length - 6} más…</div>` : ''}<div style="margin-top:8px"><button class="sm" data-a="tab" data-t="compras">Ver lista</button></div></div>` : `<div class="card mut">Nada urgente. Tu alacena está al día.</div>`;
    if (sig) {
      const sg = sugerencias(tipoDe(sig), Number(sig.kcal)).slice(0, 4);
      h += `<h2>👩‍🍳 ¿Qué cocino para «${esc(sig.comida)}»?</h2><div class="nota">Según lo que hay en tu alacena y lo que no descartaste.</div>`;
      sg.forEach(s => { h += `<div class="card"><div class="row"><b class="sp">${esc(s.p.n)}</b><span class="mut">${r0(s.m.k)} kcal · ${r0(s.m.pr)} g prot</span></div><div class="nota">${s.p.i.map(([id, g]) => esc(AM[id].n.split(' (')[0]) + ' ' + g + ' g').join(' · ')}</div>${s.falta.length ? `<div class="chip w">Te falta: ${esc(s.falta.join(', '))}</div>` : `<div class="chip">Tienes todo</div>`}<div class="row" style="margin-top:6px"><button class="sm" data-a="cocine" data-p="${esc(s.p.id)}" data-m="${esc(sig.id)}">Lo comí</button>${s.falta.length ? `<button class="sm" data-a="faltaplato" data-p="${esc(s.p.id)}">Agregar lo que falta a compras</button>` : ''}</div></div>`; });
    }
    return h;
  };
  HG.acc.tab = b => { HG.tab = b.dataset.t; HG.render(); };
  HG.acc.comi = b => {
    const p = plan().find(x => x.id === b.dataset.id); if (!p) return;
    guardarRegistro({ momento: p.id, nombre: p.comida, kcal: Number(p.kcal) || 0, prot: Number(p.proteina_g) || 0, aprox: true, origen: 'plan', items: [{ nombre: p.que_lleva }] });
    toast('Anotado: ' + p.comida); HG.render();
  };
  HG.acc.deshacer = b => { regHoy().filter(r => r.momento === b.dataset.id).forEach(r => HDB.del('comida/registro/' + r.id)); HG.render(); };
  HG.acc.cocine = b => {
    const s = window.HG_PLATILLOS.find(p => p.id === b.dataset.p), mom = plan().find(p => p.id === b.dataset.m); if (!s) return;
    const m = s.i.reduce((q, [id, g]) => { const n = nut(id, g); return { k: q.k + n.k, pr: q.pr + n.pr, c: q.c + n.c, gr: q.gr + n.gr }; }, { k: 0, pr: 0, c: 0, gr: 0 });
    guardarRegistro({ momento: mom ? mom.id : 'extra', nombre: s.n, kcal: r0(m.k), prot: r0(m.pr), carb: r0(m.c), grasa: r0(m.gr), origen: 'platillo', items: s.i.map(([id, g]) => ({ nombre: AM[id].n, gramos: g })) });
    toast('Anotado: ' + s.n); HG.render();
  };
  HG.acc.faltaplato = b => {
    const s = window.HG_PLATILLOS.find(p => p.id === b.dataset.p), disp = new Set(alacena().filter(disponible).map(x => x.alimento_id));
    s.i.filter(([id]) => !disp.has(id)).forEach(([id]) => { const a = AM[id]; HDB.set('comida/faltantes/m-' + id, { id: 'm-' + id, articulo: a.n, emoji: a.e, estado: 'falta', pasillo: a.p, categoria: '', donde: '', cantidad_texto: 'comprar', ts: Date.now() }); });
    toast('Agregado a compras'); HG.render();
  };

  // ---------- Alacena ----------
  HG.vistas.alacena = function () {
    const q = (HG.sub.alq || '').toLowerCase(), L = alacena().filter(x => !q || x.nombre.toLowerCase().includes(q)), cats = categorias();
    let h = `<div class="row"><h1 class="sp">Alacena</h1>${pill()}</div><div class="row" style="margin:8px 0"><button class="pri" data-a="alta">＋ Agregar</button><button data-a="cats">Categorías</button><input class="sp" style="min-width:120px" placeholder="Buscar…" data-i="alq" value="${esc(HG.sub.alq || '')}"></div>`;
    if (!alacena().length) h += `<div class="card">Tu alacena está vacía.<div class="nota" style="margin:6px 0">Puedo cargar los ${HDB.hijos('comida/compras').length} artículos de tu lista semanal para que solo marques lo que ya tienes.</div><button class="pri" data-a="cargarsem">Cargar mis artículos de la semana</button></div>`;
    const grupos = {}; L.forEach(x => { const c = (x.categoria && (cats.find(k => k.id === x.categoria) || {}).nombre) || 'Sin categoría'; (grupos[c] = grupos[c] || []).push(x); });
    Object.keys(grupos).sort().forEach(c => {
      h += `<h3>${esc(c)}</h3><div class="card">`;
      grupos[c].sort((a, b) => a.nombre.localeCompare(b.nombre)).forEach(x => {
        const b = baja(x);
        h += `<div class="it"><div class="em">${esc(x.emoji || '🍽️')}</div><div class="sp" data-a="editar" data-id="${esc(x.id)}"><div><b>${esc(x.nombre)}</b></div><div class="nota">${esc(x.donde ? x.donde + ' · ' : '')}${esc(x.pasillo || '')}</div></div>`;
        if (x.modo === 'aprox') h += `<button class="sm" data-a="nivel" data-id="${esc(x.id)}"><span class="estado ${x.nivel === 'no' ? 'b' : x.nivel === 'poco' ? 'w' : ''}">${textoCant(x)}</span></button>`;
        else h += `<div class="q"><button data-a="mas" data-d="-1" data-id="${esc(x.id)}">−</button><span class="${b ? 'chip w' : ''}">${textoCant(x)}</span><button data-a="mas" data-d="1" data-id="${esc(x.id)}">+</button></div>`;
        h += '</div>';
      });
      h += '</div>';
    });
    return h;
  };
  function guardarAlacena(x) { x.ts = Date.now(); HDB.set('comida/alacena/' + x.id, x); sincronizarFaltantes(); HG.render(); }
  HG.acc.nivel = b => { const x = HDB.get('comida/alacena/' + b.dataset.id); guardarAlacena({ ...x, nivel: { tengo: 'poco', poco: 'no', no: 'tengo' }[x.nivel || 'tengo'] }); };
  HG.acc.mas = b => { const x = HDB.get('comida/alacena/' + b.dataset.id), st = UNIDADES[x.unidad] || 1; guardarAlacena({ ...x, cantidad: Math.max(0, r1((Number(x.cantidad) || 0) + st * Number(b.dataset.d))) }); };
  HG.acc.cargarsem = () => {
    const mapa = { 'leche-lala-100': ['leche-entera', 'l'], 'proteina-simi': [null, 'paquete'], 'avena-hojuelas': ['avena', 'paquete'], 'avena-polvo': ['avena', 'paquete'], platano: ['platano', 'pza'], 'crema-cacahuate': ['crema-cacahuate', 'pza'], espinacas: ['espinaca', 'paquete'], huevo: ['huevo', 'pza'], tortillas: ['tortilla-maiz', 'kg'], frijoles: ['frijol-pinto', 'kg'], pollo: ['pollo-pechuga', 'g'], 'carne-magra': ['res-bistec', 'g'], 'atun-agua': ['atun-agua', 'latas'], arroz: ['arroz-crudo', 'paquete'], papa: ['papa', 'pza'], pasta: ['pasta-cocida', 'paquete'], verduras: [null, 'paquete'], 'aguacate-aceite': ['aguacate', 'pza'] };
    HDB.hijos('comida/compras').filter(c => c && c.id).forEach(c => {
      const [aid, u] = mapa[c.id] || [null, 'pza'], a = aid && AM[aid];
      HDB.set('comida/alacena/' + c.id, { id: c.id, alimento_id: aid, nombre: c.articulo, emoji: a ? a.e : '🛒', modo: 'aprox', nivel: 'tengo', cantidad: 0, unidad: u, minimo: 0, categoria: '', pasillo: a ? a.p : 'Otros', donde: '', ts: Date.now() });
    });
    toast('Listo: marca los que ya tienes o te faltan'); HG.render();
  };
  function formAlacena(x) {
    const cats = categorias();
    return `<h2>${x.nuevo ? 'Agregar a la alacena' : esc(x.nombre)}</h2>
    ${x.nuevo ? `<label>Nombre</label><input id="f-n" value="${esc(x.nombre || '')}" placeholder="Ej. Arroz">` : ''}
    <label>Cómo la llevas</label><div class="seg"><button data-a="fmodo" data-v="exacto" class="${x.modo === 'exacto' ? 'on' : ''}">Cantidad exacta</button><button data-a="fmodo" data-v="aprox" class="${x.modo === 'aprox' ? 'on' : ''}">Aproximada</button></div>
    <div id="f-ex" class="${x.modo === 'exacto' ? '' : 'hide'}"><div class="row"><div class="sp"><label>Cantidad</label><input id="f-c" type="number" step="any" inputmode="decimal" value="${esc(x.cantidad ?? 0)}"></div><div class="sp"><label>Unidad</label><select id="f-u">${Object.keys(UNIDADES).map(u => `<option ${x.unidad === u ? 'selected' : ''}>${u}</option>`).join('')}</select></div><div class="sp"><label>Avísame si baja a</label><input id="f-m" type="number" step="any" inputmode="decimal" value="${esc(x.minimo ?? 0)}"></div></div></div>
    <div id="f-ap" class="${x.modo === 'aprox' ? '' : 'hide'}"><label>Nivel</label><select id="f-l"><option value="tengo" ${x.nivel === 'tengo' ? 'selected' : ''}>Tengo</option><option value="poco" ${x.nivel === 'poco' ? 'selected' : ''}>Poco</option><option value="no" ${x.nivel === 'no' ? 'selected' : ''}>No tengo</option></select></div>
    <label>Categoría (tuya)</label><select id="f-k"><option value="">Sin categoría</option>${cats.map(c => `<option value="${esc(c.id)}" ${x.categoria === c.id ? 'selected' : ''}>${esc(c.nombre)}</option>`).join('')}</select>
    <label>Pasillo del súper</label><select id="f-p">${PASILLOS.map(p => `<option ${x.pasillo === p ? 'selected' : ''}>${p}</option>`).join('')}</select>
    <label>¿Dónde lo consigo? (opcional)</label><input id="f-d" value="${esc(x.donde || '')}" placeholder="Walmart, mercado, tienda de la esquina…">
    <div class="row" style="margin-top:14px"><button class="pri sp" data-a="fguardar">Guardar</button>${x.nuevo ? '' : '<button class="bad" data-a="feliminar">Eliminar</button>'}<button data-a="cerrar">Cancelar</button></div>`;
  }
  let formX = null;
  HG.acc.cerrar = () => cerrar();
  HG.acc.editar = b => { formX = { ...HDB.get('comida/alacena/' + b.dataset.id) }; abrir(formAlacena(formX)); };
  HG.acc.fmodo = b => { formX.modo = b.dataset.v; document.querySelectorAll('#modal [data-a=fmodo]').forEach(e => e.classList.toggle('on', e === b)); $('#f-ex').classList.toggle('hide', formX.modo !== 'exacto'); $('#f-ap').classList.toggle('hide', formX.modo !== 'aprox'); };
  HG.acc.fguardar = () => {
    const x = formX; if (x.nuevo) { x.nombre = ($('#f-n').value || '').trim(); if (!x.nombre) { toast('Escribe el nombre'); return; } if (!x.id) x.id = slug(x.nombre); }
    x.cantidad = Number($('#f-c').value) || 0; x.unidad = $('#f-u').value; x.minimo = Number($('#f-m').value) || 0; x.nivel = $('#f-l').value; x.categoria = $('#f-k').value; x.pasillo = $('#f-p').value; x.donde = $('#f-d').value.trim();
    delete x.nuevo; cerrar(); guardarAlacena(x); toast('Guardado');
  };
  HG.acc.feliminar = () => { HDB.del('comida/alacena/' + formX.id); HDB.del('comida/faltantes/' + formX.id); cerrar(); HG.render(); };
  HG.acc.alta = () => {
    abrir(`<h2>Agregar a la alacena</h2><input id="bq" placeholder="Busca un alimento…" data-i="bq"><div id="bres" style="margin-top:8px"></div><div class="row" style="margin-top:10px"><button data-a="altalibre">Escribirlo yo (no está en la lista)</button><button data-a="cerrar">Cancelar</button></div>`, () => listaAlta(''));
  };
  function listaAlta(q) { q = q.toLowerCase(); const l = A.filter(a => !q || a.n.toLowerCase().includes(q)).slice(0, 30); $('#bres').innerHTML = l.map(a => `<div class="it" data-a="altaelige" data-id="${a.id}"><div class="em">${a.e}</div><div class="sp"><b>${esc(a.n)}</b></div><span class="mut">${a.k} kcal/100 g</span></div>`).join('') || '<div class="mut">Sin resultados</div>'; }
  HG.listaAlta = listaAlta;
  HG.acc.altaelige = b => { const a = AM[b.dataset.id]; formX = { nuevo: true, id: a.id, alimento_id: a.id, nombre: a.n.replace(/ \(.*\)/, ''), emoji: a.e, modo: 'exacto', cantidad: 0, unidad: a.u, minimo: 0, nivel: 'tengo', categoria: '', pasillo: a.p, donde: '' }; abrir(formAlacena(formX)); };
  HG.acc.altalibre = () => { formX = { nuevo: true, id: '', alimento_id: null, nombre: '', emoji: '🛒', modo: 'aprox', cantidad: 0, unidad: 'pza', minimo: 0, nivel: 'tengo', categoria: '', pasillo: 'Otros', donde: '' }; abrir(formAlacena(formX)); };
  HG.acc.cats = () => {
    const l = categorias();
    abrir(`<h2>Mis categorías</h2><div class="nota">Úsalas para agrupar tu alacena y tu lista de compras como tú quieras.</div>${l.map(c => `<div class="it"><div class="sp"><b>${esc(c.nombre)}</b></div><button class="sm" data-a="catren" data-id="${esc(c.id)}">Renombrar</button><button class="sm bad" data-a="catdel" data-id="${esc(c.id)}">Borrar</button></div>`).join('')}<div class="row" style="margin-top:10px"><input class="sp" id="cn" placeholder="Nueva categoría (ej. Para el gym)"><button class="pri" data-a="catadd">Crear</button></div><div style="margin-top:12px"><button data-a="cerrar">Listo</button></div>`);
  };
  HG.acc.catadd = () => { const n = ($('#cn').value || '').trim(); if (!n) return; const id = slug(n); HDB.set('comida/categorias/' + id, { id, nombre: n }); HG.acc.cats(); };
  HG.acc.catren = b => { const c = HDB.get('comida/categorias/' + b.dataset.id), n = prompt('Nuevo nombre', c.nombre); if (n && n.trim()) { HDB.set('comida/categorias/' + c.id, { ...c, nombre: n.trim() }); HG.acc.cats(); } };
  HG.acc.catdel = b => { const id = b.dataset.id; alacena().filter(x => x.categoria === id).forEach(x => HDB.set('comida/alacena/' + x.id, { ...x, categoria: '' })); HDB.del('comida/categorias/' + id); HG.acc.cats(); };

  // ---------- Compras ----------
  HG.vistas.compras = function () {
    const modo = HG.sub.cmodo || 'pasillo', F = faltantes().filter(f => f.estado === 'falta'), cats = categorias();
    let h = `<div class="row"><h1 class="sp">Compras</h1>${pill()}</div><div class="seg">${[['pasillo', 'Por pasillo'], ['cat', 'Por categoría'], ['tienda', 'Por tienda']].map(([v, t]) => `<button data-a="cmodo" data-v="${v}" class="${modo === v ? 'on' : ''}">${t}</button>`).join('')}</div>`;
    const clave = f => modo === 'pasillo' ? (f.pasillo || 'Otros') : modo === 'cat' ? ((cats.find(c => c.id === f.categoria) || {}).nombre || 'Sin categoría') : (f.donde || 'Sin tienda definida');
    const g = {}; F.forEach(f => (g[clave(f)] = g[clave(f)] || []).push(f));
    const orden = modo === 'pasillo' ? PASILLOS : Object.keys(g).sort();
    if (!F.length) h += `<div class="card mut">Nada por comprar. Cuando algo baje de su mínimo en la alacena aparece aquí solo (y también en Mi día).</div>`;
    orden.filter(k => g[k]).forEach(k => {
      h += `<h3>${esc(k)}</h3><div class="card">`;
      g[k].sort((a, b) => a.articulo.localeCompare(b.articulo)).forEach(f => { h += `<div class="it"><input type="checkbox" data-a="compre" data-id="${esc(f.id)}" style="width:22px;height:22px"><div class="em">${esc(f.emoji || '•')}</div><div class="sp"><b>${esc(f.articulo)}</b><div class="nota">${esc(f.cantidad_texto || '')}${f.donde ? ' · ' + esc(f.donde) : ''}</div></div>${f.alacena_id ? '' : `<button class="sm ghost bad" data-a="fdel" data-id="${esc(f.id)}">✕</button>`}</div>`; });
      h += '</div>';
    });
    h += `<div class="row" style="margin-top:10px"><button class="pri" data-a="fmanual">＋ Agregar a la lista</button></div>`;
    const sem = HDB.hijos('comida/compras').filter(c => c && c.id);
    if (sem.length) h += `<h2>Lista semanal de tu plan</h2><div class="nota">Es la lista que armaste para el súper del domingo.</div><div class="card">${sem.sort((a, b) => (a.orden || 0) - (b.orden || 0)).map(c => `<div class="it"><div class="sp"><b>${esc(c.articulo)}</b><div class="nota">${esc(c.cantidad_semana || '')}${c.regla ? ' · ' + esc(c.regla) : ''}</div></div></div>`).join('')}<div style="margin-top:8px"><button class="sm" data-a="semfalt">Pasar toda la lista a por comprar</button></div></div>`;
    return h;
  };
  HG.acc.cmodo = b => { HG.sub.cmodo = b.dataset.v; HG.render(); };
  HG.acc.compre = b => { const f = HDB.get('comida/faltantes/' + b.dataset.id); if (f) { comprado(f); HG.render(); } };
  HG.acc.fdel = b => { HDB.del('comida/faltantes/' + b.dataset.id); HG.render(); };
  HG.acc.fmanual = () => abrir(`<h2>Agregar a la lista</h2><label>¿Qué falta?</label><input id="fm-n" placeholder="Ej. Café"><label>Pasillo</label><select id="fm-p">${PASILLOS.map(p => `<option>${p}</option>`).join('')}</select><label>¿Dónde lo consigo? (opcional)</label><input id="fm-d"><div class="row" style="margin-top:12px"><button class="pri sp" data-a="fmok">Agregar</button><button data-a="cerrar">Cancelar</button></div>`);
  HG.acc.fmok = () => { const n = ($('#fm-n').value || '').trim(); if (!n) return; const id = 'm-' + slug(n); HDB.set('comida/faltantes/' + id, { id, articulo: n, emoji: '•', estado: 'falta', pasillo: $('#fm-p').value, categoria: '', donde: $('#fm-d').value.trim(), cantidad_texto: 'comprar', ts: Date.now() }); cerrar(); HG.render(); };
  HG.acc.semfalt = () => { HDB.hijos('comida/compras').filter(c => c && c.id).forEach(c => HDB.set('comida/faltantes/s-' + c.id, { id: 's-' + c.id, articulo: c.articulo, emoji: '🛒', estado: 'falta', pasillo: 'Otros', categoria: '', donde: '', cantidad_texto: c.cantidad_semana || 'comprar', ts: Date.now() })); toast('Lista semanal lista para el súper'); HG.render(); };

  // ---------- Registro ----------
  const momentosOpts = sel => planHoy().map(p => `<option value="${esc(p.id)}" ${sel === p.id ? 'selected' : ''}>${esc(p.comida)}</option>`).join('') + `<option value="extra" ${sel === 'extra' ? 'selected' : ''}>Otra comida / colación</option>`;
  HG.momentosOpts = momentosOpts;
  HG.vistas.registro = function () {
    const modo = HG.sub.rmodo || 'hoy';
    let h = `<div class="row"><h1 class="sp">Registro</h1>${pill()}</div><div class="seg"><button data-a="rmodo" data-v="hoy" class="${modo === 'hoy' ? 'on' : ''}">Hoy</button><button data-a="rmodo" data-v="semana" class="${modo === 'semana' ? 'on' : ''}">Resumen semanal</button></div>`;
    if (modo === 'semana') return h + resumenSemana();
    h += `<div class="row" style="margin:8px 0"><button class="pri" data-a="foto" data-m="">📷 Foto</button><button data-a="otro" data-m="">🔎 Buscar alimento</button><button data-a="sicomi">✓ «Sí comí»</button></div>`;
    const pend = HG.fotosPend || [];
    if (pend.length) h += `<h3>Fotos por confirmar</h3>${pend.map(f => `<div class="card"><div class="row"><img src="${f.mini}" width="56" height="56" style="border-radius:10px;object-fit:cover"><div class="sp"><b>${f.res ? 'Análisis listo' : 'Esperando análisis'}</b><div class="nota">${f.err ? esc(f.err) : f.res ? (f.res.items || []).length + ' alimentos detectados' : 'Se analiza cuando haya internet'}</div></div></div><div class="row" style="margin-top:6px">${f.res ? `<button class="pri sm" data-a="fconf" data-id="${f.id}">Revisar y guardar</button>` : `<button class="sm" data-a="fanal" data-id="${f.id}">Analizar ahora</button>`}<button class="sm bad" data-a="fdesc" data-id="${f.id}">Descartar</button></div></div>`).join('')}`;
    const R = regHoy(); h += `<h3>Lo que llevas hoy</h3>`;
    if (!R.length) h += `<div class="card mut">Todavía no registras nada hoy.</div>`;
    R.forEach(r => { h += `<div class="card"><div class="row"><b class="sp">${esc(r.nombre)}</b><span class="mut">${esc(r.hora)}</span></div><div class="macros"><span><b>${r0(r.kcal)}</b> kcal</span><span>P <b>${r0(r.prot)}</b></span><span>C <b>${r0(r.carb)}</b></span><span>G <b>${r0(r.grasa)}</b></span>${r.aprox ? '<span class="chip w">aprox.</span>' : ''}${r.origen === 'foto' ? '<span class="chip">foto</span>' : ''}</div><div style="margin-top:6px"><button class="sm ghost bad" data-a="rdel" data-id="${esc(r.id)}">Quitar</button></div></div>`; });
    return h;
  };
  HG.acc.rmodo = b => { HG.sub.rmodo = b.dataset.v; HG.render(); };
  HG.acc.rdel = b => { HDB.del('comida/registro/' + b.dataset.id); HG.render(); };
  function resumenSemana() {
    const dias = []; for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); dias.push(fechaK(d)); }
    const meta = metaKcal() || 1, R = registro(), filas = dias.map(f => { const l = R.filter(r => r.fecha === f), s = suma(l); return { f, s, n: l.length }; });
    const con = filas.filter(x => x.n > 0), prom = con.length ? con.reduce((n, x) => n + x.s.k, 0) / con.length : 0, promP = con.length ? con.reduce((n, x) => n + x.s.pr, 0) / con.length : 0;
    const cumple = filas.filter(x => x.n > 0 && Math.abs(x.s.k - meta) <= meta * 0.15).length;
    let h = `<div class="card"><div class="macros"><span>Promedio <b>${r0(prom)}</b> kcal</span><span>Proteína <b>${r0(promP)}</b> g</span></div><div style="margin-top:6px"><b>${cumple}</b> de ${con.length || 0} días registrados dentro de ±15% de tu meta (${r0(meta)} kcal)</div></div>`;
    filas.forEach(x => { const p = Math.min(130, x.s.k / meta * 100), dd = new Date(x.f + 'T12:00:00'); h += `<div class="it"><div style="width:42px" class="mut">${dd.toLocaleDateString('es-MX', { weekday: 'short' })}</div><div class="sp"><div class="bar ${x.s.k > meta * 1.15 ? 'over' : ''}"><i style="width:${Math.min(100, p)}%"></i></div></div><div style="width:92px;text-align:right">${x.n ? r0(x.s.k) + ' kcal' : '<span class="mut">sin registro</span>'}</div></div>`; });
    return h + `<div class="nota" style="margin-top:8px">Los días con comidas marcadas «aprox.» son estimaciones; mientras más foto o alimento exacto, más confiable el resumen.</div>`;
  }
  HG.acc.sicomi = () => abrir(`<h2>Sí comí (aproximado)</h2><div class="nota">Cuando no hay foto ni tiempo: lo anoto como estimación.</div><label>¿Cuál comida?</label><select id="sc-m">${momentosOpts((proxima() || {}).id)}</select><label>¿Qué tan completa fue?</label><select id="sc-t"><option value="1">Como mi plan</option><option value="0.5">La mitad</option><option value="1.3">Me pasé un poco</option><option value="0.25">Casi nada</option></select><div class="row" style="margin-top:12px"><button class="pri sp" data-a="scok">Anotar</button><button data-a="cerrar">Cancelar</button></div>`);
  HG.acc.scok = () => {
    const id = $('#sc-m').value, f = Number($('#sc-t').value), p = plan().find(x => x.id === id), k = p ? Number(p.kcal) || 0 : 300, pr = p ? Number(p.proteina_g) || 0 : 10;
    guardarRegistro({ momento: id, nombre: p ? p.comida : 'Comida', kcal: r0(k * f), prot: r0(pr * f), aprox: true, origen: 'sicomi', items: [] }); cerrar(); toast('Anotado'); HG.render();
  };
  // buscar alimento y registrar
  let otroM = '';
  HG.acc.otro = b => {
    otroM = b.dataset.m || ''; abrir(`<h2>Registrar un alimento</h2><input id="bq" placeholder="Busca (ej. huevo, arroz…)" data-i="bq2"><div id="bres" style="margin-top:8px"></div><div class="row" style="margin-top:10px"><button data-a="manual">Escribir calorías a mano</button><button data-a="cerrar">Cancelar</button></div>`, () => listaOtro(''));
  };
  function listaOtro(q) { q = q.toLowerCase(); const l = A.filter(a => !q || a.n.toLowerCase().includes(q)).slice(0, 30); $('#bres').innerHTML = l.map(a => `<div class="it" data-a="otroelige" data-id="${a.id}"><div class="em">${a.e}</div><div class="sp"><b>${esc(a.n)}</b><div class="nota">${a.k} kcal · ${a.pr} g prot por 100 g</div></div></div>`).join('') || '<div class="mut">Sin resultados</div>'; }
  HG.listaOtro = listaOtro;
  HG.acc.otroelige = b => {
    const a = AM[b.dataset.id];
    abrir(`<h2>${a.e} ${esc(a.n)}</h2><label>Cuánto comiste (gramos)</label><input id="og" type="number" inputmode="decimal" value="${a.por}" data-i="og"><div class="nota">Porción típica: ${esc(a.pl)}</div><div class="macros" id="om" style="margin:10px 0"></div><label>¿Cuál comida?</label><select id="om-m">${momentosOpts(otroM || 'extra')}</select><div class="row" style="margin-top:12px"><button class="pri sp" data-a="ogok" data-id="${a.id}">Registrar</button><button data-a="cerrar">Cancelar</button></div>`, () => HG.macrosOtro(a.id));
  };
  HG.macrosOtro = id => { const g = Number($('#og').value) || 0, n = nut(id, g); $('#om').innerHTML = `<span><b>${r0(n.k)}</b> kcal</span><span>P <b>${r1(n.pr)}</b></span><span>C <b>${r1(n.c)}</b></span><span>G <b>${r1(n.gr)}</b></span>`; };
  HG.acc.ogok = b => { const a = AM[b.dataset.id], g = Number($('#og').value) || 0, n = nut(a.id, g); guardarRegistro({ momento: $('#om-m').value, nombre: a.n.replace(/ \(.*\)/, '') + ' ' + g + ' g', kcal: r0(n.k), prot: r0(n.pr), carb: r0(n.c), grasa: r0(n.gr), items: [{ nombre: a.n, gramos: g }] }); cerrar(); toast('Registrado'); HG.render(); };
  HG.acc.manual = () => abrir(`<h2>Calorías a mano</h2><label>¿Qué comiste?</label><input id="mn-n"><div class="row"><div class="sp"><label>Calorías</label><input id="mn-k" type="number" inputmode="decimal"></div><div class="sp"><label>Proteína (g)</label><input id="mn-p" type="number" inputmode="decimal"></div></div><label>¿Cuál comida?</label><select id="mn-m">${momentosOpts(otroM || 'extra')}</select><div class="row" style="margin-top:12px"><button class="pri sp" data-a="mnok">Registrar</button><button data-a="cerrar">Cancelar</button></div>`);
  HG.acc.mnok = () => { const k = Number($('#mn-k').value); if (!k) { toast('Pon las calorías'); return; } guardarRegistro({ momento: $('#mn-m').value, nombre: ($('#mn-n').value || 'Comida').trim(), kcal: r0(k), prot: r0($('#mn-p').value), aprox: true, origen: 'manual', items: [] }); cerrar(); toast('Registrado'); HG.render(); };

  // ---------- Foto: se guarda en el teléfono, se analiza con Claude cuando hay internet y TÚ confirmas ----------
  const IDB = (() => {
    let db; const abrirDb = () => db ? Promise.resolve(db) : new Promise((ok, no) => { const r = indexedDB.open('hungry', 1); r.onupgradeneeded = () => r.result.createObjectStore('fotos', { keyPath: 'id' }); r.onsuccess = () => { db = r.result; ok(db); }; r.onerror = () => no(r.error); });
    const tx = (m, f) => abrirDb().then(d => new Promise((ok, no) => { const t = d.transaction('fotos', m), s = t.objectStore('fotos'), q = f(s); t.oncomplete = () => ok(q && q.result); t.onerror = () => no(t.error); }));
    return { put: o => tx('readwrite', s => s.put(o)), all: () => tx('readonly', s => s.getAll()), del: id => tx('readwrite', s => s.delete(id)) };
  })();
  async function cargarFotos() { try { HG.fotosPend = (await IDB.all() || []).sort((a, b) => a.ts - b.ts); } catch (e) { HG.fotosPend = []; } }
  function reducir(file) {
    return new Promise((ok, no) => { const img = new Image(), u = URL.createObjectURL(file); img.onload = () => { const mk = m => { const k = Math.min(1, m / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.72); }; const g = mk(1024), mi = mk(96); URL.revokeObjectURL(u); ok({ g, mi }); }; img.onerror = () => no(new Error('No pude leer la foto')); img.src = u; });
  }
  let fotoM = '';
  HG.acc.foto = b => { fotoM = b.dataset.m || ''; let i = $('#fin'); if (!i) { i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.capture = 'environment'; i.id = 'fin'; i.className = 'hide'; document.body.appendChild(i); i.addEventListener('change', async () => { const f = i.files[0]; i.value = ''; if (!f) return; try { const { g, mi } = await reducir(f); const rec = { id: 'f' + Date.now(), ts: Date.now(), momento: fotoM, b64: g.split(',')[1], mini: mi }; await IDB.put(rec); await cargarFotos(); HG.tab = 'registro'; HG.sub.rmodo = 'hoy'; HG.render(); toast(navigator.onLine ? 'Analizando tu foto…' : 'Foto guardada. Se analiza al volver el internet'); analizar(rec.id); } catch (e) { toast(e.message); } }); } i.click(); };
  async function analizar(id) {
    const f = (HG.fotosPend || []).find(x => x.id === id); if (!f || f.res || !navigator.onLine || !HDB.sesion()) return;
    try { const r = await HDB.llamar('analizar-foto', { imagen: f.b64, tipo: 'image/jpeg' }); f.res = r; f.err = ''; await IDB.put(f); toast('Tu foto está lista para revisar'); }
    catch (e) { f.err = e.code === 'falta_llave' ? 'Falta activar el análisis de fotos (la llave de Claude en Supabase). La foto queda guardada.' : 'No se pudo analizar ahora: ' + e.message; await IDB.put(f); }
    HG.render();
  }
  HG.acc.fanal = b => { toast('Analizando…'); analizar(b.dataset.id); };
  HG.acc.fdesc = async b => { await IDB.del(b.dataset.id); await cargarFotos(); HG.render(); };
  HG.acc.fconf = b => {
    const f = HG.fotosPend.find(x => x.id === b.dataset.id), it = (f.res.items || []);
    abrir(`<h2>Revisa lo que vio</h2><img src="${f.mini}" width="64" style="border-radius:10px"><div class="nota">${esc(f.res.nota || '')} Corrige lo que no cuadre: es una estimación.</div><div id="fi">${it.map((x, i) => `<div class="card" data-fi="${i}"><label>Alimento</label><input data-f="nombre" value="${esc(x.nombre)}"><div class="row"><div class="sp"><label>Gramos</label><input data-f="gramos" type="number" value="${esc(x.gramos)}"></div><div class="sp"><label>kcal</label><input data-f="kcal" type="number" value="${esc(x.kcal)}"></div></div><div class="row"><div class="sp"><label>Prot</label><input data-f="prot" type="number" value="${esc(x.prot)}"></div><div class="sp"><label>Carb</label><input data-f="carb" type="number" value="${esc(x.carb)}"></div><div class="sp"><label>Grasa</label><input data-f="grasa" type="number" value="${esc(x.grasa)}"></div></div><button class="sm bad" data-a="fquitar">Quitar</button> <span class="chip ${x.confianza === 'alta' ? '' : 'w'}">confianza ${esc(x.confianza || 'media')}</span></div>`).join('')}</div><label>¿Cuál comida?</label><select id="fc-m">${momentosOpts(f.momento || (proxima() || {}).id)}</select><div class="row" style="margin-top:12px"><button class="pri sp" data-a="fguard" data-id="${f.id}">Guardar en mi registro</button><button data-a="cerrar">Cancelar</button></div>`);
  };
  HG.acc.fquitar = b => b.closest('.card').remove();
  HG.acc.fguard = async b => {
    const items = [...document.querySelectorAll('#fi .card')].map(c => { const g = n => c.querySelector(`[data-f=${n}]`).value; return { nombre: g('nombre'), gramos: Number(g('gramos')) || 0, kcal: Number(g('kcal')) || 0, prot: Number(g('prot')) || 0, carb: Number(g('carb')) || 0, grasa: Number(g('grasa')) || 0 }; });
    if (!items.length) { cerrar(); return; }
    const s = items.reduce((n, x) => ({ k: n.k + x.kcal, p: n.p + x.prot, c: n.c + x.carb, g: n.g + x.grasa }), { k: 0, p: 0, c: 0, g: 0 });
    guardarRegistro({ momento: $('#fc-m').value, nombre: items.map(x => x.nombre).join(', ').slice(0, 70), kcal: r0(s.k), prot: r0(s.p), carb: r0(s.c), grasa: r0(s.g), aprox: true, origen: 'foto', items });
    await IDB.del(b.dataset.id); await cargarFotos(); cerrar(); toast('Guardado desde tu foto'); HG.render();
  };

  // ---------- avisos con la app cerrada (Web Push) ----------
  const VAPID = 'BD3m2xc05qd_0aJiRj6gyJgCY7wAjVrcsOCPcTOMnPBq3vd7J0VW2umVwrP6ocynGuePnzF7qSvQ443HNP3bXfg';
  const b64 = s => { const p = '='.repeat((4 - s.length % 4) % 4), r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from([...r].map(c => c.charCodeAt(0))); };
  HG.acc.push = async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) { toast('Este navegador no soporta avisos. En iPhone: Compartir → Agregar a inicio y abre Hungry desde ahí'); return; }
      if (await Notification.requestPermission() !== 'granted') { toast('No diste permiso para avisos'); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription() || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(VAPID) });
      await HDB.rest('push_subs?on_conflict=user_id,endpoint', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: HDB.uid(), endpoint: sub.endpoint, sub: sub.toJSON() }) });
      HG.sub.push = true; try { localStorage.setItem('hungry.push', '1'); } catch (e) { }
      toast('Listo: te aviso aunque la app esté cerrada'); HG.render();
    } catch (e) { toast('No se pudo activar: ' + e.message); }
  };

  // ---------- shell ----------
  const TABS = [['hoy', '🍽️', 'Hoy'], ['alacena', '🥫', 'Alacena'], ['compras', '🛒', 'Compras'], ['registro', '📓', 'Registro'], ['dieta', '🥗', 'Dieta']];
  function login() {
    return `<h1>Hungry</h1><div class="card"><b>Entra a tu cuenta</b><div class="nota" style="margin:4px 0 8px">El mismo correo y contraseña de Temple y Mi día.</div><input id="l-e" type="email" autocomplete="username" placeholder="Correo"><div style="height:8px"></div><input id="l-p" type="password" autocomplete="current-password" placeholder="Contraseña"><div id="l-m" class="nota" style="min-height:20px;color:var(--warn)"></div><button class="pri" data-a="login" style="width:100%">Entrar</button></div>`;
  }
  HG.acc.login = async () => { const e = $('#l-e').value.trim(), p = $('#l-p').value; if (!e || !p) { $('#l-m').textContent = 'Escribe correo y contraseña'; return; } $('#l-m').textContent = 'Un momento…'; try { await HDB.login(e, p); await HDB.cargar(); afterLoad(); HG.render(); } catch (x) { $('#l-m').textContent = /Invalid login/i.test(x.message) ? 'Correo o contraseña incorrectos' : 'No se pudo conectar: ' + x.message; } };
  function afterLoad() { aplicarComprados(); sincronizarFaltantes(); cargarFotos().then(() => { (HG.fotosPend || []).forEach(f => analizar(f.id)); }); }
  HG.render = function () {
    const app = $('#app');
    if (!HDB.sesion()) { app.innerHTML = login(); $('#tabs').innerHTML = ''; return; }
    const ae = document.activeElement; if (ae && app.contains(ae) && /INPUT|SELECT|TEXTAREA/.test(ae.tagName) && ae.type !== 'checkbox') return;
    $('#tabs').innerHTML = TABS.map(([k, e, t]) => `<button data-a="tab" data-t="${k}" class="${HG.tab === k ? 'on' : ''}"><b>${e}</b>${t}</button>`).join('');
    const sy = window.scrollY; app.innerHTML = (HG.vistas[HG.tab] || HG.vistas.hoy)(); window.scrollTo(0, sy);
  };
  document.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (!b || (b.tagName === 'INPUT' && b.type === 'checkbox' && e.type !== 'click')) return; const f = HG.acc[b.dataset.a]; if (f) f(b, e); });
  document.addEventListener('input', e => {
    const i = e.target.dataset && e.target.dataset.i; if (!i) return;
    if (i === 'bq') listaAlta(e.target.value); else if (i === 'bq2') listaOtro(e.target.value); else if (i === 'og') HG.macrosOtro($('#modal [data-a=ogok]').dataset.id);
    else if (i === 'alq') { HG.sub.alq = e.target.value; const pos = e.target.selectionStart; const ae = e.target; $('#app').innerHTML = HG.vistas.alacena(); const n = $('[data-i=alq]'); n.focus(); n.setSelectionRange(pos, pos); }
  });
  document.addEventListener('change', e => { if (e.target.dataset && e.target.dataset.i === 'gym') { HDB.set('comida/estado/dia', { id: 'dia', fecha: hoyK(), gym: e.target.checked }); HG.render(); } });
  window.addEventListener('hdb', () => HG.render());
  HG.iniciar = async function () {
    HG.render();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { });
    await cargarFotos();
    const sync = async () => { if (document.hidden) return; const ok = await HDB.cargar(); if (ok) afterLoad(); HG.render(); };
    sync();
    setInterval(sync, 30000);   // cambios entre Hungry y Mi día: máximo 1 minuto
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('online', () => { sync(); (HG.fotosPend || []).forEach(f => analizar(f.id)); });
  };
})();
