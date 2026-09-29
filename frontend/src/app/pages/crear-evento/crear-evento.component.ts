import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
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

import { EventosService } from '../../services/eventos.service';


@Component({
  selector: 'app-crear-evento',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './crear-evento.component.html',
  styleUrl: './crear-evento.component.css'
})
export class CrearEventoComponent {

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(EventosService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  error = signal('');
  guardando = signal(false);

  mostrarVolverMisEventos =
    this.route.snapshot
      .queryParamMap
      .get('origen') === 'mis-eventos';


  form = this.fb.nonNullable.group({

    nombre: [
      '',
      Validators.required
    ],

    modalidad: [
      'PRESENCIAL'
    ],

    fecha_hora_inicio: [
      '',
      Validators.required
    ],

    fecha_hora_fin: [
      '',
      Validators.required
    ],

    capacidad: [
      100
    ],

    visibilidad: [
      'PUBLICO'
    ],

    descripcion_corta: [
      ''
    ],

    descripcion: [
      ''
    ],

    estado: [
      'BORRADOR'
    ]
  });


  volver(): void {

    this.router.navigate([
      '/mis-eventos'
    ]);
  }


  crear(): void {

    if (
      this.form.invalid ||
      this.guardando()
    ) {
      return;
    }

    const raw =
      this.form.getRawValue();

    this.error.set('');
    this.guardando.set(true);

    this.api.crearEvento({

      ...raw,

      fecha_hora_inicio:
        new Date(
          raw.fecha_hora_inicio
        ).toISOString(),

      fecha_hora_fin:
        new Date(
          raw.fecha_hora_fin
        ).toISOString()

    } as any).subscribe({

      next: () => {

        this.guardando.set(false);

        this.router.navigate([
          '/mis-eventos'
        ]);
      },

      error: respuesta => {

        this.error.set(
          respuesta?.error?.detail ||
          'No fue posible guardar el evento.'
        );

        this.guardando.set(false);
      }
    });
  }
}