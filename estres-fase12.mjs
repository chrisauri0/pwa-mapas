#!/usr/bin/env node
// Práctica 12 · Fases 3 y 4: pruebas de estrés de la API (REST de Firestore) y pruebas avanzadas de base de datos.
// Sin dependencias (Node 22+). Uso, desde la raíz del proyecto:
//
//   TEST_EMAIL=tu@correo.com TEST_PASSWORD='tu-clave' node estres-fase12.mjs
//
// Opcional: SOLICITUDES=20 (por usuario), SEMBRAR=300 (documentos de prueba), USUARIOS=1,5,10,20,50, ETIQUETA=antes|despues
// Todos los documentos creados llevan el texto "[prueba-p12]" y se borran al terminar.
// Resultado: evidencia-fase12/<ETIQUETA>-reporte.txt y <ETIQUETA>-resultados.json (pásame el reporte)

import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const PROJECT = process.env.FIREBASE_PROJECT_ID ?? 'prac9-db-sync';
const API_KEY = process.env.FIREBASE_API_KEY ?? 'AIzaSyA-Jk3WEEmdSXwSNLiSRuU6IisUtcdb0CA'; // clave web pública de firebase.ts
const EMAIL = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;
const SOLICITUDES = Number(process.env.SOLICITUDES ?? 20);
const SEMBRAR = Number(process.env.SEMBRAR ?? 300);
const USUARIOS = (process.env.USUARIOS ?? '1,5,10,20,50').split(',').map(Number);
const ETIQUETA = process.env.ETIQUETA ?? 'medicion';
const MARCA = '[prueba-p12]';

if (!EMAIL || !PASSWORD) {
  console.error('🔴 Falta TEST_EMAIL y TEST_PASSWORD (un usuario que ya exista en la app).');
  process.exit(1);
}

const RAIZ = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)`;
const DB = `projects/${PROJECT}/databases/(default)/documents`;
const OUT = 'evidencia-fase12';
mkdirSync(OUT, { recursive: true });

const lineas = [];
const resultados = { etiqueta: ETIQUETA, fecha: new Date().toISOString(), node: process.version };
const log = (s = '') => {
  console.log(s);
  lineas.push(s);
};

const pct = (xs, q) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil(q * s.length) - 1)];
};
const resumen = (xs) => ({
  n: xs.length,
  min: +Math.min(...xs).toFixed(1),
  prom: +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1),
  p90: +pct(xs, 0.9).toFixed(1),
  p95: +pct(xs, 0.95).toFixed(1),
  max: +Math.max(...xs).toFixed(1),
});

async function http(metodo, url, { token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const t0 = performance.now();
  try {
    const res = await fetch(url, { method: metodo, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const texto = await res.text();
    let json = null;
    try {
      json = JSON.parse(texto);
    } catch {
      /* no JSON */
    }
    if (res.status !== 200 && !http.avisado?.has(res.status)) {
      (http.avisado ??= new Set()).add(res.status);
      console.log(`🟡 Primera respuesta HTTP ${res.status}: ${texto.replace(/\s+/g, ' ').slice(0, 300)}`);
      lineas.push(`🟡 Primera respuesta HTTP ${res.status}: ${texto.replace(/\s+/g, ' ').slice(0, 300)}`);
    }
    return { status: res.status, ms: performance.now() - t0, bytes: Buffer.byteLength(texto), json };
  } catch (e) {
    return { status: 0, ms: performance.now() - t0, bytes: 0, json: null, error: String(e) };
  }
}

// ---------- Sesión ----------
log(`Práctica 12 · Fases 3 y 4 · etiqueta "${ETIQUETA}"`);
log(`Fecha: ${resultados.fecha}  Proyecto: ${PROJECT}  Node: ${process.version}`);
const cpu = spawnSync('sh', ['-c', "nproc; grep -m1 'model name' /proc/cpuinfo | cut -d: -f2"], { encoding: 'utf8' });
log(`Equipo cliente: ${cpu.stdout.replace(/\n/g, ' · ').trim()}`);
log('');

const login = await http('POST', `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
  body: { email: EMAIL, password: PASSWORD, returnSecureToken: true },
});
if (login.status !== 200) {
  log(`🔴 No se pudo iniciar sesión (HTTP ${login.status}).`);
  writeFileSync(`${OUT}/${ETIQUETA}-reporte.txt`, lineas.join('\n'));
  process.exit(1);
}
const TOKEN = login.json.idToken;
const UID = login.json.localId;

