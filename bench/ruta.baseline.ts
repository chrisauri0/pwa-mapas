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
  const pendientes = new Set<string>();

  for (const nodo of nodos) {
    distancias.set(nodo.id, Infinity);
    previo.set(nodo.id, null);
    pendientes.add(nodo.id);
  }
  distancias.set(origenId, 0);

  while (pendientes.size > 0) {
    // Nodo pendiente con la menor distancia conocida
    let actualId: string | undefined;
    let actualDistancia = Infinity;

    for (const id of pendientes) {
      const d = distancias.get(id) ?? Infinity;
      if (d < actualDistancia) {
        actualDistancia = d;
        actualId = id;
      }
    }

    if (!actualId || actualDistancia === Infinity) break; // lo que queda es inalcanzable

    pendientes.delete(actualId);
    if (actualId === destinoId) break;

    for (const { nodeId, distance } of adyacencia.get(actualId) ?? []) {
      if (!pendientes.has(nodeId)) continue;

      const tentativa = actualDistancia + distance;
      if (tentativa < (distancias.get(nodeId) ?? Infinity)) {
        distancias.set(nodeId, tentativa);
        previo.set(nodeId, actualId);
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
