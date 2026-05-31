import sys
import os
import json

# Add current path
sys.path.append(os.getcwd())

from src.domain.entities.diagnostico import DiagnosticoSocialCreate

def run_test():
    payload = {
        "nnaId": 1,
        "noTieneDNI": False,
        "edad": "6",
        "direccionActual": "sfsdfsd",
        "situacionCalleDetalle": {
            "perfil": {
                "trabajoInfantil": True,
                "mendicidad": False
            },
            "tiempo": {
                "cantidad": "5",
                "unidad": "MESES"
            },
            "ingresoSemanal": "450"
        }
    }
    
    print("=== PROBANDO INSTANCIACIÓN DE PYDANTIC ===")
    obj = DiagnosticoSocialCreate(**payload)
    print(f"nna_id: {obj.nna_id}")
    print(f"tiempo_en_calle (auto): {obj.tiempo_en_calle}")
    print(f"situacion_calle (auto): {obj.situacion_calle}")
    print("\n=== datos_extra ===")
    print(json.dumps(obj.datos_extra, indent=2))
    
    print("\n=== model_dump() ===")
    print(json.dumps(obj.model_dump(), indent=2))

if __name__ == '__main__':
    run_test()
