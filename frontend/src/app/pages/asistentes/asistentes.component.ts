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
  catchError,
  forkJoin,
  of
} from 'rxjs';

import {
  Evento,
  Inscripcion
} from '../../models/models';

import { AuthService } from '../../services/auth.service';
import { EventosService } from '../../services/eventos.service';


@Component({
  selector: 'app-asistentes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './asistentes.component.html',
  styleUrl: './asistentes.component.css'
})
export class AsistentesComponent implements OnInit {

  private readonly api = inject(EventosService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  eventos = signal<Evento[]>([]);
  items = signal<Inscripcion[]>([]);

  eventoId: number | null = null;

  cargandoEventos = signal(true);
  cargando = signal(false);

  error = signal('');
  errorEventos = signal('');

  mostrarVolverEventosAsignados =
    signal(false);


  ngOnInit(): void {

    this.mostrarVolverEventosAsignados.set(
      this.route.snapshot
        .queryParamMap
        .get('origen') === 'eventos-asignados'
    );

    this.cargarEventos();

    const id = Number(
      this.route.snapshot
        .queryParamMap
        .get('evento')
    );

    if (id > 0) {

      this.eventoId = id;

      this.buscar();
    }
  }


  volver(): void {

    this.router.navigate([
      '/eventos-asignados'
    ]);
  }


  buscar(): void {

    if (!this.eventoId) {
      return;
    }

    this.cargando.set(true);
    this.error.set('');
    this.items.set([]);

    this.api.asistentes(
      this.eventoId
    ).subscribe({

      next: respuesta => {

        this.items.set(
          [...respuesta].sort(
            (a, b) =>
              (a.usuario_nombre || '')
                .localeCompare(
                  b.usuario_nombre || '',
                  'es'
                )
          )
        );

        this.cargando.set(false);
      },

      error: respuesta => {

        this.error.set(
          respuesta?.error?.detail ||
          'No fue posible consultar los asistentes.'
        );

        this.cargando.set(false);
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

      case 'CONFIRMADA':
        return 'status-confirmed';

      case 'CANCELADA':
        return 'status-cancelled';

      default:
        return 'status-neutral';
    }
  }


  private cargarEventos(): void {

    this.cargandoEventos.set(true);
    this.errorEventos.set('');


    // ADMIN puede consultar cualquier evento.
    if (
      this.auth.tieneRol('ADMIN')
    ) {

      this.api
        .listarEventos()
        .subscribe({

          next: respuesta => {

            this.establecerEventos(
              respuesta.results
            );
          },

          error: () => {

            this.errorAlCargarEventos();
          }
        });

      return;
    }


    // ORGANIZADOR puede consultar
    // eventos propios y asignados.
    if (
      this.auth.tieneRol(
        'ORGANIZADOR'
      )
    ) {

      forkJoin({

        propios:
          this.api
            .misEventos()
            .pipe(
              catchError(() => of([]))
            ),

        asignados:
          this.api
            .eventosAsignados()
            .pipe(
              catchError(() => of([]))
            )

      }).subscribe(resultado => {

        const todos = [
          ...resultado.propios,
          ...resultado.asignados
        ];

        const unicos =
          todos.filter(
            (
              evento,
              indice,
              arreglo
            ) =>
              arreglo.findIndex(
                item =>
                  item.id === evento.id
              ) === indice
          );

        this.establecerEventos(
          unicos
        );
      });

      return;
    }


    // STAFF.
    this.api
      .eventosAsignados()
      .subscribe({

        next: respuesta => {

          this.establecerEventos(
            respuesta
          );
        },

        error: () => {

          this.errorAlCargarEventos();
        }
      });
  }


  private establecerEventos(
    eventos: Evento[]
  ): void {

    const ordenados =
      [...eventos].sort(
        (a, b) =>
          new Date(
            a.fecha_hora_inicio
          ).getTime() -
          new Date(
            b.fecha_hora_inicio
          ).getTime()
      );

    this.eventos.set(
      ordenados
    );

    this.cargandoEventos.set(false);
  }


  private errorAlCargarEventos(): void {

    this.eventos.set([]);

    this.errorEventos.set(
      'No fue posible cargar los eventos disponibles.'
    );

    this.cargandoEventos.set(false);
  }
}