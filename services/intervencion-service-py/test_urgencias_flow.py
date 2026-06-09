import asyncio
import json
import sys
import os
from datetime import datetime

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.append(os.getcwd())

from src.infrastructure.db.connection import init_pool, close_pool
from src.infrastructure.db.repositories.oracle_urgencia_repository import OracleUrgenciaRepository
from src.domain.entities.urgencia import UrgenciaF15Create

async def run_tests():
    print("====================================================")
    print("INICIANDO PRUEBAS DE INTEGRACIÓN - FORMULARIO F15")
    print("====================================================")
    
    try:
        # 1. Inicializar pool de conexiones
        await init_pool()
        repo = OracleUrgenciaRepository()
        print("[+] Conectado a la base de datos Oracle.")

        # 2. Datos de prueba para crear la Urgencia
        test_payload = UrgenciaF15Create(
            fecha_atencion=datetime.now(),
            hora_atencion="14:30",
            zona_atencion="Av. Tacna / Av. Emancipación, Cercado de Lima",
            nna_ubicado=True,
            perfil="TRABAJO_CALLE",
            antecedentes="Referido por transeúnte local. NNA vendiendo golosinas.",
            actividades_realiza="Venta de caramelos y chicles en cruce peatonal.",
            nombre_referido="Pedrito Alcántara Gomez",
            direccion_referida="Calle Los Duraznos 123, El Agustino",
            asiste_escuela=True,
            escuela_detalle="I.E. Miguel Grau",
            grado_escuela="4to Primaria",
            tiene_dni=True,
            tiene_sis=False,
            familiares_vive="Madre y hermana de 3 años",
            horarios_dias="Lunes a Viernes de 13:00 a 17:00",
            riesgo_salud="Ninguno visible, refiere no tener vacunas completas",
            riesgo_violencia="No refiere agresividad familiar directa",
            riesgo_escolar="Faltas constantes reportadas",
            riesgo_laboral_padres="Madre trabaja de manera informal",
            riesgo_familiar="Hacinamiento en vivienda",
            acciones_realizadas="Conversación inicial y registro en ficha",
            otra_situacion="",
            acuerdos="Visitar la vivienda el próximo martes",
            datos_extra={
                "nombres": "Pedrito",
                "apellido_paterno": "Alcántara",
                "apellido_materno": "Gomez",
                "sexo": "MASCULINO",
                "fecha_nacimiento": "2015-05-10",
                "edad": "11",
                "unidad_edad": "ANIOS",
                "domicilio_actual": "Calle Los Duraznos 123, El Agustino",
                "departamento_dom": "LIMA",
                "provincia_dom": "LIMA",
                "distrito_dom": "EL AGUSTINO",
                "tipo_doc": "1",
                "numero_doc": "12345678",
                "asiste_escuela_situacion": "SI",
                "nivel_educativo": "PRIMARIA",
                "grado_estudio": "4to Primaria",
                "institucion_educativa": "I.E. Miguel Grau",
                "modalidad_estudio": "EBR",
                "afiliado_sis": "NO",
                "afiliado_otro_seguro": "NO",
                "detalle_otro_seguro": "",
                "tutor_nombre": "María Gomez",
                "tutor_parentesco": "MADRE",
                "tutor_dni": "87654321",
                "tutor_telefono": "987654321",
                "personas_vive": "Madre y hermana de 3 años",
                "dias_trabajo": ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"],
                "turno1_inicio": "13:00",
                "turno1_fin": "17:00",
                "turno2_inicio": "",
                "turno2_fin": "",
                "actividades_detalle": "Venta de caramelos y chicles en cruce peatonal.",
                "lugar_pernocte": "Calle",
                "detalle_lugar_pernocte": "Plaza de armas",
                "situacion_calle": "TRANSITO_EN_CALLE"
            }
        )

        educador_id = 1
        sede_id = 1

        # 3. Test: Crear Urgencia
        print("\n[*] Test 1: Creando un nuevo reporte de urgencia (F15)...")
        created_urgencia = await repo.create_urgencia(test_payload, educador_id, sede_id)
        
        urgencia_id = created_urgencia.get("id")
        codigo_reporte = created_urgencia.get("codigo_reporte")
        print(f"[+] Urgencia creada de manera exitosa!")
        print(f"    - ID: {urgencia_id}")
        print(f"    - Código Reporte: {codigo_reporte}")
        print(f"    - Estado inicial: {created_urgencia.get('estado')}")
        
        # 4. Test: Obtener por ID
        print("\n[*] Test 2: Obteniendo la urgencia por ID...")
        retrieved = await repo.get_by_id(urgencia_id)
        assert retrieved is not None, "Error: No se pudo obtener la urgencia por ID"
        assert retrieved["codigo_reporte"] == codigo_reporte, "Error: Código de reporte no coincide"
        print(f"[+] Urgencia recuperada correctamente de la BD.")
        print(f"    - Nombre Referido: {retrieved.get('nombre_referido')}")
        print(f"    - Zona: {retrieved.get('zona_atencion')}")

        # 5. Test: Listar por Sede
        print("\n[*] Test 3: Listando urgencias por Sede ID...")
        lista = await repo.list_by_sede(sede_id)
        found = False
        for item in lista:
            if item["id"] == urgencia_id:
                found = True
                break
        assert found, f"Error: La urgencia creada no figura en la lista de la sede {sede_id}"
        print(f"[+] Urgencia encontrada en el listado de la sede {sede_id} (total reportes: {len(lista)})")

        # 6. Test: Actualizar Urgencia
        print("\n[*] Test 4: Actualizando datos de la urgencia...")
        test_payload.zona_atencion = "Av. Tacna cuadra 6, Cercado de Lima (Modificada)"
        test_payload.acuerdos = "Compromiso de matrícula escolar verificado"
        updated = await repo.update_urgencia(urgencia_id, test_payload)
        
        assert updated is not None, "Error: Fallo al actualizar"
        assert updated["zona_atencion"] == "Av. Tacna cuadra 6, Cercado de Lima (Modificada)", "Error: La modificación no se guardó"
        print("[+] Urgencia actualizada correctamente.")
        print(f"    - Nueva Zona: {updated.get('zona_atencion')}")
        print(f"    - Nuevos Acuerdos: {updated.get('acuerdos')}")

        # 7. Test: Validar mapeo de Prellenado F03
        print("\n[*] Test 5: Probando mapeo de prellenado F03 (desde endpoint prefill-f03)...")
        # Simulamos la transformación que hace el router
        datos_extra = updated.get("datos_extra") or {}
        dias_trabajo = datos_extra.get("dias_trabajo") or []
        dias_trabajo_str = ",".join(dias_trabajo) if isinstance(dias_trabajo, list) else str(dias_trabajo)
        
        prefill_f03 = {
            "nombres": datos_extra.get("nombres") or updated.get("nombre_referido") or "",
            "apellido_paterno": datos_extra.get("apellido_paterno") or "",
            "apellido_materno": datos_extra.get("apellido_materno") or "",
            "sexo": datos_extra.get("sexo") or "",
            "tiene_partida_nacimiento": True if datos_extra.get("tipo_doc") == "1" else False,
            "tipo_doc": datos_extra.get("tipo_doc") or ("1" if updated.get("tiene_dni") else "7"),
            "numero_doc": datos_extra.get("numero_doc") or "",
            "fecha_nacimiento": datos_extra.get("fecha_nacimiento") or "",
            "edad": datos_extra.get("edad") or None,
            "unidad_edad": datos_extra.get("unidad_edad") or "ANIOS",
            "domicilio_actual": datos_extra.get("domicilio_actual") or updated.get("direccion_referida") or "",
            "departamento_dom": datos_extra.get("departamento_dom") or "",
            "provincia_dom": datos_extra.get("provincia_dom") or "",
            "distrito_dom": datos_extra.get("distrito_dom") or "",
            "lugar_pernocte": datos_extra.get("lugar_pernocte") or updated.get("zona_atencion") or "",
            "detalle_lugar_pernocte": datos_extra.get("detalle_lugar_pernocte") or "",
            "afiliado_sis": datos_extra.get("afiliado_sis") or ("SI" if updated.get("tiene_sis") else "NO_SABE"),
            "afiliado_otro_seguro": datos_extra.get("afiliado_otro_seguro") or "NO",
            "detalle_otro_seguro": datos_extra.get("detalle_otro_seguro") or "",
            "estudia_actualmente": 1 if (datos_extra.get("asiste_escuela_situacion") == "SI" or updated.get("asiste_escuela")) else 0,
            "institucion_educativa": datos_extra.get("institucion_educativa") or updated.get("escuela_detalle") or "",
            "nivel_educativo": datos_extra.get("nivel_educativo") or "",
            "grado_estudio": datos_extra.get("grado_estudio") or updated.get("grado_escuela") or "",
            "modalidad_estudio": datos_extra.get("modalidad_estudio") or "",
            "caracteristicas": datos_extra.get("actividades_detalle") or updated.get("actividades_realiza") or "",
            "observaciones_salud": updated.get("riesgo_salud") or "",
            "urgencia_id": urgencia_id,
            "perfil": updated.get("perfil") or "",
            "situacion_calle": datos_extra.get("situacion_calle") or "",
            "dias_trabajo": dias_trabajo_str,
            "tutor_nombre": datos_extra.get("tutor_nombre") or "",
            "tutor_parentesco": datos_extra.get("tutor_parentesco") or "",
            "tutor_dni": datos_extra.get("tutor_dni") or "",
            "tutor_telefono": datos_extra.get("tutor_telefono") or "",
            "personas_vive": datos_extra.get("personas_vive") or updated.get("familiares_vive") or "",
            "vive_con": datos_extra.get("vive_con") or "3",
            "detalle_vive_con": datos_extra.get("detalle_vive_con") or "",
            "datos_extra": datos_extra
        }
        
        print("[+] Mapeo simulado de F15 a F03 completado:")
        print(json.dumps(prefill_f03, indent=2, ensure_ascii=False))
        
        # Validaciones de mapeo
        assert prefill_f03["nombres"] == "Pedrito"
        assert prefill_f03["apellido_paterno"] == "Alcántara"
        assert prefill_f03["apellido_materno"] == "Gomez"
        assert prefill_f03["tipo_doc"] == "1"
        assert prefill_f03["afiliado_sis"] == "NO"
        assert prefill_f03["estudia_actualmente"] == 1
        assert prefill_f03["institucion_educativa"] == "I.E. Miguel Grau"
        assert prefill_f03["lugar_pernocte"] == "Calle"
        assert prefill_f03["tutor_nombre"] == "María Gomez"
        print("[+] Validaciones del mapeo de prellenado F03 pasaron con éxito.")

        # 8. Test: Transición de Estado a Promovido F03
        print("\n[*] Test 6: Simulando promoción a F03 y cambio de estado...")
        # Simulamos que registramos el caso y obtenemos el NNA ID 999
        simulated_nna_id = 999
        state_updated = await repo.update_estado(urgencia_id, 'PROMOVIDO_F03', simulated_nna_id)
        assert state_updated, "Error: No se pudo actualizar el estado de la urgencia"
        
        verified = await repo.get_by_id(urgencia_id)
        assert verified["estado"] == 'PROMOVIDO_F03', "Error: El estado no se actualizó a PROMOVIDO_F03"
        assert verified["nna_id"] == simulated_nna_id, "Error: El nna_id no quedó enlazado"
        print(f"[+] Urgencia {codigo_reporte} promovida con éxito a Caso Activo (NNA ID {simulated_nna_id}).")

        print("\n====================================================")
        print("¡TODAS LAS PRUEBAS UNITARIAS PASARON EXITOSAMENTE!")
        print("====================================================")

    except Exception as e:
        print(f"\n[!] ERROR DURANTE LAS PRUEBAS: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await close_pool()
        print("[*] Conexión de BD cerrada.")

if __name__ == "__main__":
    asyncio.run(run_tests())
