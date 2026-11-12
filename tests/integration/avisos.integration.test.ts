// Pruebas de INTEGRACIÓN: componentes reales de tu proyecto contra el emulador de
// Firebase (Auth + Firestore + reglas de seguridad). No se usan mocks.
//
// Se ejecutan con:  pnpm test:integration
// (levanta los emuladores, corre vitest y los apaga solos)
//
// Proyecto "demo-avisos-test": el prefijo demo- garantiza que NUNCA se toca
// prac9-db-sync ni la base real.

import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  type Auth,
} from 'firebase/auth';
import {
  Timestamp,
  collection,
  connectFirestoreEmulator,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Firestore,
} from 'firebase/firestore';
import { FirestoreAvisosRepo } from '../../src/app/core/services/avisos.repository';
import {
  AvisoInvalidoError,
  SesionRequeridaError,
  publicarAviso,
  type Aviso,
  type EntradaAviso,
} from '../../src/app/core/services/avisos.logic';

const PROJECT_ID = 'demo-avisos-test';
const FIRESTORE_HOST = '127.0.0.1';
const FIRESTORE_PORT = 8080;
const AUTH_URL = 'http://127.0.0.1:9099';
const DOS_HORAS = 2 * 3_600_000;

interface Cliente {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}
interface ClienteConSesion extends Cliente {
  uid: string;
}

const apps: FirebaseApp[] = [];
let contador = 0;

