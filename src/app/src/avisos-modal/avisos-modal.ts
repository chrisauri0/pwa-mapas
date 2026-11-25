import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { BackButtonService } from '../../core/services/back-button.service';
import { AuthService } from '../../core/services/auth.service';
import {
  Aviso,
  AvisosService,
  DURACIONES,
  TIPOS_AVISO,
  TipoAviso,
  infoTipo,
} from '../../core/services/avisos.service';
import { type FiltroTipo, agruparAvisos, contarPorTipo, sinAcentos } from '../../core/services/avisos.filtro.logic';
import { CampusNode } from '../hooks/models/models-graph';
import { IconoComponent } from '../../shared/icono/icono';
import type { NombreIcono } from '../../shared/icono/iconos.data';

/**
 * Botón de avisos (esquina superior derecha) y su modal: todos los avisos vigentes del campus,
 * agrupados por edificio, con filtro por tipo y búsqueda. Desde aquí también se publica un aviso.
 */
@Component({
  selector: 'app-avisos-modal',
  standalone: true,
  imports: [IconoComponent],
  host: { '(document:keydown.escape)': 'cerrar()' },
  template: `
    <button
      type="button"
      class="avisos-btn"
      [class.avisos-btn--hay]="total() > 0"
      (click)="abrir()"
      [attr.aria-label]="'Avisos del campus: ' + total() + ' vigentes'"
    >
      <span class="icono"><app-icono [nombre]="total() > 0 ? iconoPrincipal() : 'lista'" /></span>
      <small>Avisos</small>
      @if (total() > 0) {
        <b class="badge">{{ total() }}</b>
      }
    </button>

    @if (abierto()) {
      <button type="button" class="fondo" tabindex="-1" aria-label="Cerrar avisos" (click)="cerrar()"></button>
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="avisos-titulo">
        <header class="cabecera">
          <h2 id="avisos-titulo"><app-icono nombre="megafono" /> Avisos del campus</h2>
          <button #cerrarBtn type="button" class="cerrar" (click)="cerrar()" aria-label="Cerrar avisos"><app-icono nombre="cerrar" /></button>
        </header>

        <div class="filtros">
          <div class="chips" role="group" aria-label="Filtrar por tipo de aviso">
            <button type="button" [class.activo]="filtro() === 'todos'" [attr.aria-pressed]="filtro() === 'todos'"
                    (click)="filtro.set('todos')">
              Todos <b>{{ total() }}</b>
            </button>
            @for (t of tipos; track t.id) {
              <button type="button" [class.activo]="filtro() === t.id" [attr.aria-pressed]="filtro() === t.id"
                      (click)="filtro.set(t.id)">
                <app-icono [nombre]="t.icono" /> {{ t.etiqueta }} <b>{{ conteos()[t.id] }}</b>
              </button>
            }
          </div>
          <input type="search" class="buscar" placeholder="Buscar por edificio o texto"
                 [value]="busqueda()" (input)="busqueda.set(valor($event))" />
        </div>

        <div class="cuerpo">
          @for (g of grupos(); track g.edificioId) {
            <div class="grupo">
              <div class="grupo-cab">
                <strong>{{ g.nombre }}</strong>
                @if (permitirIr() && existeNodo(g.edificioId)) {
                  <button type="button" class="ir" (click)="ir(g.edificioId)"><app-icono nombre="ubicacion" /> Ir</button>
                }
              </div>
              @for (a of g.avisos; track a.id) {
                <div class="aviso" [attr.data-tipo]="a.tipo">
                  <div class="linea">
                    <strong><app-icono [nombre]="info(a.tipo).icono" /> {{ info(a.tipo).etiqueta }}</strong>
                    @if (a.pendiente) { <span class="pendiente"><app-icono nombre="espera" /> pendiente</span> }
                    @if (a.autorUid === auth.perfil()?.uid) {
                      <button type="button" class="borrar" (click)="avisosSrv.eliminar(a.id)">Eliminar</button>
                    }
                  </div>
                  <p>{{ a.texto }}</p>
                  <small>{{ a.autorNombre }} · vence en {{ restante(a) }}</small>
                </div>
              }
            </div>
          } @empty {
            <p class="vacio">
              {{ total() === 0 ? 'Sin avisos activos.' : 'Ningún aviso coincide con el filtro.' }}
            </p>
          }

          @if (auth.logueado()) {
            @if (formAbierto()) {
              <div class="form">
                <label class="campo">
                  Edificio
                  <select (change)="edificioElegido.set(valor($event))">
                    <option value="" [selected]="!edificioForm()">Elige un edificio…</option>
                    @for (n of opcionesEdificio(); track n.id) {
                      <option [value]="n.id" [selected]="n.id === edificioForm()">{{ n.name }}</option>
                    }
                  </select>
                </label>
                <div class="tipos">
                  @for (t of tipos; track t.id) {
                    <button type="button" [class.activo]="tipo() === t.id" (click)="tipo.set(t.id)">
                      <app-icono [nombre]="t.icono" /> {{ t.etiqueta }}
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
                  <button type="button" class="publicar" [disabled]="!texto().trim() || !edificioForm()"
                          (click)="publicar()">
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
              <app-icono nombre="candado" /> Inicia sesión para dejar un aviso
            </button>
          }

          @if (avisosSrv.error(); as err) { <p class="error">{{ err }}</p> }
        </div>
      </section>
    }
  `,
  styles: [`
    .avisos-btn {
      position: absolute; top: 12px; right: 12px; z-index: 1000;
      width: 54px; min-height: 54px; padding: 4px 0 3px;
      border: none; border-radius: 16px; background: rgba(255, 255, 255, .95);
      box-shadow: 0 2px 10px rgba(0, 0, 0, .25);
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px;
      cursor: pointer;
    }
    .avisos-btn .icono { font-size: 22px; line-height: 1; color: #374151; }
    .avisos-btn small { font-size: 10px; font-weight: 700; color: #374151; line-height: 1; }
    .avisos-btn--hay { outline: 2px solid #ef4444; }
    .avisos-btn .badge {
      position: absolute; top: -6px; right: -6px; min-width: 20px; height: 20px; padding: 0 5px;
      box-sizing: border-box; border-radius: 999px; background: #ef4444; color: #fff;
      font-size: 12px; line-height: 20px; text-align: center;
    }

    .fondo { position: fixed; inset: 0; z-index: 2000; width: 100%; border: none; padding: 0; background: rgba(17, 24, 39, .5); cursor: default; }
    .modal {
      position: fixed; z-index: 2001; left: 50%; top: 50%; transform: translate(-50%, -50%);
      width: min(520px, calc(100vw - 24px)); max-height: min(86dvh, 720px);
      display: flex; flex-direction: column; overflow: hidden;
      background: #fff; border-radius: 18px; box-shadow: 0 12px 40px rgba(0, 0, 0, .35);
    }
    .cabecera { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 14px 16px 8px; }
    .cabecera h2 { margin: 0; font-size: 17px; color: #111827; }
    .cerrar { width: 36px; height: 36px; border: none; border-radius: 50%; background: #f3f4f6; color: #374151; font-size: 16px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
    .cabecera h2 { display: flex; align-items: center; gap: 8px; }
    .chips button, .tipos button, .ir, .agregar { display: inline-flex; align-items: center; justify-content: center; gap: 5px; }
    .linea strong, .pendiente { display: inline-flex; align-items: center; gap: 5px; }

    .filtros { padding: 0 16px 10px; display: flex; flex-direction: column; gap: 8px; border-bottom: 1px solid #e5e7eb; }
    .chips { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 2px; }
    .chips button {
      flex: 0 0 auto; padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 999px;
      background: #fff; font-size: 12px; white-space: nowrap; cursor: pointer;
    }
    .chips button b { margin-left: 2px; color: #6b7280; }
    .chips button.activo { background: #2563eb; border-color: #2563eb; color: #fff; }
    .chips button.activo b { color: #dbeafe; }
    .buscar { padding: 9px 12px; border: 1.5px solid #d1d5db; border-radius: 10px; font-size: 15px; outline: none; }
    .buscar:focus { border-color: #2563eb; }

    .cuerpo { padding: 12px 16px 16px; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; }
    .grupo { display: flex; flex-direction: column; gap: 6px; }
    .grupo-cab { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .grupo-cab strong { font-size: 14px; color: #111827; }
    .ir { border: 1px solid #bfdbfe; border-radius: 999px; background: #eff6ff; color: #1d4ed8; font-size: 12px; padding: 4px 10px; cursor: pointer; }

    .aviso { padding: 8px 10px; border-radius: 10px; background: #eff6ff; border-left: 4px solid #2563eb; }
    .aviso[data-tipo='cerrado'] { background: #fef2f2; border-color: #dc2626; }
    .aviso[data-tipo='mantenimiento'] { background: #fffbeb; border-color: #d97706; }
    .aviso[data-tipo='evento'] { background: #f5f3ff; border-color: #7c3aed; }
    .aviso p { margin: 4px 0; font-size: 14px; color: #111827; word-break: break-word; }
    .aviso small { color: #6b7280; font-size: 12px; }
    .linea { display: flex; align-items: center; gap: 8px; font-size: 13px; }
    .pendiente { font-size: 11px; color: #92400e; }
    .borrar { margin-left: auto; border: none; background: none; color: #dc2626; font-size: 12px; cursor: pointer; }
    .vacio { margin: 0; color: #9ca3af; font-size: 13px; text-align: center; padding: 14px 0; }

    .agregar { padding: 10px; border: 1.5px dashed #2563eb; border-radius: 10px; background: #fff; color: #2563eb; font-weight: 600; cursor: pointer; }
    .form { display: flex; flex-direction: column; gap: 8px; padding-top: 4px; border-top: 1px solid #e5e7eb; }
    .campo { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #6b7280; }
    .tipos { display: flex; flex-wrap: wrap; gap: 6px; }
    .tipos button { padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 999px; background: #fff; font-size: 12px; cursor: pointer; }
    .tipos button.activo { background: #2563eb; border-color: #2563eb; color: #fff; }
    textarea { padding: 8px 10px; border: 1.5px solid #d1d5db; border-radius: 10px; font: inherit; font-size: 15px; resize: none; }
    select { padding: 8px; border-radius: 8px; border: 1px solid #d1d5db; font-size: 15px; background: #fff; }
    .pie { display: flex; justify-content: space-between; align-items: center; }
    .pie small { color: #9ca3af; }
    .acciones { display: flex; gap: 8px; justify-content: flex-end; }
    .cancelar { padding: 8px 14px; border: 1px solid #d1d5db; border-radius: 10px; background: #fff; cursor: pointer; }
    .publicar { padding: 8px 14px; border: none; border-radius: 10px; background: #2563eb; color: #fff; font-weight: 600; cursor: pointer; }
    .publicar:disabled { opacity: .5; cursor: default; }
    .sesion { color: #6b7280; font-size: 12px; }
    .sesion a { color: #2563eb; }
    .error { margin: 0; color: #c62828; font-size: 13px; }
  `],
})
export class AvisosModalComponent {
  /** Nodos del campus: de aquí salen los edificios para publicar y el botón "Ir". */
  readonly nodos = input.required<readonly CampusNode[]>();
  /** Destino elegido en el mapa: al publicar viene preseleccionado. */
  readonly destinoId = input('');
  /** false mientras hay un recorrido en curso (elegir otro destino lo cancelaría). */
  readonly permitirIr = input(true);
  /** Pidieron ir a un edificio: el mapa lo elige como destino. */
  readonly irA = output<string>();

