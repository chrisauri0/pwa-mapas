
import { Injectable, computed, signal } from '@angular/core';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { CapacitorPedometer } from '@capgo/capacitor-pedometer';

const METROS_POR_PASO = 0.75; // aproximado para un adulto caminando

@Injectable({ providedIn: 'root' })
export class StepCounterService {
  readonly esNativo = Capacitor.isNativePlatform();

  readonly disponible = signal<boolean | null>(null);
  readonly permiso = signal<string>('desconocido');
  readonly pasos = signal(0);
  readonly midiendo = signal(false);
  readonly error = signal<string | null>(null);

  readonly distanciaEstimada = computed(() => Math.round(this.pasos() * METROS_POR_PASO));

  private listener?: PluginListenerHandle;

  async revisarDisponibilidad(): Promise<void> {
    if (!this.esNativo) {
      this.disponible.set(false);
      this.error.set('El podómetro solo funciona en la app nativa.');
      return;
    }
    try {
      const result = await CapacitorPedometer.isAvailable();
      console.log('👟 Disponibilidad del podómetro:', result);
      this.disponible.set(result.stepCounting);
    } catch (e) {
      this.manejarError(e);
    }
  }

  async pedirPermiso(): Promise<boolean> {
    try {
      let status = await CapacitorPedometer.checkPermissions();
      console.log('🔍 Permiso de actividad:', status);

      if (!this.estaConcedido(status)) {
        status = await CapacitorPedometer.requestPermissions();
        console.log('🙋 Resultado de la solicitud:', status);
      }

      const concedido = this.estaConcedido(status);
      this.permiso.set(concedido ? 'granted' : 'denied');
      return concedido;
    } catch (e) {
      this.manejarError(e);
      return false;
    }
  }

  async iniciar(): Promise<void> {
    this.error.set(null);
    if (this.midiendo()) return;

    if (!(await this.pedirPermiso())) {
      this.error.set('Sin permiso de actividad física. Actívalo en los ajustes de la app.');
      return;
    }

    try {
      this.pasos.set(0);
      this.listener = await CapacitorPedometer.addListener('measurement', (m) => {
        console.log('👟 Medición:', m);
        this.pasos.set(m.numberOfSteps ?? 0);
      });
      await CapacitorPedometer.startMeasurementUpdates();
      this.midiendo.set(true);
      console.log('▶️ Conteo de pasos iniciado');
    } catch (e) {
      this.manejarError(e);
    }
  }

  async detener(): Promise<void> {
    try {
      await CapacitorPedometer.stopMeasurementUpdates();
      await this.listener?.remove();
      this.listener = undefined;
      this.midiendo.set(false);
      console.log('⏹️ Conteo de pasos detenido');
    } catch (e) {
      this.manejarError(e);
    }
  }

  // El nombre exacto de la clave del permiso puede variar entre versiones del plugin,
  // así que revisamos si cualquier permiso del resultado quedó concedido.
  private estaConcedido(status: object): boolean {
    return Object.values(status).includes('granted');
  }

  private manejarError(e: unknown): void {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('❌ Error del podómetro:', msg);
    this.error.set(msg);
  }
}
