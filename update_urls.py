import os
import glob

directory = 'd:/Usuarios/ccampos/Documents/Python Scripts/Educadores_calle/educadores-calle-system/client/src/'

files_to_check = []
for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith(('.ts', '.tsx')) and "api.ts" not in file: # Not the config
            files_to_check.append(os.path.join(root, file))

for filepath in files_to_check:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'http://localhost:3001/api' in content:
        # Determine import path depth
        depth = filepath.replace(directory, "").count(os.sep)
        if depth == 0:
            import_path = "./config/api"
        elif depth == 1:
            import_path = "../config/api"
        elif depth == 2:
            import_path = "../../config/api"
        elif depth == 3:
            import_path = "../../../config/api"
        else:
            import_path = "../../../../config/api"

        import_str = f"import {{ NNA_API_URL, DERIVACION_API_URL, INTERVENCION_API_URL, AUTH_API_URL, EXPEDIENTE_API_URL }} from '{import_path}';\n"
        
        if 'config/api' not in content:
            content = import_str + content

        # Replace URLs
        content = content.replace("'http://localhost:3001/api/nna'", "`${NNA_API_URL}/nna`")
        content = content.replace("`http://localhost:3001/api/nna", "`${NNA_API_URL}/nna")
        
        content = content.replace("'http://localhost:3001/api/derivaciones'", "`${DERIVACION_API_URL}/derivaciones`")
        content = content.replace("`http://localhost:3001/api/derivaciones", "`${DERIVACION_API_URL}/derivaciones")
        
        content = content.replace("'http://localhost:3001/api/diagnosticos'", "`${INTERVENCION_API_URL}/diagnostico`")
        content = content.replace("`http://localhost:3001/api/diagnosticos", "`${INTERVENCION_API_URL}/diagnostico")
        
        content = content.replace("'http://localhost:3001/api/usuarios'", "`${AUTH_API_URL}/usuarios`")
        content = content.replace("`http://localhost:3001/api/usuarios", "`${AUTH_API_URL}/usuarios")
        
        content = content.replace("'http://localhost:3001/api/statistics", "`${AUTH_API_URL}/statistics")
        content = content.replace("`http://localhost:3001/api/statistics", "`${AUTH_API_URL}/statistics")

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")
