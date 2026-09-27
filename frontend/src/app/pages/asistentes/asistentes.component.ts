import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  catchError,
  forkJoin,
  of
} from 'rxjs';

import {
  Evento,
  Inscripcion
} from '../../models/models';

import { AuthService } from '../../services/auth.service';
import { EventosService } from '../../services/eventos.service';

@Component({
  selector: 'app-asistentes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  template: `
    <h1 class="page-title">
      Asistentes
    </h1>

    <p class="page-subtitle">
      Consulta los participantes inscritos en los eventos
      que tienes autorizado gestionar.
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
          <label>Evento</label>

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
          (click)="buscar()"
        >
          {{
            cargando()
              ? 'Consultando...'
              : 'Consultar asistentes'
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

    <div class="card table-wrap">

      <table
        class="table"
        *ngIf="items().length"
      >
        <thead>
          <tr>
            <th>Participante</th>
            <th>Estado</th>
            <th>Fecha de inscripción</th>
          </tr>
        </thead>

        <tbody>
          <tr
            *ngFor="let inscripcion of items()"
          >
            <td>
              {{ inscripcion.usuario_nombre || 'Usuario' }}
            </td>

            <td>
              <span class="badge">
                {{ inscripcion.estado }}
              </span>
            </td>

            <td>
              {{ inscripcion.inscrito_en | date:'medium' }}
            </td>
          </tr>
        </tbody>
      </table>

      <div
        class="empty"
        *ngIf="!items().length && !cargando()"
      >
        {{
          eventoId
            ? 'No hay asistentes para este evento.'
            : 'Selecciona un evento para consultar sus asistentes.'
        }}
      </div>

    </div>
  `
})
export class AsistentesComponent implements OnInit {

  api = inject(EventosService);
  auth = inject(AuthService);
  route = inject(ActivatedRoute);

  eventos = signal<Evento[]>([]);
  items = signal<Inscripcion[]>([]);

  eventoId: number | null = null;

  cargando = signal(false);
  error = signal('');

  ngOnInit(): void {

    this.cargarEventos();

    const id = Number(
      this.route.snapshot.queryParamMap.get('evento')
    );

    if (id > 0) {
      this.eventoId = id;

      this.buscar();
    }
  }

  cargarEventos(): void {

    if (this.auth.tieneRol('ADMIN')) {

      this.api.listarEventos().subscribe({
        next: respuesta => {
          this.eventos.set(
            respuesta.results
          );
        },

        error: () => {
          this.eventos.set([]);
        }
      });

      return;
    }

    if (this.auth.tieneRol('ORGANIZADOR')) {

      forkJoin({
        propios:
          this.api.misEventos().pipe(
            catchError(() => of([]))
          ),

        asignados:
          this.api.eventosAsignados().pipe(
            catchError(() => of([]))
          )
      }).subscribe(resultado => {

        const todos = [
          ...resultado.propios,
          ...resultado.asignados
        ];

        const unicos = todos.filter(
          (evento, indice, arreglo) =>
            arreglo.findIndex(
              item => item.id === evento.id
            ) === indice
        );

        this.eventos.set(unicos);
      });

      return;
    }

    this.api.eventosAsignados().subscribe({
      next: respuesta => {
        this.eventos.set(respuesta);
      },

      error: () => {
        this.eventos.set([]);
      }
    });
  }

  buscar(): void {

    if (!this.eventoId) {
      return;
    }

    this.cargando.set(true);
    this.error.set('');
    this.items.set([]);

    this.api.asistentes(
      this.eventoId
    ).subscribe({

      next: respuesta => {

        this.items.set(
          respuesta
        );

        this.cargando.set(false);
      },

      error: respuesta => {

        this.error.set(
          respuesta?.error?.detail ||
          'No fue posible consultar los asistentes.'
        );

        this.cargando.set(false);
      }
    });
  }
}