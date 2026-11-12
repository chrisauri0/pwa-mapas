#!/usr/bin/env node
// Práctica 11 · Fases 3 a 5: mide la API REST de Firestore/Auth de prac9-db-sync (colección avisos).
// No necesita dependencias (Node 22+). Uso, desde la raíz del proyecto:
//
//   TEST_EMAIL=tu@correo.com TEST_PASSWORD='tu-clave' node whitebox-fase3-5.mjs
//
// Opcional: RONDAS=10 (peticiones para latencia), CARGA_POR_USUARIO=20.
// Solo escribe documentos con texto "[prueba-wb]" y TODOS se borran al final.
// Resultado: evidencia-fase3-5/resultados.json y evidencia-fase3-5/reporte.txt (pásame el reporte.txt)

import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const PROJECT = process.env.FIREBASE_PROJECT_ID ?? 'prac9-db-sync';
const API_KEY = process.env.FIREBASE_API_KEY ?? 'AIzaSyA-Jk3WEEmdSXwSNLiSRuU6IisUtcdb0CA'; // clave web pública de firebase.ts
const EMAIL = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;
const RONDAS = Number(process.env.RONDAS ?? 10);
const CARGA = Number(process.env.CARGA_POR_USUARIO ?? 20);
const CARGA_ESCRITURA = Number(process.env.CARGA_ESCRITURA ?? 20);

if (!EMAIL || !PASSWORD) {
  console.error('🔴 Falta TEST_EMAIL y TEST_PASSWORD (un usuario que ya exista en la app).');
  process.exit(1);
}

const HOST = 'firestore.googleapis.com';
const DB = `projects/${PROJECT}/databases/(default)/documents`;
const BASE = `https://${HOST}/v1/${DB}`;
const OUT = 'evidencia-fase3-5';
mkdirSync(OUT, { recursive: true });

const lineas = [];
const resultados = {};
const log = (s = '') => {
  console.log(s);
  lineas.push(s);
};

const stats = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const p = (q) => s[Math.min(s.length - 1, Math.ceil(q * s.length) - 1)];
  const avg = s.reduce((a, b) => a + b, 0) / s.length;
  return { n: s.length, min: s[0], avg: +avg.toFixed(1), p95: p(0.95), max: s[s.length - 1] };
};

