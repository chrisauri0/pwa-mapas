import { Component, OnInit, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { LocationService } from '../../core/services/location.service';

@Component({
  selector: 'app-prueba-ubicacion',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <section class="prueba">
      <h2>Prueba de permiso de ubicación</h2>

      <p>Plataforma: <strong>{{ loc.plataforma }}</strong>
        ({{ loc.esNativo ? 'nativa' : 'web' }})</p>
      <p>Permiso: <strong>{{ loc.permiso() }}</strong></p>

      <div class="botones">
        <button (click)="loc.revisarPermiso()">Revisar permiso</button>
        <button (click)="loc.pedirPermiso()">Pedir permiso</button>
        <button (click)="loc.obtenerUbicacion()"
                [disabled]="loc.cargando() || (loc.esNativo && !loc.tienePermiso())">
          {{ loc.cargando() ? 'Buscando...' : 'Obtener ubicación' }}
        </button>
      </div>

      @if (loc.posicion(); as pos) {
        <div class="resultado">
          <p>Lat: {{ pos.coords.latitude | number: '1.6-6' }}</p>
          <p>Lng: {{ pos.coords.longitude | number: '1.6-6' }}</p>
          <p>Precisión: ±{{ pos.coords.accuracy | number: '1.0-0' }} m</p>
        </div>
      }

      @if (loc.permiso() === 'denied') {
        <p class="aviso">
          El permiso está denegado. Actívalo en Ajustes → Apps → Mapa UTEQ → Permisos.
        </p>
      }

      @if (loc.error(); as err) {
        <p class="error">{{ err }}</p>
      }
    </section>
  `,
  styles: [`
    .prueba { padding: 1rem; max-width: 480px; margin: auto; }
    .botones { display: flex; flex-direction: column; gap: .5rem; margin: 1rem 0; }
    button { padding: .75rem; border-radius: 8px; border: none; cursor: pointer; }
    button:disabled { opacity: .5; }
    .resultado { background: #eef6ee; padding: .75rem; border-radius: 8px; }
    .aviso { color: #a36b00; }
    .error { color: #c62828; }
  `],
})
export class PruebaUbicacionComponent implements OnInit {
  readonly loc = inject(LocationService);

  ngOnInit(): void {
    this.loc.revisarPermiso();
  }
}
