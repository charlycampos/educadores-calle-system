"""
Repositorio Oracle para NNA_HERMANO — vínculo entre NNA que son hermanos.

Los expedientes son individuales: cada NNA tiene su carpeta y su file. Esto solo
agrupa para el informe situacional, que sí es común a los hermanos.

El sistema nunca vincula solo: detecta candidatos y el educador confirma.
"""
from src.infrastructure.db.connection import get_pool

# Código del catálogo OPCIONES_VINCULO_TUTOR_2026 (ver mapeo_combos_sec_2026.md)
PARENTESCO_HERMANO = "4"
PARENTESCO_PADRE_MADRE = "1"


def _ordenar(a: int, b: int) -> tuple[int, int]:
    """El par se guarda ordenado para que (A,B) y (B,A) sean la misma fila."""
    return (a, b) if a < b else (b, a)


class OracleHermanoRepository:

    async def list_by_nna(self, nna_id: int) -> list[dict]:
        """Hermanos confirmados de un NNA, mirando ambas columnas del par."""
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    SELECT h.ID, h.ORIGEN, h.CREATED_AT,
                           n.ID, n.NOMBRES, n.APELLIDO_PATERNO, n.APELLIDO_MATERNO,
                           n.NUMERO_DOC, n.CODIGO_FICHA03
                      FROM NNA_HERMANO h
                      JOIN NNA n
                        ON n.ID = CASE WHEN h.NNA_ID_MENOR = :nna THEN h.NNA_ID_MAYOR
                                       ELSE h.NNA_ID_MENOR END
                     WHERE (h.NNA_ID_MENOR = :nna OR h.NNA_ID_MAYOR = :nna)
                       AND h.ESTADO = 'CONFIRMADO'
                     ORDER BY n.APELLIDO_PATERNO, n.NOMBRES
                    """,
                    {"nna": nna_id},
                )
                return [
                    {
                        "vinculoId": r[0],
                        "origen": r[1],
                        "fecha": r[2].isoformat() if r[2] else None,
                        "nnaId": r[3],
                        "nombres": r[4],
                        "apellidoPaterno": r[5],
                        "apellidoMaterno": r[6],
                        "numeroDoc": r[7],
                        "codigoFicha03": r[8],
                    }
                    for r in await cur.fetchall()
                ]

    async def pares_ya_resueltos(self, nna_id: int) -> set:
        """
        IDs de NNA sobre los que ya se decidió — confirmados o descartados.

        Sin esto el sistema volvería a preguntar por un par que el educador ya
        dijo que no son hermanos, cada vez que edita la ficha.
        """
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    SELECT CASE WHEN NNA_ID_MENOR = :nna THEN NNA_ID_MAYOR
                                ELSE NNA_ID_MENOR END
                      FROM NNA_HERMANO
                     WHERE NNA_ID_MENOR = :nna OR NNA_ID_MAYOR = :nna
                    """,
                    {"nna": nna_id},
                )
                return {row[0] for row in await cur.fetchall()}

    async def buscar_por_nombre(self, nna_id: int, texto: str) -> list[dict]:
        """
        NNA cuyo nombre se parece al texto dado. Se usa cuando el educador
        registra un familiar con parentesco 'Hermano/a': si ese hermano ya está
        en el servicio, aparece acá.
        """
        if not texto or len(texto.strip()) < 3:
            return []

        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    SELECT ID, NOMBRES, APELLIDO_PATERNO, APELLIDO_MATERNO,
                           NUMERO_DOC, CODIGO_FICHA03
                      FROM NNA
                     WHERE ID <> :nna
                       AND UPPER(NOMBRES || ' ' || APELLIDO_PATERNO || ' ' || NVL(APELLIDO_MATERNO, ''))
                           LIKE '%' || UPPER(:texto) || '%'
                     ORDER BY APELLIDO_PATERNO, NOMBRES
                     FETCH FIRST 10 ROWS ONLY
                    """,
                    {"nna": nna_id, "texto": texto.strip()},
                )
                return [
                    {
                        "nnaId": r[0], "nombres": r[1],
                        "apellidoPaterno": r[2], "apellidoMaterno": r[3],
                        "numeroDoc": r[4], "codigoFicha03": r[5],
                        "motivo": "Coincide con el hermano/a registrado en la ficha",
                        "origen": "PARENTESCO",
                    }
                    for r in await cur.fetchall()
                ]

    async def buscar_por_dni_padre(self, nna_id: int, dni: str) -> list[dict]:
        """
        NNA que comparten un padre o madre con el mismo DNI.

        Detecta hermanos de distinto apellido — "tres hermanas de diferentes
        padres y el mismo apellido de la mamá" — que la búsqueda por nombre
        nunca encontraría.
        """
        if not dni or len(dni.strip()) < 6:
            return []

        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    SELECT DISTINCT n.ID, n.NOMBRES, n.APELLIDO_PATERNO, n.APELLIDO_MATERNO,
                           n.NUMERO_DOC, n.CODIGO_FICHA03, f.NOMBRES
                      FROM NNA_FAMILIAR f
                      JOIN NNA n ON n.CARPETA_ID = f.CARPETA_ID
                     WHERE f.DNI = :dni
                       AND f.PARENTESCO = :parentesco
                       AND n.ID <> :nna
                     ORDER BY n.APELLIDO_PATERNO, n.NOMBRES
                    """,
                    {"dni": dni.strip(), "parentesco": PARENTESCO_PADRE_MADRE, "nna": nna_id},
                )
                return [
                    {
                        "nnaId": r[0], "nombres": r[1],
                        "apellidoPaterno": r[2], "apellidoMaterno": r[3],
                        "numeroDoc": r[4], "codigoFicha03": r[5],
                        "motivo": f"Comparte a {r[6]} (DNI {dni}) como padre/madre",
                        "origen": "DNI_PADRE",
                    }
                    for r in await cur.fetchall()
                ]

    async def vincular(self, nna_id: int, hermano_id: int, origen: str,
                       usuario_id: int, estado: str = "CONFIRMADO") -> dict:
        """Crea o actualiza el vínculo. Idempotente sobre el par ordenado."""
        menor, mayor = _ordenar(nna_id, hermano_id)
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    MERGE INTO NNA_HERMANO h
                    USING (SELECT :menor AS m, :mayor AS M2 FROM dual) s
                       ON (h.NNA_ID_MENOR = s.m AND h.NNA_ID_MAYOR = s.M2)
                     WHEN MATCHED THEN
                          UPDATE SET ESTADO = :estado, ORIGEN = :origen,
                                     CONFIRMADO_POR = :usr
                     WHEN NOT MATCHED THEN
                          INSERT (NNA_ID_MENOR, NNA_ID_MAYOR, ESTADO, ORIGEN, CONFIRMADO_POR)
                          VALUES (s.m, s.M2, :estado, :origen, :usr)
                    """,
                    {"menor": menor, "mayor": mayor, "estado": estado,
                     "origen": origen, "usr": usuario_id},
                )
                await conn.commit()
        return {"nnaId": nna_id, "hermanoId": hermano_id, "estado": estado}

    async def desvincular(self, nna_id: int, hermano_id: int) -> bool:
        """Borra el vínculo por completo, para corregir una confirmación errónea."""
        menor, mayor = _ordenar(nna_id, hermano_id)
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "DELETE FROM NNA_HERMANO WHERE NNA_ID_MENOR = :1 AND NNA_ID_MAYOR = :2",
                    [menor, mayor],
                )
                filas = cur.rowcount
                await conn.commit()
                return filas > 0
