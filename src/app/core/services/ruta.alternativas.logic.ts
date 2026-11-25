// Distancias reales del grafo y rutas alternativas (sin Leaflet ni Angular).
// Usa buscarRutaMasCorta tal como está; aquí solo se le preparan las aristas.

import { distanciaM } from './recorrido.logic';
import { type AristaGrafo, type NodoGrafo, type RutaCalculada, buscarRutaMasCorta } from './ruta.logic';

export interface NodoConPunto extends NodoGrafo {
  lat: number;
  lng: number;
}

export interface ResultadoAristas {
  aristas: AristaGrafo[];
  /** Aristas que mencionan un nodo que no existe: se ignoran (casi siempre es un id mal escrito). */
  descartadas: { from: string; to: string }[];
}

/**
 * Arma las aristas con la distancia REAL en metros entre las coordenadas de sus dos nodos,
 * en lugar de un número escrito a mano. Si mueves un nodo, la distancia se actualiza sola.
 */
export function aristasConDistanciaReal(
  nodos: readonly NodoConPunto[],
  aristas: readonly { from: string; to: string }[],
): ResultadoAristas {
  const porId = new Map(nodos.map((n) => [n.id, n] as const));
  const resultado: AristaGrafo[] = [];
  const descartadas: { from: string; to: string }[] = [];

  for (const a of aristas) {
    const desde = porId.get(a.from);
    const hasta = porId.get(a.to);
    if (!desde || !hasta) {
      descartadas.push({ from: a.from, to: a.to });
      continue;
    }
    resultado.push({ from: a.from, to: a.to, distance: distanciaM(desde, hasta) });
  }
  return { aristas: resultado, descartadas };
}

export interface OpcionesAlternativas {
  /** Cuántas rutas devolver como máximo, contando la más corta. */
  maximo?: number;
  /** Cuánto se encarece una arista cada vez que ya la usa una ruta anterior (0.8 = +80 %). */
  penalizacion?: number;
  /** Una alternativa no puede medir más que la más corta × este factor. */
  tolerancia?: number;
  /** Si comparte más de esta fracción de su largo con una ruta ya elegida, se descarta por parecida. */
  similitudMaxima?: number;
}

const claveArista = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`);

/**
 * La ruta más corta y hasta `maximo - 1` alternativas que de verdad vayan por otro lado.
 * Método: tras cada ruta, sus tramos se "encarecen" y se vuelve a buscar, así la siguiente
 * se aleja de las anteriores. La distancia que se devuelve siempre es la real (sin penalizar).
 * La primera de la lista es siempre la más corta; devuelve [] si no hay camino.
 */
export function buscarRutasAlternativas<N extends NodoGrafo>(
  nodos: readonly N[],
  aristas: readonly AristaGrafo[],
  origenId: string,
  destinoId: string,
  opciones: OpcionesAlternativas = {},
): RutaCalculada<N>[] {
  const { maximo = 3, penalizacion = 0.8, tolerancia = 1.5, similitudMaxima = 0.85 } = opciones;

  const mejor = buscarRutaMasCorta(nodos, aristas, origenId, destinoId);
  if (!mejor) return [];
  if (mejor.nodes.length < 2) return [mejor]; // origen = destino: no hay por dónde alternar

  // Distancia real por tramo (si hubiera dos aristas entre los mismos nodos, vale la más corta)
  const largoDe = new Map<string, number>();
  for (const a of aristas) {
    const k = claveArista(a.from, a.to);
    largoDe.set(k, Math.min(largoDe.get(k) ?? Infinity, a.distance));
  }
  const tramosDe = (ruta: readonly N[]): string[] =>
    ruta.slice(1).map((n, i) => claveArista(ruta[i].id, n.id));
  const largoReal = (tramos: readonly string[]): number =>
    tramos.reduce((suma, k) => suma + (largoDe.get(k) ?? 0), 0);

  const elegidas: RutaCalculada<N>[] = [mejor];
  const tramosElegidos: string[][] = [tramosDe(mejor.nodes)];
  const usos = new Map<string, number>();
  const marcarUsos = (tramos: readonly string[]): void =>
    tramos.forEach((k) => usos.set(k, (usos.get(k) ?? 0) + 1));
  marcarUsos(tramosElegidos[0]);

  const intentosMaximos = Math.max(maximo, 1) * 4;
  for (let intento = 0; intento < intentosMaximos && elegidas.length < maximo; intento++) {
    const encarecidas = aristas.map((a) => ({
      ...a,
      distance: a.distance * (1 + penalizacion * (usos.get(claveArista(a.from, a.to)) ?? 0)),
    }));
    const candidata = buscarRutaMasCorta(nodos, encarecidas, origenId, destinoId);
    if (!candidata) break;

    const tramos = tramosDe(candidata.nodes);
    marcarUsos(tramos); // aunque se rechace, la siguiente búsqueda ya no pasa por ahí
    const real = largoReal(tramos);
    if (real > mejor.distance * tolerancia) continue;

    const parecida = tramosElegidos.some((otra) => {
      const compartido = tramos.filter((k) => otra.includes(k));
      // Repetida (mismos tramos) o casi igual (comparte casi todo su largo)
      return compartido.length === tramos.length || (real > 0 && largoReal(compartido) / real > similitudMaxima);
    });
    if (parecida) continue;

    elegidas.push({ nodes: candidata.nodes, distance: real });
    tramosElegidos.push(tramos);
  }

  return elegidas;
}
