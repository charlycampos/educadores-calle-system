from typing import Optional
import bcrypt
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr

from src.domain.use_cases.crear_usuario_use_case import CrearUsuarioUseCase, CrearUsuarioInput, ConflictError
from src.infrastructure.db.repositories.oracle_usuario_repository import OracleUsuarioRepository
from src.infrastructure.http.middleware.jwt_middleware import get_current_user, require_roles

router = APIRouter(prefix="/api/usuarios", tags=["usuarios"])


# ── Modelos de request ────────────────────────────────────────────────────────

class CrearUsuarioRequest(BaseModel):
    """Acepta snake_case o camelCase del frontend."""
    nombre_completo: Optional[str] = None
    nombreCompleto:  Optional[str] = None
    email: EmailStr
    password: str
    rol_id:  Optional[int] = None
    rolId:   Optional[int] = None
    sede_id: Optional[int] = None
    sedeId:  Optional[int] = None
    zona_asignada: Optional[str] = None
    zonaAsignada:  Optional[str] = None

    def get_nombre(self) -> str:
        return self.nombre_completo or self.nombreCompleto or ""

    def get_rol_id(self) -> int:
        return self.rol_id or self.rolId or 3

    def get_sede_id(self) -> int:
        return self.sede_id or self.sedeId or 1

    def get_zona(self) -> Optional[str]:
        return self.zona_asignada or self.zonaAsignada


class ActualizarUsuarioRequest(BaseModel):
    """Todos los campos opcionales — solo se actualizan los que lleguen."""
    nombre_completo: Optional[str] = None
    nombreCompleto:  Optional[str] = None
    email:           Optional[EmailStr] = None
    password:        Optional[str] = None
    rol_id:          Optional[int] = None
    rolId:           Optional[int] = None
    sede_id:         Optional[int] = None
    sedeId:          Optional[int] = None
    zona_asignada:   Optional[str] = None
    zonaAsignada:    Optional[str] = None
    activo:          Optional[bool] = None

    def get_nombre(self) -> Optional[str]:
        return self.nombre_completo or self.nombreCompleto

    def get_rol_id(self) -> Optional[int]:
        return self.rol_id or self.rolId

    def get_sede_id(self) -> Optional[int]:
        return self.sede_id or self.sedeId

    def get_zona(self) -> Optional[str]:
        return self.zona_asignada or self.zonaAsignada


# ── Helper de serialización ───────────────────────────────────────────────────

def _formato(u) -> dict:
    return {
        "id":              u.id,
        "nombre_completo": u.nombre_completo,
        "nombreCompleto":  u.nombre_completo,
        "email":           u.email,
        "rol":             u.rol,
        "rolId":           u.rol_id,
        "sedeId":          u.sede_id,
        "sedeCodigo":      u.sede_codigo,
        "zonaAsignada":    u.zona_asignada,
        "activo":          bool(u.activo),
    }


# ── GET / — lista usuarios ────────────────────────────────────────────────────

@router.get("/")
async def list_usuarios(current_user: dict = Depends(get_current_user)):
    """ADMIN_NACIONAL ve todos; el resto solo su sede."""
    repo    = OracleUsuarioRepository()
    rol     = current_user.get("rol")
    sede_id = current_user.get("sedeId")

    if rol == "ADMIN_NACIONAL":
        from src.infrastructure.db.connection import get_pool
        from src.infrastructure.db.repositories.oracle_usuario_repository import _row_to_usuario
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("""
                    SELECT u.ID, u.NOMBRE_COMPLETO, u.EMAIL, u.PASSWORD_HASH,
                           u.ROL_ID, r.NOMBRE, u.SEDE_ID, s.CODIGO,
                           s.REGION_ID, u.ZONA_ASIGNADA, u.ACTIVO
                    FROM SEC_USUARIO u
                    JOIN      SEC_ROL  r ON r.ID = u.ROL_ID
                    LEFT JOIN SEC_SEDE s ON s.ID = u.SEDE_ID
                    ORDER BY u.ID
                """)
                rows = await cur.fetchall()
                usuarios = [_row_to_usuario(r) for r in rows]
    else:
        usuarios = await repo.list_by_sede(sede_id)

    return [_formato(u) for u in usuarios]


# ── POST / — crear usuario ────────────────────────────────────────────────────

@router.post("/", status_code=status.HTTP_201_CREATED)
async def crear_usuario(
    body: CrearUsuarioRequest,
    current_user: dict = Depends(require_roles("ADMIN_NACIONAL", "ADMIN_SEDE", "COORDINADOR")),
):
    nombre = body.get_nombre()
    if not nombre:
        raise HTTPException(status_code=400, detail="El nombre completo es requerido")

    repo = OracleUsuarioRepository()
    use_case = CrearUsuarioUseCase(usuario_repo=repo)
    try:
        usuario = await use_case.execute(
            CrearUsuarioInput(
                nombre_completo=nombre,
                email=body.email,
                password=body.password,
                rol_id=body.get_rol_id(),
                sede_id=body.get_sede_id(),
                zona_asignada=body.get_zona(),
            )
        )
        return _formato(usuario)
    except ConflictError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


# ── GET /sede/{sede_id} ───────────────────────────────────────────────────────

@router.get("/sede/{sede_id}")
async def list_usuarios_por_sede(
    sede_id: int,
    current_user: dict = Depends(get_current_user),
):
    repo = OracleUsuarioRepository()
    usuarios = await repo.list_by_sede(sede_id)
    return [_formato(u) for u in usuarios]


# ── GET /{user_id} ────────────────────────────────────────────────────────────

@router.get("/{user_id}")
async def get_usuario(user_id: int, current_user: dict = Depends(get_current_user)):
    repo = OracleUsuarioRepository()
    usuario = await repo.find_by_id(user_id)
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    return _formato(usuario)


# ── PUT /{user_id} — actualizar usuario ──────────────────────────────────────

@router.put("/{user_id}")
async def update_usuario(
    user_id: int,
    body: ActualizarUsuarioRequest,
    current_user: dict = Depends(require_roles("ADMIN_NACIONAL", "ADMIN_SEDE", "COORDINADOR")),
):
    repo = OracleUsuarioRepository()

    usuario_existente = await repo.find_by_id(user_id)
    if not usuario_existente:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Hash de nueva contraseña si viene
    nuevo_hash = None
    if body.password and body.password.strip():
        nuevo_hash = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()

    usuario_actualizado = await repo.update(
        user_id=user_id,
        nombre_completo=body.get_nombre(),
        email=body.email,
        rol_id=body.get_rol_id(),
        sede_id=body.get_sede_id(),
        zona_asignada=body.get_zona(),
        activo=body.activo,
        password_hash=nuevo_hash,
    )

    return _formato(usuario_actualizado)


# ── DELETE /{user_id} — eliminar usuario ─────────────────────────────────────

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_usuario(
    user_id: int,
    current_user: dict = Depends(require_roles("ADMIN_NACIONAL", "ADMIN_SEDE")),
):
    repo = OracleUsuarioRepository()

    usuario_existente = await repo.find_by_id(user_id)
    if not usuario_existente:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # No permitir auto-eliminación
    if current_user.get("id") == user_id:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propio usuario")

    eliminado = await repo.delete(user_id)
    if not eliminado:
        raise HTTPException(status_code=500, detail="No se pudo eliminar el usuario")
