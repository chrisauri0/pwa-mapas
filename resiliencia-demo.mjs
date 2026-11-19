#!/usr/bin/env node
// Práctica 12 · Fase 5: demuestra el reintento con espera progresiva y la idempotencia contra un servidor local
// que se porta mal a propósito (500, lento, respuesta perdida, 403). No usa Internet ni Firebase.
// Uso (desde la raíz del proyecto):  node --experimental-strip-types resiliencia-demo.mjs
import { createServer } from 'node:http';
import { mkdirSync, writeFileSync } from 'node:fs';
import { conReintento } from './src/app/core/services/reintento.logic.ts';

const lineas = [];
const log = (s = '') => { console.log(s); lineas.push(s); };

// ---------- Servidor de pruebas ----------
const registros = new Map(); // id -> veces que llegó una escritura
const contadores = {};
let tarde = 0;
const servidor = createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const n = (contadores[url.pathname] = (contadores[url.pathname] ?? 0) + 1);
  const json = (c, o = {}) => { res.writeHead(c, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
  if (url.pathname === '/ok') return json(200, { ok: true });
  if (url.pathname === '/siempre500') return json(500, { error: 'boom' });
  if (url.pathname === '/inestable') return n <= 2 ? json(503, {}) : json(200, { ok: true });
  if (url.pathname === '/prohibido') return json(403, { error: 'permission-denied' });
  if (url.pathname === '/sinsesion') return json(401, { error: 'unauthenticated' });
  if (url.pathname === '/colgado') return; // nunca responde
  if (url.pathname === '/lento') return setTimeout(() => json(200, { ok: true, intento: n }), n === 1 ? 1500 : 10);
  if (url.pathname === '/escribir') {
    const id = url.searchParams.get('id');
    const existia = registros.has(id);
    registros.set(id, (registros.get(id) ?? 0) + 1); // el servidor SIEMPRE procesa
    if (n === 1) { req.socket.destroy(); return; }   // pero la 1ª respuesta se pierde
    return json(existia ? 200 : 201, { id, vecesRecibido: registros.get(id) });
  }
  json(404, {});
});
await new Promise((r) => servidor.listen(0, r));
const BASE = `http://127.0.0.1:${servidor.address().port}`;

// ---------- Cliente con tiempo límite ----------
async function pedir(ruta, { metodo = 'GET', timeoutMs = 800 } = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  const t0 = performance.now();
  try {
    const r = await fetch(BASE + ruta, { method: metodo, signal: ctl.signal });
    if (!r.ok) throw { status: r.status };
    return { ...(await r.json()), status: r.status, ms: performance.now() - t0 };
  } catch (e) {
    if (e?.name === 'AbortError') throw { code: 'deadline-exceeded', ms: performance.now() - t0 };
    if (e?.status) throw e;
    throw { code: 'unavailable', detalle: String(e?.cause?.code ?? e) };
  } finally { clearTimeout(t); }
}
const opciones = (extra = {}) => ({ maxIntentos: 4, baseMs: 100, maxEsperaMs: 1000, ...extra });
const resumenes = [];
function esperas() { const a = []; return { a, alReintentar: (i, ms) => a.push(ms) }; }
const t = () => performance.now();

log('Práctica 12 · Fase 5 · demostración de resiliencia (servidor local de prueba)');
log(`Fecha: ${new Date().toISOString()}  Node: ${process.version}\n`);

// RES-03 Servidor sin respuesta -> timeout controlado
{ const a = t(); let err; try { await pedir('/colgado', { timeoutMs: 800 }); } catch (e) { err = e; }
  log(`${err?.code === 'deadline-exceeded' ? '🟢' : '🔴'} RES-03 Servidor sin respuesta: timeout controlado a los ${(t() - a).toFixed(0)} ms (límite 800 ms), error ${err?.code}`);
  resumenes.push({ id: 'RES-03', ok: err?.code === 'deadline-exceeded', ms: +(t() - a).toFixed(0) }); }

