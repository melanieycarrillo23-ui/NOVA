import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  inject,
  OnInit,
  signal
} from '@angular/core';

import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router';

import { filter } from 'rxjs';
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
export class AppComponent implements OnInit{

  auth = inject(AuthService);
  router = inject(Router);

  menuContraido = signal(false);
    seccionAbierta = signal<
    'general' |
    'operacion' |
    'organizacion' |
    'administracion' |
    null
  >('general');

  esSoloUsuario = computed(() => {
    const roles = this.auth.usuario()?.roles ?? [];

    return (
      roles.length === 1 &&
      roles.includes('USUARIO')
    );
  });

  ngOnInit(): void {
    this.abrirSeccionDeRuta(
      this.router.url
    );

    this.router.events
      .pipe(
        filter(
          evento =>
            evento instanceof NavigationEnd
        )
      )
      .subscribe(evento => {
        const navegacion =
          evento as NavigationEnd;

        this.abrirSeccionDeRuta(
          navegacion.urlAfterRedirects
        );
      });
  }


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

  alternarSeccion(
    seccion:
      'general' |
      'operacion' |
      'organizacion' |
      'administracion'
  ): void {

    this.seccionAbierta.update(
      actual =>
        actual === seccion
          ? null
          : seccion
    );
  }

  private abrirSeccionDeRuta(
    ruta: string
  ): void {

    if (
      ruta.startsWith('/eventos-asignados') ||
      ruta.startsWith('/validar-qr') ||
      ruta.startsWith('/asistentes')
    ) {
      this.seccionAbierta.set(
        'operacion'
      );
      return;
    }

    if (
      ruta.startsWith('/mis-eventos') ||
      ruta.startsWith('/crear-evento') ||
      ruta.startsWith('/administrar-evento') ||
      ruta.startsWith('/reportes')
    ) {
      this.seccionAbierta.set(
        'organizacion'
      );
      return;
    }

    if (
      ruta.startsWith('/usuarios') ||
      ruta.startsWith('/categorias')
    ) {
      this.seccionAbierta.set(
        'administracion'
      );
      return;
    }

    this.seccionAbierta.set(
      'general'
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