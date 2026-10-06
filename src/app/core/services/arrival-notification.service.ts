
import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const CANAL_LLEGADAS = 'llegadas';

@Injectable({ providedIn: 'root' })
export class ArrivalNotificationService {
  private readonly esNativo = Capacitor.isNativePlatform();
  private listo = false;

  /** Pide permiso y crea el canal. Se puede llamar varias veces sin problema. */
  async preparar(): Promise<boolean> {
    if (!this.esNativo) return false;
    if (this.listo) return true;

    try {
      let status = await LocalNotifications.checkPermissions();
      console.log('🔍 Permiso de notificaciones:', status.display);

      if (status.display !== 'granted') {
        status = await LocalNotifications.requestPermissions();
        console.log('🙋 Resultado de la solicitud:', status.display);
      }

      if (status.display !== 'granted') {
        console.warn('🔕 Sin permiso de notificaciones');
        return false;
      }

      // Canal propio: importancia alta (aparece flotando) y con vibración.
      // OJO: Android no deja cambiar un canal ya creado. Si cambias algo aquí,
      // desinstala la app o usa otro id de canal.
      await LocalNotifications.createChannel({
        id: CANAL_LLEGADAS,
        name: 'Llegadas a destino',
        description: 'Avisos cuando llegas al edificio que buscaste',
        importance: 4, // HIGH: notificación flotante (heads-up)
        visibility: 1, // PUBLIC: visible en la pantalla de bloqueo
        vibration: true,
      });

      this.listo = true;
      console.log('🔔 Notificaciones listas');
      return true;
    } catch (e) {
      console.error('❌ Error al preparar notificaciones:', e);
      return false;
    }
  }

  async notificarLlegada(destino: string, pasos: number, simulado: boolean): Promise<void> {
    if (!(await this.preparar())) return;

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor(Date.now() % 2_000_000_000), // debe ser un entero de 32 bits
            title: '🎉 ¡Llegaste!',
            body: `Estás en ${destino}. ${pasos} pasos${simulado ? ' (estimados)' : ''}.`,
            channelId: CANAL_LLEGADAS,
          },
        ],
      });
      console.log('🔔 Notificación de llegada enviada');
    } catch (e) {
      console.error('❌ Error al enviar la notificación:', e);
    }
  }
}
