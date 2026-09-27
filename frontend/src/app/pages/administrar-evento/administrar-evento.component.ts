import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

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
  template: `
    <h1 class="page-title">
      Administrar evento
    </h1>

    <p class="page-subtitle">
      Gestiona la operación de uno de tus eventos.
    </p>

    <div
      class="card"
      style="margin-bottom: 18px"
    >

      <div class="row wrap">

        <div
          class="field"
          style="flex: 1; min-width: 240px"
        >

          <label>
            Evento
          </label>

          <select [(ngModel)]="eventoId">

            <option [ngValue]="null">
              Selecciona un evento
            </option>

            <option
              *ngFor="let evento of eventos()"
              [ngValue]="evento.id"
            >
              {{ evento.nombre }}
            </option>

          </select>

        </div>

        <button
          class="btn btn-primary"
          style="align-self: end"
          [disabled]="!eventoId || cargando()"
          (click)="cargar()"
        >
          {{
            cargando()
              ? 'Cargando...'
              : 'Abrir panel'
          }}
        </button>

      </div>

    </div>

    <div
      class="error"
      *ngIf="error()"
      style="margin-bottom: 16px"
    >
      {{ error() }}
    </div>

    <div
      *ngIf="reporte() as r"
      class="stack"
    >

      <div class="card">

        <div class="row between wrap">

          <div>

            <span class="badge">
              Evento #{{ r.evento.id }}
            </span>

            <h2 style="margin-top: 8px">
              {{ r.evento.nombre }}
            </h2>

          </div>

          <span class="badge green">
            {{ r.porcentaje_asistencia }}% asistencia
          </span>

        </div>

      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h3>Información del evento</h3>

            <p class="secondary">
              Modifica los datos principales del evento.
            </p>
          </div>
        </div>

        <div
          class="notice"
          *ngIf="mensajeEvento()"
          style="margin-bottom: 14px"
        >
          {{ mensajeEvento() }}
        </div>

        <div
          class="error"
          *ngIf="errorEvento()"
          style="margin-bottom: 14px"
        >
          {{ errorEvento() }}
        </div>

        <div class="stack">

          <div class="field">
            <label>Nombre</label>
            <input [(ngModel)]="edicionEvento.nombre">
          </div>

          <div class="field">
            <label>Descripción corta</label>
            <input [(ngModel)]="edicionEvento.descripcion_corta">
          </div>

          <div class="field">
            <label>Descripción</label>

            <textarea
              rows="4"
              [(ngModel)]="edicionEvento.descripcion"
            ></textarea>
          </div>

          <div class="grid grid-2">

            <div class="field">
              <label>Modalidad</label>

              <select [(ngModel)]="edicionEvento.modalidad">
                <option value="PRESENCIAL">Presencial</option>
                <option value="VIRTUAL">Virtual</option>
                <option value="HIBRIDO">Híbrido</option>
              </select>
            </div>

            <div class="field">
              <label>Capacidad</label>

              <input
                type="number"
                min="1"
                [(ngModel)]="edicionEvento.capacidad"
              >
            </div>

          </div>

          <div class="grid grid-2">

            <div class="field">
              <label>Fecha y hora de inicio</label>

              <input
                type="datetime-local"
                [(ngModel)]="edicionEvento.fecha_hora_inicio"
              >
            </div>

            <div class="field">
              <label>Fecha y hora de finalización</label>

              <input
                type="datetime-local"
                [(ngModel)]="edicionEvento.fecha_hora_fin"
              >
            </div>

          </div>

          <div class="grid grid-2">

            <div class="field">
              <label>Visibilidad</label>

              <select [(ngModel)]="edicionEvento.visibilidad">
                <option value="PUBLICO">Público</option>
                <option value="PRIVADO">Privado</option>
              </select>
            </div>

            <div class="field">
              <label>Estado</label>

              <select [(ngModel)]="edicionEvento.estado">
                <option value="BORRADOR">Borrador</option>
                <option value="PUBLICADO">Publicado</option>
                <option value="CANCELADO">Cancelado</option>
                <option value="FINALIZADO">Finalizado</option>
              </select>
            </div>

          </div>

          <button
            class="btn btn-primary"
            [disabled]="guardandoEvento()"
            (click)="guardarEvento()"
          >
            {{
              guardandoEvento()
                ? 'Guardando cambios...'
                : 'Guardar cambios del evento'
            }}
          </button>

        </div>

      </div>



      <div class="grid grid-4">

        <div class="card kpi">
          <div class="kpi-value">
            {{ r.inscritos }}
          </div>
          <div class="kpi-label">
            Inscritos
          </div>
        </div>

        <div class="card kpi">
          <div class="kpi-value">
            {{ r.asistieron }}
          </div>
          <div class="kpi-label">
            Asistieron
          </div>
        </div>

        <div class="card kpi">
          <div class="kpi-value">
            {{ r.ausentes }}
          </div>
          <div class="kpi-label">
            Ausentes
          </div>
        </div>

        <div class="card kpi">
          <div class="kpi-value">
            {{ r.tipos_entrada.length }}
          </div>
          <div class="kpi-label">
            Tipos de entrada
          </div>
        </div>

      </div>

      <div class="grid grid-3">

        <div class="card">

          <h3>Tipos de entrada</h3>

          <p class="secondary">
            Crea y administra las entradas disponibles
            para este evento.
          </p>

          <div
            class="notice"
            *ngIf="mensajeTipo()"
            style="margin-top: 12px"
          >
            {{ mensajeTipo() }}
          </div>

          <div
            class="error"
            *ngIf="errorTipo()"
            style="margin-top: 12px"
          >
            {{ errorTipo() }}
          </div>

          <div
            class="stack"
            style="margin-top: 16px"
          >

            <div class="field">
              <label>Nombre</label>

              <input
                [(ngModel)]="nuevoTipo.nombre"
                placeholder="Ej. General o VIP"
              >
            </div>

            <div class="field">
              <label>Descripción</label>

              <input
                [(ngModel)]="nuevoTipo.descripcion"
              >
            </div>

            <div class="grid grid-2">

              <div class="field">
                <label>Precio</label>

                <input
                  type="number"
                  min="0"
                  [(ngModel)]="nuevoTipo.precio"
                >
              </div>

              <div class="field">
                <label>Cupo</label>

                <input
                  type="number"
                  min="1"
                  [(ngModel)]="nuevoTipo.cupo"
                  placeholder="Sin límite"
                >
              </div>

            </div>

            <div class="grid grid-2">

              <div class="field">
                <label>Disponible desde</label>

                <input
                  type="datetime-local"
                  [(ngModel)]="nuevoTipo.inicio_disponibilidad"
                >
              </div>

              <div class="field">
                <label>Disponible hasta</label>

                <input
                  type="datetime-local"
                  [(ngModel)]="nuevoTipo.fin_disponibilidad"
                >
              </div>

            </div>

            <div class="field">
              <label>Estado</label>

              <select
                [(ngModel)]="nuevoTipo.estado"
              >
                <option value="ACTIVO">
                  Activo
                </option>

                <option value="INACTIVO">
                  Inactivo
                </option>
              </select>
            </div>

            <button
              class="btn btn-primary"
              [disabled]="guardandoTipo()"
              (click)="crearTipoEntrada()"
            >
              {{
                guardandoTipo()
                  ? 'Guardando...'
                  : 'Crear tipo de entrada'
              }}
            </button>

          <div style="margin-top: 26px">
            <h3>Entradas existentes</h3>

            <p class="secondary">
              Tipos de entrada creados para este evento.
            </p>
          </div>

          </div>

          <div
            class="stack"
            style="margin-top: 22px"
          >

          <div
            class="card"
            *ngFor="let tipo of tipos()"
          >

            <!-- VISTA RESUMIDA -->
            <ng-container
              *ngIf="tipoEditandoId() !== tipo.id"
            >

              <div class="row between wrap">

                <div>
                  <h3>
                    {{ tipo.nombre }}
                  </h3>

                  <p class="secondary">
                    {{ tipo.descripcion || 'Sin descripción' }}
                  </p>
                </div>

                <span
                  class="badge"
                  [class.green]="tipo.estado === 'ACTIVO'"
                >
                  {{ tipo.estado }}
                </span>

              </div>

              <div
                class="event-meta"
                style="margin-top: 14px"
              >

                <span>
                  <strong>Precio:</strong>
                  {{ tipo.precio | currency:'COP':'symbol-narrow':'1.0-0' }}
                </span>

                <span>
                  <strong>Cupo:</strong>
                  {{ tipo.cupo || 'Sin límite' }}
                </span>

              </div>

              <div
                class="row wrap"
                style="margin-top: 16px"
              >

                <button
                  class="btn btn-secondary"
                  (click)="tipoEditandoId.set(tipo.id)"
                >
                  Editar
                </button>

                <button
                  class="btn btn-ghost"
                  (click)="eliminarTipoEntrada(tipo)"
                >
                  Eliminar
                </button>

              </div>

            </ng-container>


            <!-- MODO EDICIÓN -->
            <ng-container
              *ngIf="tipoEditandoId() === tipo.id"
            >

              <h3>
                Editar tipo de entrada
              </h3>

              <div
                class="stack"
                style="margin-top: 14px"
              >

                <div class="field">
                  <label>Nombre</label>

                  <input
                    [(ngModel)]="tipo.nombre"
                  >
                </div>

                <div class="field">
                  <label>Descripción</label>

                  <input
                    [(ngModel)]="tipo.descripcion"
                  >
                </div>

                <div class="grid grid-2">

                  <div class="field">
                    <label>Precio</label>

                    <input
                      type="number"
                      min="0"
                      [(ngModel)]="tipo.precio"
                    >
                  </div>

                  <div class="field">
                    <label>Cupo</label>

                    <input
                      type="number"
                      min="1"
                      [(ngModel)]="tipo.cupo"
                    >
                  </div>

                </div>

                <div class="field">
                  <label>Estado</label>

                  <select
                    [(ngModel)]="tipo.estado"
                  >
                    <option value="ACTIVO">
                      Activo
                    </option>

                    <option value="INACTIVO">
                      Inactivo
                    </option>
                  </select>
                </div>

                <div class="row wrap">

                  <button
                    class="btn btn-primary"
                    (click)="guardarTipoEntrada(tipo); tipoEditandoId.set(null)"
                  >
                    Guardar cambios
                  </button>

                  <button
                    class="btn btn-ghost"
                    (click)="tipoEditandoId.set(null); cargarTiposEntrada()"
                  >
                    Cancelar
                  </button>

                </div>

              </div>

            </ng-container>

          </div>



            <div
              class="empty"
              *ngIf="!tipos().length"
            >
              Este evento todavía no tiene tipos de entrada.
            </div>

          </div>

        </div>

        <div class="card">

          <h3>Equipo del evento</h3>

          <p class="secondary">
            Busca usuarios por correo y asígnalos
            como STAFF u ORGANIZADOR.
          </p>

          <div
            class="notice"
            *ngIf="mensajeEquipo()"
            style="margin-top: 12px"
          >
            {{ mensajeEquipo() }}
          </div>

          <div
            class="error"
            *ngIf="errorEquipo()"
            style="margin-top: 12px"
          >
            {{ errorEquipo() }}
          </div>

          <div
            class="stack"
            style="margin-top: 16px"
          >

            <div class="field">
              <label>Correo del usuario</label>

              <input
                type="email"
                [(ngModel)]="correoEquipo"
                placeholder="usuario@correo.com"
              >
            </div>

            <button
              class="btn btn-secondary"
              [disabled]="!correoEquipo.trim() || buscandoEquipo()"
              (click)="buscarUsuarioEquipo()"
            >
              {{
                buscandoEquipo()
                  ? 'Buscando...'
                  : 'Buscar usuario'
              }}
            </button>

          </div>

          <div
            class="card"
            style="margin-top: 16px"
            *ngIf="usuarioEncontrado() as usuario"
          >

            <strong>
              {{ usuario.nombre_completo }}
            </strong>

            <p class="muted">
              {{ usuario.correo }}
            </p>

            <p
              class="secondary"
              *ngIf="usuario.roles_evento.length"
            >
              Roles actuales:
              {{ usuario.roles_evento.join(', ') }}
            </p>

            <div class="field">
              <label>Rol en el evento</label>

              <select [(ngModel)]="rolEquipo">
                <option value="STAFF">
                  STAFF
                </option>

                <option value="ORGANIZADOR">
                  ORGANIZADOR
                </option>
              </select>
            </div>

            <button
              class="btn btn-primary"
              [disabled]="guardandoEquipo()"
              (click)="asignarUsuarioEquipo()"
            >
              {{
                guardandoEquipo()
                  ? 'Asignando...'
                  : 'Asignar al equipo'
              }}
            </button>

          </div>

          <div
            class="stack"
            style="margin-top: 22px"
          >

            <div
              class="card"
              *ngFor="let miembro of equipo()"
            >

              <strong>
                {{ miembro.usuario_detalle.nombre_completo }}
              </strong>

              <div class="muted">
                {{ miembro.usuario_detalle.correo }}
              </div>

              <div
                class="row between wrap"
                style="margin-top: 10px"
              >

                <span class="badge">
                  {{ miembro.rol_codigo }}
                </span>

                <span
                  class="badge"
                  *ngIf="!esOrganizadorPrincipal(miembro)"
                >
                  {{ miembro.rol_codigo }}
                </span>

                <span
                  class="badge green"
                  *ngIf="esOrganizadorPrincipal(miembro)"
                >
                  ORGANIZADOR PRINCIPAL
                </span>

                <button
                  *ngIf="!esOrganizadorPrincipal(miembro)"
                  class="btn btn-ghost"
                  (click)="quitarMiembroEquipo(miembro)"
                >
                  Quitar
                </button>

              </div>

            </div>

            <div
              class="empty"
              *ngIf="!equipo().length"
            >
              Este evento todavía no tiene miembros
              de equipo asignados.
            </div>

          </div>

        </div>

        <div class="card">

          <h3>
            Asistencia
          </h3>

          <p class="secondary">
            Consulta participantes y validaciones
            realizadas.
          </p>

          <a
            class="btn btn-secondary"
            routerLink="/asistentes"
            [queryParams]="{ evento: r.evento.id }"
          >
            Ver asistentes
          </a>

        </div>

      </div>

      <a
        class="btn btn-ghost"
        routerLink="/reportes"
        [queryParams]="{ evento: r.evento.id }"
      >
        Ver reporte completo
      </a>

    </div>

    <div
      class="empty"
      *ngIf="!reporte() && !cargando()"
    >
      Selecciona un evento para abrir su panel.
    </div>
  `
})
export class AdministrarEventoComponent implements OnInit {

