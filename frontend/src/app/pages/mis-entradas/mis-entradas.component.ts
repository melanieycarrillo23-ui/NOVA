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
export class MisEntradasComponent implements OnInit, OnDestroy {

  private readonly api = inject(EventosService);

  items = signal<Entrada[]>([]);

  cargando = signal(true);
  cargandoId = signal<number | null>(null);

  errorGeneral = signal('');

  qrUrls: Record<number, string> = {};
  erroresQr: Record<number, string> = {};

  entradasOrdenadas = computed(() => {
    return [...this.items()].sort((a, b) => {

      const prioridad =
        this.prioridadEstado(a.estado) -
        this.prioridadEstado(b.estado);

      if (prioridad !== 0) {
        return prioridad;
      }

      return (
        new Date(b.emitida_en).getTime() -
        new Date(a.emitida_en).getTime()
      );
    });
  });

  ngOnInit(): void {
    this.cargarEntradas();
  }

  cargarQr(id: number): void {

    if (this.qrUrls[id]) {
      return;
    }

    this.cargandoId.set(id);
    this.erroresQr[id] = '';

    this.api.qrBlob(id).subscribe({
      next: blob => {

        this.qrUrls[id] =
          URL.createObjectURL(blob);

        this.cargandoId.set(null);
      },

      error: respuesta => {

        this.erroresQr[id] =
          respuesta?.error?.detail ||
          'No fue posible generar el código QR.';

        this.cargandoId.set(null);
      }
    });
  }

  formatearFecha(fecha: string): string {
    return new Intl.DateTimeFormat(
      'es-CO',
      {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }
    ).format(new Date(fecha));
  }

  claseEstado(estado: string): string {

    switch (estado) {

      case 'ACTIVA':
        return 'status-active';

      case 'UTILIZADA':
        return 'status-used';

      case 'CANCELADA':
        return 'status-cancelled';

      default:
        return 'status-neutral';
    }
  }

  textoEstado(estado: string): string {

    switch (estado) {

      case 'ACTIVA':
        return 'ACTIVA';

      case 'UTILIZADA':
        return 'UTILIZADA';

      case 'CANCELADA':
        return 'CANCELADA';

      default:
        return estado;
    }
  }

  ngOnDestroy(): void {

    Object.values(
      this.qrUrls
    ).forEach(url => {
      URL.revokeObjectURL(url);
    });
  }

  private cargarEntradas(): void {

    this.cargando.set(true);
    this.errorGeneral.set('');

    this.api.misEntradas().subscribe({
      next: respuesta => {

        this.items.set(respuesta);

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

      default:
        return 4;
    }
  }
}