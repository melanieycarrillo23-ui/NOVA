import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ActivatedRoute,
  RouterLink
} from '@angular/router';

import {
  Evento,
  MiembroEquipoEvento,
  ReporteEvento,
  RolEquipoCodigo,
  TipoEntrada,
  UsuarioEquipoBusqueda
} from '../../models/models';

import { EventosService } from '../../services/eventos.service';

@Component({
  selector: 'app-administrar-evento',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],
  templateUrl: './administrar-evento.component.html',
  styleUrl: './administrar-evento.component.css'
})
export class AdministrarEventoComponent implements OnInit {

  private readonly api = inject(EventosService);
  private readonly route = inject(ActivatedRoute);

  eventos = signal<Evento[]>([]);

  reporte = signal<ReporteEvento | null>(null);

  eventoId: number | null = null;

  cargando = signal(false);
  error = signal('');

  mostrarVolverMisEventos = signal(false);

  edicionEvento = {
    nombre: '',
    descripcion_corta: '',
    descripcion: '',
    modalidad: 'PRESENCIAL' as Evento['modalidad'],
    fecha_hora_inicio: '',
    fecha_hora_fin: '',
    capacidad: null as number | null,
    visibilidad: 'PUBLICO' as Evento['visibilidad'],
    estado: 'BORRADOR' as Evento['estado']
  };

  guardandoEvento = signal(false);
  mensajeEvento = signal('');
  errorEvento = signal('');

  tipos = signal<TipoEntrada[]>([]);

  tipoEditandoId = signal<number | null>(null);

  nuevoTipo = {
    nombre: '',
    descripcion: '',
    precio: 0,
    cupo: null as number | null,
    inicio_disponibilidad: '',
    fin_disponibilidad: '',
    estado: 'ACTIVO' as 'ACTIVO' | 'INACTIVO'
  };

  mensajeTipo = signal('');
  errorTipo = signal('');
  guardandoTipo = signal(false);

  equipo = signal<MiembroEquipoEvento[]>([]);

  correoEquipo = '';

  rolEquipo: RolEquipoCodigo = 'STAFF';

  usuarioEncontrado =
    signal<UsuarioEquipoBusqueda | null>(null);

  buscandoEquipo = signal(false);
  guardandoEquipo = signal(false);

  mensajeEquipo = signal('');
  errorEquipo = signal('');

  ngOnInit(): void {

    this.mostrarVolverMisEventos.set(
      this.route.snapshot.queryParamMap.get('origen') ===
        'mis-eventos'
    );

    this.api.misEventos().subscribe({

      next: respuesta => {

        this.eventos.set(respuesta);

        const id = Number(
          this.route.snapshot
            .queryParamMap
            .get('evento')
        );

        if (id > 0) {
          this.eventoId = id;
          this.cargar();
        }
      },

      error: () => {
        this.error.set(
          'No fue posible cargar tus eventos.'
        );
      }
    });
  }

  cargar(): void {

    if (!this.eventoId) {
      return;
    }

    this.cargando.set(true);
    this.error.set('');
    this.reporte.set(null);

    this.api.reporte(
      this.eventoId
    ).subscribe({

      next: respuesta => {

        this.reporte.set(respuesta);

        this.cargarDatosEvento();
        this.cargarTiposEntrada();
        this.cargarEquipo();

        this.cargando.set(false);
      },

      error: respuesta => {

        this.error.set(
          respuesta?.error?.detail ||
          'No fue posible cargar el panel del evento.'
        );

        this.cargando.set(false);
      }
    });
  }

  cargarDatosEvento(): void {

    if (!this.eventoId) {
      return;
    }

    this.api.verEvento(
      this.eventoId
    ).subscribe({

      next: evento => {

        this.edicionEvento = {
          nombre: evento.nombre,

          descripcion_corta:
            evento.descripcion_corta || '',

          descripcion:
            evento.descripcion || '',

          modalidad:
            evento.modalidad,

          fecha_hora_inicio:
            this.fechaParaInput(
              evento.fecha_hora_inicio
            ),

          fecha_hora_fin:
            this.fechaParaInput(
              evento.fecha_hora_fin
            ),

          capacidad:
            evento.capacidad ?? null,

          visibilidad:
            evento.visibilidad,

          estado:
            evento.estado
        };
      },

      error: () => {

        this.errorEvento.set(
          'No fue posible cargar los datos del evento.'
        );
      }
    });
  }

