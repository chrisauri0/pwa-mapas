import { Injectable, NgZone, inject, signal } from '@angular/core';
import { rumboDesdeAlpha, suavizarRumbo } from './recorrido.logic';

/** iOS (Safari/WKWebView) entrega el rumbo ya calculado en esta propiedad. */
type EventoOrientacion = DeviceOrientationEvent & { webkitCompassHeading?: number };

const SEGUNDOS_SIN_DATOS = 2500;
const CAMBIO_MINIMO_GRADOS = 1.5; // evita redibujar por temblores del sensor

/**
 * Brújula basada en los sensores del teléfono (DeviceOrientation del WebView).
 * No necesita plugin ni permisos en Android. Funciona mejor con el teléfono horizontal.
 */
@Injectable({ providedIn: 'root' })
export class BrujulaService {
  private readonly zone = inject(NgZone);

  /** Rumbo en grados (0° = norte) o null si todavía no hay lectura. */
  readonly rumbo = signal<number | null>(null);
  readonly activa = signal(false);
  /** false si pasó un rato sin recibir datos (el teléfono no tiene sensor o el WebView no lo da). */
  readonly disponible = signal(true);

  private temporizador?: ReturnType<typeof setTimeout>;
  private recibioDatos = false;
  private ultimo: number | null = null;
  private usaAbsoluto = false;

  private readonly alOrientar = (e: Event): void => this.procesar(e as EventoOrientacion);

  iniciar(): void {
    if (this.activa() || typeof window === 'undefined') return;

    this.activa.set(true);
    this.disponible.set(true);
    this.recibioDatos = false;
    this.ultimo = null;
    this.usaAbsoluto = false;

    // 'deviceorientationabsolute' da el rumbo respecto al norte magnético; es el evento correcto en Android.
    // 'deviceorientation' queda de respaldo (iOS y algunos WebView).
    window.addEventListener('deviceorientationabsolute', this.alOrientar, true);
    window.addEventListener('deviceorientation', this.alOrientar, true);

    this.temporizador = setTimeout(() => {
      if (!this.recibioDatos) this.zone.run(() => this.disponible.set(false));
    }, SEGUNDOS_SIN_DATOS);
  }

  detener(): void {
    if (!this.activa()) return;
    window.removeEventListener('deviceorientationabsolute', this.alOrientar, true);
    window.removeEventListener('deviceorientation', this.alOrientar, true);
    if (this.temporizador) clearTimeout(this.temporizador);
    this.temporizador = undefined;
    this.activa.set(false);
    this.rumbo.set(null);
    this.ultimo = null;
  }

  alternar(): void {
    if (this.activa()) this.detener();
    else this.iniciar();
  }

  private procesar(e: EventoOrientacion): void {
    let crudo: number | null = null;

    if (typeof e.webkitCompassHeading === 'number') {
      crudo = e.webkitCompassHeading;
    } else if (e.alpha !== null && e.alpha !== undefined) {
      // 'deviceorientation' normal casi siempre es relativo al arranque (no apunta al norte):
      // solo sirve si el sistema lo marca como absoluto. Si ya llegan los absolutos, este se ignora.
      if (e.type === 'deviceorientation' && (e.absolute !== true || this.usaAbsoluto)) return;
      if (e.type === 'deviceorientationabsolute') this.usaAbsoluto = true;
      const angulo = typeof screen !== 'undefined' ? (screen.orientation?.angle ?? 0) : 0;
      crudo = rumboDesdeAlpha(e.alpha, angulo);
    }

    if (crudo === null) return;

    this.recibioDatos = true;
    const suave = suavizarRumbo(this.ultimo, crudo, 0.2);

    if (this.ultimo !== null) {
      const salto = Math.abs(((suave - this.ultimo + 540) % 360) - 180);
      if (salto < CAMBIO_MINIMO_GRADOS) return;
    }

    this.ultimo = suave;
    this.rumbo.set(Math.round(suave));
    if (!this.disponible()) this.disponible.set(true);
  }
}
