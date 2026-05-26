"""
Script para crear la tabla MAESTRO_PARAMETROS en Oracle y poblarla
con todos los valores del Diccionario de Datos SEC 2026.

Uso:
    venv\\Scripts\\python.exe crear_maestro_parametros.py
"""
import io
import sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
import asyncio
import sys
import os

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.insert(0, os.path.dirname(__file__))
from src.infrastructure.db.connection import init_pool, close_pool, get_pool

DDL_CREATE_TABLE = """
DECLARE
    v_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM user_tables
    WHERE table_name = 'MAESTRO_PARAMETROS';

    IF v_count = 0 THEN
        EXECUTE IMMEDIATE 'CREATE TABLE MAESTRO_PARAMETROS (
            ID          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            GRUPO       VARCHAR2(100)  NOT NULL,
            CODIGO      VARCHAR2(20)   NOT NULL,
            DESCRIPCION VARCHAR2(300)  NOT NULL,
            ORDEN       NUMBER(4)      DEFAULT 1 NOT NULL,
            ESTADO      NUMBER(1)      DEFAULT 1 NOT NULL,
            CREATED_AT  TIMESTAMP      DEFAULT SYSTIMESTAMP NOT NULL,
            CONSTRAINT uk_mp_grupo_codigo UNIQUE (GRUPO, CODIGO)
        )';
    END IF;
END;
"""

