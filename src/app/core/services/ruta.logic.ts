// Cálculo de la ruta más corta (Dijkstra) sin Leaflet ni Angular.
// Antes vivía como método privado de MapComponent (findShortestRoute y buildAdjacency);
// el algoritmo es el mismo, pero aquí se puede probar con unitarias sin montar el mapa.

export interface NodoGrafo {
  id: string;
}

export interface AristaGrafo {
  from: string;
  to: string;
  distance: number;
}

export interface Vecino {
  nodeId: string;
  distance: number;
}

export interface RutaCalculada<N extends NodoGrafo> {
  nodes: N[];
  distance: number;
}

/** Lista de adyacencia NO dirigida: cada arista se registra en ambos sentidos. */
export function construirAdyacencia(aristas: readonly AristaGrafo[]): Map<string, Vecino[]> {
  const adyacencia = new Map<string, Vecino[]>();

  for (const arista of aristas) {
    const desde = adyacencia.get(arista.from) ?? [];
    const hacia = adyacencia.get(arista.to) ?? [];
    desde.push({ nodeId: arista.to, distance: arista.distance });
    hacia.push({ nodeId: arista.from, distance: arista.distance });
    adyacencia.set(arista.from, desde);
    adyacencia.set(arista.to, hacia);
  }

  return adyacencia;
}

/** Montículo binario de mínimos: (id, distancia). Las entradas repetidas se descartan al sacarlas. */
export class ColaMinima {
  private readonly datos: { id: string; distancia: number }[] = [];

  get tamano(): number {
    return this.datos.length;
  }

  insertar(id: string, distancia: number): void {
    const d = this.datos;
    d.push({ id, distancia });
    let i = d.length - 1;
    while (i > 0) {
      const padre = (i - 1) >> 1;
      if (d[padre].distancia <= d[i].distancia) break;
      [d[padre], d[i]] = [d[i], d[padre]];
      i = padre;
    }
  }

  extraerMinimo(): { id: string; distancia: number } | undefined {
    const d = this.datos;
    if (d.length === 0) return undefined;
    const minimo = d[0];
    const ultimo = d.pop();
    if (d.length > 0 && ultimo) {
      d[0] = ultimo;
      let i = 0;
      for (;;) {
        const izq = 2 * i + 1;
        const der = izq + 1;
        let menor = i;
        if (izq < d.length && d[izq].distancia < d[menor].distancia) menor = izq;
        if (der < d.length && d[der].distancia < d[menor].distancia) menor = der;
        if (menor === i) break;
        [d[menor], d[i]] = [d[i], d[menor]];
        i = menor;
      }
    }
    return minimo;
  }
}

/**
 * Ruta más corta entre dos nodos. Devuelve null si no hay camino, si el origen no
 * existe en `nodos` o si el destino es inalcanzable. No lanza excepciones.
 * Supone ids únicos y distancias no negativas (no se validan).
 */
export function buscarRutaMasCorta<N extends NodoGrafo>(
  nodos: readonly N[],
  aristas: readonly AristaGrafo[],
  origenId: string,
  destinoId: string,
): RutaCalculada<N> | null {
  const adyacencia = construirAdyacencia(aristas);
  const distancias = new Map<string, number>();
  const previo = new Map<string, string | null>();

  for (const nodo of nodos) {
    distancias.set(nodo.id, Infinity);
    previo.set(nodo.id, null);
  }
  if (!distancias.has(origenId)) return null; // un origen que no está en la lista no llega a nada
  distancias.set(origenId, 0);

  // Cola de prioridad (montículo binario): sacar el nodo más cercano cuesta O(log V)
  // en lugar de recorrer todos los pendientes (O(V)) en cada vuelta.
  const cola = new ColaMinima();
  cola.insertar(origenId, 0);
  const cerrados = new Set<string>();

  while (cola.tamano > 0) {
    const actual = cola.extraerMinimo();
    if (!actual || cerrados.has(actual.id)) continue; // entrada vieja de un nodo ya cerrado
    cerrados.add(actual.id);
    if (actual.id === destinoId) break;

    for (const { nodeId, distance } of adyacencia.get(actual.id) ?? []) {
      if (!distancias.has(nodeId) || cerrados.has(nodeId)) continue;

      const tentativa = actual.distancia + distance;
      if (tentativa < (distancias.get(nodeId) ?? Infinity)) {
        distancias.set(nodeId, tentativa);
        previo.set(nodeId, actual.id);
        cola.insertar(nodeId, tentativa);
      }
    }
  }

  const distanciaFinal = distancias.get(destinoId) ?? Infinity;
  if (distanciaFinal === Infinity) return null;

  // Se reconstruye el camino de atrás hacia adelante
  const ids: string[] = [];
  let actual: string | null = destinoId;
  while (actual) {
    ids.unshift(actual);
    actual = previo.get(actual) ?? null;
  }

  const porId = new Map(nodos.map((n) => [n.id, n] as const));
  const ruta = ids
    .map((id) => porId.get(id))
    .filter((n): n is N => n !== undefined);

  if (ruta.length === 0 || ruta[0].id !== origenId) return null;

  return { nodes: ruta, distance: distanciaFinal };
}
