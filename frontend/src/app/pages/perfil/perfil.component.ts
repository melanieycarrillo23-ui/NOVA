import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.css'
})
export class PerfilComponent implements OnInit {

  readonly auth = inject(AuthService);

  nombreCompleto = '';
  telefono = '';
  urlImagenPerfil = '';

  guardando = signal(false);
  imagenError = signal(false);

  mensaje = signal('');
  error = signal('');

  ngOnInit(): void {
    const usuario = this.auth.usuario();

    if (!usuario) {
      return;
    }

    this.nombreCompleto =
      usuario.nombre_completo;

    this.telefono =
      usuario.telefono || '';

    this.urlImagenPerfil =
      usuario.url_imagen_perfil || '';
  }

  guardar(): void {

    if (!this.nombreCompleto.trim()) {
      this.error.set(
        'El nombre completo es obligatorio.'
      );
      return;
    }

    if (this.telefono && !/^3[0-9]{9}$/.test(this.telefono)) {
      this.error.set('Ingresa un celular de 10 dígitos que empiece por 3, sin +57, espacios ni letras.');
      return;
    }

    this.guardando.set(true);
    this.mensaje.set('');
    this.error.set('');

    this.auth.actualizarPerfil({
      nombre_completo:
        this.nombreCompleto.trim(),

      telefono:
        this.telefono.trim(),

      url_imagen_perfil:
        this.urlImagenPerfil.trim()
    }).subscribe({

      next: () => {

        this.mensaje.set(
          'Perfil actualizado correctamente.'
        );

        this.guardando.set(false);
      },

      error: respuesta => {

        this.error.set(
          respuesta?.error?.detail ||
          'No fue posible actualizar el perfil.'
        );

        this.guardando.set(false);
      }
    });
  }

  iniciales(): string {

    const nombre =
      this.nombreCompleto.trim();

    if (!nombre) {
      return 'U';
    }

    return nombre
      .split(/\s+/)
      .slice(0, 2)
      .map(parte =>
        parte.charAt(0).toUpperCase()
      )
      .join('');
  }

  actualizarImagen(): void {
    this.imagenError.set(false);
  }
}