import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { JsonPipe } from '@angular/common';
import { timeout } from 'rxjs';

/** Forma de la respuesta del backend de datos. */
export interface DatosConsulta {
  nombre: string;
  carrera: string;
  mensaje: string;
  imagen?: string;
}

@Component({
  selector: 'app-consulta-web',
  imports: [JsonPipe],
  templateUrl: './consulta-web.html',
  styleUrl: './consulta-web.scss',
})
export class ConsultaWebComponent {
  private http = inject(HttpClient);
  readonly URL = 'https://raw.githubusercontent.com/chrisauri0/mapas-backend/refs/heads/main/datos-backend.json'
  cargando = signal(false);
  datos = signal<DatosConsulta | null>(null);
  error = signal('');
imagenFallo= false ;
  consultar() {

    this.imagenFallo = false;
    this.cargando.set(true); this.error.set(''); this.datos.set(null);
    this.http.get<DatosConsulta>(this.URL).pipe(timeout(8000)).subscribe({
      next: r => { this.datos.set(r); this.cargando.set(false); },
      error: () => { this.error.set('No fue posible obtener la información.'); this.cargando.set(false); }
    });
  }
}
