// Pruebas de INTEGRACIÓN: reintento + mensajes de error + comunicación HTTP real.
// Se levanta un servidor HTTP de verdad en el puerto que asigne el sistema y se le pide que falle
// como lo hizo Firestore en la Práctica 12 (503, 429). No usa mocks de fetch.
//
// Se ejecutan junto con el resto:  pnpm test:integration

import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { conReintento, mensajeDeError } from '../../src/app/core/services/reintento.logic';

let servidor: Server;
let url = '';
let peticiones = 0;
let respuestas: Array<{ status: number; cuerpo?: object }> = [];

/** Cada petición consume la siguiente respuesta programada; la última se repite. */
function manejar(_req: IncomingMessage, res: ServerResponse): void {
  const indice = Math.min(peticiones, respuestas.length - 1);
  const { status, cuerpo } = respuestas[indice];
  peticiones++;
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(cuerpo ?? {}));
}

/** Llamada al servicio: lanza { status } cuando el servidor no responde 2xx (igual que el SDK de Firestore). */
async function llamar(): Promise<{ avisos: string[] }> {
  const r = await fetch(url);
  if (!r.ok) throw { status: r.status };
  return (await r.json()) as { avisos: string[] };
}

const rapido = { baseMs: 1, maxEsperaMs: 5 };

beforeEach(async () => {
  peticiones = 0;
  respuestas = [{ status: 200 }];
  servidor = createServer(manejar);
  await new Promise<void>((ok) => servidor.listen(0, '127.0.0.1', ok));
  url = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}/avisos`;
});

afterEach(async () => {
  await new Promise<void>((ok) => servidor.close(() => ok()));
});

describe('Integración: la app ante un servidor que falla', () => {
  it('AUT-05a: el servidor responde 503 dos veces y luego 200: la app se recupera y recibe los datos', async () => {
    respuestas = [{ status: 503 }, { status: 503 }, { status: 200, cuerpo: { avisos: ['Biblioteca cerrada'] } }];

    const r = await conReintento(() => llamar(), { maxIntentos: 5, ...rapido });

    expect(r.avisos).toEqual(['Biblioteca cerrada']);
    expect(peticiones).toBe(3); // 2 fallos + 1 éxito, sin peticiones de más
  });

  it('AUT-05b: con HTTP 429 permanente agota los intentos y el usuario ve un mensaje de servicio saturado', async () => {
    respuestas = [{ status: 429 }];

    const error = await conReintento(() => llamar(), { maxIntentos: 3, ...rapido }).catch((e: unknown) => e);

    expect(error).toEqual({ status: 429 });
    expect(peticiones).toBe(3);
    const mensaje = mensajeDeError(error, 'cargar los avisos');
    expect(mensaje).toContain('saturado');
    expect(mensaje).not.toContain('429');
  });

  it('AUT-05c: con HTTP 403 NO reintenta (una sola petición) y pide iniciar sesión', async () => {
    respuestas = [{ status: 403 }];

    const error = await conReintento(() => llamar(), { maxIntentos: 5, ...rapido }).catch((e: unknown) => e);

    expect(peticiones).toBe(1);
    expect(mensajeDeError(error, 'publicar el aviso')).toContain('Inicia sesión');
  });

  it('AUT-05d: servidor apagado (conexión rechazada): mensaje de falta de conexión, sin colgarse', async () => {
    await new Promise<void>((ok) => servidor.close(() => ok())); // el puerto queda cerrado
    servidor = createServer(manejar); // para que afterEach tenga algo que cerrar

    const error = await llamar().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(TypeError); // fetch falla por red, no por HTTP
    expect(mensajeDeError(error, 'cargar los avisos')).toContain('No hay conexión');
  });

  it('AUT-05e: invoca alReintentar con esperas que crecen (backoff) antes de recuperarse', async () => {
    respuestas = [{ status: 500 }, { status: 500 }, { status: 500 }, { status: 200 }];
    const esperas: number[] = [];

    await conReintento(() => llamar(), {
      maxIntentos: 5,
      baseMs: 2,
      maxEsperaMs: 100,
      alReintentar: (_n, ms) => esperas.push(ms),
    });

    expect(esperas).toEqual([2, 4, 8]);
  });
});
