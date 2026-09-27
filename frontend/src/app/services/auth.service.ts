import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { finalize, of, switchMap, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { RolCodigo, Usuario } from '../models/models';

interface LoginResponse {
  access: string;
  refresh: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private http = inject(HttpClient);
  private api = environment.apiUrl;

  usuario = signal<Usuario | null>(this.cargarUsuario());

  autenticado = computed(
    () => !!this.usuario() && !!this.accessToken
  );

  get accessToken(): string | null {
    return localStorage.getItem('nova_access');
  }

  get refreshToken(): string | null {
    return localStorage.getItem('nova_refresh');
  }

  login(correo: string, password: string) {
    return this.http.post<LoginResponse>(
      `${this.api}/auth/token/`,
      {
        correo,
        password
      }
    ).pipe(
      tap(resp => {
        localStorage.setItem('nova_access', resp.access);
        localStorage.setItem('nova_refresh', resp.refresh);
      }),
      switchMap(() => this.cargarPerfil())
    );
  }

  registro(data: {
    nombre_completo: string;
    correo: string;
    telefono?: string;
    password: string;
  }) {
    return this.http.post(
      `${this.api}/auth/registro/`,
      data
    );
  }

  refrescar() {
    return this.http.post<{
      access: string;
      refresh?: string;
    }>(
      `${this.api}/auth/token/refresh/`,
      {
        refresh: this.refreshToken
      }
    ).pipe(
      tap(resp => {
        localStorage.setItem(
          'nova_access',
          resp.access
        );

        if (resp.refresh) {
          localStorage.setItem(
            'nova_refresh',
            resp.refresh
          );
        }
      })
    );
  }

  cargarPerfil() {
    return this.http.get<Usuario>(
      `${this.api}/auth/me/`
    ).pipe(
      tap(usuario => {
        this.usuario.set(usuario);

        localStorage.setItem(
          'nova_usuario',
          JSON.stringify(usuario)
        );
      })
    );
  }

  actualizarPerfil(data: {
    nombre_completo: string;
    telefono?: string;
    url_imagen_perfil?: string;
  }) {
    return this.http.patch<Usuario>(
      `${this.api}/auth/me/`,
      data
    ).pipe(
      tap(usuario => {
        this.usuario.set(usuario);

        localStorage.setItem(
          'nova_usuario',
          JSON.stringify(usuario)
        );
      })
    );
  }

  tieneRol(...roles: RolCodigo[]): boolean {
    const actuales = this.usuario()?.roles ?? [];

    return roles.some(
      rol => actuales.includes(rol)
    );
  }

  cerrarSesion() {
    const refresh = this.refreshToken;

    if (!refresh) {
      this.limpiarSesion();
      return of(void 0);
    }

    return this.http.post<void>(
      `${this.api}/auth/logout/`,
      { refresh }
    ).pipe(
      finalize(() => {
        this.limpiarSesion();
      })
    );
  }
  

  limpiarSesion(): void {
    localStorage.removeItem('nova_access');
    localStorage.removeItem('nova_refresh');
    localStorage.removeItem('nova_usuario');

    this.usuario.set(null);
  }

  private cargarUsuario(): Usuario | null {
    try {
      return JSON.parse(
        localStorage.getItem('nova_usuario') || 'null'
      );
    }
    catch {
      return null;
    }
  }
}