const aviso = (texto = `${MARCA} medición`, edificio = 'biblioteca') => ({
  edificioId: { stringValue: edificio },
  edificioNombre: { stringValue: edificio },
  tipo: { stringValue: 'aviso' },
  texto: { stringValue: texto },
  autorUid: { stringValue: UID },
  autorNombre: { stringValue: 'prueba-p12' },
  expiraEn: { timestampValue: new Date(Date.now() + 3 * 3600_000).toISOString() },
});
const commit = (id, fields, existe) =>
  http('POST', `${RAIZ}/documents:commit`, {
    token: TOKEN,
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
const nuevoId = () => `p12${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
const borrar = (id) => http('DELETE', `${RAIZ}/documents/avisos/${id}`, { token: TOKEN });
const consulta = (sq) => http('POST', `${RAIZ}/documents:runQuery`, { body: { structuredQuery: sq } });
const creados = [];

// ---------- Siembra ----------
log(`== Siembra: ${SEMBRAR} avisos de prueba en 4 edificios (para que la colección tenga volumen) ==`);
const edificios = ['biblioteca', 'rectoria', 'industrial', 'pidet'];
const ts0 = performance.now();
let sembrados = 0;
for (let i = 0; i < SEMBRAR; i += 20) {
  const lote = [];
  for (let j = i; j < Math.min(SEMBRAR, i + 20); j++) {
    const id = nuevoId();
    lote.push(commit(id, aviso(`${MARCA} sembrado ${j}`, edificios[j % 4]), false).then((r) => {
      if (r.status === 200) {
        creados.push(id);
        sembrados++;
      }
    }));
  }
  await Promise.all(lote);
}
log(`🟢 ${sembrados} de ${SEMBRAR} documentos creados en ${((performance.now() - ts0) / 1000).toFixed(1)} s`);
log('');

// ---------- Fase 3: estrés ----------
async function escenario(nombre, fabricaPeticion) {
  const salida = {};
  log(`== FASE 3 · ${nombre}: ${SOLICITUDES} solicitudes por usuario ==`);
  log('usuarios | RPS   | prom (ms) | P90 (ms) | P95 (ms) | máx (ms) | errores % | códigos HTTP');
  for (const u of USUARIOS) {
    const tiempos = [];
    const codigos = {};
    const t0 = performance.now();
    await Promise.all(
      Array.from({ length: u }, async () => {
        for (let i = 0; i < SOLICITUDES; i++) {
          const r = await fabricaPeticion();
          tiempos.push(r.ms);
          codigos[r.status] = (codigos[r.status] ?? 0) + 1;
        }
      }),
    );
    const seg = (performance.now() - t0) / 1000;
    const total = u * SOLICITUDES;
    const errores = total - (codigos[200] ?? 0);
    const fila = { usuarios: u, solicitudes: total, rps: +(total / seg).toFixed(1), ...resumen(tiempos), erroresPct: +((100 * errores) / total).toFixed(1), codigos };
    salida[u] = fila;
    log(`${String(u).padStart(8)} | ${String(fila.rps).padStart(5)} | ${String(fila.prom).padStart(9)} | ${String(fila.p90).padStart(8)} | ${String(fila.p95).padStart(8)} | ${String(fila.max).padStart(8)} | ${String(fila.erroresPct).padStart(9)} | ${JSON.stringify(codigos)}`);
  }
  log('');
  return salida;
}

// ---------- Fase 4: consultas ----------
log('== FASE 4 · Consultas (10 repeticiones cada una) ==');
const ahora = () => new Date().toISOString();
const vigentes = () => ({
  from: [{ collectionId: 'avisos' }],
  where: { fieldFilter: { field: { fieldPath: 'expiraEn' }, op: 'GREATER_THAN', value: { timestampValue: ahora() } } },
});
const contar = (r) => (Array.isArray(r.json) ? r.json.filter((x) => x.document).length : 0);
const consultas = {
  'individual por id': async () => {
    const r = await http('GET', `${RAIZ}/documents/avisos/${creados[0]}`);
    return { ...r, registros: r.status === 200 ? 1 : 0 };
  },
  'conjunto pequeño (5)': async () => {
    const r = await consulta({ ...vigentes(), limit: 5 });
    return { ...r, registros: contar(r) };
  },
  'conjunto grande (todos los vigentes)': async () => {
    const r = await consulta(vigentes());
    return { ...r, registros: contar(r) };
  },
  'con filtro (edificio = biblioteca)': async () => {
    const r = await consulta({ from: [{ collectionId: 'avisos' }], where: { fieldFilter: { field: { fieldPath: 'edificioId' }, op: 'EQUAL', value: { stringValue: 'biblioteca' } } } });
    return { ...r, registros: contar(r) };
  },
  // La consulta que usa la app para escuchar los avisos, antes y después de la optimización
  'app ANTES (todos los vigentes, sin límite)': async () => {
    const r = await consulta(vigentes());
    return { ...r, registros: contar(r) };
  },
  'app DESPUÉS (orden por vencimiento, límite 100)': async () => {
    const r = await consulta({ ...vigentes(), orderBy: [{ field: { fieldPath: 'expiraEn' }, direction: 'DESCENDING' }], limit: 100 });
    return { ...r, registros: contar(r) };
  },
};
resultados.consultas = {};
log('consulta | registros | bytes | prom (ms) | P95 (ms) | máx (ms) | HTTP');
for (const [nombre, fn] of Object.entries(consultas)) {
  const ts = [];
  let ult = { registros: 0, bytes: 0, status: 0 };
  for (let i = 0; i < 10; i++) {
    ult = await fn();
    ts.push(ult.ms);
  }
  const r = resumen(ts);
  resultados.consultas[nombre] = { registros: ult.registros, bytes: ult.bytes, ...r, http: ult.status };
  log(`${nombre} | ${ult.registros} | ${ult.bytes} | ${r.prom} | ${r.p95} | ${r.max} | ${ult.status}`);
}
log('');

// ---------- Fase 4: concurrencia ----------
log('== FASE 4 · Concurrencia ==');
const idComun = nuevoId();
const carrera = await Promise.all(Array.from({ length: 10 }, () => commit(idComun, aviso(`${MARCA} carrera`), false)));
if (carrera.some((r) => r.status === 200)) creados.push(idComun);
const exitos = carrera.filter((r) => r.status === 200).length;
const conflictos = carrera.filter((r) => r.status === 409).length;
const enDb = await http('GET', `${RAIZ}/documents/avisos/${idComun}`);
resultados.carreraMismoRegistro = { intentos: 10, exitos, conflictos, otros: 10 - exitos - conflictos, documentoExiste: enDb.status === 200 };
log(`${exitos === 1 ? '🟢' : '🔴'} 10 creaciones simultáneas del MISMO id (con "no debe existir"): ${exitos} exitosa, ${conflictos} con 409 CONFLICT; el documento existe: ${enDb.status === 200}`);

const idBase = creados[0];
const edicion = await Promise.all(
  Array.from({ length: 10 }, (_, i) =>
    http('PATCH', `${RAIZ}/documents/avisos/${idBase}?updateMask.fieldPaths=texto`, { token: TOKEN, body: { fields: { texto: { stringValue: `editado ${i}` } } } }),
  ),
);
const codigosEdicion = edicion.reduce((a, r) => ({ ...a, [r.status]: (a[r.status] ?? 0) + 1 }), {});
const despues = await http('GET', `${RAIZ}/documents/avisos/${idBase}`);
const intacto = despues.json?.fields?.texto?.stringValue?.startsWith(MARCA);
resultados.edicionConcurrente = { intentos: 10, codigos: codigosEdicion, textoIntacto: !!intacto };
log(`${Object.keys(codigosEdicion).join() === '403' && intacto ? '🟢' : '🔴'} 10 actualizaciones simultáneas del mismo registro: ${JSON.stringify(codigosEdicion)}; el texto quedó intacto: ${!!intacto} (las reglas prohíben editar)`);

const marca = `${MARCA} integridad ${Date.now()}`;
const ids = Array.from({ length: 30 }, nuevoId);
const esc = await Promise.all(ids.map((id) => commit(id, aviso(marca), false)));
ids.forEach((id, i) => esc[i].status === 200 && creados.push(id));
const total = esc.filter((r) => r.status === 200).length;
const leido = await consulta({ from: [{ collectionId: 'avisos' }], where: { fieldFilter: { field: { fieldPath: 'texto' }, op: 'EQUAL', value: { stringValue: marca } } } });
const enServidor = contar(leido);
resultados.integridad = { escritas: 30, exitosas: total, enServidor };
log(`${total === 30 && enServidor === 30 ? '🟢' : '🔴'} Integridad tras 30 escrituras simultáneas a ids distintos: ${total} confirmadas, ${enServidor} leídas del servidor`);
log('');

// ---------- Fase 3: estrés (después de las consultas) ----------
resultados.estresLectura = await escenario('Lectura (GET lista de 5 avisos)', () => http('GET', `${RAIZ}/documents/avisos?pageSize=5`));
resultados.estresEscritura = await escenario('Escritura (crear un aviso)', async () => {
  const id = nuevoId();
  const r = await commit(id, aviso(), false);
  if (r.status === 200) creados.push(id);
  return r;
});

// ---------- Limpieza ----------
const unicos = [...new Set(creados)];
let borrados = 0;
for (let i = 0; i < unicos.length; i += 10) {
  const lote = await Promise.all(unicos.slice(i, i + 10).map(borrar));
  borrados += lote.filter((r) => r.status === 200).length;
}
log(`🟢 Limpieza: ${borrados} de ${unicos.length} documentos de prueba borrados`);
if (borrados !== unicos.length) log(`🟡 Borra a mano en la consola los avisos con texto "${MARCA}" que hayan quedado.`);

writeFileSync(`${OUT}/${ETIQUETA}-resultados.json`, JSON.stringify(resultados, null, 2));
writeFileSync(`${OUT}/${ETIQUETA}-reporte.txt`, lineas.join('\n'));
log(`\nListo. Pásame ${OUT}/${ETIQUETA}-reporte.txt`);
