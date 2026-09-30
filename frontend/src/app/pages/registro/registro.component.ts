import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './registro.component.html',
  styleUrl: './registro.component.css'
})
export class RegistroComponent {

  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  error = signal('');
  ok = signal(false);
  cargando = signal(false);
  mostrarPassword = signal(false);

  form = this.fb.nonNullable.group({
    nombre_completo: [
      '',
      [
        Validators.required
      ]
    ],
    correo: [
      '',
      [
        Validators.required,
        Validators.email
      ]
    ],
    telefono: [
      ''
    ],
    password: [
      '',
      [
        Validators.required,
        Validators.minLength(8)
      ]
    ]
  });

  alternarPassword(): void {
    this.mostrarPassword.update(
      valor => !valor
    );
  }

  campoInvalido(
    campo: 'nombre_completo' | 'correo' | 'telefono' | 'password'
  ): boolean {
    const control = this.form.controls[campo];

    return control.invalid && control.touched;
  }

  crear(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.error.set('');
    this.ok.set(false);
    this.cargando.set(true);

    this.auth.registro(
      this.form.getRawValue()
    ).subscribe({
      next: () => {
        this.ok.set(true);
        this.cargando.set(false);

        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 1000);
      },

      error: error => {
        this.cargando.set(false);

        const respuesta = error?.error;

        if (respuesta?.correo) {
          this.error.set(
            Array.isArray(respuesta.correo)
              ? respuesta.correo[0]
              : respuesta.correo
          );
          return;
        }

        if (respuesta?.password) {
          this.error.set(
            Array.isArray(respuesta.password)
              ? respuesta.password[0]
              : respuesta.password
          );
          return;
        }

        if (respuesta?.detail) {
          this.error.set(respuesta.detail);
          return;
        }

        this.error.set(
          'No fue posible crear la cuenta. Revisa los datos ingresados.'
        );
      }
    });
  }
}