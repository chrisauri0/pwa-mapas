
import { Injectable, computed, inject, signal } from '@angular/core';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import { AuthService } from './auth.service';

export type TipoAviso = 'cerrado' | 'mantenimiento' | 'evento' | 'aviso';

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

@Injectable({ providedIn: 'root' })
export class AvisosService {
  private readonly auth = inject(AuthService);

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

    const q = query(collection(db, 'avisos'), where('expiraEn', '>', Timestamp.now()));

    this.unsub = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snap) => {
        const lista: Aviso[] = snap.docs.map((d) => {
          // 'estimate' da una fecha local mientras el servidor confirma la real
          const x = d.data({ serverTimestamps: 'estimate' });
          return {
            id: d.id,
            edificioId: x['edificioId'],
            edificioNombre: x['edificioNombre'],
            tipo: x['tipo'],
            texto: x['texto'],
            autorUid: x['autorUid'],
            autorNombre: x['autorNombre'],
            creadoEn: (x['creadoEn'] as Timestamp | null)?.toDate() ?? null,
            expiraEn: (x['expiraEn'] as Timestamp).toDate(),
            pendiente: d.metadata.hasPendingWrites,
          };
        });
        this.avisos.set(lista);
        this.sincronizado.set(!snap.metadata.fromCache);
        console.log(`📋 ${lista.length} avisos (${snap.metadata.fromCache ? 'caché' : 'servidor'})`);
      },
      (e) => {
        console.error('❌ Error al escuchar avisos:', e);
        this.error.set('No se pudieron cargar los avisos.');
      },
    );
  }

  /**
   * Publica sin esperar al servidor: el aviso aparece al instante en la app
   * (como "pendiente" si no hay internet) y Firestore lo sube cuando puede.
   */
  publicar(edificioId: string, edificioNombre: string, tipo: TipoAviso, texto: string, horas: number): void {
    const perfil = this.auth.perfil();
    if (!perfil) throw new Error('Inicia sesión para publicar avisos.');

    this.error.set(null);
    const ref = doc(collection(db, 'avisos'));

    setDoc(ref, {
      edificioId,
      edificioNombre,
      tipo,
      texto: texto.trim().slice(0, 280),
      autorUid: perfil.uid,
      autorNombre: perfil.nombre,
      creadoEn: serverTimestamp(),
      expiraEn: Timestamp.fromMillis(Date.now() + horas * 3_600_000),
    })
      .then(() => console.log('☁️ Aviso sincronizado:', ref.id))
      .catch((e) => {
        console.error('❌ Aviso rechazado:', e);
        this.error.set('El servidor rechazó el aviso.');
      });
  }

  eliminar(id: string): void {
    deleteDoc(doc(db, 'avisos', id)).catch((e) => {
      console.error('❌ No se pudo eliminar:', e);
      this.error.set('No se pudo eliminar el aviso.');
    });
  }
}
