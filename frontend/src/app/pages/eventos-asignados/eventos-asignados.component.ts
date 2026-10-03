import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { Evento } from '../../models/models';
import { EventosService } from '../../services/eventos.service';

@Component({
  selector: 'app-eventos-asignados',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink
  ],
  templateUrl: './eventos-asignados.component.html',
  styleUrl: './eventos-asignados.component.css'
})
export class EventosAsignadosComponent implements OnInit {

  private readonly api = inject(EventosService);
  private readonly route = inject(ActivatedRoute);

  items = signal<Evento[]>([]);
  cargando = signal(true);
  error = signal('');
  mostrarVolverInicio = signal(false);

  ngOnInit(): void {

    this.mostrarVolverInicio.set(
      this.route.snapshot
        .queryParamMap
        .get('origen') === 'inicio'
    );

    this.cargarEventos();
  }

  formatearFecha(fecha: string): string {
    return new Intl.DateTimeFormat(
      'es-CO',
      {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      }
    ).format(new Date(fecha));
  }

  textoModalidad(modalidad: string): string {

    switch (modalidad) {
      case 'PRESENCIAL':
        return 'Presencial';

      case 'VIRTUAL':
        return 'Virtual';

      case 'HIBRIDO':
        return 'Híbrido';

      default:
        return modalidad;
    }
  }

  private cargarEventos(): void {

    this.cargando.set(true);
    this.error.set('');

    this.api.eventosAsignados().subscribe({
      next: respuesta => {

        const eventosOrdenados = [...respuesta].sort(
          (a, b) =>
            new Date(a.fecha_hora_inicio).getTime() -
            new Date(b.fecha_hora_inicio).getTime()
        );

        this.items.set(eventosOrdenados);
        this.cargando.set(false);
      },

      error: () => {

        this.items.set([]);

        this.error.set(
          'No fue posible cargar tus eventos asignados.'
        );

        this.cargando.set(false);
      }
    });
  }
}