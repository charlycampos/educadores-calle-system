import { Sede } from '../entities/Sede';

/**
 * Puerto (interfaz) del repositorio de sedes.
 */
export interface ISedeRepository {
  findAll(): Promise<Sede[]>;
  findById(id: number): Promise<Sede | null>;
  findByCodigo(codigo: string): Promise<Sede | null>;
  findByRegion(regionId: number): Promise<Sede[]>;
}
