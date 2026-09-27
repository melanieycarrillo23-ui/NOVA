import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  Entrada,
  Evento,
  Inscripcion
} from '../../models/models';

import { AuthService } from '../../services/auth.service';
import { EventosService } from '../../services/eventos.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {

  auth = inject(AuthService);
  api = inject(EventosService);

  eventos = signal<Evento[]>([]);
  inscripciones = signal<Inscripcion[]>([]);
  entradas = signal<Entrada[]>([]);

  misEventos = signal<Evento[]>([]);
  asignados = signal<Evento[]>([]);

  proximosEventos = computed(() => {
    const ahora = Date.now();

    return this.eventos()
      .filter(
        evento =>
          new Date(
            evento.fecha_hora_inicio
          ).getTime() >= ahora
      )
      .sort(
        (a, b) =>
          new Date(
            a.fecha_hora_inicio
          ).getTime() -
          new Date(
            b.fecha_hora_inicio
          ).getTime()
      );
  });

  entradasActivas = computed(
    () =>
      this.entradas().filter(
        entrada =>
          entrada.estado === 'ACTIVA'
      ).length
  );

  entradasUtilizadas = computed(
    () =>
      this.entradas().filter(
        entrada =>
          entrada.estado === 'UTILIZADA'
      ).length
  );

  historial = computed(
    () =>
      this.entradas().filter(
        entrada =>
          entrada.estado === 'UTILIZADA' ||
          entrada.estado === 'CANCELADA'
      ).length
  );

  ngOnInit(): void {
    this.cargarDatosGenerales();
    this.cargarDatosPorRol();
  }

  private cargarDatosGenerales(): void {
    this.api.listarEventos().subscribe({
      next: respuesta => {
        this.eventos.set(respuesta.results);
      },
      error: () => {
        this.eventos.set([]);
      }
    });

    this.api.misInscripciones().subscribe({
      next: respuesta => {
        this.inscripciones.set(respuesta);
      },
      error: () => {
        this.inscripciones.set([]);
      }
    });

    this.api.misEntradas().subscribe({
      next: respuesta => {
        this.entradas.set(respuesta);
      },
      error: () => {
        this.entradas.set([]);
      }
    });
  }

  private cargarDatosPorRol(): void {
    if (
      this.auth.tieneRol(
        'ORGANIZADOR',
        'ADMIN'
      )
    ) {
      this.cargarEventosOrganizados();
    }

    if (
      this.auth.tieneRol(
        'STAFF',
        'ORGANIZADOR',
        'ADMIN'
      )
    ) {
      this.cargarEventosAsignados();
    }
  }

  private cargarEventosOrganizados(): void {
    this.api.misEventos().subscribe({
      next: respuesta => {
        this.misEventos.set(respuesta);
      },
      error: () => {
        this.misEventos.set([]);
      }
    });
  }

  private cargarEventosAsignados(): void {
    this.api.eventosAsignados().subscribe({
      next: respuesta => {
        this.asignados.set(respuesta);
      },
      error: () => {
        this.asignados.set([]);
      }
    });
  }
}