  guardarEvento(): void {

    if (!this.eventoId) {
      return;
    }

    if (!this.edicionEvento.nombre.trim()) {

      this.errorEvento.set(
        'El nombre del evento es obligatorio.'
      );

      return;
    }

    const inicio = new Date(
      this.edicionEvento.fecha_hora_inicio
    );

    const fin = new Date(
      this.edicionEvento.fecha_hora_fin
    );

    if (
      Number.isNaN(inicio.getTime()) ||
      Number.isNaN(fin.getTime())
    ) {

      this.errorEvento.set(
        'Debes indicar fechas válidas.'
      );

      return;
    }

    if (fin <= inicio) {

      this.errorEvento.set(
        'La fecha de finalización debe ser posterior a la fecha de inicio.'
      );

      return;
    }

    this.guardandoEvento.set(true);
    this.mensajeEvento.set('');
    this.errorEvento.set('');

    this.api.actualizarEvento(
      this.eventoId,
      {
        nombre:
          this.edicionEvento.nombre.trim(),

        descripcion_corta:
          this.edicionEvento.descripcion_corta.trim(),

        descripcion:
          this.edicionEvento.descripcion.trim(),

        modalidad:
          this.edicionEvento.modalidad,

        fecha_hora_inicio:
          inicio.toISOString(),

        fecha_hora_fin:
          fin.toISOString(),

        capacidad:
          this.edicionEvento.capacidad,

        visibilidad:
          this.edicionEvento.visibilidad,

        estado:
          this.edicionEvento.estado
      }
    ).subscribe({

      next: actualizado => {

        this.mensajeEvento.set(
          'Evento actualizado correctamente.'
        );

        this.guardandoEvento.set(false);

        this.eventos.update(
          eventos =>
            eventos.map(
              evento =>
                evento.id === actualizado.id
                  ? actualizado
                  : evento
            )
        );

        this.cargar();
      },

      error: respuesta => {

        this.errorEvento.set(
          respuesta?.error?.detail ||
          JSON.stringify(respuesta?.error) ||
          'No fue posible actualizar el evento.'
        );

        this.guardandoEvento.set(false);
      }
    });
  }

  cargarTiposEntrada(): void {

    if (!this.eventoId) {
      return;
    }

    this.api.tiposEntrada(
      this.eventoId
    ).subscribe({

      next: respuesta => {

        this.tipos.set(
          respuesta.results
        );
      },

      error: () => {
        this.tipos.set([]);
      }
    });
  }

  crearTipoEntrada(): void {

    if (!this.eventoId) {
      return;
    }

    if (!this.nuevoTipo.nombre.trim()) {

      this.errorTipo.set(
        'Debes indicar un nombre para el tipo de entrada.'
      );

      return;
    }

    this.guardandoTipo.set(true);
    this.errorTipo.set('');
    this.mensajeTipo.set('');

    this.api.crearTipoEntrada({

      evento:
        this.eventoId,

      nombre:
        this.nuevoTipo.nombre.trim(),

      descripcion:
        this.nuevoTipo.descripcion.trim(),

      precio:
        this.nuevoTipo.precio,

      cupo:
        this.nuevoTipo.cupo,

      inicio_disponibilidad:
        this.convertirFecha(
          this.nuevoTipo.inicio_disponibilidad
        ),

      fin_disponibilidad:
        this.convertirFecha(
          this.nuevoTipo.fin_disponibilidad
        ),

      estado:
        this.nuevoTipo.estado

    }).subscribe({

      next: () => {

        this.mensajeTipo.set(
          'Tipo de entrada creado correctamente.'
        );

        this.nuevoTipo = {
          nombre: '',
          descripcion: '',
          precio: 0,
          cupo: null,
          inicio_disponibilidad: '',
          fin_disponibilidad: '',
          estado: 'ACTIVO'
        };

        this.guardandoTipo.set(false);

        this.cargarTiposEntrada();
      },

      error: respuesta => {

        this.errorTipo.set(
          respuesta?.error?.detail ||
          JSON.stringify(respuesta?.error) ||
          'No fue posible crear el tipo de entrada.'
        );

        this.guardandoTipo.set(false);
      }
    });
  }

  guardarTipoEntrada(
    tipo: TipoEntrada
  ): void {

    this.errorTipo.set('');
    this.mensajeTipo.set('');

    this.api.actualizarTipoEntrada(
      tipo.id,
      {
        nombre:
          tipo.nombre,

        descripcion:
          tipo.descripcion,

        precio:
          tipo.precio,

        cupo:
          tipo.cupo,

        inicio_disponibilidad:
          tipo.inicio_disponibilidad || null,

        fin_disponibilidad:
          tipo.fin_disponibilidad || null,

        estado:
          tipo.estado
      }
    ).subscribe({

      next: () => {

        this.mensajeTipo.set(
          'Tipo de entrada actualizado.'
        );

        this.cargarTiposEntrada();
      },

      error: respuesta => {

        this.errorTipo.set(
          respuesta?.error?.detail ||
          'No fue posible actualizar el tipo de entrada.'
        );
      }
    });
  }

