import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'image-smooth',
    loadComponent: () => import('./pages/image-blur/image-smoothing.component').then((c) => c.ImageSmoothingComponent),
    canActivate: []
  },
  {path: '', redirectTo: '/image-smooth', pathMatch: 'full'},
];
