import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  OnInit,
  signal
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

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
  template: `
    <h1 class="page-title">
      Reportes
    </h1>

    <p class="page-subtitle">
      Consulta los indicadores de inscripción y asistencia
      de tus eventos.
    </p>

    <div
      class="card"
      style="margin-bottom: 18px"
    >
      <div class="row wrap">

        <div
          class="field"
          style="flex: 1; min-width: 250px"
        >
          <label>Evento</label>

          <select [(ngModel)]="eventoId">

            <option [ngValue]="null">
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

        <button
          class="btn btn-primary"
          style="align-self: end"
          [disabled]="!eventoId || cargando()"
          (click)="consultar()"
        >
          {{
            cargando()
              ? 'Generando...'
              : 'Generar reporte'
          }}
        </button>

      </div>
    </div>

    <div
      class="error"
      *ngIf="error()"
      style="margin-bottom: 16px"
    >
      {{ error() }}
    </div>

    <ng-container *ngIf="reporte() as r">

      <div class="card" style="margin-bottom: 18px">

        <span class="badge">
          Evento #{{ r.evento.id }}
        </span>

        <h2 style="margin-top: 8px">
          {{ r.evento.nombre }}
        </h2>

      </div>

      <div class="grid grid-4">

        <div class="card kpi">

          <div class="kpi-value">
            {{ r.inscritos }}
          </div>

          <div class="kpi-label">
            Inscritos
          </div>

        </div>

        <div class="card kpi">

          <div class="kpi-value">
            {{ r.asistieron }}
          </div>

          <div class="kpi-label">
            Asistieron
          </div>

        </div>

        <div class="card kpi">

          <div class="kpi-value">
            {{ r.ausentes }}
          </div>

          <div class="kpi-label">
            Ausentes
          </div>

        </div>

        <div class="card kpi">

          <div class="kpi-value">
            {{ r.porcentaje_asistencia }}%
          </div>

          <div class="kpi-label">
            Asistencia
          </div>

        </div>

      </div>

      <div
        class="card"
        style="margin-top: 18px"
      >

        <h3>
          Por tipo de entrada
        </h3>

        <div
          *ngFor="let tipo of r.tipos_entrada"
          style="margin-top: 18px"
        >

          <div class="row between wrap">

            <strong>
              {{ tipo.nombre }}
            </strong>

            <span class="muted">
              {{ tipo.usadas }} /
              {{ tipo.emitidas }} utilizadas
            </span>

          </div>

          <div
            class="metric-bar"
            style="margin-top: 8px"
          >
            <div
              [style.width.%]="
                tipo.emitidas
                  ? (tipo.usadas / tipo.emitidas * 100)
                  : 0
              "
            ></div>
          </div>

        </div>

        <div
          class="empty"
          *ngIf="!r.tipos_entrada.length"
        >
          Este evento todavía no tiene entradas emitidas.
        </div>

      </div>

    </ng-container>

    <div
      class="empty"
      *ngIf="!reporte() && !cargando() && !error()"
    >
      Selecciona un evento para consultar sus indicadores.
    </div>
  `
})
export class ReportesComponent implements OnInit {

  api = inject(EventosService);
  auth = inject(AuthService);
  route = inject(ActivatedRoute);

  eventos = signal<Evento[]>([]);
  reporte = signal<ReporteEvento | null>(null);

  eventoId: number | null = null;

  cargando = signal(false);
  error = signal('');

  ngOnInit(): void {

    this.cargarEventos();
  }

  cargarEventos(): void {

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

        this.eventos.set(respuesta);

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
}