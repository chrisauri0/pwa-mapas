import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-component.html',
  styleUrls: ['./dashboard-component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {

  readonly gpsStatus = signal('Activo');

  readonly wearablesConnected = signal(12);

  readonly totalRoutes = signal(87);

  readonly destination = signal('Biblioteca');

  readonly distance = signal(245);

  readonly routeNodes = signal(8);

  readonly lastInstruction = signal(
    'Avanza recto 50 metros y gira a la derecha'
  );

}