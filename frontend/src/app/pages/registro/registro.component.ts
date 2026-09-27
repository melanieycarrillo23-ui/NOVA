import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
@Component({selector:'app-registro',standalone:true,imports:[CommonModule,ReactiveFormsModule,RouterLink],template:`
<div class="auth-page"><div class="auth-card"><div class="auth-logo">N</div><h1>Crear cuenta</h1><p class="secondary">Tu cuenta puede reunir varios roles dentro de NOVA.</p>
<form [formGroup]="form" (ngSubmit)="crear()" class="stack">
<div class="field"><label>Nombre completo</label><input formControlName="nombre_completo"></div>
<div class="field"><label>Correo</label><input type="email" formControlName="correo"></div>
<div class="field"><label>Teléfono</label><input formControlName="telefono"></div>
<div class="field"><label>Contraseña</label><input type="password" formControlName="password"></div>
<div class="error" *ngIf="error()">{{error()}}</div><div class="notice" *ngIf="ok()">Cuenta creada. Ya puedes iniciar sesión.</div>
<button class="btn btn-primary btn-full" [disabled]="form.invalid">Crear cuenta</button></form><div class="divider"></div><a routerLink="/login" class="secondary">Volver al inicio de sesión</a></div></div>`})
export class RegistroComponent{private fb=inject(FormBuilder);private auth=inject(AuthService);private router=inject(Router);error=signal('');ok=signal(false);form=this.fb.nonNullable.group({nombre_completo:['',Validators.required],correo:['',[Validators.required,Validators.email]],telefono:[''],password:['',[Validators.required,Validators.minLength(8)]]});crear(){this.error.set('');this.auth.registro(this.form.getRawValue()).subscribe({next:()=>{this.ok.set(true);setTimeout(()=>this.router.navigate(['/login']),800)},error:e=>this.error.set(JSON.stringify(e?.error||'No fue posible crear la cuenta.'))})}}
