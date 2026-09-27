import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { roleGuard } from './core/role.guard';
import { LoginComponent } from './pages/login/login.component';
import { RegistroComponent } from './pages/registro/registro.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { ExplorarEventosComponent } from './pages/explorar-eventos/explorar-eventos.component';
import { DetalleEventoComponent } from './pages/detalle-evento/detalle-evento.component';
import { MisInscripcionesComponent } from './pages/mis-inscripciones/mis-inscripciones.component';
import { MisEntradasComponent } from './pages/mis-entradas/mis-entradas.component';
import { EventosAsignadosComponent } from './pages/eventos-asignados/eventos-asignados.component';
import { ValidarQrComponent } from './pages/validar-qr/validar-qr.component';
import { AsistentesComponent } from './pages/asistentes/asistentes.component';
import { MisEventosComponent } from './pages/mis-eventos/mis-eventos.component';
import { CrearEventoComponent } from './pages/crear-evento/crear-evento.component';
import { AdministrarEventoComponent } from './pages/administrar-evento/administrar-evento.component';
import { ReportesComponent } from './pages/reportes/reportes.component';
import { UsuariosAdminComponent } from './pages/usuarios-admin/usuarios-admin.component';
import { CategoriasAdminComponent } from './pages/categorias-admin/categorias-admin.component';
import { PerfilComponent } from './pages/perfil/perfil.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'registro', component: RegistroComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'eventos', component: ExplorarEventosComponent, canActivate: [authGuard] },
  { path: 'eventos/:id', component: DetalleEventoComponent, canActivate: [authGuard] },
  { path: 'mis-inscripciones', component: MisInscripcionesComponent, canActivate: [authGuard] },
  { path: 'mis-entradas', component: MisEntradasComponent, canActivate: [authGuard] },
  { path: 'eventos-asignados', component: EventosAsignadosComponent, canActivate: [authGuard, roleGuard('STAFF','ORGANIZADOR','ADMIN')] },
  { path: 'validar-qr', component: ValidarQrComponent, canActivate: [authGuard, roleGuard('STAFF','ORGANIZADOR','ADMIN')] },
  { path: 'asistentes', component: AsistentesComponent, canActivate: [authGuard, roleGuard('STAFF','ORGANIZADOR','ADMIN')] },
  { path: 'mis-eventos', component: MisEventosComponent, canActivate: [authGuard, roleGuard('ORGANIZADOR','ADMIN')] },
  { path: 'crear-evento', component: CrearEventoComponent, canActivate: [authGuard, roleGuard('ORGANIZADOR','ADMIN')] },
  { path: 'administrar-evento', component: AdministrarEventoComponent, canActivate: [authGuard, roleGuard('ORGANIZADOR','ADMIN')] },
  { path: 'reportes', component: ReportesComponent, canActivate: [authGuard, roleGuard('ORGANIZADOR','ADMIN')] },
  { path: 'usuarios', component: UsuariosAdminComponent, canActivate: [authGuard, roleGuard('ADMIN')] },
  { path: 'categorias', component: CategoriasAdminComponent, canActivate: [authGuard, roleGuard('ADMIN')] },
  { path: 'perfil', component: PerfilComponent, canActivate: [authGuard] },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' }
];
