import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { IconoComponent } from '../../shared/icono/icono';

@Component({
  selector: 'app-home',
  imports: [RouterLink, RouterOutlet, IconoComponent],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {

  public menuOpen = false;


  private readonly router = inject(Router);






irMapa() {
  this.router.navigate(['/map']);
}
}
