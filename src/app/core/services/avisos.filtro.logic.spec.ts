import { describe, expect, it } from 'vitest';
import type { Aviso, TipoAviso } from './avisos.logic';
import { agruparAvisos, contarPorTipo, sinAcentos } from './avisos.filtro.logic';

const ORDEN: TipoAviso[] = ['cerrado', 'mantenimiento', 'evento', 'aviso'];

let n = 0;
function aviso(edificioId: string, edificioNombre: string, tipo: TipoAviso, texto = 'texto'): Aviso {
  n++;
  return {
    id: `a${n}`,
    edificioId,
    edificioNombre,
    tipo,
    texto,
    autorUid: 'u1',
    autorNombre: 'Ana',
    creadoEn: null,
    expiraEn: new Date(2030, 0, 1),
    pendiente: false,
  };
}

function porEdificio(...avisos: Aviso[]): Map<string, Aviso[]> {
  const m = new Map<string, Aviso[]>();
  for (const a of avisos) m.set(a.edificioId, [...(m.get(a.edificioId) ?? []), a]);
  return m;
}

describe('sinAcentos', () => {
  it('quita acentos y pasa a minúsculas', () => {
    expect(sinAcentos('Cafetería ÁREA')).toBe('cafeteria area');
  });
});

describe('contarPorTipo', () => {
  it('cuenta cada tipo y deja en 0 los que no hay', () => {
    const c = contarPorTipo([
      aviso('a', 'A', 'cerrado'),
      aviso('b', 'B', 'cerrado'),
      aviso('c', 'C', 'evento'),
    ]);
    expect(c).toEqual({ cerrado: 2, mantenimiento: 0, evento: 1, aviso: 0 });
  });

  it('sin avisos todo es 0', () => {
    expect(contarPorTipo([])).toEqual({ cerrado: 0, mantenimiento: 0, evento: 0, aviso: 0 });
  });
});

describe('agruparAvisos', () => {
  const datos = porEdificio(
    aviso('biblio', 'Biblioteca', 'evento', 'Feria del libro'),
    aviso('biblio', 'Biblioteca', 'cerrado', 'Cerrada por fumigación'),
    aviso('cafe', 'Cafetería', 'aviso', 'Menú nuevo'),
    aviso('lab', 'Laboratorio de Informática', 'mantenimiento', 'Sin red en el 2° piso'),
  );

  it('sin filtro devuelve todos los edificios con avisos', () => {
    const g = agruparAvisos(datos, 'todos', '', ORDEN);
    expect(g.map((x) => x.edificioId)).toEqual(['biblio', 'lab', 'cafe']);
  });

  it('el edificio con el aviso más severo va primero y dentro de él también', () => {
    const g = agruparAvisos(datos, 'todos', '', ORDEN);
    expect(g[0].avisos.map((a) => a.tipo)).toEqual(['cerrado', 'evento']);
  });

  it('a igual severidad se ordena por nombre', () => {
    const iguales = porEdificio(aviso('z', 'Zeta', 'aviso'), aviso('a', 'Álamo', 'aviso'));
    expect(agruparAvisos(iguales, 'todos', '', ORDEN).map((x) => x.nombre)).toEqual(['Álamo', 'Zeta']);
  });

  it('filtra por tipo y quita los edificios que se quedan sin avisos', () => {
    const g = agruparAvisos(datos, 'cerrado', '', ORDEN);
    expect(g).toHaveLength(1);
    expect(g[0].edificioId).toBe('biblio');
    expect(g[0].avisos).toHaveLength(1);
  });

  it('la búsqueda ignora acentos y mayúsculas, y mira el edificio y el mensaje', () => {
    expect(agruparAvisos(datos, 'todos', 'CAFETERIA', ORDEN).map((x) => x.edificioId)).toEqual(['cafe']);
    expect(agruparAvisos(datos, 'todos', 'fumigacion', ORDEN).map((x) => x.edificioId)).toEqual(['biblio']);
  });

  it('un edificio con dos avisos solo conserva el que coincide con la búsqueda', () => {
    const g = agruparAvisos(datos, 'todos', 'feria', ORDEN);
    expect(g).toHaveLength(1);
    expect(g[0].avisos.map((a) => a.tipo)).toEqual(['evento']);
  });

  it('tipo y búsqueda se combinan', () => {
    expect(agruparAvisos(datos, 'mantenimiento', 'biblioteca', ORDEN)).toEqual([]);
    expect(agruparAvisos(datos, 'mantenimiento', 'red', ORDEN)).toHaveLength(1);
  });

  it('una búsqueda de solo espacios no filtra', () => {
    expect(agruparAvisos(datos, 'todos', '   ', ORDEN)).toHaveLength(3);
  });

  it('sin coincidencias o sin avisos devuelve lista vacía', () => {
    expect(agruparAvisos(datos, 'todos', 'xyz', ORDEN)).toEqual([]);
    expect(agruparAvisos(new Map(), 'todos', '', ORDEN)).toEqual([]);
  });

  it('si el aviso no trae nombre de edificio usa el que da nombreDe', () => {
    const sinNombre = porEdificio(aviso('gym', '', 'aviso'));
    const g = agruparAvisos(sinNombre, 'todos', '', ORDEN, (id) => `Lugar ${id}`);
    expect(g[0].nombre).toBe('Lugar gym');
  });

  it('no modifica los datos de entrada', () => {
    const antes = datos.get('biblio')!.map((a) => a.id);
    agruparAvisos(datos, 'todos', '', ORDEN);
    expect(datos.get('biblio')!.map((a) => a.id)).toEqual(antes);
  });
});
