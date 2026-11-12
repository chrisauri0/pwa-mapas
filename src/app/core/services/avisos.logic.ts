// Lógica de negocio de avisos: sin Firebase y sin Angular.
// Por eso se puede probar en unitarias con dobles de prueba, y en integración
// se le conecta el repositorio real (Firestore).

export type TipoAviso = 'cerrado' | 'mantenimiento' | 'evento' | 'aviso';

export const TIPOS_VALIDOS: readonly TipoAviso[] = ['cerrado', 'mantenimiento', 'evento', 'aviso'];

export const MAX_TEXTO = 280;
export const MIN_HORAS = 1;
export const MAX_HORAS = 168; // 1 semana (las reglas de Firestore aceptan hasta 8 días)
export const MS_POR_HORA = 3_600_000;

export interface Aviso {
  id: string;
  edificioId: string;
  edificioNombre: string;
  tipo: TipoAviso;
  texto: string;
  autorUid: string;
  autorNombre: string;
  creadoEn: Date | null;
  expiraEn: Date;
  pendiente: boolean; // true = aún no llega al servidor (offline)
}

export interface EntradaAviso {
  edificioId: string;
  edificioNombre: string;
  tipo: string;
  texto: string;
  horas: number;
}

export interface PerfilAutor {
  uid: string;
  nombre: string;
}

export interface NuevoAviso {
  edificioId: string;
  edificioNombre: string;
  tipo: TipoAviso;
  texto: string;
  autorUid: string;
  autorNombre: string;
  expiraEnMs: number;
}

export interface PublicacionAviso {
  id: string;
  /** Resuelve cuando el servidor confirma; rechaza si lo rechaza (reglas, red, etc.) */
  confirmado: Promise<void>;
}

/** Contrato que cumple el repositorio real (Firestore) y los dobles de prueba. */
export interface AvisosRepositorio {
  guardar(aviso: NuevoAviso): PublicacionAviso;
  eliminar(id: string): Promise<void>;
}

export interface ResultadoValidacion {
  ok: boolean;
  errores: string[];
}

export class SesionRequeridaError extends Error {
  constructor() {
    super('Inicia sesión para publicar avisos.');
    this.name = 'SesionRequeridaError';
  }
}

export class AvisoInvalidoError extends Error {
  readonly errores: string[];
  constructor(errores: string[]) {
    super(errores.join(' '));
    this.name = 'AvisoInvalidoError';
    this.errores = errores;
  }
}

/** Quita espacios de los extremos y recorta al máximo permitido. */
export function normalizarTexto(texto: string): string {
  return (texto ?? '').trim().slice(0, MAX_TEXTO);
}

/** Valida lo que captura el usuario ANTES de mandarlo a Firestore. */
export function validarAviso(entrada: EntradaAviso): ResultadoValidacion {
  const errores: string[] = [];

  if (!entrada.edificioId?.trim()) {
    errores.push('Falta el edificio.');
  }

  if (!TIPOS_VALIDOS.includes(entrada.tipo as TipoAviso)) {
    errores.push('Tipo de aviso no válido.');
  }

  const texto = (entrada.texto ?? '').trim();
  if (texto.length === 0) {
    errores.push('El texto no puede estar vacío.');
  } else if (texto.length > MAX_TEXTO) {
    errores.push(`El texto excede ${MAX_TEXTO} caracteres.`);
  }

  if (!Number.isFinite(entrada.horas) || entrada.horas < MIN_HORAS || entrada.horas > MAX_HORAS) {
    errores.push(`La duración debe estar entre ${MIN_HORAS} h y ${MAX_HORAS} h.`);
  }

  return { ok: errores.length === 0, errores };
}

/** Milisegundos (epoch) en que vence un aviso creado en `ahoraMs`. */
export function calcularExpiracion(ahoraMs: number, horas: number): number {
  return ahoraMs + horas * MS_POR_HORA;
}

/** Vigente solo si vence DESPUÉS de ahora (igual que la regla expiraEn > now). */
export function estaVigente(expiraEnMs: number, ahoraMs: number): boolean {
  return expiraEnMs > ahoraMs;
}

/**
 * Caso de uso "publicar aviso": sesión -> validación -> normalización ->
 * expiración -> repositorio. Lanza de forma síncrona si algo falla antes de
 * llegar al servidor.
 */
export function publicarAviso(
  repo: AvisosRepositorio,
  perfil: PerfilAutor | null | undefined,
  entrada: EntradaAviso,
  ahoraMs: number,
): PublicacionAviso {
  if (!perfil) throw new SesionRequeridaError();

  const validacion = validarAviso(entrada);
  if (!validacion.ok) throw new AvisoInvalidoError(validacion.errores);

  return repo.guardar({
    edificioId: entrada.edificioId,
    edificioNombre: entrada.edificioNombre,
    tipo: entrada.tipo as TipoAviso,
    texto: normalizarTexto(entrada.texto),
    autorUid: perfil.uid,
    autorNombre: perfil.nombre,
    expiraEnMs: calcularExpiracion(ahoraMs, entrada.horas),
  });
}
