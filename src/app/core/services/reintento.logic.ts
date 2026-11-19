// Reintento controlado con espera progresiva (exponential backoff) y jitter.
// Lógica pura: no usa Angular ni temporizadores globales, así se prueba sin esperar.

export interface OpcionesReintento {
  /** Intentos en total, contando el primero. */
  maxIntentos: number;
  /** Espera antes del segundo intento, en ms. Se duplica en cada fallo. */
  baseMs: number;
  /** Tope de la espera, en ms. */
  maxEsperaMs: number;
  /** Fracción aleatoria de la espera que se resta (0 = sin jitter, 0.2 = hasta 20 %). */
  jitter?: number;
  /** Devuelve false para errores que no tiene sentido reintentar (permisos, datos inválidos). */
  esReintentable?: (error: unknown) => boolean;
  /** Se llama antes de cada espera; sirve para registrar o mostrar "reintentando…". */
  alReintentar?: (intento: number, esperaMs: number, error: unknown) => void;
  /** Reemplazos para pruebas. */
  dormir?: (ms: number) => Promise<void>;
  aleatorio?: () => number;
}

/** Espera antes del intento número `intento` (1 = tras el primer fallo): base × 2^(intento-1), con tope. */
export function calcularEsperaMs(
  intento: number,
  baseMs: number,
  maxEsperaMs: number,
  jitter = 0,
  aleatorio: () => number = Math.random,
): number {
  const exponencial = Math.min(maxEsperaMs, baseMs * 2 ** (intento - 1));
  return Math.round(exponencial * (1 - jitter * aleatorio()));
}

/** Códigos que indican un fallo pasajero: sin red, límite de uso, caída o tiempo agotado del servidor. */
export function esErrorPasajero(error: unknown): boolean {
  const e = error as { code?: string; status?: number } | null;
  const code = e?.code ?? '';
  const status = e?.status ?? 0;
  if (['unavailable', 'deadline-exceeded', 'resource-exhausted', 'aborted', 'internal'].includes(code)) return true;
  if (status === 408 || status === 429 || status >= 500) return true;
  return false; // permission-denied, invalid-argument, 400, 401, 403, etc. no se arreglan reintentando
}

/**
 * Mensaje para el usuario según el tipo de fallo. `accion` es lo que intentaba hacer
 * ("cargar los avisos", "publicar el aviso"). Nunca muestra códigos técnicos.
 */
export function mensajeDeError(error: unknown, accion: string): string {
  const e = error as { code?: string; status?: number; name?: string } | null;
  const code = e?.code ?? '';
  const status = e?.status ?? 0;

  if (code === 'resource-exhausted' || status === 429) {
    return `El servicio está saturado y no se pudo ${accion}. Se muestran los datos guardados; intenta de nuevo en unos minutos.`;
  }
  if (code === 'permission-denied' || status === 401 || status === 403) {
    return `No tienes permiso para ${accion}. Inicia sesión e inténtalo otra vez.`;
  }
  if (esErrorPasajero(error) || e?.name === 'TypeError' || e?.name === 'TimeoutError') {
    return `No hay conexión con el servidor y no se pudo ${accion}. Revisa tu internet.`;
  }
  return `No se pudo ${accion}.`;
}

const dormirReal = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * Ejecuta `operacion` y, si falla con un error reintentable, vuelve a intentar con espera progresiva.
 * Si se agotan los intentos lanza el último error. Para escrituras, `operacion` debe ser idempotente
 * (por ejemplo, escribir siempre en el mismo id de documento generado antes del primer intento).
 */
export async function conReintento<T>(operacion: (intento: number) => Promise<T>, o: OpcionesReintento): Promise<T> {
  const esReintentable = o.esReintentable ?? esErrorPasajero;
  const dormir = o.dormir ?? dormirReal;
  let ultimo: unknown;

  for (let intento = 1; intento <= o.maxIntentos; intento++) {
    try {
      return await operacion(intento);
    } catch (e) {
      ultimo = e;
      if (intento === o.maxIntentos || !esReintentable(e)) break;
      const espera = calcularEsperaMs(intento, o.baseMs, o.maxEsperaMs, o.jitter ?? 0, o.aleatorio);
      o.alReintentar?.(intento, espera, e);
      await dormir(espera);
    }
  }
  throw ultimo;
}