# Todos los parámetros del Diccionario de Datos SEC 2026
# Formato: (GRUPO, CODIGO, DESCRIPCION, ORDEN)
PARAMETROS = [
    # ─── 1. Situación de Matrícula ────────────────────────────────────────────
    ("OPCIONES_MATRICULA_2026", "SI",       "1. Sí (cuenta con ficha de matrícula)",                     1),
    ("OPCIONES_MATRICULA_2026", "NO",       "2. No (no se encuentra matriculado)",                        2),
    ("OPCIONES_MATRICULA_2026", "PROCESO",  "3. En proceso de matrícula (trámite en gestión)",            3),
    ("OPCIONES_MATRICULA_2026", "NO_APLICA","99. No aplica (menores de 3 años o egresados de secundaria)",99),

    # ─── 2. Niveles Educativos ────────────────────────────────────────────────
    ("NIVELES_EDUCATIVOS_2026", "1",  "1: Sin nivel",                              1),
    ("NIVELES_EDUCATIVOS_2026", "2",  "2: Inicial",                                2),
    ("NIVELES_EDUCATIVOS_2026", "3",  "3: Primaria Incompleta",                    3),
    ("NIVELES_EDUCATIVOS_2026", "4",  "4: Primaria Completa",                      4),
    ("NIVELES_EDUCATIVOS_2026", "5",  "5: Secundaria Incompleta",                  5),
    ("NIVELES_EDUCATIVOS_2026", "6",  "6: Secundaria Completa",                    6),
    ("NIVELES_EDUCATIVOS_2026", "7",  "7: Superior No Universitaria Incompleta",   7),
    ("NIVELES_EDUCATIVOS_2026", "8",  "8: Superior No Universitaria Completa",     8),
    ("NIVELES_EDUCATIVOS_2026", "9",  "9: Superior Universitario Incompleto",      9),
    ("NIVELES_EDUCATIVOS_2026", "10", "10: Superior Universitario Completo",       10),
    ("NIVELES_EDUCATIVOS_2026", "11", "11: Básica Especial",                       11),

    # ─── 3. Modalidad de Estudio ──────────────────────────────────────────────
    ("MODALIDADES_ESTUDIO_2026", "1", "1: Básica / regular (EBR)",     1),
    ("MODALIDADES_ESTUDIO_2026", "2", "2: Alternativa (EBA)",          2),
    ("MODALIDADES_ESTUDIO_2026", "3", "3: Especial (EBE)",             3),
    ("MODALIDADES_ESTUDIO_2026", "4", "4: Superior Técnica",           4),
    ("MODALIDADES_ESTUDIO_2026", "5", "5: Superior Universitaria",     5),
    ("MODALIDADES_ESTUDIO_2026", "6", "6: CETPRO",                     6),

    # ─── 4. Grado de Estudio ──────────────────────────────────────────────────
    ("GRADOS_ESTUDIO_2026", "1",  "1: Inicial",                     1),
    ("GRADOS_ESTUDIO_2026", "2",  "2: 1ro primaria",                2),
    ("GRADOS_ESTUDIO_2026", "3",  "3: 2do primaria",                3),
    ("GRADOS_ESTUDIO_2026", "4",  "4: 3ro primaria",                4),
    ("GRADOS_ESTUDIO_2026", "5",  "5: 4to primaria",                5),
    ("GRADOS_ESTUDIO_2026", "6",  "6: 5to primaria",                6),
    ("GRADOS_ESTUDIO_2026", "7",  "7: 6to primaria",                7),
    ("GRADOS_ESTUDIO_2026", "8",  "8: 1ro secundaria",              8),
    ("GRADOS_ESTUDIO_2026", "9",  "9: 2do secundaria",              9),
    ("GRADOS_ESTUDIO_2026", "10", "10: 3ro secundaria",             10),
    ("GRADOS_ESTUDIO_2026", "11", "11: 4to secundaria",             11),
    ("GRADOS_ESTUDIO_2026", "12", "12: 5to secundaria",             12),
    ("GRADOS_ESTUDIO_2026", "13", "13: Ciclo I (EBA)",              13),
    ("GRADOS_ESTUDIO_2026", "14", "14: Ciclo II (EBA)",             14),
    ("GRADOS_ESTUDIO_2026", "15", "15: Ciclo III (EBA)",            15),
    ("GRADOS_ESTUDIO_2026", "16", "16: Ciclo IV (EBA)",             16),
    ("GRADOS_ESTUDIO_2026", "17", "17: Ciclo V (EBA)",              17),
    ("GRADOS_ESTUDIO_2026", "18", "18: Ciclo VI (EBA)",             18),
    ("GRADOS_ESTUDIO_2026", "19", "19: Ciclo VII (EBA)",            19),
    ("GRADOS_ESTUDIO_2026", "20", "20: Ciclo VIII (EBA)",           20),
    ("GRADOS_ESTUDIO_2026", "21", "21: Ciclo IX (EBA)",             21),
    ("GRADOS_ESTUDIO_2026", "22", "22: Ciclo X (EBA)",              22),
    ("GRADOS_ESTUDIO_2026", "99", "99: No aplica / No sabe",        99),

    # ─── 5. Convivencia / ¿Con quién vives? ──────────────────────────────────
    ("OPCIONES_CONVIVENCIA_2026", "1", "1: Solo Padre",                            1),
    ("OPCIONES_CONVIVENCIA_2026", "2", "2: Solo Madre",                            2),
    ("OPCIONES_CONVIVENCIA_2026", "3", "3: Padre y madre",                         3),
    ("OPCIONES_CONVIVENCIA_2026", "4", "4: Adulto responsable (familia extensa)",  4),
    ("OPCIONES_CONVIVENCIA_2026", "5", "5: Solo",                                  5),
    ("OPCIONES_CONVIVENCIA_2026", "6", "6: Otro",                                  6),

    # ─── 6. Vínculo del Tutor con el NNA ─────────────────────────────────────
    ("OPCIONES_VINCULO_TUTOR_2026", "1", "1: Padre o madre",                           1),
    ("OPCIONES_VINCULO_TUTOR_2026", "2", "2: Tio/a",                                   2),
    ("OPCIONES_VINCULO_TUTOR_2026", "3", "3: Abuelo/a",                                3),
    ("OPCIONES_VINCULO_TUTOR_2026", "4", "4: Hermano/a",                               4),
    ("OPCIONES_VINCULO_TUTOR_2026", "5", "5: Otro familiar (ej. cuñado/a)",            5),
    ("OPCIONES_VINCULO_TUTOR_2026", "6", "6: Otro no familiar (no pariente)",          6),

    # ─── 7. Tipo de Documento (NNA y Tutor) ───────────────────────────────────
    ("OPCIONES_TIP_DOC_APO_2026", "1", "1: DNI",                                    1),
    ("OPCIONES_TIP_DOC_APO_2026", "2", "2: Carné de extranjería",                   2),
    ("OPCIONES_TIP_DOC_APO_2026", "3", "3: Pasaporte",                              3),
    ("OPCIONES_TIP_DOC_APO_2026", "4", "4: Documento de Identidad Extranjero",      4),
    ("OPCIONES_TIP_DOC_APO_2026", "5", "5: CUI o Acta de Nacimiento",               5),
    ("OPCIONES_TIP_DOC_APO_2026", "6", "6: Certificado de Nacido Vivo - CNV",       6),
    ("OPCIONES_TIP_DOC_APO_2026", "7", "7: No tiene",                               7),

    # ─── 8. Lengua Materna (NNA y Tutor) ─────────────────────────────────────
    ("OPCIONES_LENGUA_APO_2026", "10", "10: Castellano",                              1),
    ("OPCIONES_LENGUA_APO_2026", "1",  "1: Quechua",                                  2),
    ("OPCIONES_LENGUA_APO_2026", "2",  "2: Aimara",                                   3),
    ("OPCIONES_LENGUA_APO_2026", "3",  "3: Ashaninka",                                4),
    ("OPCIONES_LENGUA_APO_2026", "4",  "4: Awajun/Aguaruna",                          5),
    ("OPCIONES_LENGUA_APO_2026", "5",  "5: Shipibo-Conibo",                           6),
    ("OPCIONES_LENGUA_APO_2026", "6",  "6: Shawi/ Chayahuita",                        7),
    ("OPCIONES_LENGUA_APO_2026", "7",  "7: Matsigenka/ Machiguenga",                  8),
    ("OPCIONES_LENGUA_APO_2026", "8",  "8: Achuar",                                   9),
    ("OPCIONES_LENGUA_APO_2026", "9",  "9: Otra lengua indigena u originaria",        10),
    ("OPCIONES_LENGUA_APO_2026", "11", "11: Portugues",                               11),
    ("OPCIONES_LENGUA_APO_2026", "12", "12: Otra lengua extranjera",                  12),
    ("OPCIONES_LENGUA_APO_2026", "13", "13: Lengua de señas peruana",                 13),
    ("OPCIONES_LENGUA_APO_2026", "14", "14: No escucha ni habla",                     14),
    ("OPCIONES_LENGUA_APO_2026", "16", "16: No responde / No sabe",                   15),
    ("OPCIONES_LENGUA_APO_2026", "99", "99: No aplica",                               99),

    # ─── 9. Autoidentificación Étnica (NNA y Tutor) ────────────────────────────
    ("OPCIONES_ETNIA_APO_2026", "7", "7: Mestizo",                                                 1),
    ("OPCIONES_ETNIA_APO_2026", "1", "1: Quechua",                                                 2),
    ("OPCIONES_ETNIA_APO_2026", "2", "2: Aimara",                                                  3),
    ("OPCIONES_ETNIA_APO_2026", "3", "3: Indigena u originario de la Amazonia",                    4),
    ("OPCIONES_ETNIA_APO_2026", "4", "4: Perteneciente o parte de otro pueblo indigena",           5),
    ("OPCIONES_ETNIA_APO_2026", "5", "5: Negro, moreno, zambo, mulato o afrodescendiente",         6),
    ("OPCIONES_ETNIA_APO_2026", "6", "6: Blanco",                                                  7),
    ("OPCIONES_ETNIA_APO_2026", "8", "8: Otro",                                                    8),

    # ─── 10. Discapacidad (NNA y Tutor) ──────────────────────────────────────
    ("OPCIONES_DISCAPACIDAD_APO_2026", "6", "6: Ninguna",                          1),
    ("OPCIONES_DISCAPACIDAD_APO_2026", "1", "1: Motriz o fisica",                  2),
    ("OPCIONES_DISCAPACIDAD_APO_2026", "2", "2: Sensorial",                        3),
    ("OPCIONES_DISCAPACIDAD_APO_2026", "3", "3: Cognitivo-intelectual",            4),
    ("OPCIONES_DISCAPACIDAD_APO_2026", "4", "4: Psicosocial o psiquica",           5),
    ("OPCIONES_DISCAPACIDAD_APO_2026", "5", "5: Mas de una discapacidad",          6),

    # ─── 11. Certificado CONADIS (NNA y Tutor) ───────────────────────────────
    ("OPCIONES_CERT_DISCAP_APO_2026", "99", "99: No aplica",                              1),
    ("OPCIONES_CERT_DISCAP_APO_2026", "1",  "1: Si, tiene Certificado de Discapacidad",  2),
    ("OPCIONES_CERT_DISCAP_APO_2026", "2",  "2: Si, tiene, pero no lo porta",            3),
    ("OPCIONES_CERT_DISCAP_APO_2026", "3",  "3: No, no cuenta con Certificado",          4),
    ("OPCIONES_CERT_DISCAP_APO_2026", "4",  "4: En tramite",                             5),
]


