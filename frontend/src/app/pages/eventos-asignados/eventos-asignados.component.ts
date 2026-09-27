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
  selector: 'app-eventos-asignados',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink
  ],
  template: `
    <h1 class="page-title">
      Eventos asignados
    </h1>

    <p class="page-subtitle">
      Eventos en los que tienes funciones operativas.
    </p>

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
        <div class="row between wrap">
          <span class="badge">
            EQUIPO
          </span>

          <span class="badge green">
            {{ evento.estado }}
          </span>
        </div>

        <h3>
          {{ evento.nombre }}
        </h3>

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
            routerLink="/validar-qr"
            [queryParams]="{ evento: evento.id }"
          >
            Validar QR
          </a>

          <a
            class="btn btn-ghost"
            routerLink="/asistentes"
            [queryParams]="{ evento: evento.id }"
          >
            Asistentes
          </a>
        </div>
      </div>

    </div>

    <div
      class="empty"
      *ngIf="!items().length && !error()"
    >
      No tienes eventos asignados.
    </div>
  `
})
export class EventosAsignadosComponent implements OnInit {

  api = inject(EventosService);

  items = signal<Evento[]>([]);
  error = signal('');

  ngOnInit(): void {

    this.api.eventosAsignados().subscribe({
      next: respuesta => {
        this.items.set(respuesta);
      },

      error: () => {
        this.error.set(
          'No fue posible cargar tus eventos asignados.'
        );
      }
    });
  }
}
