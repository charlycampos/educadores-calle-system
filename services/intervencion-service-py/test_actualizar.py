import asyncio
import json
import sys
import os

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.append(os.getcwd())

from src.infrastructure.db.connection import init_pool, get_pool
from src.infrastructure.db.repositories.oracle_diagnostico_repository import OracleDiagnosticoRepository
from src.domain.entities.diagnostico import DiagnosticoSocialCreate

async def run_test():
    try:
        await init_pool()
        repo = OracleDiagnosticoRepository()
        
        # Simular payload del frontend
        payload = {
            "nnaId": 1,
            "noTieneDNI": False,
            "edad": "6",
            "unidadEdad": "ANIOS",
            "direccionActual": "Direccion de prueba modificada",
            "situacionCalleDetalle": {
                "perfil": {
                    "trabajoInfantil": True,
                    "mendicidad": False,
                    "vidaEnCalle": False
                },
                "tiempo": {
                    "cantidad": "12",
                    "unidad": "MESES"
                },
                "ingresoSemanal": "777",
                "horarios": {"manana": True, "tarde": True, "noche": False},
                "frecuencia": {"diario": True, "interdiario": False, "finesSemana": False, "temporadas": False},
                "motivo": "Prueba de motivo de ingreso",
                "modalidadTrabajo": {"puestoFijo": True, "ambulante": False, "recorre": False},
                "lugar": "Parque Central",
                "acompanamiento": {"solo": True, "acompanado": False, "acompanadoFamiliar": False, "quien": ""},
                "obligado": {"si": False, "no": True, "quien": ""},
                "escapoCasa": {"si": False, "no": True, "veces": ""},
                "consumo": {"si": False, "no": True, "tipo": "", "frecuencia": "", "tiempo": "", "unidadTiempo": "MESES"}
            },
            "tutorPrimerApellido": "CAMPOS",
            "tutorSegundoApellido": "GUERRA",
            "tutorNombre": "CHARLY",
            "tutorSexo": "1",
            "tutorDNI": "654654654",
            "tutorTipoDocumento": "1",
            "tutorFechaNacimiento": "1979-01-01T00:00:00",
            "tutorNacionalidad": "PERUANA",
            "tutorParentesco": "1",
            "tutorOcupacion": "SDFSFSFS",
            "tutorViveConNna": "SI",
            "tutorLenguaMaterna": "10",
            "tutorEtnia": "7",
            "tutorTipoDiscapacidad": "1",
            "tutorDiscapacidad": "SI",
            "tutorCertificadoConadis": "1",
            "tutorConadis": "SI",
            "tutorTelefono": "999999999",
            "lugarPernocte": "Casa Propia",
            "detalleLugarPernocte": "",
            "duermeConQuien": "1",
            "tieneAntecedenteAlbergue": False,
            "detalleAntecedenteAlbergue": "",
            "eduNivel": "2",
            "eduGrado": "1",
            "eduModalidad": "1",
            "eduEstudia": "SI",
            "eduInstitucion": "ASFASFAFAFA",
            "eduMotivoNoEstudia": "",
            "afiliadoSIS": "NO",
            "afiliadoOtroSeguro": "SI",
            "detalleOtroSeguro": "EsSalud",
            "tieneDiscapacidad": False,
            "tipoDiscapacidad": "1: Motriz o fisica",
            "detalleDiscapacidad": "SDFSDFSDFSDF",
            "enfermedadCronica": True,
            "detalleEnfermedadCronica": "WSDFSDFSDFSD",
            "observacionesSalud": ""
        }
        
        # Validar payload con Pydantic
        data = DiagnosticoSocialCreate(**payload)
        
        print("\n[*] Actualizando record ID=1 con el payload de prueba...")
        res_update = await repo.update_diagnostico(1, data)
        print("[+] Registro actualizado correctamente en la BD!")
        
        print("\n[*] Recuperando el registro desde la BD para verificar...")
        res_get = await repo.get_by_id(1)
        
        print("\n=== VALORES FÍSICOS EXTRAÍDOS EN LA BD ===")
        print(f"ID: {res_get.get('id')}")
        print(f"SITUACION_CALLE: {res_get.get('situacion_calle')}")
        print(f"TIEMPO_EN_CALLE: {res_get.get('tiempo_en_calle')}")
        print(f"NOMBRE_TUTOR: {res_get.get('nombre_tutor')}")
        print(f"DIRECCION_TUTOR: {res_get.get('direccion_tutor')}")
        
        print("\n=== CONTENIDO DE datos_extra DE LA BD ===")
        print(json.dumps(res_get.get('datos_extra'), indent=2))
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(run_test())
