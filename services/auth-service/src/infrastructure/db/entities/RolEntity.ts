import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('SEC_ROL')
export class RolEntity {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ type: 'varchar', length: 30, unique: true })
  nombre: string; // 'ADMIN_NACIONAL', 'COORDINADOR', etc.

  @Column({ type: 'varchar', length: 200, nullable: true })
  descripcion: string | null;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
