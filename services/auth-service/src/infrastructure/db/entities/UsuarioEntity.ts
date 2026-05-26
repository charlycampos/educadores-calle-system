import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { SedeEntity } from './SedeEntity';
import { RolEntity } from './RolEntity';

@Entity('SEC_USUARIO')
export class UsuarioEntity {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ name: 'nombre_completo', type: 'varchar', length: 150 })
  nombreCompleto: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  email: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ name: 'rol_id', type: 'int' })
  rolId: number;

  @ManyToOne(() => RolEntity)
  @JoinColumn({ name: 'rol_id' })
  rol: RolEntity;

  @Column({ name: 'sede_id', type: 'int' })
  sedeId: number;

  @ManyToOne(() => SedeEntity)
  @JoinColumn({ name: 'sede_id' })
  sede: SedeEntity;

  @Column({ name: 'zona_asignada', type: 'varchar', length: 100, nullable: true })
  zonaAsignada: string | null;

  @Column({ type: 'int', default: 1 })
  activo: number; // 1 = activo, 0 = inactivo

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
