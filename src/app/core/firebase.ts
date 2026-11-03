
import { initializeApp } from 'firebase/app';
import { indexedDBLocalPersistence, initializeAuth } from 'firebase/auth';
import {
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

export const firebaseApp = initializeApp(firebaseConfig);

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
