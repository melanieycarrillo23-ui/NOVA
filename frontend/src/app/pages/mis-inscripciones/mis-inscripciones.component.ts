import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { Inscripcion } from '../../models/models';
import { EventosService } from '../../services/eventos.service';

@Component({
  selector: 'app-mis-inscripciones',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink
  ],
  template: `
    <h1 class="page-title">
      Mis inscripciones
    </h1>

    <p class="page-subtitle">
      Eventos en los que participas con tu cuenta.
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

    <div class="card table-wrap">

      <table class="table">
        <thead>
          <tr>
            <th>Evento</th>
            <th>Estado</th>
            <th>Fecha de inscripción</th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          <tr *ngFor="let inscripcion of items()">

            <td>
              {{ inscripcion.evento_nombre }}
            </td>

            <td>
              <span class="badge">
                {{ inscripcion.estado }}
              </span>
            </td>

            <td>
              {{ inscripcion.inscrito_en | date:'medium' }}
            </td>

            <td>
              <div class="row wrap">

                <a
                  [routerLink]="[
                    '/eventos',
                    inscripcion.evento
                  ]"
                  class="chip"
                >
                  Ver evento
                </a>

                <button
                  *ngIf="inscripcion.estado === 'CONFIRMADA'"
                  class="btn btn-ghost"
                  [disabled]="procesandoId() === inscripcion.id"
                  (click)="cancelar(inscripcion)"
                >
                  {{
                    procesandoId() === inscripcion.id
                      ? 'Cancelando...'
                      : 'Cancelar'
                  }}
                </button>

              </div>
            </td>

          </tr>
        </tbody>
      </table>

      <div
        class="empty"
        *ngIf="!items().length"
      >
        Todavía no tienes inscripciones.
      </div>

    </div>
  `
})
export class MisInscripcionesComponent implements OnInit {

  api = inject(EventosService);

  items = signal<Inscripcion[]>([]);

  procesandoId = signal<number | null>(null);

  mensaje = signal('');
  error = signal('');

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.api.misInscripciones().subscribe({
      next: respuesta => {
        this.items.set(respuesta);
      },
      error: () => {
        this.error.set(
          'No fue posible cargar tus inscripciones.'
        );
      }
    });
  }

  cancelar(inscripcion: Inscripcion): void {

    const confirmar = window.confirm(
      `¿Deseas cancelar tu inscripción a "${inscripcion.evento_nombre}"?`
    );

    if (!confirmar) {
      return;
    }

    this.mensaje.set('');
    this.error.set('');
    this.procesandoId.set(inscripcion.id);

    this.api.cancelarInscripcion(
      inscripcion.id
    ).subscribe({
      next: respuesta => {

        this.mensaje.set(
          respuesta.detail ||
          'Inscripción cancelada correctamente.'
        );

        this.procesandoId.set(null);

        this.cargar();
      },

      error: respuesta => {

        this.error.set(
          respuesta?.error?.detail ||
          'No fue posible cancelar la inscripción.'
        );

        this.procesandoId.set(null);
      }
    });
  }
}