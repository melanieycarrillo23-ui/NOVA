import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { environment } from '../../environments/environment';

import {
  CategoriaEvento,
  Entrada,
  Evento,
  Inscripcion,
  MiembroEquipoEvento,
  ReporteEvento,
  RolEquipoCodigo,
  TipoEntrada,
  Usuario,
  UsuarioEquipoBusqueda
} from '../models/models';


interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}


interface CodigoValidacionEntrada {
  entrada_id: number;
  codigo_publico: string;
  estado: string;
}


export interface ErrorImportacion {
  fila: number;
  correo?: string;
  detalle: string;
}


export interface ResultadoImportacion {
  detail: string;
  importados: number;
  omitidos: number;
  errores: ErrorImportacion[];
}


@Injectable({
  providedIn: 'root'
})
export class EventosService {

  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;


  listarCategorias() {
    return this.http.get<
      Paginated<CategoriaEvento>
    >(
      `${this.api}/categorias/`
    );
  }


  crearCategoria(
    data: {
      nombre: string;
      descripcion?: string;
    }
  ) {
    return this.http.post<CategoriaEvento>(
      `${this.api}/categorias/`,
      data
    );
  }


  actualizarCategoria(
    id: number,
    data: Partial<CategoriaEvento>
  ) {
    return this.http.patch<CategoriaEvento>(
      `${this.api}/categorias/${id}/`,
      data
    );
  }


  eliminarCategoria(
    id: number
  ) {
    return this.http.delete(
      `${this.api}/categorias/${id}/`
    );
  }


  listarEventos(
    pagina = 1,
    busqueda = '',
    modalidad = ''
  ) {

    let params =
      new HttpParams().set(
        'page',
        pagina
      );

    const texto =
      busqueda.trim();

    if (texto) {
      params = params.set(
        'search',
        texto
      );
    }

    if (modalidad) {
      params = params.set(
        'modalidad',
        modalidad
      );
    }

    return this.http.get<
      Paginated<Evento>
    >(
      `${this.api}/eventos/`,
      {
        params
      }
    );
  }


  verEvento(
    id: number
  ) {
    return this.http.get<Evento>(
      `${this.api}/eventos/${id}/`
    );
  }


  crearEvento(
    data: Partial<Evento>
  ) {
    return this.http.post<Evento>(
      `${this.api}/eventos/`,
      data
    );
  }


  misEventos() {
    return this.http.get<Evento[]>(
      `${this.api}/eventos/mios/`
    );
  }


  eventosAsignados() {
    return this.http.get<Evento[]>(
      `${this.api}/eventos/asignados/`
    );
  }


  actualizarEvento(
    id: number,
    data: Partial<Evento>
  ) {
    return this.http.patch<Evento>(
      `${this.api}/eventos/${id}/`,
      data
    );
  }


  tiposEntrada(
    evento?: number
  ) {
    const params =
      evento
        ? new HttpParams().set(
            'evento',
            evento
          )
        : undefined;

    return this.http.get<
      Paginated<TipoEntrada>
    >(
      `${this.api}/tipos-entrada/`,
      {
        params
      }
    );
  }


  crearTipoEntrada(
    data: Partial<TipoEntrada>
  ) {
    return this.http.post<TipoEntrada>(
      `${this.api}/tipos-entrada/`,
      data
    );
  }


  actualizarTipoEntrada(
    id: number,
    data: Partial<TipoEntrada>
  ) {
    return this.http.patch<TipoEntrada>(
      `${this.api}/tipos-entrada/${id}/`,
      data
    );
  }


  eliminarTipoEntrada(
    id: number
  ) {
    return this.http.delete(
      `${this.api}/tipos-entrada/${id}/`
    );
  }


  inscribirse(
    eventoId: number,
    tipoEntradaId: number
  ) {
    return this.http.post<Entrada>(
      `${this.api}/eventos/${eventoId}/inscribirse/`,
      {
        tipo_entrada_id:
          tipoEntradaId
      }
    );
  }


  misInscripciones() {
    return this.http.get<Inscripcion[]>(
      `${this.api}/inscripciones/mias/`
    );
  }


