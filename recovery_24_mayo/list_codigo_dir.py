import os

codigo_dir = r"D:\Usuarios\ccampos\Documents\Python Scripts\Educadores_calle\educadores-calle-system\codigo"

if os.path.exists(codigo_dir):
    for root, dirs, files in os.walk(codigo_dir):
        for file in files:
            full_path = os.path.join(root, file)
            print(f"File in codigo: {full_path} | Size: {os.path.getsize(full_path)} bytes")
else:
    print("codigo directory not found")
