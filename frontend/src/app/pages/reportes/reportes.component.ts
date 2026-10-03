import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
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
  ReporteEvento
} from '../../models/models';

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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly destroyRef = inject(DestroyRef);
  cargandoEventos = signal(false);
  eventos = signal<Array<{ id: number; nombre: string }>>([]);

  reporte =
    signal<ReporteEvento | null>(null);

  eventoId: number | null = null;

  cargando = signal(false);
  error = signal('');

  mostrarVolverInicio = false;
  mostrarVolverMisEventos = false;


  ngOnInit(): void {

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.mostrarVolverInicio = params.get('origen') === 'inicio';
      this.mostrarVolverMisEventos = params.get('origen') === 'mis-eventos';
    });

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
    this.cargandoEventos.set(true);
    this.api.eventosParaReportes().subscribe({
      next: eventos => {
        this.eventos.set(eventos);
        this.cargandoEventos.set(false);
        this.seleccionarDesdeUrl();
      },
      error: respuesta => {
        this.cargandoEventos.set(false);
        this.error.set(respuesta?.error?.detail || 'No fue posible cargar los eventos.');
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