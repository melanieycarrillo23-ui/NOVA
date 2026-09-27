import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CategoriaEvento } from '../../models/models';
import { EventosService } from '../../services/eventos.service';

@Component({
  selector: 'app-categorias-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  template: `
    <div class="row between wrap">
      <div>
        <h1 class="page-title">
          Categorías de eventos
        </h1>

        <p class="page-subtitle">
          Administra el catálogo general de categorías de NOVA.
        </p>
      </div>
    </div>

    <div
      class="notice"
      *ngIf="mensaje()"
      style="margin-bottom: 16px"
    >
      {{ mensaje() }}
    </div>

    <div
      class="error"
      *ngIf="error()"
      style="margin-bottom: 16px"
    >
      {{ error() }}
    </div>

    <div
      class="card"
      style="margin-bottom: 18px"
    >
      <h3>Nueva categoría</h3>

      <div
        class="stack"
        style="margin-top: 16px"
      >
        <div class="field">
          <label>Nombre</label>

          <input
            [(ngModel)]="nuevoNombre"
            placeholder="Ej. Tecnología"
          >
        </div>

        <div class="field">
          <label>Descripción</label>

          <textarea
            rows="3"
            [(ngModel)]="nuevaDescripcion"
            placeholder="Descripción de la categoría"
          ></textarea>
        </div>

        <button
          class="btn btn-primary"
          [disabled]="
            !nuevoNombre.trim() ||
            guardando()
          "
          (click)="crear()"
        >
          {{
            guardando()
              ? 'Guardando...'
              : 'Crear categoría'
          }}
        </button>
      </div>
    </div>

    <div class="grid grid-3">

      <div
        class="card"
        *ngFor="let categoria of items()"
      >
        <span class="badge">
          Categoría
        </span>

        <div
          class="stack"
          style="margin-top: 14px"
        >
          <div class="field">
            <label>Nombre</label>

            <input
              [(ngModel)]="categoria.nombre"
            >
          </div>

          <div class="field">
            <label>Descripción</label>

            <textarea
              rows="3"
              [(ngModel)]="categoria.descripcion"
            ></textarea>
          </div>

          <div class="row wrap">

            <button
              class="btn btn-secondary"
              (click)="guardar(categoria)"
            >
              Guardar cambios
            </button>

            <button
              class="btn btn-ghost"
              (click)="eliminar(categoria)"
            >
              Eliminar
            </button>

          </div>
        </div>
      </div>

    </div>

    <div
      class="empty"
      *ngIf="!items().length"
    >
      No hay categorías registradas.
    </div>
  `
})
export class CategoriasAdminComponent implements OnInit {

  api = inject(EventosService);

  items = signal<CategoriaEvento[]>([]);

  nuevoNombre = '';
  nuevaDescripcion = '';

  guardando = signal(false);

  mensaje = signal('');
  error = signal('');

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {

    this.api.listarCategorias().subscribe({
      next: respuesta => {
        this.items.set(
          respuesta.results
        );
      },

      error: () => {
        this.error.set(
          'No fue posible cargar las categorías.'
        );
      }
    });
  }

  crear(): void {

    const nombre =
      this.nuevoNombre.trim();

    if (!nombre) {
      return;
    }

    this.guardando.set(true);
    this.mensaje.set('');
    this.error.set('');

    this.api.crearCategoria({
      nombre,
      descripcion:
        this.nuevaDescripcion.trim()
    }).subscribe({

      next: () => {

        this.mensaje.set(
          'Categoría creada correctamente.'
        );

        this.nuevoNombre = '';
        this.nuevaDescripcion = '';

        this.guardando.set(false);

        this.cargar();
      },

      error: respuesta => {

        this.error.set(
          respuesta?.error?.detail ||
          JSON.stringify(respuesta?.error) ||
          'No fue posible crear la categoría.'
        );

        this.guardando.set(false);
      }
    });
  }

  guardar(
    categoria: CategoriaEvento
  ): void {

    this.mensaje.set('');
    this.error.set('');

    this.api.actualizarCategoria(
      categoria.id,
      {
        nombre: categoria.nombre,
        descripcion: categoria.descripcion
      }
    ).subscribe({

      next: () => {

        this.mensaje.set(
          'Categoría actualizada correctamente.'
        );

        this.cargar();
      },

      error: respuesta => {

        this.error.set(
          respuesta?.error?.detail ||
          'No fue posible actualizar la categoría.'
        );
      }
    });
  }

  eliminar(
    categoria: CategoriaEvento
  ): void {

    const confirmar = window.confirm(
      `¿Deseas eliminar la categoría "${categoria.nombre}"?`
    );

    if (!confirmar) {
      return;
    }

    this.mensaje.set('');
    this.error.set('');

    this.api.eliminarCategoria(
      categoria.id
    ).subscribe({

      next: () => {

        this.mensaje.set(
          'Categoría eliminada correctamente.'
        );

        this.cargar();
      },

      error: respuesta => {

        this.error.set(
          respuesta?.error?.detail ||
          'No fue posible eliminar la categoría.'
        );
      }
    });
  }
}