async def main():
    await init_pool()
    pool = get_pool()

    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            # 1. Crear la tabla si no existe
            print("-" * 60)
            print("Verificando y creando tabla MAESTRO_PARAMETROS...")
            await cur.execute(DDL_CREATE_TABLE)
            await conn.commit()
            print("✓ DDL ejecutado correctamente")

            # 2. Contar registros existentes
            await cur.execute("SELECT COUNT(*) FROM MAESTRO_PARAMETROS")
            row = await cur.fetchone()
            existing = row[0] if row else 0
            print(f"✓ Registros existentes: {existing}")

            # 3. Insertar usando MERGE para evitar duplicados
            print("-" * 60)
            print(f"Insertando {len(PARAMETROS)} parámetros (MERGE - sin duplicados)...")

            inserted = 0
            updated = 0
            for grupo, codigo, descripcion, orden in PARAMETROS:
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
                    "grupo": grupo,
                    "codigo": codigo,
                    "descripcion": descripcion,
                    "orden": orden,
                    "grupo2": grupo,
                    "codigo2": codigo,
                    "descripcion2": descripcion,
                    "orden2": orden,
                })
                inserted += 1

            await conn.commit()
            print(f"✓ {inserted} parámetros procesados sin errores")

            # 4. Verificación final
            print("-" * 60)
            print("Verificación por grupo:")
            await cur.execute("""
                SELECT GRUPO, COUNT(*) AS TOTAL
                FROM MAESTRO_PARAMETROS
                WHERE ESTADO = 1
                GROUP BY GRUPO
                ORDER BY GRUPO
            """)
            rows = await cur.fetchall()
            for row in rows:
                print(f"  [{row[1]:2d} opciones] {row[0]}")

            await cur.execute("SELECT COUNT(*) FROM MAESTRO_PARAMETROS WHERE ESTADO = 1")
            row = await cur.fetchone()
            total = row[0] if row else 0
            print("-" * 60)
            print(f"✓ Total activos en MAESTRO_PARAMETROS: {total}")
            print("-" * 60)
            print("¡Migración completada exitosamente!")

    await close_pool()


if __name__ == '__main__':
    asyncio.run(main())
