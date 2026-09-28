import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { Inscripcion } from '../../models/models';
import { EventosService } from '../../services/eventos.service';

@Component({
  selector: 'app-mis-inscripciones',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink
  ],
  templateUrl: './mis-inscripciones.component.html',
  styleUrl: './mis-inscripciones.component.css'
})
export class MisInscripcionesComponent implements OnInit {

  private readonly api = inject(EventosService);

  items = signal<Inscripcion[]>([]);
  cargando = signal(true);
  procesandoId = signal<number | null>(null);

  mensaje = signal('');
  error = signal('');

  ngOnInit(): void {
    this.cargar();
  }

  cancelar(inscripcion: Inscripcion): void {
    const confirmar = window.confirm(
      `¿Deseas cancelar tu inscripción a "${inscripcion.evento_nombre}"?`
    );

    if (!confirmar) {
      return;
    }

    this.mensaje.set('');
    this.error.set('');
    this.procesandoId.set(inscripcion.id);

    this.api
      .cancelarInscripcion(inscripcion.id)
      .subscribe({
        next: respuesta => {
          this.mensaje.set(
            respuesta.detail ||
            'Inscripción cancelada correctamente.'
          );

          this.procesandoId.set(null);
          this.cargar();
        },
        error: respuesta => {
          this.error.set(
            respuesta?.error?.detail ||
            'No fue posible cancelar la inscripción.'
          );

          this.procesandoId.set(null);
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
      case 'CONFIRMADA':
        return 'status-confirmed';

      case 'CANCELADA':
        return 'status-cancelled';

      default:
        return '';
    }
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set('');

    this.api.misInscripciones().subscribe({
      next: respuesta => {
        this.items.set(respuesta);
        this.cargando.set(false);
      },
      error: () => {
        this.items.set([]);

        this.error.set(
          'No fue posible cargar tus inscripciones.'
        );

        this.cargando.set(false);
      }
    });
  }
}