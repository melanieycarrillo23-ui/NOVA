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

interface ActividadReciente {
  titulo: string;
  detalle: string;
  fecha: string;
}

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

  esSoloUsuario = computed(() => {
    const roles = this.auth.usuario()?.roles ?? [];

    return (
      roles.length === 1 &&
      roles.includes('USUARIO')
    );
  });

  proximoEvento = computed<Evento | null>(() => {
    const ahora = Date.now();

    const eventosInscritos = this.inscripciones()
      .filter(
        inscripcion =>
          inscripcion.estado === 'CONFIRMADA'
      )
      .map(inscripcion =>
        this.eventos().find(
          evento =>
            evento.id === inscripcion.evento
        )
      )
      .filter(
        (evento): evento is Evento =>
          evento !== undefined &&
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

    return eventosInscritos[0] ?? null;
  });

  inscripcionProxima = computed<Inscripcion | null>(() => {
    const evento = this.proximoEvento();

    if (!evento) {
      return null;
    }

    return (
      this.inscripciones().find(
        inscripcion =>
          inscripcion.evento === evento.id
      ) ?? null
    );
  });

  entradaProxima = computed<Entrada | null>(() => {
    const evento = this.proximoEvento();

    if (!evento) {
      return null;
    }

    const entradasEvento = this.entradas()
      .filter(
        entrada =>
          entrada.evento_id === evento.id
      );

    return (
      entradasEvento.find(
        entrada =>
          entrada.estado === 'ACTIVA'
      ) ??
      entradasEvento[0] ??
      null
    );
  });

  actividadReciente = computed<ActividadReciente[]>(() => {

    const inscripciones: ActividadReciente[] =
      this.inscripciones()
        .filter(
          inscripcion =>
            inscripcion.estado === 'CONFIRMADA'
        )
        .map(inscripcion => ({
          titulo: 'Inscripción confirmada',
          detalle: inscripcion.evento_nombre,
          fecha: inscripcion.inscrito_en
        }));

    const entradasEmitidas: ActividadReciente[] =
      this.entradas()
        .map(entrada => ({
          titulo: 'Entrada generada',
          detalle: entrada.evento_nombre,
          fecha: entrada.emitida_en
        }));

    const entradasUtilizadas: ActividadReciente[] =
      this.entradas()
        .filter(
          entrada =>
            Boolean(entrada.utilizada_en)
        )
        .map(entrada => ({
          titulo: 'Entrada utilizada',
          detalle: entrada.evento_nombre,
          fecha: entrada.utilizada_en as string
        }));

    return [
      ...inscripciones,
      ...entradasEmitidas,
      ...entradasUtilizadas
    ]
      .sort(
        (a, b) =>
          new Date(b.fecha).getTime() -
          new Date(a.fecha).getTime()
      )
      .slice(0, 5);
  });

  tiempoParaProximoEvento = computed(() => {
    const evento = this.proximoEvento();

    if (!evento) {
      return '';
    }

    const diferencia =
      new Date(
        evento.fecha_hora_inicio
      ).getTime() - Date.now();

    const dias = Math.ceil(
      diferencia / 86_400_000
    );

    if (dias <= 0) {
      return 'Es hoy';
    }

    if (dias === 1) {
      return 'Es mañana';
    }

    return `Faltan ${dias} días`;
  });

  ngOnInit(): void {
    this.cargarDatosGenerales();
    this.cargarDatosPorRol();
  }

  formatearFechaHora(fecha: string): string {
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

  formatearFechaCorta(fecha: string): string {
    return new Intl.DateTimeFormat(
      'es-CO',
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }
    ).format(new Date(fecha));
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