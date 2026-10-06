
import { registerPlugin } from '@capacitor/core';

export interface WidgetBridgePlugin {
  guardarRecorrido(opciones: {
    destino: string;
    pasos: number;
    distancia: number;
    simulado: boolean;
  }): Promise<{ widgetsActualizados: number }>;
}

// El nombre debe coincidir con @CapacitorPlugin(name = "WidgetBridge") del lado nativo
export const WidgetBridge = registerPlugin<WidgetBridgePlugin>('WidgetBridge');
