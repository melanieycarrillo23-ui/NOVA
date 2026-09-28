import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Evento } from '../../models/models';
import { EventosService } from '../../services/eventos.service';

@Component({
  selector: 'app-explorar-eventos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],
  templateUrl: './explorar-eventos.component.html',
  styleUrl: './explorar-eventos.component.css'
})
export class ExplorarEventosComponent implements OnInit {

  private readonly api = inject(EventosService);

  eventos = signal<Evento[]>([]);
  busqueda = signal('');

  cargando = signal(true);
  error = signal('');

  filtrados = computed(() => {
    const termino = this.normalizar(
      this.busqueda()
    );

    const eventosOrdenados = [...this.eventos()]
      .sort(
        (a, b) =>
          new Date(
            a.fecha_hora_inicio
          ).getTime() -
          new Date(
            b.fecha_hora_inicio
          ).getTime()
      );

    if (!termino) {
      return eventosOrdenados;
    }

    return eventosOrdenados.filter(evento => {
      const valores = [
        evento.nombre,
        evento.categoria_nombre,
        evento.lugar_nombre,
        evento.modalidad
      ];

      return valores.some(valor =>
        this.normalizar(
          valor ?? ''
        ).includes(termino)
      );
    });
  });

  ngOnInit(): void {
    this.cargarEventos();
  }

  actualizarBusqueda(valor: string): void {
    this.busqueda.set(valor);
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

  private cargarEventos(): void {
    this.cargando.set(true);
    this.error.set('');

    this.api.listarEventos().subscribe({
      next: respuesta => {
        this.eventos.set(respuesta.results);
        this.cargando.set(false);
      },
      error: () => {
        this.eventos.set([]);
        this.error.set(
          'No fue posible cargar los eventos.'
        );
        this.cargando.set(false);
      }
    });
  }

  private normalizar(valor: string): string {
    return valor
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}