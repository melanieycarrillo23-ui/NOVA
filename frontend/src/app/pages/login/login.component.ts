import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({selector:'app-login',standalone:true,imports:[CommonModule,ReactiveFormsModule,RouterLink],template:`
<div class="auth-page"><div class="auth-card">
  <div class="auth-logo">N</div><h1>NOVA</h1><p class="secondary">Accede a tu cuenta para gestionar y vivir tus eventos.</p>
  <form [formGroup]="form" (ngSubmit)="entrar()" class="stack">
    <div class="field"><label>Correo</label><input type="email" formControlName="correo" placeholder="tu correo"></div>
    <div class="field"><label>Contraseña</label><input type="password" formControlName="password" placeholder="Tu contraseña"></div>
    <div class="error" *ngIf="error()">{{error()}}</div>
    <button class="btn btn-primary btn-full" [disabled]="cargando() || form.invalid">{{cargando() ? 'Ingresando...' : 'Iniciar sesión'}}</button>
  </form>
  <div class="divider"></div>
  <p class="secondary">¿No tienes cuenta? <a routerLink="/registro"><strong>Crear cuenta</strong></a></p>
  <p class="muted" style="font-size:.75rem">Demo Docker: admin&#64;nova.local / NovaAdmin123!</p>
</div></div>`})
export class LoginComponent {
  private fb=inject(FormBuilder); private auth=inject(AuthService); private router=inject(Router);
  cargando=signal(false); error=signal('');
  form=this.fb.nonNullable.group({correo:['',[Validators.required,Validators.email]],password:['',[Validators.required]]});
  entrar(){if(this.form.invalid)return;this.cargando.set(true);this.error.set('');this.auth.login(this.form.value.correo!,this.form.value.password!).subscribe({next:()=>this.router.navigate(['/dashboard']),error:e=>{this.error.set(e?.error?.detail||'No fue posible iniciar sesión.');this.cargando.set(false);}})}
}
