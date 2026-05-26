import { Rol } from '@sec/shared';

/**
 * Entidad de dominio: Usuario
 * Lógica de negocio pura — sin dependencias de Express, TypeORM u Oracle.
 */
export class Usuario {
  constructor(
    public readonly id:             number,
    public readonly nombreCompleto: string,
    public readonly email:          string,
    public readonly passwordHash:   string,
    public readonly rol:            Rol,
    public readonly sedeId:         number,
    public readonly sedeCodigo:     string,
    public readonly regionId:       number,
    public readonly zonaAsignada:   string | null,
    public readonly activo:         boolean,
  ) {}

  /** El usuario está habilitado para ingresar al sistema */
  estaActivo(): boolean {
    return this.activo;
  }

  /**
   * Verifica si el usuario puede gestionar otra sede.
   * ADMIN_NACIONAL puede gestionar cualquier sede.
   * Los demás solo pueden gestionar su propia sede.
   */
  puedeGestionarSede(sedeId: number): boolean {
    if (this.rol === Rol.ADMIN_NACIONAL) return true;
    return this.sedeId === sedeId;
  }

  /**
   * Verifica si puede crear un usuario con el rol dado.
   * COORDINADOR no puede crear ADMIN_NACIONAL ni otro COORDINADOR.
   */
  puedeCrearRol(rolObjetivo: Rol): boolean {
    if (this.rol === Rol.ADMIN_NACIONAL) return true;
    if (this.rol === Rol.ADMIN_SEDE) {
      return rolObjetivo !== Rol.ADMIN_NACIONAL;
    }
    if (this.rol === Rol.COORDINADOR) {
      return ![Rol.ADMIN_NACIONAL, Rol.ADMIN_SEDE, Rol.COORDINADOR].includes(rolObjetivo);
    }
    return false;
  }
}