  cancelarInscripcion(
    id: number
  ) {
    return this.http.post<{
      detail: string;
      inscripcion_id: number;
      estado: string;
    }>(
      `${this.api}/inscripciones/${id}/cancelar/`,
      {}
    );
  }


  misEntradas() {
    return this.http.get<Entrada[]>(
      `${this.api}/entradas/mias/`
    );
  }


  qrBlob(
    entradaId: number
  ) {
    return this.http.get(
      `${this.api}/entradas/${entradaId}/qr/`,
      {
        responseType: 'blob'
      }
    );
  }


  codigoValidacion(
    entradaId: number
  ) {
    return this.http.get<
      CodigoValidacionEntrada
    >(
      `${this.api}/entradas/${entradaId}/codigo-validacion/`
    );
  }


  asistentes(
    eventoId: number,
    pagina = 1,
    busqueda = '',
    estado = ''
  ) {

    let params =
      new HttpParams().set(
        'page',
        pagina
      );

    const texto =
      busqueda.trim();

    if (texto) {
      params = params.set(
        'search',
        texto
      );
    }

    if (estado) {
      params = params.set(
        'estado',
        estado
      );
    }

    return this.http.get<
      Paginated<Inscripcion>
    >(
      `${this.api}/eventos/${eventoId}/asistentes/`,
      {
        params
      }
    );
  }


  exportarAsistentes(
    eventoId: number
  ) {
    return this.http.get(
      `${this.api}/eventos/${eventoId}/exportar-asistentes/`,
      {
        responseType: 'blob'
      }
    );
  }


  importarAsistentes(
    eventoId: number,
    archivo: File
  ) {
    const formData =
      new FormData();

    formData.append(
      'archivo',
      archivo
    );

    return this.http.post<
      ResultadoImportacion
    >(
      `${this.api}/eventos/${eventoId}/importar-asistentes/`,
      formData
    );
  }


  reporte(
    eventoId: number
  ) {
    return this.http.get<
      ReporteEvento
    >(
      `${this.api}/reportes/evento/${eventoId}/`
    );
  }


  escanear(
    eventoId: number,
    token_qr: string
  ) {
    return this.http.post<any>(
      `${this.api}/validaciones/escanear/`,
      {
        evento_id: eventoId,
        token_qr
      }
    );
  }


  usuarios(
    pagina = 1,
    busqueda = '',
    estado = ''
  ) {
    let params =
      new HttpParams().set(
        'page',
        pagina
      );

    const texto =
      busqueda.trim();

    if (texto) {
      params = params.set(
        'search',
        texto
      );
    }

    if (estado) {
      params = params.set(
        'estado',
        estado
      );
    }

    return this.http.get<
      Paginated<Usuario>
    >(
      `${this.api}/usuarios/`,
      {
        params
      }
    );
  }


  cambiarEstadoUsuario(
    id: number,
    estado:
      | 'ACTIVO'
      | 'BLOQUEADO'
      | 'INACTIVO'
  ) {
    return this.http.patch<Usuario>(
      `${this.api}/usuarios/${id}/estado/`,
      {
        estado
      }
    );
  }


  buscarUsuarioEquipo(
    eventoId: number,
    correo: string
  ) {
    const params =
      new HttpParams().set(
        'correo',
        correo
      );

    return this.http.get<
      UsuarioEquipoBusqueda
    >(
      `${this.api}/eventos/${eventoId}/buscar-usuario-equipo/`,
      {
        params
      }
    );
  }


  asignarEquipo(
    eventoId: number,
    correo: string,
    rol: RolEquipoCodigo
  ) {
    return this.http.post<
      MiembroEquipoEvento
    >(
      `${this.api}/eventos/${eventoId}/asignar-equipo/`,
      {
        correo,
        rol
      }
    );
  }


  equipoEvento(
    eventoId: number
  ) {
    const params =
      new HttpParams().set(
        'evento',
        eventoId
      );

    return this.http.get<
      Paginated<MiembroEquipoEvento>
    >(
      `${this.api}/equipo-eventos/`,
      {
        params
      }
    );
  }


  eliminarMiembroEquipo(
    id: number
  ) {
    return this.http.delete(
      `${this.api}/equipo-eventos/${id}/`
    );
  }
}