  readonly avisosSrv = inject(AvisosService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly back = inject(BackButtonService);

  readonly tipos = TIPOS_AVISO;
  readonly duraciones = DURACIONES;
  readonly info = infoTipo;

  readonly abierto = signal(false);
  readonly filtro = signal<FiltroTipo>('todos');
  readonly busqueda = signal('');

  readonly formAbierto = signal(false);
  readonly tipo = signal<TipoAviso>('mantenimiento');
  readonly texto = signal('');
  readonly horas = signal(24);
  readonly edificioElegido = signal('');

  private readonly cerrarBtn = viewChild<ElementRef<HTMLButtonElement>>('cerrarBtn');

  readonly total = computed(() => this.avisosSrv.vigentes().length);

  /** Icono del aviso más severo de todo el campus (el botón lo muestra). */
  readonly iconoPrincipal = computed<NombreIcono>(() => {
    const vigentes = this.avisosSrv.vigentes();
    const primero = TIPOS_AVISO.find((t) => vigentes.some((a) => a.tipo === t.id));
    return primero?.icono ?? 'lista';
  });

  readonly conteos = computed(() => contarPorTipo(this.avisosSrv.vigentes()));

  /** Avisos que pasan el filtro, por edificio (lo más severo primero). */
  readonly grupos = computed(() =>
    agruparAvisos(
      this.avisosSrv.porEdificio(),
      this.filtro(),
      this.busqueda(),
      TIPOS_AVISO.map((t) => t.id),
      (id) => this.nombreDe(id),
    ),
  );

  /** Lugares donde se puede dejar un aviso: edificios y entradas (igual que los marcadores del mapa) + el destino. */
  readonly opcionesEdificio = computed(() => {
    const destino = this.destinoId();
    return this.nodos()
      .filter((n) => n.type === 'building' || n.id === destino || sinAcentos(n.name).includes('entrada'))
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  });

  /** Lo que eligió en la lista; si no ha elegido, el destino del mapa. */
  readonly edificioForm = computed(() => {
    const elegido = this.edificioElegido();
    if (elegido) return elegido;
    const destino = this.destinoId();
    return this.opcionesEdificio().some((n) => n.id === destino) ? destino : '';
  });

  constructor() {
    // El botón "atrás" del teléfono cierra el modal antes de salir de la pantalla
    const quitar = this.back.registrar(() => {
      if (!this.abierto()) return false;
      this.cerrar();
      return true;
    });
    inject(DestroyRef).onDestroy(quitar);

    // Al abrir, el foco pasa al modal (lectores de pantalla y teclado)
    effect(() => {
      const boton = this.cerrarBtn();
      if (boton) setTimeout(() => boton.nativeElement.focus(), 0);
    });
  }

  abrir(): void {
    this.abierto.set(true);
  }

  cerrar(): void {
    if (!this.abierto()) return;
    this.abierto.set(false);
    this.formAbierto.set(false);
  }

  valor(e: Event): string {
    return (e.target as HTMLInputElement).value;
  }

  existeNodo(id: string): boolean {
    return this.nodos().some((n) => n.id === id);
  }

  ir(id: string): void {
    this.irA.emit(id);
    this.cerrar();
  }

  publicar(): void {
    const texto = this.texto().trim();
    const edificioId = this.edificioForm();
    if (!texto || !edificioId) return;

    this.avisosSrv.publicar(edificioId, this.nombreDe(edificioId), this.tipo(), texto, this.horas());
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

  private nombreDe(id: string): string {
    return this.nodos().find((n) => n.id === id)?.name ?? id;
  }
}