  api = inject(EventosService);
  route = inject(ActivatedRoute);

  eventos = signal<Evento[]>([]);

  reporte =
    signal<ReporteEvento | null>(null);

  eventoId: number | null = null;

  cargando = signal(false);
  error = signal('');

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
      evento: this.eventoId,
      nombre: this.nuevoTipo.nombre.trim(),
      descripcion: this.nuevoTipo.descripcion.trim(),
      precio: this.nuevoTipo.precio,
      cupo: this.nuevoTipo.cupo,
      inicio_disponibilidad:
        this.convertirFecha(
          this.nuevoTipo.inicio_disponibilidad
        ),
      fin_disponibilidad:
        this.convertirFecha(
          this.nuevoTipo.fin_disponibilidad
        ),
      estado: this.nuevoTipo.estado
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

  guardarTipoEntrada(tipo: TipoEntrada): void {

    this.errorTipo.set('');
    this.mensajeTipo.set('');

    this.api.actualizarTipoEntrada(
      tipo.id,
      {
        nombre: tipo.nombre,
        descripcion: tipo.descripcion,
        precio: tipo.precio,
        cupo: tipo.cupo,
        inicio_disponibilidad:
          tipo.inicio_disponibilidad || null,
        fin_disponibilidad:
          tipo.fin_disponibilidad || null,
        estado: tipo.estado
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

  eliminarTipoEntrada(tipo: TipoEntrada): void {

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

    return new Date(valor).toISOString();
  }
}