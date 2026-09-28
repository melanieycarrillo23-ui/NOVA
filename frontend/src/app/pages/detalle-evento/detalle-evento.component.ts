import { CommonModule, Location } from '@angular/common';
import {
  Component,
  inject,
  OnInit,
  signal
} from '@angular/core';
import {
  ActivatedRoute
} from '@angular/router';
import { forkJoin } from 'rxjs';

import {
  Evento,
  TipoEntrada
} from '../../models/models';

import { EventosService } from '../../services/eventos.service';

@Component({
  selector: 'app-detalle-evento',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './detalle-evento.component.html',
  styleUrl: './detalle-evento.component.css'
})
export class DetalleEventoComponent implements OnInit {

  private readonly api = inject(EventosService);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);

  evento = signal<Evento | null>(null);
  tipos = signal<TipoEntrada[]>([]);

  cargando = signal(true);
  errorCarga = signal('');

  mensaje = signal('');
  error = signal('');
  

  ngOnInit(): void {
    const id = Number(
      this.route.snapshot.paramMap.get('id')
    );

    if (!id) {
      this.errorCarga.set(
        'No fue posible identificar el evento.'
      );
      this.cargando.set(false);
      return;
    }

    this.cargarEvento(id);
  }

  inscribirme(tipoId: number): void {
    const evento = this.evento();

    if (!evento) {
      return;
    }

    this.mensaje.set('');
    this.error.set('');

    this.api.inscribirse(
      evento.id,
      tipoId
    ).subscribe({
      next: () => {
        this.mensaje.set(
          'Inscripción confirmada. Tu entrada ya está disponible en Mis entradas.'
        );
      },
      error: respuesta => {
        this.error.set(
          respuesta?.error?.detail ||
          'No fue posible completar la inscripción.'
        );
      }
    });
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

  formatearPrecio(
    precio: string | number
  ): string {

    const valor = Number(precio);

    if (valor === 0) {
      return 'Gratis';
    }

    return new Intl.NumberFormat(
      'es-CO',
      {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
      }
    ).format(valor);
  }

  volver(): void {
    this.location.back();
  }

  private cargarEvento(id: number): void {
    this.cargando.set(true);
    this.errorCarga.set('');

    forkJoin({
      evento: this.api.verEvento(id),
      tipos: this.api.tiposEntrada(id)
    }).subscribe({
      next: respuesta => {

        this.evento.set(
          respuesta.evento
        );

        this.tipos.set(
          respuesta.tipos.results.filter(
            tipo =>
              tipo.evento === id &&
              tipo.estado === 'ACTIVO'
          )
        );

        this.cargando.set(false);
      },
      error: () => {
        this.errorCarga.set(
          'No fue posible cargar la información del evento.'
        );

        this.cargando.set(false);
      }
    });
  }
}