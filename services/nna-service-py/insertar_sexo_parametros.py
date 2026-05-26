"""
Script para insertar el grupo OPCIONES_SEXO_2026 en MAESTRO_PARAMETROS.
También corrige valores legacy en sexoApo del modal de familiares.
"""
import io
import sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import asyncio
import os

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.insert(0, os.path.dirname(__file__))
from src.infrastructure.db.connection import init_pool, close_pool, get_pool

PARAMETROS_SEXO = [
    ("OPCIONES_SEXO_2026", "1", "1: Masculino (Hombre)", 1),
    ("OPCIONES_SEXO_2026", "2", "2: Femenino (Mujer)",   2),
]

async def main():
    await init_pool()
    pool = get_pool()

    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            print("-" * 60)
            print("Insertando grupo OPCIONES_SEXO_2026 en MAESTRO_PARAMETROS...")

            for grupo, codigo, descripcion, orden in PARAMETROS_SEXO:
                await cur.execute("""
                    MERGE INTO MAESTRO_PARAMETROS mp
                    USING (SELECT :grupo AS GRUPO, :codigo AS CODIGO FROM DUAL) src
                    ON (mp.GRUPO = src.GRUPO AND mp.CODIGO = src.CODIGO)
                    WHEN MATCHED THEN
                        UPDATE SET mp.DESCRIPCION = :descripcion,
                                   mp.ORDEN       = :orden,
                                   mp.ESTADO      = 1
                    WHEN NOT MATCHED THEN
                        INSERT (GRUPO, CODIGO, DESCRIPCION, ORDEN, ESTADO)
                        VALUES (:grupo2, :codigo2, :descripcion2, :orden2, 1)
                """, {
                    "grupo": grupo, "codigo": codigo,
                    "descripcion": descripcion, "orden": orden,
                    "grupo2": grupo, "codigo2": codigo,
                    "descripcion2": descripcion, "orden2": orden,
                })
                print(f"  OK: [{codigo}] {descripcion}")

            await conn.commit()

            # Verificar total
            await cur.execute(
                "SELECT COUNT(*) FROM MAESTRO_PARAMETROS WHERE GRUPO = 'OPCIONES_SEXO_2026' AND ESTADO = 1"
            )
            row = await cur.fetchone()
            print("-" * 60)
            print(f"Total OPCIONES_SEXO_2026 activos: {row[0]}")
            print("Hecho!")

    await close_pool()

if __name__ == '__main__':
    asyncio.run(main())
