import { Component, input } from '@angular/core';

export interface LlegadaInfo {
  destino: string;
  pasos: number;
  distancia: number;
  segundos: number;
  simulado: boolean;
}

@Component({
  selector: 'app-arrival-card',
  template: `
    <div class="arrival-card">
      <strong>🎉 ¡Llegaste a {{ info().destino }}!</strong>
      <span>
        👟 {{ info().pasos }} pasos{{ info().simulado ? ' (estimados)' : '' }}
        · {{ info().distancia }} m · {{ tiempo() }}
      </span>
      @if (info().simulado) {
        <small>Modo demostración</small>
      }
    </div>
  `,
  styles: [`
    .arrival-card { display: flex; flex-direction: column; gap: 4px; padding: 12px 14px;
      border-radius: 12px; background: #ecfdf5; border: 1px solid #a7f3d0; }
    strong { font-size: 15px; color: #065f46; }
    span { font-size: 13px; color: #047857; }
    small { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: .05em; }
  `],
})
export class ArrivalCardComponent {
  // Equivalente a los parámetros finales del constructor de un StatelessWidget
  readonly info = input.required<LlegadaInfo>();

  tiempo(): string {
    const m = Math.floor(this.info().segundos / 60);
    const s = this.info().segundos % 60;
    return m > 0 ? `${m} min ${s} s` : `${s} s`;
  }
}
