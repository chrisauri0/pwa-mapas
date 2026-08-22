import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { EdificiosService } from '../services/edificios.services';
import { Edificio } from '../hooks/models/models-dashboard';
import { CampusSocketService } from '../services/campus-socket.service';

@Component({
  selector: 'app-dashboard-component',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-component.html',
  styleUrl: './dashboard-component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})



export class DashboardComponent implements OnInit, OnDestroy {
  private readonly edificiosService = inject(EdificiosService);
  private readonly campusSocket = inject(CampusSocketService);
  readonly liveStats = this.campusSocket.stats;
  readonly edificios = signal<Edificio[]>([]);
  readonly focusedIndex = signal(0);
  readonly currentTime = signal(this.formatTime(new Date()));
  readonly mediaError = signal(false);

  readonly selectedEdificio = computed(() => this.edificios()[this.focusedIndex()] ?? null);




  readonly mediaForFocused = computed(() => {
  const images: Record<number, string> = {
    0: '/assets/media/usuarios-activoasdasdasds.webp',
    1: '/assets/media/edificios.webp',
    2: '/assets/media/ruta-actual.webp',
    3: '/assets/media/caminata.webp',
  };
  return images[this.focusedIndex()] ?? '/assets/media/not-found.webp';
});

  private clockInterval?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
 
  }

  ngOnDestroy(): void {
    if (this.clockInterval) clearInterval(this.clockInterval);
  }

  // ── Navegación D-pad ──────────────────────────────────────
  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    const total = 4;
    const cols = 2;
    const current = this.focusedIndex();
    let next = current;

    switch (event.key) {
      case 'ArrowRight':
        next = current % cols === cols - 1 ? current : current + 1;
        break;
      case 'ArrowLeft':
        next = current % cols === 0 ? current : current - 1;
        break;
      case 'ArrowDown':
        next = current + cols < total ? current + cols : current;
        break;
      case 'ArrowUp':
        next = current - cols >= 0 ? current - cols : current;
        break;
      case 'Enter':
        this.selectCurrent();
        return;
      default:
        return;
    }

    event.preventDefault();
    if (next !== current) {
      this.focusedIndex.set(next);
      this.mediaError.set(false);
    }
  }

  selectCurrent(): void {
    // El "seleccionar" ya actualiza el video de fondo vía selectedEdificio (computed)
    this.mediaError.set(false);
  }

  onMediaError(): void {
    this.mediaError.set(true);
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }
}