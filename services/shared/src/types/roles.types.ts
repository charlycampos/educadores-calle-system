/**
 * Roles del Sistema SEC
 * ADMIN_NACIONAL : OGTI/DGNNA central — ve todas las sedes
 * ADMIN_SEDE     : Administra su sede
 * COORDINADOR    : Supervisa su sede (1 por sede)
 * EDUCADOR       : Educador de calle — solo sus casos
 * PSICOLOGO      : Solo sus casos
 * TRABAJADOR_SOCIAL: Solo sus casos
 * ABOGADO        : Apoyo legal — solo sus casos
 */
export enum Rol {
  ADMIN_NACIONAL    = 'ADMIN_NACIONAL',
  ADMIN_SEDE        = 'ADMIN_SEDE',
  COORDINADOR       = 'COORDINADOR',
  EDUCADOR          = 'EDUCADOR',
  PSICOLOGO         = 'PSICOLOGO',
  TRABAJADOR_SOCIAL = 'TRABAJADOR_SOCIAL',
  ABOGADO           = 'ABOGADO',
}

/** Roles que pueden ver toda su sede sin filtro de responsable */
export const ROLES_SEDE_COMPLETA = [
  Rol.ADMIN_NACIONAL,
  Rol.ADMIN_SEDE,
  Rol.COORDINADOR,
];

/** Roles de campo que solo ven sus propios casos */
export const ROLES_CAMPO = [
  Rol.EDUCADOR,
  Rol.PSICOLOGO,
  Rol.TRABAJADOR_SOCIAL,
  Rol.ABOGADO,
];

/** Roles que pueden gestionar usuarios */
export const ROLES_GESTION_USUARIOS = [
  Rol.ADMIN_NACIONAL,
  Rol.ADMIN_SEDE,
  Rol.COORDINADOR,
];

/** Roles que pueden autorizar traslados */
export const ROLES_TRASLADOS = [
  Rol.ADMIN_NACIONAL,
  Rol.ADMIN_SEDE,
  Rol.COORDINADOR,
];
