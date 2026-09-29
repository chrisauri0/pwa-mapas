import { Injectable, computed, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Geolocation, Position } from '@capacitor/geolocation';

export type EstadoPermiso =
  | 'desconocido'
  | 'granted'
  | 'denied'
  | 'prompt'
  | 'prompt-with-rationale';

@Injectable({ providedIn: 'root' })
export class LocationService {
  readonly esNativo = Capacitor.isNativePlatform();
  readonly plataforma = Capacitor.getPlatform();

  readonly permiso = signal<EstadoPermiso>('desconocido');
  readonly posicion = signal<Position | null>(null);
  readonly error = signal<string | null>(null);
  readonly cargando = signal(false);

  readonly tienePermiso = computed(() => this.permiso() === 'granted');

  async revisarPermiso(): Promise<void> {
    try {
      const status = await Geolocation.checkPermissions();
      this.permiso.set(status.location);
      console.log('🔍 Permiso actual:', status);
    } catch (e) {
      this.manejarError(e);
    }
  }

  async pedirPermiso(): Promise<void> {
    this.error.set(null);

    // En web, requestPermissions no está implementado:
    // el navegador pregunta solo al pedir la posición.
    if (!this.esNativo) {
      await this.obtenerUbicacion();
      return;
    }

    try {
      console.log('🙋 Pidiendo permiso nativo...');
      const status = await Geolocation.requestPermissions({
        permissions: ['location'],
      });
      this.permiso.set(status.location);
      console.log('✅ Resultado del permiso:', status);
    } catch (e) {
      this.manejarError(e);
    }
  }

  async obtenerUbicacion(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      console.log('📡 Obteniendo ubicación...');
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
      this.posicion.set(pos);
      console.log('📍 Ubicación:', pos.coords);
      await this.revisarPermiso();
    } catch (e) {
      this.manejarError(e);
    } finally {
      this.cargando.set(false);
    }
  }

  private manejarError(e: unknown): void {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('❌ Error de ubicación:', msg);
    this.error.set(msg);
  }
}
