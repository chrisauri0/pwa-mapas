// Lógica pura de la vista 3D (sin MapLibre ni Angular): alturas, GeoJSON y rumbo de la cámara.
// Se puede probar con unitarias sin montar el mapa.

import { type Punto, diferenciaAngular } from './recorrido.logic';

export const ALTURA_PISO_M = 3.5;
export const ALTURA_PREDETERMINADA_M = 7; // 2 pisos
export const AREA_EDIFICIO_CHICO_M2 = 400; // por debajo de esto se asume de 1 piso

export type Posicion = [number, number]; // [lng, lat], el orden de GeoJSON

export interface EdificioEntrada {
  id: string;
  nombre: string;
  contorno: readonly Posicion[];
  niveles?: number;
  uso?: 'servicio';
}

export interface EdificioProps {
  id: string;
  nombre: string;
  /** Nodo del grafo que se usa como destino al tocar el edificio. */
  nodoId: string | null;
  altura: number;
  uso: 'aula' | 'servicio';
}

export interface FeatureEdificio {
  type: 'Feature';
  properties: EdificioProps;
  geometry: { type: 'Polygon'; coordinates: Posicion[][] };
}

export interface ColeccionEdificios {
  type: 'FeatureCollection';
  features: FeatureEdificio[];
}

export interface FeatureLinea {
  type: 'Feature';
  properties: Record<string, never>;
  geometry: { type: 'LineString'; coordinates: Posicion[] };
}

export interface ColeccionLineas {
  type: 'FeatureCollection';
  features: FeatureLinea[];
}

export interface NodoPlano {
  id: string;
  lat: number;
  lng: number;
}

export type TipoArea = 'pista' | 'futbol' | 'basquet';

export interface AreaEntrada {
  id: string;
  nombre: string;
  tipo: TipoArea;
  contorno: readonly Posicion[];
}

export interface FeatureArea {
  type: 'Feature';
  properties: { id: string; nombre: string; tipo: TipoArea; nodoId: string | null };
  geometry: { type: 'Polygon'; coordinates: Posicion[][] };
}

export interface ColeccionAreas {
  type: 'FeatureCollection';
  features: FeatureArea[];
}

const RADIO_TIERRA_M = 6_371_000;
const aRad = (g: number): number => (g * Math.PI) / 180;

/** Área aproximada (m²) de un contorno [lng, lat]. Aproximación plana, de sobra para un edificio. */
export function areaM2(contorno: readonly Posicion[]): number {
  if (contorno.length < 4) return 0;
  const cosLat = Math.cos(aRad(contorno[0][1]));
  const mPorGrado = (Math.PI / 180) * RADIO_TIERRA_M;
  let suma = 0;
  for (let i = 0; i < contorno.length - 1; i++) {
    const x1 = contorno[i][0] * mPorGrado * cosLat;
    const y1 = contorno[i][1] * mPorGrado;
    const x2 = contorno[i + 1][0] * mPorGrado * cosLat;
    const y2 = contorno[i + 1][1] * mPorGrado;
    suma += x1 * y2 - x2 * y1;
  }
  return Math.abs(suma / 2);
}

/**
 * Altura en metros: la fijada a mano > pisos × 3.5 > 3.5 si es chico > 7.
 * (Un valor fijado a mano que no sea un número positivo se ignora.)
 */
export function alturaEdificio(
  e: Pick<EdificioEntrada, 'id' | 'niveles' | 'contorno'>,
  alturas: Readonly<Record<string, number>> = {},
): number {
  const fija = alturas[e.id];
  if (typeof fija === 'number' && Number.isFinite(fija) && fija > 0) return fija;
  if (e.niveles && e.niveles > 0) return e.niveles * ALTURA_PISO_M;
  if (areaM2(e.contorno) < AREA_EDIFICIO_CHICO_M2) return ALTURA_PISO_M;
  return ALTURA_PREDETERMINADA_M;
}

export function construirEdificios(
  edificios: readonly EdificioEntrada[],
  nodoDe: Readonly<Record<string, string | null>> = {},
  alturas: Readonly<Record<string, number>> = {},
): ColeccionEdificios {
  return {
    type: 'FeatureCollection',
    features: edificios.map((e) => ({
      type: 'Feature',
      properties: {
        id: e.id,
        nombre: e.nombre,
        nodoId: nodoDe[e.id] ?? null,
        altura: alturaEdificio(e, alturas),
        uso: e.uso === 'servicio' ? 'servicio' : 'aula',
      },
      geometry: { type: 'Polygon', coordinates: [e.contorno.map((p): Posicion => [p[0], p[1]])] },
    })),
  };
}

/** Canchas y pista como polígonos planos (sin altura). */
export function construirAreas(
  areas: readonly AreaEntrada[],
  nodoDe: Readonly<Record<string, string | null>> = {},
): ColeccionAreas {
  return {
    type: 'FeatureCollection',
    features: areas.map((a) => ({
      type: 'Feature',
      properties: { id: a.id, nombre: a.nombre, tipo: a.tipo, nodoId: nodoDe[a.id] ?? null },
      geometry: { type: 'Polygon', coordinates: [a.contorno.map((p): Posicion => [p[0], p[1]])] },
    })),
  };
}

/** La ruta como línea GeoJSON. Con menos de 2 puntos queda vacía (así se "borra" del mapa). */
export function rutaGeoJSON(puntos: readonly Punto[]): ColeccionLineas {
  if (puntos.length < 2) return { type: 'FeatureCollection', features: [] };
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: puntos.map((p): Posicion => [p.lng, p.lat]) },
      },
    ],
  };
}

