"""
Repositorio Oracle para Usuario — raw SQL, sin ORM.
Oracle devuelve columnas en MAYÚSCULAS cuando no hay alias; usamos alias
explícitos en minúsculas para mapear directamente.
"""
from typing import Optional
import oracledb

from src.domain.entities.usuario import Usuario
from src.domain.repositories.i_usuario_repository import IUsuarioRepository
from src.infrastructure.db.connection import get_pool

# ── Query base con JOIN a SEC_ROL y SEC_SEDE ─────────────────────────────────
_SELECT = """
    SELECT
        u.ID              AS id,
        u.NOMBRE_COMPLETO AS nombre_completo,
        u.EMAIL           AS email,
        u.PASSWORD_HASH   AS password_hash,
        u.ROL_ID          AS rol_id,
        r.NOMBRE          AS rol,
        u.SEDE_ID         AS sede_id,
        s.CODIGO          AS sede_codigo,
        s.REGION_ID       AS region_id,
        u.ZONA_ASIGNADA   AS zona_asignada,
        u.ACTIVO          AS activo
    FROM SEC_USUARIO u
    JOIN      SEC_ROL  r ON r.ID = u.ROL_ID
    LEFT JOIN SEC_SEDE s ON s.ID = u.SEDE_ID
"""


def _row_to_usuario(row) -> Usuario:
    return Usuario(
        id=row[0],
        nombre_completo=row[1],
        email=row[2],
        password_hash=row[3],
        rol_id=row[4],
        rol=row[5],
        sede_id=row[6],
        sede_codigo=row[7],
        region_id=row[8],
        zona_asignada=row[9],
        activo=row[10],
    )


class OracleUsuarioRepository(IUsuarioRepository):

    async def find_by_email(self, email: str) -> Optional[Usuario]:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    f"{_SELECT} WHERE u.EMAIL = :email",
                    {"email": email},
                )
                row = await cur.fetchone()
                return _row_to_usuario(row) if row else None

    async def find_by_id(self, user_id: int) -> Optional[Usuario]:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    f"{_SELECT} WHERE u.ID = :user_id",
                    {"user_id": user_id},
                )
                row = await cur.fetchone()
                return _row_to_usuario(row) if row else None

    async def create(
        self,
        nombre_completo: str,
        email: str,
        password_hash: str,
        rol_id: int,
        sede_id: int,
        zona_asignada: Optional[str] = None,
    ) -> Usuario:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                # Oracle no tiene RETURNING id en INSERT fácil; usamos sequence implícita
                out_id = cur.var(int)
                await cur.execute(
                    """
                    INSERT INTO SEC_USUARIO
                        (NOMBRE_COMPLETO, EMAIL, PASSWORD_HASH, ROL_ID, SEDE_ID, ZONA_ASIGNADA)
                    VALUES
                        (:nombre, :email, :hash, :rol_id, :sede_id, :zona)
                    RETURNING ID INTO :out_id
                    """,
                    {
                        "nombre":  nombre_completo,
                        "email":   email,
                        "hash":    password_hash,
                        "rol_id":  rol_id,
                        "sede_id": sede_id,
                        "zona":    zona_asignada,
                        "out_id":  out_id,
                    },
                )
                await conn.commit()
                new_id = out_id.getvalue()[0]

        # Recargar con JOIN para obtener nombre de rol y sede
        return await self.find_by_id(new_id)

    async def list_by_sede(self, sede_id: int) -> list[Usuario]:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    f"{_SELECT} WHERE u.SEDE_ID = :sede_id ORDER BY u.NOMBRE_COMPLETO",
                    {"sede_id": sede_id},
                )
                rows = await cur.fetchall()
                return [_row_to_usuario(r) for r in rows]

    async def update_password(self, user_id: int, new_hash: str) -> None:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    UPDATE SEC_USUARIO
                    SET PASSWORD_HASH = :hash,
                        UPDATED_AT    = SYSTIMESTAMP
                    WHERE ID = :user_id
                    """,
                    {"hash": new_hash, "user_id": user_id},
                )
                await conn.commit()

    async def update(
        self,
        user_id: int,
        nombre_completo: Optional[str] = None,
        email: Optional[str] = None,
        rol_id: Optional[int] = None,
        sede_id: Optional[int] = None,
        zona_asignada: Optional[str] = None,
        activo: Optional[bool] = None,
        password_hash: Optional[str] = None,
    ) -> Optional[Usuario]:
        """Actualiza solo los campos que se pasen (no None)."""
        updates = []
        params: dict = {"user_id": user_id}

        if nombre_completo is not None:
            updates.append("NOMBRE_COMPLETO = :nombre")
            params["nombre"] = nombre_completo
        if email is not None:
            updates.append("EMAIL = :email")
            params["email"] = email
        if rol_id is not None:
            updates.append("ROL_ID = :rol_id")
            params["rol_id"] = rol_id
        if sede_id is not None:
            updates.append("SEDE_ID = :sede_id")
            params["sede_id"] = sede_id
        if zona_asignada is not None:
            updates.append("ZONA_ASIGNADA = :zona")
            params["zona"] = zona_asignada
        if activo is not None:
            updates.append("ACTIVO = :activo")
            params["activo"] = 1 if activo else 0
        if password_hash is not None:
            updates.append("PASSWORD_HASH = :hash")
            params["hash"] = password_hash

        if not updates:
            return await self.find_by_id(user_id)

        updates.append("UPDATED_AT = SYSTIMESTAMP")
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                sql = f"UPDATE SEC_USUARIO SET {', '.join(updates)} WHERE ID = :user_id"
                await cur.execute(sql, params)
                await conn.commit()

        return await self.find_by_id(user_id)

    async def delete(self, user_id: int) -> bool:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "DELETE FROM SEC_USUARIO WHERE ID = :user_id",
                    {"user_id": user_id},
                )
                deleted = cur.rowcount
                await conn.commit()
        return deleted > 0