// RES-04 HTTP 500 -> agota intentos, no se cuelga, error al final
{ const e = esperas(); const a = t(); let err;
  try { await conReintento(() => pedir('/siempre500'), opciones({ ...e })); } catch (x) { err = x; }
  const intentos = contadores['/siempre500'];
  log(`${err?.status === 500 && intentos === 4 ? '🟢' : '🔴'} RES-04 HTTP 500 permanente: ${intentos} intentos, esperas ${JSON.stringify(e.a)} ms, termina en ${(t() - a).toFixed(0)} ms con error 500 (la app sigue estable)`);
  resumenes.push({ id: 'RES-04', ok: err?.status === 500 && intentos === 4, intentos, esperas: e.a }); }

// RES-05 401 / 403 -> sin reintentos
for (const [ruta, cod] of [['/prohibido', 403], ['/sinsesion', 401]]) {
  let err; try { await conReintento(() => pedir(ruta), opciones()); } catch (x) { err = x; }
  const intentos = contadores[ruta];
  log(`${err?.status === cod && intentos === 1 ? '🟢' : '🔴'} RES-05 HTTP ${cod}: ${intentos} intento (no se reintenta un error de permisos)`);
  resumenes.push({ id: `RES-05/${cod}`, ok: err?.status === cod && intentos === 1 });
}

// RES-06 Recuperación: falla 2 veces y luego responde
{ const e = esperas(); const a = t(); const r = await conReintento(() => pedir('/inestable'), opciones({ ...e }));
  log(`${r.ok ? '🟢' : '🔴'} RES-06 Recuperación: el servicio falló 2 veces (503) y la app obtuvo respuesta en el intento 3; esperas ${JSON.stringify(e.a)} ms, total ${(t() - a).toFixed(0)} ms`);
  resumenes.push({ id: 'RES-06', ok: r.ok, esperas: e.a, ms: +(t() - a).toFixed(0) }); }

// RES-07 Reintento de escritura: la respuesta se pierde, el servidor sí procesó -> sin duplicados
{ const id = 'aviso-' + Date.now(); const e = esperas();
  const r = await conReintento(() => pedir(`/escribir?id=${id}`, { metodo: 'POST' }), opciones({ ...e }));
  const veces = registros.get(id);
  log(`${registros.size === 1 && veces === 2 ? '🟢' : '🔴'} RES-07 Escritura con respuesta perdida: el servidor recibió el mismo id ${veces} veces pero guardó ${registros.size} registro (id generado por el cliente = idempotente); 1ª respuesta perdida, 2ª fue HTTP ${r.status}`);
  resumenes.push({ id: 'RES-07', ok: registros.size === 1, vecesRecibido: veces, registros: registros.size }); }

// RES-08 Respuesta tardía: la 1ª llega después del timeout; se reintenta y se ignora la tardía
{ const a = t(); const e = esperas(); let aceptadas = 0;
  const r = await conReintento(async () => { const x = await pedir('/lento', { timeoutMs: 500 }); aceptadas++; return x; }, opciones({ ...e }));
  await new Promise((r2) => setTimeout(r2, 1200)); // deja llegar la respuesta tardía de la 1ª petición
  log(`${aceptadas === 1 && r.intento === 2 ? '🟢' : '🔴'} RES-08 Respuesta tardía: la 1ª petición (1500 ms) se canceló a los 500 ms; la interfaz aceptó ${aceptadas} resultado (el del intento ${r.intento}); la respuesta tardía se descartó`);
  resumenes.push({ id: 'RES-08', ok: aceptadas === 1 && r.intento === 2 }); }

servidor.close();
mkdirSync('evidencia-fase12', { recursive: true });
writeFileSync('evidencia-fase12/resiliencia-reporte.txt', lineas.join('\n'));
writeFileSync('evidencia-fase12/resiliencia-resultados.json', JSON.stringify(resumenes, null, 2));
log('\nListo. Pásame evidencia-fase12/resiliencia-reporte.txt');
process.exit(0);
