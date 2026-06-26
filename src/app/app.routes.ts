import { Routes } from '@angular/router';
import { MapComponent } from './src/map-component/map-component';
import { Home } from './src/home/home';
import { DashboardComponent } from './src/dashboard-component/dashboard-component';




export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'map' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'map', component: MapComponent },
  { path: 'home', component: Home },

];
