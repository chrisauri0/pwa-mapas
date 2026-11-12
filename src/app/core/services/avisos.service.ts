import { Injectable, computed, inject, signal } from '@angular/core';
import { db } from '../firebase';
import { AuthService } from './auth.service';
import {
  AvisoInvalidoError,
  publicarAviso,
  type Aviso,
  type TipoAviso,
} from './avisos.logic';
import { FirestoreAvisosRepo } from './avisos.repository';

// Se re-exportan para que el resto de la app siga importando desde este archivo
export type { Aviso, TipoAviso } from './avisos.logic';

// En orden de severidad: el primero es el que se muestra en el mapa
export const TIPOS_AVISO: { id: TipoAviso; icono: string; etiqueta: string }[] = [
  { id: 'cerrado', icono: '⛔', etiqueta: 'Cerrado' },
  { id: 'mantenimiento', icono: '🛠️', etiqueta: 'Mantenimiento' },
  { id: 'evento', icono: '🎉', etiqueta: 'Evento' },
  { id: 'aviso', icono: '💬', etiqueta: 'Aviso' },
];

export const DURACIONES = [
  { etiqueta: '1 hora', horas: 1 },
  { etiqueta: 'Hoy (8 h)', horas: 8 },
  { etiqueta: '1 día', horas: 24 },
  { etiqueta: '3 días', horas: 72 },
  { etiqueta: '1 semana', horas: 168 },
];

export function infoTipo(tipo: TipoAviso) {
  return TIPOS_AVISO.find((t) => t.id === tipo) ?? TIPOS_AVISO[3];
}

@Injectable({ providedIn: 'root' })
export class AvisosService {
  private readonly auth = inject(AuthService);
  private readonly repo = new FirestoreAvisosRepo(db);

  private readonly avisos = signal<Aviso[]>([]);
  readonly ahora = signal(Date.now());
  readonly sincronizado = signal(true);
  readonly error = signal<string | null>(null);

  private unsub?: () => void;

  /** Solo los que no han vencido (se recalcula cada 30 s) */
  readonly vigentes = computed(() =>
    this.avisos().filter((a) => a.expiraEn.getTime() > this.ahora()),
  );

  /** Avisos agrupados por edificio, ordenados por severidad */
  readonly porEdificio = computed(() => {
    const orden = TIPOS_AVISO.map((t) => t.id);
    const mapa = new Map<string, Aviso[]>();
    for (const a of this.vigentes()) {
      const lista = mapa.get(a.edificioId) ?? [];
      lista.push(a);
      mapa.set(a.edificioId, lista);
    }
    mapa.forEach((lista) => lista.sort((a, b) => orden.indexOf(a.tipo) - orden.indexOf(b.tipo)));
    return mapa;
  });

  constructor() {
    setInterval(() => this.ahora.set(Date.now()), 30_000);
  }

  /** Escucha en tiempo real. Llamarla varias veces no duplica la suscripción. */
  escuchar(): void {
    if (this.unsub) return;

    this.unsub = this.repo.escuchar(
      (lista, desdeCache) => {
        this.avisos.set(lista);
        this.sincronizado.set(!desdeCache);
        console.log(`${desdeCache ? '🟡' : '🟢'} ${lista.length} avisos (${desdeCache ? 'caché' : 'servidor'})`);
      },
      (e) => {
        console.error('🔴 Error al escuchar avisos:', e);
        this.error.set('No se pudieron cargar los avisos.');
      },
    );
  }

  /**
   * Publica sin esperar al servidor: el aviso aparece al instante en la app
   * (como "pendiente" si no hay internet) y Firestore lo sube cuando puede.
   * Sin sesión lanza error (igual que antes); si los datos no son válidos
   * deja el mensaje en `error` y no manda nada al servidor.
   */
  publicar(edificioId: string, edificioNombre: string, tipo: TipoAviso, texto: string, horas: number): void {
    this.error.set(null);

    try {
      const { id, confirmado } = publicarAviso(
        this.repo,
        this.auth.perfil(),
        { edificioId, edificioNombre, tipo, texto, horas },
        Date.now(),
      );

      confirmado
        .then(() => console.log('🟢 Aviso sincronizado:', id))
        .catch((e) => {
          console.error('🔴 Aviso rechazado:', e);
          this.error.set('El servidor rechazó el aviso.');
        });
    } catch (e) {
      if (e instanceof AvisoInvalidoError) {
        console.warn('🟡 Aviso inválido, no se envió:', e.errores);
        this.error.set(e.message);
        return;
      }
      throw e; // sin sesión: se comporta como antes
    }
  }

  eliminar(id: string): void {
    this.repo.eliminar(id).catch((e) => {
      console.error('🔴 No se pudo eliminar:', e);
      this.error.set('No se pudo eliminar el aviso.');
    });
  }
}
