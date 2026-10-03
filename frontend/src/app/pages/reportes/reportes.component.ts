import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ActivatedRoute,
  Router
} from '@angular/router';

import {
  Evento,
  ReporteEvento
} from '../../models/models';

import { AuthService } from '../../services/auth.service';
import { EventosService } from '../../services/eventos.service';


@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './reportes.component.html',
  styleUrl: './reportes.component.css'
})
export class ReportesComponent implements OnInit {

  private readonly api = inject(EventosService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  eventos = signal<Evento[]>([]);

  reporte =
    signal<ReporteEvento | null>(null);

  eventoId: number | null = null;

  cargando = signal(false);
  error = signal('');

  mostrarVolverInicio = false;
  mostrarVolverMisEventos = false;


  ngOnInit(): void {

    const origen =
      this.route.snapshot
        .queryParamMap
        .get('origen');

    this.mostrarVolverInicio =
      origen === 'inicio';

    this.mostrarVolverMisEventos =
      origen === 'mis-eventos';

    this.cargarEventos();
  }


  volver(): void {

    if (this.mostrarVolverInicio) {

      this.router.navigate([
        '/dashboard'
      ]);

      return;
    }

    if (this.mostrarVolverMisEventos) {

      this.router.navigate([
        '/mis-eventos'
      ]);
    }
  }


  cargarEventos(): void {

    this.error.set('');

    if (this.auth.tieneRol('ADMIN')) {

      this.api.listarEventos().subscribe({

        next: respuesta => {

          this.eventos.set(
            respuesta.results
          );

          this.seleccionarDesdeUrl();
        },

        error: () => {

          this.error.set(
            'No fue posible cargar los eventos.'
          );
        }
      });

      return;
    }

    this.api.misEventos().subscribe({

      next: respuesta => {

        this.eventos.set(
          respuesta
        );

        this.seleccionarDesdeUrl();
      },

      error: () => {

        this.error.set(
          'No fue posible cargar tus eventos.'
        );
      }
    });
  }


  seleccionarDesdeUrl(): void {

    const id = Number(
      this.route.snapshot
        .queryParamMap
        .get('evento')
    );

    if (id > 0) {

      this.eventoId = id;

      this.consultar();
    }
  }


  consultar(): void {

    if (!this.eventoId) {
      return;
    }

    this.cargando.set(true);
    this.error.set('');
    this.reporte.set(null);

    this.api.reporte(
      this.eventoId
    ).subscribe({

      next: respuesta => {

        this.reporte.set(
          respuesta
        );

        this.cargando.set(false);
      },

      error: respuesta => {

        this.error.set(
          respuesta?.error?.detail ||
          'No fue posible generar el reporte.'
        );

        this.cargando.set(false);
      }
    });
  }


  porcentajeTipo(
    usadas: number,
    emitidas: number
  ): number {

    if (!emitidas) {
      return 0;
    }

    return Math.min(
      (usadas / emitidas) * 100,
      100
    );
  }
}