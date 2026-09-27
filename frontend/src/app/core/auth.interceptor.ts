import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.accessToken;
  const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      const esRutaToken = req.url.includes('/auth/token/');
      if (error.status !== 401 || !auth.refreshToken || esRutaToken) return throwError(() => error);
      return auth.refrescar().pipe(
        switchMap(resp => next(req.clone({ setHeaders: { Authorization: `Bearer ${resp.access}` } }))),
        catchError(refreshError => {
          auth.limpiarSesion();
          return throwError(() => refreshError);
        })
      );
    })
  );
};