/** Varias rutas a la vez (las alternativas): una línea por ruta; las de menos de 2 puntos se omiten. */
export function rutasGeoJSON(rutas: readonly (readonly Punto[])[]): ColeccionLineas {
  return {
    type: 'FeatureCollection',
    features: rutas.flatMap((r) => rutaGeoJSON(r).features),
  };
}

/** Todas las aristas del grafo como líneas sueltas; las que apuntan a un nodo que no existe se omiten. */
export function caminosGeoJSON(
  nodos: readonly NodoPlano[],
  aristas: readonly { from: string; to: string }[],
): ColeccionLineas {
  const porId = new Map(nodos.map((n) => [n.id, n]));
  const features: FeatureLinea[] = [];
  for (const a of aristas) {
    const desde = porId.get(a.from);
    const hasta = porId.get(a.to);
    if (!desde || !hasta) continue;
    features.push({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [
          [desde.lng, desde.lat],
          [hasta.lng, hasta.lat],
        ],
      },
    });
  }
  return { type: 'FeatureCollection', features };
}

/** Rectángulo [[oeste, sur], [este, norte]] que contiene los puntos, o null si no hay. */
export function limitesDePuntos(puntos: readonly Punto[]): [Posicion, Posicion] | null {
  if (puntos.length === 0) return null;
  let oeste = Infinity;
  let sur = Infinity;
  let este = -Infinity;
  let norte = -Infinity;
  for (const p of puntos) {
    oeste = Math.min(oeste, p.lng);
    este = Math.max(este, p.lng);
    sur = Math.min(sur, p.lat);
    norte = Math.max(norte, p.lat);
  }
  return [
    [oeste, sur],
    [este, norte],
  ];
}

/** Centro [lng, lat] del rectángulo que contiene a todos los edificios. */
export function centroDeEdificios(edificios: readonly EdificioEntrada[]): Posicion | null {
  const puntos = edificios.flatMap((e) => e.contorno.map((p): Punto => ({ lng: p[0], lat: p[1] })));
  const lim = limitesDePuntos(puntos);
  if (!lim) return null;
  return [(lim[0][0] + lim[1][0]) / 2, (lim[0][1] + lim[1][1]) / 2];
}

// ── Etiquetas con el nombre de cada edificio ───────────────

export interface EtiquetaEdificio {
  id: string;
  texto: string;
  lng: number;
  lat: number;
  /** Nodo del grafo al que lleva tocar la etiqueta (null = solo informativa). */
  nodoId: string | null;
}

/** Promedio de los vértices del contorno (sin contar el punto que cierra el polígono). */
export function centroDeContorno(contorno: readonly Posicion[]): Posicion {
  if (contorno.length === 0) return [0, 0];
  const cerrado =
    contorno.length > 1 &&
    contorno[0][0] === contorno[contorno.length - 1][0] &&
    contorno[0][1] === contorno[contorno.length - 1][1];
  const puntos = cerrado ? contorno.slice(0, -1) : contorno;
  const lng = puntos.reduce((suma, p) => suma + p[0], 0) / puntos.length;
  const lat = puntos.reduce((suma, p) => suma + p[1], 0) / puntos.length;
  return [lng, lat];
}

export function construirEtiquetas(
  edificios: readonly EdificioEntrada[],
  nodoDe: Readonly<Record<string, string | null>> = {},
  textoDe: Readonly<Record<string, string>> = {},
): EtiquetaEdificio[] {
  return edificios.map((e) => {
    const [lng, lat] = centroDeContorno(e.contorno);
    return { id: e.id, texto: textoDe[e.id] ?? e.nombre, lng, lat, nodoId: nodoDe[e.id] ?? null };
  });
}

/** normal: se ve con los demás · destino: es el elegido (resaltado) · oculta: hay otro elegido. */
export type EstadoEtiqueta = 'normal' | 'destino' | 'oculta';

export function estadoEtiqueta(etiqueta: EtiquetaEdificio, destinoId: string): EstadoEtiqueta {
  if (!destinoId) return 'normal';
  return etiqueta.nodoId === destinoId ? 'destino' : 'oculta';
}

/** ¿El destino elegido es un edificio con etiqueta? Si no, hay que mostrar su nombre aparte. */
export function destinoTieneEtiqueta(
  etiquetas: readonly EtiquetaEdificio[],
  destinoId: string,
): boolean {
  return destinoId !== '' && etiquetas.some((e) => e.nodoId === destinoId);
}

// ── Rumbo de la cámara ─────────────────────────────────────

/** brujula: el mapa gira hacia donde apunta el teléfono · ruta: hacia el siguiente punto · norte: fijo. */
export type ModoRumbo = 'brujula' | 'ruta' | 'norte';

const ORDEN_MODOS: readonly ModoRumbo[] = ['brujula', 'ruta', 'norte'];

export function siguienteModo(actual: ModoRumbo): ModoRumbo {
  return ORDEN_MODOS[(ORDEN_MODOS.indexOf(actual) + 1) % ORDEN_MODOS.length];
}

/**
 * Hacia dónde debe quedar "arriba" en la pantalla. null = no hay dato, la cámara no gira.
 * Sin lectura de brújula se vuelve a norte arriba.
 */
export function rumboDeseado(
  modo: ModoRumbo,
  brujula: number | null,
  siguiente: number | null,
): number | null {
  switch (modo) {
    case 'norte':
      return 0;
    case 'brujula':
      return brujula ?? 0;
    case 'ruta':
      return siguiente;
  }
}

/** ¿Vale la pena girar la cámara? Evita el temblor de la brújula (zona muerta en grados). */
export function cambioSuficiente(actual: number, nuevo: number, zonaMuerta: number): boolean {
  return Math.abs(diferenciaAngular(actual, nuevo)) >= zonaMuerta;
}
