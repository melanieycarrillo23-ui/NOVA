import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const esApi = req.url.startsWith(`${environment.apiUrl}/`);
  const esRutaAuth = ['/auth/token/', '/auth/registro/', '/auth/logout/']
    .some(ruta => req.url.startsWith(`${environment.apiUrl}${ruta}`));

  if (!esApi || esRutaAuth) {
    return next(req);
  }

  const token = auth.accessToken;
  const conToken = (access: string) => req.clone({ setHeaders: { Authorization: `Bearer ${access}` } });

  return next(token ? conToken(token) : req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401) {
        return throwError(() => error);
      }

      // Otra solicitud puede haber terminado la renovación mientras esta respondía.
      const actual = auth.accessToken;
      if (actual && actual !== token) {
        return next(conToken(actual));
      }

      if (!auth.refreshToken) {
        auth.limpiarSesion();
        void router.navigate(['/login']);
        return throwError(() => error);
      }

      return auth.refrescar().pipe(
        catchError(refreshError => {
          if (!auth.refreshToken) {
            void router.navigate(['/login']);
          }
          return throwError(() => refreshError);
        }),
        switchMap(resp => next(conToken(resp.access)))
      );
    })
  );
};
