import { CommonModule } from '@angular/common';

import {
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal
} from '@angular/core';

import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { Entrada } from '../../models/models';
import { EventosService } from '../../services/eventos.service';


@Component({
  selector: 'app-mis-entradas',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink
  ],
  templateUrl: './mis-entradas.component.html',
  styleUrl: './mis-entradas.component.css'
})
export class MisEntradasComponent
  implements OnInit, OnDestroy {

  private readonly api =
    inject(EventosService);

  items = signal<Entrada[]>([]);

  cargando = signal(true);

  cargandoId =
    signal<number | null>(null);

  errorGeneral = signal('');

  qrUrls: Record<number, string> = {};

  codigosPublicos:
    Record<number, string> = {};

  erroresAcceso:
    Record<number, string> = {};


  entradasOrdenadas = computed(() => {

    return [...this.items()].sort(
      (a, b) => {

        const prioridad =
          this.prioridadEstado(a.estado) -
          this.prioridadEstado(b.estado);

        if (prioridad !== 0) {
          return prioridad;
        }

        return (
          new Date(
            b.emitida_en
          ).getTime() -
          new Date(
            a.emitida_en
          ).getTime()
        );
      }
    );
  });


  ngOnInit(): void {

    this.cargarEntradas();
  }


  cargarAcceso(
    id: number
  ): void {

    if (
      this.qrUrls[id] &&
      this.codigosPublicos[id]
    ) {
      return;
    }

    this.cargandoId.set(id);

    this.erroresAcceso[id] = '';

    forkJoin({

      qr:
        this.api.qrBlob(id),

      codigo:
        this.api.codigoValidacion(id)

    }).subscribe({

      next: respuesta => {

        this.qrUrls[id] =
          URL.createObjectURL(
            respuesta.qr
          );

        this.codigosPublicos[id] =
          respuesta.codigo.codigo_publico;

        this.cargandoId.set(null);
      },

      error: respuesta => {

        this.erroresAcceso[id] =
          respuesta?.error?.detail ||
          'No fue posible cargar la entrada.';

        this.cargandoId.set(null);
      }
    });
  }


  formatearFecha(
    fecha: string
  ): string {

    return new Intl.DateTimeFormat(
      'es-CO',
      {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }
    ).format(
      new Date(fecha)
    );
  }


  claseEstado(
    estado: string
  ): string {

    switch (estado) {

      case 'ACTIVA':
        return 'status-active';

      case 'UTILIZADA':
        return 'status-used';

      case 'CANCELADA':
        return 'status-cancelled';

      case 'EXPIRADA':
        return 'status-expired';

      default:
        return 'status-neutral';
    }
  }


  textoEstado(
    estado: string
  ): string {

    return estado;
  }


  ngOnDestroy(): void {

    Object.values(
      this.qrUrls
    ).forEach(url => {

      URL.revokeObjectURL(
        url
      );
    });
  }


  private cargarEntradas(): void {

    this.cargando.set(true);
    this.errorGeneral.set('');

    this.api
      .misEntradas()
      .subscribe({

        next: respuesta => {

          this.items.set(
            respuesta
          );

          this.cargando.set(false);
        },

        error: () => {

          this.items.set([]);

          this.errorGeneral.set(
            'No fue posible cargar tus entradas.'
          );

          this.cargando.set(false);
        }
      });
  }


  private prioridadEstado(
    estado: string
  ): number {

    switch (estado) {

      case 'ACTIVA':
        return 1;

      case 'UTILIZADA':
        return 2;

      case 'CANCELADA':
        return 3;

      case 'EXPIRADA':
        return 4;

      default:
        return 5;
    }
  }
}