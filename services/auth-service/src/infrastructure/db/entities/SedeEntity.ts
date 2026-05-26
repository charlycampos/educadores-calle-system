import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

/**
 * Entidad TypeORM de Sede.
 * Compatible con Oracle: tipos VARCHAR2, NUMBER, TIMESTAMP.
 */
@Entity('SEC_SEDE')
export class SedeEntity {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ type: 'varchar', length: 10, unique: true })
  codigo: string; // 'LIM-01'

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ name: 'region_id', type: 'int' })
  regionId: number;

  @Column({ type: 'varchar', length: 20 })
  region: string; // NORTE | CENTRO | SUR | ORIENTE

  @Column({ type: 'varchar', length: 60 })
  departamento: string;

  @Column({ type: 'varchar', length: 60 })
  provincia: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  direccion: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telefono: string | null;

  @Column({ type: 'int', default: 1 })
  activo: number; // 1 = activo, 0 = inactivo (Oracle no tiene BOOLEAN)

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
