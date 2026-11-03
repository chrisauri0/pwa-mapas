
import { Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CampusNode } from '../hooks/models/models-graph';
import { AuthService } from '../../core/services/auth.service';
import {
  Aviso,
  AvisosService,
  DURACIONES,
  TIPOS_AVISO,
  TipoAviso,
  infoTipo,
} from '../../core/services/avisos.service';

@Component({
  selector: 'app-avisos-edificio',
  standalone: true,
  template: `
    <div class="avisos">
      <button type="button" class="cabecera" (click)="abierto.set(!abierto())">
        <span>
          {{ lista().length ? info(lista()[0].tipo).icono : '📋' }}
          Avisos de este edificio
          @if (lista().length) { <b class="badge">{{ lista().length }}</b> }
        </span>
        <span>{{ abierto() ? '▾' : '▸' }}</span>
      </button>

      @if (abierto()) {
        <div class="cuerpo">
          @for (a of lista(); track a.id) {
            <div class="aviso" [attr.data-tipo]="a.tipo">
              <div class="linea">
                <strong>{{ info(a.tipo).icono }} {{ info(a.tipo).etiqueta }}</strong>
                @if (a.pendiente) { <span class="pendiente">⏳ pendiente</span> }
                @if (a.autorUid === auth.perfil()?.uid) {
                  <button type="button" class="borrar" (click)="avisosSrv.eliminar(a.id)">Eliminar</button>
                }
              </div>
              <p>{{ a.texto }}</p>
              <small>{{ a.autorNombre }} · vence en {{ restante(a) }}</small>
            </div>
          } @empty {
            <p class="vacio">Sin avisos activos.</p>
          }

          @if (auth.logueado()) {
            @if (formAbierto()) {
              <div class="form">
                <div class="tipos">
                  @for (t of tipos; track t.id) {
                    <button type="button" [class.activo]="tipo() === t.id" (click)="tipo.set(t.id)">
                      {{ t.icono }} {{ t.etiqueta }}
                    </button>
                  }
                </div>
                <textarea rows="2" maxlength="280" placeholder="Ej. El 2° piso está cerrado por pintura"
                          [value]="texto()" (input)="texto.set(valor($event))"></textarea>
                <div class="pie">
                  <select (change)="horas.set(+valor($event))">
                    @for (d of duraciones; track d.horas) {
                      <option [value]="d.horas" [selected]="d.horas === horas()">Dura {{ d.etiqueta }}</option>
                    }
                  </select>
                  <small>{{ texto().length }}/280</small>
                </div>
                <div class="acciones">
                  <button type="button" class="cancelar" (click)="formAbierto.set(false)">Cancelar</button>
                  <button type="button" class="publicar" [disabled]="!texto().trim()" (click)="publicar()">
                    Publicar
                  </button>
                </div>
              </div>
            } @else {
              <button type="button" class="agregar" (click)="formAbierto.set(true)">＋ Agregar aviso</button>
            }
            <small class="sesion">
              Sesión: {{ auth.perfil()?.nombre }} ·
              <a href="#" (click)="$event.preventDefault(); auth.salir()">Salir</a>
            </small>
          } @else {
            <button type="button" class="agregar" (click)="iniciarSesion()">
              🔐 Inicia sesión para dejar un aviso
            </button>
          }

          @if (avisosSrv.error(); as err) { <p class="error">{{ err }}</p> }
        </div>
      }
    </div>
  `,
  styles: [`
    .avisos { border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
    .cabecera { width: 100%; display: flex; justify-content: space-between; align-items: center;
      padding: 10px 12px; background: #f9fafb; border: none; font-size: 14px; font-weight: 600; color: #111827; }
    .badge { background: #ef4444; color: #fff; border-radius: 999px; padding: 0 7px; font-size: 12px; margin-left: 4px; }
    .cuerpo { padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; max-height: 40dvh; overflow-y: auto; }
    .aviso { padding: 8px 10px; border-radius: 10px; background: #eff6ff; border-left: 4px solid #2563eb; }
    .aviso[data-tipo='cerrado'] { background: #fef2f2; border-color: #dc2626; }
    .aviso[data-tipo='mantenimiento'] { background: #fffbeb; border-color: #d97706; }
    .aviso[data-tipo='evento'] { background: #f5f3ff; border-color: #7c3aed; }
    .aviso p { margin: 4px 0; font-size: 14px; color: #111827; word-break: break-word; }
    .aviso small { color: #6b7280; font-size: 12px; }
    .linea { display: flex; align-items: center; gap: 8px; font-size: 13px; }
    .pendiente { font-size: 11px; color: #92400e; }
    .borrar { margin-left: auto; border: none; background: none; color: #dc2626; font-size: 12px; }
    .vacio { margin: 0; color: #9ca3af; font-size: 13px; }
    .agregar { padding: 10px; border: 1.5px dashed #2563eb; border-radius: 10px; background: #fff; color: #2563eb; font-weight: 600; }
    .form { display: flex; flex-direction: column; gap: 8px; }
    .tipos { display: flex; flex-wrap: wrap; gap: 6px; }
    .tipos button { padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 999px; background: #fff; font-size: 12px; }
    .tipos button.activo { background: #2563eb; border-color: #2563eb; color: #fff; }
    textarea { padding: 8px 10px; border: 1.5px solid #d1d5db; border-radius: 10px; font: inherit; font-size: 14px; resize: none; }
    .pie { display: flex; justify-content: space-between; align-items: center; }
    select { padding: 6px; border-radius: 8px; border: 1px solid #d1d5db; }
    .pie small { color: #9ca3af; }
    .acciones { display: flex; gap: 8px; justify-content: flex-end; }
    .cancelar { padding: 8px 14px; border: 1px solid #d1d5db; border-radius: 10px; background: #fff; }
    .publicar { padding: 8px 14px; border: none; border-radius: 10px; background: #2563eb; color: #fff; font-weight: 600; }
    .publicar:disabled { opacity: .5; }
    .sesion { color: #6b7280; font-size: 12px; }
    .sesion a { color: #2563eb; }
    .error { margin: 0; color: #c62828; font-size: 13px; }
  `],
})
export class AvisosEdificioComponent {
  readonly nodo = input.required<CampusNode>();

  readonly avisosSrv = inject(AvisosService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly tipos = TIPOS_AVISO;
  readonly duraciones = DURACIONES;

  readonly abierto = signal(false);
  readonly formAbierto = signal(false);
  readonly tipo = signal<TipoAviso>('mantenimiento');
  readonly texto = signal('');
  readonly horas = signal(24);

  readonly lista = computed(() => this.avisosSrv.porEdificio().get(this.nodo().id) ?? []);

  info = infoTipo;

  valor(e: Event): string {
    return (e.target as HTMLInputElement).value;
  }

  publicar(): void {
    const texto = this.texto().trim();
    if (!texto) return;

    this.avisosSrv.publicar(this.nodo().id, this.nodo().name, this.tipo(), texto, this.horas());
    this.texto.set('');
    this.formAbierto.set(false);
  }

  iniciarSesion(): void {
    void this.router.navigate(['/login'], { queryParams: { redirect: this.router.url } });
  }

  restante(a: Aviso): string {
    const min = Math.max(0, Math.round((a.expiraEn.getTime() - this.avisosSrv.ahora()) / 60_000));
    if (min < 60) return `${min} min`;
    const h = Math.round(min / 60);
    return h < 48 ? `${h} h` : `${Math.round(h / 24)} días`;
  }
}
