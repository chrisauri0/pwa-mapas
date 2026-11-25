import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ICONOS, NombreIcono } from './iconos.data';

/**
 * Icono SVG en línea. Toma el color y el tamaño del texto que lo rodea (`color` y `font-size`),
 * así que se estiliza igual que el emoji que reemplaza. Es decorativo: el texto del botón o enlace
 * es lo que lee un lector de pantalla (si el botón solo tiene icono, ponle `aria-label`).
 *
 * Uso: <app-icono nombre="ubicacion" />
 */
@Component({
  selector: 'app-icono',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.viewBox]="datos().caja" aria-hidden="true" focusable="false">
      <path [attr.d]="datos().d" fill="currentColor" />
    </svg>
  `,
  styles: [`
    :host { display: inline-flex; align-items: center; justify-content: center; vertical-align: -0.125em; flex-shrink: 0; }
    svg { width: 1em; height: 1em; display: block; }
  `],
})
export class IconoComponent {
  readonly nombre = input.required<NombreIcono>();
  protected readonly datos = computed(() => ICONOS[this.nombre()]);
}
