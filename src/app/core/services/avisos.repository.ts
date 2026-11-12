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
  type Firestore,
} from 'firebase/firestore';
import type { Aviso, AvisosRepositorio, NuevoAviso, PublicacionAviso } from './avisos.logic';

/**
 * Repositorio real de avisos sobre Firestore.
 * Recibe `db` por constructor para poder apuntarlo al emulador en las pruebas.
 */
export class FirestoreAvisosRepo implements AvisosRepositorio {
  private readonly db: Firestore;

  constructor(db: Firestore) {
    this.db = db;
  }

  /** Devuelve el id al instante; `confirmado` resuelve cuando el servidor acepta. */
  guardar(aviso: NuevoAviso): PublicacionAviso {
    const ref = doc(collection(this.db, 'avisos'));

    const confirmado = setDoc(ref, {
      edificioId: aviso.edificioId,
      edificioNombre: aviso.edificioNombre,
      tipo: aviso.tipo,
      texto: aviso.texto,
      autorUid: aviso.autorUid,
      autorNombre: aviso.autorNombre,
      creadoEn: serverTimestamp(),
      expiraEn: Timestamp.fromMillis(aviso.expiraEnMs),
    });

    return { id: ref.id, confirmado };
  }

  eliminar(id: string): Promise<void> {
    return deleteDoc(doc(this.db, 'avisos', id));
  }

  /** Escucha en tiempo real los avisos que aún no vencen. Devuelve la función para cancelar. */
  escuchar(
    onData: (avisos: Aviso[], desdeCache: boolean) => void,
    onError: (e: unknown) => void,
  ): () => void {
    const q = query(collection(this.db, 'avisos'), where('expiraEn', '>', Timestamp.now()));

    return onSnapshot(
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
        onData(lista, snap.metadata.fromCache);
      },
      onError,
    );
  }
}
