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
  templateUrl: './mis-eventos.component.html',
  styleUrl: './mis-eventos.component.css'
})
export class MisEventosComponent implements OnInit {

  private readonly api = inject(EventosService);

  items = signal<Evento[]>([]);
  cargando = signal(true);
  error = signal('');

  ngOnInit(): void {
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

  claseEstado(estado: string): string {

    switch (estado) {
      case 'PUBLICADO':
        return 'status-published';

      case 'BORRADOR':
        return 'status-draft';

      case 'CANCELADO':
        return 'status-cancelled';

      case 'FINALIZADO':
        return 'status-finished';

      default:
        return '';
    }
  }

  private cargarEventos(): void {

    this.cargando.set(true);
    this.error.set('');

    this.api.misEventos().subscribe({

      next: respuesta => {

        const ordenados = [...respuesta].sort(
          (a, b) =>
            new Date(a.fecha_hora_inicio).getTime() -
            new Date(b.fecha_hora_inicio).getTime()
        );

        this.items.set(ordenados);
        this.cargando.set(false);
      },

      error: () => {

        this.items.set([]);

        this.error.set(
          'No fue posible cargar tus eventos.'
        );

        this.cargando.set(false);
      }
    });
  }
}