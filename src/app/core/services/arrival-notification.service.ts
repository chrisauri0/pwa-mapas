
import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const CANAL_LLEGADAS = 'llegadas';
const CANAL_RECORRIDO = 'recorrido';
const ID_RECORRIDO = 1001; // fija: así se actualiza o se cancela la misma notificación

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

      // Canal aparte para el recorrido en curso: importancia media (sin sonido molesto en cada actualización)
      await LocalNotifications.createChannel({
        id: CANAL_RECORRIDO,
        name: 'Recorrido en curso',
        description: 'Te recuerda que tienes un recorrido activo hacia un edificio',
        importance: 3, // DEFAULT
        visibility: 1,
        vibration: false,
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

  /** Notificación fija mientras dura el recorrido; se actualiza con la misma id y se quita al terminar. */
  async notificarInicio(destino: string, distanciaM: number, minutos: number): Promise<void> {
    if (!(await this.preparar())) return;

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: ID_RECORRIDO,
            title: '🧭 Recorrido iniciado',
            body: `Rumbo a ${destino} · ${Math.round(distanciaM)} m · unos ${minutos} min a pie.`,
            channelId: CANAL_RECORRIDO,
            ongoing: true, // no se puede deslizar para quitarla mientras caminas
            autoCancel: false,
          },
        ],
      });
      console.log('🔔 Notificación de recorrido iniciada');
    } catch (e) {
      console.error('❌ Error al notificar el inicio del recorrido:', e);
    }
  }

  /** Quita la notificación fija (al llegar, cancelar o salir de la pantalla). */
  async cancelarRecorrido(): Promise<void> {
    if (!this.esNativo) return;
    try {
      await LocalNotifications.cancel({ notifications: [{ id: ID_RECORRIDO }] });
    } catch (e) {
      console.warn('🔕 No se pudo quitar la notificación del recorrido:', e);
    }
  }
}
