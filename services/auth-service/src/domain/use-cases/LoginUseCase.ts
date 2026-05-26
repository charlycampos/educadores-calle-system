import { generarToken, verificarPassword, UnauthorizedError } from '@sec/shared';
import { IUsuarioRepository } from '../repositories/IUsuarioRepository';

interface LoginInput {
  email:    string;
  password: string;
}

interface LoginOutput {
  token: string;
  user: {
    id:          number;
    nombre:      string;
    email:       string;
    rol:         string;
    sedeId:      number;
    sedeCodigo:  string;
    zona:        string | null;
  };
}

/**
 * Caso de uso: Login
 * Valida credenciales y genera el JWT con sedeId para multi-tenancy.
 * No conoce Express ni Oracle — solo habla con el repositorio (interfaz).
 */
export class LoginUseCase {
  constructor(private readonly usuarioRepo: IUsuarioRepository) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    const { email, password } = input;

    const usuario = await this.usuarioRepo.findByEmail(email);

    if (!usuario) {
      throw new UnauthorizedError('Credenciales inválidas');
    }

    if (!usuario.estaActivo()) {
      throw new UnauthorizedError('Usuario inactivo. Contacte al administrador.');
    }

    const passwordValido = await verificarPassword(password, usuario.passwordHash);
    if (!passwordValido) {
      throw new UnauthorizedError('Credenciales inválidas');
    }

    const token = generarToken({
      userId:     usuario.id,
      email:      usuario.email,
      rol:        usuario.rol,
      sedeId:     usuario.sedeId,
      sedeCodigo: usuario.sedeCodigo,
      regionId:   usuario.regionId,
    });

    return {
      token,
      user: {
        id:         usuario.id,
        nombre:     usuario.nombreCompleto,
        email:      usuario.email,
        rol:        usuario.rol,
        sedeId:     usuario.sedeId,
        sedeCodigo: usuario.sedeCodigo,
        zona:       usuario.zonaAsignada,
      },
    };
  }
}
