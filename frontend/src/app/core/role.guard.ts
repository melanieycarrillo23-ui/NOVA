import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { RolCodigo } from '../models/models';

export const roleGuard = (...roles: RolCodigo[]): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.tieneRol(...roles) ? true : router.createUrlTree(['/dashboard']);
};
