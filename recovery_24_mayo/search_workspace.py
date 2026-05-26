import os

parent_dir = r"D:\Usuarios\ccampos\Documents\Python Scripts\Educadores_calle"

for root, dirs, files in os.walk(parent_dir):
    for file in files:
        if "NnaCreatePage" in file:
            full_path = os.path.join(root, file)
            print(f"Found file: {full_path} | Size: {os.path.getsize(full_path)} bytes")
