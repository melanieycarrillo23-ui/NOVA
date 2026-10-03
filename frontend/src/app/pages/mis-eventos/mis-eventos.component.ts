import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

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
  filtro = signal('TODOS');
  filtros = [
    { valor: 'TODOS', texto: 'Todos' },
    { valor: 'PUBLICADO', texto: 'Publicados vigentes' },
    { valor: 'BORRADOR', texto: 'Borradores' },
    { valor: 'FINALIZADO', texto: 'Finalizados' },
    { valor: 'CANCELADO', texto: 'Cancelados' }
  ];
  visibles = computed(() => this.items().filter(evento =>
    this.filtro() === 'TODOS' || this.estadoVisible(evento) === this.filtro()
  ));

  estadoVisible(evento: Evento): string {
    return evento.estado === 'PUBLICADO' &&
      new Date(evento.fecha_hora_fin).getTime() <= Date.now()
      ? 'FINALIZADO' : evento.estado;
  }

  cargando = signal(true);
  error = signal('');

  private readonly route = inject(ActivatedRoute);
  mostrarVolverInicio = signal(false);

  ngOnInit(): void {
    this.mostrarVolverInicio.set(this.route.snapshot.queryParamMap.get('origen') === 'inicio');
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