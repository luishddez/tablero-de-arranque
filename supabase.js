/* Mi día · acceso a tu cuenta en Supabase (solo lectura de tus datos).
   No hay registro aquí: las cuentas se crean por invitación (ver Temple > Ajustes > Invitar amigos).
   La sesión se guarda en este teléfono. Sin internet, la app sigue con lo último guardado. */
(function () {
  const C = (window.TABLERO && window.TABLERO.supabase) || null;
  const SK = 'mi-dia.auth.v1';
  let ses = null; try { ses = JSON.parse(localStorage.getItem(SK) || 'null'); } catch (e) { }
  const keep = () => { try { ses ? localStorage.setItem(SK, JSON.stringify(ses)) : localStorage.removeItem(SK); } catch (e) { } };
  const err = (code, msg) => { const e = new Error(msg || code); e.code = code; return e; };
  const activo = () => !!(C && C.url && C.key);
  function setSes(r) {
    const now = Math.floor(Date.now() / 1000);
    ses = { at: r.access_token, rt: r.refresh_token, exp: r.expires_at || (now + (r.expires_in || 3600)), email: r.user && r.user.email };
    keep();
  }
  async function auth(path, body) {
    const res = await fetch(C.url + '/auth/v1/' + path, { method: 'POST', headers: { apikey: C.key, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    let j = null; try { j = await res.json(); } catch (e) { }
    if (!res.ok) throw err(res.status === 400 || res.status === 401 || res.status === 422 ? 'auth' : 'http', (j && (j.msg || j.error_description || j.message)) || ('HTTP ' + res.status));
    return j;
  }
  let refrescando = null;
  async function token() {
    // Hungry comparte esta sesión: si ya la renovó, tomamos la nueva (los tokens de renovación rotan)
    try { const s = JSON.parse(localStorage.getItem(SK) || 'null'); if (s && (!ses || s.exp > ses.exp)) ses = s; } catch (e) { }
    if (!ses) throw err('nosesion');
    if (ses.exp - 60 > Math.floor(Date.now() / 1000)) return ses.at;
    if (!refrescando) {
      refrescando = auth('token?grant_type=refresh_token', { refresh_token: ses.rt })
        .then(r => { setSes(r); return ses.at; })
        .catch(e => { if (e.code === 'auth') { ses = null; keep(); throw err('nosesion'); } throw e; })
        .finally(() => { refrescando = null; });
    }
    return refrescando;
  }
  // Devuelve los documentos hijos directos de una carpeta (ej. 'tareas' -> tareas/t1, tareas/t2 ...)
  async function coleccion(prefijo) {
    const url = C.url + '/rest/v1/docs?path=like.' + encodeURIComponent(prefijo + '/*') + '&select=path,data&limit=1000';
    const pedir = async () => fetch(url, { headers: { apikey: C.key, Authorization: 'Bearer ' + await token() } });
    let res = await pedir();
    if (res.status === 401) { if (ses) ses.exp = 0; res = await pedir(); }
    if (!res.ok) throw err(res.status === 401 ? 'nosesion' : 'http', 'HTTP ' + res.status);
    const filas = await res.json();
    const n = prefijo.split('/').length + 1;
    return (filas || []).filter(f => f.path.split('/').length === n).map(f => f.data);
  }
  // Escribe un documento de TU cuenta (solo lo usa "Comprado": Mi día avisa a Hungry qué ya se compró)
  async function guardar(path, data) {
    let u = null; try { u = JSON.parse(atob(ses.at.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub; } catch (e) { }
    if (!u) throw err('nosesion');
    const pedir = async () => fetch(C.url + '/rest/v1/docs?on_conflict=user_id,path', { method: 'POST', headers: { apikey: C.key, Authorization: 'Bearer ' + await token(), 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: u, path, data, updated_at: new Date().toISOString() }) });
    let res = await pedir();
    if (res.status === 401) { if (ses) ses.exp = 0; res = await pedir(); }
    if (!res.ok) throw err(res.status === 401 ? 'nosesion' : 'http', 'HTTP ' + res.status);
  }
  async function login(correo, clave) {
    setSes(await auth('token?grant_type=password', { email: correo, password: clave }));
  }
  function salir() { ses = null; keep(); }
  // ---- pantalla de acceso ----
  function cerrarLogin() { const m = document.getElementById('sb-login'); if (m) m.remove(); }
  function pedirLogin(mensaje) {
    if (!activo() || document.getElementById('sb-login')) return;
    const m = document.createElement('div');
    m.id = 'sb-login';
    m.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;padding:20px;font-family:inherit';
    m.innerHTML = '<div style="background:#fff;color:#1c1c1a;border-radius:16px;padding:20px;width:100%;max-width:340px">'
      + '<div style="font-weight:700;font-size:20px;margin-bottom:4px">Entra a tu cuenta</div>'
      + '<p style="margin:0 0 14px;font-size:13px;color:#555">Tus tareas, plan y compras ya viven en tu cuenta. Usa el mismo correo y contraseña de Temple.</p>'
      + '<input id="sb-e" type="email" autocomplete="username" inputmode="email" autocapitalize="off" placeholder="Correo" style="width:100%;box-sizing:border-box;margin-bottom:8px;padding:10px;font-size:16px;border:1px solid #bbb;border-radius:8px">'
      + '<input id="sb-p" type="password" autocomplete="current-password" placeholder="Contraseña" style="width:100%;box-sizing:border-box;padding:10px;font-size:16px;border:1px solid #bbb;border-radius:8px">'
      + '<div id="sb-m" style="min-height:18px;margin:8px 0;font-size:13px;color:#b45309">' + (mensaje || '') + '</div>'
      + '<button id="sb-go" style="width:100%;padding:12px;font-size:16px;font-weight:600;border:0;border-radius:10px;background:#1c1c1a;color:#fff">Entrar</button>'
      + '<div style="text-align:center;margin-top:12px"><a href="#" id="sb-x" style="font-size:13px;color:#555">Ahora no</a></div></div>';
    document.body.appendChild(m);
    const $ = id => document.getElementById(id);
    let ocupado = false;
    async function ir() {
      if (ocupado) return;
      const e = $('sb-e').value.trim(), p = $('sb-p').value;
      if (!e || !p) { $('sb-m').textContent = 'Escribe tu correo y tu contraseña'; return; }
      if (navigator.onLine === false) { $('sb-m').textContent = 'Necesitas internet para entrar'; return; }
      ocupado = true; $('sb-go').textContent = 'Un momento…'; $('sb-m').textContent = '';
      try {
        await login(e, p);
        cerrarLogin();
        if (typeof window.actualizar === 'function') window.actualizar(false);
      } catch (x) {
        ocupado = false; $('sb-go').textContent = 'Entrar';
        $('sb-m').textContent = /Invalid login/i.test(x.message) ? 'Correo o contraseña incorrectos' : (x.code === 'http' || /fetch|network/i.test(x.message)) ? 'No se pudo conectar. Revisa tu internet' : x.message;
      }
    }
    $('sb-go').onclick = ir;
    $('sb-p').onkeydown = ev => { if (ev.key === 'Enter') ir(); };
    $('sb-x').onclick = ev => { ev.preventDefault(); cerrarLogin(); };
  }
  window.SB = { activo, conSesion: () => !!ses, email: () => (ses && ses.email) || '', coleccion, guardar, login, salir, pedirLogin };
})();
