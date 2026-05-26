import oracledb
from src.infrastructure.db.connection import get_pool
from src.domain.entities.derivacion import DerivacionBase

class OracleDerivacionRepository:
    def _row_to_dict(self, row, columns) -> dict:
        return dict(zip(columns, row))

    async def create_derivacion(self, derivacion: DerivacionBase) -> dict:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                sql = """
                    INSERT INTO DERIVACION (CASO_ID, SEDE_ID, TIPO, ENTIDAD_EXTERNA, REMITENTE_ID, DESTINATARIO_ID, MOTIVO, ESTADO)
                    VALUES (:1, :2, :3, :4, :5, :6, :7, 'PENDIENTE')
                    RETURNING ID, ESTADO, FECHA_DERIVACION INTO :8, :9, :10
                """
                id_var = cur.var(int)
                estado_var = cur.var(str)
                fecha_var = cur.var(oracledb.DB_TYPE_TIMESTAMP)

                await cur.execute(sql, [
                    derivacion.caso_id,
                    derivacion.sede_id,
                    derivacion.tipo,
                    derivacion.entidad_externa,
                    derivacion.remitente_id,
                    derivacion.destinatario_id,
                    derivacion.motivo,
                    id_var, estado_var, fecha_var
                ])

                # Derivación interna: reasignar caso al destinatario
                # El NNA desaparece de la grilla del remitente inmediatamente
                if derivacion.tipo == "INTERNA" and derivacion.destinatario_id:
                    await cur.execute(
                        """UPDATE NNA_CASO
                           SET RESPONSABLE_ID = :dest, UPDATED_AT = SYSTIMESTAMP
                           WHERE ID = :caso_id""",
                        {"dest": derivacion.destinatario_id, "caso_id": derivacion.caso_id}
                    )

                await conn.commit()

                return {
                    "id": id_var.getvalue()[0],
                    "caso_id": derivacion.caso_id,
                    "sede_id": derivacion.sede_id,
                    "tipo": derivacion.tipo,
                    "entidad_externa": derivacion.entidad_externa,
                    "remitente_id": derivacion.remitente_id,
                    "destinatario_id": derivacion.destinatario_id,
                    "motivo": derivacion.motivo,
                    "estado": estado_var.getvalue()[0],
                    "fecha_derivacion": fecha_var.getvalue()[0],
                    "fecha_respuesta": None,
                    "observaciones": None
                }

    async def get_derivacion(self, derivacion_id: int) -> dict:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT * FROM DERIVACION WHERE ID = :1", [derivacion_id])
                row = await cur.fetchone()
                if not row:
                    return None
                columns = [col[0].lower() for col in cur.description]
                return self._row_to_dict(row, columns)

    async def responder_derivacion(self, derivacion_id: int, estado: str, observaciones: str) -> dict:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                sql = """
                    UPDATE DERIVACION 
                    SET ESTADO = :1, OBSERVACIONES = :2, FECHA_RESPUESTA = SYSTIMESTAMP
                    WHERE ID = :3
                    RETURNING FECHA_RESPUESTA INTO :4
                """
                fecha_var = cur.var(oracledb.DB_TYPE_TIMESTAMP)
                await cur.execute(sql, [estado, observaciones, derivacion_id, fecha_var])
                await conn.commit()

                return await self.get_derivacion(derivacion_id)

    async def list_pendientes_coordinador(self, sede_id: int) -> list:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT * FROM DERIVACION WHERE SEDE_ID = :1 AND ESTADO = 'PENDIENTE'", [sede_id])
                columns = [col[0].lower() for col in cur.description]
                return [self._row_to_dict(row, columns) for row in await cur.fetchall()]

    async def list_pendientes_usuario(self, usuario_id: int) -> list:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT * FROM DERIVACION WHERE DESTINATARIO_ID = :1 AND ESTADO = 'PENDIENTE'", [usuario_id])
                columns = [col[0].lower() for col in cur.description]
                return [self._row_to_dict(row, columns) for row in await cur.fetchall()]

    async def list_by_caso(self, caso_id: int) -> list:
        pool = get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT * FROM DERIVACION WHERE CASO_ID = :1 ORDER BY FECHA_DERIVACION DESC", [caso_id])
                columns = [col[0].lower() for col in cur.description]
                return [self._row_to_dict(row, columns) for row in await cur.fetchall()]
