import { Injectable, NgZone, inject } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

/** Devuelve true si "consumió" el atrás (ej. cerró un panel) */
type ManejadorAtras = () => boolean;

@Injectable({ providedIn: 'root' })
export class BackButtonService {
  private readonly zone = inject(NgZone);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  // Pila: el último componente que se registró tiene prioridad
  private manejadores: ManejadorAtras[] = [];
  private iniciado = false;

  iniciar(): void {
    if (!Capacitor.isNativePlatform() || this.iniciado) return;
    this.iniciado = true;

    void App.addListener('backButton', ({ canGoBack }) => {
      this.zone.run(() => this.manejar(canGoBack));
    });
    console.log('⬅️ Botón atrás configurado');
  }

  /** Registra un manejador y devuelve la función para quitarlo */
  registrar(fn: ManejadorAtras): () => void {
    this.manejadores.push(fn);
    return () => {
      this.manejadores = this.manejadores.filter((m) => m !== fn);
    };
  }

  private manejar(canGoBack: boolean): void {
    // 1. ¿Algún componente quiere cerrar algo primero?
    for (let i = this.manejadores.length - 1; i >= 0; i--) {
      if (this.manejadores[i]()) {
        console.log('⬅️ Atrás manejado por el componente');
        return;
      }
    }

    const enInicio = this.router.url === '/' || this.router.url === '';

    // 2. Si no estamos en el inicio, regresar de pantalla
    if (!enInicio) {
      if (canGoBack) {
        this.location.back();
      } else {
        void this.router.navigateByUrl('/');
      }
      return;
    }

    // 3. En el inicio: minimizar, como las apps nativas de Android
    console.log('⬅️ Minimizando la app');
    void App.minimizeApp();
  }
}
