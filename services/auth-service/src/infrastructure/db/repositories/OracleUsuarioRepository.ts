import { Repository } from 'typeorm';
import { Rol } from '@sec/shared';
import { UsuarioEntity } from '../entities/UsuarioEntity';
import { IUsuarioRepository, CrearUsuarioDTO, ActualizarUsuarioDTO } from '../../../domain/repositories/IUsuarioRepository';
import { Usuario } from '../../../domain/entities/Usuario';

/**
 * Repositorio Oracle — usa raw SQL para evitar el problema de
 * TypeORM que genera identificadores entre comillas dobles (case-sensitive
 * en Oracle), lo que causa ORA-00904.
 * Oracle devuelve los nombres de columna en MAYÚSCULAS en raw queries.
 */
export class OracleUsuarioRepository implements IUsuarioRepository {
  constructor(private readonly repo: Repository<UsuarioEntity>) {}

  private readonly SELECT_USUARIO = `
    SELECT u.id, u.nombre_completo, u.email, u.password_hash,
           u.sede_id, u.zona_asignada, u.activo,
           r.nombre AS rol_nombre,
           s.codigo AS sede_codigo, s.region_id
    FROM   SEC_USUARIO u
    JOIN   SEC_ROL  r ON r.id = u.rol_id
    JOIN   SEC_SEDE s ON s.id = u.sede_id
  `;

  // Oracle devuelve columnas en MAYÚSCULAS
  private rowToUsuario(row: any): Usuario {
    return new Usuario(
      row.ID,
      row.NOMBRE_COMPLETO,
      row.EMAIL,
      row.PASSWORD_HASH,
      row.ROL_NOMBRE as Rol,
      row.SEDE_ID,
      row.SEDE_CODIGO,
      row.REGION_ID,
      row.ZONA_ASIGNADA ?? null,
      row.ACTIVO === 1,
    );
  }

  async findByEmail(email: string): Promise<Usuario | null> {
    const rows = await this.repo.query(
      `${this.SELECT_USUARIO} WHERE u.email = :1`, [email]
    );
    return rows.length > 0 ? this.rowToUsuario(rows[0]) : null;
  }

  async findById(id: number): Promise<Usuario | null> {
    const rows = await this.repo.query(
      `${this.SELECT_USUARIO} WHERE u.id = :1`, [id]
    );
    return rows.length > 0 ? this.rowToUsuario(rows[0]) : null;
  }

  async findBySede(sedeId: number): Promise<Usuario[]> {
    const rows = await this.repo.query(
      `${this.SELECT_USUARIO} WHERE u.sede_id = :1 AND u.activo = 1 ORDER BY u.nombre_completo ASC`,
      [sedeId]
    );
    return rows.map((r: any) => this.rowToUsuario(r));
  }

  async findAll(): Promise<Usuario[]> {
    const rows = await this.repo.query(
      `${this.SELECT_USUARIO} ORDER BY u.nombre_completo ASC`
    );
    return rows.map((r: any) => this.rowToUsuario(r));
  }

  async create(data: CrearUsuarioDTO): Promise<Usuario> {
    const rolId  = await this.getRolId(data.rol);
    const rows = await this.repo.query(`
      INSERT INTO SEC_USUARIO (nombre_completo, email, password_hash, rol_id, sede_id, zona_asignada, activo)
      VALUES (:1, :2, :3, :4, :5, :6, 1)
      RETURNING id INTO :7
    `, [
      data.nombreCompleto,
      data.email,
      data.passwordHash,
      rolId,
      data.sedeId,
      data.zonaAsignada ?? null,
      { dir: 3003, type: 2010 },  // OUT bind para Oracle RETURNING
    ]);

    // Obtener el ID insertado via la tabla
    const inserted = await this.repo.query(
      `${this.SELECT_USUARIO} WHERE u.email = :1`, [data.email]
    );
    return this.rowToUsuario(inserted[0]);
  }

  async update(id: number, data: ActualizarUsuarioDTO): Promise<Usuario> {
    const sets: string[] = [];
    const params: any[]  = [];
    let   idx = 1;

    if (data.nombreCompleto !== undefined) {
      sets.push(`nombre_completo = :${idx++}`);
      params.push(data.nombreCompleto);
    }
    if (data.zonaAsignada !== undefined) {
      sets.push(`zona_asignada = :${idx++}`);
      params.push(data.zonaAsignada ?? null);
    }
    if (data.activo !== undefined) {
      sets.push(`activo = :${idx++}`);
      params.push(data.activo ? 1 : 0);
    }
    if (data.rolId !== undefined) {
      sets.push(`rol_id = :${idx++}`);
      params.push(data.rolId);
    } else if (data.rol !== undefined) {
      sets.push(`rol_id = :${idx++}`);
      params.push(await this.getRolId(data.rol));
    }
    sets.push(`updated_at = SYSTIMESTAMP`);
    params.push(id);

    await this.repo.query(
      `UPDATE SEC_USUARIO SET ${sets.join(', ')} WHERE id = :${idx}`,
      params
    );
    return this.findById(id) as Promise<Usuario>;
  }

  async existeEmail(email: string): Promise<boolean> {
    const rows = await this.repo.query(
      `SELECT COUNT(*) AS CNT FROM SEC_USUARIO WHERE email = :1`, [email]
    );
    return rows[0].CNT > 0;
  }

  private async getRolId(rol: Rol): Promise<number> {
    // Oracle usa parámetros nombrados (:1) — NO el estilo PostgreSQL ($1)
    const result = await this.repo.query(
      'SELECT id FROM SEC_ROL WHERE nombre = :1', [rol]
    );
    if (!result || result.length === 0) throw new Error(`Rol '${rol}' no encontrado`);
    return result[0].ID ?? result[0].id;
  }
}
