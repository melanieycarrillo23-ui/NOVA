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
  template: `
    <h1 class="page-title">
      Mi perfil
    </h1>

    <p class="page-subtitle">
      Consulta y actualiza la información de tu cuenta.
    </p>

    <div
      class="notice"
      *ngIf="mensaje()"
      style="margin-bottom: 16px"
    >
      {{ mensaje() }}
    </div>

    <div
      class="error"
      *ngIf="error()"
      style="margin-bottom: 16px"
    >
      {{ error() }}
    </div>

    <div class="grid grid-2">

      <div class="card">

        <h3>
          Información personal
        </h3>

        <div
          class="stack"
          style="margin-top: 16px"
        >

          <div class="field">
            <label>Nombre completo</label>

            <input
              [(ngModel)]="nombreCompleto"
            >
          </div>

          <div class="field">
            <label>Correo</label>

            <input
              [value]="auth.usuario()?.correo || ''"
              disabled
            >
          </div>

          <div class="field">
            <label>Teléfono</label>

            <input
              [(ngModel)]="telefono"
              placeholder="Número de teléfono"
            >
          </div>

          <div class="field">
            <label>URL de imagen de perfil</label>

            <input
              [(ngModel)]="urlImagenPerfil"
              placeholder="https://..."
            >
          </div>

          <button
            class="btn btn-primary"
            [disabled]="guardando() || !nombreCompleto.trim()"
            (click)="guardar()"
          >
            {{
              guardando()
                ? 'Guardando...'
                : 'Guardar cambios'
            }}
          </button>

        </div>

      </div>

      <div class="card">

        <h3>
          Cuenta y roles
        </h3>

        <div
          class="stack"
          style="margin-top: 16px"
        >

          <div>
            <span class="muted">
              Estado
            </span>

            <div>
              <span class="badge green">
                {{ auth.usuario()?.estado }}
              </span>
            </div>
          </div>

          <div>
            <span class="muted">
              Roles globales
            </span>

            <div
              class="row wrap"
              style="margin-top: 8px"
            >
              <span
                class="badge"
                *ngFor="let rol of auth.usuario()?.roles"
              >
                {{ rol }}
              </span>
            </div>
          </div>

        </div>

      </div>

    </div>
  `
})
export class PerfilComponent implements OnInit {

  auth = inject(AuthService);

  nombreCompleto = '';
  telefono = '';
  urlImagenPerfil = '';

  guardando = signal(false);

  mensaje = signal('');
  error = signal('');

  ngOnInit(): void {

    const usuario =
      this.auth.usuario();

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
          JSON.stringify(respuesta?.error) ||
          'No fue posible actualizar el perfil.'
        );

        this.guardando.set(false);
      }
    });
  }
}