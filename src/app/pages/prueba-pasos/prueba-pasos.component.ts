
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { StepCounterService } from '../../core/services/step-counter.service';

@Component({
  selector: 'app-prueba-pasos',
  standalone: true,
  template: `
    <section class="prueba">
      <h2>Prueba de podómetro</h2>

      <p>Sensor disponible:
        <strong>{{ steps.disponible() === null ? 'revisando...' : steps.disponible() ? 'sí' : 'no' }}</strong>
      </p>
      <p>Permiso: <strong>{{ steps.permiso() }}</strong></p>

      <div class="contador">
        <span class="numero">{{ steps.pasos() }}</span>
        <span class="etiqueta">pasos · ~{{ steps.distanciaEstimada() }} m</span>
      </div>

      <div class="botones">
        @if (!steps.midiendo()) {
          <button (click)="steps.iniciar()" [disabled]="steps.disponible() === false">
            Empezar a contar
          </button>
        } @else {
          <button (click)="steps.detener()">Detener</button>
        }
      </div>

      @if (steps.error(); as err) {
        <p class="error">{{ err }}</p>
      }
    </section>
  `,
  styles: [`
    .prueba { padding: 1rem; max-width: 480px; margin: auto; }
    .contador { display: flex; flex-direction: column; align-items: center; margin: 1.5rem 0; }
    .numero { font-size: 4rem; font-weight: 700; color: #2563eb; }
    .etiqueta { color: #6b7280; }
    .botones { display: flex; flex-direction: column; gap: .5rem; }
    button { padding: .75rem; border-radius: 8px; border: none; background: #2563eb; color: #fff; }
    button:disabled { opacity: .5; }
    .error { color: #c62828; }
  `],
})
export class PruebaPasosComponent implements OnInit, OnDestroy {
  readonly steps = inject(StepCounterService);

  ngOnInit(): void {
    this.steps.revisarDisponibilidad();
  }

  ngOnDestroy(): void {
    if (this.steps.midiendo()) this.steps.detener();
  }
}
