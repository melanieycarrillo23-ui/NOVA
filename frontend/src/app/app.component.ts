import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  inject,
  signal
} from '@angular/core';

import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router';

import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {

  auth = inject(AuthService);
  router = inject(Router);

  menuContraido = signal(false);

  esSoloUsuario = computed(() => {
    const roles = this.auth.usuario()?.roles ?? [];

    return (
      roles.length === 1 &&
      roles.includes('USUARIO')
    );
  });

  esAuthPage(): boolean {
    return (
      this.router.url.startsWith('/login') ||
      this.router.url.startsWith('/registro')
    );
  }

  alternarMenu(): void {
    this.menuContraido.update(
      contraido => !contraido
    );
  }

  salir(): void {
    this.auth.cerrarSesion().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: () => {
        this.router.navigate(['/login']);
      }
    });
  }
}