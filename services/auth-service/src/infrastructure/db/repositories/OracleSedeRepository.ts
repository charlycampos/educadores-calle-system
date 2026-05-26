import { Repository } from 'typeorm';
import { SedeEntity } from '../entities/SedeEntity';
import { ISedeRepository } from '../../../domain/repositories/ISedeRepository';
import { Sede } from '../../../domain/entities/Sede';

/**
 * Repositorio Oracle — usa raw SQL para evitar el problema de
 * TypeORM que genera identificadores entre comillas dobles (case-sensitive
 * en Oracle), lo que causa ORA-00904.
 * Oracle devuelve los nombres de columna en MAYÚSCULAS en raw queries.
 */
export class OracleSedeRepository implements ISedeRepository {
  constructor(private readonly repo: Repository<SedeEntity>) {}

  private readonly SELECT_SEDE = `
    SELECT id, codigo, nombre, region_id, region, departamento, provincia, activo
    FROM   SEC_SEDE
  `;

  private rowToSede(row: any): Sede {
    return new Sede(
      row.ID,
      row.CODIGO,
      row.NOMBRE,
      row.REGION_ID,
      row.REGION,
      row.DEPARTAMENTO,
      row.PROVINCIA,
      row.ACTIVO === 1,
    );
  }

  async findAll(): Promise<Sede[]> {
    const rows = await this.repo.query(
      `${this.SELECT_SEDE} WHERE activo = 1 ORDER BY nombre ASC`
    );
    return rows.map((r: any) => this.rowToSede(r));
  }

  async findById(id: number): Promise<Sede | null> {
    const rows = await this.repo.query(
      `${this.SELECT_SEDE} WHERE id = :1`, [id]
    );
    return rows.length > 0 ? this.rowToSede(rows[0]) : null;
  }

  async findByCodigo(codigo: string): Promise<Sede | null> {
    const rows = await this.repo.query(
      `${this.SELECT_SEDE} WHERE codigo = :1`, [codigo]
    );
    return rows.length > 0 ? this.rowToSede(rows[0]) : null;
  }

  async findByRegion(regionId: number): Promise<Sede[]> {
    const rows = await this.repo.query(
      `${this.SELECT_SEDE} WHERE region_id = :1 AND activo = 1 ORDER BY nombre ASC`,
      [regionId]
    );
    return rows.map((r: any) => this.rowToSede(r));
  }
}
