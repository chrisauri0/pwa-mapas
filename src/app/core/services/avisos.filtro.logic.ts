// Filtro y agrupación de los avisos para el modal de "Avisos del campus" (sin Angular ni Firebase).

import type { Aviso, TipoAviso } from './avisos.logic';

export type FiltroTipo = TipoAviso | 'todos';

export interface GrupoAvisos {
  edificioId: string;
  nombre: string;
  avisos: Aviso[];
}

/** Minúsculas y sin acentos, para que "cafeteria" encuentre "Cafetería". */
export function sinAcentos(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Cuántos avisos hay de cada tipo. */
export function contarPorTipo(avisos: readonly Aviso[]): Record<TipoAviso, number> {
  const cuenta: Record<TipoAviso, number> = { cerrado: 0, mantenimiento: 0, evento: 0, aviso: 0 };
  for (const a of avisos) cuenta[a.tipo]++;
  return cuenta;
}

/**
 * Avisos que pasan el filtro (tipo y texto buscado en el nombre del edificio o en el mensaje),
 * agrupados por edificio. Los edificios con el aviso más severo van primero; a igual severidad, por nombre.
 * `ordenTipos` va de más a menos severo (ej. cerrado, mantenimiento, evento, aviso).
 */
export function agruparAvisos(
  porEdificio: ReadonlyMap<string, readonly Aviso[]>,
  filtro: FiltroTipo,
  busqueda: string,
  ordenTipos: readonly TipoAviso[],
  nombreDe: (edificioId: string) => string = (id) => id,
): GrupoAvisos[] {
  const q = sinAcentos(busqueda.trim());
  const severidad = (a: Aviso): number => ordenTipos.indexOf(a.tipo);

  const grupos: GrupoAvisos[] = [];
  porEdificio.forEach((lista, edificioId) => {
    const avisos = lista
      .filter(
        (a) =>
          (filtro === 'todos' || a.tipo === filtro) &&
          (!q || sinAcentos(a.edificioNombre).includes(q) || sinAcentos(a.texto).includes(q)),
      )
      .sort((a, b) => severidad(a) - severidad(b));
    if (avisos.length === 0) return;
    grupos.push({ edificioId, nombre: avisos[0].edificioNombre || nombreDe(edificioId), avisos });
  });

  const peor = (g: GrupoAvisos): number => Math.min(...g.avisos.map(severidad));
  return grupos.sort((a, b) => peor(a) - peor(b) || a.nombre.localeCompare(b.nombre, 'es'));
}
