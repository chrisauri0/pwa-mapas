// Lógica pura del recorrido (sin Leaflet ni Angular): avance sobre la ruta, rumbo y brújula.
// Se puede probar con unitarias sin montar el mapa.

export interface Punto {
  lat: number;
  lng: number;
}

export interface ProgresoRuta {
  /** Puntos que faltan por recorrer: primero tu posición proyectada sobre la ruta y luego los nodos que siguen. */
  restante: Punto[];
  distanciaRestanteM: number;
  distanciaRecorridaM: number;
  /** Qué tan lejos estás de la ruta, en metros. */
  desvioM: number;
  /** Índice del tramo (arista de la ruta) donde vas. */
  tramo: number;
  /** De 0 a 1. */
  fraccion: number;
}

const RADIO_TIERRA_M = 6_371_000;
const VELOCIDAD_CAMINATA_MS = 1.3; // ~4.7 km/h

const aRad = (g: number): number => (g * Math.PI) / 180;
const aGrados = (r: number): number => (r * 180) / Math.PI;

/** Distancia entre dos puntos en metros (haversine). */
export function distanciaM(a: Punto, b: Punto): number {
  const dLat = aRad(b.lat - a.lat);
  const dLng = aRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(aRad(a.lat)) * Math.cos(aRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * RADIO_TIERRA_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Lleva cualquier ángulo al rango [0, 360). */
export function normalizarGrados(g: number): number {
  return ((g % 360) + 360) % 360;
}

/** Diferencia más corta entre dos ángulos, en el rango [-180, 180]. Positivo = girar a la derecha. */
export function diferenciaAngular(desde: number, hasta: number): number {
  const d = normalizarGrados(hasta - desde);
  return d > 180 ? d - 360 : d;
}

/** Rumbo (0° = norte, 90° = este) para ir de `a` hacia `b`. */
export function rumboHacia(a: Punto, b: Punto): number {
  const dLng = aRad(b.lng - a.lng);
  const lat1 = aRad(a.lat);
  const lat2 = aRad(b.lat);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return normalizarGrados(aGrados(Math.atan2(y, x)));
}

/**
 * Suaviza el rumbo de la brújula (filtro de paso bajo) respetando el salto 359° → 0°.
 * `factor` va de 0 (no se mueve) a 1 (sin suavizado).
 */
export function suavizarRumbo(previo: number | null, nuevo: number, factor = 0.25): number {
  const n = normalizarGrados(nuevo);
  if (previo === null) return n;
  return normalizarGrados(previo + diferenciaAngular(previo, n) * factor);
}

/**
 * Convierte `alpha` de DeviceOrientation (giro antihorario respecto al norte) en rumbo de brújula.
 * `anguloPantalla` es la rotación de la pantalla (0 si va en vertical).
 */
export function rumboDesdeAlpha(alpha: number, anguloPantalla = 0): number {
  return normalizarGrados(360 - alpha + anguloPantalla);
}

const PUNTOS_CARDINALES = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'] as const;

/** Punto cardinal de un rumbo, en español: 0 → N, 45 → NE, 270 → O. */
export function textoCardinal(grados: number): string {
  return PUNTOS_CARDINALES[Math.round(normalizarGrados(grados) / 45) % 8];
}

/** Minutos que toma caminar la distancia dada, mínimo 1 si queda algo por recorrer. */
export function minutosEstimados(distanciaM: number, velocidadMs = VELOCIDAD_CAMINATA_MS): number {
  if (distanciaM <= 0) return 0;
  return Math.max(1, Math.round(distanciaM / velocidadMs / 60));
}

/** Largo total de una ruta en metros. */
export function largoRuta(ruta: readonly Punto[]): number {
  let total = 0;
  for (let i = 1; i < ruta.length; i++) total += distanciaM(ruta[i - 1], ruta[i]);
  return total;
}

/**
 * Proyecta tu posición sobre la ruta y devuelve lo que falta por recorrer.
 * Usa una aproximación plana local (válida en distancias de un campus).
 *
 * `desdeTramo` evita que la proyección "retroceda" a un tramo anterior si la ruta pasa
 * dos veces cerca del mismo lugar: solo se consideran los tramos desde ese índice.
 * Devuelve null si la ruta tiene menos de 2 puntos.
 */
export function progresoEnRuta(
  ruta: readonly Punto[],
  pos: Punto,
  desdeTramo = 0,
): ProgresoRuta | null {
  if (ruta.length < 2) return null;

  const cosLat = Math.cos(aRad(pos.lat));
  const mPorGrado = (Math.PI / 180) * RADIO_TIERRA_M;
  // Coordenadas locales en metros con tu posición como origen
  const aXY = (p: Punto): [number, number] => [
    (p.lng - pos.lng) * mPorGrado * cosLat,
    (p.lat - pos.lat) * mPorGrado,
  ];

  const ultimo = ruta.length - 2;
  const inicio = Math.min(Math.max(desdeTramo, 0), ultimo);

  let mejor = { tramo: inicio, t: 0, dist: Infinity };
  for (let i = inicio; i <= ultimo; i++) {
    const [ax, ay] = aXY(ruta[i]);
    const [bx, by] = aXY(ruta[i + 1]);
    const dx = bx - ax;
    const dy = by - ay;
    const largo2 = dx * dx + dy * dy;
    // Proyección del origen (tu posición) sobre el segmento AB, limitada a [0, 1]
    const t = largo2 === 0 ? 0 : Math.min(1, Math.max(0, -(ax * dx + ay * dy) / largo2));
    const px = ax + dx * t;
    const py = ay + dy * t;
    const dist = Math.hypot(px, py);
    if (dist < mejor.dist) mejor = { tramo: i, t, dist };
  }

  const a = ruta[mejor.tramo];
  const b = ruta[mejor.tramo + 1];
  const proyectado: Punto = {
    lat: a.lat + (b.lat - a.lat) * mejor.t,
    lng: a.lng + (b.lng - a.lng) * mejor.t,
  };

  const restante: Punto[] = [proyectado, ...ruta.slice(mejor.tramo + 1)];
  const distanciaRestanteM = largoRuta(restante);
  const total = largoRuta(ruta);
  const distanciaRecorridaM = Math.max(0, total - distanciaRestanteM);

  return {
    restante,
    distanciaRestanteM,
    distanciaRecorridaM,
    desvioM: mejor.dist,
    tramo: mejor.tramo,
    fraccion: total === 0 ? 1 : Math.min(1, distanciaRecorridaM / total),
  };
}
