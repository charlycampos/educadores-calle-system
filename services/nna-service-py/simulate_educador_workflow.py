import asyncio
import oracledb
import os
import sys
import datetime
from dotenv import load_dotenv

# Set Windows Selector Event Loop to bypass Oracle thin driver proactor bug on Windows
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

load_dotenv()

# Configurar PYTHONPATH para importar el dominio y la infraestructura correctamente
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'services/nna-service-py')))

from src.infrastructure.db.connection import init_pool, close_pool
from src.domain.use_cases.registrar_nna_use_case import RegistrarNnaUseCase, NnaInput, CasoInput
from src.infrastructure.db.repositories.oracle_nna_repository import OracleNnaRepository, OracleCarpetaRepository
from src.infrastructure.db.repositories.oracle_caso_repository import OracleCasoRepository

async def run_simulation():
    print("====================================================")
    print("   SIMULACIÓN DE FLUJO COMPLETO - USUARIO EDUCADOR   ")
    print("====================================================")
    
    # Inicializar pool
    await init_pool()
    
    nna_repo = OracleNnaRepository()
    caso_repo = OracleCasoRepository()
    carpeta_repo = OracleCarpetaRepository()
    use_case = RegistrarNnaUseCase(nna_repo, caso_repo, carpeta_repo)
    
    # Datos del educador responsable
    educador_id = 6 # Juan Educador Garcia
    sede_id = 1
    
    # ── PASO 1: Crear Borrador Inicial (Datos mínimos) ────────────────
    print("\n[Paso 1] Educador guarda un Borrador por primera vez con datos mínimos...")
    nna_in = NnaInput(
        nombres="SIMULACION DRAFT",
        apellido_paterno="EDUDADOR",
        apellido_materno="TEST",
        tipo_doc="SIN_DOC",
        numero_doc=None,
        fecha_nacimiento=datetime.datetime(2014, 5, 10),
        sexo="M"
    )
    caso_in = CasoInput(
        sede_id=sede_id,
        responsable_id=educador_id,
        perfil="TRABAJO_INFANTIL",
        zona_intervencion="Sector A Huaral",
        distrito_intervencion="Huaral",
        situacion_calle="TRABAJO",
        actividad_realizada="Venta de golosinas",
        tiempo_en_calle="6_MESES",
        condicion="ACOMPANADO",
        fecha_abordaje=datetime.datetime.now(),
        fecha_ingreso=datetime.datetime.now()
    )
    
    res1 = await use_case.execute(
        nnas_input=[nna_in],
        caso_input=caso_in,
        es_borrador=True
    )
    
    nna_created = res1[0]["nna"]
    caso_created = res1[0]["caso"]
    
    print(f" -> Borrador Guardado! NNA ID: {nna_created.id}, Carpeta ID: {nna_created.carpeta_id}, Código Ficha03: {nna_created.codigo_ficha03} (Debe ser None)")
    print(f" -> Caso Creado! Código Caso: {caso_created.codigo_caso}, Estado Caso: {caso_created.estado}")
    
    assert nna_created.id is not None
    assert nna_created.codigo_ficha03 is None
    assert caso_created.estado == "BORRADOR"
    
    # ── PASO 2: Agregar más datos y guardar Borrador de nuevo (Upsert Check) ──
    print("\n[Paso 2] Educador entra a completar más datos del mismo borrador y vuelve a guardar...")
    
    # Modificamos algunos campos (ej. agregamos domicilio, afiliación de salud, etc.)
    nna_edit = NnaInput(
        id=nna_created.id, # <--- Enviamos el ID para actualizar el mismo registro!
        nombres="SIMULACION DRAFT MODIFICADO", # Modificamos el nombre
        apellido_paterno="EDUDADOR",
        apellido_materno="TEST",
        tipo_doc="SIN_DOC",
        numero_doc=None,
        fecha_nacimiento=datetime.datetime(2014, 5, 10),
        sexo="M",
        domicilio_actual="Av. Las Flores 123",
        afiliado_sis="SI" # Agregamos más datos
    )
    
    # Simulamos el execute enviando el ID y es_borrador=True
    res2 = await use_case.execute(
        nnas_input=[nna_edit],
        caso_input=caso_in,
        carpeta_id=nna_created.carpeta_id,
        crear_nueva_carpeta=False,
        es_borrador=True
    )
    
    nna_updated = res2[0]["nna"]
    caso_updated = res2[0]["caso"]
    
    print(f" -> Borrador Actualizado! NNA ID: {nna_updated.id}, Nombre: {nna_updated.nombres}, SIS: {nna_updated.afiliado_sis}")
    
    # VERIFICACIÓN TÉCNICA DE NO DUPLICIDAD:
    # 1. El ID del NNA debe ser exactamente el mismo
    assert nna_updated.id == nna_created.id, "ERROR: ¡Se creó un NNA nuevo en lugar de actualizar el anterior!"
    # 2. El Carpeta ID debe mantenerse
    assert nna_updated.carpeta_id == nna_created.carpeta_id, "ERROR: ¡La Carpeta cambió!"
    
    # Verificar en la base de datos real el conteo de NNAs con este ID
    conn = oracledb.connect(
        user=os.getenv("ORACLE_USER"),
        password=os.getenv("ORACLE_PASSWORD"),
        dsn=f"{os.getenv('ORACLE_HOST')}:{os.getenv('ORACLE_PORT')}/{os.getenv('ORACLE_SERVICE')}"
    )
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM NNA WHERE ID = :nid", {"nid": nna_created.id})
        count_nna = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM NNA_CASO WHERE NNA_ID = :nid", {"nid": nna_created.id})
        count_casos = cur.fetchone()[0]
        
    print(f" -> Chequeo de base de datos:")
    print(f"    - Total registros NNA con ID {nna_created.id}: {count_nna} (Debe ser 1)")
    print(f"    - Total casos activos vinculados a este NNA: {count_casos} (Debe ser 1)")
    
    assert count_nna == 1, "¡Error grave! Hay registros duplicados en NNA"
    assert count_casos == 1, "¡Error grave! Hay casos duplicados"
    
    # ── PASO 3: Promover a Ficha F03 Oficial (Finalizar) ──────────────────
    print("\n[Paso 3] Educador presiona 'Finalizar y Registrar Ficha 03'...")
    
    # Cambiamos es_borrador=False
    res3 = await use_case.execute(
        nnas_input=[nna_edit],
        caso_input=caso_in,
        carpeta_id=nna_created.carpeta_id,
        crear_nueva_carpeta=False,
        es_borrador=False # <--- Finalizar Ficha!
    )
    
    nna_final = res3[0]["nna"]
    caso_final = res3[0]["caso"]
    
    print(f" -> Ficha F03 Finalizada Oficialmente!")
    print(f"    - N° Ficha 03 Generado: {nna_final.codigo_ficha03} (Debe ser F03-YYYY-NNNN)")
    print(f"    - Estado del Caso: {caso_final.estado} (Debe ser EN_EVALUACION)")
    
    assert nna_final.id == nna_created.id
    assert nna_final.codigo_ficha03 is not None
    assert nna_final.codigo_ficha03.startswith(f"F03-{datetime.datetime.now().year}-")
    assert caso_final.estado == "EN_EVALUACION"
    
    # Limpiar datos de simulación al final
    with conn.cursor() as cur:
        cur.execute("DELETE FROM NNA_CASO WHERE NNA_ID = :nid", {"nid": nna_created.id})
        cur.execute("DELETE FROM NNA WHERE ID = :nid", {"nid": nna_created.id})
        cur.execute("DELETE FROM NNA_CARPETA WHERE ID = :cid", {"cid": nna_created.carpeta_id})
    conn.commit()
    conn.close()
    
    # Cerrar pool
    await close_pool()
    
    print("\n====================================================")
    print(" ¡SIMULACIÓN COMPLETADA Y VERIFICADA EXITOSAMENTE!  ")
    print(" - Cero Duplicados en Borrador (Upsert correcto).   ")
    print(" - Transición a Ficha Oficial perfecta.             ")
    print(" - Limpieza de base de datos de test finalizada.     ")
    print("====================================================")

if __name__ == "__main__":
    import asyncio
    asyncio.run(run_simulation())