async function http(metodo, url, { token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const t0 = performance.now();
  try {
    const res = await fetch(url, {
      method: metodo,
      headers,
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    });
    const texto = await res.text();
    const ms = performance.now() - t0;
    let json = null;
    try {
      json = JSON.parse(texto);
    } catch {
      /* respuesta no JSON */
    }
    return { status: res.status, ms, bytes: Buffer.byteLength(texto), json };
  } catch (e) {
    return { status: 0, ms: performance.now() - t0, bytes: 0, json: null, error: String(e) };
  }
}

const caso = [];
async function probar(id, descripcion, esperado, fn) {
  const r = await fn();
  const ok = r.status === esperado;
  caso.push({ id, descripcion, esperado, obtenido: r.status, ms: +r.ms.toFixed(0), bytes: r.bytes });
  log(`${ok ? '🟢' : '🔴'} ${id} ${descripcion} → esperado ${esperado}, obtenido ${r.status} (${r.ms.toFixed(0)} ms, ${r.bytes} B)`);
  return r;
}

// ---------- Auth ----------
log('Práctica 11 · Fases 3 a 5 · mediciones');
log(`Fecha: ${new Date().toISOString()}  Proyecto: ${PROJECT}  Node: ${process.version}`);
log('');

const authUrl = (op) => `https://identitytoolkit.googleapis.com/v1/${op}?key=${API_KEY}`;
const login = await http('POST', authUrl('accounts:signInWithPassword'), {
  body: { email: EMAIL, password: PASSWORD, returnSecureToken: true },
});
if (login.status !== 200) {
  log(`🔴 No se pudo iniciar sesión (HTTP ${login.status}). Revisa correo y contraseña.`);
  writeFileSync(`${OUT}/reporte.txt`, lineas.join('\n'));
  process.exit(1);
}
const TOKEN = login.json.idToken;
const UID = login.json.localId;
log(`🟢 Sesión iniciada con Firebase Auth (${login.ms.toFixed(0)} ms)`);
log('');

// ---------- Utilidades de documentos ----------
const creados = [];
const aviso = (texto = '[prueba-wb] aviso de medición', extra = {}) => ({
  edificioId: { stringValue: 'biblioteca' },
  edificioNombre: { stringValue: 'Biblioteca' },
  tipo: { stringValue: 'aviso' },
  texto: { stringValue: texto },
  autorUid: { stringValue: UID },
  autorNombre: { stringValue: 'prueba-wb' },
  expiraEn: { timestampValue: new Date(Date.now() + 3600_000).toISOString() },
  ...extra,
});
const commit = (token, id, fields, existe) =>
  http('POST', `${BASE.replace('/documents', '')}/documents:commit`, {
    token,
    body: {
      writes: [
        {
          update: { name: `${DB}/avisos/${id}`, fields },
          updateTransforms: [{ fieldPath: 'creadoEn', setToServerValue: 'REQUEST_TIME' }],
          ...(existe === false ? { currentDocument: { exists: false } } : {}),
        },
      ],
    },
  });
const nuevoId = () => `wb${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
const borrar = (id, token = TOKEN) => http('DELETE', `${BASE}/avisos/${id}`, { token });

// ---------- Fase 3: códigos HTTP ----------
log('== FASE 3 · Códigos HTTP (API REST de Firestore y Auth) ==');
await probar('H3-01', 'GET lista de avisos sin sesión (lectura pública)', 200, () => http('GET', `${BASE}/avisos?pageSize=5`));
await probar('H3-02', 'GET documento inexistente', 404, () => http('GET', `${BASE}/avisos/no-existe-wb`));
await probar('H3-03', 'POST crear aviso sin sesión', 403, () => commit(undefined, nuevoId(), aviso()));

const idOk = nuevoId();
const ok = await probar('H3-04', 'POST crear aviso válido con sesión', 200, () => commit(TOKEN, idOk, aviso(), false));
if (ok.status === 200) creados.push(idOk);

await probar('H3-05', 'POST aviso con texto de 281 caracteres', 403, () => commit(TOKEN, nuevoId(), aviso('x'.repeat(281))));
await probar('H3-06', 'POST aviso con tipo inválido', 403, () => commit(TOKEN, nuevoId(), aviso(undefined, { tipo: { stringValue: 'otro' } })));
await probar('H3-07', 'POST aviso a nombre de otro usuario', 403, () => commit(TOKEN, nuevoId(), aviso(undefined, { autorUid: { stringValue: 'otro-uid' } })));
await probar('H3-08', 'POST aviso con campo no permitido', 403, () => commit(TOKEN, nuevoId(), aviso(undefined, { extra: { stringValue: 'x' } })));
await probar('H3-09', 'POST con cuerpo JSON mal formado', 400, () => http('POST', `${BASE.replace('/documents', '')}/documents:commit`, { token: TOKEN, body: '{no es json' }));
await probar('H3-10', 'PATCH (editar) aviso propio', 403, () =>
  http('PATCH', `${BASE}/avisos/${idOk}?updateMask.fieldPaths=texto`, { token: TOKEN, body: { fields: { texto: { stringValue: 'editado' } } } }),
);
await probar('H3-11', 'DELETE aviso sin sesión', 403, () => borrar(idOk, undefined));
await probar('H3-12', 'Auth: contraseña incorrecta', 400, () =>
  http('POST', authUrl('accounts:signInWithPassword'), { body: { email: EMAIL, password: PASSWORD + '_mala', returnSecureToken: true } }),
);
await probar('H3-13', 'Auth: sin clave de API', 400, () =>
  http('POST', 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword', { body: { email: EMAIL, password: PASSWORD } }),
);
await probar('H3-14', 'POST crear aviso con token inválido (no autenticado)', 401, () => commit('token-invalido', nuevoId(), aviso()));
const lista = await http('GET', `${BASE}/avisos?pageSize=50`);
const crudo = JSON.stringify(lista.json ?? {});
const sensibles = ['idToken', 'refreshToken', 'password', 'passwordHash', 'Bearer', '@'].filter((k) => crudo.includes(k));
log(`${sensibles.length === 0 ? '🟢' : '🔴'} H3-15 La lista pública no expone tokens, contraseñas ni correos${sensibles.length ? ' (aparece: ' + sensibles.join(', ') + ')' : ''}. Nota: sí expone autorUid y autorNombre.`);
resultados.sensibles = sensibles;
log('ℹ️  201, 204, 409 y 422 no aplican de forma literal: Firestore responde 200 a crear y borrar, y 409 solo si se pide "no debe existir" (ver Fase 4). 500 no se puede provocar desde el cliente.');
resultados.codigosHttp = caso.slice();
log('');

// ---------- Fase 3: ping y latencia ----------
log('== FASE 3 · Ping contra el host y tiempo de respuesta HTTP ==');
const ping = spawnSync('ping', ['-c', '20', HOST], { encoding: 'utf8' });
const m = /= ([\d.]+)\/([\d.]+)\/([\d.]+)\/([\d.]+) ms/.exec(ping.stdout ?? '');
const perdida = /([\d.]+)% packet loss/.exec(ping.stdout ?? '');
if (m) {
  resultados.ping = { min: +m[1], avg: +m[2], max: +m[3], mdev: +m[4], perdidaPct: perdida ? +perdida[1] : null };
  log(`🟢 Ping a ${HOST} (20 paquetes): min ${m[1]} / prom ${m[2]} / máx ${m[3]} ms, pérdida ${perdida?.[1] ?? '?'} %`);
} else {
  log('🟡 No se pudo medir ping (ICMP bloqueado o sin el comando ping). Anótalo como no disponible.');
}

const lat = [];
const tam = [];
const tabla = [];
for (let i = 0; i < RONDAS; i++) {
  const r = await http('GET', `${BASE}/avisos?pageSize=20`);
  lat.push(r.ms);
  tam.push(r.bytes);
  tabla.push({ solicitud: i + 1, codigo: r.status, ms: +r.ms.toFixed(0), bytes: r.bytes });
}
resultados.tabla10 = tabla;
log('Solicitud | Código HTTP | Tiempo (ms) | Tamaño (bytes)');
for (const t of tabla) log(`${String(t.solicitud).padStart(9)} | ${String(t.codigo).padStart(11)} | ${String(t.ms).padStart(11)} | ${t.bytes}`);
resultados.latenciaGet = { ...stats(lat), bytesMedio: Math.round(tam.reduce((a, b) => a + b, 0) / tam.length) };
log(`🟢 GET lista de avisos x${RONDAS}: ${JSON.stringify(resultados.latenciaGet)}`);

const latCreacion = [];
for (let i = 0; i < Math.min(RONDAS, 5); i++) {
  const id = nuevoId();
  const r = await commit(TOKEN, id, aviso(), false);
  latCreacion.push(r.ms);
  if (r.status === 200) creados.push(id);
}
resultados.latenciaCrear = stats(latCreacion);
log(`🟢 POST crear aviso x${latCreacion.length}: ${JSON.stringify(resultados.latenciaCrear)}`);

// Tamaño de respuesta según la cantidad pedida
const tamanos = {};
for (const n of [1, 5, 20, 100]) {
  const r = await http('GET', `${BASE}/avisos?pageSize=${n}`);
  tamanos[n] = { bytes: r.bytes, ms: +r.ms.toFixed(0) };
}
resultados.tamanoRespuesta = tamanos;
log(`🟢 Tamaño de respuesta por pageSize: ${JSON.stringify(tamanos)}`);
log('');

// ---------- Fase 5-C: tasa de transferencia ----------
log('== FASE 5 · Tasa de transferencia efectiva: bytes x 8 / (segundos x 1,000,000) ==');
resultados.descarga = [];
for (let i = 1; i <= 3; i++) {
  const r = await http('GET', `${BASE}/avisos?pageSize=300`);
  const mbps = (r.bytes * 8) / ((r.ms / 1000) * 1_000_000);
  resultados.descarga.push({ medicion: i, bytes: r.bytes, segundos: +(r.ms / 1000).toFixed(3), mbps: +mbps.toFixed(3) });
  log(`🟢 Descarga ${i}: ${r.bytes} B en ${(r.ms / 1000).toFixed(3)} s → ${mbps.toFixed(3)} Mbps`);
}
resultados.subida = [];
const relleno = 'x'.repeat(100_000);
for (let i = 1; i <= 3; i++) {
  // Cuerpo grande a una colección que las reglas rechazan: se mide la subida, no se guarda nada
  const cuerpo = JSON.stringify({ writes: [{ update: { name: `${DB}/medicion-subida/x${i}`, fields: { relleno: { stringValue: relleno } } } }] });
  const bytes = Buffer.byteLength(cuerpo);
  const r = await http('POST', `${BASE.replace('/documents', '')}/documents:commit`, { token: TOKEN, body: cuerpo });
  const mbps = (bytes * 8) / ((r.ms / 1000) * 1_000_000);
  resultados.subida.push({ medicion: i, bytes, segundos: +(r.ms / 1000).toFixed(3), mbps: +mbps.toFixed(3), httpRechazo: r.status });
  log(`🟢 Subida ${i}: ${bytes} B en ${(r.ms / 1000).toFixed(3)} s → ${mbps.toFixed(3)} Mbps (el servidor respondió ${r.status}; la tasa incluye la espera de su respuesta)`);
}
log('');

// ---------- Fase 4: tiempos de consulta ----------
log('== FASE 4 · Tiempo de consulta a la base (3 consultas, 5 repeticiones cada una) ==');
const consultas = {
  'por id existente': () => http('GET', `${BASE}/avisos/${idOk}`),
  'vigentes (expiraEn > ahora), 20': () =>
    http('POST', `${BASE.replace('/documents', '')}/documents:runQuery`, {
      body: { structuredQuery: { from: [{ collectionId: 'avisos' }], where: { fieldFilter: { field: { fieldPath: 'expiraEn' }, op: 'GREATER_THAN', value: { timestampValue: new Date().toISOString() } } }, limit: 20 } },
    }),
  'por edificio (biblioteca), 20': () =>
    http('POST', `${BASE.replace('/documents', '')}/documents:runQuery`, {
      body: { structuredQuery: { from: [{ collectionId: 'avisos' }], where: { fieldFilter: { field: { fieldPath: 'edificioId' }, op: 'EQUAL', value: { stringValue: 'biblioteca' } } }, limit: 20 } },
    }),
};
resultados.consultasDb = {};
for (const [nombre, fn] of Object.entries(consultas)) {
  const ts = [];
  let st = 0;
  for (let i = 0; i < 5; i++) {
    const r = await fn();
    ts.push(r.ms);
    st = r.status;
  }
  resultados.consultasDb[nombre] = { ...stats(ts), http: st };
  log(`${st === 200 ? '🟢' : '🔴'} ${nombre}: ${JSON.stringify(resultados.consultasDb[nombre])}  (objetivo ≤ 200 ms para consulta sencilla)`);
}
log('');

// ---------- Fase 4: ciclo de vida (persistencia) ----------
log('== FASE 4 · Ciclo de vida de un registro ==');
const idCiclo = nuevoId();
const c1 = await commit(TOKEN, idCiclo, aviso('[prueba-wb] ciclo de vida'), false);
if (c1.status === 200) creados.push(idCiclo);
const g1 = await http('GET', `${BASE}/avisos/${idCiclo}`);
const textoGuardado = g1.json?.fields?.texto?.stringValue;
const upd = await http('PATCH', `${BASE}/avisos/${idCiclo}?updateMask.fieldPaths=texto`, { token: TOKEN, body: { fields: { texto: { stringValue: 'editado' } } } });
const del = await borrar(idCiclo);
const g2 = await http('GET', `${BASE}/avisos/${idCiclo}`);
resultados.ciclo = { crear: c1.status, consultaDespues: g1.status, textoGuardado, actualizar: upd.status, eliminar: del.status, consultaTrasEliminar: g2.status };
log(`${c1.status === 200 ? '🟢' : '🔴'} Insertar válido → ${c1.status}`);
log(`${g1.status === 200 && textoGuardado === '[prueba-wb] ciclo de vida' ? '🟢' : '🔴'} Consultar por id después de insertar → ${g1.status}, texto persistido: "${textoGuardado}"`);
log(`${upd.status === 403 ? '🟢' : '🔴'} Actualizar → ${upd.status} (las reglas prohíben editar avisos: esperado 403)`);
log(`${del.status === 200 ? '🟢' : '🔴'} Eliminar → ${del.status}`);
log(`${g2.status === 404 ? '🟢' : '🔴'} Consultar después de eliminar → ${g2.status} (esperado 404)`);
log('');

// ---------- Fase 4: base de datos (idempotencia, integridad) ----------
log('== FASE 4 · Integridad en la base ==');
const fijo = nuevoId();
const a = await commit(TOKEN, fijo, aviso('[prueba-wb] idempotencia'), undefined);
const b = await commit(TOKEN, fijo, aviso('[prueba-wb] idempotencia'), undefined);
if (a.status === 200) creados.push(fijo);
const dup = await commit(TOKEN, fijo, aviso('[prueba-wb] idempotencia'), false);
const cuenta = await http('POST', `${BASE.replace('/documents', '')}/documents:runQuery`, {
  body: { structuredQuery: { from: [{ collectionId: 'avisos' }], where: { fieldFilter: { field: { fieldPath: 'texto' }, op: 'EQUAL', value: { stringValue: '[prueba-wb] idempotencia' } } } } },
});
const coinc = Array.isArray(cuenta.json) ? cuenta.json.filter((x) => x.document).length : null;
resultados.idempotencia = { envio1: a.status, envio2MismoId: b.status, crearConExistsFalse: dup.status, documentosConEseTexto: coinc };
log(`${a.status === 200 && b.status === 200 && coinc === 1 ? '🟢' : '🔴'} Mismo id enviado dos veces → ${a.status}/${b.status}, documentos resultantes: ${coinc} (esperado 1)`);
log(`${dup.status === 409 ? '🟢' : '🟡'} Crear con "no debe existir" sobre un id usado → HTTP ${dup.status} (esperado 409 ALREADY_EXISTS)`);
log('');

// ---------- Fase 5: carga y concurrencia ----------
log('== FASE 5 · Carga (lecturas) y concurrencia (escrituras) ==');
resultados.carga = {};
for (const usuarios of [1, 5, 10]) {
  const tiempos = [];
  let fallos = 0;
  const t0 = performance.now();
  await Promise.all(
    Array.from({ length: usuarios }, async () => {
      for (let i = 0; i < CARGA; i++) {
        const r = await http('GET', `${BASE}/avisos?pageSize=20`);
        tiempos.push(r.ms);
        if (r.status !== 200) fallos++;
      }
    }),
  );
  const seg = (performance.now() - t0) / 1000;
  const total = usuarios * CARGA;
  resultados.carga[usuarios] = { ...stats(tiempos), peticiones: total, fallos, segundos: +seg.toFixed(2), rps: +(total / seg).toFixed(1) };
  log(`${fallos === 0 ? '🟢' : '🔴'} ${usuarios} usuario(s) x ${CARGA} GET: ${JSON.stringify(resultados.carga[usuarios])}`);
}

const ids = Array.from({ length: 10 }, nuevoId);
const t1 = performance.now();
const escrituras = await Promise.all(ids.map((id) => commit(TOKEN, id, aviso('[prueba-wb] concurrente'), false)));
ids.forEach((id, i) => escrituras[i].status === 200 && creados.push(id));
const exito = escrituras.filter((r) => r.status === 200).length;
resultados.concurrencia = { escrituras: 10, exitosas: exito, segundos: +((performance.now() - t1) / 1000).toFixed(2) };
log(`${exito === 10 ? '🟢' : '🔴'} 10 escrituras simultáneas: ${exito} exitosas, ${resultados.concurrencia.segundos} s`);
log('');

log('== FASE 5 · Carga de escritura (crear avisos) ==');
resultados.cargaEscritura = {};
for (const usuarios of [1, 5, 10]) {
  const tiempos = [];
  let fallos = 0;
  const t0 = performance.now();
  await Promise.all(
    Array.from({ length: usuarios }, async () => {
      for (let i = 0; i < CARGA_ESCRITURA; i++) {
        const id = nuevoId();
        const r = await commit(TOKEN, id, aviso('[prueba-wb] carga'), false);
        tiempos.push(r.ms);
        if (r.status === 200) creados.push(id);
        else fallos++;
      }
    }),
  );
  const seg = (performance.now() - t0) / 1000;
  const total = usuarios * CARGA_ESCRITURA;
  resultados.cargaEscritura[usuarios] = { ...stats(tiempos), peticiones: total, fallos, segundos: +seg.toFixed(2), rps: +(total / seg).toFixed(1) };
  log(`${fallos === 0 ? '🟢' : '🔴'} ${usuarios} usuario(s) x ${CARGA_ESCRITURA} POST: ${JSON.stringify(resultados.cargaEscritura[usuarios])}`);
}
log('');

// ---------- Limpieza ----------
const unicos = [...new Set(creados)];
let borrados = 0;
for (let i = 0; i < unicos.length; i += 10) {
  const lote = await Promise.all(unicos.slice(i, i + 10).map((id) => borrar(id)));
  borrados += lote.filter((r) => r.status === 200).length;
}
log(`🟢 Limpieza: ${borrados} de ${unicos.length} documentos de prueba borrados`);
if (borrados !== unicos.length) log('🟡 Borra a mano en la consola los avisos con texto "[prueba-wb]".');

writeFileSync(`${OUT}/resultados.json`, JSON.stringify(resultados, null, 2));
writeFileSync(`${OUT}/reporte.txt`, lineas.join('\n'));
log(`\nListo. Pásame ${OUT}/reporte.txt`);
