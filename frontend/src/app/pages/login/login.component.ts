import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {

  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  cargando = signal(false);
  error = signal('');
  mostrarPassword = signal(false);

  form = this.fb.nonNullable.group({
    correo: [
      '',
      [
        Validators.required,
        Validators.email
      ]
    ],
    password: [
      '',
      [
        Validators.required
      ]
    ]
  });

  alternarPassword(): void {
    this.mostrarPassword.update(
      valor => !valor
    );
  }

  campoInvalido(campo: 'correo' | 'password'): boolean {
    const control = this.form.controls[campo];

    return control.invalid && control.touched;
  }

  entrar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.error.set('');

    const {
      correo,
      password
    } = this.form.getRawValue();

    this.auth.login(
      correo,
      password
    ).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },

      error: error => {
        this.error.set(
          error?.error?.detail ||
          'No fue posible iniciar sesión. Verifica tus datos.'
        );

        this.cargando.set(false);
      }
    });
  }
}