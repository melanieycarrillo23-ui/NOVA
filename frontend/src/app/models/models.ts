export type RolCodigo = 'ADMIN' | 'ORGANIZADOR' | 'STAFF' | 'USUARIO';

export interface Usuario {
  id: number;
  nombre_completo: string;
  correo: string;
  telefono?: string;
  url_imagen_perfil?: string;
  estado: string;
  roles: RolCodigo[];
}

export interface CategoriaEvento { id: number; nombre: string; descripcion?: string; }
export interface Lugar { id: number; nombre: string; direccion?: string; ciudad?: string; region?: string; codigo_pais?: string; }

export interface Evento {
  id: number;
  creado_por?: number;
  organiza_evento?: boolean;
  creador_nombre?: string;
  categoria?: number | null;
  categoria_nombre?: string;
  lugar?: number | null;
  lugar_nombre?: string;
  nombre: string;
  identificador_url: string;
  descripcion_corta?: string;
  descripcion?: string;
  modalidad: 'PRESENCIAL' | 'VIRTUAL' | 'HIBRIDO';
  visibilidad: 'PUBLICO' | 'PRIVADO';
  estado: 'BORRADOR' | 'PUBLICADO' | 'CANCELADO' | 'FINALIZADO';
  capacidad?: number | null;
  fecha_hora_inicio: string;
  fecha_hora_fin: string;
  inicio_inscripciones?: string | null;
  cierre_inscripciones?: string | null;
  url_virtual?: string;
  url_imagen_portada?: string;
}

export interface TipoEntrada { id: number; evento: number; nombre: string; descripcion?: string; precio: string | number; cupo?: number | null;inicio_disponibilidad?: string | null; fin_disponibilidad?: string | null; estado: 'ACTIVO' | 'INACTIVO'; }
export interface Inscripcion { id: number; evento: number; evento_nombre: string; usuario_nombre?: string; estado: string; inscrito_en: string; }
export interface Entrada { id: number; inscripcion: number; evento_id: number; evento_nombre: string; tipo_entrada: number; tipo_entrada_nombre: string; codigo_publico: string; estado: string; emitida_en: string; utilizada_en?: string | null; }
export interface ReporteEvento { evento: { id: number; nombre: string }; inscritos: number; asistieron: number; ausentes: number; porcentaje_asistencia: number; tipos_entrada: Array<{id:number; nombre:string; emitidas:number; usadas:number}>; }
export type RolEquipoCodigo = 'ORGANIZADOR' | 'STAFF';
export interface UsuarioEquipoBusqueda { id: number; nombre_completo: string; correo: string; roles_evento: RolEquipoCodigo[]; }
export interface MiembroEquipoEvento {id: number; evento: number; usuario: number; usuario_detalle: Usuario; rol: number; rol_codigo: RolEquipoCodigo; estado: string; asignado_en: string; }