function crearCliente(): Cliente {
  const app = initializeApp(
    { projectId: PROJECT_ID, apiKey: 'fake-api-key', authDomain: `${PROJECT_ID}.firebaseapp.com` },
    `cliente-${++contador}`,
  );
  const auth = getAuth(app);
  connectAuthEmulator(auth, AUTH_URL, { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, FIRESTORE_HOST, FIRESTORE_PORT);
  apps.push(app);
  return { app, auth, db };
}

async function crearUsuario(alias: string): Promise<ClienteConSesion> {
  const cliente = crearCliente();
  const cred = await createUserWithEmailAndPassword(
    cliente.auth,
    `${alias}-${contador}@prueba.test`,
    'password-de-prueba',
  );
  return { ...cliente, uid: cred.user.uid };
}

/** Deja el emulador limpio entre pruebas (documentos y cuentas). */
async function limpiarEmulador(): Promise<void> {
  await fetch(
    `http://${FIRESTORE_HOST}:${FIRESTORE_PORT}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  await fetch(`${AUTH_URL}/emulator/v1/projects/${PROJECT_ID}/accounts`, { method: 'DELETE' });
}

const entrada = (extra: Partial<EntradaAviso> = {}): EntradaAviso => ({
  edificioId: 'edif-a',
  edificioNombre: 'Edificio A',
  tipo: 'cerrado',
  texto: '  Cerrado por mantenimiento eléctrico  ',
  horas: 2,
  ...extra,
});

/** Documento que cumple las reglas; se le pisan campos para probar rechazos. */
const payloadValido = (uid: string, extra: Record<string, unknown> = {}) => ({
  edificioId: 'edif-a',
  edificioNombre: 'Edificio A',
  tipo: 'cerrado',
  texto: 'Cerrado por mantenimiento eléctrico',
  autorUid: uid,
  autorNombre: 'Prueba',
  creadoEn: serverTimestamp(),
  expiraEn: Timestamp.fromMillis(Date.now() + DOS_HORAS),
  ...extra,
});

const permisoDenegado = { code: 'permission-denied' };

/** Escucha con el repositorio real hasta ver el aviso `id` (o falla por timeout). */
function esperarAviso(repo: FirestoreAvisosRepo, id: string, ms = 10_000): Promise<Aviso> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      unsub();
      reject(new Error(`Timeout esperando el aviso ${id}`));
    }, ms);

    const unsub = repo.escuchar(
      (lista) => {
        const encontrado = lista.find((a) => a.id === id);
        if (encontrado) {
          clearTimeout(timer);
          unsub();
          resolve(encontrado);
        }
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

let autor: ClienteConSesion;
let otro: ClienteConSesion;
let anonimo: Cliente;

beforeEach(async () => {
  await limpiarEmulador();
  autor = await crearUsuario('autor');
  otro = await crearUsuario('otro');
  anonimo = crearCliente(); // sin sesión
});

afterAll(async () => {
  await Promise.all(apps.map((a) => deleteApp(a)));
});

describe('Integración: repositorio + Firestore + reglas (flujo correcto)', () => {
  it('un usuario con sesión publica y cualquiera (sin sesión) puede leer el aviso guardado', async () => {
    const repo = new FirestoreAvisosRepo(autor.db);
    const ahora = Date.now();

    const { id, confirmado } = publicarAviso(repo, { uid: autor.uid, nombre: 'Autor' }, entrada(), ahora);
    await confirmado;

    const snap = await getDoc(doc(anonimo.db, 'avisos', id));
    expect(snap.exists()).toBe(true);

    const d = snap.data()!;
    expect(d['autorUid']).toBe(autor.uid);
    expect(d['tipo']).toBe('cerrado');
    expect(d['edificioId']).toBe('edif-a');
    expect(d['texto']).toBe('Cerrado por mantenimiento eléctrico'); // normalizado (sin espacios)
    expect((d['expiraEn'] as Timestamp).toMillis()).toBe(ahora + DOS_HORAS);
    expect(d['creadoEn']).toBeInstanceOf(Timestamp); // lo puso el servidor
  });

  it('la escucha en tiempo real recibe el aviso que publica otro usuario', async () => {
    const repoLector = new FirestoreAvisosRepo(anonimo.db);
    const repoAutor = new FirestoreAvisosRepo(autor.db);

    const id = publicarAviso(repoAutor, { uid: autor.uid, nombre: 'Autor' }, entrada(), Date.now()).id;
    const aviso = await esperarAviso(repoLector, id);

    expect(aviso.tipo).toBe('cerrado');
    expect(aviso.autorUid).toBe(autor.uid);
    expect(aviso.expiraEn).toBeInstanceOf(Date);
    expect(aviso.expiraEn.getTime()).toBeGreaterThan(Date.now());
  });

  it('el autor puede borrar su propio aviso', async () => {
    const repo = new FirestoreAvisosRepo(autor.db);
    const { id, confirmado } = publicarAviso(repo, { uid: autor.uid, nombre: 'Autor' }, entrada(), Date.now());
    await confirmado;

    await repo.eliminar(id);

    const snap = await getDoc(doc(anonimo.db, 'avisos', id));
    expect(snap.exists()).toBe(false);
  });
});

describe('Integración: reglas de seguridad (manejo de errores)', () => {
  it('sin sesión NO se puede crear un aviso', async () => {
    const ref = doc(collection(anonimo.db, 'avisos'));
    await expect(setDoc(ref, payloadValido('uid-falso'))).rejects.toMatchObject(permisoDenegado);
  });

  it('no se puede publicar a nombre de otro usuario (autorUid ajeno)', async () => {
    const ref = doc(collection(autor.db, 'avisos'));
    await expect(setDoc(ref, payloadValido(otro.uid))).rejects.toMatchObject(permisoDenegado);
  });

  it.each([
    ['texto de 281 caracteres', { texto: 'x'.repeat(281) }],
    ['texto vacío', { texto: '' }],
    ['tipo no permitido', { tipo: 'urgente' }],
    ['vigencia mayor a 8 días', { expiraEn: Timestamp.fromMillis(Date.now() + 9 * 24 * 3_600_000) }],
    ['expiración en el pasado', { expiraEn: Timestamp.fromMillis(Date.now() - 60_000) }],
    ['creadoEn manipulado por el cliente', { creadoEn: Timestamp.fromMillis(Date.now() - 86_400_000) }],
    ['campo extra no permitido', { esAdmin: true }],
  ])('el servidor rechaza escritura directa con %s', async (_caso, extra) => {
    const ref = doc(collection(autor.db, 'avisos'));
    await expect(setDoc(ref, payloadValido(autor.uid, extra))).rejects.toMatchObject(permisoDenegado);

    const snap = await getDoc(doc(anonimo.db, 'avisos', ref.id));
    expect(snap.exists()).toBe(false);
  });

  it('otro usuario NO puede borrar un aviso ajeno', async () => {
    const repoAutor = new FirestoreAvisosRepo(autor.db);
    const { id, confirmado } = publicarAviso(repoAutor, { uid: autor.uid, nombre: 'Autor' }, entrada(), Date.now());
    await confirmado;

    await expect(deleteDoc(doc(otro.db, 'avisos', id))).rejects.toMatchObject(permisoDenegado);

    const snap = await getDoc(doc(anonimo.db, 'avisos', id));
    expect(snap.exists()).toBe(true);
  });

  it('nadie puede editar un aviso (ni siquiera el autor)', async () => {
    const repoAutor = new FirestoreAvisosRepo(autor.db);
    const { id, confirmado } = publicarAviso(repoAutor, { uid: autor.uid, nombre: 'Autor' }, entrada(), Date.now());
    await confirmado;

    await expect(updateDoc(doc(autor.db, 'avisos', id), { texto: 'editado' })).rejects.toMatchObject(
      permisoDenegado,
    );

    const snap = await getDoc(doc(anonimo.db, 'avisos', id));
    expect(snap.data()!['texto']).toBe('Cerrado por mantenimiento eléctrico');
  });
});

describe('Integración: defensa en capas (validación local + servidor)', () => {
  it('un aviso inválido se frena en la validación y nunca llega a Firestore', async () => {
    const repo = new FirestoreAvisosRepo(autor.db);

    expect(() =>
      publicarAviso(repo, { uid: autor.uid, nombre: 'Autor' }, entrada({ texto: '' }), Date.now()),
    ).toThrow(AvisoInvalidoError);

    const snap = await getDocs(collection(anonimo.db, 'avisos'));
    expect(snap.empty).toBe(true);
  });

  it('sin perfil de sesión el caso de uso lanza error y no escribe nada', async () => {
    const repo = new FirestoreAvisosRepo(anonimo.db);

    expect(() => publicarAviso(repo, null, entrada(), Date.now())).toThrow(SesionRequeridaError);

    const snap = await getDocs(collection(anonimo.db, 'avisos'));
    expect(snap.empty).toBe(true);
  });
});
