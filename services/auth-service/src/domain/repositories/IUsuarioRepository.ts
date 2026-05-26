import { Rol } from '@sec/shared';
import { Usuario } from '../entities/Usuario';

export interface CrearUsuarioDTO {
  nombreCompleto: string;
  email:          string;
  passwordHash:   string;
  rol:            Rol;
  sedeId:         number;
  zonaAsignada?:  string;
}

export interface ActualizarUsuarioDTO {
  nombreCompleto?: string;
  rol?:            Rol;
  rolId?:          number;
  zonaAsignada?:   string;
  activo?:         boolean;
}

/**
 * Puerto (interfaz) del repositorio de usuarios.
 * El dominio solo conoce esta interfaz, nunca la implementación Oracle.
 */
export interface IUsuarioRepository {
  findByEmail(email: string): Promise<Usuario | null>;
  findById(id: number): Promise<Usuario | null>;
  findBySede(sedeId: number): Promise<Usuario[]>;
  findAll(): Promise<Usuario[]>;
  create(data: CrearUsuarioDTO): Promise<Usuario>;
  update(id: number, data: ActualizarUsuarioDTO): Promise<Usuario>;
  existeEmail(email: string): Promise<boolean>;
}
