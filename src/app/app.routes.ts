import { Routes } from '@angular/router';
import { MapComponent } from './src/map-component/map-component';
import { Home } from './src/home/home';





export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'map' },
  { path: 'map', component: MapComponent },
  { path: 'home', component: Home },

];
