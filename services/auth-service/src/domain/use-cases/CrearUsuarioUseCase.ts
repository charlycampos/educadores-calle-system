import { Rol, hashPassword, ConflictError, ForbiddenError, NotFoundError } from '@sec/shared';
import { IUsuarioRepository, CrearUsuarioDTO } from '../repositories/IUsuarioRepository';
import { ISedeRepository } from '../repositories/ISedeRepository';
import { Usuario } from '../entities/Usuario';

interface CrearUsuarioInput {
  nombreCompleto: string;
  email:          string;
  password:       string;
  rol:            Rol;
  sedeId:         number;
  zonaAsignada?:  string;
  creadoPor:      Usuario; // El usuario que ejecuta la acción
}

/**
 * Caso de uso: Crear Usuario
 * Valida permisos, verifica que la sede exista y que el email no esté en uso.
 */
export class CrearUsuarioUseCase {
  constructor(
    private readonly usuarioRepo: IUsuarioRepository,
    private readonly sedeRepo:   ISedeRepository,
  ) {}

  async execute(input: CrearUsuarioInput): Promise<Usuario> {
    const { nombreCompleto, email, password, rol, sedeId, zonaAsignada, creadoPor } = input;

    // Verificar permisos del creador
    if (!creadoPor.puedeCrearRol(rol)) {
      throw new ForbiddenError(`No puede crear usuarios con rol ${rol}`);
    }

    if (!creadoPor.puedeGestionarSede(sedeId)) {
      throw new ForbiddenError('No puede crear usuarios en otra sede');
    }

    // Verificar que la sede existe
    const sede = await this.sedeRepo.findById(sedeId);
    if (!sede) {
      throw new NotFoundError('Sede', sedeId);
    }

    // Verificar email único
    const emailExiste = await this.usuarioRepo.existeEmail(email);
    if (emailExiste) {
      throw new ConflictError(`El email '${email}' ya está registrado`);
    }

    const passwordHash = await hashPassword(password);

    const dto: CrearUsuarioDTO = {
      nombreCompleto,
      email,
      passwordHash,
      rol,
      sedeId,
      zonaAsignada,
    };

    return this.usuarioRepo.create(dto);
  }
}
