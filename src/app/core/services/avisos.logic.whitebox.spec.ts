// Pruebas WHITE BOX de validarAviso y publicarAviso.
// Los IDs (CV-xx, CP-xx) son los caminos independientes del grafo de flujo de control.
//
// validarAviso  -> V(G) = 8 (5 decisiones; la 5ª tiene 3 condiciones unidas con ||)
// publicarAviso -> V(G) = 3

import { describe, expect, it, vi } from 'vitest';
import {
  AvisoInvalidoError,
  MAX_HORAS,
  MAX_TEXTO,
  MIN_HORAS,
  SesionRequeridaError,
  publicarAviso,
  validarAviso,
  type AvisosRepositorio,
  type EntradaAviso,
} from './avisos.logic';

const entrada = (extra: Partial<EntradaAviso> = {}): EntradaAviso => ({
  edificioId: 'edif-a',
  edificioNombre: 'Edificio A',
  tipo: 'mantenimiento',
  texto: 'Elevador fuera de servicio',
  horas: 2,
  ...extra,
});
const perfil = { uid: 'uid-123', nombre: 'Christopher' };

describe('validarAviso: un camino independiente por prueba', () => {
  it('CV-01: todas las decisiones en falso (camino feliz)', () => {
    expect(validarAviso(entrada())).toEqual({ ok: true, errores: [] });
  });

  it('CV-02: D1 verdadera (edificio vacío o solo espacios)', () => {
    const r = validarAviso(entrada({ edificioId: '   ' }));
    expect(r.errores).toEqual(['Falta el edificio.']);
  });

  it('CV-02b: D1 con edificioId ausente (rama del encadenamiento opcional ?.)', () => {
    const sinId = { ...entrada(), edificioId: undefined } as unknown as EntradaAviso;
    expect(validarAviso(sinId).errores).toEqual(['Falta el edificio.']);
  });

  it('CV-03: D2 verdadera (tipo desconocido)', () => {
    expect(validarAviso(entrada({ tipo: 'urgente' })).errores).toEqual(['Tipo de aviso no válido.']);
  });

  it('CV-04: D3 verdadera (texto vacío tras recortar espacios)', () => {
    expect(validarAviso(entrada({ texto: '   ' })).errores).toEqual(['El texto no puede estar vacío.']);
  });

  it('CV-04b: D3 con texto nulo (rama ?? del texto)', () => {
    const sinTexto = { ...entrada(), texto: undefined } as unknown as EntradaAviso;
    expect(validarAviso(sinTexto).errores).toEqual(['El texto no puede estar vacío.']);
  });

  it('CV-05: D4 verdadera (texto de 281 caracteres)', () => {
    const r = validarAviso(entrada({ texto: 'a'.repeat(MAX_TEXTO + 1) }));
    expect(r.errores).toEqual([`El texto excede ${MAX_TEXTO} caracteres.`]);
  });

  it('CV-06: D5 por la condición C1 (duración no finita: NaN)', () => {
    expect(validarAviso(entrada({ horas: NaN })).ok).toBe(false);
  });

  it('CV-06b: D5 por C1 con Infinity', () => {
    expect(validarAviso(entrada({ horas: Infinity })).ok).toBe(false);
  });

  it('CV-07: D5 por la condición C2 sola (menor al mínimo)', () => {
    expect(validarAviso(entrada({ horas: MIN_HORAS - 0.01 })).ok).toBe(false);
  });

  it('CV-08: D5 por la condición C3 sola (mayor al máximo)', () => {
    expect(validarAviso(entrada({ horas: MAX_HORAS + 0.01 })).ok).toBe(false);
  });

  it('CV-09: todas las decisiones de error a la vez acumulan los mensajes', () => {
    const r = validarAviso({ edificioId: '', edificioNombre: '', tipo: 'x', texto: '', horas: NaN });
    expect(r.ok).toBe(false);
    expect(r.errores).toHaveLength(4); // D4 es excluyente con D3
  });
});

describe('validarAviso: condición C1/C2/C3 de la duración (tabla de verdad)', () => {
  // [horas, C1 !isFinite, C2 < MIN, C3 > MAX, resultado ok]
  const filas: [number, boolean, boolean, boolean, boolean][] = [
    [NaN, true, false, false, false],
    [0.5, false, true, false, false],
    [169, false, false, true, false],
    [2, false, false, false, true],
  ];

  for (const [horas, c1, c2, c3, ok] of filas) {
    it(`horas=${horas}: C1=${c1} C2=${c2} C3=${c3} -> ok=${ok}`, () => {
      expect(validarAviso(entrada({ horas })).ok).toBe(ok);
    });
  }
});

