// Pruebas del reintento con espera progresiva. Los tiempos se simulan: no se espera de verdad.
import { describe, expect, it } from 'vitest';
import { calcularEsperaMs, conReintento, esErrorPasajero, mensajeDeError } from './reintento.logic';

const sinEspera = { dormir: () => Promise.resolve() };

describe('calcularEsperaMs', () => {
  it('se duplica en cada intento', () => {
    expect([1, 2, 3, 4].map((i) => calcularEsperaMs(i, 500, 60000))).toEqual([500, 1000, 2000, 4000]);
  });
  it('respeta el tope', () => {
    expect(calcularEsperaMs(10, 500, 5000)).toBe(5000);
  });
  it('el jitter solo resta y nunca pasa de la fracción indicada', () => {
    expect(calcularEsperaMs(1, 1000, 60000, 0.2, () => 1)).toBe(800);
    expect(calcularEsperaMs(1, 1000, 60000, 0.2, () => 0)).toBe(1000);
  });
});

describe('esErrorPasajero', () => {
  it('reintenta fallos de red y de servidor', () => {
    expect(esErrorPasajero({ code: 'unavailable' })).toBe(true);
    expect(esErrorPasajero({ status: 500 })).toBe(true);
    expect(esErrorPasajero({ status: 429 })).toBe(true);
  });
  it('no reintenta permisos ni datos inválidos', () => {
    expect(esErrorPasajero({ code: 'permission-denied' })).toBe(false);
    expect(esErrorPasajero({ status: 401 })).toBe(false);
    expect(esErrorPasajero({ status: 400 })).toBe(false);
    expect(esErrorPasajero(null)).toBe(false);
  });
});

describe('conReintento', () => {
  it('RES-06: se recupera cuando el servicio vuelve (falla 2 veces y la 3ª funciona)', async () => {
    const esperas: number[] = [];
    let llamadas = 0;
    const r = await conReintento(
      async () => {
        llamadas++;
        if (llamadas < 3) throw { code: 'unavailable' };
        return 'ok';
      },
      { maxIntentos: 5, baseMs: 100, maxEsperaMs: 1000, ...sinEspera, alReintentar: (_i, ms) => esperas.push(ms) },
    );
    expect(r).toBe('ok');
    expect(llamadas).toBe(3);
    expect(esperas).toEqual([100, 200]);
  });

  it('RES-04: con HTTP 500 permanente agota los intentos y lanza el último error', async () => {
    let llamadas = 0;
    await expect(
      conReintento(async () => { llamadas++; throw { status: 500 }; }, { maxIntentos: 4, baseMs: 10, maxEsperaMs: 100, ...sinEspera }),
    ).rejects.toEqual({ status: 500 });
    expect(llamadas).toBe(4);
  });

  it('RES-05: con 401 o 403 no reintenta (un solo intento)', async () => {
    let llamadas = 0;
    await expect(
      conReintento(async () => { llamadas++; throw { status: 403 }; }, { maxIntentos: 4, baseMs: 10, maxEsperaMs: 100, ...sinEspera }),
    ).rejects.toEqual({ status: 403 });
    expect(llamadas).toBe(1);
  });

  it('RES-07: la operación recibe el número de intento y puede reutilizar el mismo id (sin duplicados)', async () => {
    const escrituras = new Map<string, number>();
    const id = 'aviso-123'; // el id se genera ANTES del primer intento
    await conReintento(
      async (intento) => {
        escrituras.set(id, (escrituras.get(id) ?? 0) + 1);
        if (intento < 3) throw { code: 'unavailable' };
      },
      { maxIntentos: 5, baseMs: 1, maxEsperaMs: 10, ...sinEspera },
    );
    expect(escrituras.size).toBe(1); // siempre el mismo documento
  });

  it('con un solo intento permitido no espera ni reintenta', async () => {
    let esperas = 0;
    await expect(
      conReintento(async () => { throw { code: 'unavailable' }; }, { maxIntentos: 1, baseMs: 10, maxEsperaMs: 100, dormir: () => { esperas++; return Promise.resolve(); } }),
    ).rejects.toEqual({ code: 'unavailable' });
    expect(esperas).toBe(0);
  });
});

describe('mensajeDeError (mensaje que ve el usuario)', () => {
  it('cuota agotada (429 / resource-exhausted): dice que el servicio está saturado y que hay datos guardados', () => {
    expect(mensajeDeError({ status: 429 }, 'cargar los avisos')).toContain('saturado');
    expect(mensajeDeError({ code: 'resource-exhausted' }, 'cargar los avisos')).toContain('datos guardados');
  });

  it('servidor caído o sin red: pide revisar el internet y nombra la acción', () => {
    const m = mensajeDeError({ code: 'unavailable' }, 'publicar el aviso');
    expect(m).toContain('No hay conexión');
    expect(m).toContain('publicar el aviso');
    expect(mensajeDeError({ status: 503 }, 'x')).toContain('No hay conexión');
    expect(mensajeDeError(new TypeError('fetch failed'), 'x')).toContain('No hay conexión');
  });

  it('sin permiso (403 / permission-denied): pide iniciar sesión', () => {
    expect(mensajeDeError({ code: 'permission-denied' }, 'eliminar el aviso')).toContain('permiso');
    expect(mensajeDeError({ status: 401 }, 'x')).toContain('Inicia sesión');
  });

  it('error desconocido, nulo o indefinido: mensaje genérico, sin lanzar', () => {
    expect(mensajeDeError(null, 'cargar los avisos')).toBe('No se pudo cargar los avisos.');
    expect(mensajeDeError(undefined, 'x')).toBe('No se pudo x.');
    expect(mensajeDeError({ code: 'invalid-argument' }, 'x')).toBe('No se pudo x.');
  });

  it('nunca muestra el código técnico al usuario', () => {
    const m = mensajeDeError({ code: 'resource-exhausted', status: 429 }, 'cargar los avisos');
    expect(m).not.toMatch(/429|RESOURCE_EXHAUSTED|resource-exhausted/);
  });
});
