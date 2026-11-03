
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService, DOMINIO_INSTITUCIONAL } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="login">
      <h1>Mapa UTEQ</h1>
      <p class="sub">Inicia sesión para dejar avisos en los edificios.</p>

      <div class="tabs">
        <button type="button" [class.activo]="modo() === 'entrar'" (click)="cambiar('entrar')">
          Entrar
        </button>
        <button type="button" [class.activo]="modo() === 'registro'" (click)="cambiar('registro')">
          Crear cuenta
        </button>
      </div>

      <form (submit)="enviar($event)">
        @if (modo() === 'registro') {
          <input type="text" placeholder="Tu nombre" autocomplete="name"
                 [value]="nombre()" (input)="nombre.set(valor($event))" required />
        }
        <input type="email" [placeholder]="dominio ? 'correo' + dominio : 'Correo'"
               autocomplete="email" [value]="email()" (input)="email.set(valor($event))" required />
        <input type="password" placeholder="Contraseña (mín. 6)" autocomplete="current-password"
               [value]="password()" (input)="password.set(valor($event))" required />

        @if (error(); as err) {
          <p class="error">{{ err }}</p>
        }

        <button type="submit" class="principal" [disabled]="enviando()">
          {{ enviando() ? 'Un momento...' : modo() === 'entrar' ? 'Entrar' : 'Crear cuenta' }}
        </button>
      </form>

      <a [routerLink]="volverA" class="secundario">Continuar sin cuenta →</a>
    </section>
  `,
  styles: [`
    .login { max-width: 400px; margin: auto; padding: 2rem 1.25rem; display: flex; flex-direction: column; gap: 1rem; }
    h1 { margin: 0; color: #1d4ed8; }
    .sub { margin: 0; color: #6b7280; }
    .tabs { display: flex; background: #f3f4f6; border-radius: 10px; padding: 4px; }
    .tabs button { flex: 1; padding: .6rem; border: none; border-radius: 8px; background: none; font-weight: 600; color: #6b7280; }
    .tabs button.activo { background: #fff; color: #111827; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
    form { display: flex; flex-direction: column; gap: .75rem; }
    input { padding: .75rem 1rem; border: 1.5px solid #d1d5db; border-radius: 10px; font-size: 15px; }
    input:focus { outline: none; border-color: #2563eb; }
    .principal { padding: .8rem; border: none; border-radius: 10px; background: #2563eb; color: #fff; font-size: 15px; font-weight: 600; }
    .principal:disabled { opacity: .6; }
    .error { margin: 0; color: #c62828; font-size: 14px; }
    .secundario { text-align: center; color: #2563eb; text-decoration: none; }
  `],
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly dominio = DOMINIO_INSTITUCIONAL;
  readonly volverA = this.route.snapshot.queryParamMap.get('redirect') ?? '/';

  readonly modo = signal<'entrar' | 'registro'>('entrar');
  readonly nombre = signal('');
  readonly email = signal('');
  readonly password = signal('');
  readonly enviando = signal(false);
  readonly error = signal<string | null>(null);

  valor(e: Event): string {
    return (e.target as HTMLInputElement).value;
  }

  cambiar(modo: 'entrar' | 'registro'): void {
    this.modo.set(modo);
    this.error.set(null);
  }

  async enviar(e: Event): Promise<void> {
    e.preventDefault();
    this.enviando.set(true);
    this.error.set(null);

    try {
      if (this.modo() === 'registro') {
        await this.auth.registrar(this.nombre(), this.email(), this.password());
      } else {
        await this.auth.entrar(this.email(), this.password());
      }
      await this.router.navigateByUrl(this.volverA);
    } catch (err) {
      console.error('❌ Auth:', err);
      this.error.set(this.auth.mensajeError(err));
    } finally {
      this.enviando.set(false);
    }
  }
}