describe('validarAviso: valores límite', () => {
  const limites: [string, Partial<EntradaAviso>, boolean][] = [
    ['horas = 0 (debajo del mínimo)', { horas: 0 }, false],
    ['horas = 1 (mínimo exacto)', { horas: 1 }, true],
    ['horas = 168 (máximo exacto)', { horas: 168 }, true],
    ['horas = 169 (arriba del máximo)', { horas: 169 }, false],
    ['horas = -1 (negativa)', { horas: -1 }, false],
    ['texto de 1 carácter', { texto: 'a' }, true],
    ['texto de 280 caracteres', { texto: 'a'.repeat(280) }, true],
    ['texto de 281 caracteres', { texto: 'a'.repeat(281) }, false],
  ];

  for (const [nombre, extra, ok] of limites) {
    it(`${nombre} -> ok=${ok}`, () => {
      expect(validarAviso(entrada(extra)).ok).toBe(ok);
    });
  }
});

describe('publicarAviso: un camino independiente por prueba', () => {
  const repoFalso = (confirmado: Promise<void> = Promise.resolve()) => ({
    guardar: vi.fn(() => ({ id: 'aviso-1', confirmado })),
    eliminar: vi.fn(() => Promise.resolve()),
  });

  it('CP-01: sin perfil (null) lanza SesionRequeridaError y no toca el repositorio', () => {
    const repo = repoFalso();
    expect(() => publicarAviso(repo, null, entrada(), 0)).toThrow(SesionRequeridaError);
    expect(repo.guardar).toHaveBeenCalledTimes(0);
  });

  it('CP-01b: sin perfil (undefined) también lanza SesionRequeridaError', () => {
    const repo = repoFalso();
    expect(() => publicarAviso(repo, undefined, entrada(), 0)).toThrow(SesionRequeridaError);
    expect(repo.guardar).toHaveBeenCalledTimes(0);
  });

  it('CP-02: con sesión pero aviso inválido lanza AvisoInvalidoError y no guarda', () => {
    const repo = repoFalso();
    expect(() => publicarAviso(repo, perfil, entrada({ texto: '' }), 0)).toThrow(AvisoInvalidoError);
    expect(repo.guardar).toHaveBeenCalledTimes(0);
  });

  it('CP-02b: la sesión se revisa ANTES que la validación (orden de las decisiones)', () => {
    const repo = repoFalso();
    expect(() => publicarAviso(repo, null, entrada({ texto: '' }), 0)).toThrow(SesionRequeridaError);
  });

  it('CP-03: camino feliz guarda una vez con texto normalizado y expiración calculada', () => {
    const repo = repoFalso();
    const r = publicarAviso(repo, perfil, entrada({ texto: '  hola  ', horas: 2 }), 1_000);
    expect(r.id).toBe('aviso-1');
    expect(repo.guardar).toHaveBeenCalledTimes(1);
    expect(repo.guardar).toHaveBeenCalledWith({
      edificioId: 'edif-a',
      edificioNombre: 'Edificio A',
      tipo: 'mantenimiento',
      texto: 'hola',
      autorUid: 'uid-123',
      autorNombre: 'Christopher',
      expiraEnMs: 1_000 + 2 * 3_600_000,
    });
  });
});

describe('publicarAviso: excepciones del servicio', () => {
  it('si el repositorio lanza de forma síncrona, la excepción se propaga sin ocultarse', () => {
    const repo: AvisosRepositorio = {
      guardar: () => {
        throw new Error('fallo del repositorio');
      },
      eliminar: () => Promise.resolve(),
    };
    expect(() => publicarAviso(repo, perfil, entrada(), 0)).toThrow('fallo del repositorio');
  });

  it('si el servidor rechaza, el error llega por `confirmado` y no por excepción síncrona', async () => {
    const repo: AvisosRepositorio = {
      guardar: () => ({ id: 'x', confirmado: Promise.reject(new Error('permission-denied')) }),
      eliminar: () => Promise.resolve(),
    };
    const r = publicarAviso(repo, perfil, entrada(), 0);
    await expect(r.confirmado).rejects.toThrow('permission-denied');
  });
});