  eliminarTipoEntrada(
    tipo: TipoEntrada
  ): void {

    const confirmar = window.confirm(
      `¿Eliminar el tipo de entrada "${tipo.nombre}"?`
    );

    if (!confirmar) {
      return;
    }

    this.api.eliminarTipoEntrada(
      tipo.id
    ).subscribe({

      next: () => {

        this.mensajeTipo.set(
          'Tipo de entrada eliminado.'
        );

        this.cargarTiposEntrada();
      },

      error: respuesta => {

        this.errorTipo.set(
          respuesta?.error?.detail ||
          'No fue posible eliminar el tipo de entrada.'
        );
      }
    });
  }

  cargarEquipo(): void {

    if (!this.eventoId) {
      return;
    }

    this.api.equipoEvento(
      this.eventoId
    ).subscribe({

      next: respuesta => {

        this.equipo.set(
          respuesta.results
        );
      },

      error: () => {
        this.equipo.set([]);
      }
    });
  }

  buscarUsuarioEquipo(): void {

    if (!this.eventoId) {
      return;
    }

    const correo =
      this.correoEquipo.trim();

    if (!correo) {
      return;
    }

    this.buscandoEquipo.set(true);

    this.errorEquipo.set('');
    this.mensajeEquipo.set('');

    this.usuarioEncontrado.set(null);

    this.api.buscarUsuarioEquipo(
      this.eventoId,
      correo
    ).subscribe({

      next: usuario => {

        this.usuarioEncontrado.set(
          usuario
        );

        this.buscandoEquipo.set(false);
      },

      error: respuesta => {

        this.errorEquipo.set(
          respuesta?.error?.detail ||
          'No se encontró el usuario.'
        );

        this.buscandoEquipo.set(false);
      }
    });
  }

  asignarUsuarioEquipo(): void {

    if (
      !this.eventoId ||
      !this.usuarioEncontrado()
    ) {
      return;
    }

    const usuario =
      this.usuarioEncontrado()!;

    this.guardandoEquipo.set(true);

    this.errorEquipo.set('');
    this.mensajeEquipo.set('');

    this.api.asignarEquipo(
      this.eventoId,
      usuario.correo,
      this.rolEquipo
    ).subscribe({

      next: () => {

        this.mensajeEquipo.set(
          'Usuario asignado correctamente al equipo.'
        );

        this.guardandoEquipo.set(false);

        this.correoEquipo = '';

        this.usuarioEncontrado.set(null);

        this.rolEquipo = 'STAFF';

        this.cargarEquipo();
      },

      error: respuesta => {

        this.errorEquipo.set(
          respuesta?.error?.detail ||
          'No fue posible asignar el usuario.'
        );

        this.guardandoEquipo.set(false);
      }
    });
  }

  esOrganizadorPrincipal(
    miembro: MiembroEquipoEvento
  ): boolean {

    const evento = this.eventos().find(
      item => item.id === this.eventoId
    );

    if (!evento) {
      return false;
    }

    return (
      miembro.usuario === evento.creado_por &&
      miembro.rol_codigo === 'ORGANIZADOR'
    );
  }

  quitarMiembroEquipo(
    miembro: MiembroEquipoEvento
  ): void {

    const confirmar = window.confirm(
      `¿Deseas quitar a "${miembro.usuario_detalle.nombre_completo}" del equipo?`
    );

    if (!confirmar) {
      return;
    }

    this.errorEquipo.set('');
    this.mensajeEquipo.set('');

    this.api.eliminarMiembroEquipo(
      miembro.id
    ).subscribe({

      next: () => {

        this.mensajeEquipo.set(
          'Miembro retirado del equipo.'
        );

        this.cargarEquipo();
      },

      error: respuesta => {

        this.errorEquipo.set(
          respuesta?.error?.detail ||
          'No fue posible retirar al miembro.'
        );
      }
    });
  }

  private fechaParaInput(
    fecha: string
  ): string {

    const valor = new Date(fecha);

    const local = new Date(
      valor.getTime() -
      valor.getTimezoneOffset() * 60000
    );

    return local
      .toISOString()
      .slice(0, 16);
  }

  private convertirFecha(
    valor: string
  ): string | null {

    if (!valor) {
      return null;
    }

    return new Date(
      valor
    ).toISOString();
  }
}