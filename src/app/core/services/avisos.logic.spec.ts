import { describe, expect, it, vi } from 'vitest';
import {
  AvisoInvalidoError,
  MAX_HORAS,
  MAX_TEXTO,
  MIN_HORAS,
  MS_POR_HORA,
  SesionRequeridaError,
  calcularExpiracion,
  estaVigente,
  normalizarTexto,
  publicarAviso,
  validarAviso,
  type AvisosRepositorio,
  type EntradaAviso,
} from './avisos.logic';

const entradaValida = (extra: Partial<EntradaAviso> = {}): EntradaAviso => ({
  edificioId: 'edif-a',
  edificioNombre: 'Edificio A',
  tipo: 'mantenimiento',
  texto: 'Elevador fuera de servicio',
  horas: 2,
  ...extra,
});

const perfil = { uid: 'uid-123', nombre: 'Christopher' };

/** Doble de prueba (fake) del repositorio: no toca Firestore. */
function crearRepoFalso(confirmado: Promise<void> = Promise.resolve()) {
  return {
    guardar: vi.fn(() => ({ id: 'aviso-1', confirmado })),
    eliminar: vi.fn(() => Promise.resolve()),
  } satisfies AvisosRepositorio;
}

describe('validarAviso', () => {
  describe('caso válido', () => {
    it('acepta un aviso normal de 2 horas', () => {
      const r = validarAviso(entradaValida());
      expect(r.ok).toBe(true);
      expect(r.errores).toEqual([]);
    });
  });

  describe('casos límite', () => {
    it('acepta la duración mínima exacta (1 h)', () => {
      expect(validarAviso(entradaValida({ horas: MIN_HORAS })).ok).toBe(true);
    });

    it('acepta la duración máxima exacta (1 semana = 168 h)', () => {
      expect(validarAviso(entradaValida({ horas: MAX_HORAS })).ok).toBe(true);
    });

    it('acepta un texto de exactamente 280 caracteres', () => {
      expect(validarAviso(entradaValida({ texto: 'a'.repeat(MAX_TEXTO) })).ok).toBe(true);
    });

    it('no cuenta los espacios de los extremos al medir el texto', () => {
      const texto = `   ${'a'.repeat(MAX_TEXTO)}   `;
      expect(validarAviso(entradaValida({ texto })).ok).toBe(true);
    });
  });

  describe('casos inválidos', () => {
    it('rechaza texto de 281 caracteres', () => {
      const r = validarAviso(entradaValida({ texto: 'a'.repeat(MAX_TEXTO + 1) }));
      expect(r.ok).toBe(false);
      expect(r.errores).toContain(`El texto excede ${MAX_TEXTO} caracteres.`);
    });

    it('rechaza texto vacío', () => {
      const r = validarAviso(entradaValida({ texto: '' }));
      expect(r.ok).toBe(false);
      expect(r.errores).toContain('El texto no puede estar vacío.');
    });

    it('rechaza texto con solo espacios', () => {
      expect(validarAviso(entradaValida({ texto: '     ' })).ok).toBe(false);
    });

    it('rechaza un tipo desconocido', () => {
      const r = validarAviso(entradaValida({ tipo: 'urgente' }));
      expect(r.ok).toBe(false);
      expect(r.errores).toContain('Tipo de aviso no válido.');
    });

    it('rechaza si no hay edificio', () => {
      const r = validarAviso(entradaValida({ edificioId: '  ' }));
      expect(r.ok).toBe(false);
      expect(r.errores).toContain('Falta el edificio.');
    });

    it.each([0, 0.5, MAX_HORAS + 1, -3, NaN, Infinity])('rechaza duración fuera de rango (%s h)', (horas) => {
      expect(validarAviso(entradaValida({ horas })).ok).toBe(false);
    });

    it('acumula todos los errores cuando hay varios', () => {
      const r = validarAviso({ edificioId: '', edificioNombre: '', tipo: 'x', texto: '', horas: 0 });
      expect(r.ok).toBe(false);
      expect(r.errores).toHaveLength(4);
    });
  });
});

describe('normalizarTexto', () => {
  it('quita espacios de los extremos', () => {
    expect(normalizarTexto('  hola  ')).toBe('hola');
  });

  it('recorta a 280 caracteres', () => {
    expect(normalizarTexto('b'.repeat(500))).toHaveLength(MAX_TEXTO);
  });
});

describe('calcularExpiracion', () => {
  it('suma las horas en milisegundos', () => {
    expect(calcularExpiracion(1_000, 2)).toBe(1_000 + 2 * MS_POR_HORA);
  });

  it('una semana equivale a 168 horas exactas', () => {
    expect(calcularExpiracion(0, MAX_HORAS)).toBe(7 * 24 * MS_POR_HORA);
  });
});

describe('estaVigente', () => {
  const ahora = 1_000_000;

  it('es vigente si vence en el futuro', () => {
    expect(estaVigente(ahora + 1, ahora)).toBe(true);
  });

  it('límite: si vence justo ahora ya NO es vigente (igual que expiraEn > now)', () => {
    expect(estaVigente(ahora, ahora)).toBe(false);
  });

  it('no es vigente si ya venció', () => {
    expect(estaVigente(ahora - 1, ahora)).toBe(false);
  });
});

describe('publicarAviso (con repositorio falso)', () => {
  const ahora = 1_700_000_000_000;

  it('caso válido: manda al repositorio el aviso normalizado con su expiración', () => {
    const repo = crearRepoFalso();

    const r = publicarAviso(repo, perfil, entradaValida({ texto: '  Elevador fuera de servicio  ' }), ahora);

    expect(r.id).toBe('aviso-1');
    expect(repo.guardar).toHaveBeenCalledTimes(1);
    expect(repo.guardar).toHaveBeenCalledWith({
      edificioId: 'edif-a',
      edificioNombre: 'Edificio A',
      tipo: 'mantenimiento',
      texto: 'Elevador fuera de servicio',
      autorUid: 'uid-123',
      autorNombre: 'Christopher',
      expiraEnMs: ahora + 2 * MS_POR_HORA,
    });
  });

  it('error: sin sesión lanza SesionRequeridaError y no toca el repositorio', () => {
    const repo = crearRepoFalso();

    expect(() => publicarAviso(repo, null, entradaValida(), ahora)).toThrow(SesionRequeridaError);
    expect(repo.guardar).not.toHaveBeenCalled();
  });

  it('error: datos inválidos lanzan AvisoInvalidoError y no se manda nada', () => {
    const repo = crearRepoFalso();

    expect(() => publicarAviso(repo, perfil, entradaValida({ texto: '' }), ahora)).toThrow(AvisoInvalidoError);
    expect(repo.guardar).not.toHaveBeenCalled();
  });

  it('error: si el servidor rechaza, `confirmado` se rechaza con ese error', async () => {
    const repo = crearRepoFalso(Promise.reject(new Error('permission-denied')));

    const r = publicarAviso(repo, perfil, entradaValida(), ahora);

    await expect(r.confirmado).rejects.toThrow('permission-denied');
  });
});
