import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  OnDestroy,
  OnInit,
  signal
} from '@angular/core';

import { Entrada } from '../../models/models';
import { EventosService } from '../../services/eventos.service';

@Component({
  selector: 'app-mis-entradas',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h1 class="page-title">Mis entradas</h1>

    <p class="page-subtitle">
      Consulta tus entradas y códigos QR de acceso.
    </p>

    <div
      class="error"
      *ngIf="errorGeneral()"
      style="margin-bottom: 16px"
    >
      {{ errorGeneral() }}
    </div>

    <div class="grid grid-2">

      <div
        class="card"
        *ngFor="let entrada of items()"
      >

        <div class="row between wrap">

          <div>
            <span class="badge">
              {{ entrada.tipo_entrada_nombre }}
            </span>

            <h3 style="margin-top: 10px">
              {{ entrada.evento_nombre }}
            </h3>
          </div>

          <span
            class="badge"
            [class.green]="entrada.estado === 'ACTIVA'"
          >
            {{ entrada.estado }}
          </span>

        </div>

        <p class="muted">
          Código: {{ entrada.codigo_publico }}
        </p>

        <!-- ENTRADA ACTIVA -->
        <ng-container *ngIf="entrada.estado === 'ACTIVA'">

          <button
            class="btn btn-primary"
            [disabled]="cargandoId() === entrada.id"
            (click)="cargarQr(entrada.id)"
          >
            {{
              cargandoId() === entrada.id
                ? 'Cargando QR...'
                : qrUrls[entrada.id]
                  ? 'QR cargado'
                  : 'Mostrar QR'
            }}
          </button>

          <div
            class="qr-box"
            style="margin-top: 14px"
            *ngIf="qrUrls[entrada.id]"
          >
            <img
              [src]="qrUrls[entrada.id]"
              alt="Código QR de entrada"
            >
          </div>

        </ng-container>

        <!-- ENTRADA UTILIZADA -->
        <div
          class="notice"
          style="margin-top: 14px"
          *ngIf="entrada.estado === 'UTILIZADA'"
        >
          Esta entrada ya fue utilizada para ingresar al evento.
        </div>

        <!-- ENTRADA CANCELADA -->
        <div
          class="error"
          style="margin-top: 14px"
          *ngIf="entrada.estado === 'CANCELADA'"
        >
          Esta entrada fue cancelada y ya no puede utilizarse.
        </div>

        <div
          class="error"
          style="margin-top: 14px"
          *ngIf="erroresQr[entrada.id]"
        >
          {{ erroresQr[entrada.id] }}
        </div>

      </div>

    </div>

    <div
      class="empty"
      *ngIf="!items().length && !errorGeneral()"
    >
      Aún no tienes entradas emitidas.
    </div>
  `
})
export class MisEntradasComponent implements OnInit, OnDestroy {

  api = inject(EventosService);

  items = signal<Entrada[]>([]);

  cargandoId = signal<number | null>(null);

  errorGeneral = signal('');

  qrUrls: Record<number, string> = {};

  erroresQr: Record<number, string> = {};

  ngOnInit(): void {
    this.cargarEntradas();
  }

  cargarEntradas(): void {

    this.errorGeneral.set('');

    this.api.misEntradas().subscribe({
      next: respuesta => {
        this.items.set(respuesta);
      },

      error: () => {
        this.errorGeneral.set(
          'No fue posible cargar tus entradas.'
        );
      }
    });
  }

  cargarQr(id: number): void {

    if (this.qrUrls[id]) {
      return;
    }

    this.cargandoId.set(id);
    this.erroresQr[id] = '';

    this.api.qrBlob(id).subscribe({
      next: blob => {

        this.qrUrls[id] = URL.createObjectURL(blob);

        this.cargandoId.set(null);
      },

      error: respuesta => {

        this.erroresQr[id] =
          respuesta?.error?.detail ||
          'No fue posible generar el código QR.';

        this.cargandoId.set(null);
      }
    });
  }

  ngOnDestroy(): void {

    Object.values(this.qrUrls).forEach(url => {
      URL.revokeObjectURL(url);
    });

  }
}