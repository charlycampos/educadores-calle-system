import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/** Hash SHA-256 para integridad de documentos PDF del expediente */
export const hashDocumento = (contenido: string | Buffer): string => {
  return crypto.createHash('sha256').update(contenido).digest('hex');
};

/** Verifica integridad de un documento */
export const verificarHashDocumento = (
  contenido: string | Buffer,
  hashEsperado: string,
): boolean => {
  return hashDocumento(contenido) === hashEsperado;
};

/** Hash bcrypt para contraseñas de usuarios */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

/** Verifica contraseña contra hash bcrypt */
export const verificarPassword = async (
  password: string,
  hash: string,
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};
