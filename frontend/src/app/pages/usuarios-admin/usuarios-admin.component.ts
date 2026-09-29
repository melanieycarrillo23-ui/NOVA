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
  templateUrl: './usuarios-admin.component.html',
  styleUrl: './usuarios-admin.component.css'
})
export class UsuariosAdminComponent implements OnInit {

  private readonly api = inject(EventosService);
  private readonly auth = inject(AuthService);

  items = signal<Usuario[]>([]);

  cargando = signal(true);

  procesandoId =
    signal<number | null>(null);

  mensaje = signal('');
  error = signal('');

  busqueda = '';


  ngOnInit(): void {

    this.cargar();
  }


  cargar(): void {

    this.cargando.set(true);
    this.error.set('');

    this.api.usuarios().subscribe({

      next: respuesta => {

        this.items.set(
          respuesta.results
        );

        this.cargando.set(false);
      },

      error: () => {

        this.items.set([]);

        this.error.set(
          'No fue posible cargar los usuarios.'
        );

        this.cargando.set(false);
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