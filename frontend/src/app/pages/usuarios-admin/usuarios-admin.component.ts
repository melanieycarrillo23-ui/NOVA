import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { RolCodigo, Usuario } from '../../models/models';
import { AuthService } from '../../services/auth.service';
import { EventosService } from '../../services/eventos.service';


@Component({
  selector: 'app-usuarios-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],
  templateUrl:
    './usuarios-admin.component.html',
  styleUrl:
    './usuarios-admin.component.css'
})
export class UsuariosAdminComponent implements OnInit {

  private readonly api =
    inject(EventosService);

  private readonly auth =
    inject(AuthService);


  items =
    signal<Usuario[]>([]);

  cargando =
    signal(true);

  procesandoId =
    signal<number | null>(null);

  mensaje =
    signal('');

  error =
    signal('');


  total =
    signal(0);

  pagina =
    signal(1);

  tieneAnterior =
    signal(false);

  tieneSiguiente =
    signal(false);


  readonly rolesDisponibles: RolCodigo[] = ['ADMIN', 'ORGANIZADOR', 'STAFF', 'USUARIO'];
  rolesSeleccionados: Record<number, RolCodigo | ''> = {};

  rolesPendientes(usuario: Usuario): RolCodigo[] {
    return this.rolesDisponibles.filter(rol => !usuario.roles.includes(rol));
  }

  asignarRol(usuario: Usuario): void {
    const rol = this.rolesSeleccionados[usuario.id];
    if (!rol || this.procesandoId() !== null || usuario.roles.includes(rol)) {
      return;
    }
    if (!window.confirm(`¿Asignar el rol ${rol} a "${usuario.nombre_completo}"?`)) {
      return;
    }
    this.procesandoId.set(usuario.id);
    this.error.set('');
    this.mensaje.set('');
    this.api.asignarRolUsuario(usuario.id, rol).subscribe({
      next: actualizado => {
        this.items.update(items => items.map(item => item.id === actualizado.id ? actualizado : item));
        this.rolesSeleccionados[usuario.id] = '';
        this.procesandoId.set(null);
        this.mensaje.set('Rol asignado. Si la persona tiene una sesión abierta, debe volver a iniciar sesión para actualizar sus menús.');
      },
      error: respuesta => {
        this.procesandoId.set(null);
        this.error.set(respuesta?.error?.detail || respuesta?.error?.rol?.[0] || 'No fue posible asignar el rol.');
      }
    });
  }

  readonly tamanoPagina = 10;


  busqueda = '';

  estadoFiltro = '';


  private readonly route = inject(ActivatedRoute);
  mostrarVolverInicio = signal(false);

  ngOnInit(): void {
    this.mostrarVolverInicio.set(this.route.snapshot.queryParamMap.get('origen') === 'inicio');
    this.cargar();
  }


  cargar(): void {

    this.cargando.set(true);
    this.error.set('');

    this.api.usuarios(
      this.pagina(),
      this.busqueda,
      this.estadoFiltro
    ).subscribe({

      next: respuesta => {

        if (
          !respuesta.results.length &&
          this.pagina() > 1
        ) {
          this.pagina.update(
            valor => valor - 1
          );

          this.cargar();

          return;
        }

        this.items.set(
          respuesta.results
        );

        this.total.set(
          respuesta.count
        );

        this.tieneAnterior.set(
          !!respuesta.previous
        );

        this.tieneSiguiente.set(
          !!respuesta.next
        );

        this.cargando.set(false);
      },

      error: respuesta => {

        this.items.set([]);

        this.total.set(0);

        this.error.set(
          respuesta?.error?.detail ||
          'No fue posible cargar los usuarios.'
        );

        this.cargando.set(false);
      }
    });
  }


  aplicarFiltros(): void {

    this.pagina.set(1);

    this.mensaje.set('');

    this.cargar();
  }


  limpiarFiltros(): void {

    this.busqueda = '';

    this.estadoFiltro = '';

    this.pagina.set(1);

    this.mensaje.set('');

    this.cargar();
  }


  paginaAnterior(): void {

    if (
      !this.tieneAnterior() ||
      this.cargando()
    ) {
      return;
    }

    this.pagina.update(
      valor => valor - 1
    );

    this.cargar();
  }


  paginaSiguiente(): void {

    if (
      !this.tieneSiguiente() ||
      this.cargando()
    ) {
      return;
    }

    this.pagina.update(
      valor => valor + 1
    );

    this.cargar();
  }


  totalPaginas(): number {

    return Math.max(
      1,
      Math.ceil(
        this.total() /
        this.tamanoPagina
      )
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
      | 'ACTIVO'
      | 'BLOQUEADO'
      | 'INACTIVO'
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

    this.api
      .cambiarEstadoUsuario(
        usuario.id,
        nuevoEstado
      )
      .subscribe({

        next: () => {

          this.mensaje.set(
            'Estado del usuario actualizado correctamente.'
          );

          this.procesandoId.set(
            null
          );

          this.cargar();
        },

        error: respuesta => {

          this.error.set(
            respuesta?.error?.detail ||
            'No fue posible cambiar el estado del usuario.'
          );

          this.procesandoId.set(
            null
          );

          this.cargar();
        }
      });
  }
}