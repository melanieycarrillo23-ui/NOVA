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

import { ActivatedRoute } from '@angular/router';
import {
  catchError,
  forkJoin,
  of
} from 'rxjs';

import { Evento } from '../../models/models';
import { AuthService } from '../../services/auth.service';
import { EventosService } from '../../services/eventos.service';

@Component({
  selector: 'app-validar-qr',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  template: `
    <h1 class="page-title">
      Validar entrada QR
    </h1>

    <p class="page-subtitle">
      Valida una entrada y registra automáticamente
      la asistencia del participante.
    </p>

    <div class="grid grid-2">

      <!-- FORMULARIO -->
      <div class="card">

        <form
          [formGroup]="form"
          (ngSubmit)="validar()"
          class="stack"
        >

          <div class="field">
            <label>Evento</label>

            <select formControlName="evento_id">

              <option [ngValue]="0">
                Selecciona un evento
              </option>

              <option
                *ngFor="let evento of eventos()"
                [ngValue]="evento.id"
              >
                {{ evento.nombre }}
              </option>

            </select>
          </div>

          <div class="field">
            <label>
              Contenido del QR
            </label>

            <textarea
              rows="8"
              formControlName="token_qr"
              placeholder="Pega aquí el contenido leído del código QR"
            ></textarea>
          </div>

          <button
            class="btn btn-primary"
            [disabled]="form.invalid || procesando()"
          >
            {{
              procesando()
                ? 'Validando...'
                : 'Validar entrada'
            }}
          </button>

        </form>

      </div>

      <!-- RESULTADO -->
      <div class="card">

        <h3>
          Resultado de validación
        </h3>

        <div
          *ngIf="resultado() as r"
          style="margin-top: 14px"
        >

          <div
            class="notice"
            *ngIf="r.resultado === 'VALIDO'"
          >
            Entrada válida. Asistencia registrada correctamente.
          </div>

          <div
            class="error"
            *ngIf="r.resultado !== 'VALIDO'"
          >
            Resultado:
            {{ r.resultado || 'ERROR' }}
          </div>

          <p *ngIf="r.detail">
            {{ r.detail }}
          </p>

          <p *ngIf="r.participante">
            <strong>Participante:</strong>
            {{ r.participante }}
          </p>

          <p *ngIf="r.entrada">
            <strong>Código de entrada:</strong>
            {{ r.entrada.codigo_publico }}
          </p>

        </div>

        <div
          class="empty"
          *ngIf="!resultado()"
        >
          Esperando una validación.
        </div>

      </div>

    </div>
  `
})
export class ValidarQrComponent implements OnInit {

  private fb = inject(FormBuilder);

  api = inject(EventosService);
  auth = inject(AuthService);
  route = inject(ActivatedRoute);

  eventos = signal<Evento[]>([]);
  resultado = signal<any>(null);
  procesando = signal(false);

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

    this.cargarEventos();

    const eventoId = Number(
      this.route.snapshot.queryParamMap.get('evento')
    );

    if (eventoId > 0) {
      this.form.controls.evento_id.setValue(
        eventoId
      );
    }
  }

  cargarEventos(): void {

    // ADMIN puede operar cualquier evento
    if (this.auth.tieneRol('ADMIN')) {

      this.api.listarEventos().subscribe({
        next: respuesta => {
          this.eventos.set(
            respuesta.results
          );
        },

        error: () => {
          this.eventos.set([]);
        }
      });

      return;
    }

    // ORGANIZADOR puede tener eventos propios
    // y también eventos donde fue asignado
    if (this.auth.tieneRol('ORGANIZADOR')) {

      forkJoin({
        propios:
          this.api.misEventos().pipe(
            catchError(() => of([]))
          ),

        asignados:
          this.api.eventosAsignados().pipe(
            catchError(() => of([]))
          )
      }).subscribe(resultado => {

        const todos = [
          ...resultado.propios,
          ...resultado.asignados
        ];

        const unicos = todos.filter(
          (evento, indice, arreglo) =>
            arreglo.findIndex(
              item => item.id === evento.id
            ) === indice
        );

        this.eventos.set(unicos);
      });

      return;
    }

    // STAFF
    this.api.eventosAsignados().subscribe({
      next: respuesta => {
        this.eventos.set(respuesta);
      },

      error: () => {
        this.eventos.set([]);
      }
    });
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
          this.form.controls.token_qr.reset('');
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
}