
import { Injectable, computed, signal } from '@angular/core';
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../firebase';

// Pon aquí el dominio del correo de alumnos (ej. '@uteq.edu.mx') para restringir
// el registro. Vacío = cualquier correo (más fácil para probar).
export const DOMINIO_INSTITUCIONAL = '';

export interface Perfil {
  uid: string;
  email: string;
  nombre: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly perfil = signal<Perfil | null>(null);
  readonly cargando = signal(true);
  readonly logueado = computed(() => this.perfil() !== null);

  constructor() {
    onAuthStateChanged(auth, (u) => {
      console.log('👤 Sesión:', u?.email ?? 'sin sesión');
      this.perfil.set(u ? this.aPerfil(u) : null);
      this.cargando.set(false);
    });
  }

  async registrar(nombre: string, email: string, password: string): Promise<void> {
    const correo = email.trim().toLowerCase();
    if (DOMINIO_INSTITUCIONAL && !correo.endsWith(DOMINIO_INSTITUCIONAL)) {
      throw { code: 'app/dominio' };
    }
    const cred = await createUserWithEmailAndPassword(auth, correo, password);
    await updateProfile(cred.user, { displayName: nombre.trim() });
    // updateProfile no dispara onAuthStateChanged, así que actualizamos a mano
    this.perfil.set({ uid: cred.user.uid, email: correo, nombre: nombre.trim() });
  }

  async entrar(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  }

  async salir(): Promise<void> {
    await signOut(auth);
  }

  mensajeError(e: unknown): string {
    const code = (e as { code?: string })?.code ?? '';
    const mensajes: Record<string, string> = {
      'app/dominio': `Usa tu correo institucional (${DOMINIO_INSTITUCIONAL}).`,
      'auth/invalid-credential': 'Correo o contraseña incorrectos.',
      'auth/invalid-email': 'El correo no es válido.',
      'auth/email-already-in-use': 'Ya existe una cuenta con ese correo.',
      'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
      'auth/network-request-failed': 'Sin conexión. Revisa tu internet.',
      'auth/too-many-requests': 'Demasiados intentos. Espera un momento.',
    };
    return mensajes[code] ?? 'Ocurrió un error. Intenta de nuevo.';
  }

  private aPerfil(u: User): Perfil {
    const email = u.email ?? '';
    return { uid: u.uid, email, nombre: u.displayName || email.split('@')[0] || 'Alumno' };
  }
}
