/**
 * Entidad de dominio: Sede
 * Representa una de las 23 sedes del sistema SEC a nivel nacional.
 * No contiene dependencias externas — solo lógica de negocio pura.
 */
export class Sede {
  constructor(
    public readonly id:           number,
    public readonly codigo:       string,   // 'LIM-01'
    public readonly nombre:       string,   // 'Lima Metropolitana'
    public readonly regionId:     number,
    public readonly region:       string,   // 'CENTRO'
    public readonly departamento: string,
    public readonly provincia:    string,
    public readonly activo:       boolean,
  ) {}

  /**
   * Determina si esta sede es secundaria dentro su región.
   * Las sedes secundarias son: Huaral (399) y Jaén (732).
   */
  esSedeSecundaria(): boolean {
    return this.codigo === '399' || this.codigo === '732';
  }

  /**
   * Verifica si dos sedes pertenecen a la misma región.
   * Sirve para determinar si un traslado es INTERNO o EXTERNO.
   */
  mismaRegion(otraSede: Sede): boolean {
    return this.regionId === otraSede.regionId;
  }
}
