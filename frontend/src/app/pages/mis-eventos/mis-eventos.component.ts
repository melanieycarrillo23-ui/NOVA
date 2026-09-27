import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { Evento } from '../../models/models';
import { EventosService } from '../../services/eventos.service';

@Component({
  selector: 'app-mis-eventos',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink
  ],
  template: `
    <div class="row between wrap">

      <div>
        <h1 class="page-title">
          Mis eventos
        </h1>

        <p class="page-subtitle">
          Eventos que administras como organizador.
        </p>
      </div>

      <a
        routerLink="/crear-evento"
        class="btn btn-primary"
      >
        Crear evento
      </a>

    </div>

    <div
      class="error"
      *ngIf="error()"
      style="margin-bottom: 16px"
    >
      {{ error() }}
    </div>

    <div class="grid grid-3">

      <div
        class="card event-card"
        *ngFor="let evento of items()"
      >

        <div class="event-top">

          <span class="badge">
            {{ evento.estado }}
          </span>

          <span class="muted">
            #{{ evento.id }}
          </span>

        </div>

        <h3>
          {{ evento.nombre }}
        </h3>

        <p class="secondary">
          {{ evento.descripcion_corta }}
        </p>

        <div class="event-meta">

          <span>
            {{ evento.fecha_hora_inicio | date:'medium' }}
          </span>

          <span>
            {{ evento.lugar_nombre || evento.modalidad }}
          </span>

        </div>

        <div
          class="row wrap"
          style="margin-top: 16px"
        >

          <a
            class="btn btn-secondary"
            routerLink="/administrar-evento"
            [queryParams]="{ evento: evento.id }"
          >
            Administrar
          </a>

          <a
            class="btn btn-ghost"
            routerLink="/reportes"
            [queryParams]="{ evento: evento.id }"
          >
            Reporte
          </a>

          <a
            class="btn btn-ghost"
            [routerLink]="['/eventos', evento.id]"
          >
            Ver
          </a>

        </div>

      </div>

    </div>

    <div
      class="empty"
      *ngIf="!items().length && !error()"
    >
      No administras eventos todavía.
    </div>
  `
})
export class MisEventosComponent implements OnInit {

  api = inject(EventosService);

  items = signal<Evento[]>([]);
  error = signal('');

  ngOnInit(): void {

    this.api.misEventos().subscribe({
      next: respuesta => {
        this.items.set(respuesta);
      },

      error: () => {
        this.error.set(
          'No fue posible cargar tus eventos.'
        );
      }
    });
  }
}