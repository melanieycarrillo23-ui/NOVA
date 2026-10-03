import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

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

  private readonly api =
    inject(EventosService);


  eventos =
    signal<Evento[]>([]);

  cargando =
    signal(true);

  error =
    signal('');


  total =
    signal(0);

  pagina =
    signal(1);

  tieneAnterior =
    signal(false);

  tieneSiguiente =
    signal(false);


  busqueda = '';

  modalidad = '';


  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  mostrarVolverInicio = signal(false);

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.mostrarVolverInicio.set(params.get('origen') === 'inicio');
    });

    this.cargarEventos();
  }


  aplicarFiltros(): void {

    this.pagina.set(1);

    this.cargarEventos();
  }


  limpiarFiltros(): void {

    this.busqueda = '';

    this.modalidad = '';

    this.pagina.set(1);

    this.cargarEventos();
  }


  paginaAnterior(): void {

    if (
      !this.tieneAnterior() ||
      this.cargando()
    ) {
      return;
    }

    this.pagina.update(
      valor => valor - 1
    );

    this.cargarEventos();
  }


  paginaSiguiente(): void {

    if (
      !this.tieneSiguiente() ||
      this.cargando()
    ) {
      return;
    }

    this.pagina.update(
      valor => valor + 1
    );

    this.cargarEventos();
  }


  formatearFecha(
    fecha: string
  ): string {

    return new Intl.DateTimeFormat(
      'es-CO',
      {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      }
    ).format(
      new Date(fecha)
    );
  }


  private cargarEventos(): void {

    this.cargando.set(true);

    this.error.set('');


    this.api
      .listarEventos(
        this.pagina(),
        this.busqueda,
        this.modalidad
      )
      .subscribe({

        next: respuesta => {

          if (
            !respuesta.results.length &&
            this.pagina() > 1
          ) {

            this.pagina.update(
              valor => valor - 1
            );

            this.cargarEventos();

            return;
          }

          this.eventos.set(
            respuesta.results
          );

          this.total.set(
            respuesta.count
          );

          this.tieneAnterior.set(
            !!respuesta.previous
          );

          this.tieneSiguiente.set(
            !!respuesta.next
          );

          this.cargando.set(false);
        },

        error: respuesta => {

          this.eventos.set([]);

          this.total.set(0);

          this.error.set(
            respuesta?.error?.detail ||
            'No fue posible cargar los eventos.'
          );

          this.cargando.set(false);
        }
      });
  }
}