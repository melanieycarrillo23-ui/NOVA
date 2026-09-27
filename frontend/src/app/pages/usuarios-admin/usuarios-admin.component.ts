import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Usuario } from '../../models/models';
import { AuthService } from '../../services/auth.service';
import { EventosService } from '../../services/eventos.service';

@Component({
  selector: 'app-usuarios-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  template: `
    <div class="row between wrap">

      <div>
        <h1 class="page-title">
          Usuarios
        </h1>

        <p class="page-subtitle">
          Administra las cuentas registradas en NOVA.
        </p>
      </div>

      <div style="width: min(340px, 100%)">
        <input
          [(ngModel)]="busqueda"
          placeholder="Buscar por nombre o correo"
        >
      </div>

    </div>

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

    <div class="card table-wrap">

      <table class="table">

        <thead>
          <tr>
            <th>Usuario</th>
            <th>Correo</th>
            <th>Roles</th>
            <th>Estado</th>
          </tr>
        </thead>

        <tbody>

          <tr
            *ngFor="let usuario of usuariosFiltrados()"
          >

            <td>

              <strong>
                {{ usuario.nombre_completo }}
              </strong>

              <div
                class="muted"
                *ngIf="esCuentaActual(usuario)"
              >
                Tu cuenta
              </div>

            </td>

            <td>
              {{ usuario.correo }}
            </td>

            <td>

              <span
                class="badge"
                *ngFor="let rol of usuario.roles"
                style="margin-right: 5px"
              >
                {{ rol }}
              </span>

            </td>

            <td>

              <select
                [ngModel]="usuario.estado"
                [disabled]="
                  esCuentaActual(usuario) ||
                  procesandoId() === usuario.id
                "
                (ngModelChange)="
                  cambiarEstado(usuario, $event)
                "
              >

                <option value="ACTIVO">
                  Activo
                </option>

                <option value="BLOQUEADO">
                  Bloqueado
                </option>

                <option value="INACTIVO">
                  Inactivo
                </option>

              </select>

            </td>

          </tr>

        </tbody>

      </table>

      <div
        class="empty"
        *ngIf="!usuariosFiltrados().length"
      >
        No encontramos usuarios con ese criterio.
      </div>

    </div>
  `
})
export class UsuariosAdminComponent implements OnInit {

  api = inject(EventosService);
  auth = inject(AuthService);

  items = signal<Usuario[]>([]);

  procesandoId =
    signal<number | null>(null);

  mensaje = signal('');
  error = signal('');

  busqueda = '';

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {

    this.api.usuarios().subscribe({

      next: respuesta => {

        this.items.set(
          respuesta.results
        );
      },

      error: () => {

        this.error.set(
          'No fue posible cargar los usuarios.'
        );
      }
    });
  }

  usuariosFiltrados(): Usuario[] {

    const texto =
      this.busqueda
        .trim()
        .toLowerCase();

    if (!texto) {
      return this.items();
    }

    return this.items().filter(
      usuario =>
        usuario.nombre_completo
          .toLowerCase()
          .includes(texto)
        ||
        usuario.correo
          .toLowerCase()
          .includes(texto)
    );
  }

  esCuentaActual(
    usuario: Usuario
  ): boolean {

    return (
      this.auth.usuario()?.id ===
      usuario.id
    );
  }

  cambiarEstado(
    usuario: Usuario,
    nuevoEstado:
      'ACTIVO' |
      'BLOQUEADO' |
      'INACTIVO'
  ): void {

    if (
      this.esCuentaActual(usuario) ||
      usuario.estado === nuevoEstado
    ) {
      return;
    }

    const confirmar =
      window.confirm(
        `¿Deseas cambiar el estado de "${usuario.nombre_completo}" a ${nuevoEstado}?`
      );

    if (!confirmar) {
      return;
    }

    this.procesandoId.set(
      usuario.id
    );

    this.mensaje.set('');
    this.error.set('');

    this.api.cambiarEstadoUsuario(
      usuario.id,
      nuevoEstado
    ).subscribe({

      next: actualizado => {

        this.items.update(
          usuarios =>
            usuarios.map(
              item =>
                item.id === actualizado.id
                  ? actualizado
                  : item
            )
        );

        this.mensaje.set(
          'Estado del usuario actualizado correctamente.'
        );

        this.procesandoId.set(null);
      },

      error: respuesta => {

        this.error.set(
          respuesta?.error?.detail ||
          'No fue posible cambiar el estado del usuario.'
        );

        this.procesandoId.set(null);

        this.cargar();
      }
    });
  }
}