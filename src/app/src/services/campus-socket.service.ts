import { Injectable, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';

export interface CampusStats {
  usuariosActivos: number;
  picoUsuariosHoy: number;
  masBuscado: { nombre: string; count: number } | null;
  distanciaTotalHoyMetros: number;
  totalRutasHoy: number;
  ultimaRuta: {
    origenNombre: string;
    destinoNombre: string;
    timestamp: string;
  } | null;
}

@Injectable({ providedIn: 'root' })
export class CampusSocketService {
  private socket: Socket = io('http://localhost:3000');

 
readonly stats = signal<CampusStats>({
  usuariosActivos: 0,
  picoUsuariosHoy: 0,
  masBuscado: null,
  distanciaTotalHoyMetros: 0,
  totalRutasHoy: 0,
  ultimaRuta: null,
});


  constructor() {
    this.socket.on('stats:update', (data: CampusStats) => {
      this.stats.set(data);
    });
  }

  emitirRutaTrazada(destinoId: string, destinoNombre:  string, origenNombre: string, distancia: number): void {
    this.socket.emit('ruta:trazada', { destinoId, destinoNombre, origenNombre, distancia });
  }
}