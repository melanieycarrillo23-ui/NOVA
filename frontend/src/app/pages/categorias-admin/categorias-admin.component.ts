import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { CategoriaEvento } from '../../models/models';
import { EventosService } from '../../services/eventos.service';


@Component({
  selector: 'app-categorias-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],
  templateUrl: './categorias-admin.component.html',
  styleUrl: './categorias-admin.component.css'
})
export class CategoriasAdminComponent implements OnInit {

  private readonly api = inject(EventosService);

  items = signal<CategoriaEvento[]>([]);

  nuevoNombre = '';
  nuevaDescripcion = '';

  cargando = signal(true);
  guardando = signal(false);

  procesandoId =
    signal<number | null>(null);

  mensaje = signal('');
  error = signal('');


  private readonly route = inject(ActivatedRoute);
  mostrarVolverInicio = signal(false);

  ngOnInit(): void {
    this.mostrarVolverInicio.set(this.route.snapshot.queryParamMap.get('origen') === 'inicio');

    this.cargar();
  }


  cargar(): void {

    this.cargando.set(true);
    this.error.set('');

    this.api.listarCategorias().subscribe({

      next: respuesta => {

        this.items.set(
          respuesta.results
        );

        this.cargando.set(false);
      },

      error: () => {

        this.items.set([]);

        this.error.set(
          'No fue posible cargar las categorías.'
        );

        this.cargando.set(false);
      }
    });
  }


  crear(): void {

    const nombre =
      this.nuevoNombre.trim();

    if (
      !nombre ||
      this.guardando()
    ) {
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
          'No fue posible crear la categoría.'
        );

        this.guardando.set(false);
      }
    });
  }


  guardar(
    categoria: CategoriaEvento
  ): void {

    if (
      this.procesandoId() !== null
    ) {
      return;
    }

    const nombre =
      categoria.nombre.trim();

    if (!nombre) {

      this.error.set(
        'El nombre de la categoría es obligatorio.'
      );

      return;
    }

    this.procesandoId.set(
      categoria.id
    );

    this.mensaje.set('');
    this.error.set('');

    this.api.actualizarCategoria(
      categoria.id,
      {
        nombre,
        descripcion:
          categoria.descripcion?.trim() || ''
      }
    ).subscribe({

      next: () => {

        this.mensaje.set(
          'Categoría actualizada correctamente.'
        );

        this.procesandoId.set(null);

        this.cargar();
      },

      error: respuesta => {

        this.error.set(
          respuesta?.error?.detail ||
          'No fue posible actualizar la categoría.'
        );

        this.procesandoId.set(null);
      }
    });
  }


  eliminar(
    categoria: CategoriaEvento
  ): void {

    if (
      this.procesandoId() !== null
    ) {
      return;
    }

    const confirmar =
      window.confirm(
        `¿Deseas eliminar la categoría "${categoria.nombre}"?`
      );

    if (!confirmar) {
      return;
    }

    this.procesandoId.set(
      categoria.id
    );

    this.mensaje.set('');
    this.error.set('');

    this.api.eliminarCategoria(
      categoria.id
    ).subscribe({

      next: () => {

        this.mensaje.set(
          'Categoría eliminada correctamente.'
        );

        this.procesandoId.set(null);

        this.cargar();
      },

      error: respuesta => {

        this.error.set(
          respuesta?.error?.detail ||
          'No fue posible eliminar la categoría.'
        );

        this.procesandoId.set(null);
      }
    });
  }
}