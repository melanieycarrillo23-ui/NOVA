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

  totalEventos = signal(0);

  eventos =
    signal<Evento[]>([]);

  inscripciones =
    signal<Inscripcion[]>([]);

  entradas =
    signal<Entrada[]>([]);

  misEventos =
    signal<Evento[]>([]);

  asignados =
    signal<Evento[]>([]);


  roles = computed(
    () =>
      this.auth.usuario()?.roles.length ?? 0
  );


  ngOnInit(): void {

    this.api.listarEventos().subscribe({

      next: respuesta => {
        this.totalEventos.set(respuesta.count);

        this.eventos.set(
          respuesta.results
        );
      },

      error: () => {

        this.eventos.set([]);
        this.totalEventos.set(0);
      }
    });


    this.api.misInscripciones().subscribe({

      next: respuesta => {

        this.inscripciones.set(
          respuesta
        );
      },

      error: () => {

        this.inscripciones.set([]);
      }
    });


    this.api.misEntradas().subscribe({

      next: respuesta => {

        this.entradas.set(
          respuesta
        );
      },

      error: () => {

        this.entradas.set([]);
      }
    });


    if (
      this.auth.tieneRol(
        'ORGANIZADOR',
        'ADMIN'
      )
    ) {

      this.api.misEventos().subscribe({

        next: respuesta => {

          this.misEventos.set(
            respuesta
          );
        },

        error: () => {

          this.misEventos.set([]);
        }
      });
    }


    if (
      this.auth.tieneRol(
        'STAFF',
        'ORGANIZADOR',
        'ADMIN'
      )
    ) {

      this.api.eventosAsignados().subscribe({

        next: respuesta => {

          this.asignados.set(
            respuesta
          );
        },

        error: () => {

          this.asignados.set([]);
        }
      });
    }
  }
}