/* Hungry · datos en tu cuenta de Supabase (tabla docs, rutas comida/*).
   Comparte la sesión con Mi día (misma llave en este teléfono). Todo se guarda primero aquí y se manda con una COLA:
   sin internet sigues registrando, y al volver la conexión se sincroniza solo. */
(function () {
  const C = { url: 'https://tkuiwssnwljjxgcixhtr.supabase.co', key: 'sb_publishable_OGOh4KwojGkr4r2zUI6pGQ_hgSfFFgo' };
  const SK = 'mi-dia.auth.v1', CK = 'hungry.cache.v1', QK = 'hungry.cola.v1';
  const lee = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
  const guarda = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
  let ses = lee(SK, null), cache = lee(CK, {}), cola = lee(QK, []), ocupado = false, ultimoOk = 0, estado = 'listo';
  const err = (code, msg) => { const e = new Error(msg || code); e.code = code; return e; };
  const aviso = () => window.dispatchEvent(new Event('hdb'));
  const jwt = t => { try { return JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); } catch (e) { return {}; } };
  const relee = () => { const s = lee(SK, null); if (s && (!ses || s.exp >= ses.exp || s.rt !== ses.rt)) ses = s; };
  function setSes(r) {
    const now = Math.floor(Date.now() / 1000);
    ses = { at: r.access_token, rt: r.refresh_token, exp: r.expires_at || (now + (r.expires_in || 3600)), email: r.user && r.user.email };
    guarda(SK, ses);
  }
  async function auth(path, body) {
    const res = await fetch(C.url + '/auth/v1/' + path, { method: 'POST', headers: { apikey: C.key, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    let j = null; try { j = await res.json(); } catch (e) { }
    if (!res.ok) throw err(res.status === 400 || res.status === 401 || res.status === 422 ? 'auth' : 'http', (j && (j.msg || j.error_description || j.message)) || ('HTTP ' + res.status));
    return j;
  }
  let refrescando = null;
  async function token() {
    relee();
    if (!ses) throw err('nosesion');
    if (ses.exp - 60 > Math.floor(Date.now() / 1000)) return ses.at;
    if (!refrescando) {
      refrescando = auth('token?grant_type=refresh_token', { refresh_token: ses.rt })
        .then(r => { setSes(r); return ses.at; })
        .catch(e => { if (e.code === 'auth') { ses = null; localStorage.removeItem(SK); throw err('nosesion'); } throw e; })
        .finally(() => { refrescando = null; });
    }
    return refrescando;
  }
  async function rest(path, opts) {
    const f = async () => fetch(C.url + '/rest/v1/' + path, { ...opts, headers: { apikey: C.key, Authorization: 'Bearer ' + await token(), 'Content-Type': 'application/json', ...(opts && opts.headers) } });
    let res = await f();
    if (res.status === 401) { if (ses) ses.exp = 0; res = await f(); }
    if (!res.ok) throw err(res.status === 401 ? 'nosesion' : 'http', 'HTTP ' + res.status);
    return res;
  }
  const uid = () => { relee(); return ses ? jwt(ses.at).sub : null; };
  // ---- lectura ----
  const hijos = prefijo => { const n = prefijo.split('/').length + 1; return Object.keys(cache).filter(p => p.startsWith(prefijo + '/') && p.split('/').length === n).map(p => cache[p]); };
  const get = path => cache[path];
  // ---- escritura (optimista + cola) ----
  function set(path, data) { cache[path] = data; cola = cola.filter(o => o.path !== path); cola.push({ op: 'set', path, data, t: Date.now() }); persistir(); vaciar(); }
  function del(path) { delete cache[path]; cola = cola.filter(o => o.path !== path); cola.push({ op: 'del', path, t: Date.now() }); persistir(); vaciar(); }
  function persistir() { guarda(CK, cache); guarda(QK, cola); aviso(); }
  async function vaciar() {
    if (ocupado || !cola.length || navigator.onLine === false || !ses) return;
    ocupado = true; estado = 'enviando'; aviso();
    try {
      const u = uid();
      while (cola.length) {
        const o = cola[0];
        if (o.op === 'set') await rest('docs?on_conflict=user_id,path', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: u, path: o.path, data: o.data, updated_at: new Date().toISOString() }) });
        else await rest('docs?user_id=eq.' + u + '&path=eq.' + encodeURIComponent(o.path), { method: 'DELETE' });
        cola.shift(); guarda(QK, cola);
      }
      estado = 'listo';
    } catch (e) { estado = e.code === 'nosesion' ? 'sinsesion' : 'error'; }
    ocupado = false; aviso();
  }
  // ---- sincronizar: manda lo pendiente y trae lo de la cuenta ----
  async function cargar() {
    if (navigator.onLine === false) { estado = 'sininternet'; aviso(); return false; }
    if (!(lee(SK, null) || ses)) { estado = 'sinsesion'; aviso(); return false; }
    await vaciar();
    try {
      const res = await rest('docs?path=like.' + encodeURIComponent('comida/*') + '&select=path,data&order=updated_at.desc&limit=3000', {});
      const filas = await res.json();
      const nuevo = {};
      filas.forEach(f => { nuevo[f.path] = f.data; });
      cola.forEach(o => { if (o.op === 'set') nuevo[o.path] = o.data; else delete nuevo[o.path]; });
      cache = nuevo; ultimoOk = Date.now(); estado = cola.length ? 'error' : 'listo'; guarda(CK, cache); aviso(); return true;
    } catch (e) { estado = e.code === 'nosesion' ? 'sinsesion' : 'sininternet'; aviso(); return false; }
  }
  async function login(correo, clave) { setSes(await auth('token?grant_type=password', { email: correo, password: clave })); estado = 'listo'; }
  async function llamar(fn, cuerpo) {
    const res = await fetch(C.url + '/functions/v1/' + fn, { method: 'POST', headers: { apikey: C.key, Authorization: 'Bearer ' + await token(), 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
    let j = null; try { j = await res.json(); } catch (e) { }
    if (!res.ok) { const e = err((j && j.error) || 'http', (j && (j.mensaje || j.detalle)) || ('HTTP ' + res.status)); throw e; }
    return j;
  }
  window.HDB = {
    C, hijos, get, set, del, cargar, vaciar, login, llamar, token, uid, rest,
    sesion: () => { relee(); return !!ses; }, email: () => (ses && ses.email) || '', salir: () => { ses = null; localStorage.removeItem(SK); aviso(); },
    pendientes: () => cola.length, estado: () => (cola.length && estado === 'listo' ? 'pendiente' : estado), ultimoOk: () => ultimoOk
  };
  window.addEventListener('online', () => cargar());
})();
