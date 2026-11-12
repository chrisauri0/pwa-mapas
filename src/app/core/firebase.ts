import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, indexedDBLocalPersistence, initializeAuth } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyA-Jk3WEEmdSXwSNLiSRuU6IisUtcdb0CA',
  authDomain: 'prac9-db-sync.firebaseapp.com',
  projectId: 'prac9-db-sync',
  storageBucket: 'prac9-db-sync.firebasestorage.app',
  messagingSenderId: '141781807826',
  appId: '1:141781807826:web:909d8c48c3fa956553330b',
};

// Solo para pruebas E2E: Playwright activa esta bandera en localStorage para que
// la app hable con los emuladores locales y NUNCA con prac9-db-sync.
// En el celular / en producción la bandera no existe, así que no cambia nada.
const USAR_EMULADOR = (() => {
  try {
    return localStorage.getItem('USE_FIREBASE_EMULATOR') === '1';
  } catch {
    return false;
  }
})();

export const firebaseApp = initializeApp(
  USAR_EMULADOR
    ? { ...firebaseConfig, projectId: 'demo-avisos-test', apiKey: 'fake-api-key' }
    : firebaseConfig,
);

// initializeAuth en vez de getAuth: dentro del WebView de Capacitor,
// getAuth intenta cargar iframes de login que no necesitamos y puede quedarse colgado.
export const auth = initializeAuth(firebaseApp, {
  persistence: indexedDBLocalPersistence, // la sesión sobrevive al cerrar la app
});

// Caché persistente: los avisos se guardan en el cel y se pueden
// leer y publicar sin internet (se sincronizan al reconectar).
export const db = initializeFirestore(firebaseApp, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

if (USAR_EMULADOR) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  console.warn('🟡 Firebase apuntando a los EMULADORES (modo prueba)');
}
