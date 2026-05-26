"""
Repositorio Oracle para NNA_FAMILIAR — raw SQL.
"""
from src.domain.entities.familiar import Familiar
from src.infrastructure.db.connection import get_pool


def _row_to_familiar(row) -> Familiar:
    return Familiar(
        id=row[0],
        carpeta_id=row[1],
        nombres=row[2],
        parentesco=row[3],
        dni=row[4],
        telefono=row[5],
        ocupacion=row[6],
        vive_con=row[7] or "NO",
        created_at=row[8],
    )


class OracleFamiliarRepository:

    async def list_by_carpeta(self, carpeta_id: int) -> list[Familiar]:
        """Devuelve todos los familiares de una carpeta ordenados por ID."""
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """SELECT ID, CARPETA_ID, NOMBRES, PARENTESCO,
                              DNI, TELEFONO, OCUPACION, VIVE_CON, CREATED_AT
                       FROM NNA_FAMILIAR
                       WHERE CARPETA_ID = :cid
                       ORDER BY ID ASC""",
                    {"cid": carpeta_id},
                )
                rows = await cur.fetchall()
                return [_row_to_familiar(r) for r in rows]

    async def save_bulk(self, carpeta_id: int, familiares: list[dict]) -> None:
        """
        Reemplaza TODOS los familiares de una carpeta de una vez.
        Borra los existentes e inserta los nuevos — operación atómica.
        """
        print(f"[NNA_FAMILIAR] Intentando grabar {len(familiares)} familiar(es) | carpeta_id={carpeta_id}")
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "DELETE FROM NNA_FAMILIAR WHERE CARPETA_ID = :cid",
                    {"cid": carpeta_id},
                )
                for i, f in enumerate(familiares):
                    bind = {
                        "cid":        carpeta_id,
                        "nombres":    f.get("nombres", ""),
                        "parentesco": f.get("parentesco", ""),
                        "dni":        f.get("dni") or None,
                        "telefono":   f.get("telefono") or None,
                        "ocupacion":  f.get("ocupacion") or None,
                        "vive_con":   f.get("viveCon") or f.get("vive_con") or "NO",
                    }
                    await cur.execute(
                        """INSERT INTO NNA_FAMILIAR
                           (CARPETA_ID, NOMBRES, PARENTESCO, DNI, TELEFONO, OCUPACION, VIVE_CON)
                           VALUES (:cid, :nombres, :parentesco, :dni, :telefono, :ocupacion, :vive_con)""",
                        bind,
                    )
                    print(f"[NNA_FAMILIAR] INSERT [{i+1}] nombres={bind['nombres']} | parentesco={bind['parentesco']} | dni={bind['dni']}")
            await conn.commit()
        print("=" * 55)
        print(f"[NNA_FAMILIAR] GRABADO EN BASE DE DATOS OK")
        print(f"[NNA_FAMILIAR] carpeta_id={carpeta_id} | {len(familiares)} familiar(es) insertado(s)")
        print("=" * 55)

    async def delete_by_carpeta(self, carpeta_id: int) -> None:
        """Elimina todos los familiares de una carpeta."""
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "DELETE FROM NNA_FAMILIAR WHERE CARPETA_ID = :cid",
                    {"cid": carpeta_id},
                )
            await conn.commit()
