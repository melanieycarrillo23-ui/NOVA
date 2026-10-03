import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';

import { Evento, Inscripcion } from '../../models/models';
import { AuthService } from '../../services/auth.service';

import {
  EventosService,
  ResultadoImportacion
} from '../../services/eventos.service';


@Component({
  selector: 'app-asistentes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  styleUrl: './asistentes.component.css',
  template: `
    <ng-container
      *ngIf="
        mostrarVolverEventosAsignados() ||
        mostrarVolverInicio()
      "
    >

      <button
        *ngIf="mostrarVolverEventosAsignados()"
        type="button"
        class="back-link"
        (click)="volver()"
      >
        <span aria-hidden="true">&larr;</span>
        Volver a eventos asignados
      </button>

      <button
        *ngIf="mostrarVolverInicio()"
        type="button"
        class="back-link"
        (click)="volver()"
      >
        <span aria-hidden="true">&larr;</span>
        Volver al inicio
      </button>

    </ng-container>


    <h1 class="page-title">
      Asistentes
    </h1>

    <p class="page-subtitle">
      Consulta, filtra, exporta e importa participantes
      de los eventos que administras.
    </p>


    <!-- SELECCIÓN DEL EVENTO -->

    <div
      class="card"
      style="margin-bottom: 18px"
    >

      <div class="row wrap">

        <div
          class="field"
          style="
            flex: 1;
            min-width: 240px;
          "
        >

          <label>
            Evento
          </label>

          <select
            [(ngModel)]="eventoId"
            (ngModelChange)="cambiarEvento()"
          >

            <option [ngValue]="null">
              Selecciona un evento
            </option>

            <option
              *ngFor="
                let evento of eventos()
              "
              [ngValue]="evento.id"
            >
              {{ evento.nombre }}
            </option>

          </select>

        </div>


        <button
          type="button"
          class="btn btn-primary"
          style="align-self: end"
          [disabled]="
            !eventoId ||
            cargando()
          "
          (click)="buscar()"
        >
          {{
            cargando()
              ? 'Consultando...'
              : 'Consultar asistentes'
          }}
        </button>


        <button
          type="button"
          class="btn btn-secondary"
          style="align-self: end"
          [disabled]="
            !eventoId ||
            exportando()
          "
          (click)="exportarCsv()"
        >
          {{
            exportando()
              ? 'Exportando...'
              : 'Exportar CSV'
          }}
        </button>

      </div>

    </div>


    <!-- FILTROS -->

    <div
      class="card"
      style="margin-bottom: 18px"
      *ngIf="eventoId"
    >

      <div class="row wrap">

        <div
          class="field"
          style="
            flex: 1;
            min-width: 240px;
          "
        >

          <label for="buscar-asistente">
            Buscar asistente
          </label>

          <input
            id="buscar-asistente"
            type="text"
            [(ngModel)]="busqueda"
            placeholder="Nombre o correo"
            (keyup.enter)="aplicarFiltros()"
          >

        </div>


        <div
          class="field"
          style="
            min-width: 190px;
          "
        >

          <label for="estado-inscripcion">
            Estado
          </label>

          <select
            id="estado-inscripcion"
            [(ngModel)]="estadoFiltro"
          >

            <option value="">
              Todos
            </option>

            <option value="CONFIRMADA">
              Confirmada
            </option>

            <option value="PENDIENTE">
              Pendiente
            </option>

            <option value="CANCELADA">
              Cancelada
            </option>

          </select>

        </div>


        <button
          type="button"
          class="btn btn-primary"
          style="align-self: end"
          [disabled]="cargando()"
          (click)="aplicarFiltros()"
        >
          Buscar
        </button>


        <button
          type="button"
          class="btn btn-ghost"
          style="align-self: end"
          [disabled]="cargando()"
          (click)="limpiarFiltros()"
        >
          Limpiar
        </button>

      </div>

    </div>


    <!-- MENSAJES -->

    <div
      class="error"
      style="margin-bottom: 16px"
      *ngIf="error()"
    >
      {{ error() }}
    </div>


    <div
      class="notice"
      style="margin-bottom: 16px"
      *ngIf="mensaje()"
    >
      {{ mensaje() }}
    </div>


    <!-- IMPORTAR CSV -->

    <div
      class="card"
      style="margin-bottom: 18px"
      *ngIf="
        auth.tieneRol(
          'ORGANIZADOR',
          'ADMIN'
        )
      "
    >

      <div class="card-header">

        <div>

          <h3>
            Importar asistentes
          </h3>

          <p class="secondary">
            Inscribe varios usuarios mediante
            un archivo CSV.
          </p>

        </div>

      </div>


      <div
        class="stack"
        style="margin-top: 16px"
      >

        <div class="field">

          <label for="archivo-csv">
            Archivo CSV
          </label>

          <input
            id="archivo-csv"
            type="file"
            accept=".csv,text/csv"
            (change)="seleccionarArchivo($event)"
          >

        </div>


        <div
          class="secondary"
          *ngIf="archivoSeleccionado()"
        >
          Archivo seleccionado:
          <strong>
            {{ archivoSeleccionado()?.name }}
          </strong>
        </div>


        <div
          class="secondary"
          *ngIf="!archivoSeleccionado()"
        >
          El archivo debe contener las columnas:
          <strong>correo</strong> y
          <strong>tipo_entrada</strong>.
        </div>


        <div
          class="card"
          style="
            background: rgba(255, 255, 255, 0.025);
            padding: 14px;
          "
        >

          <strong>
            Ejemplo del archivo
          </strong>

          <pre
            style="
              margin: 10px 0 0;
              white-space: pre-wrap;
              font-size: 0.78rem;
            "
          >correo;tipo_entrada
usuario&#64;nova.local;General
otro.usuario&#64;nova.local;VIP</pre>

        </div>


        <div class="row wrap">

          <button
            type="button"
            class="btn btn-primary"
            [disabled]="
              !eventoId ||
              !archivoSeleccionado() ||
              importando()
            "
            (click)="importarCsv()"
          >
            {{
              importando()
                ? 'Importando...'
                : 'Importar CSV'
            }}
          </button>

        </div>

      </div>


      <!-- RESULTADO DE LA IMPORTACIÓN -->

      <div
        *ngIf="
          resultadoImportacion()
          as resultado
        "
        style="margin-top: 20px"
      >

        <div class="grid grid-3">

          <div class="card kpi">

            <div class="kpi-value">
              {{ resultado.importados }}
            </div>

            <div class="kpi-label">
              Importados
            </div>

          </div>


          <div class="card kpi">

            <div class="kpi-value">
              {{ resultado.omitidos }}
            </div>

            <div class="kpi-label">
              Omitidos
            </div>

          </div>


          <div class="card kpi">

            <div class="kpi-value">
              {{ resultado.errores.length }}
            </div>

            <div class="kpi-label">
              Observaciones
            </div>

          </div>

        </div>


        <div
          class="card"
          style="margin-top: 14px"
          *ngIf="
            resultado.errores.length
          "
        >

          <h3>
            Detalle de la importación
          </h3>

          <div
            class="stack"
            style="margin-top: 12px"
          >

            <div
              *ngFor="
                let item
                of resultado.errores
              "
              style="
                padding: 10px 0;
                border-bottom:
                  1px solid var(--border);
              "
            >

              <strong>
                Fila {{ item.fila }}
              </strong>

              <span
                class="secondary"
                *ngIf="item.correo"
              >
                - {{ item.correo }}
              </span>

              <div class="secondary">
                {{ item.detalle }}
              </div>

            </div>

          </div>

        </div>

      </div>

    </div>


    <!-- RESUMEN -->

    <div
      class="row between wrap"
      style="
        margin-bottom: 12px;
        gap: 12px;
      "
      *ngIf="
        eventoId &&
        !cargando()
      "
    >

      <div>

        <strong>
          {{ total() }}
        </strong>

        <span class="secondary">
          {{
            total() === 1
              ? ' asistente encontrado'
              : ' asistentes encontrados'
          }}
        </span>

      </div>


      <span
        class="secondary"
        *ngIf="total()"
      >
        Página
        {{ pagina() }}
        de
        {{ totalPaginas() }}
      </span>

    </div>


    <!-- TABLA DE ASISTENTES -->

    <div class="card table-wrap">

      <table
        class="table"
        *ngIf="items().length"
      >

        <thead>

          <tr>

            <th>
              Participante
            </th>

            <th>
              Estado
            </th>

            <th>
              Fecha de inscripción
            </th>

          </tr>

        </thead>


        <tbody>

          <tr
            *ngFor="
              let item of items()
            "
          >

            <td>
              {{
                item.usuario_nombre ||
                'Usuario'
              }}
            </td>


            <td>

              <span class="badge">
                {{ item.estado }}
              </span>

            </td>


            <td>
              {{
                item.inscrito_en
                  | date:'medium'
              }}
            </td>

          </tr>

        </tbody>

      </table>


      <div
        class="empty"
        *ngIf="
          !items().length &&
          !cargando()
        "
      >
        {{
          eventoId
            ? 'No hay asistentes que coincidan con la búsqueda.'
            : 'Selecciona un evento para consultar sus asistentes.'
        }}
      </div>

    </div>


    <!-- PAGINACIÓN -->

    <div
      class="row between wrap"
      style="
        margin-top: 18px;
        gap: 12px;
      "
      *ngIf="
        eventoId &&
        !cargando() &&
        total() > 0
      "
    >

      <button
        type="button"
        class="btn btn-ghost"
        [disabled]="!tieneAnterior()"
        (click)="paginaAnterior()"
      >
        Anterior
      </button>


      <span class="secondary">
        Página
        {{ pagina() }}
        de
        {{ totalPaginas() }}
      </span>


      <button
        type="button"
        class="btn btn-secondary"
        [disabled]="!tieneSiguiente()"
        (click)="paginaSiguiente()"
      >
        Siguiente
      </button>

    </div>

  `
})
export class AsistentesComponent
  implements OnInit {

  private readonly api =
    inject(EventosService);

  readonly auth =
    inject(AuthService);

  private readonly route =
    inject(ActivatedRoute);

  private readonly router =
    inject(Router);


  mostrarVolverEventosAsignados =
    signal(false);

  mostrarVolverInicio =
    signal(false);


  eventos =
    signal<Evento[]>([]);

  items =
    signal<Inscripcion[]>([]);


  eventoId:
    number | null = null;


  cargando =
    signal(false);

  exportando =
    signal(false);

  importando =
    signal(false);


  archivoSeleccionado =
    signal<File | null>(null);


  resultadoImportacion =
    signal<ResultadoImportacion | null>(
      null
    );


  error =
    signal('');

  mensaje =
    signal('');


  total =
    signal(0);

  pagina =
    signal(1);

  tieneAnterior =
    signal(false);

  tieneSiguiente =
    signal(false);


  readonly tamanoPagina = 10;


  busqueda = '';

  estadoFiltro = '';


  ngOnInit(): void {

    this.mostrarVolverEventosAsignados.set(
      this.route.snapshot
        .queryParamMap
        .get('origen') === 'eventos-asignados'
    );

    this.mostrarVolverInicio.set(
      this.route.snapshot
        .queryParamMap
        .get('origen') === 'inicio'
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

    if (this.mostrarVolverInicio()) {
      this.router.navigate([
        '/dashboard'
      ]);

      return;
    }

    this.router.navigate([
      '/eventos-asignados'
    ]);
  }


  cambiarEvento(): void {

    this.items.set([]);

    this.total.set(0);

    this.pagina.set(1);

    this.tieneAnterior.set(false);

    this.tieneSiguiente.set(false);

    this.busqueda = '';

    this.estadoFiltro = '';

    this.error.set('');

    this.mensaje.set('');

    this.resultadoImportacion.set(
      null
    );

    this.archivoSeleccionado.set(
      null
    );
  }


  aplicarFiltros(): void {

    if (!this.eventoId) {
      return;
    }

    this.pagina.set(1);

    this.buscar();
  }


  limpiarFiltros(): void {

    this.busqueda = '';

    this.estadoFiltro = '';

    this.pagina.set(1);

    this.buscar();
  }


  paginaAnterior(): void {

    if (
      !this.tieneAnterior() ||
      this.cargando()
    ) {
      return;
    }

    this.pagina.update(
      valor => valor - 1
    );

    this.buscar();
  }


  paginaSiguiente(): void {

    if (
      !this.tieneSiguiente() ||
      this.cargando()
    ) {
      return;
    }

    this.pagina.update(
      valor => valor + 1
    );

    this.buscar();
  }


  totalPaginas(): number {

    return Math.max(
      1,
      Math.ceil(
        this.total() /
        this.tamanoPagina
      )
    );
  }


  seleccionarArchivo(
    event: Event
  ): void {

    const input =
      event.target as HTMLInputElement;

    const archivo =
      input.files?.[0] ?? null;


    this.error.set('');

    this.mensaje.set('');

    this.resultadoImportacion.set(
      null
    );


    if (!archivo) {

      this.archivoSeleccionado.set(
        null
      );

      return;
    }


    if (
      !archivo.name
        .toLowerCase()
        .endsWith('.csv')
    ) {

      this.archivoSeleccionado.set(
        null
      );

      input.value = '';

      this.error.set(
        'Debes seleccionar un archivo CSV.'
      );

      return;
    }


    if (
      archivo.size >
      2 * 1024 * 1024
    ) {

      this.archivoSeleccionado.set(
        null
      );

      input.value = '';

      this.error.set(
        'El archivo CSV no puede superar 2 MB.'
      );

      return;
    }


    this.archivoSeleccionado.set(
      archivo
    );
  }


  importarCsv(): void {

    const eventoId =
      this.eventoId;

    const archivo =
      this.archivoSeleccionado();


    if (
      !eventoId ||
      !archivo
    ) {
      return;
    }


    this.importando.set(true);

    this.error.set('');

    this.mensaje.set('');

    this.resultadoImportacion.set(
      null
    );


    this.api
      .importarAsistentes(
        eventoId,
        archivo
      )
      .subscribe({

        next: respuesta => {

          this.resultadoImportacion.set(
            respuesta
          );

          this.mensaje.set(
            `Importación finalizada. ` +
            `Importados: ${respuesta.importados}. ` +
            `Omitidos: ${respuesta.omitidos}.`
          );

          this.importando.set(false);

          this.pagina.set(1);

          this.buscar();
        },

        error: respuesta => {

          this.error.set(
            respuesta?.error?.detail ||
            'No fue posible importar el archivo CSV.'
          );

          this.importando.set(false);
        }
      });
  }


  buscar(): void {

    if (!this.eventoId) {
      return;
    }


    this.cargando.set(true);

    this.error.set('');


    this.api
      .asistentes(
        this.eventoId,
        this.pagina(),
        this.busqueda,
        this.estadoFiltro
      )
      .subscribe({

        next: respuesta => {

          if (
            !respuesta.results.length &&
            this.pagina() > 1
          ) {

            this.pagina.update(
              valor => valor - 1
            );

            this.buscar();

            return;
          }


          this.items.set(
            respuesta.results
          );

          this.total.set(
            respuesta.count
          );

          this.tieneAnterior.set(
            !!respuesta.previous
          );

          this.tieneSiguiente.set(
            !!respuesta.next
          );

          this.cargando.set(false);
        },

        error: respuesta => {

          this.items.set([]);

          this.total.set(0);

          this.error.set(
            respuesta?.error?.detail ||
            'No fue posible consultar los asistentes.'
          );

          this.cargando.set(false);
        }
      });
  }


  exportarCsv(): void {

    if (!this.eventoId) {
      return;
    }


    this.exportando.set(true);

    this.error.set('');

    this.mensaje.set('');


    this.api
      .exportarAsistentes(
        this.eventoId
      )
      .subscribe({

        next: archivo => {

          const url =
            URL.createObjectURL(
              archivo
            );

          const enlace =
            document.createElement(
              'a'
            );

          enlace.href = url;

          enlace.download =
            `asistentes_evento_${this.eventoId}.csv`;

          document.body.appendChild(
            enlace
          );

          enlace.click();

          document.body.removeChild(
            enlace
          );

          URL.revokeObjectURL(
            url
          );

          this.mensaje.set(
            'El archivo CSV se exportó correctamente.'
          );

          this.exportando.set(false);
        },

        error: respuesta => {

          this.error.set(
            respuesta?.error?.detail ||
            'No fue posible exportar los asistentes.'
          );

          this.exportando.set(false);
        }
      });
  }


  private cargarEventos(): void {

    if (
      this.auth.tieneRol(
        'ADMIN'
      )
    ) {

      this.api
        .listarEventos()
        .subscribe({

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
              catchError(
                () => of([])
              )
            ),

        asignados:
          this.api
            .eventosAsignados()
            .pipe(
              catchError(
                () => of([])
              )
            )

      }).subscribe(
        respuesta => {

          const todos = [
            ...respuesta.propios,
            ...respuesta.asignados
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
                    item.id ===
                    evento.id
                ) === indice
            );


          this.eventos.set(
            unicos
          );
        }
      );

      return;
    }


    this.api
      .eventosAsignados()
      .subscribe({

        next: respuesta => {

          this.eventos.set(
            respuesta
          );
        },

        error: () => {

          this.eventos.set([]);
        }
      });
  }
}