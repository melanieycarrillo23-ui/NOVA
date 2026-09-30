import { CommonModule } from '@angular/common';

import {
  Component,
  inject,
  OnInit,
  signal
} from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  ActivatedRoute,
  Router
} from '@angular/router';

import {
  catchError,
  forkJoin,
  of
} from 'rxjs';

import { Evento } from '../../models/models';

import { AuthService } from '../../services/auth.service';
import { EventosService } from '../../services/eventos.service';


interface ResultadoValidacion {
  resultado?: string;
  detail?: string;
  participante?: string;

  entrada?: {
    codigo_publico?: string;
  };
}


@Component({
  selector: 'app-validar-qr',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './validar-qr.component.html',
  styleUrl: './validar-qr.component.css'
})
export class ValidarQrComponent implements OnInit {

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(EventosService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  eventos = signal<Evento[]>([]);

  resultado =
    signal<ResultadoValidacion | null>(null);

  procesando = signal(false);
  cargandoEventos = signal(true);

  errorEventos = signal('');

  mostrarVolverEventosAsignados =
    signal(false);


  form = this.fb.nonNullable.group({

    evento_id: [
      0,
      [
        Validators.required,
        Validators.min(1)
      ]
    ],

    token_qr: [
      '',
      Validators.required
    ]
  });


  ngOnInit(): void {

    this.mostrarVolverEventosAsignados.set(
      this.route.snapshot
        .queryParamMap
        .get('origen') === 'eventos-asignados'
    );

    this.cargarEventos();

    const eventoId = Number(
      this.route.snapshot
        .queryParamMap
        .get('evento')
    );

    if (eventoId > 0) {

      this.form.controls
        .evento_id
        .setValue(eventoId);
    }
  }


  volver(): void {

    this.router.navigate([
      '/eventos-asignados'
    ]);
  }


  validar(): void {

    if (this.form.invalid) {
      return;
    }

    const valores =
      this.form.getRawValue();

    this.procesando.set(true);
    this.resultado.set(null);

    this.api.escanear(
      valores.evento_id,
      valores.token_qr.trim()
    ).subscribe({

      next: respuesta => {

        this.resultado.set(
          respuesta
        );

        this.procesando.set(false);

        if (
          respuesta?.resultado === 'VALIDO'
        ) {

          this.form.controls
            .token_qr
            .reset('');
        }
      },

      error: respuesta => {

        this.resultado.set(
          respuesta?.error || {
            resultado: 'ERROR',
            detail:
              'No fue posible validar la entrada.'
          }
        );

        this.procesando.set(false);
      }
    });
  }


  limpiar(): void {

    this.form.controls
      .token_qr
      .reset('');

    this.resultado.set(null);
  }


  esValido(): boolean {

    return (
      this.resultado()?.resultado ===
      'VALIDO'
    );
  }


  tituloResultado(
    resultado?: string
  ): string {

    switch (resultado) {

      case 'VALIDO':
        return 'Entrada válida';

      case 'YA_UTILIZADO':
        return 'Entrada ya utilizada';

      case 'CANCELADO':
        return 'Entrada cancelada';

      case 'EXPIRADO':
        return 'Entrada expirada';

      case 'EVENTO_INCORRECTO':
        return 'Evento incorrecto';

      case 'INVALIDO':
        return 'Entrada no válida';

      default:
        return 'No fue posible validar la entrada';
    }
  }


  private cargarEventos(): void {

    this.cargandoEventos.set(true);
    this.errorEventos.set('');

    if (this.auth.tieneRol('ADMIN')) {

      this.api.listarEventos().subscribe({

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


    if (
      this.auth.tieneRol(
        'ORGANIZADOR'
      )
    ) {

      forkJoin({

        propios:
          this.api.misEventos().pipe(
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